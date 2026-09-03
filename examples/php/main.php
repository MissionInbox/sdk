<?php

/**
 * MissionInbox PHP SDK — end-to-end walk-through.
 *
 * Ports the Node example section-for-section. Set MI_EXAMPLE_MODE=full to
 * exercise destructive endpoints; every resource created is deleted at exit.
 */

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use MissionInbox\Exceptions\AuthenticationException;
use MissionInbox\Exceptions\MissionInboxException;
use MissionInbox\Exceptions\UnregisteredSenderException;
use MissionInbox\MissionInbox;

if (is_readable(__DIR__ . '/.env')) {
    Dotenv::createImmutable(__DIR__)->load();
}

$apiKey = getenv('MI_API_KEY') ?: ($_ENV['MI_API_KEY'] ?? '');
$baseUrl = getenv('MI_API_URL') ?: ($_ENV['MI_API_URL'] ?? '');
$mode = strtolower(getenv('MI_EXAMPLE_MODE') ?: ($_ENV['MI_EXAMPLE_MODE'] ?? 'safe'));
$testSender = getenv('MI_TEST_SENDER') ?: ($_ENV['MI_TEST_SENDER'] ?? '');
$testTo = getenv('MI_TEST_TO') ?: ($_ENV['MI_TEST_TO'] ?? '');
$testDomain = getenv('MI_TEST_DOMAIN') ?: ($_ENV['MI_TEST_DOMAIN'] ?? '');
$testRedirectDomain = getenv('MI_TEST_REDIRECT_DOMAIN') ?: ($_ENV['MI_TEST_REDIRECT_DOMAIN'] ?? '');

if ($apiKey === '') {
    fwrite(STDERR, "Missing MI_API_KEY. Copy .env.example to .env and fill it in.\n");
    exit(2);
}
if ($baseUrl === '') {
    fwrite(STDERR, "Missing MI_API_URL. Copy .env.example to .env and fill it in.\n");
    exit(2);
}
if (!in_array($mode, ['safe', 'full'], true)) {
    fwrite(STDERR, "MI_EXAMPLE_MODE must be 'safe' or 'full' (got '$mode')\n");
    exit(2);
}
$isFull = $mode === 'full';
if ($isFull) {
    $missing = [];
    if ($testSender === '') $missing[] = 'MI_TEST_SENDER';
    if ($testTo === '') $missing[] = 'MI_TEST_TO';
    if ($testDomain === '') $missing[] = 'MI_TEST_DOMAIN';
    if ($missing) {
        fwrite(STDERR, "Full mode requires: " . implode(', ', $missing) . "\n");
        exit(2);
    }
}

$mi = new MissionInbox(['api_key' => $apiKey, 'base_url' => $baseUrl]);
$ts = (int) (microtime(true) * 1000);
$testSenderDomain = $testSender ? explode('@', $testSender)[1] ?? '' : '';

$cleanup = [];
$state = [
    'firstDomainId' => null,
    'firstDomainName' => null,
    'firstIdentifierId' => null,
    'firstProjectId' => null,
    'firstTaskId' => null,
    'createdDomains' => [],
];

function printHeader(int $n, string $title): void
{
    echo "\n━━━ {$n}. {$title} ━━━\n";
}

function line(string $action, string $result): void
{
    $pad = strlen($action) < 44 ? str_repeat(' ', 44 - strlen($action)) : ' ';
    echo "  → {$action}{$pad}{$result}\n";
}

function skipMsg(string $reason): void
{
    echo "  ~ skipped: {$reason}\n";
}

function fail(string $action, \Throwable $err): void
{
    $name = (new \ReflectionClass($err))->getShortName();
    $msg = substr($err->getMessage(), 0, 80);
    $pad = strlen($action) < 44 ? str_repeat(' ', 44 - strlen($action)) : ' ';
    echo "  ✗ {$action}{$pad}{$name}: {$msg}\n";
}

function shortId(string $id): string
{
    return strlen($id) > 12 ? substr($id, 0, 8) . '…' : $id;
}

/**
 * @param callable(): mixed $fn
 * @param callable(mixed): string|null $format
 * @return mixed
 */
function tryCall(string $action, callable $fn, ?callable $format = null)
{
    try {
        $result = $fn();
        line($action, $format ? $format($result) : 'ok');
        return $result;
    } catch (\Throwable $err) {
        fail($action, $err);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────

function section1Health(MissionInbox $mi): void
{
    printHeader(1, 'Health check');
    tryCall(
        'health.check()',
        fn () => $mi->health->check(),
        fn ($r) => is_string($r) ? $r : json_encode($r),
    );
}

function section2SendLimit(MissionInbox $mi): void
{
    printHeader(2, 'Send-limit status');
    tryCall(
        'emails.getSendLimit()',
        fn () => $mi->emails->getSendLimit(),
        fn ($r) => $r['limited']
            ? "limited (daily {$r['daily']['sent']}/{$r['daily']['limit']}, monthly {$r['monthly']['sent']}/{$r['monthly']['limit']})"
            : 'unlimited (paid plan)',
    );
}

function section3SendingIdentifiers(MissionInbox $mi, bool $isFull, string $testSenderDomain, int $ts, array &$cleanup, array &$state): void
{
    printHeader(3, 'Sending identifiers');
    $identifiers = tryCall(
        'sendingIdentifiers.list()',
        fn () => $mi->sendingIdentifiers->list(),
        fn ($r) => count($r) . ' identifier(s)',
    );

    if ($identifiers && count($identifiers) > 0) {
        $state['firstIdentifierId'] = $identifiers[0]['id'];
        tryCall(
            "sendingIdentifiers.get('" . shortId($state['firstIdentifierId']) . "')",
            fn () => $mi->sendingIdentifiers->get($state['firstIdentifierId']),
            fn ($r) => "{$r['emailAddress']} (canSend: " . ($r['canSend'] ? 'true' : 'false') . ')',
        );
    }

    if (!$isFull) { skipMsg('create/update/delete (safe mode)'); return; }
    if ($testSenderDomain === '') { skipMsg('create/update/delete (MI_TEST_SENDER has no domain part)'); return; }

    $tempAddress = "sdk-example-{$ts}@{$testSenderDomain}";
    $created = tryCall(
        "sendingIdentifiers.create('$tempAddress')",
        fn () => $mi->sendingIdentifiers->create([
            'emailAddress' => $tempAddress,
            'displayName' => 'SDK example — safe to delete',
        ]),
        fn ($r) => 'id: ' . shortId($r['id']),
    );

    if ($created) {
        $cleanup[] = [
            'label' => "sendingIdentifiers.delete('" . shortId($created['id']) . "')",
            'fn' => fn () => $mi->sendingIdentifiers->delete($created['id']),
        ];

        tryCall(
            "sendingIdentifiers.update('" . shortId($created['id']) . "')",
            fn () => $mi->sendingIdentifiers->update($created['id'], ['displayName' => "SDK example {$ts} (updated)"]),
            fn ($r) => "displayName: " . json_encode($r['displayName']),
        );
    }
}

function section4Domains(MissionInbox $mi, bool $isFull, ?string $testDomain, int $ts, array &$cleanup, array &$state): void
{
    printHeader(4, 'Domains');

    $list = tryCall('domains.list({ limit: 5 })', fn () => $mi->domains->list(['limit' => 5]), fn ($r) => "{$r['total']} total");

    if ($list && count($list['data']) > 0) {
        $state['firstDomainId'] = $list['data'][0]['id'];
        $state['firstDomainName'] = $list['data'][0]['domainName'];
    }

    tryCall('domains.getStatistics()', fn () => $mi->domains->getStatistics(), fn ($r) => "{$r['verifiedDomains']}/{$r['totalDomains']} verified");

    $domainToRead = $testDomain ?: $state['firstDomainName'];
    if ($domainToRead) {
        tryCall(
            "domains.getByName('$domainToRead')",
            fn () => $mi->domains->getByName($domainToRead),
            fn ($r) => count($r['dnsRecords']) . ' DNS record(s) published',
        );
        tryCall(
            "domains.getAdminMailboxes('$domainToRead')",
            fn () => $mi->domains->getAdminMailboxes($domainToRead),
            fn ($r) => count($r['mailboxes']) . ' admin mailbox(es)',
        );
    } else {
        skipMsg('getByName/getAdminMailboxes (no domain)');
    }

    if ($state['firstDomainId']) {
        tryCall(
            "domains.get('" . shortId($state['firstDomainId']) . "')",
            fn () => $mi->domains->get($state['firstDomainId']),
            fn ($r) => "domainName={$r['domainName']}, verificationState={$r['verificationState']}",
        );
    }

    tryCall('domains.exportCsv({ limit: 5 })', fn () => $mi->domains->exportCsv(['limit' => 5]), fn ($r) => (substr_count($r, "\n")) . ' row(s) of CSV');

    if (!$isFull || !$testDomain) {
        skipMsg('bulkCreate/verify/pushDns/repush/delete (safe mode or MI_TEST_DOMAIN unset)');
        return;
    }

    $testA = "sdk-example-{$ts}-a.{$testDomain}";
    $testB = "sdk-example-{$ts}-b.{$testDomain}";

    $bulk = tryCall(
        "domains.bulkCreate([{$testA}, {$testB}])",
        fn () => $mi->domains->bulkCreate(['domains' => [['domainName' => $testA], ['domainName' => $testB]]]),
        fn ($r) => 'taskId: ' . shortId($r['taskId']),
    );

    if ($bulk) {
        $state['firstTaskId'] = $bulk['taskId'];
        $state['createdDomains'] = [$testA, $testB];
        $cleanup[] = [
            'label' => "domains.bulkDelete([$testA, $testB])",
            'fn' => fn () => $mi->domains->bulkDelete(['domainNames' => [$testA, $testB]]),
        ];

        tryCall(
            "tasks.waitFor('" . shortId($bulk['taskId']) . "')",
            fn () => $mi->tasks->waitFor($bulk['taskId'], ['pollInterval' => 3000, 'timeout' => 60000]),
            fn ($r) => "status={$r['status']}",
        );

        tryCall("domains.verify('$testA')", fn () => $mi->domains->verify($testA), fn ($r) => 'fullyVerified=' . ($r['fullyVerified'] ? 'true' : 'false'));
        tryCall(
            "domains.bulkVerify([$testA, $testB])",
            fn () => $mi->domains->bulkVerify(['domainNames' => [$testA, $testB]]),
            fn ($r) => 'taskId: ' . shortId($r['taskId']),
        );
        tryCall("domains.pushDns('$testA')", fn () => $mi->domains->pushDns($testA), fn ($r) => count($r['dnsRecords']) . ' records');
        tryCall(
            "domains.bulkPushDns([$testA])",
            fn () => $mi->domains->bulkPushDns(['domainNames' => [$testA]]),
            fn ($r) => 'taskId: ' . shortId($r['taskId']),
        );
        tryCall("domains.repushDns('$testA')", fn () => $mi->domains->repushDns($testA), fn ($r) => 'dmarcApplied=' . ($r['customDmarcApplied'] ? 'true' : 'false'));
        tryCall(
            "domains.bulkRepushDns([$testA])",
            fn () => $mi->domains->bulkRepushDns(['domainNames' => [$testA]]),
            fn ($r) => 'taskId: ' . shortId($r['taskId']),
        );
    }

    echo "  (domains.cleanDns intentionally not called — see README)\n";
}

function section5Redirects(MissionInbox $mi, bool $isFull, ?string $testRedirectDomain, ?string $testDomain, ?string $firstDomainName, array &$cleanup): void
{
    printHeader(5, 'Domain redirects');
    tryCall('domains.redirects.getDnsConfig()', fn () => $mi->domains->redirects->getDnsConfig(), fn ($r) => "ip={$r['ipAddress']}");

    $readDomain = $testRedirectDomain ?: $testDomain ?: $firstDomainName;
    if ($readDomain) {
        tryCall(
            "domains.redirects.get('$readDomain')",
            fn () => $mi->domains->redirects->get($readDomain),
            fn ($r) => $r['hasRedirect'] ? "redirect → {$r['redirect']['redirectUrl']}" : 'no redirect set',
        );
    } else {
        skipMsg('redirects.get (no domain)');
    }

    if (!$isFull || !$testRedirectDomain) {
        skipMsg('setup/pushDns/verifyDns/events/delete (needs MI_TEST_REDIRECT_DOMAIN)');
        return;
    }

    $setup = tryCall(
        "redirects.setup('$testRedirectDomain', → https://example.com)",
        fn () => $mi->domains->redirects->setup($testRedirectDomain, ['redirectUrl' => 'https://example.com', 'forceHttps' => true]),
        fn ($r) => "action={$r['action']}",
    );

    if ($setup) {
        $cleanup[] = [
            'label' => "redirects.delete('$testRedirectDomain')",
            'fn' => fn () => $mi->domains->redirects->delete($testRedirectDomain),
        ];
        tryCall("redirects.pushDns('$testRedirectDomain')", fn () => $mi->domains->redirects->pushDns($testRedirectDomain), fn ($r) => 'dnsPushed=' . ($r['dnsPushed'] ? 'true' : 'false'));
        tryCall("redirects.verifyDns('$testRedirectDomain')", fn () => $mi->domains->redirects->verifyDns($testRedirectDomain), fn ($r) => "dnsStatus={$r['dnsStatus']}");
        tryCall("redirects.getEvents('$testRedirectDomain')", fn () => $mi->domains->redirects->getEvents($testRedirectDomain, 5), fn ($r) => "{$r['totalEvents']} event(s)");
    }
}

function section6Projects(MissionInbox $mi, bool $isFull, int $ts, array &$cleanup, array &$state): void
{
    printHeader(6, 'Projects');
    $projects = tryCall('projects.list()', fn () => $mi->projects->list(), fn ($r) => count($r) . ' project(s)');

    if ($projects && count($projects) > 0) {
        $state['firstProjectId'] = $projects[0]['id'];
        tryCall(
            "projects.get('" . shortId($state['firstProjectId']) . "')",
            fn () => $mi->projects->get($state['firstProjectId']),
            fn ($r) => "{$r['name']} ({$r['domainsCount']} domains)",
        );
    }

    if (!$isFull) { skipMsg('create/update/assignDomains/delete (safe mode)'); return; }

    $projectName = "SDK example {$ts}";
    $p = tryCall(
        "projects.create('$projectName')",
        fn () => $mi->projects->create(['name' => $projectName]),
        fn ($r) => 'id: ' . shortId($r['id']),
    );

    if ($p) {
        $cleanup[] = [
            'label' => "projects.delete('" . shortId($p['id']) . "')",
            'fn' => fn () => $mi->projects->delete($p['id']),
        ];

        tryCall(
            "projects.update('" . shortId($p['id']) . "')",
            fn () => $mi->projects->update($p['id'], ['name' => "$projectName (updated)"]),
            fn ($r) => "name: {$r['name']}",
        );

        if (count($state['createdDomains']) > 0) {
            tryCall(
                "projects.assignDomains('" . shortId($p['id']) . "', " . count($state['createdDomains']) . " domain(s))",
                fn () => $mi->projects->assignDomains($p['id'], ['domainNames' => $state['createdDomains']]),
                fn ($r) => "assigned {$r['successful']}, failed {$r['failed']}",
            );
        } else {
            skipMsg('assignDomains (no test domains)');
        }
    }
}

function section7Analytics(MissionInbox $mi): void
{
    printHeader(7, 'Analytics');
    tryCall(
        'analytics.getOverview()',
        fn () => $mi->analytics->getOverview(),
        fn ($r) => "{$r['currentMonth']['emailsSent']} sent this month ({$r['domains']} domains)",
    );

    $endDate = (new \DateTimeImmutable())->format('c');
    $startDate = (new \DateTimeImmutable('-7 days'))->format('c');
    tryCall(
        'analytics.getActivityGraph(daily, last 7 days)',
        fn () => $mi->analytics->getActivityGraph([
            'granularity' => 'daily',
            'startDate' => $startDate,
            'endDate' => $endDate,
            'counters' => ['outgoing', 'bounces'],
        ]),
        fn ($r) => count($r['dataPoints']) . ' data point(s), total outgoing ' . ($r['summary']['totalOutgoing'] ?? 0),
    );
}

function section8Tasks(MissionInbox $mi, bool $isFull, ?string $testDomain, array $state): void
{
    printHeader(8, 'Tasks');
    $list = tryCall('tasks.list({ limit: 5 })', fn () => $mi->tasks->list(['limit' => 5]), fn ($r) => "{$r['total']} total");

    $taskId = $state['firstTaskId'] ?? ($list['tasks'][0]['id'] ?? null);
    if ($taskId) {
        tryCall("tasks.get('" . shortId($taskId) . "')", fn () => $mi->tasks->get($taskId), fn ($r) => "status={$r['status']}, progress={$r['progress']}%");
        tryCall("tasks.getOutputs('" . shortId($taskId) . "')", fn () => $mi->tasks->getOutputs($taskId), fn ($r) => count($r['outputs']) . ' log line(s)');
    } else {
        skipMsg('tasks.get / getOutputs (no task id)');
    }

    tryCall('tasks.getStatsSummary()', fn () => $mi->tasks->getStatsSummary(), fn ($r) => "pending={$r['pendingTasks']}, done={$r['completedTasks']}");

    if (!$isFull || !$testDomain) { skipMsg('cancel demo (safe mode or MI_TEST_DOMAIN unset)'); return; }

    $spawn = tryCall(
        'tasks.cancel demo — spawn a bulkVerify then cancel it',
        fn () => $mi->domains->bulkVerify(['domainNames' => [$testDomain]]),
        fn ($r) => 'spawned ' . shortId($r['taskId']),
    );
    if ($spawn) {
        tryCall("tasks.cancel('" . shortId($spawn['taskId']) . "')", fn () => $mi->tasks->cancel($spawn['taskId']), fn ($r) => "status={$r['status']}");
    }
}

function section9EmailsSend(MissionInbox $mi, bool $isFull, ?string $testSender, ?string $testTo, int $ts): ?string
{
    printHeader(9, 'Emails — send + inspect');
    if (!$isFull) { skipMsg('entire section (safe mode)'); return null; }

    $sent = tryCall(
        "emails.send(from=$testSender, to=$testTo)",
        fn () => $mi->emails->send([
            'from' => $testSender,
            'to' => $testTo,
            'subject' => 'MissionInbox SDK example — ' . (new \DateTimeImmutable())->format('c'),
            'html' => "<p>This is a test send from the MissionInbox PHP SDK example.</p><p>Run id: $ts</p>",
            'text' => "MissionInbox PHP SDK example test send. Run id: $ts.",
            'tag' => 'sdk-example',
        ]),
        fn ($r) => 'id: ' . $r['id'],
    );
    if (!$sent) return null;

    $lastId = (string) $sent['id'];

    // getDetails accepts the send-id; extract the Message-ID header for getStatus/getBulkStatus.
    $details = tryCall(
        "emails.getDetails('$lastId', [properties, activity])",
        fn () => $mi->emails->getDetails($lastId, ['properties', 'activity']),
        fn ($r) => 'subject=' . ($r['message']['properties']['subject'] ?? 'n/a'),
    );

    $rfc822 = $details['message']['properties']['message_id'] ?? null;

    if ($rfc822) {
        tryCall(
            "emails.getStatus('" . shortId($rfc822) . "')",
            fn () => $mi->emails->getStatus($rfc822),
            fn ($r) => "status={$r['status']}, bounce=" . ($r['bounce'] ? 'true' : 'false'),
        );
        tryCall(
            "emails.getBulkStatus(['" . shortId($rfc822) . "'])",
            fn () => $mi->emails->getBulkStatus([$rfc822]),
            fn ($r) => (count(array_filter($r['statuses'])) . '/' . count($r['statuses'])) . ' found',
        );
    } else {
        skipMsg('getStatus / getBulkStatus (Message-ID header not available yet)');
    }

    // Raw MIME is assembled asynchronously — for very-fresh sends the API
    // commonly returns ['status' => 'error'] until assembly finishes.
    tryCall(
        "emails.getRaw('$lastId')",
        fn () => $mi->emails->getRaw($lastId),
        fn ($r) => isset($r['raw_data']) ? strlen($r['raw_data']) . ' bytes' : "status={$r['status']}",
    );
    tryCall(
        'emails.search({ from: <sender>, limit: 5 })',
        fn () => $mi->emails->search(['from' => $testSender, 'limit' => 5]),
        fn ($r) => count($r['data']) . ' hit(s), total ' . $r['total'],
    );

    return $lastId;
}

function section10EmailQueue(MissionInbox $mi, bool $isFull): void
{
    printHeader(10, 'Email queue');
    $queue = tryCall('emailQueue.list({ limit: 5 })', fn () => $mi->emailQueue->list(['limit' => 5]), fn ($r) => "{$r['total']} total");

    if (!$isFull) { skipMsg('retry/cancel (safe mode)'); return; }

    if (!$queue || count($queue['data']) === 0) {
        skipMsg('retry/cancel (queue is empty)');
        return;
    }
    $ids = array_slice(array_map(fn ($q) => shortId($q['id']), $queue['data']), 0, 3);
    echo '  (queue has items — retry/cancel skipped; ids: ' . implode(', ', $ids) . ")\n";
}

function section11Errors(MissionInbox $mi, string $baseUrl, bool $isFull, ?string $testTo, int $ts): void
{
    printHeader(11, 'Error hierarchy demos');

    $badKey = new MissionInbox(['api_key' => 'obviously-wrong-key', 'base_url' => $baseUrl, 'max_retries' => 0]);
    try {
        $badKey->emails->getSendLimit();
        line('emails.getSendLimit with bad key', 'unexpectedly succeeded');
    } catch (AuthenticationException $e) {
        line('AuthenticationException (401)', 'caught: ' . substr($e->getMessage(), 0, 60));
    } catch (MissionInboxException $e) {
        line('MissionInboxException (unexpected)', "status={$e->getStatus()}: " . substr($e->getMessage(), 0, 60));
    } catch (\Throwable $e) {
        fail('bad-key call', $e);
    }

    if ($isFull && $testTo) {
        try {
            $mi->emails->send([
                'from' => "never-registered-$ts@example.invalid",
                'to' => $testTo,
                'subject' => 'this should fail',
                'text' => 'this should fail',
            ]);
            line('emails.send with unregistered from', 'unexpectedly succeeded');
        } catch (UnregisteredSenderException $e) {
            line('UnregisteredSenderException (403)', 'caught: ' . substr($e->getMessage(), 0, 60));
        } catch (MissionInboxException $e) {
            $name = (new \ReflectionClass($e))->getShortName();
            line("$name ({$e->getStatus()})", substr($e->getMessage(), 0, 60));
        } catch (\Throwable $e) {
            fail('unregistered-sender call', $e);
        }
    } else {
        skipMsg('unregistered-sender demo (safe mode or MI_TEST_TO unset)');
    }
}

function runCleanup(array &$cleanup): void
{
    if (count($cleanup) === 0) return;
    printHeader(99, 'Cleanup');
    foreach (array_reverse($cleanup) as $task) {
        try {
            $task['fn']();
            line($task['label'], 'ok');
        } catch (\Throwable $e) {
            fail($task['label'], $e);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

echo "MissionInbox SDK example — mode=$mode, base=$baseUrl\n";
if ($isFull) echo "  sender=$testSender, recipient=$testTo, testDomain=$testDomain\n";

try {
    section1Health($mi);
    section2SendLimit($mi);
    section3SendingIdentifiers($mi, $isFull, $testSenderDomain, $ts, $cleanup, $state);
    section4Domains($mi, $isFull, $testDomain ?: null, $ts, $cleanup, $state);
    section5Redirects($mi, $isFull, $testRedirectDomain ?: null, $testDomain ?: null, $state['firstDomainName'], $cleanup);
    section6Projects($mi, $isFull, $ts, $cleanup, $state);
    section7Analytics($mi);
    section8Tasks($mi, $isFull, $testDomain ?: null, $state);
    section9EmailsSend($mi, $isFull, $testSender ?: null, $testTo ?: null, $ts);
    section10EmailQueue($mi, $isFull);
    section11Errors($mi, $baseUrl, $isFull, $testTo ?: null, $ts);
} finally {
    runCleanup($cleanup);
}

echo "\nDone.\n";
