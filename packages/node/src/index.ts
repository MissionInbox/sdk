/**
 * The official MissionInbox SDK for Node.js and TypeScript.
 *
 * @example
 * ```ts
 * import { MissionInbox } from 'missioninbox';
 *
 * const mi = new MissionInbox({
 *   apiKey: process.env.MI_API_KEY!,
 *   baseUrl: process.env.MI_API_URL!,
 * });
 *
 * await mi.transactional.emails.send({
 *   from: 'notifications@acme.com',
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<p>Hi 👋</p>',
 * });
 * ```
 *
 * @packageDocumentation
 */

export { MissionInbox } from './client.js';
export type { MissionInboxOptions, TransactionalNamespace } from './client.js';
export type {
  Attachment,
  CreateSendingIdentifierParams,
  DomainVerificationState,
  SendEmailParams,
  SendEmailResult,
  SendingIdentifier,
} from './types.js';
export {
  MissionInboxError,
  AuthenticationError,
  PermissionError,
  SubscriptionInactiveError,
  UnregisteredSenderError,
  UnverifiedDomainError,
  DomainBlacklistedError,
  SendLimitExceededError,
  ValidationError,
  ConflictError,
  SendError,
  RateLimitError,
  NotFoundError,
  ServerError,
  NetworkError,
} from './errors.js';
export { VERSION } from './version.js';
