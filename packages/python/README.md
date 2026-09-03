# missioninbox

Official [MissionInbox](https://missioninbox.com) SDK for Python.

## Install

```bash
pip install missioninbox
```

Requires Python 3.9 or newer.

## Send a transactional email

```python
import os
from missioninbox import MissionInbox

mi = MissionInbox(
    api_key=os.environ["MI_API_KEY"],
    base_url=os.environ["MI_API_URL"],  # provided by MissionInbox for your environment
)

result = mi.emails.send(
    from_="notifications@yourdomain.com",
    to="user@example.com",
    subject="Welcome",
    html="<p>Hi 👋</p>",
)

print("sent", result["id"])
```

> `from_` has a trailing underscore because `from` is a reserved keyword in Python. It maps to `from` on the wire.

The `from_` address must be a **registered sending identifier**. Register one first:

```python
mi.sending_identifiers.create(
    email_address="notifications@yourdomain.com",
    display_name="Acme Notifications",
)
```

## Resources

The client exposes eight top-level resources:

| Resource | Purpose |
|---|---|
| `mi.emails` | Send, look up status, fetch details, search |
| `mi.email_queue` | Inspect / retry / cancel queued messages |
| `mi.domains` | Register domains, verify DNS, push records, delete |
| `mi.domains.redirects` | Set up URL redirects on a domain |
| `mi.sending_identifiers` | Manage approved `From:` addresses |
| `mi.projects` | Group domains into projects |
| `mi.analytics` | Send activity overview and time-series graphs |
| `mi.tasks` | Poll background tasks (bulk operations) |
| `mi.health` | Unauthenticated liveness ping |

## Configuration

| Argument | Type | Default | Description |
|---|---|---|---|
| `api_key` | `str` | — | Required. Your MissionInbox product API key. |
| `base_url` | `str` | — | Required. The API URL for your environment. |
| `timeout` | `float` | `30.0` | Per-request timeout in seconds. |
| `max_retries` | `int` | `2` | Retries on 429 and 5xx (exponential backoff, honours `Retry-After`). |
| `http_client` | `httpx.Client` | new client | Optional override for advanced transport control. |

## Errors

Every failure raises a subclass of `MissionInboxError`. Catch the specific class you care about:

```python
from missioninbox import (
    AuthenticationError,
    UnregisteredSenderError,
    UnverifiedDomainError,
    SendLimitExceededError,
)

try:
    mi.emails.send(from_="...", to="...", subject="...", text="...")
except AuthenticationError:
    ...  # 401 — API key missing or invalid
except UnregisteredSenderError:
    ...  # 403 — `from` hasn't been registered
except UnverifiedDomainError:
    ...  # 403 — domain DNS not verified
except SendLimitExceededError:
    ...  # 403 — plan cap reached
```

Full hierarchy:

- `MissionInboxError` — base
  - `AuthenticationError` (401)
  - `PermissionError` (403)
    - `UnregisteredSenderError`, `UnverifiedDomainError`, `SubscriptionInactiveError`, `SendLimitExceededError`, `DomainBlacklistedError`
  - `ValidationError` (400)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `SendError` (422)
  - `RateLimitError` (429)
  - `ServerError` (5xx)
  - `NetworkError` (transport failure)

## Bulk operations and tasks

Bulk endpoints dispatch a background task and return `{"taskId": ..., "message": ...}` immediately. Use `tasks.wait_for()` to block until the task finishes:

```python
response = mi.domains.bulk_create(domains=[
    {"domainName": "acme.com"},
    {"domainName": "shop.acme.com"},
])

done = mi.tasks.wait_for(
    response["taskId"],
    poll_interval=3.0,
    timeout=5 * 60,
    on_progress=lambda t: print(f"{t['progress']}%"),
)

print(done["status"], done.get("result"))
```

## Working with domains

```python
domain = mi.domains.create(domain_name="acme.com")

verification = mi.domains.verify("acme.com")
if verification["fullyVerified"]:
    print("ready to send")

# If a DNS manager is connected:
mi.domains.push_dns("acme.com")
```

## Analytics

```python
overview = mi.analytics.get_overview()
print(overview["currentMonth"]["emailsSent"])

graph = mi.analytics.get_activity_graph(
    granularity="daily",
    start_date="2026-08-01T00:00:00Z",
    end_date="2026-08-31T23:59:59Z",
    counters=["outgoing", "bounces"],
)
```

## Context manager

The client owns its underlying `httpx.Client`. Use it as a context manager to close it cleanly:

```python
with MissionInbox(api_key=..., base_url=...) as mi:
    mi.emails.send(from_=..., to=..., subject=..., text=...)
```

Or call `mi.close()` explicitly.

## License

MIT
