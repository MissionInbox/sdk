import { errorFromResponse, NetworkError, MissionInboxError, type ApiErrorBody } from './errors.js';
import { Emails } from './resources/emails.js';
import { SendingIdentifiers } from './resources/sending-identifiers.js';
import { VERSION } from './version.js';

/**
 * Options for the {@link MissionInbox} constructor.
 */
export interface MissionInboxOptions {
  /**
   * MissionInbox product API key. Passed on every request via the
   * `X-Server-API-Key` header.
   *
   * Generate one from the MissionInbox dashboard for your product; the SDK
   * never persists or logs the key.
   */
  apiKey: string;
  /**
   * Base URL of the MissionInbox environment to talk to (e.g. staging,
   * production, or a dedicated cluster). MissionInbox provides this URL to
   * you — the SDK ships with no default so it can't accidentally target the
   * wrong environment.
   */
  baseUrl: string;
  /**
   * Custom `fetch` implementation. Defaults to the global `fetch`. Handy for
   * routing through a proxy, injecting instrumentation, or providing a
   * polyfill on older runtimes.
   */
  fetch?: typeof fetch;
  /**
   * Per-request timeout in milliseconds.
   *
   * @defaultValue 30000
   */
  timeout?: number;
  /**
   * Maximum number of retries for transient failures (429, 502, 503, 504,
   * and network errors). Uses exponential backoff with jitter and honours a
   * `Retry-After` header when present. Non-transient errors are never retried.
   *
   * @defaultValue 2
   */
  maxRetries?: number;
}

/** Resource namespace for the Transactional product. */
export interface TransactionalNamespace {
  /** Send and manage transactional email. */
  emails: Emails;
  /** Register and inspect approved `From:` addresses. */
  sendingIdentifiers: SendingIdentifiers;
}

interface InternalRequest {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  idempotencyKey?: string;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * The MissionInbox API client.
 *
 * Construct one instance and reuse it across your process; the client is
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
 * const { id } = await mi.transactional.emails.send({
 *   from: 'notifications@acme.com',
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<p>Hello 👋</p>',
 * });
 *
 * console.log('sent', id);
 * ```
 *
 * @example Handle specific errors
 * ```ts
 * import { UnregisteredSenderError, UnverifiedDomainError } from '@missioninbox/sdk';
 *
 * try {
 *   await mi.transactional.emails.send({ ... });
 * } catch (err) {
 *   if (err instanceof UnregisteredSenderError) {
 *     await mi.transactional.sendingIdentifiers.create({ emailAddress: 'notifications@acme.com' });
 *   } else if (err instanceof UnverifiedDomainError) {
 *     console.log('Publish DNS records and wait for verification, then retry.');
 *   } else {
 *     throw err;
 *   }
 * }
 * ```
 */
export class MissionInbox {
  /** Resources for the Transactional product. */
  readonly transactional: TransactionalNamespace;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeout: number;
  private readonly maxRetries: number;

  /**
   * Construct a new client.
   *
   * @param options - Client configuration. `apiKey` and `baseUrl` are required.
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

    this.transactional = {
      emails: new Emails(this),
      sendingIdentifiers: new SendingIdentifiers(this),
    };
  }

  /** @internal */
  async request<T>(req: InternalRequest): Promise<T> {
    const url = `${this.baseUrl}${req.path}`;
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
          return (text ? JSON.parse(text) : undefined) as T;
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
