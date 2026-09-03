"""The `email_queue` resource. Access via `mi.email_queue`."""

from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

from .._http import HttpClient


class EmailQueue:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        status: Optional[str] = None,
        sending_account_id: Optional[str] = None,
        page: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> dict[str, Any]:
        """List queued messages."""
        query: dict[str, Any] = {}
        if status is not None:
            query["status"] = status
        if sending_account_id is not None:
            query["sendingAccountId"] = sending_account_id
        if page is not None:
            query["page"] = page
        if limit is not None:
            query["limit"] = limit
        return self._http.request("GET", "/api/email/queue", query=query)

    def retry(self, id: str) -> dict[str, Any]:
        """Retry a failed queued message."""
        return self._http.request("POST", f"/api/email/queue/{quote(id, safe='')}/retry")

    def cancel(self, id: str) -> dict[str, Any]:
        """Cancel a pending queued message."""
        return self._http.request("POST", f"/api/email/queue/{quote(id, safe='')}/cancel")
