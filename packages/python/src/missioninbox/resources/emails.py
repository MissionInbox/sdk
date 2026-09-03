"""The `emails` resource. Access via `mi.emails`."""

from __future__ import annotations

from typing import Any, Optional, Union

from .._http import HttpClient


def _to_list(value: Union[str, list[str]]) -> list[str]:
    return list(value) if isinstance(value, list) else [value]


class Emails:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def send(
        self,
        *,
        from_: str,
        to: Union[str, list[str], None] = None,
        cc: Union[str, list[str], None] = None,
        bcc: Union[str, list[str], None] = None,
        subject: Optional[str] = None,
        html: Optional[str] = None,
        text: Optional[str] = None,
        reply_to: Optional[str] = None,
        sender: Optional[str] = None,
        tag: Optional[str] = None,
        headers: Optional[dict[str, str]] = None,
        message_id: Optional[str] = None,
        attachments: Optional[list[dict[str, str]]] = None,
    ) -> dict[str, Any]:
        """Send a transactional email.

        At least one recipient (``to``, ``cc``, or ``bcc``) and one body
        (``html`` or ``text``) are required. ``from_`` must be a registered
        sending identifier.

        Note: ``from_`` has a trailing underscore because ``from`` is a
        reserved word in Python.

        Example:
            >>> mi.emails.send(
            ...     from_="notifications@acme.com",
            ...     to="user@example.com",
            ...     subject="Welcome",
            ...     html="<p>Hi</p>",
            ... )

        Each attachment dict should have ``filename``, ``content_type``, and
        base64-encoded ``content``.
        """
        payload: dict[str, Any] = {
            "from": from_,
            "reply_to": reply_to if reply_to is not None else from_,
        }
        if to is not None:
            payload["to"] = _to_list(to)
        if cc is not None:
            payload["cc"] = _to_list(cc)
        if bcc is not None:
            payload["bcc"] = _to_list(bcc)
        if subject is not None:
            payload["subject"] = subject
        if html is not None:
            payload["html_body"] = html
        if text is not None:
            payload["plain_body"] = text
        if sender is not None:
            payload["sender"] = sender
        if tag is not None:
            payload["tag"] = tag
        if headers is not None:
            payload["headers"] = headers
        if message_id is not None:
            payload["message_id"] = message_id
        if attachments:
            payload["attachments"] = [
                {
                    "name": a["filename"],
                    "content_type": a["content_type"],
                    "data": a["content"],
                }
                for a in attachments
            ]

        return self._http.request("POST", "/api/email/send", body=payload)

    def get_status(self, message_id: str) -> dict[str, Any]:
        """Look up the delivery status of a single message."""
        return self._http.request("POST", "/api/email/status", body={"messageId": message_id})

    def get_bulk_status(self, message_ids: list[str]) -> dict[str, Any]:
        """Look up delivery status for many messages. ``None`` entries mean the id was not found."""
        return self._http.request("POST", "/api/email/bulk_status", body={"messageIds": message_ids})

    def get_details(
        self,
        message_id: str,
        include: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """Fetch full details of a message.

        ``include`` opts into extra sections: ``properties``, ``activity``,
        ``headers``, ``spam_checks``, ``content``, ``attachments``.
        """
        body: dict[str, Any] = {"id": message_id}
        if include:
            body["include"] = ",".join(include)
        return self._http.request("POST", "/api/email/details", body=body)

    def get_raw(self, message_id: str) -> dict[str, Any]:
        """Retrieve the raw RFC-822 source of a message."""
        return self._http.request("POST", "/api/email/raw", body={"id": message_id})

    def search(
        self,
        *,
        from_: Optional[str] = None,
        sending_identifier_id: Optional[str] = None,
        to: Optional[str] = None,
        message_id: Optional[str] = None,
        status: Optional[str] = None,
        direction: Optional[str] = None,
        keyword: Optional[str] = None,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        order: Optional[str] = None,
    ) -> dict[str, Any]:
        """Search sent/received messages."""
        body: dict[str, Any] = {}
        if from_ is not None:
            body["from"] = from_
        if sending_identifier_id is not None:
            body["sending_identifier_id"] = sending_identifier_id
        if to is not None:
            body["to"] = to
        if message_id is not None:
            body["message_id"] = message_id
        if status is not None:
            body["status"] = status
        if direction is not None:
            body["direction"] = direction
        if keyword is not None:
            body["keyword"] = keyword
        if page is not None:
            body["page"] = page
        if limit is not None:
            body["limit"] = limit
        if order is not None:
            body["order"] = order
        return self._http.request("POST", "/api/email/search", body=body)

    def get_send_limit(self) -> dict[str, Any]:
        """Report the account's current send-limit state."""
        return self._http.request("GET", "/api/email/send-limit-status")
