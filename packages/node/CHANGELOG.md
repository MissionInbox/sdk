# Changelog

## 0.1.0

Initial release.

- `MissionInbox` client with required `apiKey` + `baseUrl`, `X-Server-API-Key` auth, retries on 429/5xx.
- `mi.transactional.emails.send()` — send transactional email.
- `mi.transactional.sendingIdentifiers.list()` / `.create()` — manage registered sender addresses.
- Typed error hierarchy rooted at `MissionInboxError`.
