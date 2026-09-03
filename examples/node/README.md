# MissionInbox Node SDK — end-to-end example

Single-file walk-through that exercises every method in [`@missioninbox/sdk`](https://www.npmjs.com/package/@missioninbox/sdk) against a live environment. Doubles as a tutorial and as an integration test.

## Prerequisites

- Node.js 18 or newer
- A MissionInbox API key (staging or production)
- If you want to run **full mode** (see below): a registered sending identifier, a recipient email address you control, and a domain registered on your account

## Run

```bash
cd examples/node
cp .env.example .env    # then fill in at least MI_API_KEY + MI_API_URL
npm install
npm start
```

## Modes

Set via `MI_EXAMPLE_MODE`:

- **`safe`** (default) — only read-only endpoints. No state changes, no emails sent. Safe on production.
- **`full`** — additionally exercises creates, updates, deletes, redirect setup, and sends **one real email**. Every resource created is deleted before exit.

Full mode requires these additional env vars:

| Var | Purpose |
|---|---|
| `MI_TEST_SENDER` | Registered sending identifier — used as `from:` on the test send |
| `MI_TEST_TO` | Recipient — receives one test email |
| `MI_TEST_DOMAIN` | A real domain on your account — used for reads and to derive test subdomains for `bulkCreate` (nothing hits your live DNS) |
| `MI_TEST_REDIRECT_DOMAIN` | Optional. If set, exercises `domains.redirects.setup/delete` against this domain. Otherwise only the read-side runs |

## What it does

Numbered sections, all output to stdout. Every method call gets one line: `→ methodName(args)  result`.

1. `health.check`
2. `emails.getSendLimit`
3. `sendingIdentifiers` — list, get, then (full) create/update/get/delete
4. `domains` — list, statistics, get by name / id, admin mailboxes, CSV export, then (full) bulk-create → `tasks.waitFor` → verify → delete + all bulk variants
5. `domains.redirects` — DNS config, existing redirect, then (full) setup → push → verify → events → delete + bulk variants
6. `projects` — list, get, then (full) create/update/assignDomains/delete
7. `analytics` — overview + activity graph (last 7 days daily)
8. `tasks` — list, get, outputs, stats, cancel demo (full)
9. `emails` (full only) — send → getStatus → getBulkStatus → getDetails → getRaw → search
10. `emailQueue` — list, best-effort retry/cancel on any existing items
11. **Errors** — trigger 401 and 403 unregistered-sender against a throwaway client; verify the SDK maps them to the right typed exception

At the end, a **Cleanup** section runs in `finally` — deletes anything the run created.

## Deliberately not called

- **`domains.cleanDns()`** — irreversibly clears DNS records on your DNS manager. Documented but never invoked from this example.
- **`domains.redirects` bulk variants on production data** — bulk redirect changes go against real DNS. Only run when `MI_TEST_REDIRECT_DOMAIN` is set to a domain you're willing to churn.

## Troubleshooting

- **`AuthenticationError` at step 1** — `MI_API_KEY` is wrong or the base URL doesn't match its environment.
- **`UnregisteredSenderError` at step 9** — `MI_TEST_SENDER` isn't a registered sending identifier. Run `mi.sendingIdentifiers.list()` to see what's registered.
- **`ValidationError` when creating a test project** — likely a project with that name already exists from a previous partial run. The name includes a timestamp so a re-run should get past it.

## What files land

- `main.ts` — the single-file walk-through
- `.env.example` — copy to `.env` and fill in
- `package.json`, `tsconfig.json` — minimal build config

No dist, no bundling. `tsx` runs the TypeScript directly.
