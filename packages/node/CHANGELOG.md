# Changelog

## 0.2.0

**Breaking:** resources are now exposed directly on the client (no more `transactional.` prefix).

Migration:

```diff
- mi.transactional.emails.send({ ... })
+ mi.emails.send({ ... })

- mi.transactional.sendingIdentifiers.create({ ... })
+ mi.sendingIdentifiers.create({ ... })
```

Full API coverage added:

- `emails`: `getStatus`, `getBulkStatus`, `getDetails`, `getRaw`, `search`, `getSendLimit` (plus existing `send`).
- `emailQueue`: `list`, `retry`, `cancel`.
- `domains`: full CRUD + verification + DNS push/repush/clean + bulk variants (17 methods) and nested `domains.redirects` sub-resource (11 methods).
- `sendingIdentifiers`: `get`, `update`, `delete` (in addition to existing `list`, `create`).
- `projects`: full CRUD + `assignDomains`.
- `analytics`: `getOverview`, `getActivityGraph`.
- `tasks`: `list`, `get`, `cancel`, `getOutputs`, `getStatsSummary`, plus a `waitFor(id, options)` helper that polls until a terminal status.
- `health`: unauthenticated `check()`.

Other:

- `MissionInbox.request()` now supports query strings for `GET` endpoints.
- CSV / plain-text responses are returned as strings (used by `domains.exportCsv` and `health.check`).
- Retries now cover `PATCH` / `PUT` / `DELETE` as well as `GET` / `POST`.

## 0.1.0

Initial release.

- `MissionInbox` client with required `apiKey` + `baseUrl`, `X-Server-API-Key` auth, retries on 429/5xx.
- `emails.send()` — send transactional email.
- `sendingIdentifiers.list()` / `.create()` — manage registered sender addresses.
- Typed error hierarchy rooted at `MissionInboxError`.
