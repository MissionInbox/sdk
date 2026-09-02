<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `health` resource. Access via `$mi->health`.
 *
 * Unauthenticated endpoint. Returns the API's health string on success.
 */
final class Health
{
    public function __construct(private readonly Client $http) {}

    /** Ping the API. Returns the health status string or associative array. */
    public function check(): string|array
    {
        $result = $this->http->request('GET', '/api/health');
        return is_array($result) ? $result : (string) $result;
    }
}
