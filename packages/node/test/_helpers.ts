import { MissionInbox } from '../src/index.js';

export interface Captured {
  url: string;
  init: RequestInit;
}

export interface FetchResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  contentType?: string;
}

export function makeFetch(responses: FetchResponse | FetchResponse[]): {
  fetch: typeof fetch;
  calls: Captured[];
} {
  const queue = Array.isArray(responses) ? [...responses] : [responses];
  const calls: Captured[] = [];
  const impl = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const r = queue.shift() ?? queue[queue.length - 1] ?? { status: 200, body: '' };
    const status = r.status ?? 200;
    const body = r.body === undefined ? '' : typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    return new Response(body, {
      status,
      headers: {
        'content-type': r.contentType ?? 'application/json',
        ...(r.headers ?? {}),
      },
    });
  }) as unknown as typeof fetch;
  return { fetch: impl, calls };
}

export function newClient(fetchImpl: typeof fetch): MissionInbox {
  return new MissionInbox({
    apiKey: 'test-key',
    baseUrl: 'https://api.example.com',
    fetch: fetchImpl,
    maxRetries: 0,
  });
}
