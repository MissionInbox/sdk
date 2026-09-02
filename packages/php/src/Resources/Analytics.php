<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `analytics` resource. Access via `$mi->analytics`.
 */
final class Analytics
{
    public function __construct(private readonly Client $http) {}

    /** Account-wide overview: this month + last month send counts, domain/mailbox counts. */
    public function getOverview(): array
    {
        return $this->http->request('GET', '/api/analytics/overview');
    }

    /**
     * Time-series data for send/receive activity.
     *
     * @param array{
     *   granularity: 'hourly'|'daily'|'monthly'|'yearly',
     *   startDate: string,
     *   endDate: string,
     *   counters?: array<'incoming'|'outgoing'|'bounces'|'spam'|'held'>
     * } $params
     */
    public function getActivityGraph(array $params): array
    {
        $query = [
            'granularity' => $params['granularity'],
            'startDate' => $params['startDate'],
            'endDate' => $params['endDate'],
        ];
        if (!empty($params['counters'])) {
            $query['counters'] = $params['counters'];
        }
        return $this->http->request('GET', '/api/analytics/activity-graph', query: $query);
    }
}
