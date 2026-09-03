"""Error mapping tests."""

from __future__ import annotations

import pytest

from missioninbox import (
    AuthenticationError,
    ConflictError,
    DomainBlacklistedError,
    NotFoundError,
    PermissionError,
    RateLimitError,
    SendError,
    SendLimitExceededError,
    ServerError,
    SubscriptionInactiveError,
    UnregisteredSenderError,
    UnverifiedDomainError,
    ValidationError,
)


def _send(client):
    return client.emails.send(from_="a@b.com", to="c@d.com", subject="s", text="t")


@pytest.mark.parametrize(
    ("status", "message", "exc_class"),
    [
        (401, "Invalid credentials", AuthenticationError),
        (
            403,
            "x@y.com is not a registered sending identifier. Register it before sending.",
            UnregisteredSenderError,
        ),
        (
            403,
            "x@y.com cannot send yet: its domain y.com is not verified for sending (dns_pending).",
            UnverifiedDomainError,
        ),
        (403, "Your subscription is not active. Please contact support.", SubscriptionInactiveError),
        (403, "Daily send limit of 20 reached for the Free plan.", SendLimitExceededError),
        (403, "This domain is listed on Spamhaus and it's disabled for sending.", DomainBlacklistedError),
        (400, "From address is required", ValidationError),
        (404, "Not found", NotFoundError),
        (409, "already registered", ConflictError),
        (422, "Failed to send email: SES rejected the message", SendError),
        (429, "Too many requests", RateLimitError),
        (500, "Internal error", ServerError),
    ],
)
def test_error_mapping(httpx_mock, client, status, message, exc_class):
    httpx_mock.add_response(
        status_code=status,
        json={"statusCode": status, "message": message},
    )
    with pytest.raises(exc_class):
        _send(client)


def test_403_generic_permission(httpx_mock, client):
    httpx_mock.add_response(status_code=403, json={"message": "Forbidden."})
    with pytest.raises(PermissionError) as exc_info:
        _send(client)
    # Should be exactly the base PermissionError, not one of the specific subclasses.
    assert exc_info.type is PermissionError
