/**
 * Body of a MissionInbox API error response, as returned by the server.
 *
 * @internal
 */
export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

/**
 * Base class for every error thrown by the MissionInbox SDK. Catch this to
 * handle any SDK-originated failure; catch a subclass to react to a specific
 * failure mode.
 *
 * @example
 * ```ts
 * import { MissionInbox, MissionInboxError } from '@missioninbox/sdk';
 *
 * try {
 *   await mi.transactional.emails.send({ ... });
 * } catch (err) {
 *   if (err instanceof MissionInboxError) {
 *     console.error('MissionInbox error', err.status, err.message);
 *   } else {
 *     throw err;
 *   }
 * }
 * ```
 */
export class MissionInboxError extends Error {
  /** HTTP status code from the failing response, or `0` for network errors. */
  readonly status: number;
  /** Parsed response body, when the server returned one. */
  readonly body: ApiErrorBody | undefined;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown on HTTP 401 — the API key is missing, malformed, or invalid. */
export class AuthenticationError extends MissionInboxError {}

/** Thrown on HTTP 403 when the failure doesn't match a more specific 403 subclass. */
export class PermissionError extends MissionInboxError {}

/** Thrown on HTTP 403 when the account's subscription is not active. */
export class SubscriptionInactiveError extends PermissionError {}

/** Thrown on HTTP 403 when the `from` address hasn't been registered as a sending identifier. */
export class UnregisteredSenderError extends PermissionError {}

/** Thrown on HTTP 403 when the sending identifier's domain has not completed DNS/MTA verification. */
export class UnverifiedDomainError extends PermissionError {}

/** Thrown on HTTP 403 when the domain has been disabled for sending (e.g. listed on a blacklist). */
export class DomainBlacklistedError extends PermissionError {}

/** Thrown on HTTP 403 when the plan's daily or monthly send cap has been reached. */
export class SendLimitExceededError extends PermissionError {}

/** Thrown on HTTP 400 — request body failed validation (missing recipient, missing body, etc). */
export class ValidationError extends MissionInboxError {}

/** Thrown on HTTP 409 — resource already exists (e.g. sending identifier already registered). */
export class ConflictError extends MissionInboxError {}

/** Thrown on HTTP 422 — the MTA rejected the message. */
export class SendError extends MissionInboxError {}

/** Thrown on HTTP 429 — too many requests. */
export class RateLimitError extends MissionInboxError {}

/** Thrown on HTTP 404 — resource not found. */
export class NotFoundError extends MissionInboxError {}

/** Thrown on HTTP 5xx after retries have been exhausted. */
export class ServerError extends MissionInboxError {}

/**
 * Thrown when the request itself failed at the transport layer (DNS,
 * connection reset, timeout, aborted). `status` is `0`.
 */
export class NetworkError extends MissionInboxError {
  constructor(message: string, cause?: unknown) {
    super(message, 0);
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

function bodyMessage(body: ApiErrorBody | undefined): string {
  const m = body?.message;
  if (Array.isArray(m)) return m.join('; ');
  if (typeof m === 'string') return m;
  return '';
}

/** @internal */
export function errorFromResponse(status: number, body: ApiErrorBody | undefined): MissionInboxError {
  const msg = bodyMessage(body) || `HTTP ${status}`;
  const lower = msg.toLowerCase();

  if (status === 401) return new AuthenticationError(msg, status, body);
  if (status === 403) {
    if (lower.includes('is not a registered sending identifier')) return new UnregisteredSenderError(msg, status, body);
    if (lower.includes('not verified for sending')) return new UnverifiedDomainError(msg, status, body);
    if (lower.includes('subscription is not active')) return new SubscriptionInactiveError(msg, status, body);
    if (lower.includes('send limit')) return new SendLimitExceededError(msg, status, body);
    if (lower.includes('disabled for sending') || lower.includes('listed on')) return new DomainBlacklistedError(msg, status, body);
    return new PermissionError(msg, status, body);
  }
  if (status === 404) return new NotFoundError(msg, status, body);
  if (status === 409) return new ConflictError(msg, status, body);
  if (status === 422) return new SendError(msg, status, body);
  if (status === 429) return new RateLimitError(msg, status, body);
  if (status >= 500) return new ServerError(msg, status, body);
  if (status >= 400) return new ValidationError(msg, status, body);

  return new MissionInboxError(msg, status, body);
}
