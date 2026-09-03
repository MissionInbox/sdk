<?php

/**
 * MissionInbox PHP SDK — error catalog.
 *
 * Deliberately triggers each error the SDK maps, prints the raw HTTP
 * response body observed, and verifies the SDK's exception classification.
 * Companion to `main.php`; run separately via `php error-catalog.php`.
 */

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use MissionInbox\Exceptions\AuthenticationException;
use MissionInbox\Exceptions\ConflictException;
use MissionInbox\Exceptions\MissionInboxException;
use MissionInbox\Exceptions\NetworkException;
use MissionInbox\Exceptions\NotFoundException;
use MissionInbox\Exceptions\UnregisteredSenderException;
use MissionInbox\Exceptions\UnverifiedDomainException;
use MissionInbox\Exceptions\ValidationException;
use MissionInbox\MissionInbox;

if (is_readable(__DIR__ . '/.env')) {
    Dotenv::createImmutable(__DIR__)->load();
}

$apiKey = getenv('MI_API_KEY') ?: ($_ENV['MI_API_KEY'] ?? '');
$baseUrl = getenv('MI_API_URL') ?: ($_ENV['MI_API_URL'] ?? '');
$testSender = getenv('MI_TEST_SENDER') ?: ($_ENV['MI_TEST_SENDER'] ?? '');
$testTo = getenv('MI_TEST_TO') ?: ($_ENV['MI_TEST_TO'] ?? '');
$testDomain = getenv('MI_TEST_DOMAIN') ?: ($_ENV['MI_TEST_DOMAIN'] ?? '');

if ($apiKey === '' || $baseUrl === '') {
    fwrite(STDERR, "MI_API_KEY and MI_API_URL are required.\n");
    exit(2);
}

$mi = new MissionInbox([
    'api_key' => $apiKey,
    'base_url' => $baseUrl,
    'max_retries' => 0,
]);

$ts = (int) (microtime(true) * 1000);
$canTrigger = $testSender !== '' && $testTo !== '' && $testDomain !== '';

$results = [];

function trigger(int $id, string $name, string $expectedClass, callable $fn, array &$results): void
{
    $expected = (new \ReflectionClass($expectedClass))->getShortName();
    echo "\n━━━ {$id}. {$expected}: {$name} ━━━\n";
    try {
        $r = $fn();
        echo "  ✗ Expected {$expected}, got success: " . substr(json_encode($r), 0, 120) . "\n";
        $results[] = ['id' => $id, 'name' => $name, 'expected' => $expected, 'actual' => 'no-throw', 'status' => 0, 'pass' => false];
    } catch (\Throwable $err) {
        $actual = (new \ReflectionClass($err))->getShortName();
        $status = $err instanceof MissionInboxException ? $err->status : 0;
        $body = $err instanceof MissionInboxException ? $err->body : null;
        $pass = $err instanceof $expectedClass;
        $mark = $pass ? '✓' : '✗';
        echo "  {$mark} Actual class:  {$actual}" . ($pass ? '' : "  (expected {$expected})") . "\n";
        echo "     HTTP status:  {$status}\n";
        echo "     Response body: " . json_encode($body) . "\n";
        $msg = substr($err->getMessage(), 0, 160);
        echo "     Message:       {$msg}\n";
        $results[] = ['id' => $id, 'name' => $name, 'expected' => $expected, 'actual' => $actual, 'status' => $status, 'pass' => $pass];
    }
}

echo "MissionInbox error-catalog run — base={$baseUrl}\n";
if (!$canTrigger) {
    echo "  (MI_TEST_SENDER / TO / DOMAIN not set — will skip triggers that need them)\n";
}

// 1. AuthenticationException
$badKey = new MissionInbox(['api_key' => 'obviously-wrong-key', 'base_url' => $baseUrl, 'max_retries' => 0]);
trigger(1, 'wrong API key', AuthenticationException::class,
    fn () => $badKey->emails->getSendLimit(), $results);

// 2. ValidationException — no recipient
if ($canTrigger) {
    trigger(2, 'send with no recipient', ValidationException::class,
        fn () => $mi->emails->send([
            'from' => $testSender,
            'subject' => 'no recipient',
            'text' => 'should fail validation',
        ]), $results);
} else {
    echo "\n━━━ 2. ValidationException: send with no recipient ━━━\n  (skipped)\n";
}

// 3. ValidationException — no body
if ($canTrigger) {
    trigger(3, 'send with no body', ValidationException::class,
        fn () => $mi->emails->send([
            'from' => $testSender,
            'to' => $testTo,
            'subject' => 'no body',
        ]), $results);
} else {
    echo "\n━━━ 3. ValidationException: send with no body ━━━\n  (skipped)\n";
}

// 4. UnregisteredSenderException
if ($canTrigger) {
    trigger(4, 'send from unregistered address', UnregisteredSenderException::class,
        fn () => $mi->emails->send([
            'from' => "never-registered-{$ts}@example.invalid",
            'to' => $testTo,
            'subject' => 'unregistered',
            'text' => 'should fail',
        ]), $results);
} else {
    echo "\n━━━ 4. UnregisteredSenderException ━━━\n  (skipped)\n";
}

// 5. NotFoundException
trigger(5, 'fetch non-existent sending identifier', NotFoundException::class,
    fn () => $mi->sendingIdentifiers->get('00000000-0000-0000-0000-000000000000'), $results);

// 6. ConflictException — register identifier twice
if ($canTrigger) {
    $testAddr = "sdk-error-catalog-{$ts}@" . explode('@', $testSender)[1];
    $firstId = null;
    try {
        $created = $mi->sendingIdentifiers->create([
            'emailAddress' => $testAddr,
            'displayName' => 'SDK error catalog — safe to delete',
        ]);
        $firstId = $created['id'];
        trigger(6, 'register identifier that already exists', ConflictException::class,
            fn () => $mi->sendingIdentifiers->create([
                'emailAddress' => $testAddr,
                'displayName' => 'duplicate',
            ]), $results);
    } catch (\Throwable $err) {
        echo "\n━━━ 6. ConflictException: register identifier twice ━━━\n";
        echo "  ✗ Setup failed: {$err->getMessage()}\n";
    } finally {
        if ($firstId) {
            try { $mi->sendingIdentifiers->delete($firstId); } catch (\Throwable $ignored) {}
        }
    }
} else {
    echo "\n━━━ 6. ConflictException ━━━\n  (skipped)\n";
}

// 7. UnverifiedDomainException
if ($canTrigger) {
    $subDomain = "sdk-error-{$ts}.{$testDomain}";
    $testFrom = "sender@{$subDomain}";
    $identifierId = null;
    try {
        $created = $mi->domains->bulkCreate(['domains' => [['domainName' => $subDomain]]]);
        $mi->tasks->waitFor($created['taskId'], ['pollInterval' => 3000, 'timeout' => 30000]);
        $identifier = $mi->sendingIdentifiers->create(['emailAddress' => $testFrom]);
        $identifierId = $identifier['id'];
        trigger(7, 'send from unverified-domain identifier', UnverifiedDomainException::class,
            fn () => $mi->emails->send([
                'from' => $testFrom,
                'to' => $testTo,
                'subject' => 'unverified domain',
                'text' => 'should fail',
            ]), $results);
    } catch (\Throwable $err) {
        echo "\n━━━ 7. UnverifiedDomainException ━━━\n";
        echo "  ✗ Setup failed: {$err->getMessage()}\n";
    } finally {
        if ($identifierId) {
            try { $mi->sendingIdentifiers->delete($identifierId); } catch (\Throwable $ignored) {}
        }
        try { $mi->domains->bulkDelete(['domainNames' => [$subDomain]]); } catch (\Throwable $ignored) {}
    }
} else {
    echo "\n━━━ 7. UnverifiedDomainException ━━━\n  (skipped)\n";
}

// 8. NetworkException
$unreachable = new MissionInbox([
    'api_key' => $apiKey,
    'base_url' => 'https://127.0.0.1:1',
    'max_retries' => 0,
    'timeout' => 2000,
]);
trigger(8, 'unreachable host', NetworkException::class,
    fn () => $unreachable->health->check(), $results);

// Summary
echo "\n━━━ Summary ━━━\n";
$passes = count(array_filter($results, fn ($r) => $r['pass']));
$total = count($results);
echo "  {$passes}/{$total} exception mappings correct\n";
foreach ($results as $r) {
    $mark = $r['pass'] ? '✓' : '✗';
    echo "  {$mark} #{$r['id']} [{$r['status']}] {$r['expected']}: {$r['name']}\n";
}
echo "\n";
echo "Not tested here (need special account state or would burden staging):\n";
echo "  SubscriptionInactiveException — inactive account\n";
echo "  SendLimitExceededException    — Free plan hitting 20/day cap\n";
echo "  DomainBlacklistedException    — blacklisted domain\n";
echo "  RateLimitException            — sustained request volume\n";
echo "  ServerException               — API 5xx\n";
echo "  SendException                 — SES rejection\n";
echo "  PermissionException (base)    — non-specific 403\n";
