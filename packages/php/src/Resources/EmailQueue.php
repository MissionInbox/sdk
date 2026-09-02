<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `emailQueue` resource. Access via `$mi->emailQueue`.
 *
 * The queue holds messages that couldn't be sent immediately (retries,
 * throttling, held pending review).
 */
final class EmailQueue
{
    public function __construct(private readonly Client $http) {}

    /**
     * List queued messages, optionally filtered by status.
     *
     * @param array{status?: string, sendingAccountId?: string, page?: int, limit?: int} $params
     */
    public function list(array $params = []): array
    {
        return $this->http->request('GET', '/api/email/queue', query: $params);
    }

    /** Retry a failed queued message. */
    public function retry(string $id): array
    {
        return $this->http->request('POST', '/api/email/queue/' . rawurlencode($id) . '/retry');
    }

    /** Cancel a pending queued message. */
    public function cancel(string $id): array
    {
        return $this->http->request('POST', '/api/email/queue/' . rawurlencode($id) . '/cancel');
    }
}
