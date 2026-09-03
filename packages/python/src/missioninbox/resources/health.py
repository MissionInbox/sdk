"""The `health` resource. Access via `mi.health`."""

from __future__ import annotations

from typing import Union

from .._http import HttpClient


class Health:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def check(self) -> Union[str, dict]:
        """Ping the API. Returns the API's health string (or dict, if JSON)."""
        return self._http.request("GET", "/api/health")
