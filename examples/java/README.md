# MissionInbox Java SDK — end-to-end example

Single-file walk-through that exercises every method in [`com.missioninbox:sdk`](https://central.sonatype.com/artifact/com.missioninbox/sdk) against a live environment. Doubles as a tutorial and as an integration test.

**See also:** [package docs](../../packages/java/README.md) for the SDK's full method reference, and the [top-level examples README](../README.md) for the shared design.

## Prerequisites

- Java 11 or newer and Maven 3.6+
- A MissionInbox API key — [where to get one](../../README.md#get-an-api-key)
- If you want to run **full mode** (see below): a registered sending identifier, a recipient email address you control, and a domain registered on your account

## Run

```bash
cd examples/java
cp .env.example .env    # then fill in at least MI_API_KEY + MI_API_URL
mvn exec:java
```

Drop `-q` for Maven's compile output on first run; add `-q` back for quieter re-runs.

## Modes

Set via `MI_EXAMPLE_MODE`:

- **`safe`** (default) — read-only endpoints only. No state changes, no emails sent. Reads still print account state (domain names, identifier addresses) to stdout.
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
9. `emails` (full only) — send → getDetails → getStatus → getBulkStatus → getRaw → search
10. `emailQueue` — list, best-effort retry/cancel on any existing items
11. **Errors** — trigger 401 and 403 unregistered-sender against a throwaway client; verify the SDK maps them to the right typed exception

At the end, a **Cleanup** section runs in `finally` — deletes anything the run created.

Method inputs are `Map<String, Object>` parameter bags: `mi.emails.send(Map.of("from", ..., "to", ..., ...))`. The SDK accepts these directly because the wire format is already open-ended JSON; typed request classes would just wrap them.

## Expected output (first few lines)

A healthy safe-mode run starts like this:

```
MissionInbox SDK example — mode=safe, base=https://api-v4-staging.missioninbox.com

━━━ 1. Health check ━━━
  → health.check()                              Healthy

━━━ 2. Send-limit status ━━━
  → emails.getSendLimit()                       unlimited (paid plan)

━━━ 3. Sending identifiers ━━━
  → sendingIdentifiers.list()                   3 identifier(s)
  → sendingIdentifiers.get('abc12345…')         john@yourdomain.com (canSend: true)
  ~ skipped: create/update/delete (safe mode)
```

`→` = call succeeded · `~` = deliberately skipped · `✗` = error (paste it back for debugging).

## Deliberately not called

- **`domains.cleanDns()`** — irreversibly clears DNS records on your DNS manager. Documented but never invoked from this example.
- **`domains.redirects` bulk variants on production data** — bulk redirect changes go against real DNS. Only run when `MI_TEST_REDIRECT_DOMAIN` is set to a domain you're willing to churn.

## Troubleshooting

- **`AuthenticationException` at step 1** — `MI_API_KEY` is wrong or the base URL doesn't match its environment.
- **`UnregisteredSenderException` at step 9** — `MI_TEST_SENDER` isn't a registered sending identifier for this account. Re-run in safe mode and check the §3 output for what's registered.
- **`ConflictException` when creating a test project or identifier** — a resource with the timestamp-suffixed name already exists (e.g. from an interrupted run). The name embeds `System.currentTimeMillis()`, so a fresh run gets past it.
- **`emails.getRaw` prints `status=error`** — expected for very-fresh sends; the raw MIME source is assembled asynchronously and may not be ready for a message sent seconds ago.
