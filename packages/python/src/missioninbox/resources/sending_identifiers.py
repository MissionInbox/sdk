"""The `sending_identifiers` resource. Access via `mi.sending_identifiers`."""

from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

from .._http import HttpClient


class SendingIdentifiers:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self) -> list[dict[str, Any]]:
        """List every registered sending identifier."""
        return self._http.request("GET", "/api/sending-identifiers")

    def get(self, id: str) -> dict[str, Any]:
        return self._http.request("GET", f"/api/sending-identifiers/{quote(id, safe='')}")

    def create(
        self,
        *,
        email_address: str,
        display_name: Optional[str] = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"emailAddress": email_address}
        if display_name is not None:
            body["displayName"] = display_name
        return self._http.request("POST", "/api/sending-identifiers", body=body)

    def update(self, id: str, *, display_name: Optional[str] = None) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if display_name is not None:
            body["displayName"] = display_name
        return self._http.request(
            "PATCH",
            f"/api/sending-identifiers/{quote(id, safe='')}",
            body=body,
        )

    def delete(self, id: str) -> dict[str, Any]:
        return self._http.request(
            "DELETE",
            f"/api/sending-identifiers/{quote(id, safe='')}",
        )
