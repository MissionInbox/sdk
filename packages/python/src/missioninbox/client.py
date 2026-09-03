"""The MissionInbox client class."""

from __future__ import annotations

from typing import Optional

import httpx

from ._http import HttpClient
from .resources import (
    Analytics,
    Domains,
    Emails,
    EmailQueue,
    Health,
    Projects,
    SendingIdentifiers,
    Tasks,
)


class MissionInbox:
    """The MissionInbox API client.

    Construct once and reuse across your process; the client is stateless
    beyond its configuration.

    Args:
        api_key: Your MissionInbox product API key. Passed on every request
            via the ``X-Server-API-Key`` header.
        base_url: The API URL for your MissionInbox environment (staging,
            production, or dedicated). MissionInbox provides this — the SDK
            ships with no default so it can't accidentally target the wrong
            environment.
        timeout: Per-request timeout in seconds. Default 30.
        max_retries: Retries on 429 / 5xx. Default 2.
        http_client: Optional custom :class:`httpx.Client` for advanced
            transport control (proxies, TLS pinning, etc.).

    Raises:
        ValueError: When ``api_key`` or ``base_url`` is missing.

    Example:
        >>> import os
        >>> from missioninbox import MissionInbox
        >>> mi = MissionInbox(
        ...     api_key=os.environ["MI_API_KEY"],
        ...     base_url=os.environ["MI_API_URL"],
        ... )
        >>> result = mi.emails.send(
        ...     from_="notifications@acme.com",
        ...     to="user@example.com",
        ...     subject="Welcome",
        ...     html="<p>Hi</p>",
        ... )
    """

    emails: Emails
    email_queue: EmailQueue
    domains: Domains
    sending_identifiers: SendingIdentifiers
    projects: Projects
    analytics: Analytics
    tasks: Tasks
    health: Health

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        timeout: float = 30.0,
        max_retries: int = 2,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        if not api_key:
            raise ValueError("MissionInbox: `api_key` is required.")
        if not base_url:
            raise ValueError(
                "MissionInbox: `base_url` is required. Use the URL provided for your environment."
            )

        self._http = HttpClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            http_client=http_client,
        )

        self.emails = Emails(self._http)
        self.email_queue = EmailQueue(self._http)
        self.domains = Domains(self._http)
        self.sending_identifiers = SendingIdentifiers(self._http)
        self.projects = Projects(self._http)
        self.analytics = Analytics(self._http)
        self.tasks = Tasks(self._http)
        self.health = Health(self._http)

    def close(self) -> None:
        """Close the underlying HTTP client. Safe to call multiple times."""
        self._http.close()

    def __enter__(self) -> "MissionInbox":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        self.close()
