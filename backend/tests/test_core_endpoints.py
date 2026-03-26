"""Core API regression tests: health, runs, share token, and AI tutor."""


def test_health_endpoint(api_client, api_base):
    response = api_client.get(f"{api_base}/health", timeout=30)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "algoviz-pro-api"
    assert isinstance(data["timestamp"], str)


def test_create_run_and_get_by_share_token(api_client, api_base):
    payload = {
        "module": "sorting",
        "algorithm": "quick",
        "title": "TEST_run_core_endpoint",
        "dataset_config": {"preset": "random", "size": 10, "dataset": [8, 3, 7, 1, 9, 2, 6, 4, 5, 10]},
        "steps": [{"array": [8, 3, 7, 1, 9, 2, 6, 4, 5, 10], "action": "Initial dataset"}],
        "stats": {"comparisons": 0, "swaps": 0, "executionSteps": 1, "visitedNodes": 0},
        "complexity": {"time": "O(n log n)", "space": "O(log n)"},
        "tags": ["TEST_automation", "sorting"],
    }

    create_response = api_client.post(f"{api_base}/runs", json=payload, timeout=30)
    assert create_response.status_code == 200

    created = create_response.json()
    assert created["module"] == payload["module"]
    assert created["algorithm"] == payload["algorithm"]
    assert created["title"] == payload["title"]
    assert isinstance(created["id"], str) and len(created["id"]) > 0
    assert isinstance(created["share_token"], str) and len(created["share_token"]) > 0

    share_response = api_client.get(f"{api_base}/runs/share/{created['share_token']}", timeout=30)
    assert share_response.status_code == 200

    shared = share_response.json()
    assert shared["id"] == created["id"]
    assert shared["module"] == payload["module"]
    assert shared["dataset_config"]["size"] == 10


def test_shared_run_not_found_returns_404(api_client, api_base):
    response = api_client.get(f"{api_base}/runs/share/INVALIDT", timeout=30)

    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Shared run not found"


def test_ai_tutor_response_shape(api_client, api_base):
    payload = {
        "algorithm": "Quick Sort",
        "current_step": 4,
        "explanation_context": "Pivot selected and partition in progress",
        "complexity": "O(n log n), O(log n)",
        "internal_state": {"pivot": 32, "left": 0, "right": 9},
        "mode": "learning",
    }

    response = api_client.post(f"{api_base}/ai/tutor", json=payload, timeout=60)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["session_id"], str) and len(data["session_id"]) > 0
    assert isinstance(data["explanation"], str) and len(data["explanation"].strip()) > 0
    assert data["provider"] in {"openai", "fallback"}
    assert isinstance(data["model"], str) and len(data["model"]) > 0
    assert isinstance(data["timestamp"], str)
