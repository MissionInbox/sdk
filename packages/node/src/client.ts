import { errorFromResponse, NetworkError, MissionInboxError, type ApiErrorBody } from './errors.js';
import { Emails } from './resources/emails.js';
import { EmailQueue } from './resources/email-queue.js';
import { Domains } from './resources/domains.js';
import { SendingIdentifiers } from './resources/sending-identifiers.js';
import { Projects } from './resources/projects.js';
import { Analytics } from './resources/analytics.js';
import { Tasks } from './resources/tasks.js';
import { Health } from './resources/health.js';
import { VERSION } from './version.js';

/** Options for the {@link MissionInbox} constructor. */
export interface MissionInboxOptions {
  /**
   * MissionInbox product API key. Passed on every request via the
   * `X-Server-API-Key` header.
   */
  apiKey: string;
  /**
   * Base URL of the MissionInbox environment (staging, production, or a
   * dedicated cluster). Provided by MissionInbox — the SDK ships no default
   * to avoid accidentally targeting the wrong environment.
   */
  baseUrl: string;
  /** Custom `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * Per-request timeout in milliseconds.
   * @defaultValue 30000
   */
  timeout?: number;
  /**
   * Maximum retries on transient failures (429, 502, 503, 504, network errors).
   * Uses exponential backoff with jitter and honours `Retry-After`.
   * @defaultValue 2
   */
  maxRetries?: number;
}

/** @internal */
export interface InternalRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  query?: Record<string, unknown> | undefined;
  idempotencyKey?: string;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * The MissionInbox API client.
 *
 * Construct one instance and reuse it across your process — the client is
 * stateless beyond its configuration and safe to call concurrently.
 *
 * @example Send a transactional email
 * ```ts
 * import { MissionInbox } from '@missioninbox/sdk';
 *
 * const mi = new MissionInbox({
 *   apiKey: process.env.MI_API_KEY!,
 *   baseUrl: process.env.MI_API_URL!,
 * });
 *
 * const { id } = await mi.emails.send({
 *   from: 'notifications@acme.com',
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<p>Hello 👋</p>',
 * });
 * ```
 *
 * @example Register a sending identifier and poll a bulk task
 * ```ts
 * await mi.sendingIdentifiers.create({ emailAddress: 'notifications@acme.com' });
 *
 * const { taskId } = await mi.domains.bulkCreate({
 *   domains: [{ domainName: 'acme.com' }, { domainName: 'shop.acme.com' }],
 * });
 * const done = await mi.tasks.waitFor(taskId);
 * console.log(done.status, done.result);
 * ```
 */
export class MissionInbox {
  /** Send and inspect transactional email. */
  readonly emails: Emails;
  /** Queued outbound emails: list, retry, cancel. */
  readonly emailQueue: EmailQueue;
  /** Domain management + verification + nested `redirects` sub-resource. */
  readonly domains: Domains;
  /** Registered `From:` addresses. */
  readonly sendingIdentifiers: SendingIdentifiers;
  /** Grouping of domains + resources into projects. */
  readonly projects: Projects;
  /** Send/activity analytics. */
  readonly analytics: Analytics;
  /** Background bulk-operation tasks. */
  readonly tasks: Tasks;
  /** Health/liveness ping. */
  readonly health: Health;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeout: number;
  private readonly maxRetries: number;

  /**
   * Construct a new client.
   *
   * @throws {TypeError} when `apiKey` or `baseUrl` is missing, or when the
   * runtime has no global `fetch` and no `fetch` override was supplied.
   */
  constructor(options: MissionInboxOptions) {
    if (!options?.apiKey) {
      throw new TypeError('MissionInbox: `apiKey` is required.');
    }
    if (!options.baseUrl) {
      throw new TypeError('MissionInbox: `baseUrl` is required. Use the URL provided for your environment.');
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeout = options.timeout ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;

    if (typeof this.fetchImpl !== 'function') {
      throw new TypeError('MissionInbox: global `fetch` is unavailable. Use Node.js >=18 or pass `options.fetch`.');
    }

    this.emails = new Emails(this);
    this.emailQueue = new EmailQueue(this);
    this.domains = new Domains(this);
    this.sendingIdentifiers = new SendingIdentifiers(this);
    this.projects = new Projects(this);
    this.analytics = new Analytics(this);
    this.tasks = new Tasks(this);
    this.health = new Health(this);
  }

  /** @internal */
  async request<T>(req: InternalRequest): Promise<T> {
    const url = this.baseUrl + req.path + buildQuery(req.query);
    const headers: Record<string, string> = {
      'X-Server-API-Key': this.apiKey,
      'User-Agent': `missioninbox-node/${VERSION}`,
      Accept: 'application/json',
    };
    if (req.body !== undefined) headers['Content-Type'] = 'application/json';
    if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey;

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const init: RequestInit = { method: req.method, headers, signal: controller.signal };
        if (req.body !== undefined) init.body = JSON.stringify(req.body);
        const response = await this.fetchImpl(url, init);
        clearTimeout(timer);

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          const text = await response.text();
          if (!text) return undefined as T;
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            return JSON.parse(text) as T;
          }
          return text as unknown as T;
        }

        if (RETRYABLE_STATUSES.has(response.status) && attempt < this.maxRetries) {
          await sleep(backoffDelay(attempt, response.headers.get('retry-after')));
          attempt++;
          continue;
        }

        const body = await safeReadJson(response);
        throw errorFromResponse(response.status, body);
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof MissionInboxError) throw err;
        if (attempt < this.maxRetries) {
          lastError = err;
          await sleep(backoffDelay(attempt, null));
          attempt++;
          continue;
        }
        throw new NetworkError(errorMessage(err), err);
      }
    }

    throw new NetworkError(errorMessage(lastError), lastError);
  }
}

function buildQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v !== undefined && v !== null) params.append(key, String(v));
    } else {
      params.append(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function safeReadJson(response: Response): Promise<ApiErrorBody | undefined> {
  try {
    const text = await response.text();
    if (!text) return undefined;
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

function backoffDelay(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 30_000);
  }
  const base = 250 * 2 ** attempt;
  const jitter = Math.random() * base * 0.25;
  return Math.min(base + jitter, 8_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
