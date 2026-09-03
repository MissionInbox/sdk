"""Cross-resource sanity tests: URLs, methods, wire mapping."""

from __future__ import annotations




def test_sending_identifiers_list(httpx_mock, client, parse_body):
    httpx_mock.add_response(json=[])
    client.sending_identifiers.list()
    req = httpx_mock.get_requests()[0]
    assert req.method == "GET"
    assert req.url.path == "/api/sending-identifiers"


def test_sending_identifiers_update_patch(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"id": "x"})
    client.sending_identifiers.update("uuid-1", display_name="Acme")
    req = httpx_mock.get_requests()[0]
    assert req.method == "PATCH"
    assert parse_body(req) == {"displayName": "Acme"}


def test_domains_list_query_string(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"data": []})
    client.domains.list(verified=True, limit=50, page=2)
    query = httpx_mock.get_requests()[0].url.query.decode()
    assert "verified=true" in query
    assert "limit=50" in query
    assert "page=2" in query


def test_domains_get_by_id_path(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"id": "x"})
    client.domains.get("uuid-1")
    assert httpx_mock.get_requests()[0].url.path == "/api/domains/by-id/uuid-1"


def test_domains_verify(httpx_mock, client, parse_body):
    httpx_mock.add_response(
        json={"fullyVerified": True, "dnsChecks": {"dkim": {"status": "OK"}}, "message": ""}
    )
    client.domains.verify("acme.com")
    req = httpx_mock.get_requests()[0]
    assert req.url.path == "/api/domains/verify"
    assert parse_body(req) == {"domainName": "acme.com"}


def test_domains_bulk_create_returns_task_id(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"taskId": "t-1", "message": "started"})
    result = client.domains.bulk_create(domains=[{"domainName": "a.com"}])
    assert result["taskId"] == "t-1"


def test_domains_export_csv_returns_text(httpx_mock, client, parse_body):
    httpx_mock.add_response(
        text="name,verified\nacme.com,true",
        headers={"Content-Type": "text/csv"},
    )
    csv = client.domains.export_csv()
    assert csv == "name,verified\nacme.com,true"


def test_domain_redirect_setup_put(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"success": True, "action": "created"})
    client.domains.redirects.setup(
        "acme.com",
        redirect_url="https://www.acme.com",
        force_https=True,
    )
    req = httpx_mock.get_requests()[0]
    assert req.method == "PUT"
    assert req.url.path == "/api/domains/acme.com/redirect"
    assert parse_body(req) == {"redirectUrl": "https://www.acme.com", "forceHttps": True}


def test_projects_assign_domains_patch(httpx_mock, client, parse_body):
    httpx_mock.add_response(
        json={"project": {}, "total": 1, "successful": 1, "failed": 0, "reassigned": 0, "results": []}
    )
    client.projects.assign_domains("p-1", domain_names=["a.com"])
    req = httpx_mock.get_requests()[0]
    assert req.method == "PATCH"
    assert req.url.path == "/api/projects/p-1/domains"


def test_analytics_activity_graph_query(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={})
    client.analytics.get_activity_graph(
        granularity="daily",
        start_date="2026-01-01T00:00:00Z",
        end_date="2026-01-31T23:59:59Z",
        counters=["outgoing", "bounces"],
    )
    query = httpx_mock.get_requests()[0].url.query.decode()
    assert "granularity=daily" in query
    assert "counters=outgoing" in query
    assert "counters=bounces" in query


def test_email_queue_retry_post(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={})
    client.email_queue.retry("q-1")
    req = httpx_mock.get_requests()[0]
    assert req.method == "POST"
    assert req.url.path == "/api/email/queue/q-1/retry"


def test_health_check_returns_text(httpx_mock, client, parse_body):
    httpx_mock.add_response(text="Healthy", headers={"Content-Type": "text/plain"})
    assert client.health.check() == "Healthy"
