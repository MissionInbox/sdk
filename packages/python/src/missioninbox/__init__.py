"""Official MissionInbox SDK for Python.

Example:
    >>> import os
    >>> from missioninbox import MissionInbox
    >>> mi = MissionInbox(
    ...     api_key=os.environ["MI_API_KEY"],
    ...     base_url=os.environ["MI_API_URL"],
    ... )
    >>> mi.emails.send(
    ...     from_="notifications@acme.com",
    ...     to="user@example.com",
    ...     subject="Welcome",
    ...     html="<p>Hi</p>",
    ... )
"""

from ._version import __version__
from .client import MissionInbox
from .exceptions import (
    AuthenticationError,
    ConflictError,
    DomainBlacklistedError,
    MissionInboxError,
    NetworkError,
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
from .resources.tasks import TERMINAL_TASK_STATUSES

__all__ = [
    "TERMINAL_TASK_STATUSES",
    "AuthenticationError",
    "ConflictError",
    "DomainBlacklistedError",
    "MissionInbox",
    "MissionInboxError",
    "NetworkError",
    "NotFoundError",
    "PermissionError",
    "RateLimitError",
    "SendError",
    "SendLimitExceededError",
    "ServerError",
    "SubscriptionInactiveError",
    "UnregisteredSenderError",
    "UnverifiedDomainError",
    "ValidationError",
    "__version__",
]
