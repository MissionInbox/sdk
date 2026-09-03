# Changelog

## 0.1.0

Initial release. Full customer-facing Transactional API coverage:

- `emails`: `send`, `get_status`, `get_bulk_status`, `get_details`, `get_raw`, `search`, `get_send_limit`.
- `email_queue`: `list`, `retry`, `cancel`.
- `domains`: full CRUD + verification + DNS push/repush/clean + bulk variants (17 methods) and nested `domains.redirects` sub-resource (11 methods).
- `sending_identifiers`: `list`, `get`, `create`, `update`, `delete`.
- `projects`: `list`, `get`, `create`, `update`, `delete`, `assign_domains`.
- `analytics`: `get_overview`, `get_activity_graph`.
- `tasks`: `list`, `get`, `cancel`, `get_outputs`, `get_stats_summary`, plus `wait_for(id, ...)` helper that polls until a terminal status.
- `health`: unauthenticated `check()`.

Ergonomics:

- `httpx` for HTTP; users can pass a custom `httpx.Client` via `http_client`.
- Typed exception hierarchy rooted at `MissionInboxError`.
- Retries on 429 / 5xx with exponential backoff and `Retry-After` respect.
- Context-manager support (`with MissionInbox(...) as mi:`).
