import type { MissionInbox } from '../client.js';
import type {
  ListTasksParams,
  Task,
  TaskList,
  TaskOutputs,
  TaskStatsSummary,
  WaitForTaskOptions,
} from '../types.js';
import { TERMINAL_TASK_STATUSES } from '../types.js';

/**
 * The `tasks` resource. Access via `mi.tasks`.
 *
 * Bulk operations (bulk create/verify/delete domains, etc.) run as
 * background tasks. Endpoints that dispatch a task return a `{ taskId }`,
 * and you use this resource to poll it to completion — or use
 * {@link Tasks.waitFor} which does the polling for you.
 */
export class Tasks {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /** List the account's tasks with optional filters. */
  async list(params: ListTasksParams = {}): Promise<TaskList> {
    const query: Record<string, unknown> = {};
    if (params.type !== undefined) query.type = params.type;
    if (params.status !== undefined) query.status = params.status;
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;
    return this.client.request<TaskList>({
      method: 'GET',
      path: '/api/tasks',
      query,
    });
  }

  /** Retrieve a task by id. */
  async get(id: string): Promise<Task> {
    return this.client.request<Task>({
      method: 'GET',
      path: `/api/tasks/${encodeURIComponent(id)}`,
    });
  }

  /** Cancel a pending or in-progress task. Already-terminal tasks return unchanged. */
  async cancel(id: string): Promise<Task> {
    return this.client.request<Task>({
      method: 'DELETE',
      path: `/api/tasks/${encodeURIComponent(id)}/cancel`,
    });
  }

  /**
   * Retrieve a task's execution log. Pass `since` (task-output id) to fetch
   * only entries created after a previous poll — useful for streaming a log.
   */
  async getOutputs(id: string, since?: string): Promise<TaskOutputs> {
    const query: Record<string, unknown> = {};
    if (since !== undefined) query.since = since;
    return this.client.request<TaskOutputs>({
      method: 'GET',
      path: `/api/tasks/${encodeURIComponent(id)}/outputs`,
      query,
    });
  }

  /** Account-wide task counts by status. */
  async getStatsSummary(): Promise<TaskStatsSummary> {
    return this.client.request<TaskStatsSummary>({
      method: 'GET',
      path: '/api/tasks/stats/summary',
    });
  }

  /**
   * Poll a task until it reaches a terminal state (`COMPLETED`, `FAILED`, or
   * `CANCELLED`), then resolve with the final task. Throws if the deadline
   * passes first.
   *
   * @example
   * ```ts
   * const { taskId } = await mi.domains.bulkCreate({
   *   domains: [{ domainName: 'a.com' }, { domainName: 'b.com' }],
   * });
   * const done = await mi.tasks.waitFor(taskId, {
   *   pollInterval: 3000,
   *   onProgress: (t) => console.log(t.progress),
   * });
   * console.log('done:', done.status, done.result);
   * ```
   */
  async waitFor(id: string, options: WaitForTaskOptions = {}): Promise<Task> {
    const pollInterval = options.pollInterval ?? 2000;
    const timeout = options.timeout ?? 300_000;
    const deadline = Date.now() + timeout;

    for (;;) {
      const task = await this.get(id);
      options.onProgress?.(task);
      if ((TERMINAL_TASK_STATUSES as readonly string[]).includes(task.status)) return task;
      if (Date.now() + pollInterval > deadline) {
        throw new Error(`Timed out after ${timeout}ms waiting for task ${id} (last status: ${task.status})`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
