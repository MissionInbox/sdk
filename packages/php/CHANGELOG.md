# Changelog

## 0.1.0

Initial release. Full customer-facing Transactional API coverage:

- `emails`: `send`, `getStatus`, `getBulkStatus`, `getDetails`, `getRaw`, `search`, `getSendLimit`.
- `emailQueue`: `list`, `retry`, `cancel`.
- `domains`: full CRUD + verification + DNS push/repush/clean + bulk variants (17 methods) and nested `domains->redirects` sub-resource (11 methods).
- `sendingIdentifiers`: `list`, `get`, `create`, `update`, `delete`.
- `projects`: `list`, `get`, `create`, `update`, `delete`, `assignDomains`.
- `analytics`: `getOverview`, `getActivityGraph`.
- `tasks`: `list`, `get`, `cancel`, `getOutputs`, `getStatsSummary`, plus `waitFor($id, $options)` helper that polls until a terminal status.
- `health`: unauthenticated `check()`.

Ergonomics:

- PSR-18 HTTP client abstraction; Guzzle 7 as default. Bring your own client via `http_client` config.
- Typed exception hierarchy rooted at `MissionInbox\Exceptions\MissionInboxException`.
- Retries on 429 / 5xx with exponential backoff and `Retry-After` respect.
