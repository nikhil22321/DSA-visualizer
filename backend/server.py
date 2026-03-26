import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AlgoViz Pro API")
api_router = APIRouter(prefix="/api")


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str


class TutorRequest(BaseModel):
    algorithm: str
    current_step: int
    explanation_context: str
    complexity: Optional[str] = None
    internal_state: Dict[str, Any] = Field(default_factory=dict)
    mode: Literal["learning", "expert"] = "learning"
    session_id: Optional[str] = None


class TutorResponse(BaseModel):
    session_id: str
    explanation: str
    provider: str
    model: str
    timestamp: str


class RunCreate(BaseModel):
    module: str
    algorithm: str
    title: str
    dataset_config: Dict[str, Any] = Field(default_factory=dict)
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    stats: Dict[str, Any] = Field(default_factory=dict)
    complexity: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)


class RunRecord(RunCreate):
    model_config = ConfigDict(extra="ignore")

    id: str
    share_token: str
    created_at: str


class RecommendationRequest(BaseModel):
    domain: Literal["sorting", "graph", "pathfinding"] = "sorting"
    input_size: int = Field(ge=1)
    input_type: str = "random"
    memory_sensitive: bool = False
    stability_required: bool = False


class RecommendationResponse(BaseModel):
    recommendation: str
    rationale: str
    alternatives: List[str]


class PracticeQuestion(BaseModel):
    id: str
    prompt: str
    choices: List[str]
    answer_index: int
    topic: str


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def fallback_tutor_message(payload: TutorRequest) -> str:
    state = payload.internal_state or {}
    highlights = ", ".join(
        [f"{k}: {str(v)[:80]}" for k, v in list(state.items())[:3]]
    )
    return (
        f"Step {payload.current_step} in {payload.algorithm}: {payload.explanation_context}. "
        f"Watch how the active structure evolves. {payload.complexity or ''} "
        f"State highlights -> {highlights if highlights else 'No internal state supplied yet.'}"
    ).strip()


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "AlgoViz Pro backend is running"}


@api_router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok", service="algoviz-pro-api", timestamp=utc_now_iso()
    )


@api_router.post("/ai/tutor", response_model=TutorResponse)
async def ai_tutor(payload: TutorRequest) -> TutorResponse:
    session_id = payload.session_id or str(uuid4())
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    timestamp = utc_now_iso()

    if not llm_key:
        explanation = fallback_tutor_message(payload)
        await db.tutor_chats.insert_one(
            {
                "id": str(uuid4()),
                "session_id": session_id,
                "algorithm": payload.algorithm,
                "mode": payload.mode,
                "request": payload.model_dump(),
                "response": explanation,
                "provider": "fallback",
                "model": "deterministic-template",
                "timestamp": timestamp,
            }
        )
        return TutorResponse(
            session_id=session_id,
            explanation=explanation,
            provider="fallback",
            model="deterministic-template",
            timestamp=timestamp,
        )

    system_message = (
        "You are an elite DSA tutor for AlgoViz Pro. Explain each step clearly with "
        "algorithmic reasoning, complexity intuition, and practical interview insights. "
        "Keep responses concise but educational."
    )
    if payload.mode == "expert":
        system_message += (
            " Use expert-level language, mention invariants, and discuss edge-cases briefly."
        )

    prompt = (
        f"Algorithm: {payload.algorithm}\n"
        f"Step Index: {payload.current_step}\n"
        f"Complexity Context: {payload.complexity or 'Not provided'}\n"
        f"Step Notes: {payload.explanation_context}\n"
        f"Internal State JSON: {payload.internal_state}\n"
        "Please explain why this step happens now, what data structure state matters most, "
        "and what the learner should watch next."
    )

    provider = "openai"
    model = "gpt-5.2"
    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=session_id,
            system_message=system_message,
        ).with_model(provider, model)

        explanation = await chat.send_message(UserMessage(text=prompt))
        await db.tutor_chats.insert_one(
            {
                "id": str(uuid4()),
                "session_id": session_id,
                "algorithm": payload.algorithm,
                "mode": payload.mode,
                "request": payload.model_dump(),
                "response": explanation,
                "provider": provider,
                "model": model,
                "timestamp": timestamp,
            }
        )

        return TutorResponse(
            session_id=session_id,
            explanation=explanation,
            provider=provider,
            model=model,
            timestamp=timestamp,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("AI tutor error: %s", exc)
        explanation = fallback_tutor_message(payload)
        await db.tutor_chats.insert_one(
            {
                "id": str(uuid4()),
                "session_id": session_id,
                "algorithm": payload.algorithm,
                "mode": payload.mode,
                "request": payload.model_dump(),
                "response": explanation,
                "provider": "fallback",
                "model": "deterministic-template",
                "timestamp": timestamp,
            }
        )
        return TutorResponse(
            session_id=session_id,
            explanation=explanation,
            provider="fallback",
            model="deterministic-template",
            timestamp=timestamp,
        )


@api_router.post("/runs", response_model=RunRecord)
async def create_run(payload: RunCreate) -> RunRecord:
    record = RunRecord(
        id=str(uuid4()),
        share_token=str(uuid4())[:8],
        created_at=utc_now_iso(),
        **payload.model_dump(),
    )
    doc_to_insert = record.model_dump()
    await db.algorithm_runs.insert_one(doc_to_insert)
    return record


@api_router.get("/runs", response_model=List[RunRecord])
async def list_runs(
    module: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> List[RunRecord]:
    query: Dict[str, Any] = {}
    if module:
        query["module"] = module

    rows = (
        await db.algorithm_runs.find(query, {"_id": 0})
        .sort("created_at", -1)
        .to_list(limit)
    )
    return [RunRecord(**row) for row in rows]


@api_router.get("/runs/{run_id}", response_model=RunRecord)
async def get_run(run_id: str) -> RunRecord:
    row = await db.algorithm_runs.find_one({"id": run_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunRecord(**row)


@api_router.get("/runs/share/{share_token}", response_model=RunRecord)
async def get_run_by_share_token(share_token: str) -> RunRecord:
    row = await db.algorithm_runs.find_one({"share_token": share_token}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Shared run not found")
    return RunRecord(**row)


@api_router.get("/tutor/history/{session_id}")
async def tutor_history(session_id: str) -> Dict[str, Any]:
    rows = await db.tutor_chats.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    return {"session_id": session_id, "messages": rows}


@api_router.post("/recommendation", response_model=RecommendationResponse)
async def recommendation(payload: RecommendationRequest) -> RecommendationResponse:
    n = payload.input_size
    input_type = payload.input_type.lower()

    if payload.domain == "sorting":
        if n <= 32:
            rec = "Insertion Sort"
            why = "For small arrays, insertion sort has very low constant factors and performs strongly."
            alts = ["Selection Sort", "Shell Sort"]
        elif payload.stability_required:
            rec = "Merge Sort"
            why = "Stable sorting is required, and merge sort keeps O(n log n) performance across cases."
            alts = ["Counting Sort (if integer range is small)", "TimSort-style hybrid"]
        elif input_type in {"nearly sorted", "few unique"}:
            rec = "Shell Sort"
            why = "Gapped insertion passes reduce disorder quickly on partially ordered arrays."
            alts = ["Insertion Sort", "Merge Sort"]
        elif payload.memory_sensitive:
            rec = "Heap Sort"
            why = "Heap sort is in-place with O(1) extra memory while keeping O(n log n) time."
            alts = ["Quick Sort", "Shell Sort"]
        else:
            rec = "Quick Sort"
            why = "Quick sort is typically fastest in practice for large random datasets due to cache locality."
            alts = ["Merge Sort", "Heap Sort"]
    elif payload.domain == "graph":
        rec = "Dijkstra"
        why = "For positive weighted graphs, Dijkstra provides efficient shortest-path results."
        alts = ["BFS (unweighted)", "Bellman-Ford (negative edges)"]
    else:
        rec = "A*"
        why = "A* combines path optimality with heuristics, usually exploring fewer nodes than Dijkstra."
        alts = ["Dijkstra", "Greedy Best First Search"]

    return RecommendationResponse(recommendation=rec, rationale=why, alternatives=alts)


@api_router.get("/practice/questions", response_model=List[PracticeQuestion])
async def practice_questions() -> List[PracticeQuestion]:
    return [
        PracticeQuestion(
            id="q1",
            prompt="Which sorting algorithm is stable and has O(n log n) worst-case time?",
            choices=["Quick Sort", "Merge Sort", "Heap Sort", "Shell Sort"],
            answer_index=1,
            topic="Sorting",
        ),
        PracticeQuestion(
            id="q2",
            prompt="In Dijkstra, which node is picked next?",
            choices=[
                "Highest degree node",
                "Lowest tentative distance unvisited node",
                "Random unvisited node",
                "Most recently visited node",
            ],
            answer_index=1,
            topic="Graphs",
        ),
        PracticeQuestion(
            id="q3",
            prompt="What is the key advantage of BFS in unweighted graphs?",
            choices=[
                "Uses less memory than DFS always",
                "Finds shortest path by edge count",
                "Handles negative weights",
                "Works only on trees",
            ],
            answer_index=1,
            topic="Pathfinding",
        ),
    ]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()