import { describe, expect, it } from 'vitest';
import { MissionInbox } from '../src/index.js';

const apiKey = process.env.MI_STAGING_API_KEY;
const baseUrl = process.env.MI_STAGING_API_URL;
const from = process.env.MI_STAGING_FROM_IDENTIFIER;
const to = process.env.MI_STAGING_TO_ADDRESS;

const canRun = Boolean(apiKey && baseUrl && from && to);

describe.skipIf(!canRun)('e2e: staging', () => {
  it('sends a real transactional email', async () => {
    const mi = new MissionInbox({ apiKey: apiKey!, baseUrl: baseUrl! });
    const result = await mi.emails.send({
      from: from!,
      to: to!,
      subject: `SDK e2e ${new Date().toISOString()}`,
      text: 'This is an e2e test from the MissionInbox Node SDK.',
    });
    expect(result.id).toBeTruthy();
    expect(result.status).toBeTruthy();
  }, 30_000);
});
