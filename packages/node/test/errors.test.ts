import { describe, expect, it } from 'vitest';
import {
  MissionInbox,
  AuthenticationError,
  UnregisteredSenderError,
  UnverifiedDomainError,
  SubscriptionInactiveError,
  SendLimitExceededError,
  DomainBlacklistedError,
  PermissionError,
  ConflictError,
  SendError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
} from '../src/index.js';

function client(response: { status: number; body?: unknown }) {
  const impl = (async () => {
    return new Response(response.body === undefined ? '' : JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return new MissionInbox({ apiKey: 'k', baseUrl: 'https://api.example.com', fetch: impl, maxRetries: 0 });
}

async function send(mi: MissionInbox): Promise<void> {
  await mi.transactional.emails.send({ from: 'a@b.com', to: 'c@d.com', subject: 's', text: 't' });
}

describe('error mapping', () => {
  it('401 → AuthenticationError', async () => {
    const mi = client({ status: 401, body: { statusCode: 401, message: 'Invalid credentials', error: 'Unauthorized' } });
    await expect(send(mi)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('403 unregistered → UnregisteredSenderError', async () => {
    const mi = client({
      status: 403,
      body: {
        statusCode: 403,
        message: 'x@y.com is not a registered sending identifier. Register it before sending from it.',
        error: 'Forbidden',
      },
    });
    await expect(send(mi)).rejects.toBeInstanceOf(UnregisteredSenderError);
  });

  it('403 unverified domain → UnverifiedDomainError', async () => {
    const mi = client({
      status: 403,
      body: { statusCode: 403, message: 'x@y.com cannot send yet: its domain y.com is not verified for sending (dns_pending).' },
    });
    await expect(send(mi)).rejects.toBeInstanceOf(UnverifiedDomainError);
  });

  it('403 subscription → SubscriptionInactiveError', async () => {
    const mi = client({ status: 403, body: { message: 'Your subscription is not active. Please contact support.' } });
    await expect(send(mi)).rejects.toBeInstanceOf(SubscriptionInactiveError);
  });

  it('403 send limit → SendLimitExceededError', async () => {
    const mi = client({ status: 403, body: { message: 'Daily send limit of 20 reached for the Free plan.' } });
    await expect(send(mi)).rejects.toBeInstanceOf(SendLimitExceededError);
  });

  it('403 blacklisted → DomainBlacklistedError', async () => {
    const mi = client({ status: 403, body: { message: "This domain is listed on Spamhaus and it's disabled for sending." } });
    await expect(send(mi)).rejects.toBeInstanceOf(DomainBlacklistedError);
  });

  it('403 generic → PermissionError', async () => {
    const mi = client({ status: 403, body: { message: 'Forbidden.' } });
    const err = await send(mi).catch((e) => e);
    expect(err).toBeInstanceOf(PermissionError);
    expect(err).not.toBeInstanceOf(UnregisteredSenderError);
  });

  it('400 → ValidationError', async () => {
    const mi = client({ status: 400, body: { message: 'From address is required' } });
    await expect(send(mi)).rejects.toBeInstanceOf(ValidationError);
  });

  it('404 → NotFoundError', async () => {
    const mi = client({ status: 404, body: { message: 'Not found' } });
    await expect(send(mi)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('409 → ConflictError', async () => {
    const mi = client({ status: 409, body: { message: 'already registered' } });
    await expect(send(mi)).rejects.toBeInstanceOf(ConflictError);
  });

  it('422 → SendError', async () => {
    const mi = client({ status: 422, body: { message: 'Failed to send email: SES rejected the message' } });
    await expect(send(mi)).rejects.toBeInstanceOf(SendError);
  });

  it('429 → RateLimitError (no retry)', async () => {
    const mi = client({ status: 429, body: { message: 'Too many requests' } });
    await expect(send(mi)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('500 → ServerError (no retry)', async () => {
    const mi = client({ status: 500, body: { message: 'Internal error' } });
    await expect(send(mi)).rejects.toBeInstanceOf(ServerError);
  });

  it('fetch throwing → NetworkError', async () => {
    const impl = (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    const mi = new MissionInbox({ apiKey: 'k', baseUrl: 'https://api.example.com', fetch: impl, maxRetries: 0 });
    await expect(send(mi)).rejects.toBeInstanceOf(NetworkError);
  });
});
