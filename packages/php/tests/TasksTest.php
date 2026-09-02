<?php

declare(strict_types=1);

namespace MissionInbox\Tests;

use PHPUnit\Framework\TestCase;

final class TasksTest extends TestCase
{
    private function taskResp(string $status, int $progress = 0): array
    {
        return [
            'id' => 't-1',
            'type' => 'BULK_CREATE_DOMAINS',
            'status' => $status,
            'progress' => $progress,
            'retryCount' => 0,
            'maxRetries' => 3,
        ];
    }

    public function testListForwardsQueryParams(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient(
            [TestHelpers::jsonResponse(200, ['tasks' => [], 'total' => 0, 'page' => 1, 'limit' => 20, 'totalPages' => 0])],
            $captured,
        );
        $mi->tasks->list(['status' => 'COMPLETED', 'page' => 2, 'limit' => 50]);
        $query = $captured[0]['request']->getUri()->getQuery();
        $this->assertStringContainsString('status=COMPLETED', $query);
        $this->assertStringContainsString('page=2', $query);
        $this->assertStringContainsString('limit=50', $query);
    }

    public function testCancelDeletesCancelPath(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, $this->taskResp('CANCELLED'))], $captured);
        $mi->tasks->cancel('t-1');
        $this->assertSame('DELETE', $captured[0]['request']->getMethod());
        $this->assertSame('/api/tasks/t-1/cancel', $captured[0]['request']->getUri()->getPath());
    }

    public function testGetOutputsForwardsSince(): void
    {
        $captured = [];
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, ['outputs' => []])], $captured);
        $mi->tasks->getOutputs('t-1', 'out-9');
        $this->assertStringContainsString('since=out-9', $captured[0]['request']->getUri()->getQuery());
    }

    public function testWaitForResolvesOnTerminal(): void
    {
        $mi = TestHelpers::newClient([
            TestHelpers::jsonResponse(200, $this->taskResp('PROCESSING', 10)),
            TestHelpers::jsonResponse(200, $this->taskResp('PROCESSING', 50)),
            TestHelpers::jsonResponse(200, $this->taskResp('COMPLETED', 100)),
        ]);
        $progress = [];
        $done = $mi->tasks->waitFor('t-1', [
            'pollInterval' => 1,
            'timeout' => 5000,
            'onProgress' => function (array $t) use (&$progress): void {
                $progress[] = $t['progress'];
            },
        ]);
        $this->assertSame('COMPLETED', $done['status']);
        $this->assertSame([10, 50, 100], $progress);
    }

    public function testWaitForThrowsOnTimeout(): void
    {
        // pollInterval > timeout guarantees deadline check fires on iteration 1
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, $this->taskResp('PROCESSING', 10))]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/Timed out/');
        $mi->tasks->waitFor('t-1', ['pollInterval' => 100, 'timeout' => 10]);
    }

    public function testWaitForImmediateOnAlreadyTerminal(): void
    {
        $mi = TestHelpers::newClient([TestHelpers::jsonResponse(200, $this->taskResp('FAILED'))]);
        $result = $mi->tasks->waitFor('t-1', ['pollInterval' => 1]);
        $this->assertSame('FAILED', $result['status']);
    }
}
