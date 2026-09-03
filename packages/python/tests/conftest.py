"""Shared fixtures for the test suite."""

from __future__ import annotations

import json
from typing import Any, Callable

import pytest

from missioninbox import MissionInbox


@pytest.fixture
def base_url() -> str:
    return "https://api.example.com"


@pytest.fixture
def client(base_url: str) -> MissionInbox:
    return MissionInbox(
        api_key="test-key",
        base_url=base_url,
        max_retries=0,
    )


@pytest.fixture
def parse_body() -> Callable[[Any], Any]:
    """Decode a captured request's JSON body."""

    def _parse(request: Any) -> Any:
        return json.loads(request.content.decode())

    return _parse
