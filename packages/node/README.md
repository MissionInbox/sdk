# missioninbox

Official [MissionInbox](https://missioninbox.com) SDK for Node.js and TypeScript.

## Install

```bash
npm install missioninbox
```

Requires Node.js 18 or newer.

## Send a transactional email

```ts
import { MissionInbox } from 'missioninbox';

const mi = new MissionInbox({
  apiKey: process.env.MI_API_KEY!,
  baseUrl: process.env.MI_API_URL!, // provided by MissionInbox for your environment
});

const { id } = await mi.transactional.emails.send({
  from: 'notifications@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hi 👋</p>',
});

console.log('sent', id);
```

The `from` address must be a **registered sending identifier**. Register one before your first send:

```ts
await mi.transactional.sendingIdentifiers.create({
  emailAddress: 'notifications@yourdomain.com',
  displayName: 'Acme Notifications',
});
```

You can also list every identifier registered on the account:

```ts
const identifiers = await mi.transactional.sendingIdentifiers.list();
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | Required. Your MissionInbox product API key. |
| `baseUrl` | `string` | — | Required. The API URL for your environment. |
| `timeout` | `number` | `30000` | Per-request timeout in milliseconds. |
| `maxRetries` | `number` | `2` | Retries on 429 and 5xx responses (exponential backoff, honours `Retry-After`). |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Override for testing or proxy scenarios. |

## Errors

Every failure throws a subclass of `MissionInboxError`. Catch the specific class you care about:

```ts
import {
  MissionInbox,
  AuthenticationError,
  UnregisteredSenderError,
  UnverifiedDomainError,
  SendLimitExceededError,
} from 'missioninbox';

try {
  await mi.transactional.emails.send({ /* … */ });
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

## API reference

### `mi.transactional.emails.send(params)`

Send a transactional email. Returns `{ id, message, status, time }`.

At least one recipient (`to`, `cc`, or `bcc`) and one body (`html` or `text`) are required. `replyTo` defaults to `from`. Multiple recipients accepted as an array or a single string.

### `mi.transactional.sendingIdentifiers.list()`

Returns every registered identifier for the account.

### `mi.transactional.sendingIdentifiers.create({ emailAddress, displayName? })`

Register a new sending identifier. The identifier's domain must already exist on the account. The response's `canSend` is `false` until DNS + verification complete.

## License

MIT
