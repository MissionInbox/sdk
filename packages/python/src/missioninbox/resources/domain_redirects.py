"""Domain redirects sub-resource. Access via `mi.domains.redirects`."""

from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

from .._http import HttpClient


class DomainRedirects:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def get_dns_config(self) -> dict[str, Any]:
        """Return the IP + CNAME target values for manual DNS publishing."""
        return self._http.request("GET", "/api/domains/redirect/dns-config")

    def get(self, domain_name: str) -> dict[str, Any]:
        return self._http.request("GET", f"/api/domains/{quote(domain_name, safe='')}/redirect")

    def setup(
        self,
        domain_name: str,
        *,
        redirect_url: str,
        enabled: Optional[bool] = None,
        force_https: Optional[bool] = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"redirectUrl": redirect_url}
        if enabled is not None:
            body["enabled"] = enabled
        if force_https is not None:
            body["forceHttps"] = force_https
        return self._http.request(
            "PUT",
            f"/api/domains/{quote(domain_name, safe='')}/redirect",
            body=body,
        )

    def push_dns(self, domain_name: str) -> dict[str, Any]:
        return self._http.request(
            "POST",
            f"/api/domains/{quote(domain_name, safe='')}/redirect/push-dns",
        )

    def verify_dns(self, domain_name: str) -> dict[str, Any]:
        return self._http.request(
            "POST",
            f"/api/domains/{quote(domain_name, safe='')}/redirect/verify-dns",
        )

    def get_events(self, domain_name: str, limit: Optional[int] = None) -> dict[str, Any]:
        query = {"limit": limit} if limit is not None else None
        return self._http.request(
            "GET",
            f"/api/domains/{quote(domain_name, safe='')}/redirect/events",
            query=query,
        )

    def delete(self, domain_name: str) -> dict[str, Any]:
        return self._http.request(
            "DELETE",
            f"/api/domains/{quote(domain_name, safe='')}/redirect",
        )

    def bulk_setup(self, *, redirects: list[dict[str, Any]]) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/redirects/bulk-setup",
            body={"redirects": redirects},
        )

    def bulk_update(self, *, updates: list[dict[str, Any]]) -> dict[str, Any]:
        return self._http.request(
            "PATCH",
            "/api/domains/redirects/bulk-update",
            body={"updates": updates},
        )

    def bulk_delete(self, *, domain_names: list[str]) -> dict[str, Any]:
        return self._http.request(
            "DELETE",
            "/api/domains/redirects/bulk-delete",
            body={"domainNames": domain_names},
        )

    def bulk_create_or_update(self, *, redirects: list[dict[str, Any]]) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/redirects/bulk-create-or-update",
            body={"redirects": redirects},
        )
