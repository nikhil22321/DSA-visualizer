import asyncio
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Protocol
from uuid import uuid4

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from pymongo.errors import PyMongoError
from requests import RequestException
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
PUBLIC_DIR = ROOT_DIR.parent / "frontend_dist"
INDEX_FILE = PUBLIC_DIR / "index.html"
load_dotenv(ROOT_DIR / ".env")


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str


class StepGuideRequest(BaseModel):
    algorithm: str
    current_step: int
    explanation_context: str
    complexity: Optional[str] = None
    internal_state: Dict[str, Any] = Field(default_factory=dict)
    mode: Literal["learning", "expert"] = "learning"
    session_id: Optional[str] = None
    user_question: Optional[str] = None


class StepGuideResponse(BaseModel):
    session_id: str
    explanation: str
    timestamp: str
    suggested_questions: List[str] = Field(default_factory=list)


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


def short_json(value: Any, limit: int = 220) -> str:
    serialized = json.dumps(value, default=str, ensure_ascii=True)
    if len(serialized) <= limit:
        return serialized
    return f"{serialized[: limit - 3]}..."


def build_fallback_step_guide_message(
    payload: StepGuideRequest,
    history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    state = payload.internal_state or {}
    highlights = ", ".join(f"{k}: {str(v)[:80]}" for k, v in list(state.items())[:4])
    mode_note = (
        "Explain the intuition in simple language and connect it to what the learner is seeing."
        if payload.mode == "learning"
        else "Explain the invariant, why this move is valid, and what performance trade-off it preserves."
    )
    history_note = ""
    if history:
        history_note = (
            f" This session already has {len(history)} earlier tutor message"
            f"{'' if len(history) == 1 else 's'} to build on."
        )
    complexity_note = (
        f" Complexity context: {payload.complexity}."
        if payload.complexity
        else ""
    )
    return (
        f"Step {payload.current_step} in {payload.algorithm}: {payload.explanation_context}."
        f"{complexity_note} {mode_note}{history_note} "
        f"State highlights: {highlights if highlights else 'No internal state supplied yet.'}"
    ).strip()


def build_suggested_questions(payload: StepGuideRequest) -> List[str]:
    algorithm_name = payload.algorithm.lower().strip()
    if any(keyword in algorithm_name for keyword in ["tree", "inorder", "preorder", "postorder", "level order", "search node", "diameter", "ancestor", "bst"]):
        base_questions = [
            "Why is this node being visited right now?",
            "What subtree or branch will the algorithm inspect next?",
            "How does this step help produce the final tree result?",
        ]
    elif any(keyword in algorithm_name for keyword in ["bfs", "dfs", "dijkstra", "graph", "path"]):
        base_questions = [
            "Why was this node chosen before the others?",
            "What happens next in the frontier or queue?",
            "How does this step move us closer to the final path or traversal?",
        ]
    else:
        base_questions = [
            "Why is this comparison needed before moving forward?",
            "What happens next after this step?",
            "How does this step help the algorithm stay correct?",
        ]
    if payload.user_question:
        return [
            "Can you explain that in even simpler words?",
            "Can you show a tiny example with numbers?",
            "What mistake should I avoid here?",
        ]
    return base_questions


class StorageBackend(Protocol):
    async def insert_step_guide(self, record: Dict[str, Any]) -> None: ...

    async def list_step_guides(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]: ...

    async def insert_run(self, record: Dict[str, Any]) -> None: ...

    async def list_runs(
        self,
        module: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]: ...

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]: ...

    async def get_run_by_share_token(self, share_token: str) -> Optional[Dict[str, Any]]: ...


class InMemoryStorage:
    def __init__(self) -> None:
        self.runs: Dict[str, Dict[str, Any]] = {}
        self.step_guides: Dict[str, List[Dict[str, Any]]] = {}

    async def insert_step_guide(self, record: Dict[str, Any]) -> None:
        self.step_guides.setdefault(record["session_id"], []).append(dict(record))

    async def list_step_guides(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        rows = list(self.step_guides.get(session_id, []))
        return rows[-limit:]

    async def insert_run(self, record: Dict[str, Any]) -> None:
        self.runs[record["id"]] = dict(record)

    async def list_runs(
        self,
        module: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        rows = list(self.runs.values())
        if module:
            rows = [row for row in rows if row.get("module") == module]
        rows.sort(key=lambda row: row.get("created_at", ""), reverse=True)
        return rows[:limit]

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        row = self.runs.get(run_id)
        return dict(row) if row else None

    async def get_run_by_share_token(self, share_token: str) -> Optional[Dict[str, Any]]:
        for row in self.runs.values():
            if row.get("share_token") == share_token:
                return dict(row)
        return None


class MongoStorage:
    def __init__(self, database: Any) -> None:
        self.database = database

    async def insert_step_guide(self, record: Dict[str, Any]) -> None:
        await self.database.step_guides.insert_one(record)

    async def list_step_guides(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.database.step_guides.find(
            {"session_id": session_id},
            {"_id": 0},
        ).sort("timestamp", 1).to_list(limit)

    async def insert_run(self, record: Dict[str, Any]) -> None:
        await self.database.algorithm_runs.insert_one(record)

    async def list_runs(
        self,
        module: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if module:
            query["module"] = module
        return await self.database.algorithm_runs.find(
            query,
            {"_id": 0},
        ).sort("created_at", -1).to_list(limit)

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        return await self.database.algorithm_runs.find_one({"id": run_id}, {"_id": 0})

    async def get_run_by_share_token(self, share_token: str) -> Optional[Dict[str, Any]]:
        return await self.database.algorithm_runs.find_one(
            {"share_token": share_token},
            {"_id": 0},
        )


class ResilientStorage:
    def __init__(self, primary: MongoStorage, fallback: InMemoryStorage) -> None:
        self.primary = primary
        self.fallback = fallback
        self.has_warned = False

    def _warn_once(self, exc: Exception) -> None:
        if self.has_warned:
            return
        logger.warning(
            "Mongo storage is unavailable, falling back to in-memory storage: %s",
            exc,
        )
        self.has_warned = True

    async def insert_step_guide(self, record: Dict[str, Any]) -> None:
        try:
            await self.primary.insert_step_guide(record)
        except PyMongoError as exc:
            self._warn_once(exc)
            await self.fallback.insert_step_guide(record)

    async def list_step_guides(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            return await self.primary.list_step_guides(session_id, limit)
        except PyMongoError as exc:
            self._warn_once(exc)
            return await self.fallback.list_step_guides(session_id, limit)

    async def insert_run(self, record: Dict[str, Any]) -> None:
        try:
            await self.primary.insert_run(record)
        except PyMongoError as exc:
            self._warn_once(exc)
            await self.fallback.insert_run(record)

    async def list_runs(
        self,
        module: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        try:
            return await self.primary.list_runs(module, limit)
        except PyMongoError as exc:
            self._warn_once(exc)
            return await self.fallback.list_runs(module, limit)

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        try:
            row = await self.primary.get_run(run_id)
            return row
        except PyMongoError as exc:
            self._warn_once(exc)
            return await self.fallback.get_run(run_id)

    async def get_run_by_share_token(self, share_token: str) -> Optional[Dict[str, Any]]:
        try:
            row = await self.primary.get_run_by_share_token(share_token)
            return row
        except PyMongoError as exc:
            self._warn_once(exc)
            return await self.fallback.get_run_by_share_token(share_token)


mongo_client: Optional[AsyncIOMotorClient] = None
mongo_db: Any = None
mongo_url = os.environ.get("MONGO_URL", "").strip()
db_name = os.environ.get("DB_NAME", "").strip()
mongo_timeout_ms = int(os.environ.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", "1500"))

if mongo_url and db_name:
    mongo_client = AsyncIOMotorClient(
        mongo_url,
        serverSelectionTimeoutMS=mongo_timeout_ms,
        connectTimeoutMS=mongo_timeout_ms,
        socketTimeoutMS=mongo_timeout_ms,
    )
    mongo_db = mongo_client[db_name]
    storage = ResilientStorage(MongoStorage(mongo_db), InMemoryStorage())
    logger.info(
        "Mongo storage configured for AlgoViz Pro API with fallback enabled (timeout=%sms).",
        mongo_timeout_ms,
    )
else:
    storage = InMemoryStorage()
    logger.warning(
        "Mongo configuration missing. AlgoViz Pro API is using in-memory storage for tutor history and saved runs."
    )


@dataclass
class TutorGeneration:
    text: str
    provider: str
    model: str
    suggested_questions: List[str]


class TutorProviderError(RuntimeError):
    pass


class TutorProvider(Protocol):
    async def explain(
        self,
        payload: StepGuideRequest,
        history: List[Dict[str, Any]],
    ) -> TutorGeneration: ...


class HeuristicTutorProvider:
    async def explain(
        self,
        payload: StepGuideRequest,
        history: List[Dict[str, Any]],
    ) -> TutorGeneration:
        return TutorGeneration(
            text=build_fallback_step_guide_message(payload, history),
            provider="fallback",
            model="heuristic",
            suggested_questions=build_suggested_questions(payload),
        )


class GeminiTutorProvider:
    def __init__(self, api_key: str, model: str, timeout_seconds: int) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    async def explain(
        self,
        payload: StepGuideRequest,
        history: List[Dict[str, Any]],
    ) -> TutorGeneration:
        prompt = build_tutor_prompt(payload, history)
        text = await asyncio.to_thread(self._generate, prompt, payload.mode)
        return TutorGeneration(
            text=text,
            provider="gemini",
            model=self.model,
            suggested_questions=build_suggested_questions(payload),
        )

    def _generate(self, prompt: str, mode: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        response = requests.post(
            url,
            params={"key": self.api_key},
            json={
                "system_instruction": {
                    "parts": [{"text": build_tutor_system_prompt(mode)}]
                },
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.5,
                    "maxOutputTokens": 320,
                    "thinkingConfig": {"thinkingBudget": 0},
                },
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        text = "\n".join(part.get("text", "").strip() for part in parts if part.get("text"))
        if not text.strip():
            raise TutorProviderError("Gemini returned an empty tutor response.")
        return text.strip()


class OpenAITutorProvider:
    def __init__(self, api_key: str, model: str, timeout_seconds: int) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    async def explain(
        self,
        payload: StepGuideRequest,
        history: List[Dict[str, Any]],
    ) -> TutorGeneration:
        prompt = build_tutor_prompt(payload, history)
        text = await asyncio.to_thread(self._generate, prompt, payload.mode)
        return TutorGeneration(
            text=text,
            provider="openai",
            model=self.model,
            suggested_questions=build_suggested_questions(payload),
        )

    def _generate(self, prompt: str, mode: str) -> str:
        response = requests.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "instructions": build_tutor_system_prompt(mode),
                "input": prompt,
                "temperature": 0.5,
                "max_output_tokens": 320,
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        if data.get("output_text"):
            return str(data["output_text"]).strip()

        output_items = data.get("output", [])
        text_parts: List[str] = []
        for item in output_items:
            for part in item.get("content", []):
                if part.get("type") == "output_text" and part.get("text"):
                    text_parts.append(part["text"].strip())

        text = "\n".join(part for part in text_parts if part)
        if not text.strip():
            raise TutorProviderError("OpenAI returned an empty tutor response.")
        return text.strip()


def build_tutor_system_prompt(mode: str) -> str:
    tone = (
        "Explain like a patient tutor for a student who is learning the algorithm for the first time."
        if mode == "learning"
        else "Explain like an expert reviewer focused on invariants, complexity, and correctness."
    )
    return (
        "You are the AlgoViz Pro AI tutor. "
        f"{tone} "
        "Use one short paragraph of 2 to 4 sentences. "
        "Always reference the current step, the action that just happened, and the most important part of the state. "
        "If there is a likely next step, mention it briefly in the last sentence. "
        "Answer completely; do not stop mid-sentence. "
        "Do not invent hidden state that was not provided."
    )


def build_tutor_prompt(
    payload: StepGuideRequest,
    history: List[Dict[str, Any]],
) -> str:
    history_lines: List[str] = []
    for row in history[-4:]:
        request = row.get("request", {})
        history_lines.append(
            "- "
            f"step={request.get('current_step', '?')}, "
            f"action={request.get('explanation_context', 'unknown')}, "
            f"response={short_json(row.get('response', ''))}"
        )

    history_block = "\n".join(history_lines) if history_lines else "- No previous tutor messages yet."
    complexity = payload.complexity or "Not provided"
    state_summary = short_json(payload.internal_state or {})
    user_question = payload.user_question or ""
    request_goal = (
        f"User follow-up question: {user_question}\n"
        "Answer the question directly using the current step context and keep it easy to understand."
        if user_question
        else "Give a concise step explanation for the learner."
    )
    return (
        f"Algorithm: {payload.algorithm}\n"
        f"Mode: {payload.mode}\n"
        f"Current step: {payload.current_step}\n"
        f"Current action: {payload.explanation_context}\n"
        f"Complexity context: {complexity}\n"
        f"Internal state snapshot: {state_summary}\n"
        "Recent tutor history:\n"
        f"{history_block}\n"
        f"{request_goal}\n"
        "The reply must be complete, short, and easy to read in a small sidebar."
    )


class TutorService:
    def __init__(self) -> None:
        timeout_seconds = int(os.environ.get("AI_REQUEST_TIMEOUT_SECONDS", "30"))
        self.fallback_provider = HeuristicTutorProvider()
        self.provider = self._build_provider(timeout_seconds)

    def _build_provider(self, timeout_seconds: int) -> TutorProvider:
        provider_preference = os.environ.get("AI_PROVIDER", "auto").strip().lower()
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()
        openai_model = os.environ.get("OPENAI_MODEL", "gpt-4.1-nano").strip()

        if provider_preference in {"auto", "gemini"} and gemini_key:
            logger.info("AI tutor configured to use Gemini model %s.", gemini_model)
            return GeminiTutorProvider(gemini_key, gemini_model, timeout_seconds)

        if provider_preference in {"auto", "openai"} and openai_key:
            logger.info("AI tutor configured to use OpenAI model %s.", openai_model)
            return OpenAITutorProvider(openai_key, openai_model, timeout_seconds)

        if provider_preference not in {"auto", "gemini", "openai", "fallback"}:
            logger.warning(
                "Unsupported AI_PROVIDER=%s. Falling back to heuristic tutor.",
                provider_preference,
            )
            return self.fallback_provider

        logger.warning(
            "No AI API key configured for the requested tutor provider. Falling back to heuristic tutor responses."
        )
        return self.fallback_provider

    async def explain_step(
        self,
        payload: StepGuideRequest,
        history: List[Dict[str, Any]],
    ) -> TutorGeneration:
        try:
            return await self.provider.explain(payload, history)
        except (RequestException, TutorProviderError, ValueError) as exc:
            logger.warning("Tutor provider failed, serving fallback explanation instead: %s", exc)
            return await self.fallback_provider.explain(payload, history)


tutor_service = TutorService()

app = FastAPI(title="AlgoViz Pro API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "AlgoViz Pro backend is running"}


@api_router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok", service="algoviz-pro-api", timestamp=utc_now_iso()
    )


@api_router.post("/guide/explain", response_model=StepGuideResponse)
async def explain_step(payload: StepGuideRequest) -> StepGuideResponse:
    session_id = payload.session_id or str(uuid4())
    timestamp = utc_now_iso()
    history = await storage.list_step_guides(session_id, limit=12)
    generation = await tutor_service.explain_step(payload, history)

    await storage.insert_step_guide(
        {
            "id": str(uuid4()),
            "session_id": session_id,
            "algorithm": payload.algorithm,
            "mode": payload.mode,
            "provider": generation.provider,
            "model": generation.model,
            "request": payload.model_dump(),
            "response": generation.text,
            "timestamp": timestamp,
        }
    )

    return StepGuideResponse(
        session_id=session_id,
        explanation=generation.text,
        timestamp=timestamp,
        suggested_questions=generation.suggested_questions,
    )


@api_router.post("/runs", response_model=RunRecord)
async def create_run(payload: RunCreate) -> RunRecord:
    record = RunRecord(
        id=str(uuid4()),
        share_token=str(uuid4())[:8],
        created_at=utc_now_iso(),
        **payload.model_dump(),
    )
    await storage.insert_run(record.model_dump())
    return record


@api_router.get("/runs", response_model=List[RunRecord])
async def list_runs(
    module: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> List[RunRecord]:
    rows = await storage.list_runs(module=module, limit=limit)
    return [RunRecord(**row) for row in rows]


@api_router.get("/runs/{run_id}", response_model=RunRecord)
async def get_run(run_id: str) -> RunRecord:
    row = await storage.get_run(run_id)
    if not row:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunRecord(**row)


@api_router.get("/runs/share/{share_token}", response_model=RunRecord)
async def get_run_by_share_token(share_token: str) -> RunRecord:
    row = await storage.get_run_by_share_token(share_token)
    if not row:
        raise HTTPException(status_code=404, detail="Shared run not found")
    return RunRecord(**row)


@api_router.get("/guide/history/{session_id}")
async def guide_history(session_id: str) -> Dict[str, Any]:
    rows = await storage.list_step_guides(session_id, limit=100)
    return {"session_id": session_id, "messages": rows}


@api_router.post("/recommendation", response_model=RecommendationResponse)
async def recommendation(payload: RecommendationRequest) -> RecommendationResponse:
    n = payload.input_size
    input_type = payload.input_type.lower().replace("-", " ").replace("_", " ").strip()
    normalized_presets = {
        "nearly": "nearly sorted",
        "nearly sorted": "nearly sorted",
        "few unique": "few unique",
        "fewunique": "few unique",
        "random": "random",
        "reverse": "reverse",
    }
    input_type = normalized_presets.get(input_type, input_type)

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
    allow_origins=[
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


def resolve_public_asset(request_path: str) -> Path | None:
    sanitized_path = request_path.strip("/")
    if not sanitized_path:
        return INDEX_FILE if INDEX_FILE.is_file() else None

    candidate = (PUBLIC_DIR / sanitized_path).resolve()
    try:
        candidate.relative_to(PUBLIC_DIR.resolve())
    except ValueError:
        return None

    return candidate if candidate.is_file() else None


@app.get("/", include_in_schema=False)
async def serve_frontend_root() -> FileResponse:
    if not INDEX_FILE.is_file():
        raise HTTPException(status_code=404, detail="Frontend build not found")
    return FileResponse(INDEX_FILE)


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    asset = resolve_public_asset(full_path)
    if asset is not None:
        return FileResponse(asset)

    if not INDEX_FILE.is_file():
        raise HTTPException(status_code=404, detail="Frontend build not found")
    return FileResponse(INDEX_FILE)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    if mongo_client is not None:
        mongo_client.close()
