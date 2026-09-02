<?php

declare(strict_types=1);

namespace MissionInbox\Tests;

use PHPUnit\Framework\TestCase;

final class ResourcesTest extends TestCase
{
    public function testSendingIdentifiersList(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, [])], $captured);
        $mi->sendingIdentifiers->list();
        $this->assertSame('/api/sending-identifiers', $captured[0]['request']->getUri()->getPath());
        $this->assertSame('GET', $captured[0]['request']->getMethod());
    }

    public function testSendingIdentifiersUpdatePatchesBody(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, ['id' => 'x'])], $captured);
        $mi->sendingIdentifiers->update('uuid-1', ['displayName' => 'Acme']);
        $this->assertSame('PATCH', $captured[0]['request']->getMethod());
        $this->assertSame(['displayName' => 'Acme'], TestHelpers::bodyOf($captured[0]['request']));
    }

    public function testDomainsListForwardsQueryString(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, ['data' => []])], $captured);
        $mi->domains->list(['verified' => true, 'limit' => 50, 'page' => 2]);
        $query = $captured[0]['request']->getUri()->getQuery();
        $this->assertStringContainsString('verified=true', $query);
        $this->assertStringContainsString('limit=50', $query);
        $this->assertStringContainsString('page=2', $query);
    }

    public function testDomainsGetByIdPathIncludesByIdSegment(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, ['id' => 'x'])], $captured);
        $mi->domains->get('uuid-1');
        $this->assertSame('/api/domains/by-id/uuid-1', $captured[0]['request']->getUri()->getPath());
    }

    public function testDomainsVerifyPostsDomainNameInBody(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['fullyVerified' => true, 'dnsChecks' => ['dkim' => ['status' => 'OK']], 'message' => ''])],
            $captured,
        );
        $mi->domains->verify('acme.com');
        $this->assertSame('/api/domains/verify', $captured[0]['request']->getUri()->getPath());
        $this->assertSame(['domainName' => 'acme.com'], TestHelpers::bodyOf($captured[0]['request']));
    }

    public function testDomainsBulkCreateReturnsTaskId(): void
    {
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, ['taskId' => 't-1', 'message' => 'started'])]);
        $result = $mi->domains->bulkCreate(['domains' => [['domainName' => 'a.com']]]);
        $this->assertSame('t-1', $result['taskId']);
    }

    public function testDomainsExportCsvReturnsTextBody(): void
    {
        $mi = TestHelpers::newClient([TestHelpers::textResponse(200, "name,verified\nacme.com,true", 'text/csv')]);
        $csv = $mi->domains->exportCsv();
        $this->assertSame("name,verified\nacme.com,true", $csv);
    }

    public function testDomainsRedirectSetupPutsRedirectUrl(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['success' => true, 'action' => 'created'])],
            $captured,
        );
        $mi->domains->redirects->setup('acme.com', ['redirectUrl' => 'https://www.acme.com', 'forceHttps' => true]);
        $this->assertSame('PUT', $captured[0]['request']->getMethod());
        $this->assertSame('/api/domains/acme.com/redirect', $captured[0]['request']->getUri()->getPath());
        $this->assertSame(
            ['redirectUrl' => 'https://www.acme.com', 'forceHttps' => true],
            TestHelpers::bodyOf($captured[0]['request']),
        );
    }

    public function testProjectsAssignDomainsPatch(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['project' => [], 'total' => 1, 'successful' => 1, 'failed' => 0, 'reassigned' => 0, 'results' => []])],
            $captured,
        );
        $mi->projects->assignDomains('p-1', ['domainNames' => ['a.com']]);
        $this->assertSame('PATCH', $captured[0]['request']->getMethod());
        $this->assertSame('/api/projects/p-1/domains', $captured[0]['request']->getUri()->getPath());
    }

    public function testAnalyticsActivityGraphQueryString(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, [])], $captured);
        $mi->analytics->getActivityGraph([
            'granularity' => 'daily',
            'startDate' => '2026-01-01T00:00:00Z',
            'endDate' => '2026-01-31T23:59:59Z',
            'counters' => ['outgoing', 'bounces'],
        ]);
        $query = $captured[0]['request']->getUri()->getQuery();
        $this->assertStringContainsString('granularity=daily', $query);
        $this->assertStringContainsString('counters=outgoing', $query);
        $this->assertStringContainsString('counters=bounces', $query);
    }

    public function testEmailQueueRetryPostsToCorrectPath(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, [])], $captured);
        $mi->emailQueue->retry('q-1');
        $this->assertSame('POST', $captured[0]['request']->getMethod());
        $this->assertSame('/api/email/queue/q-1/retry', $captured[0]['request']->getUri()->getPath());
    }

    public function testHealthCheckReturnsTextBody(): void
    {
        $mi = TestHelpers::newClient([TestHelpers::textResponse(200, 'Healthy')]);
        $result = $mi->health->check();
        $this->assertSame('Healthy', $result);
    }
}
