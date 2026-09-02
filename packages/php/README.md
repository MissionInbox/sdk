# missioninbox/sdk

Official [MissionInbox](https://missioninbox.com) SDK for PHP.

## Install

```bash
composer require missioninbox/sdk
```

Requires PHP 8.1 or newer.

## Send a transactional email

```php
<?php

require __DIR__ . '/vendor/autoload.php';

use MissionInbox\MissionInbox;

$mi = new MissionInbox([
    'api_key' => getenv('MI_API_KEY'),
    'base_url' => getenv('MI_API_URL'), // provided by MissionInbox for your environment
]);

$result = $mi->emails->send([
    'from' => 'notifications@yourdomain.com',
    'to' => 'user@example.com',
    'subject' => 'Welcome',
    'html' => '<p>Hi 👋</p>',
]);

echo 'sent: ' . $result['id'];
```

The `from` address must be a **registered sending identifier**. Register one first:

```php
$mi->sendingIdentifiers->create([
    'emailAddress' => 'notifications@yourdomain.com',
    'displayName' => 'Acme Notifications',
]);
```

## Resources

The client exposes eight top-level resources:

| Resource | Purpose |
|---|---|
| `$mi->emails` | Send, look up status, fetch details, search |
| `$mi->emailQueue` | Inspect / retry / cancel queued messages |
| `$mi->domains` | Register domains, verify DNS, push records, delete |
| `$mi->domains->redirects` | Set up URL redirects on a domain |
| `$mi->sendingIdentifiers` | Manage approved `From:` addresses |
| `$mi->projects` | Group domains into projects |
| `$mi->analytics` | Send activity overview and time-series graphs |
| `$mi->tasks` | Poll background tasks (bulk operations) |
| `$mi->health` | Unauthenticated liveness ping |

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `api_key` | `string` | — | Required. Your MissionInbox product API key. |
| `base_url` | `string` | — | Required. The API URL for your environment. |
| `timeout` | `int` | `30000` | Per-request timeout in milliseconds. |
| `max_retries` | `int` | `2` | Retries on 429 and 5xx (exponential backoff, honours `Retry-After`). |
| `http_client` | `Psr\Http\Client\ClientInterface` | Guzzle | PSR-18 override for testing or proxy scenarios. |

## Errors

Every failure throws a subclass of `MissionInbox\Exceptions\MissionInboxException`. Catch the specific class you care about:

```php
use MissionInbox\Exceptions\{
    AuthenticationException,
    UnregisteredSenderException,
    UnverifiedDomainException,
    SendLimitExceededException,
};

try {
    $mi->emails->send([/* ... */]);
} catch (AuthenticationException $e) {
    // 401 — API key missing or invalid
} catch (UnregisteredSenderException $e) {
    // 403 — `from` address hasn't been registered
} catch (UnverifiedDomainException $e) {
    // 403 — domain DNS not verified
} catch (SendLimitExceededException $e) {
    // 403 — plan cap reached
}
```

Full hierarchy under `MissionInbox\Exceptions\`:

- `MissionInboxException` — base
  - `AuthenticationException` (401)
  - `PermissionException` (403)
    - `UnregisteredSenderException`, `UnverifiedDomainException`, `SubscriptionInactiveException`, `SendLimitExceededException`, `DomainBlacklistedException`
  - `ValidationException` (400)
  - `NotFoundException` (404)
  - `ConflictException` (409)
  - `SendException` (422)
  - `RateLimitException` (429)
  - `ServerException` (5xx)
  - `NetworkException` (transport failure)

## Bulk operations and tasks

Bulk endpoints dispatch a background task and return `['taskId' => ..., 'message' => ...]`. Poll with `tasks->waitFor()`:

```php
$response = $mi->domains->bulkCreate([
    'domains' => [
        ['domainName' => 'acme.com'],
        ['domainName' => 'shop.acme.com'],
    ],
]);

$done = $mi->tasks->waitFor($response['taskId'], [
    'pollInterval' => 3000,
    'timeout' => 5 * 60 * 1000,
    'onProgress' => fn(array $t) => print($t['progress'] . "%\n"),
]);
```

## Working with domains

```php
$domain = $mi->domains->create(['domainName' => 'acme.com']);

$verification = $mi->domains->verify('acme.com');
if ($verification['fullyVerified']) {
    echo "ready to send\n";
}

// If a DNS manager is connected:
$mi->domains->pushDns('acme.com');
```

## Projects

```php
$project = $mi->projects->create(['name' => 'Acme Prod']);
$mi->projects->assignDomains($project['id'], [
    'domainNames' => ['acme.com', 'shop.acme.com'],
]);
```

## Analytics

```php
$overview = $mi->analytics->getOverview();
echo $overview['currentMonth']['emailsSent'];

$graph = $mi->analytics->getActivityGraph([
    'granularity' => 'daily',
    'startDate' => '2026-08-01T00:00:00Z',
    'endDate' => '2026-08-31T23:59:59Z',
    'counters' => ['outgoing', 'bounces'],
]);
```

## Environment URLs

MissionInbox provides the `base_url` for your environment — the SDK ships with no default so it can't accidentally target the wrong one.

## License

MIT
