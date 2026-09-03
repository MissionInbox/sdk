"""The `analytics` resource. Access via `mi.analytics`."""

from __future__ import annotations

from typing import Any, Optional

from .._http import HttpClient


class Analytics:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def get_overview(self) -> dict[str, Any]:
        """Account-wide overview: send counts, domain / mailbox counts."""
        return self._http.request("GET", "/api/analytics/overview")

    def get_activity_graph(
        self,
        *,
        granularity: str,
        start_date: str,
        end_date: str,
        counters: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """Time-series data for send/receive activity.

        Args:
            granularity: One of ``hourly``, ``daily``, ``monthly``, ``yearly``.
            start_date: ISO 8601 timestamp.
            end_date: ISO 8601 timestamp.
            counters: Optional filter — any of ``incoming``, ``outgoing``,
                ``bounces``, ``spam``, ``held``.
        """
        query: dict[str, Any] = {
            "granularity": granularity,
            "startDate": start_date,
            "endDate": end_date,
        }
        if counters:
            query["counters"] = counters
        return self._http.request("GET", "/api/analytics/activity-graph", query=query)
