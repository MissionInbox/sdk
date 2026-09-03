"""The `projects` resource. Access via `mi.projects`."""

from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

from .._http import HttpClient


class Projects:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self) -> list[dict[str, Any]]:
        return self._http.request("GET", "/api/projects")

    def get(self, id: str) -> dict[str, Any]:
        return self._http.request("GET", f"/api/projects/{quote(id, safe='')}")

    def create(self, *, name: str) -> dict[str, Any]:
        return self._http.request("POST", "/api/projects", body={"name": name})

    def update(self, id: str, *, name: Optional[str] = None) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        return self._http.request("PATCH", f"/api/projects/{quote(id, safe='')}", body=body)

    def delete(self, id: str) -> dict[str, Any]:
        return self._http.request("DELETE", f"/api/projects/{quote(id, safe='')}")

    def assign_domains(self, id: str, *, domain_names: list[str]) -> dict[str, Any]:
        """Move domains into this project."""
        return self._http.request(
            "PATCH",
            f"/api/projects/{quote(id, safe='')}/domains",
            body={"domainNames": domain_names},
        )
