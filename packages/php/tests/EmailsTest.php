<?php

declare(strict_types=1);

namespace MissionInbox\Tests;

use PHPUnit\Framework\TestCase;

final class EmailsTest extends TestCase
{
    public function testSendMapsCamelCaseToSnakeCaseAndDefaultsReplyTo(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['id' => '42', 'message' => 'Email sent', 'status' => 'sent', 'time' => 123])],
            $captured,
        );

        $result = $mi->emails->send([
            'from' => 'notifications@acme.com',
            'to' => 'user@example.com',
            'subject' => 'Hi',
            'html' => '<p>Hi</p>',
        ]);

        $this->assertSame('42', $result['id']);
        $body = TestHelpers::bodyOf($captured[0]['request']);
        $this->assertSame([
            'from' => 'notifications@acme.com',
            'reply_to' => 'notifications@acme.com',
            'to' => ['user@example.com'],
            'subject' => 'Hi',
            'html_body' => '<p>Hi</p>',
        ], $body);
    }

    public function testSendAttachmentsMapToSnakeCase(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['id' => '1', 'message' => 'ok', 'status' => 'sent', 'time' => 1])],
            $captured,
        );

        $mi->emails->send([
            'from' => 'a@b.com',
            'to' => ['c@d.com'],
            'subject' => 's',
            'text' => 't',
            'attachments' => [
                ['filename' => 'x.pdf', 'contentType' => 'application/pdf', 'content' => 'aGk='],
            ],
        ]);

        $body = TestHelpers::bodyOf($captured[0]['request']);
        $this->assertSame(
            [['name' => 'x.pdf', 'content_type' => 'application/pdf', 'data' => 'aGk=']],
            $body['attachments'],
        );
    }

    public function testGetStatusPostsMessageId(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['id' => '1'])],
            $captured,
        );

        $mi->emails->getStatus('msg_1');
        $this->assertSame(['messageId' => 'msg_1'], TestHelpers::bodyOf($captured[0]['request']));
        $this->assertSame('/api/email/status', $captured[0]['request']->getUri()->getPath());
    }

    public function testGetBulkStatusPostsIds(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, ['statuses' => []])], $captured);

        $mi->emails->getBulkStatus(['a', 'b']);
        $this->assertSame(['messageIds' => ['a', 'b']], TestHelpers::bodyOf($captured[0]['request']));
    }

    public function testGetDetailsIncludeCommaJoined(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['message' => ['id' => 1]])],
            $captured,
        );

        $mi->emails->getDetails('msg_1', ['content', 'headers']);
        $this->assertSame(
            ['id' => 'msg_1', 'include' => 'content,headers'],
            TestHelpers::bodyOf($captured[0]['request']),
        );
    }

    public function testGetDetailsOmitsIncludeWhenNull(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['message' => ['id' => 1]])],
            $captured,
        );

        $mi->emails->getDetails('msg_1');
        $this->assertSame(['id' => 'msg_1'], TestHelpers::bodyOf($captured[0]['request']));
    }

    public function testSearchMapsSendingIdentifierIdToSnakeCase(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['data' => [], 'total' => 0, 'page' => 1, 'limit' => 30, 'totalPages' => 0])],
            $captured,
        );

        $mi->emails->search([
            'sendingIdentifierId' => 'uuid-1',
            'status' => 'Sent',
            'limit' => 10,
        ]);

        $body = TestHelpers::bodyOf($captured[0]['request']);
        $this->assertSame([
            'sending_identifier_id' => 'uuid-1',
            'status' => 'Sent',
            'limit' => 10,
        ], $body);
    }

    public function testGetSendLimitIsGet(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['limited' => false])],
            $captured,
        );

        $result = $mi->emails->getSendLimit();
        $this->assertSame(['limited' => false], $result);
        $this->assertSame('GET', $captured[0]['request']->getMethod());
    }
}
