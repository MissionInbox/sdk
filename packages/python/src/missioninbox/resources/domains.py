"""The `domains` resource. Access via `mi.domains`."""

from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

from .._http import HttpClient
from .domain_redirects import DomainRedirects


class Domains:
    def __init__(self, http: HttpClient) -> None:
        self._http = http
        self.redirects = DomainRedirects(http)

    def list(self, **params: Any) -> dict[str, Any]:
        """List domains with optional filters."""
        return self._http.request("GET", "/api/domains", query=params)

    def get(self, id: str) -> dict[str, Any]:
        """Retrieve a domain by UUID."""
        return self._http.request("GET", f"/api/domains/by-id/{quote(id, safe='')}")

    def get_by_name(self, domain_name: str) -> dict[str, Any]:
        """Retrieve a domain by name (with published DNS records)."""
        return self._http.request("GET", f"/api/domains/{quote(domain_name, safe='')}")

    def get_statistics(self) -> dict[str, Any]:
        return self._http.request("GET", "/api/domains/statistic")

    def export_csv(self, **params: Any) -> str:
        """Export domains as CSV. Accepts the same filters as `list`."""
        result = self._http.request("GET", "/api/domains/export", query=params)
        return result if isinstance(result, str) else ""

    def get_admin_mailboxes(self, domain_name: str) -> dict[str, Any]:
        """List admin/postmaster/abuse mailboxes for a domain."""
        return self._http.request(
            "GET",
            f"/api/domains/{quote(domain_name, safe='')}/admin-mailboxes",
        )

    def create(
        self,
        *,
        domain_name: str,
        project_id: Optional[str] = None,
        redirect_url: Optional[str] = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"domainName": domain_name}
        if project_id is not None:
            body["projectId"] = project_id
        if redirect_url is not None:
            body["redirectUrl"] = redirect_url
        return self._http.request("POST", "/api/domains/create", body=body)

    def bulk_create(self, *, domains: list[dict[str, Any]]) -> dict[str, Any]:
        """Register many domains. Returns a task id."""
        return self._http.request(
            "POST",
            "/api/domains/bulk-create",
            body={"domains": domains},
        )

    def verify(self, domain_name: str) -> dict[str, Any]:
        """Trigger DNS verification for a single domain."""
        return self._http.request(
            "POST",
            "/api/domains/verify",
            body={"domainName": domain_name},
        )

    def bulk_verify(self, *, domain_names: list[str]) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/bulk-verify",
            body={"domainNames": domain_names},
        )

    def push_dns(self, domain_name: str) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/push-dns",
            body={"domainName": domain_name},
        )

    def bulk_push_dns(self, *, domain_names: list[str]) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/bulk-push-dns",
            body={"domainNames": domain_names},
        )

    def repush_dns(self, domain_name: str) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/repush",
            body={"domainName": domain_name},
        )

    def bulk_repush_dns(self, *, domain_names: list[str]) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/bulk-repush",
            body={"domainNames": domain_names},
        )

    def clean_dns(self, domain_name: str) -> dict[str, Any]:
        return self._http.request(
            "DELETE",
            f"/api/domains/{quote(domain_name, safe='')}/dns",
        )

    def delete(self, domain_name: str) -> dict[str, Any]:
        return self._http.request(
            "DELETE",
            f"/api/domains/{quote(domain_name, safe='')}",
        )

    def bulk_delete(self, *, domain_names: list[str]) -> dict[str, Any]:
        return self._http.request(
            "POST",
            "/api/domains/bulk-delete",
            body={"domainNames": domain_names},
        )
