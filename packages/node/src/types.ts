// Types match the API's wire format. Fields returned as snake_case (e.g., message
// details / status) stay snake_case; fields returned as camelCase (e.g., domains,
// projects, sending identifiers) stay camelCase. SDK inputs are camelCase where
// convenient and mapped to snake_case at the wire boundary (e.g., `SendEmailParams`).

/* ------------------------------------------------------------------------- */
/* Emails                                                                    */
/* ------------------------------------------------------------------------- */

/**
 * A single attachment to include with a transactional email.
 *
 * @example
 * ```ts
 * import { readFileSync } from 'node:fs';
 *
 * const attachment: Attachment = {
 *   filename: 'invoice.pdf',
 *   contentType: 'application/pdf',
 *   content: readFileSync('/tmp/invoice.pdf').toString('base64'),
 * };
 * ```
 */
export interface Attachment {
  /** Name shown to the recipient. */
  filename: string;
  /** MIME type (e.g. `application/pdf`, `image/png`). */
  contentType: string;
  /** Base64-encoded contents. */
  content: string;
}

/** Parameters accepted by {@link Emails.send}. */
export interface SendEmailParams {
  /** The `From:` address. Must be a registered sending identifier for the account. */
  from: string;
  /** Recipient address, or list of addresses. */
  to?: string | string[];
  /** Cc address, or list of addresses. */
  cc?: string | string[];
  /** Bcc address, or list of addresses. */
  bcc?: string | string[];
  /** Subject line. */
  subject?: string;
  /** HTML body. Prefer both `html` and `text` for best deliverability. */
  html?: string;
  /** Plain-text body. */
  text?: string;
  /** `Reply-To:` address. Defaults to `from`. */
  replyTo?: string;
  /** `Sender:` header. Rare — used when `From:` differs from the sending account. */
  sender?: string;
  /** Free-form label used to categorise messages in analytics. */
  tag?: string;
  /** Extra MIME headers to include on the outbound message. */
  headers?: Record<string, string>;
  /** Custom `Message-ID` header value. */
  messageId?: string;
  /** Attachments to include. */
  attachments?: Attachment[];
}

/** Result of a successful send. */
export interface SendEmailResult {
  /** Unique identifier for the sent message. */
  id: string;
  /** Human-readable status (usually `"Email sent"`). */
  message: string;
  /** Machine-readable status (usually `"sent"`). */
  status: string;
  /** Server timestamp in ms since the epoch. */
  time: number;
}

/** Status of a single message. Fields match the API wire format (snake_case). */
export interface MessageStatus {
  id: string;
  token: string;
  status: string;
  last_delivery_attempt: number;
  held: boolean;
  rcpt_to: string;
  mail_from: string;
  subject: string;
  timestamp: number;
  direction: string;
  size: number;
  bounce: boolean;
  bounce_for_id?: string;
  tag?: string;
}

/** Result of a bulk status lookup. `null` entries mean the id was not found. */
export interface BulkMessageStatus {
  statuses: Array<MessageStatus | null>;
}

/** Extra sections to include in a message-details response. */
export type MessageDetailsInclude =
  | 'properties'
  | 'activity'
  | 'headers'
  | 'spam_checks'
  | 'content'
  | 'attachments';

/** Full details of a sent/received message. Fields on the wire are snake_case. */
export interface MessageDetails {
  message: {
    id: number;
    token: string;
    properties?: {
      status: string;
      subject: string;
      from: string;
      to: string;
      message_id: string;
      timestamp: number;
      direction: 'incoming' | 'outgoing';
      size: number;
      spam_status?: string;
      spam_score?: number;
      tag?: string;
      bounce: boolean;
      bounce_for_id?: number | null;
      threat?: string | null;
      threat_details?: string | null;
      received_with_ssl: boolean;
      raw_message_available: boolean;
      held: boolean;
      hold_expiry?: number | null;
      last_delivery_attempt?: number;
      route?: { id: number; name: string };
      domain?: { id: number; name: string };
      credential?: { id: number; name: string };
    };
    activity?: {
      deliveries: Array<{
        id: number;
        status: string;
        details: string;
        output?: string;
        sent_with_ssl: boolean;
        log_id?: string;
        time: number;
        timestamp: number;
      }>;
      clicks: Array<{ url: string; ip_address: string; user_agent?: string; timestamp: number }>;
      loads: Array<{ ip_address: string; user_agent?: string; timestamp: number }>;
    };
    headers?: Record<string, string[]>;
    spam_checks?: Array<{ name: string; score: number; result: string; details?: string }>;
    content?: { plain_body?: string; html_body?: string; html_body_without_tracking?: string };
    attachments?: Array<{
      index: number;
      filename: string;
      content_type: string;
      size: number;
      hash?: string;
      download_url: string;
    }>;
  };
}

/** Raw RFC 822 message payload. */
export interface RawMessage {
  status: 'success' | 'error';
  error?: string;
  raw_data?: string;
  id?: string;
}

export type MessageSearchStatus = 'Pending' | 'Sent' | 'SoftFail' | 'HardFail' | 'Held' | 'Bounced' | 'HoldCancelled';
export type MessageSearchDirection = 'all' | 'incoming' | 'outgoing';
export type MessageSearchOrder = 'oldest-first' | 'newest-first';

/** Search filters for {@link Emails.search}. */
export interface SearchEmailsParams {
  from?: string;
  sendingIdentifierId?: string;
  to?: string;
  messageId?: string;
  status?: MessageSearchStatus;
  direction?: MessageSearchDirection;
  keyword?: string;
  page?: number;
  limit?: number;
  order?: MessageSearchOrder;
}

/** A single hit in a search result. */
export interface SearchEmailHit {
  id: number;
  token: string;
  sending_identifier_id?: string | null;
  message_id: string;
  status: MessageSearchStatus;
  from: string;
  to: string;
  subject: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  size: number;
  held: boolean;
  hold_expiry?: number | null;
  tag?: string;
}

/** Generic paginated response used across list-style endpoints. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Response of {@link Emails.getSendLimit}. */
export interface SendLimitStatus {
  limited: boolean;
  daily?: SendCapStatus | null;
  monthly?: SendCapStatus | null;
}

export interface SendCapStatus {
  limit: number;
  sent: number;
  remaining: number;
  limitReached: boolean;
  resetsAt: string;
}

/* ------------------------------------------------------------------------- */
/* Email queue                                                               */
/* ------------------------------------------------------------------------- */

export type EmailQueueStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'retrying';

/** Query filters for {@link EmailQueue.list}. */
export interface ListEmailQueueParams {
  status?: EmailQueueStatus;
  sendingAccountId?: string;
  page?: number;
  limit?: number;
}

export interface QueuedEmail {
  id: string;
  organizationId: string;
  sendingAccountId: string;
  status: EmailQueueStatus;
  emailPayload: unknown;
  messageId?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  lastHttpStatus?: number;
  nextRetryAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  createdByEmail?: string;
}

/* ------------------------------------------------------------------------- */
/* Domains                                                                   */
/* ------------------------------------------------------------------------- */

export type DomainVerificationState = 'dns_pending' | 'awaiting_ses' | 'verified' | 'ses_failed';
export type DnsStatus = 'OK' | 'Invalid' | 'Missing' | 'ERROR' | 'pending';
export type SesVerificationStatus = 'NOT_STARTED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'TEMPORARY_FAILURE';

export interface DomainRedirectInfo {
  id: string;
  mrRedirectId?: string;
  source: string;
  redirectUrl: string;
  type: string;
  statusCode: number;
  enabled: boolean;
  forceHttps: boolean;
  forwardPath: boolean;
  forwardQuery: boolean;
  dnsPushed: boolean;
  dnsStatus?: string;
  domainProvider?: string | null;
  hits?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  id: string;
  domainName: string;
  verified: boolean;
  verificationState: DomainVerificationState;
  verificationMessage: string;
  sesVerificationStatus?: SesVerificationStatus | null;
  sesVerificationCheckedAt?: string | null;
  spfStatus: DnsStatus | null;
  dkimStatus: DnsStatus | null;
  returnPathStatus: DnsStatus | null;
  mxStatus?: DnsStatus | null;
  dmarcStatus?: DnsStatus | null;
  projectId?: string;
  projectName?: string;
  redirect?: DomainRedirectInfo;
  warmupStartDate?: string;
  warmedDays?: number;
  totalWarmedDays?: number;
  isWarmupActive?: boolean;
  emailSent?: number;
  mailboxCount?: number;
  createdAt?: string;
  updatedAt?: string;
  customMxEnabled?: boolean;
  messagesToday?: number;
  messagesMonth?: number;
  blacklistProviders?: string[];
  blacklistProvider?: string | null;
  blacklistCheckedAt?: string | null;
  blacklistedAt?: string | null;
  delistedBy?: string | null;
  delistedAt?: string | null;
}

export interface DomainStatistics {
  totalDomains: number;
  verifiedDomains: number;
  warmupRunningDomains: number;
  redirectionConfiguredDomains: number;
}

/** Filters for {@link Domains.list}. */
export interface ListDomainsParams {
  page?: number;
  limit?: number;
  projectId?: string;
  verified?: boolean;
  search?: string;
  redirection?: string;
  isWarmupActive?: boolean;
  warmedDays?: number;
  createdFrom?: string;
  createdTo?: string;
  orderBy?: 'name' | 'createdAt' | 'updatedAt' | 'numberOfMailboxes';
  orderDirection?: 'ASC' | 'DESC';
  customMxEnabled?: boolean;
  blacklisted?: boolean;
  includeStats?: boolean;
}

export interface CreateDomainParams {
  domainName: string;
  projectId?: string;
  redirectUrl?: string;
}

export interface BulkCreateDomainsParams {
  domains: Array<{
    domainName: string;
    projectName?: string;
    redirectUrl?: string;
  }>;
}

export interface BulkDeleteDomainsParams {
  domainNames: string[];
}

export interface BulkVerifyDomainsParams {
  domainNames: string[];
}

export interface BulkPushDnsParams {
  domainNames: string[];
}

export interface BulkRepushDnsParams {
  domainNames: string[];
}

export interface DnsCheckDetail {
  status: 'OK' | 'Invalid' | 'Missing' | 'ERROR';
  error?: string | null;
}

export interface DomainVerificationResult {
  message: string;
  dnsVerificationString?: string;
  dnsChecks: {
    spf?: DnsCheckDetail;
    dkim: DnsCheckDetail;
    return_path?: DnsCheckDetail;
    mx?: DnsCheckDetail;
    dmarc?: DnsCheckDetail;
  };
  code?: string;
  fullyVerified: boolean;
  verificationState?: DomainVerificationState;
  sesVerificationStatus?: SesVerificationStatus | null;
  sesVerificationCheckedAt?: string | null;
}

export interface DnsRecord {
  type: string;
  name: string;
  shortName?: string;
  value: string;
  priority?: number;
  purpose: 'spf' | 'dkim' | 'return_path' | 'mx' | 'dmarc';
}

export interface DnsRecordPushResult {
  record: DnsRecord;
  success: boolean;
  error?: string;
}

export interface PushDnsResult {
  domainName: string;
  message: string;
  dnsRecords: DnsRecord[];
  results?: DnsRecordPushResult[];
}

export interface RepushDnsResult {
  domainName: string;
  customDmarcApplied: boolean;
  dmarcRecord: string;
  inboundRouteRecreated: boolean;
  hasDnsManager: boolean;
  emailDns?: {
    pushed: boolean;
    successCount?: number;
    failureCount?: number;
    error?: string;
  };
}

export interface CleanDnsResult {
  domainName: string;
  provider: string;
  message: string;
  deletedCount: number;
  results: Array<{ name: string; type: string; deleted: boolean; error?: string }>;
}

export interface DomainDnsRecords {
  id: string;
  name: string;
  projectId?: string;
  projectName?: string;
  spfStatus: string;
  dkimStatus: string;
  dkimS1Status?: string;
  dkimS1Error?: string | null;
  dkimS2Status?: string;
  dkimS2Error?: string | null;
  rpStatus: string;
  mxStatus: string;
  dmarcStatus: string;
  verificationState: DomainVerificationState;
  verificationMessage: string;
  sesVerificationStatus?: SesVerificationStatus | null;
  sesVerificationCheckedAt?: string | null;
  warmupStartDate?: string;
  warmedDays: number;
  totalWarmedDays: number;
  isWarmupActive: boolean;
  redirect?: DomainRedirectInfo;
  createdAt?: string;
  updatedAt?: string;
  customMxEnabled?: boolean;
  blacklistProviders?: string[];
  blacklistProvider?: string | null;
  dnsRecords: DnsRecord[];
  platformRecords: DnsRecord[];
}

export interface DomainAdminMailboxes {
  domainName: string;
  password: string | null;
  mailboxes: Array<{ email: string; role: string }>;
}

/** Response returned by endpoints that dispatch a background task. */
export interface TaskCreateResponse {
  taskId: string;
  message: string;
}

/* ------------------------------------------------------------------------- */
/* Domain redirects (sub-resource)                                           */
/* ------------------------------------------------------------------------- */

export interface RedirectDnsConfig {
  ipAddress: string;
  cnameTarget: string;
}

export interface DomainRedirectStatus {
  success: boolean;
  hasRedirect: boolean;
  redirect?: {
    id: string;
    mrRedirectId: string;
    source: string;
    redirectUrl: string;
    dnsPushed: boolean;
    dnsStatus: string;
    domainProvider: string | null;
    hits: number;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
}

export interface SetupRedirectParams {
  redirectUrl: string;
  enabled?: boolean;
  forceHttps?: boolean;
}

export interface SetupRedirectResult {
  success: boolean;
  action: 'created' | 'updated' | 'unchanged';
  id: string;
  mrRedirectId: string;
  redirectUrl: string;
  dnsPushed: boolean;
  dnsStatus: string;
  message: string;
}

export interface PushRedirectDnsResult {
  success: boolean;
  message: string;
  dnsPushed: boolean;
}

export interface VerifyRedirectDnsResult {
  success: boolean;
  domainName: string;
  redirectId: string;
  mrRedirectId: string;
  dnsPushedByUs: boolean;
  dnsStatus: string;
  message: string;
}

export interface RedirectEvent {
  id: string;
  action: 'create' | 'update' | 'delete' | 'dns_push' | 'dns_check' | 'verify';
  status: 'success' | 'failed' | 'pending';
  mrRedirectId?: string;
  redirectUrl?: string;
  dnsVerified?: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  performedByUserId?: string;
  createdAt: string;
}

export interface RedirectEventsResult {
  success: boolean;
  domainName: string;
  redirectId: string;
  totalEvents: number;
  events: RedirectEvent[];
}

export interface DeleteRedirectResult {
  success: boolean;
  message: string;
}

export interface BulkRedirectResultItem {
  domainName: string;
  success: boolean;
  action?: 'created' | 'updated' | 'deleted' | 'skipped';
  redirect?: Record<string, unknown>;
  error?: string;
}

export interface BulkRedirectResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: BulkRedirectResultItem[];
}

export interface BulkSetupRedirectParams {
  redirects: Array<{
    domainName: string;
    redirectUrl: string;
    enabled?: boolean;
    forceHttps?: boolean;
  }>;
}

export interface BulkUpdateRedirectParams {
  updates: Array<{
    domainName: string;
    destination?: string;
    enabled?: boolean;
    tags?: string;
  }>;
}

export interface BulkDeleteRedirectParams {
  domainNames: string[];
}

export interface BulkCreateOrUpdateRedirectParams {
  redirects: Array<{
    domainName: string;
    redirectUrl: string;
    enabled?: boolean;
    forceHttps?: boolean;
  }>;
}

export interface BulkCreateOrUpdateRedirectResultItem {
  domainName: string;
  success: boolean;
  action?: 'created' | 'updated' | 'skipped';
  message?: string;
  redirect?: Record<string, unknown>;
  error?: string;
}

export interface BulkCreateOrUpdateRedirectResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: BulkCreateOrUpdateRedirectResultItem[];
}

/* ------------------------------------------------------------------------- */
/* Sending identifiers                                                       */
/* ------------------------------------------------------------------------- */

export interface SendingIdentifier {
  id: string;
  emailAddress: string;
  displayName: string | null;
  domainName: string;
  domainVerificationState: DomainVerificationState;
  canSend: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSendingIdentifierParams {
  emailAddress: string;
  displayName?: string;
}

export interface UpdateSendingIdentifierParams {
  /** Empty string clears the display name. */
  displayName?: string;
}

/* ------------------------------------------------------------------------- */
/* Projects                                                                  */
/* ------------------------------------------------------------------------- */

export interface Project {
  id: string;
  name: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  domainsCount: number;
  mailboxesCount: number;
}

export interface CreateProjectParams {
  name: string;
}

export interface UpdateProjectParams {
  name?: string;
}

export interface AssignDomainsToProjectParams {
  domainNames: string[];
}

export interface AssignDomainsToProjectResult {
  project: Project;
  total: number;
  successful: number;
  failed: number;
  reassigned: number;
  results: Array<{
    domainName: string;
    success: boolean;
    error?: string;
    previousProjectId?: string;
    previousProjectName?: string;
  }>;
}

/* ------------------------------------------------------------------------- */
/* Analytics                                                                 */
/* ------------------------------------------------------------------------- */

export interface MonthlyEmailStats {
  emailsSent: number;
  available: boolean;
}

export interface AnalyticsOverview {
  currentMonth: MonthlyEmailStats;
  lastMonth: MonthlyEmailStats;
  domains: number;
  unverifiedDomains: number;
  mailboxes: number;
  inactiveMailboxes: number;
  warmingMailboxes: number;
  warmedMailboxes: number;
}

export type AnalyticsGranularity = 'hourly' | 'daily' | 'monthly' | 'yearly';
export type AnalyticsCounter = 'incoming' | 'outgoing' | 'bounces' | 'spam' | 'held';

export interface ActivityGraphParams {
  granularity: AnalyticsGranularity;
  startDate: string;
  endDate: string;
  counters?: AnalyticsCounter[];
}

export interface ActivityGraphDataPoint {
  timestamp: string;
  incoming?: number;
  outgoing?: number;
  bounces?: number;
  spam?: number;
  held?: number;
}

export interface ActivityGraphSummary {
  totalIncoming?: number;
  totalOutgoing?: number;
  totalBounces?: number;
  totalSpam?: number;
  totalHeld?: number;
}

export interface ActivityGraph {
  startDate: string;
  endDate: string;
  granularity: AnalyticsGranularity;
  dataPoints: ActivityGraphDataPoint[];
  summary: ActivityGraphSummary;
}

/* ------------------------------------------------------------------------- */
/* Tasks                                                                     */
/* ------------------------------------------------------------------------- */

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type TaskLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/** Terminal states reached by {@link Tasks.waitFor}. */
export const TERMINAL_TASK_STATUSES: readonly TaskStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number;
  payload?: unknown;
  result?: unknown;
  errors?: string[];
  processingStartedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListTasksParams {
  type?: string;
  status?: TaskStatus;
  page?: number;
  limit?: number;
}

export interface TaskList {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskOutput {
  id: string;
  taskId: string;
  subName?: string;
  level: TaskLogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TaskOutputs {
  outputs: TaskOutput[];
}

export interface TaskStatsSummary {
  totalTasks: number;
  pendingTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
}

/** Options for {@link Tasks.waitFor}. */
export interface WaitForTaskOptions {
  /** Milliseconds between polls. @defaultValue 2000 */
  pollInterval?: number;
  /** Give up after this many milliseconds. @defaultValue 300000 (5 min) */
  timeout?: number;
  /** Called with each poll result (useful for progress UIs). */
  onProgress?: (task: Task) => void;
}

/* ------------------------------------------------------------------------- */
/* Health                                                                    */
/* ------------------------------------------------------------------------- */

/** Response from {@link Health.check} — usually the string `"Healthy"`. */
export type HealthStatus = string;
