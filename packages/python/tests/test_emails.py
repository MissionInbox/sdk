"""Tests for `mi.emails.*`."""

from __future__ import annotations




def test_send_maps_camel_to_snake_and_defaults_reply_to(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"id": "42", "message": "Email sent", "status": "sent", "time": 123})

    result = client.emails.send(
        from_="notifications@acme.com",
        to="user@example.com",
        subject="Hi",
        html="<p>Hi</p>",
    )

    assert result == {"id": "42", "message": "Email sent", "status": "sent", "time": 123}

    body = parse_body(httpx_mock.get_requests()[0])
    assert body == {
        "from": "notifications@acme.com",
        "reply_to": "notifications@acme.com",
        "to": ["user@example.com"],
        "subject": "Hi",
        "html_body": "<p>Hi</p>",
    }


def test_send_attachments_to_snake_case(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"id": "1", "message": "ok", "status": "sent", "time": 1})

    client.emails.send(
        from_="a@b.com",
        to=["c@d.com"],
        subject="s",
        text="t",
        attachments=[
            {"filename": "x.pdf", "content_type": "application/pdf", "content": "aGk="}
        ],
    )

    body = parse_body(httpx_mock.get_requests()[0])
    assert body["attachments"] == [
        {"name": "x.pdf", "content_type": "application/pdf", "data": "aGk="}
    ]


def test_get_status(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"id": "1"})
    client.emails.get_status("msg_1")
    req = httpx_mock.get_requests()[0]
    assert req.url.path == "/api/email/status"
    assert parse_body(req) == {"messageId": "msg_1"}


def test_get_bulk_status(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"statuses": []})
    client.emails.get_bulk_status(["a", "b"])
    assert parse_body(httpx_mock.get_requests()[0]) == {"messageIds": ["a", "b"]}


def test_get_details_include_joined(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"message": {"id": 1}})
    client.emails.get_details("msg_1", include=["content", "headers"])
    assert parse_body(httpx_mock.get_requests()[0]) == {
        "id": "msg_1",
        "include": "content,headers",
    }


def test_get_details_omits_include(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"message": {"id": 1}})
    client.emails.get_details("msg_1")
    assert parse_body(httpx_mock.get_requests()[0]) == {"id": "msg_1"}


def test_get_raw(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"status": "success"})
    client.emails.get_raw("msg_1")
    assert parse_body(httpx_mock.get_requests()[0]) == {"id": "msg_1"}


def test_search_maps_sending_identifier_id(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"data": [], "total": 0, "page": 1, "limit": 30, "totalPages": 0})
    client.emails.search(sending_identifier_id="uuid-1", status="Sent", limit=10)
    assert parse_body(httpx_mock.get_requests()[0]) == {
        "sending_identifier_id": "uuid-1",
        "status": "Sent",
        "limit": 10,
    }


def test_get_send_limit_is_get(httpx_mock, client, parse_body):
    httpx_mock.add_response(json={"limited": False})
    result = client.emails.get_send_limit()
    assert result == {"limited": False}
    assert httpx_mock.get_requests()[0].method == "GET"
