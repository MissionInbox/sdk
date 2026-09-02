import { describe, expect, it } from 'vitest';
import { makeFetch, newClient } from './_helpers.js';

describe('sendingIdentifiers', () => {
  it('list uses GET', async () => {
    const { fetch, calls } = makeFetch({ body: [] });
    const mi = newClient(fetch);
    await mi.sendingIdentifiers.list();
    expect(calls[0]!.url).toBe('https://api.example.com/api/sending-identifiers');
    expect(calls[0]!.init.method).toBe('GET');
  });

  it('get includes id in path', async () => {
    const { fetch, calls } = makeFetch({ body: { id: 'x' } });
    const mi = newClient(fetch);
    await mi.sendingIdentifiers.get('uuid-1');
    expect(calls[0]!.url).toBe('https://api.example.com/api/sending-identifiers/uuid-1');
  });

  it('create posts emailAddress (no displayName when omitted)', async () => {
    const { fetch, calls } = makeFetch({ status: 201, body: { id: 'x' } });
    const mi = newClient(fetch);
    await mi.sendingIdentifiers.create({ emailAddress: 'x@y.com' });
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ emailAddress: 'x@y.com' });
  });

  it('update sends PATCH', async () => {
    const { fetch, calls } = makeFetch({ body: { id: 'x' } });
    const mi = newClient(fetch);
    await mi.sendingIdentifiers.update('uuid-1', { displayName: 'Acme' });
    expect(calls[0]!.init.method).toBe('PATCH');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ displayName: 'Acme' });
  });

  it('delete sends DELETE', async () => {
    const { fetch, calls } = makeFetch({ body: { message: 'ok' } });
    const mi = newClient(fetch);
    await mi.sendingIdentifiers.delete('uuid-1');
    expect(calls[0]!.init.method).toBe('DELETE');
  });
});

describe('domains', () => {
  it('list forwards filters as query string', async () => {
    const { fetch, calls } = makeFetch({ body: { data: [], total: 0, page: 1, limit: 30, totalPages: 0 } });
    const mi = newClient(fetch);
    await mi.domains.list({ verified: true, limit: 50, page: 2 });
    expect(calls[0]!.url).toContain('verified=true');
    expect(calls[0]!.url).toContain('limit=50');
    expect(calls[0]!.url).toContain('page=2');
  });

  it('get by id uses /by-id/ path', async () => {
    const { fetch, calls } = makeFetch({ body: { id: 'x' } });
    const mi = newClient(fetch);
    await mi.domains.get('uuid-1');
    expect(calls[0]!.url).toBe('https://api.example.com/api/domains/by-id/uuid-1');
  });

  it('getByName uses /:domainName path', async () => {
    const { fetch, calls } = makeFetch({ body: { id: 'x' } });
    const mi = newClient(fetch);
    await mi.domains.getByName('acme.com');
    expect(calls[0]!.url).toBe('https://api.example.com/api/domains/acme.com');
  });

  it('create posts to /create', async () => {
    const { fetch, calls } = makeFetch({ status: 201, body: { id: 'x' } });
    const mi = newClient(fetch);
    await mi.domains.create({ domainName: 'acme.com' });
    expect(calls[0]!.url).toBe('https://api.example.com/api/domains/create');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ domainName: 'acme.com' });
  });

  it('verify posts domainName in body', async () => {
    const { fetch, calls } = makeFetch({ body: { fullyVerified: true, dnsChecks: { dkim: { status: 'OK' } }, message: '' } });
    const mi = newClient(fetch);
    await mi.domains.verify('acme.com');
    expect(calls[0]!.url).toBe('https://api.example.com/api/domains/verify');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ domainName: 'acme.com' });
  });

  it('bulkCreate returns a task id', async () => {
    const { fetch } = makeFetch({ body: { taskId: 't-1', message: 'started' } });
    const mi = newClient(fetch);
    const result = await mi.domains.bulkCreate({ domains: [{ domainName: 'a.com' }] });
    expect(result).toEqual({ taskId: 't-1', message: 'started' });
  });

  it('delete sends DELETE on /:domainName', async () => {
    const { fetch, calls } = makeFetch({ body: { message: 'ok' } });
    const mi = newClient(fetch);
    await mi.domains.delete('acme.com');
    expect(calls[0]!.init.method).toBe('DELETE');
    expect(calls[0]!.url).toBe('https://api.example.com/api/domains/acme.com');
  });

  it('exportCsv returns raw text body when content-type is not JSON', async () => {
    const { fetch } = makeFetch({ body: 'name,verified\nacme.com,true', contentType: 'text/csv' });
    const mi = newClient(fetch);
    const csv = await mi.domains.exportCsv();
    expect(csv).toBe('name,verified\nacme.com,true');
  });
});

describe('domains.redirects', () => {
  it('setup sends PUT with redirectUrl', async () => {
    const { fetch, calls } = makeFetch({ body: { success: true, action: 'created' } });
    const mi = newClient(fetch);
    await mi.domains.redirects.setup('acme.com', { redirectUrl: 'https://www.acme.com', forceHttps: true });
    expect(calls[0]!.init.method).toBe('PUT');
    expect(calls[0]!.url).toBe('https://api.example.com/api/domains/acme.com/redirect');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      redirectUrl: 'https://www.acme.com',
      forceHttps: true,
    });
  });

  it('bulkSetup posts to /redirects/bulk-setup', async () => {
    const { fetch, calls } = makeFetch({ body: { success: true, total: 1, succeeded: 1, failed: 0, results: [] } });
    const mi = newClient(fetch);
    await mi.domains.redirects.bulkSetup({ redirects: [{ domainName: 'a.com', redirectUrl: 'https://x' }] });
    expect(calls[0]!.url).toBe('https://api.example.com/api/domains/redirects/bulk-setup');
  });

  it('getEvents forwards limit as query', async () => {
    const { fetch, calls } = makeFetch({ body: { success: true, domainName: 'a.com', redirectId: 'r', totalEvents: 0, events: [] } });
    const mi = newClient(fetch);
    await mi.domains.redirects.getEvents('a.com', 25);
    expect(calls[0]!.url).toContain('limit=25');
  });
});

describe('projects', () => {
  it('list uses GET /api/projects', async () => {
    const { fetch, calls } = makeFetch({ body: [] });
    const mi = newClient(fetch);
    await mi.projects.list();
    expect(calls[0]!.url).toBe('https://api.example.com/api/projects');
  });

  it('assignDomains sends PATCH to /:id/domains', async () => {
    const { fetch, calls } = makeFetch({ body: { project: {}, total: 1, successful: 1, failed: 0, reassigned: 0, results: [] } });
    const mi = newClient(fetch);
    await mi.projects.assignDomains('p-1', { domainNames: ['a.com'] });
    expect(calls[0]!.init.method).toBe('PATCH');
    expect(calls[0]!.url).toBe('https://api.example.com/api/projects/p-1/domains');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ domainNames: ['a.com'] });
  });
});

describe('analytics', () => {
  it('getOverview is a plain GET', async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const mi = newClient(fetch);
    await mi.analytics.getOverview();
    expect(calls[0]!.url).toBe('https://api.example.com/api/analytics/overview');
  });

  it('getActivityGraph forwards counters and dates as query', async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const mi = newClient(fetch);
    await mi.analytics.getActivityGraph({
      granularity: 'daily',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-31T23:59:59Z',
      counters: ['outgoing', 'bounces'],
    });
    const url = calls[0]!.url;
    expect(url).toContain('granularity=daily');
    expect(url).toContain('counters=outgoing');
    expect(url).toContain('counters=bounces');
  });
});

describe('emailQueue', () => {
  it('list forwards status query', async () => {
    const { fetch, calls } = makeFetch({ body: { data: [], total: 0, page: 1, limit: 20, totalPages: 0 } });
    const mi = newClient(fetch);
    await mi.emailQueue.list({ status: 'failed' });
    expect(calls[0]!.url).toContain('status=failed');
  });

  it('retry POSTs to /:id/retry', async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const mi = newClient(fetch);
    await mi.emailQueue.retry('q-1');
    expect(calls[0]!.init.method).toBe('POST');
    expect(calls[0]!.url).toBe('https://api.example.com/api/email/queue/q-1/retry');
  });

  it('cancel POSTs to /:id/cancel', async () => {
    const { fetch, calls } = makeFetch({ body: { success: true } });
    const mi = newClient(fetch);
    await mi.emailQueue.cancel('q-1');
    expect(calls[0]!.url).toBe('https://api.example.com/api/email/queue/q-1/cancel');
  });
});

describe('health', () => {
  it('check GETs /api/health and returns the text body', async () => {
    const { fetch } = makeFetch({ body: 'Healthy', contentType: 'text/plain' });
    const mi = newClient(fetch);
    const result = await mi.health.check();
    expect(result).toBe('Healthy');
  });
});
