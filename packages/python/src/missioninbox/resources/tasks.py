"""The `tasks` resource. Access via `mi.tasks`."""

from __future__ import annotations

import time
from typing import Any, Callable, Optional
from urllib.parse import quote

from .._http import HttpClient

TERMINAL_TASK_STATUSES: tuple[str, ...] = ("COMPLETED", "FAILED", "CANCELLED")


class Tasks:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        type: Optional[str] = None,
        status: Optional[str] = None,
        page: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> dict[str, Any]:
        query: dict[str, Any] = {}
        if type is not None:
            query["type"] = type
        if status is not None:
            query["status"] = status
        if page is not None:
            query["page"] = page
        if limit is not None:
            query["limit"] = limit
        return self._http.request("GET", "/api/tasks", query=query)

    def get(self, id: str) -> dict[str, Any]:
        return self._http.request("GET", f"/api/tasks/{quote(id, safe='')}")

    def cancel(self, id: str) -> dict[str, Any]:
        return self._http.request("DELETE", f"/api/tasks/{quote(id, safe='')}/cancel")

    def get_outputs(self, id: str, since: Optional[str] = None) -> dict[str, Any]:
        query = {"since": since} if since is not None else None
        return self._http.request(
            "GET",
            f"/api/tasks/{quote(id, safe='')}/outputs",
            query=query,
        )

    def get_stats_summary(self) -> dict[str, Any]:
        return self._http.request("GET", "/api/tasks/stats/summary")

    def wait_for(
        self,
        id: str,
        *,
        poll_interval: float = 2.0,
        timeout: float = 300.0,
        on_progress: Optional[Callable[[dict[str, Any]], None]] = None,
    ) -> dict[str, Any]:
        """Poll a task until it reaches a terminal state.

        Args:
            id: Task id.
            poll_interval: Seconds between polls. Default 2.0.
            timeout: Give up after this many seconds. Default 300 (5 min).
            on_progress: Called with each poll result (useful for progress UIs).

        Raises:
            TimeoutError: When the deadline passes before completion.
        """
        deadline = time.monotonic() + timeout
        while True:
            task = self.get(id)
            if on_progress is not None:
                on_progress(task)
            status = task.get("status")
            if status in TERMINAL_TASK_STATUSES:
                return task
            if time.monotonic() + poll_interval > deadline:
                raise TimeoutError(
                    f"Timed out after {timeout}s waiting for task {id} (last status: {status})"
                )
            time.sleep(poll_interval)
