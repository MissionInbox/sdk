"""Internal HTTP transport. Users should not import from here directly."""

from __future__ import annotations

import json
import random
import time
from typing import Any, Optional

import httpx

from ._version import __version__
from .exceptions import (
    MissionInboxError,
    NetworkError,
    error_from_response,
)

_RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


class HttpClient:
    """Transport wrapper for the SDK. Not part of the public API."""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        timeout: float = 30.0,
        max_retries: int = 2,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._max_retries = max_retries
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(timeout=timeout)

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def request(
        self,
        method: str,
        path: str,
        *,
        query: Optional[dict[str, Any]] = None,
        body: Optional[dict[str, Any]] = None,
    ) -> Any:
        url = f"{self._base_url}{path}"
        headers = {
            "X-Server-API-Key": self._api_key,
            "User-Agent": f"missioninbox-python/{__version__}",
            "Accept": "application/json",
        }
        params = _flatten_query(query) if query else None
        content: Optional[bytes] = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            content = json.dumps(body).encode("utf-8")

        attempt = 0
        last_error: Optional[BaseException] = None

        while attempt <= self._max_retries:
            try:
                response = self._client.request(
                    method,
                    url,
                    headers=headers,
                    params=params,
                    content=content,
                )
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt < self._max_retries:
                    time.sleep(_backoff_delay(attempt, None))
                    attempt += 1
                    continue
                raise NetworkError(str(exc)) from exc

            if 200 <= response.status_code < 300:
                return _parse_success(response)

            if response.status_code in _RETRYABLE_STATUSES and attempt < self._max_retries:
                time.sleep(_backoff_delay(attempt, response.headers.get("retry-after")))
                attempt += 1
                continue

            raise error_from_response(response.status_code, _safe_decode(response))

        raise NetworkError(str(last_error) if last_error else "Request failed after retries.")


def _parse_success(response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None
    text = response.text
    if not text:
        return None
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        return response.json()
    return text


def _safe_decode(response: httpx.Response) -> Optional[dict[str, Any]]:
    text = response.text
    if not text:
        return None
    try:
        decoded = json.loads(text)
        return decoded if isinstance(decoded, dict) else None
    except json.JSONDecodeError:
        return None


def _flatten_query(query: dict[str, Any]) -> list[tuple[str, str]]:
    """httpx accepts list-of-tuples for repeated keys — used by counters[] etc."""
    pairs: list[tuple[str, str]] = []
    for key, value in query.items():
        if value is None:
            continue
        if isinstance(value, list):
            for v in value:
                if v is not None:
                    pairs.append((key, _stringify(v)))
        elif isinstance(value, bool):
            pairs.append((key, "true" if value else "false"))
        else:
            pairs.append((key, _stringify(value)))
    return pairs


def _stringify(v: Any) -> str:
    if isinstance(v, bool):
        return "true" if v else "false"
    return str(v)


def _backoff_delay(attempt: int, retry_after: Optional[str]) -> float:
    if retry_after:
        try:
            seconds = float(retry_after)
            if seconds > 0:
                return min(seconds, 30.0)
        except ValueError:
            pass
    base = 0.25 * (2**attempt)
    jitter = random.random() * base * 0.25
    return min(base + jitter, 8.0)


__all__ = ["HttpClient", "MissionInboxError"]
