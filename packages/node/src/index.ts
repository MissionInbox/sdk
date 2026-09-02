/**
 * The official MissionInbox SDK for Node.js and TypeScript.
 *
 * @example
 * ```ts
 * import { MissionInbox } from '@missioninbox/sdk';
 *
 * const mi = new MissionInbox({
 *   apiKey: process.env.MI_API_KEY!,
 *   baseUrl: process.env.MI_API_URL!,
 * });
 *
 * await mi.emails.send({
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
export type { MissionInboxOptions } from './client.js';

export { Emails } from './resources/emails.js';
export { EmailQueue } from './resources/email-queue.js';
export { Domains } from './resources/domains.js';
export { DomainRedirects } from './resources/domain-redirects.js';
export { SendingIdentifiers } from './resources/sending-identifiers.js';
export { Projects } from './resources/projects.js';
export { Analytics } from './resources/analytics.js';
export { Tasks } from './resources/tasks.js';
export { Health } from './resources/health.js';

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

// Type exports — all public request/response shapes
export type {
  ActivityGraph,
  ActivityGraphDataPoint,
  ActivityGraphParams,
  ActivityGraphSummary,
  AnalyticsCounter,
  AnalyticsGranularity,
  AnalyticsOverview,
  AssignDomainsToProjectParams,
  AssignDomainsToProjectResult,
  Attachment,
  BulkCreateDomainsParams,
  BulkCreateOrUpdateRedirectParams,
  BulkCreateOrUpdateRedirectResponse,
  BulkCreateOrUpdateRedirectResultItem,
  BulkDeleteDomainsParams,
  BulkDeleteRedirectParams,
  BulkMessageStatus,
  BulkPushDnsParams,
  BulkRedirectResponse,
  BulkRedirectResultItem,
  BulkRepushDnsParams,
  BulkSetupRedirectParams,
  BulkUpdateRedirectParams,
  BulkVerifyDomainsParams,
  CleanDnsResult,
  CreateDomainParams,
  CreateProjectParams,
  CreateSendingIdentifierParams,
  DeleteRedirectResult,
  DnsCheckDetail,
  DnsRecord,
  DnsRecordPushResult,
  DnsStatus,
  Domain,
  DomainAdminMailboxes,
  DomainDnsRecords,
  DomainRedirectInfo,
  DomainRedirectStatus,
  DomainStatistics,
  DomainVerificationResult,
  DomainVerificationState,
  EmailQueueStatus,
  HealthStatus,
  ListDomainsParams,
  ListEmailQueueParams,
  ListTasksParams,
  MessageDetails,
  MessageDetailsInclude,
  MessageSearchDirection,
  MessageSearchOrder,
  MessageSearchStatus,
  MessageStatus,
  MonthlyEmailStats,
  Paginated,
  Project,
  PushDnsResult,
  PushRedirectDnsResult,
  QueuedEmail,
  RawMessage,
  RedirectDnsConfig,
  RedirectEvent,
  RedirectEventsResult,
  RepushDnsResult,
  SearchEmailHit,
  SearchEmailsParams,
  SendCapStatus,
  SendEmailParams,
  SendEmailResult,
  SendingIdentifier,
  SendLimitStatus,
  SesVerificationStatus,
  SetupRedirectParams,
  SetupRedirectResult,
  Task,
  TaskCreateResponse,
  TaskList,
  TaskLogLevel,
  TaskOutput,
  TaskOutputs,
  TaskStatsSummary,
  TaskStatus,
  UpdateProjectParams,
  UpdateSendingIdentifierParams,
  VerifyRedirectDnsResult,
  WaitForTaskOptions,
} from './types.js';
export { TERMINAL_TASK_STATUSES } from './types.js';
