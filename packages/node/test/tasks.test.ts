import { describe, expect, it } from 'vitest';
import { makeFetch, newClient } from './_helpers.js';
import type { Task, TaskStatus } from '../src/index.js';

function task(status: TaskStatus, progress = 0): Task {
  return {
    id: 't-1',
    type: 'BULK_CREATE_DOMAINS',
    status,
    progress,
    retryCount: 0,
    maxRetries: 3,
  };
}

describe('tasks', () => {
  it('list forwards status + page + limit as query', async () => {
    const { fetch, calls } = makeFetch({ body: { tasks: [], total: 0, page: 1, limit: 20, totalPages: 0 } });
    const mi = newClient(fetch);
    await mi.tasks.list({ status: 'COMPLETED', page: 2, limit: 50 });
    const url = calls[0]!.url;
    expect(url).toContain('status=COMPLETED');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=50');
  });

  it('get returns the task', async () => {
    const { fetch } = makeFetch({ body: task('PROCESSING', 42) });
    const mi = newClient(fetch);
    const t = await mi.tasks.get('t-1');
    expect(t.status).toBe('PROCESSING');
    expect(t.progress).toBe(42);
  });

  it('cancel DELETEs /:id/cancel', async () => {
    const { fetch, calls } = makeFetch({ body: task('CANCELLED') });
    const mi = newClient(fetch);
    await mi.tasks.cancel('t-1');
    expect(calls[0]!.init.method).toBe('DELETE');
    expect(calls[0]!.url).toBe('https://api.example.com/api/tasks/t-1/cancel');
  });

  it('getOutputs forwards since', async () => {
    const { fetch, calls } = makeFetch({ body: { outputs: [] } });
    const mi = newClient(fetch);
    await mi.tasks.getOutputs('t-1', 'out-9');
    expect(calls[0]!.url).toContain('since=out-9');
  });
});

describe('tasks.waitFor', () => {
  it('resolves when task reaches a terminal state', async () => {
    const { fetch } = makeFetch([
      { body: task('PROCESSING', 10) },
      { body: task('PROCESSING', 50) },
      { body: task('COMPLETED', 100) },
    ]);
    const mi = newClient(fetch);
    const progressCalls: number[] = [];
    const done = await mi.tasks.waitFor('t-1', {
      pollInterval: 1,
      onProgress: (t) => progressCalls.push(t.progress),
    });
    expect(done.status).toBe('COMPLETED');
    expect(progressCalls).toEqual([10, 50, 100]);
  });

  it('throws when the deadline passes before completion', async () => {
    const { fetch } = makeFetch({ body: task('PROCESSING', 10) });
    const mi = newClient(fetch);
    // pollInterval > timeout guarantees the deadline check fires on the first iteration.
    await expect(mi.tasks.waitFor('t-1', { pollInterval: 100, timeout: 10 })).rejects.toThrow(/Timed out/);
  });

  it('returns immediately for an already-terminal task', async () => {
    const { fetch } = makeFetch({ body: task('FAILED') });
    const mi = newClient(fetch);
    const result = await mi.tasks.waitFor('t-1', { pollInterval: 1 });
    expect(result.status).toBe('FAILED');
  });
});
