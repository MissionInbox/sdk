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
  /** Name shown to the recipient (e.g. `invoice.pdf`). */
  filename: string;
  /** MIME type of the attachment (e.g. `application/pdf`, `image/png`). */
  contentType: string;
  /** Base64-encoded contents of the file. */
  content: string;
}

/**
 * Parameters accepted by {@link Emails.send}.
 *
 * At least one recipient (`to`, `cc`, or `bcc`) and one body (`html` or `text`)
 * are required. The `from` must be a registered sending identifier — register
 * via {@link SendingIdentifiers.create} if you haven't yet.
 *
 * @example
 * ```ts
 * await mi.transactional.emails.send({
 *   from: 'notifications@acme.com',
 *   to: ['user@example.com'],
 *   subject: 'Welcome',
 *   html: '<p>Hello 👋</p>',
 *   text: 'Hello',
 *   tag: 'welcome',
 * });
 * ```
 */
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
  /** HTML body. Prefer providing both `html` and `text` for best deliverability. */
  html?: string;
  /** Plain-text body. */
  text?: string;
  /** `Reply-To:` address. Defaults to `from` when omitted. */
  replyTo?: string;
  /** `Sender:` header. Rarely needed — used when the `From:` address is different from the sending account. */
  sender?: string;
  /** Free-form label used to categorise messages in analytics. */
  tag?: string;
  /** Extra MIME headers to include on the outbound message. */
  headers?: Record<string, string>;
  /** Custom `Message-ID` header value. Omit to let the API generate one. */
  messageId?: string;
  /** Attachments to include. See {@link Attachment}. */
  attachments?: Attachment[];
}

/** Result of a successful send. */
export interface SendEmailResult {
  /** Unique identifier for the sent message. Use it to look up delivery status later. */
  id: string;
  /** Human-readable status message from the API (usually `"Email sent"`). */
  message: string;
  /** Machine-readable status (usually `"sent"`). */
  status: string;
  /** Server-side timestamp of the send, in milliseconds since the epoch. */
  time: number;
}

/**
 * Domain verification state for a sending identifier.
 *
 * - `dns_pending` — DNS records for the domain haven't been detected yet.
 * - `awaiting_ses` — DNS records are in place; awaiting confirmation from the MTA.
 * - `verified` — Fully verified; the identifier can send.
 * - `ses_failed` — MTA verification failed; check DNS and retry.
 */
export type DomainVerificationState = 'dns_pending' | 'awaiting_ses' | 'verified' | 'ses_failed';

/** A registered `From:` address on the account. */
export interface SendingIdentifier {
  /** UUID for the identifier. */
  id: string;
  /** The email address itself (e.g. `notifications@acme.com`). */
  emailAddress: string;
  /** Optional display name shown in the `From:` header. */
  displayName: string | null;
  /** The domain half of `emailAddress`, extracted for convenience. */
  domainName: string;
  /** Current verification state of the domain. Only `verified` identifiers can send. */
  domainVerificationState: DomainVerificationState;
  /** `true` when the identifier is ready to send from. */
  canSend: boolean;
  /** ISO-8601 timestamp of when the identifier was registered. */
  createdAt: string;
  /** ISO-8601 timestamp of the last change. */
  updatedAt: string;
}

/** Parameters accepted by {@link SendingIdentifiers.create}. */
export interface CreateSendingIdentifierParams {
  /** The address to register. Its domain must already be added to the account. */
  emailAddress: string;
  /** Optional friendly name shown in the `From:` header. */
  displayName?: string;
}
