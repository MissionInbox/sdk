import type { MissionInbox } from '../client.js';
import type { ListEmailQueueParams, Paginated, QueuedEmail } from '../types.js';

/**
 * The `emailQueue` resource. Access via `mi.emailQueue`.
 *
 * The queue holds messages that couldn't be sent immediately (retries,
 * throttling, held pending review). Use these methods to inspect, retry, or
 * cancel queued messages.
 */
export class EmailQueue {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /**
   * List queued messages, optionally filtered by status.
   *
   * @example
   * ```ts
   * const { data } = await mi.emailQueue.list({ status: 'failed', limit: 100 });
   * ```
   */
  async list(params: ListEmailQueueParams = {}): Promise<Paginated<QueuedEmail>> {
    const query: Record<string, unknown> = {};
    if (params.status !== undefined) query.status = params.status;
    if (params.sendingAccountId !== undefined) query.sendingAccountId = params.sendingAccountId;
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;

    return this.client.request<Paginated<QueuedEmail>>({
      method: 'GET',
      path: '/api/email/queue',
      query,
    });
  }

  /** Retry a failed queued message. Resets its retry counter and reschedules. */
  async retry(id: string): Promise<QueuedEmail> {
    return this.client.request<QueuedEmail>({
      method: 'POST',
      path: `/api/email/queue/${encodeURIComponent(id)}/retry`,
    });
  }

  /** Cancel a pending queued message. Returns `{ success: true }` when done. */
  async cancel(id: string): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>({
      method: 'POST',
      path: `/api/email/queue/${encodeURIComponent(id)}/cancel`,
    });
  }
}
