"""Tests for `mi.tasks.*`, including the `wait_for` helper."""

from __future__ import annotations

import pytest


def _task(status: str, progress: int = 0) -> dict:
    return {
        "id": "t-1",
        "type": "BULK_CREATE_DOMAINS",
        "status": status,
        "progress": progress,
        "retryCount": 0,
        "maxRetries": 3,
    }


def test_list_query_params(httpx_mock, client):
    httpx_mock.add_response(json={"tasks": [], "total": 0, "page": 1, "limit": 20, "totalPages": 0})
    client.tasks.list(status="COMPLETED", page=2, limit=50)
    query = httpx_mock.get_requests()[0].url.query.decode()
    assert "status=COMPLETED" in query
    assert "page=2" in query
    assert "limit=50" in query


def test_cancel_delete(httpx_mock, client):
    httpx_mock.add_response(json=_task("CANCELLED"))
    client.tasks.cancel("t-1")
    req = httpx_mock.get_requests()[0]
    assert req.method == "DELETE"
    assert req.url.path == "/api/tasks/t-1/cancel"


def test_get_outputs_since(httpx_mock, client):
    httpx_mock.add_response(json={"outputs": []})
    client.tasks.get_outputs("t-1", since="out-9")
    assert "since=out-9" in httpx_mock.get_requests()[0].url.query.decode()


def test_wait_for_resolves_on_terminal(httpx_mock, client):
    httpx_mock.add_response(json=_task("PROCESSING", 10))
    httpx_mock.add_response(json=_task("PROCESSING", 50))
    httpx_mock.add_response(json=_task("COMPLETED", 100))

    progress: list[int] = []
    done = client.tasks.wait_for(
        "t-1",
        poll_interval=0.001,
        timeout=5,
        on_progress=lambda t: progress.append(t["progress"]),
    )
    assert done["status"] == "COMPLETED"
    assert progress == [10, 50, 100]


def test_wait_for_timeout(httpx_mock, client):
    httpx_mock.add_response(json=_task("PROCESSING", 10), is_reusable=True)
    # poll_interval > timeout guarantees deadline fires on iteration 1
    with pytest.raises(TimeoutError, match="Timed out"):
        client.tasks.wait_for("t-1", poll_interval=1.0, timeout=0.01)


def test_wait_for_immediate_on_already_terminal(httpx_mock, client):
    httpx_mock.add_response(json=_task("FAILED"))
    result = client.tasks.wait_for("t-1", poll_interval=0.001)
    assert result["status"] == "FAILED"
