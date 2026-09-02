import type { MissionInbox } from '../client.js';
import type { SendEmailParams, SendEmailResult } from '../types.js';

interface WirePayload {
  from: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  html_body?: string;
  plain_body?: string;
  reply_to: string;
  sender?: string;
  tag?: string;
  headers?: Record<string, string>;
  message_id?: string;
  attachments?: Array<{ name: string; content_type: string; data: string }>;
}

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * The `emails` resource under {@link MissionInbox.transactional}.
 *
 * You should not construct this class directly — access it via
 * `mi.transactional.emails`.
 */
export class Emails {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /**
   * Send a transactional email.
   *
   * At least one recipient (`to`, `cc`, or `bcc`) and one body (`html` or
   * `text`) are required. The `from` must be a registered sending identifier
   * (see {@link SendingIdentifiers.create}) whose domain has completed
   * verification.
   *
   * @param params - The message to send. See {@link SendEmailParams}.
   * @returns The message id and server-side status.
   * @throws {AuthenticationError} on invalid or missing API key.
   * @throws {UnregisteredSenderError} when `from` isn't a registered identifier.
   * @throws {UnverifiedDomainError} when the identifier's domain isn't verified.
   * @throws {SubscriptionInactiveError} when the account's subscription is inactive.
   * @throws {SendLimitExceededError} when the plan's daily/monthly cap is reached.
   * @throws {ValidationError} when the payload fails server-side validation.
   * @throws {SendError} when the MTA rejects the message.
   *
   * @example Minimal
   * ```ts
   * await mi.transactional.emails.send({
   *   from: 'notifications@acme.com',
   *   to: 'user@example.com',
   *   subject: 'Welcome',
   *   text: 'Hi there',
   * });
   * ```
   *
   * @example With HTML, multiple recipients, and a tag
   * ```ts
   * await mi.transactional.emails.send({
   *   from: 'notifications@acme.com',
   *   to: ['a@example.com', 'b@example.com'],
   *   cc: 'c@example.com',
   *   replyTo: 'support@acme.com',
   *   subject: 'Your monthly digest',
   *   html: '<h1>Hello</h1><p>Highlights…</p>',
   *   text: 'Hello — Highlights…',
   *   tag: 'monthly-digest',
   * });
   * ```
   *
   * @example With an attachment
   * ```ts
   * import { readFileSync } from 'node:fs';
   *
   * await mi.transactional.emails.send({
   *   from: 'billing@acme.com',
   *   to: 'user@example.com',
   *   subject: 'Your invoice',
   *   html: '<p>See attached.</p>',
   *   attachments: [{
   *     filename: 'invoice.pdf',
   *     contentType: 'application/pdf',
   *     content: readFileSync('/tmp/invoice.pdf').toString('base64'),
   *   }],
   * });
   * ```
   */
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const payload: WirePayload = {
      from: params.from,
      reply_to: params.replyTo ?? params.from,
    };

    if (params.to !== undefined) payload.to = toArray(params.to);
    if (params.cc !== undefined) payload.cc = toArray(params.cc);
    if (params.bcc !== undefined) payload.bcc = toArray(params.bcc);
    if (params.subject !== undefined) payload.subject = params.subject;
    if (params.html !== undefined) payload.html_body = params.html;
    if (params.text !== undefined) payload.plain_body = params.text;
    if (params.sender !== undefined) payload.sender = params.sender;
    if (params.tag !== undefined) payload.tag = params.tag;
    if (params.headers !== undefined) payload.headers = params.headers;
    if (params.messageId !== undefined) payload.message_id = params.messageId;

    if (params.attachments && params.attachments.length > 0) {
      payload.attachments = params.attachments.map((a) => ({
        name: a.filename,
        content_type: a.contentType,
        data: a.content,
      }));
    }

    return this.client.request<SendEmailResult>({
      method: 'POST',
      path: '/api/email/send',
      body: payload,
    });
  }
}
