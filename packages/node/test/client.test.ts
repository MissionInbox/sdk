import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissionInbox } from '../src/index.js';
import { VERSION } from '../src/version.js';

interface Captured {
  url: string;
  init: RequestInit;
}

function makeFetch(response: {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}): { fetch: typeof fetch; calls: Captured[] } {
  const calls: Captured[] = [];
  const impl = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const status = response.status ?? 200;
    const body = response.body === undefined ? '' : JSON.stringify(response.body);
    return new Response(body, {
      status,
      headers: { 'content-type': 'application/json', ...(response.headers ?? {}) },
    });
  }) as unknown as typeof fetch;
  return { fetch: impl, calls };
}

function newClient(fetchImpl: typeof fetch): MissionInbox {
  return new MissionInbox({
    apiKey: 'test-key',
    baseUrl: 'https://api.example.com',
    fetch: fetchImpl,
    maxRetries: 0,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MissionInbox constructor', () => {
  it('rejects a missing apiKey', () => {
    expect(() => new MissionInbox({ apiKey: '', baseUrl: 'https://x' })).toThrow(/apiKey/);
  });

  it('rejects a missing baseUrl', () => {
    expect(() => new MissionInbox({ apiKey: 'k', baseUrl: '' })).toThrow(/baseUrl/);
  });

  it('strips trailing slashes from baseUrl', async () => {
    const { fetch, calls } = makeFetch({ body: { id: '1', message: 'ok', status: 'sent', time: 1 } });
    const mi = new MissionInbox({ apiKey: 'k', baseUrl: 'https://api.example.com//', fetch });
    await mi.transactional.emails.send({ from: 'a@b.com', to: 'c@d.com', subject: 's', text: 't' });
    expect(calls[0]!.url).toBe('https://api.example.com/api/email/send');
  });
});

describe('emails.send', () => {
  it('sends the wire payload with snake_case fields and default reply_to', async () => {
    const { fetch, calls } = makeFetch({ body: { id: '42', message: 'Email sent', status: 'sent', time: 123 } });
    const mi = newClient(fetch);

    const result = await mi.transactional.emails.send({
      from: 'notifications@acme.com',
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });

    expect(result).toEqual({ id: '42', message: 'Email sent', status: 'sent', time: 123 });
    const req = calls[0]!;
    expect(req.url).toBe('https://api.example.com/api/email/send');
    expect(req.init.method).toBe('POST');
    const headers = req.init.headers as Record<string, string>;
    expect(headers['X-Server-API-Key']).toBe('test-key');
    expect(headers['User-Agent']).toBe(`missioninbox-node/${VERSION}`);
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(req.init.body))).toEqual({
      from: 'notifications@acme.com',
      reply_to: 'notifications@acme.com',
      to: ['user@example.com'],
      subject: 'Hi',
      html_body: '<p>Hi</p>',
    });
  });

  it('maps attachments to snake_case wire shape', async () => {
    const { fetch, calls } = makeFetch({ body: { id: '1', message: 'ok', status: 'sent', time: 1 } });
    const mi = newClient(fetch);

    await mi.transactional.emails.send({
      from: 'a@b.com',
      to: ['c@d.com'],
      subject: 's',
      text: 't',
      attachments: [{ filename: 'x.pdf', contentType: 'application/pdf', content: 'aGk=' }],
    });

    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.attachments).toEqual([{ name: 'x.pdf', content_type: 'application/pdf', data: 'aGk=' }]);
  });
});

describe('sendingIdentifiers', () => {
  it('lists identifiers via GET', async () => {
    const identifiers = [
      {
        id: 'uuid-1',
        emailAddress: 'a@b.com',
        displayName: null,
        domainName: 'b.com',
        domainVerificationState: 'verified',
        canSend: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    const { fetch, calls } = makeFetch({ body: identifiers });
    const mi = newClient(fetch);

    const result = await mi.transactional.sendingIdentifiers.list();
    expect(result).toEqual(identifiers);
    expect(calls[0]!.init.method).toBe('GET');
    expect(calls[0]!.url).toBe('https://api.example.com/api/sending-identifiers');
  });

  it('creates an identifier with only required fields', async () => {
    const { fetch, calls } = makeFetch({
      status: 201,
      body: {
        id: 'uuid-2',
        emailAddress: 'x@y.com',
        displayName: null,
        domainName: 'y.com',
        domainVerificationState: 'dns_pending',
        canSend: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    const mi = newClient(fetch);

    await mi.transactional.sendingIdentifiers.create({ emailAddress: 'x@y.com' });
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ emailAddress: 'x@y.com' });
  });
});
