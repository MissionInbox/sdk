# @missioninbox/sdk

Official [MissionInbox](https://missioninbox.com) SDK for Node.js and TypeScript.

## Install

```bash
npm install @missioninbox/sdk
```

Requires Node.js 18 or newer.

## Send a transactional email

```ts
import { MissionInbox } from '@missioninbox/sdk';

const mi = new MissionInbox({
  apiKey: process.env.MI_API_KEY!,
  baseUrl: process.env.MI_API_URL!, // provided by MissionInbox for your environment
});

const { id } = await mi.emails.send({
  from: 'notifications@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hi 👋</p>',
});

console.log('sent', id);
```

The `from` address must be a **registered sending identifier**. Register one first:

```ts
await mi.sendingIdentifiers.create({
  emailAddress: 'notifications@yourdomain.com',
  displayName: 'Acme Notifications',
});
```

## Resources

The client exposes eight top-level resources — dot-completion in your editor is the fastest way to explore them:

| Resource | Purpose |
|---|---|
| `mi.emails` | Send, look up status, fetch details, search |
| `mi.emailQueue` | Inspect / retry / cancel queued messages |
| `mi.domains` | Register domains, verify DNS, push records, delete |
| `mi.domains.redirects` | Set up URL redirects on a domain |
| `mi.sendingIdentifiers` | Manage approved `From:` addresses |
| `mi.projects` | Group domains into projects |
| `mi.analytics` | Send activity overview and time-series graphs |
| `mi.tasks` | Poll background tasks (bulk operations) |
| `mi.health` | Unauthenticated liveness ping |

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | Required. Your MissionInbox product API key. |
| `baseUrl` | `string` | — | Required. The API URL for your environment. |
| `timeout` | `number` | `30000` | Per-request timeout in milliseconds. |
| `maxRetries` | `number` | `2` | Retries on 429 and 5xx (exponential backoff, honours `Retry-After`). |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Override for testing or proxy scenarios. |

## Errors

Every failure throws a subclass of `MissionInboxError`. Catch the specific class you care about:

```ts
import {
  AuthenticationError,
  UnregisteredSenderError,
  UnverifiedDomainError,
  SendLimitExceededError,
} from '@missioninbox/sdk';

try {
  await mi.emails.send({ /* … */ });
} catch (err) {
  if (err instanceof AuthenticationError) {
    // 401 — API key missing or invalid
  } else if (err instanceof UnregisteredSenderError) {
    // 403 — the `from` address hasn't been registered as a sending identifier
  } else if (err instanceof UnverifiedDomainError) {
    // 403 — the domain's DNS records aren't verified for sending yet
  } else if (err instanceof SendLimitExceededError) {
    // 403 — plan cap reached
  } else {
    throw err;
  }
}
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
  - `NetworkError` (fetch failure)

## Bulk operations and tasks

Bulk endpoints (bulk create/verify/delete domains, etc.) dispatch a background task and return `{ taskId, message }` immediately. Use `mi.tasks.waitFor()` to block until the task finishes:

```ts
const { taskId } = await mi.domains.bulkCreate({
  domains: [{ domainName: 'acme.com' }, { domainName: 'shop.acme.com' }],
});

const done = await mi.tasks.waitFor(taskId, {
  pollInterval: 3000,
  timeout: 5 * 60 * 1000,
  onProgress: (t) => console.log(`${t.progress}%`),
});

console.log(done.status, done.result);
```

Or roll your own polling with `mi.tasks.get(id)` if you need custom logic.

## Working with domains

Register a domain and verify DNS:

```ts
const domain = await mi.domains.create({ domainName: 'acme.com' });

const verification = await mi.domains.verify('acme.com');
if (verification.fullyVerified) {
  console.log('ready to send');
}

// If you have a DNS manager connected, push records automatically:
await mi.domains.pushDns('acme.com');
```

Fetch published DNS records for reference:

```ts
const records = await mi.domains.getByName('acme.com');
console.log(records.dnsRecords);
```

## Projects

Group domains for reporting and access control:

```ts
const project = await mi.projects.create({ name: 'Acme Prod' });
await mi.projects.assignDomains(project.id, {
  domainNames: ['acme.com', 'shop.acme.com'],
});
```

## Analytics

Account-wide overview:

```ts
const overview = await mi.analytics.getOverview();
console.log(overview.currentMonth.emailsSent);
```

Daily send activity over a range:

```ts
const graph = await mi.analytics.getActivityGraph({
  granularity: 'daily',
  startDate: '2026-08-01T00:00:00Z',
  endDate: '2026-08-31T23:59:59Z',
  counters: ['outgoing', 'bounces'],
});
```

## Environment URLs

MissionInbox provides the `baseUrl` for your environment. The SDK ships with no default so it can't accidentally target the wrong one. Typical values look like:

- Staging: `https://api-v4-staging.missioninbox.com`
- Production: your assigned URL

## Migration from `0.1.x`

`0.2.0` flattened the resource namespace — the redundant `transactional.` prefix is gone. Update your calls:

```diff
- await mi.transactional.emails.send({ ... });
+ await mi.emails.send({ ... });

- await mi.transactional.sendingIdentifiers.create({ ... });
+ await mi.sendingIdentifiers.create({ ... });
```

## License

MIT
