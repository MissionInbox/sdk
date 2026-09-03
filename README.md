# MissionInbox SDKs

Official SDKs for the [MissionInbox](https://missioninbox.com) transactional email API.

Send transactional email, register sender identifiers, manage domains, and inspect send activity — all through a consistent surface across four languages. **The same resources and method names exist in every SDK;** only the language idioms differ (camelCase in JS, snake_case in Python, `from_` for the `from` keyword collision, `Map`-based inputs in Java/PHP where variadic params would balloon).

## Packages

| Language | Package | Install |
|---|---|---|
| JavaScript / TypeScript | [`@missioninbox/sdk`](https://www.npmjs.com/package/@missioninbox/sdk) | `npm install @missioninbox/sdk` |
| PHP | [`missioninbox/sdk`](https://packagist.org/packages/missioninbox/sdk) | `composer require missioninbox/sdk` |
| Python | [`missioninbox`](https://pypi.org/project/missioninbox/) | `pip install missioninbox` |
| Java | [`com.missioninbox:sdk`](https://central.sonatype.com/artifact/com.missioninbox/sdk) | Maven / Gradle — see the [Java README](./packages/java/README.md) |

## Quick start

Node / TypeScript (see the per-language READMEs for the same in Python, PHP, and Java):

```ts
import { MissionInbox } from '@missioninbox/sdk';

const mi = new MissionInbox({
  apiKey: process.env.MI_API_KEY,
  baseUrl: process.env.MI_API_URL,
});

await mi.emails.send({
  from: 'notifications@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hi 👋</p>',
});
```

The `from` address must be a **registered sending identifier**. Register one before your first send:

```ts
await mi.sendingIdentifiers.create({
  emailAddress: 'notifications@yourdomain.com',
  displayName: 'Acme Notifications',
});
```

## Get an API key

Generate a **product API key** from your MissionInbox dashboard. The SDK sends it via the `X-Server-API-Key` header — the key is scoped to a single MissionInbox product (Transactional), so keep separate keys for staging and production.

Plan caps for reference:

- **Free** — 20 sends/day, 600 sends/month.
- **Scale** — no cap; per-account throughput agreed with your account manager.

The SDK reports both cap states via `mi.emails.getSendLimit()` and raises a typed `SendLimitExceededError` when either cap is hit.

## Environment URLs

The SDK ships **no default `baseUrl`** — you always pass the URL for your environment, so it can't accidentally target the wrong one:

- **Staging:** `https://api-v4-staging.missioninbox.com`
- **Production:** contact your MissionInbox account manager for the URL assigned to your account.

## Resources (all languages)

Every SDK exposes these eight top-level resources:

| Resource | Purpose |
|---|---|
| `emails` | Send, look up status, fetch details, search |
| `emailQueue` | Inspect / retry / cancel queued messages |
| `domains` | Register domains, verify DNS, push records, delete |
| `domains.redirects` | Set up URL redirects on a domain |
| `sendingIdentifiers` | Manage approved `From:` addresses |
| `projects` | Group domains into projects |
| `analytics` | Send activity overview and time-series graphs |
| `tasks` | Poll background bulk-operation tasks — includes a `waitFor()` helper |
| `health` | Unauthenticated liveness ping |

Method names use each language's idiomatic case (`getStatus` / `get_status`) and errors surface as typed exceptions rooted at `MissionInboxError` / `MissionInboxException`. See the per-language README for the full error hierarchy.

## Per-language docs

- [Node / TypeScript](./packages/node/README.md)
- [PHP](./packages/php/README.md)
- [Python](./packages/python/README.md)
- [Java](./packages/java/README.md)

## Support

- Issues: <https://github.com/MissionInbox/sdk/issues>

## License

MIT — see [LICENSE](./LICENSE).
