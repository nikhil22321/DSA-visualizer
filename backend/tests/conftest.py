import os

import pytest
import requests


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="session")
def api_base(base_url: str) -> str:
    return f"{base_url}/api"


@pytest.fixture
def api_client() -> requests.Session:
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
