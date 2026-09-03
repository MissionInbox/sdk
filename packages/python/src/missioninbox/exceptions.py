"""Exception hierarchy for the MissionInbox SDK.

Catch `MissionInboxError` to handle any SDK-originated failure, or catch a
specific subclass to react to a specific failure mode.
"""

from __future__ import annotations

from typing import Any, Optional


class MissionInboxError(Exception):
    """Base class for every exception raised by the SDK."""

    def __init__(
        self,
        message: str,
        status: int = 0,
        body: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.body = body


class AuthenticationError(MissionInboxError):
    """HTTP 401 — the API key is missing, malformed, or invalid."""


class PermissionError(MissionInboxError):  # noqa: A001 — SDK subclass; user catches by name
    """HTTP 403 when the failure doesn't match a more specific 403 subclass."""


class SubscriptionInactiveError(PermissionError):
    """HTTP 403 when the account's subscription is not active."""


class UnregisteredSenderError(PermissionError):
    """HTTP 403 when the `from` address hasn't been registered as a sending identifier."""


class UnverifiedDomainError(PermissionError):
    """HTTP 403 when the sending identifier's domain has not completed DNS/MTA verification."""


class DomainBlacklistedError(PermissionError):
    """HTTP 403 when the domain has been disabled for sending (e.g. blacklist)."""


class SendLimitExceededError(PermissionError):
    """HTTP 403 when the plan's daily or monthly send cap has been reached."""


class ValidationError(MissionInboxError):
    """HTTP 400 — request body failed validation."""


class ConflictError(MissionInboxError):
    """HTTP 409 — resource already exists (e.g. identifier already registered)."""


class SendError(MissionInboxError):
    """HTTP 422 — the MTA rejected the message."""


class RateLimitError(MissionInboxError):
    """HTTP 429 — too many requests."""


class NotFoundError(MissionInboxError):
    """HTTP 404 — resource not found."""


class ServerError(MissionInboxError):
    """HTTP 5xx after retries have been exhausted."""


class NetworkError(MissionInboxError):
    """Transport-layer failure (DNS, connection reset, timeout, aborted)."""


def _body_message(body: Optional[dict[str, Any]]) -> str:
    if not body:
        return ""
    m = body.get("message")
    if isinstance(m, list):
        return "; ".join(str(x) for x in m if x)
    if isinstance(m, str):
        return m
    return ""


def error_from_response(status: int, body: Optional[dict[str, Any]]) -> MissionInboxError:
    """Map an HTTP response to the appropriate `MissionInboxError` subclass."""
    message = _body_message(body) or f"HTTP {status}"
    lower = message.lower()

    if status == 401:
        return AuthenticationError(message, status, body)
    if status == 403:
        if "is not a registered sending identifier" in lower:
            return UnregisteredSenderError(message, status, body)
        if "not verified for sending" in lower:
            return UnverifiedDomainError(message, status, body)
        if "subscription is not active" in lower:
            return SubscriptionInactiveError(message, status, body)
        if "send limit" in lower:
            return SendLimitExceededError(message, status, body)
        if "disabled for sending" in lower or "listed on" in lower:
            return DomainBlacklistedError(message, status, body)
        return PermissionError(message, status, body)
    if status == 404:
        return NotFoundError(message, status, body)
    if status == 409:
        return ConflictError(message, status, body)
    if status == 422:
        return SendError(message, status, body)
    if status == 429:
        return RateLimitError(message, status, body)
    if status >= 500:
        return ServerError(message, status, body)
    if status >= 400:
        return ValidationError(message, status, body)
    return MissionInboxError(message, status, body)
