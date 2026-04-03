import os
import subprocess
import time
from pathlib import Path

import pytest
import requests


@pytest.fixture(scope="session")
def base_url() -> str | None:
    configured = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    return configured.rstrip("/") if configured else "http://127.0.0.1:8010"


@pytest.fixture(scope="session")
def api_base(base_url: str | None) -> str:
    return f"{base_url}/api" if base_url else "/api"


@pytest.fixture(scope="session", autouse=True)
def local_server(base_url: str | None):
    configured = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if configured:
        yield
        return

    backend_dir = Path(__file__).resolve().parents[1]
    python_executable = backend_dir / "venv" / "Scripts" / "python.exe"
    process = subprocess.Popen(
        [
            str(python_executable),
            "-m",
            "uvicorn",
            "server:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8010",
        ],
        cwd=backend_dir,
        env={
            **os.environ,
            "PYTHONDONTWRITEBYTECODE": "1",
            "MONGO_URL": "",
            "DB_NAME": "",
            "AI_PROVIDER": "fallback",
            "GEMINI_API_KEY": "",
            "OPENAI_API_KEY": "",
        },
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    session = requests.Session()
    health_url = "http://127.0.0.1:8010/api/health"
    try:
        for _ in range(40):
            try:
                response = session.get(health_url, timeout=1)
                if response.status_code == 200:
                    break
            except requests.RequestException:
                time.sleep(0.25)
        else:
            raise RuntimeError("Local backend test server failed to start.")

        yield
    finally:
        session.close()
        process.terminate()
        process.wait(timeout=10)


@pytest.fixture
def api_client(base_url: str | None, local_server):
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()
