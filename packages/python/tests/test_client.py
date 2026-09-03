"""Client construction + shared request-shape tests."""

from __future__ import annotations

import pytest

from missioninbox import MissionInbox, __version__


def test_missing_api_key_raises():
    with pytest.raises(ValueError, match="api_key"):
        MissionInbox(api_key="", base_url="https://x")


def test_missing_base_url_raises():
    with pytest.raises(ValueError, match="base_url"):
        MissionInbox(api_key="k", base_url="")


def test_strips_trailing_slashes_from_base_url(httpx_mock):
    httpx_mock.add_response(
        url="https://api.example.com/api/email/send",
        json={"id": "1", "message": "ok", "status": "sent", "time": 1},
    )
    mi = MissionInbox(api_key="k", base_url="https://api.example.com//")
    mi.emails.send(from_="a@b.com", to="c@d.com", subject="s", text="t")


def test_sets_auth_and_user_agent_headers(httpx_mock, client):
    httpx_mock.add_response(json={"id": "1", "message": "ok", "status": "sent", "time": 1})
    client.emails.send(from_="a@b.com", to="c@d.com", subject="s", text="t")
    request = httpx_mock.get_requests()[0]
    assert request.headers["X-Server-API-Key"] == "test-key"
    assert request.headers["User-Agent"] == f"missioninbox-python/{__version__}"
    assert request.headers["Content-Type"] == "application/json"
