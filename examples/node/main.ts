/**
 * MissionInbox Node SDK — end-to-end walk-through.
 *
 * Runs through every resource in `@missioninbox/sdk` in order, printing one
 * line per method call. Set MI_EXAMPLE_MODE=full to also exercise the
 * destructive endpoints (creates, deletes, one real send). Every resource
 * created in full mode is deleted before exit.
 */

import 'dotenv/config';
import {
  AuthenticationError,
  MissionInbox,
  MissionInboxError,
  UnregisteredSenderError,
  type Task,
} from '@missioninbox/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Env + client setup
// ─────────────────────────────────────────────────────────────────────────────

const {
  MI_API_KEY,
  MI_API_URL,
  MI_EXAMPLE_MODE,
  MI_TEST_SENDER,
  MI_TEST_TO,
  MI_TEST_DOMAIN,
  MI_TEST_REDIRECT_DOMAIN,
} = process.env;

if (!MI_API_KEY) exitWithMissingEnv('MI_API_KEY');
if (!MI_API_URL) exitWithMissingEnv('MI_API_URL');

const mode = (MI_EXAMPLE_MODE ?? 'safe').toLowerCase();
if (mode !== 'safe' && mode !== 'full') {
  console.error(`MI_EXAMPLE_MODE must be 'safe' or 'full' (got '${MI_EXAMPLE_MODE}')`);
  process.exit(2);
}
const isFull = mode === 'full';

if (isFull) {
  const missing = [
    ['MI_TEST_SENDER', MI_TEST_SENDER],
    ['MI_TEST_TO', MI_TEST_TO],
    ['MI_TEST_DOMAIN', MI_TEST_DOMAIN],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    console.error(`Full mode requires: ${missing.join(', ')}`);
    process.exit(2);
  }
}

const mi = new MissionInbox({ apiKey: MI_API_KEY!, baseUrl: MI_API_URL! });

const ts = Date.now();
const testSenderDomain = MI_TEST_SENDER ? MI_TEST_SENDER.split('@')[1] : undefined;

// Track anything we create so cleanup can delete it, regardless of section
// failures.
const cleanup: Array<{ label: string; fn: () => Promise<unknown> }> = [];
const created = {
  identifierId: undefined as string | undefined,
  projectId: undefined as string | undefined,
  domainNames: [] as string[],
  redirectDomain: undefined as string | undefined,
};

let lastSentMessageId: string | undefined;
let firstDomainId: string | undefined;
let firstDomainName: string | undefined;
let firstIdentifierId: string | undefined;
let firstProjectId: string | undefined;
let firstTaskId: string | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Output helpers
// ─────────────────────────────────────────────────────────────────────────────

function header(n: number, title: string): void {
  console.log(`\n━━━ ${n}. ${title} ━━━`);
}

function line(action: string, result: string): void {
  const pad = action.length < 44 ? ' '.repeat(44 - action.length) : ' ';
  console.log(`  → ${action}${pad}${result}`);
}

function skip(reason: string): void {
  console.log(`  ~ skipped: ${reason}`);
}

function fail(action: string, err: unknown): void {
  const name = err instanceof Error ? err.constructor.name : 'Error';
  const msg = err instanceof Error ? err.message : String(err);
  const pad = action.length < 44 ? ' '.repeat(44 - action.length) : ' ';
  console.log(`  ✗ ${action}${pad}${name}: ${msg}`);
}

function exitWithMissingEnv(name: string): never {
  console.error(`Missing required env var: ${name}. Copy .env.example to .env and fill it in.`);
  process.exit(2);
}

// Run `fn` and either print the result via `line` or catch + print via `fail`.
// Returns the value (or `undefined` on error) so callers can chain.
async function tryCall<T>(action: string, fn: () => Promise<T>, format?: (result: T) => string): Promise<T | undefined> {
  try {
    const result = await fn();
    line(action, format ? format(result) : 'ok');
    return result;
  } catch (err) {
    fail(action, err);
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────

async function section1Health(): Promise<void> {
  header(1, 'Health check');
  await tryCall('health.check()', () => mi.health.check(), (r) => (typeof r === 'string' ? r : JSON.stringify(r)));
}

async function section2SendLimit(): Promise<void> {
  header(2, 'Send-limit status');
  await tryCall(
    'emails.getSendLimit()',
    () => mi.emails.getSendLimit(),
    (r) =>
      r.limited
        ? `limited (daily sent=${r.daily?.sent}/${r.daily?.limit}, monthly sent=${r.monthly?.sent}/${r.monthly?.limit})`
        : 'unlimited (paid plan)',
  );
}

async function section3SendingIdentifiers(): Promise<void> {
  header(3, 'Sending identifiers');
  const identifiers = await tryCall(
    'sendingIdentifiers.list()',
    () => mi.sendingIdentifiers.list(),
    (r) => `${r.length} identifier(s)`,
  );

  if (identifiers && identifiers.length > 0) {
    firstIdentifierId = identifiers[0]!.id;
    await tryCall(
      `sendingIdentifiers.get('${short(firstIdentifierId!)}')`,
      () => mi.sendingIdentifiers.get(firstIdentifierId!),
      (r) => `${r.emailAddress} (canSend: ${r.canSend})`,
    );
  }

  if (!isFull) {
    skip('create/update/delete (safe mode)');
    return;
  }

  if (!testSenderDomain) {
    skip('create/update/delete (MI_TEST_SENDER has no domain part)');
    return;
  }

  const tempAddress = `sdk-example-${ts}@${testSenderDomain}`;
  const created0 = await tryCall(
    `sendingIdentifiers.create('${tempAddress}')`,
    () =>
      mi.sendingIdentifiers.create({
        emailAddress: tempAddress,
        displayName: 'SDK example — safe to delete',
      }),
    (r) => `id: ${short(r.id)}`,
  );

  if (created0) {
    created.identifierId = created0.id;
    cleanup.push({
      label: `sendingIdentifiers.delete('${short(created0.id)}')`,
      fn: () => mi.sendingIdentifiers.delete(created0.id),
    });

    await tryCall(
      `sendingIdentifiers.update('${short(created0.id)}')`,
      () => mi.sendingIdentifiers.update(created0.id, { displayName: `SDK example ${ts} (updated)` }),
      (r) => `displayName: ${JSON.stringify(r.displayName)}`,
    );
  }
}

async function section4Domains(): Promise<void> {
  header(4, 'Domains');

  const list = await tryCall('domains.list({ limit: 5 })', () => mi.domains.list({ limit: 5 }), (r) => `${r.total} total`);

  if (list && list.data.length > 0) {
    firstDomainId = list.data[0]!.id;
    firstDomainName = list.data[0]!.domainName;
  }

  await tryCall('domains.getStatistics()', () => mi.domains.getStatistics(), (r) => `${r.verifiedDomains}/${r.totalDomains} verified`);

  const domainToRead = MI_TEST_DOMAIN || firstDomainName;
  if (domainToRead) {
    await tryCall(
      `domains.getByName('${domainToRead}')`,
      () => mi.domains.getByName(domainToRead),
      (r) => `${r.dnsRecords.length} DNS record(s) published`,
    );
    await tryCall(
      `domains.getAdminMailboxes('${domainToRead}')`,
      () => mi.domains.getAdminMailboxes(domainToRead),
      (r) => `${r.mailboxes.length} admin mailbox(es)`,
    );
  } else {
    skip('getByName/getAdminMailboxes (no domain to target)');
  }

  if (firstDomainId) {
    await tryCall(
      `domains.get('${short(firstDomainId)}')`,
      () => mi.domains.get(firstDomainId!),
      (r) => `domainName=${r.domainName}, verificationState=${r.verificationState}`,
    );
  }

  await tryCall('domains.exportCsv({ limit: 5 })', () => mi.domains.exportCsv({ limit: 5 }), (r) => `${r.split('\n').length - 1} row(s) of CSV`);

  if (!isFull || !MI_TEST_DOMAIN) {
    skip('bulkCreate/verify/pushDns/repush/delete (safe mode or MI_TEST_DOMAIN unset)');
    return;
  }

  const testA = `sdk-example-${ts}-a.${MI_TEST_DOMAIN}`;
  const testB = `sdk-example-${ts}-b.${MI_TEST_DOMAIN}`;

  const bulk = await tryCall(
    `domains.bulkCreate([${testA}, ${testB}])`,
    () =>
      mi.domains.bulkCreate({
        domains: [{ domainName: testA }, { domainName: testB }],
      }),
    (r) => `taskId: ${short(r.taskId)}`,
  );

  if (bulk) {
    firstTaskId = bulk.taskId;
    created.domainNames.push(testA, testB);
    cleanup.push({
      label: `domains.bulkDelete([${testA}, ${testB}])`,
      fn: () => mi.domains.bulkDelete({ domainNames: [testA, testB] }),
    });

    await tryCall(
      `tasks.waitFor('${short(bulk.taskId)}')`,
      () => mi.tasks.waitFor(bulk.taskId, { pollInterval: 3_000, timeout: 60_000 }),
      (r) => `status=${r.status}`,
    );

    await tryCall(`domains.verify('${testA}')`, () => mi.domains.verify(testA), (r) => `fullyVerified=${r.fullyVerified}`);
    await tryCall(
      `domains.bulkVerify([${testA}, ${testB}])`,
      () => mi.domains.bulkVerify({ domainNames: [testA, testB] }),
      (r) => `taskId: ${short(r.taskId)}`,
    );
    await tryCall(`domains.pushDns('${testA}')`, () => mi.domains.pushDns(testA), (r) => `${r.dnsRecords.length} records considered`);
    await tryCall(
      `domains.bulkPushDns([${testA}])`,
      () => mi.domains.bulkPushDns({ domainNames: [testA] }),
      (r) => `taskId: ${short(r.taskId)}`,
    );
    await tryCall(`domains.repushDns('${testA}')`, () => mi.domains.repushDns(testA), (r) => `dmarcApplied=${r.customDmarcApplied}`);
    await tryCall(
      `domains.bulkRepushDns([${testA}])`,
      () => mi.domains.bulkRepushDns({ domainNames: [testA] }),
      (r) => `taskId: ${short(r.taskId)}`,
    );
  }

  console.log('  (domains.cleanDns intentionally not called — see README)');
}

async function section5Redirects(): Promise<void> {
  header(5, 'Domain redirects');
  await tryCall('domains.redirects.getDnsConfig()', () => mi.domains.redirects.getDnsConfig(), (r) => `ip=${r.ipAddress}`);

  const readDomain = MI_TEST_REDIRECT_DOMAIN || MI_TEST_DOMAIN || firstDomainName;
  if (readDomain) {
    await tryCall(
      `domains.redirects.get('${readDomain}')`,
      () => mi.domains.redirects.get(readDomain),
      (r) => (r.hasRedirect ? `redirect → ${r.redirect?.redirectUrl}` : 'no redirect set'),
    );
  } else {
    skip('redirects.get (no domain to target)');
  }

  if (!isFull || !MI_TEST_REDIRECT_DOMAIN) {
    skip('setup/pushDns/verifyDns/events/delete (needs MI_TEST_REDIRECT_DOMAIN)');
    return;
  }

  const setup = await tryCall(
    `redirects.setup('${MI_TEST_REDIRECT_DOMAIN}', → https://example.com)`,
    () =>
      mi.domains.redirects.setup(MI_TEST_REDIRECT_DOMAIN, {
        redirectUrl: 'https://example.com',
        forceHttps: true,
      }),
    (r) => `action=${r.action}`,
  );

  if (setup) {
    created.redirectDomain = MI_TEST_REDIRECT_DOMAIN;
    cleanup.push({
      label: `redirects.delete('${MI_TEST_REDIRECT_DOMAIN}')`,
      fn: () => mi.domains.redirects.delete(MI_TEST_REDIRECT_DOMAIN),
    });

    await tryCall(`redirects.pushDns('${MI_TEST_REDIRECT_DOMAIN}')`, () => mi.domains.redirects.pushDns(MI_TEST_REDIRECT_DOMAIN), (r) => `dnsPushed=${r.dnsPushed}`);
    await tryCall(
      `redirects.verifyDns('${MI_TEST_REDIRECT_DOMAIN}')`,
      () => mi.domains.redirects.verifyDns(MI_TEST_REDIRECT_DOMAIN),
      (r) => `dnsStatus=${r.dnsStatus}`,
    );
    await tryCall(
      `redirects.getEvents('${MI_TEST_REDIRECT_DOMAIN}')`,
      () => mi.domains.redirects.getEvents(MI_TEST_REDIRECT_DOMAIN, 5),
      (r) => `${r.totalEvents} event(s)`,
    );
  }
}

async function section6Projects(): Promise<void> {
  header(6, 'Projects');
  const projects = await tryCall('projects.list()', () => mi.projects.list(), (r) => `${r.length} project(s)`);

  if (projects && projects.length > 0) {
    firstProjectId = projects[0]!.id;
    await tryCall(
      `projects.get('${short(firstProjectId!)}')`,
      () => mi.projects.get(firstProjectId!),
      (r) => `${r.name} (${r.domainsCount} domains)`,
    );
  }

  if (!isFull) {
    skip('create/update/assignDomains/delete (safe mode)');
    return;
  }

  const projectName = `SDK example ${ts}`;
  const p = await tryCall(
    `projects.create('${projectName}')`,
    () => mi.projects.create({ name: projectName }),
    (r) => `id: ${short(r.id)}`,
  );

  if (p) {
    created.projectId = p.id;
    cleanup.push({ label: `projects.delete('${short(p.id)}')`, fn: () => mi.projects.delete(p.id) });

    await tryCall(
      `projects.update('${short(p.id)}')`,
      () => mi.projects.update(p.id, { name: `${projectName} (updated)` }),
      (r) => `name: ${r.name}`,
    );

    if (created.domainNames.length > 0) {
      await tryCall(
        `projects.assignDomains('${short(p.id)}', ${created.domainNames.length} domain(s))`,
        () => mi.projects.assignDomains(p.id, { domainNames: created.domainNames }),
        (r) => `assigned ${r.successful}, failed ${r.failed}`,
      );
    } else {
      skip('assignDomains (no test domains available)');
    }
  }
}

async function section7Analytics(): Promise<void> {
  header(7, 'Analytics');
  await tryCall(
    'analytics.getOverview()',
    () => mi.analytics.getOverview(),
    (r) => `${r.currentMonth.emailsSent} sent this month (${r.domains} domains)`,
  );

  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  await tryCall(
    'analytics.getActivityGraph(daily, last 7 days)',
    () =>
      mi.analytics.getActivityGraph({
        granularity: 'daily',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        counters: ['outgoing', 'bounces'],
      }),
    (r) => `${r.dataPoints.length} data point(s), total outgoing ${r.summary.totalOutgoing ?? 0}`,
  );
}

async function section8Tasks(): Promise<void> {
  header(8, 'Tasks');
  const list = await tryCall('tasks.list({ limit: 5 })', () => mi.tasks.list({ limit: 5 }), (r) => `${r.total} total`);

  const taskIdToPoke = firstTaskId ?? list?.tasks[0]?.id;
  if (taskIdToPoke) {
    await tryCall(
      `tasks.get('${short(taskIdToPoke)}')`,
      () => mi.tasks.get(taskIdToPoke),
      (r) => `status=${r.status}, progress=${r.progress}%`,
    );
    await tryCall(
      `tasks.getOutputs('${short(taskIdToPoke)}')`,
      () => mi.tasks.getOutputs(taskIdToPoke),
      (r) => `${r.outputs.length} log line(s)`,
    );
  } else {
    skip('tasks.get / getOutputs (no task id from earlier bulk op)');
  }

  await tryCall('tasks.getStatsSummary()', () => mi.tasks.getStatsSummary(), (r) => `pending=${r.pendingTasks}, done=${r.completedTasks}`);

  if (!isFull || !MI_TEST_DOMAIN) {
    skip('cancel demo (safe mode or MI_TEST_DOMAIN unset)');
    return;
  }

  const spawn = await tryCall(
    `tasks.cancel demo — spawn a bulkVerify then cancel it`,
    () => mi.domains.bulkVerify({ domainNames: [MI_TEST_DOMAIN] }),
    (r) => `spawned ${short(r.taskId)}`,
  );
  if (spawn) {
    await tryCall(
      `tasks.cancel('${short(spawn.taskId)}')`,
      () => mi.tasks.cancel(spawn.taskId),
      (r: Task) => `status=${r.status}`,
    );
  }
}

async function section9EmailsSend(): Promise<void> {
  header(9, 'Emails — send + inspect');
  if (!isFull) {
    skip('entire section (safe mode)');
    return;
  }

  const sent = await tryCall(
    `emails.send(from=${MI_TEST_SENDER}, to=${MI_TEST_TO})`,
    () =>
      mi.emails.send({
        from: MI_TEST_SENDER!,
        to: MI_TEST_TO!,
        subject: `MissionInbox SDK example — ${new Date().toISOString()}`,
        html: `<p>This is a test send from the MissionInbox Node SDK example.</p><p>Run id: ${ts}</p>`,
        text: `MissionInbox SDK example test send. Run id: ${ts}.`,
        tag: 'sdk-example',
      }),
    (r) => `id: ${r.id}`,
  );
  if (!sent) return;

  lastSentMessageId = sent.id;

  // getDetails accepts the numeric id returned by send(). Extract the RFC 822
  // Message-ID header value from properties — that's what getStatus /
  // getBulkStatus expect.
  const details = await tryCall(
    `emails.getDetails('${lastSentMessageId}', [properties, activity])`,
    () => mi.emails.getDetails(lastSentMessageId!, ['properties', 'activity']),
    (r) => `subject=${r.message.properties?.subject}`,
  );

  const rfc822MessageId = details?.message.properties?.message_id;

  if (rfc822MessageId) {
    await tryCall(
      `emails.getStatus('${short(rfc822MessageId)}')`,
      () => mi.emails.getStatus(rfc822MessageId),
      (r) => `status=${r.status}, bounce=${r.bounce}`,
    );
    await tryCall(
      `emails.getBulkStatus(['${short(rfc822MessageId)}'])`,
      () => mi.emails.getBulkStatus([rfc822MessageId]),
      (r) => `${r.statuses.filter(Boolean).length}/${r.statuses.length} found`,
    );
  } else {
    skip('getStatus / getBulkStatus (Message-ID header not available yet)');
  }

  await tryCall(
    `emails.getRaw('${lastSentMessageId}')`,
    () => mi.emails.getRaw(lastSentMessageId!),
    (r) => (r.raw_data ? `${r.raw_data.length} bytes` : `status=${r.status}`),
  );
  await tryCall(
    `emails.search({ from: <sender>, limit: 5 })`,
    () => mi.emails.search({ from: MI_TEST_SENDER, limit: 5 }),
    (r) => `${r.data.length} hit(s), total ${r.total}`,
  );
}

async function section10EmailQueue(): Promise<void> {
  header(10, 'Email queue');
  const queue = await tryCall('emailQueue.list({ limit: 5 })', () => mi.emailQueue.list({ limit: 5 }), (r) => `${r.total} total`);

  if (!isFull) {
    skip('retry/cancel (safe mode)');
    return;
  }

  const first = queue?.data[0];
  if (!first) {
    skip('retry/cancel (queue is empty)');
    return;
  }
  console.log(`  (queue has items — retry/cancel skipped to avoid affecting live queue state; ids visible: ${queue!.data.slice(0, 3).map((q) => short(q.id)).join(', ')})`);
}

async function section11Errors(): Promise<void> {
  header(11, 'Error hierarchy demos');

  const badKey = new MissionInbox({ apiKey: 'obviously-wrong-key', baseUrl: MI_API_URL!, maxRetries: 0 });
  try {
    await badKey.emails.getSendLimit();
    line('emails.getSendLimit with bad key', 'unexpectedly succeeded');
  } catch (err) {
    if (err instanceof AuthenticationError) {
      line('AuthenticationError (401)', `caught: ${err.message.slice(0, 60)}`);
    } else if (err instanceof MissionInboxError) {
      line('MissionInboxError (unexpected)', `status=${err.status}: ${err.message.slice(0, 60)}`);
    } else {
      fail('bad-key call', err);
    }
  }

  if (isFull && MI_TEST_TO) {
    try {
      await mi.emails.send({
        from: `never-registered-${ts}@example.invalid`,
        to: MI_TEST_TO,
        subject: 'this should fail',
        text: 'this should fail',
      });
      line('emails.send with unregistered from', 'unexpectedly succeeded');
    } catch (err) {
      if (err instanceof UnregisteredSenderError) {
        line('UnregisteredSenderError (403)', `caught: ${err.message.slice(0, 60)}`);
      } else if (err instanceof MissionInboxError) {
        line(`${err.constructor.name} (${err.status})`, err.message.slice(0, 60));
      } else {
        fail('unregistered-sender call', err);
      }
    }
  } else {
    skip('unregistered-sender demo (safe mode or MI_TEST_TO unset)');
  }
}

async function runCleanup(): Promise<void> {
  if (cleanup.length === 0) return;
  header(99, 'Cleanup');
  for (const { label, fn } of cleanup.reverse()) {
    try {
      await fn();
      line(label, 'ok');
    } catch (err) {
      fail(label, err);
    }
  }
}

function short(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`MissionInbox SDK example — mode=${mode}, base=${MI_API_URL}`);
  if (isFull) console.log(`  sender=${MI_TEST_SENDER}, recipient=${MI_TEST_TO}, testDomain=${MI_TEST_DOMAIN}`);

  try {
    await section1Health();
    await section2SendLimit();
    await section3SendingIdentifiers();
    await section4Domains();
    await section5Redirects();
    await section6Projects();
    await section7Analytics();
    await section8Tasks();
    await section9EmailsSend();
    await section10EmailQueue();
    await section11Errors();
  } finally {
    await runCleanup();
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
