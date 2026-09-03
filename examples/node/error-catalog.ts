/**
 * MissionInbox Node SDK — error catalog.
 *
 * Deliberately triggers each error the SDK maps, prints the raw HTTP
 * response body observed, and verifies the SDK's exception classification.
 * Companion to `main.ts`; run separately via `npm run errors`.
 *
 * Env vars (same as main.ts):
 *   MI_API_KEY, MI_API_URL — required
 *   MI_TEST_SENDER, MI_TEST_TO, MI_TEST_DOMAIN — required for triggers 3–7
 */

import 'dotenv/config';
import {
  AuthenticationError,
  ConflictError,
  MissionInbox,
  MissionInboxError,
  NetworkError,
  NotFoundError,
  UnregisteredSenderError,
  UnverifiedDomainError,
  ValidationError,
} from '@missioninbox/sdk';

const {
  MI_API_KEY,
  MI_API_URL,
  MI_TEST_SENDER,
  MI_TEST_TO,
  MI_TEST_DOMAIN,
} = process.env;

if (!MI_API_KEY || !MI_API_URL) {
  console.error('MI_API_KEY and MI_API_URL are required.');
  process.exit(2);
}

const mi = new MissionInbox({
  apiKey: MI_API_KEY,
  baseUrl: MI_API_URL,
  maxRetries: 0,
});

const ts = Date.now();
const results: Array<{
  id: number;
  name: string;
  expected: string;
  actual: string;
  status: number;
  body: unknown;
  pass: boolean;
}> = [];

async function trigger(
  id: number,
  name: string,
  expectedClass: new (...args: never[]) => Error,
  fn: () => Promise<unknown>,
): Promise<void> {
  const expected = expectedClass.name;
  console.log(`\n━━━ ${id}. ${expected}: ${name} ━━━`);
  try {
    const r = await fn();
    console.log(`  ✗ Expected ${expected}, got success:`, JSON.stringify(r).slice(0, 120));
    results.push({ id, name, expected, actual: 'no-throw', status: 0, body: r, pass: false });
  } catch (err) {
    const actual = err instanceof Error ? err.constructor.name : typeof err;
    const status = err instanceof MissionInboxError ? err.status : 0;
    const body = err instanceof MissionInboxError ? err.body : undefined;
    const pass = err instanceof expectedClass;
    console.log(`  ${pass ? '✓' : '✗'} Actual class:  ${actual}${pass ? '' : `  (expected ${expected})`}`);
    console.log(`     HTTP status:  ${status}`);
    console.log(`     Response body: ${JSON.stringify(body)}`);
    if (err instanceof Error && err.message) {
      console.log(`     Message:       ${err.message.slice(0, 160)}`);
    }
    results.push({ id, name, expected, actual, status, body, pass });
  }
}

async function main(): Promise<void> {
  console.log(`MissionInbox error-catalog run — base=${MI_API_URL}`);
  const canTrigger = Boolean(MI_TEST_SENDER && MI_TEST_TO && MI_TEST_DOMAIN);
  if (!canTrigger) {
    console.log('  (MI_TEST_SENDER / TO / DOMAIN not set — will skip triggers that need them)');
  }

  // 1. AuthenticationError (401) — wrong API key
  const badKey = new MissionInbox({
    apiKey: 'obviously-wrong-key',
    baseUrl: MI_API_URL!,
    maxRetries: 0,
  });
  await trigger(1, 'wrong API key', AuthenticationError, () => badKey.emails.getSendLimit());

  // 2a. ValidationError (400) — missing recipient
  if (canTrigger) {
    await trigger(2, 'send with no recipient', ValidationError, () =>
      mi.emails.send({
        from: MI_TEST_SENDER!,
        subject: 'no recipient',
        text: 'should fail validation',
      } as never),
    );
  } else {
    console.log('\n━━━ 2. ValidationError: send with no recipient ━━━\n  (skipped — set MI_TEST_SENDER)');
  }

  // 2b. ValidationError (400) — missing body
  if (canTrigger) {
    await trigger(3, 'send with no body', ValidationError, () =>
      mi.emails.send({
        from: MI_TEST_SENDER!,
        to: MI_TEST_TO!,
        subject: 'no body content',
      } as never),
    );
  } else {
    console.log('\n━━━ 3. ValidationError: send with no body ━━━\n  (skipped)');
  }

  // 3. UnregisteredSenderError (403)
  if (canTrigger) {
    await trigger(4, 'send from unregistered address', UnregisteredSenderError, () =>
      mi.emails.send({
        from: `never-registered-${ts}@example.invalid`,
        to: MI_TEST_TO!,
        subject: 'unregistered from',
        text: 'should fail',
      }),
    );
  } else {
    console.log('\n━━━ 4. UnregisteredSenderError: send from unregistered address ━━━\n  (skipped)');
  }

  // 4. NotFoundError (404) — fetch non-existent sending identifier
  await trigger(5, 'fetch non-existent sending identifier', NotFoundError, () =>
    mi.sendingIdentifiers.get('00000000-0000-0000-0000-000000000000'),
  );

  // 5. ConflictError (409) — register the same identifier twice
  if (canTrigger) {
    const testAddr = `sdk-error-catalog-${ts}@${MI_TEST_SENDER!.split('@')[1]}`;
    let firstId: string | undefined;
    try {
      const created = await mi.sendingIdentifiers.create({
        emailAddress: testAddr,
        displayName: 'SDK error catalog — safe to delete',
      });
      firstId = created.id;
      // Now trigger the conflict:
      await trigger(6, 'register identifier that already exists', ConflictError, () =>
        mi.sendingIdentifiers.create({
          emailAddress: testAddr,
          displayName: 'duplicate',
        }),
      );
    } catch (err) {
      console.log('\n━━━ 6. ConflictError: register identifier twice ━━━');
      console.log(`  ✗ Setup failed:`, err instanceof Error ? err.message : String(err));
    } finally {
      if (firstId) {
        try {
          await mi.sendingIdentifiers.delete(firstId);
        } catch {
          /* best effort cleanup */
        }
      }
    }
  } else {
    console.log('\n━━━ 6. ConflictError: register identifier twice ━━━\n  (skipped)');
  }

  // 6. UnverifiedDomainError (403) — create sub-domain, register identifier, try to send
  if (canTrigger && MI_TEST_DOMAIN) {
    const subDomain = `sdk-error-${ts}.${MI_TEST_DOMAIN}`;
    const testFrom = `sender@${subDomain}`;
    let taskId: string | undefined;
    let identifierId: string | undefined;
    try {
      const created = await mi.domains.bulkCreate({ domains: [{ domainName: subDomain }] });
      taskId = created.taskId;
      await mi.tasks.waitFor(taskId, { pollInterval: 3_000, timeout: 30_000 });
      const identifier = await mi.sendingIdentifiers.create({ emailAddress: testFrom });
      identifierId = identifier.id;
      await trigger(7, 'send from unverified-domain identifier', UnverifiedDomainError, () =>
        mi.emails.send({
          from: testFrom,
          to: MI_TEST_TO!,
          subject: 'unverified domain',
          text: 'should fail',
        }),
      );
    } catch (err) {
      console.log('\n━━━ 7. UnverifiedDomainError: send from unverified-domain identifier ━━━');
      console.log(`  ✗ Setup failed:`, err instanceof Error ? err.message : String(err));
    } finally {
      if (identifierId) {
        try {
          await mi.sendingIdentifiers.delete(identifierId);
        } catch {
          /* ignore */
        }
      }
      try {
        await mi.domains.bulkDelete({ domainNames: [subDomain] });
      } catch {
        /* ignore */
      }
    }
  } else {
    console.log('\n━━━ 7. UnverifiedDomainError: unverified domain ━━━\n  (skipped)');
  }

  // 7. NetworkError — client-side, unroutable host
  const unreachable = new MissionInbox({
    apiKey: MI_API_KEY!,
    baseUrl: 'https://127.0.0.1:1',
    maxRetries: 0,
    timeout: 2_000,
  });
  await trigger(8, 'unreachable host', NetworkError, () => unreachable.health.check());

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n━━━ Summary ━━━');
  const passes = results.filter((r) => r.pass).length;
  console.log(`  ${passes}/${results.length} exception mappings correct`);
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    console.log(`  ${mark} #${r.id} [${r.status}] ${r.expected}: ${r.name}`);
  }
  console.log('');
  console.log('Not tested here (need special account state or would burden staging):');
  console.log('  SubscriptionInactiveError — inactive account');
  console.log('  SendLimitExceededError    — Free plan hitting 20/day cap');
  console.log('  DomainBlacklistedError    — blacklisted domain');
  console.log('  RateLimitError            — sustained request volume');
  console.log('  ServerError               — API 5xx');
  console.log('  SendError                 — SES rejection with a valid-looking recipient');
  console.log('  PermissionError (base)    — non-specific 403');
}

main().catch((err) => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
