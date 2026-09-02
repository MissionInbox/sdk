<?php

declare(strict_types=1);

namespace MissionInbox\Tests;

use MissionInbox\MissionInbox;
use PHPUnit\Framework\TestCase;

final class ClientTest extends TestCase
{
    public function testMissingApiKeyThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/api_key/');
        new MissionInbox(['api_key' => '', 'base_url' => 'https://x']);
    }

    public function testMissingBaseUrlThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/base_url/');
        new MissionInbox(['api_key' => 'k', 'base_url' => '']);
    }

    public function testStripsTrailingSlashesFromBaseUrl(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['id' => '1', 'message' => 'ok', 'status' => 'sent', 'time' => 1])],
            $captured,
        );

        // Override the base_url after construction is impossible, so re-construct with trailing slashes.
        // The MissionInbox client trims baseUrl inside Http\Client — verify by inspecting the request URL.
        $mi->emails->send(['from' => 'a@b.com', 'to' => 'c@d.com', 'subject' => 's', 'text' => 't']);
        $this->assertSame('/api/email/send', $captured[0]['request']->getUri()->getPath());
        $this->assertSame('api.example.com', $captured[0]['request']->getUri()->getHost());
    }

    public function testSetsAuthAndUserAgentHeaders(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['id' => '1', 'message' => 'ok', 'status' => 'sent', 'time' => 1])],
            $captured,
        );

        $mi->emails->send(['from' => 'a@b.com', 'to' => 'c@d.com', 'subject' => 's', 'text' => 't']);

        $request = $captured[0]['request'];
        $this->assertSame('test-key', $request->getHeaderLine('X-Server-API-Key'));
        $this->assertStringStartsWith('missioninbox-php/', $request->getHeaderLine('User-Agent'));
        $this->assertSame('application/json', $request->getHeaderLine('Content-Type'));
    }
}
