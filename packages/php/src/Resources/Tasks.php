<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `tasks` resource. Access via `$mi->tasks`.
 *
 * Bulk operations dispatch background tasks and return `['taskId' => ...]`.
 * Poll to completion via {@see Tasks::waitFor()} or call {@see Tasks::get()}
 * yourself.
 */
final class Tasks
{
    private const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED'];

    public function __construct(private readonly Client $http) {}

    /**
     * List tasks.
     *
     * @param array{type?: string, status?: string, page?: int, limit?: int} $params
     */
    public function list(array $params = []): array
    {
        return $this->http->request('GET', '/api/tasks', query: $params);
    }

    /** Retrieve a task by id. */
    public function get(string $id): array
    {
        return $this->http->request('GET', '/api/tasks/' . rawurlencode($id));
    }

    /** Cancel a pending or in-progress task. */
    public function cancel(string $id): array
    {
        return $this->http->request('DELETE', '/api/tasks/' . rawurlencode($id) . '/cancel');
    }

    /** Retrieve a task's execution log. `$since` is the task-output id from a previous poll. */
    public function getOutputs(string $id, ?string $since = null): array
    {
        $query = $since !== null ? ['since' => $since] : null;
        return $this->http->request(
            'GET',
            '/api/tasks/' . rawurlencode($id) . '/outputs',
            query: $query,
        );
    }

    /** Account-wide task counts by status. */
    public function getStatsSummary(): array
    {
        return $this->http->request('GET', '/api/tasks/stats/summary');
    }

    /**
     * Poll a task until it reaches a terminal state, then return the final task.
     * Throws {@see \RuntimeException} if the deadline passes first.
     *
     * @param array{
     *   pollInterval?: int,
     *   timeout?: int,
     *   onProgress?: callable(array<string, mixed>): void
     * } $options pollInterval + timeout are in milliseconds
     */
    public function waitFor(string $id, array $options = []): array
    {
        $pollInterval = $options['pollInterval'] ?? 2000;
        $timeout = $options['timeout'] ?? 300_000;
        $onProgress = $options['onProgress'] ?? null;
        $deadline = (int) (microtime(true) * 1000) + $timeout;

        while (true) {
            $task = $this->get($id);
            if ($onProgress !== null) {
                $onProgress($task);
            }
            $status = $task['status'] ?? null;
            if (is_string($status) && in_array($status, self::TERMINAL_STATUSES, true)) {
                return $task;
            }
            $now = (int) (microtime(true) * 1000);
            if ($now + $pollInterval > $deadline) {
                throw new \RuntimeException(sprintf(
                    'Timed out after %dms waiting for task %s (last status: %s)',
                    $timeout,
                    $id,
                    $status ?? 'unknown',
                ));
            }
            usleep($pollInterval * 1000);
        }
    }
}
