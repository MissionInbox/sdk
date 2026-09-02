import type { MissionInbox } from '../client.js';
import type { ActivityGraph, ActivityGraphParams, AnalyticsOverview } from '../types.js';

/**
 * The `analytics` resource. Access via `mi.analytics`.
 */
export class Analytics {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /** Account-wide overview: this month + last month send counts and domain/mailbox counts. */
  async getOverview(): Promise<AnalyticsOverview> {
    return this.client.request<AnalyticsOverview>({
      method: 'GET',
      path: '/api/analytics/overview',
    });
  }

  /**
   * Time-series data for send/receive activity. Supports hourly/daily/
   * monthly/yearly granularity and per-counter filtering.
   *
   * @example
   * ```ts
   * const graph = await mi.analytics.getActivityGraph({
   *   granularity: 'daily',
   *   startDate: '2026-08-01T00:00:00Z',
   *   endDate: '2026-08-31T23:59:59Z',
   *   counters: ['outgoing', 'bounces'],
   * });
   * ```
   */
  async getActivityGraph(params: ActivityGraphParams): Promise<ActivityGraph> {
    const query: Record<string, unknown> = {
      granularity: params.granularity,
      startDate: params.startDate,
      endDate: params.endDate,
    };
    if (params.counters !== undefined) query.counters = params.counters;
    return this.client.request<ActivityGraph>({
      method: 'GET',
      path: '/api/analytics/activity-graph',
      query,
    });
  }
}
