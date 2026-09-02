import { describe, expect, it } from 'vitest';
import { MissionInbox } from '../src/index.js';
import { VERSION } from '../src/version.js';
import { makeFetch, newClient } from './_helpers.js';

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
    await mi.emails.send({ from: 'a@b.com', to: 'c@d.com', subject: 's', text: 't' });
    expect(calls[0]!.url).toBe('https://api.example.com/api/email/send');
  });
});

describe('emails.send', () => {
  it('maps camelCase to snake_case wire fields, defaults reply_to', async () => {
    const { fetch, calls } = makeFetch({ body: { id: '42', message: 'Email sent', status: 'sent', time: 123 } });
    const mi = newClient(fetch);

    const result = await mi.emails.send({
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

    await mi.emails.send({
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

describe('emails.getStatus + getBulkStatus + getDetails + getRaw', () => {
  it('getStatus posts messageId', async () => {
    const { fetch, calls } = makeFetch({
      body: {
        id: '1', token: 't', status: 'Sent', last_delivery_attempt: 0, held: false,
        rcpt_to: 'a@b.com', mail_from: 'x@y.com', subject: 's', timestamp: 0, direction: 'outgoing',
        size: 100, bounce: false,
      },
    });
    const mi = newClient(fetch);
    await mi.emails.getStatus('msg_1');
    expect(calls[0]!.url).toBe('https://api.example.com/api/email/status');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ messageId: 'msg_1' });
  });

  it('getBulkStatus posts messageIds', async () => {
    const { fetch, calls } = makeFetch({ body: { statuses: [] } });
    const mi = newClient(fetch);
    await mi.emails.getBulkStatus(['a', 'b']);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ messageIds: ['a', 'b'] });
  });

  it('getDetails posts id + comma-joined include', async () => {
    const { fetch, calls } = makeFetch({ body: { message: { id: 1, token: 't' } } });
    const mi = newClient(fetch);
    await mi.emails.getDetails('msg_1', ['content', 'headers']);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ id: 'msg_1', include: 'content,headers' });
  });

  it('getDetails omits include when none passed', async () => {
    const { fetch, calls } = makeFetch({ body: { message: { id: 1, token: 't' } } });
    const mi = newClient(fetch);
    await mi.emails.getDetails('msg_1');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ id: 'msg_1' });
  });

  it('getRaw posts id', async () => {
    const { fetch, calls } = makeFetch({ body: { status: 'success', raw_data: 'X-Header: y' } });
    const mi = newClient(fetch);
    await mi.emails.getRaw('msg_1');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ id: 'msg_1' });
  });
});

describe('emails.search + getSendLimit', () => {
  it('search maps sendingIdentifierId → sending_identifier_id', async () => {
    const { fetch, calls } = makeFetch({ body: { data: [], total: 0, page: 1, limit: 30, totalPages: 0 } });
    const mi = newClient(fetch);
    await mi.emails.search({ sendingIdentifierId: 'uuid-1', status: 'Sent', limit: 10 });
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      sending_identifier_id: 'uuid-1', status: 'Sent', limit: 10,
    });
  });

  it('getSendLimit is a GET with no body', async () => {
    const { fetch, calls } = makeFetch({ body: { limited: false } });
    const mi = newClient(fetch);
    const result = await mi.emails.getSendLimit();
    expect(result).toEqual({ limited: false });
    expect(calls[0]!.init.method).toBe('GET');
    expect(calls[0]!.init.body).toBeUndefined();
  });
});
