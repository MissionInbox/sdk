import type { MissionInbox } from '../client.js';
import type {
  BulkMessageStatus,
  MessageDetails,
  MessageDetailsInclude,
  MessageStatus,
  Paginated,
  RawMessage,
  SearchEmailHit,
  SearchEmailsParams,
  SendCapStatus,
  SendEmailParams,
  SendEmailResult,
  SendLimitStatus,
} from '../types.js';

interface SendWirePayload {
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
 * The `emails` resource. Access via `mi.emails`.
 */
export class Emails {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /**
   * Send a transactional email.
   *
   * @example
   * ```ts
   * await mi.emails.send({
   *   from: 'notifications@acme.com',
   *   to: 'user@example.com',
   *   subject: 'Welcome',
   *   html: '<p>Hi</p>',
   * });
   * ```
   */
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const payload: SendWirePayload = {
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

  /**
   * Look up the delivery status of a single message.
   *
   * @param messageId - The id returned from {@link Emails.send}.
   *
   * @example
   * ```ts
   * const status = await mi.emails.getStatus('msg_abc123');
   * if (status.bounce) console.log('bounced:', status.status);
   * ```
   */
  async getStatus(messageId: string): Promise<MessageStatus> {
    return this.client.request<MessageStatus>({
      method: 'POST',
      path: '/api/email/status',
      body: { messageId },
    });
  }

  /**
   * Look up delivery status for many messages in one request. Entries in the
   * `statuses` array align by index with the input `messageIds`. `null` entries
   * mean the id was not found.
   */
  async getBulkStatus(messageIds: string[]): Promise<BulkMessageStatus> {
    return this.client.request<BulkMessageStatus>({
      method: 'POST',
      path: '/api/email/bulk_status',
      body: { messageIds },
    });
  }

  /**
   * Fetch full details of a message. Use `include` to opt into extra sections
   * (headers, body content, attachments, activity, spam checks) — omitting it
   * returns just the top-level properties.
   *
   * @example
   * ```ts
   * const details = await mi.emails.getDetails('msg_abc123', ['content', 'activity']);
   * console.log(details.message.content?.html_body);
   * ```
   */
  async getDetails(messageId: string, include?: MessageDetailsInclude[]): Promise<MessageDetails> {
    const body: { id: string; include?: string } = { id: messageId };
    if (include && include.length > 0) body.include = include.join(',');
    return this.client.request<MessageDetails>({
      method: 'POST',
      path: '/api/email/details',
      body,
    });
  }

  /**
   * Retrieve the raw RFC-822 source of a message. Useful for debugging DKIM
   * signatures or attachments.
   */
  async getRaw(messageId: string): Promise<RawMessage> {
    return this.client.request<RawMessage>({
      method: 'POST',
      path: '/api/email/raw',
      body: { id: messageId },
    });
  }

  /**
   * Search sent/received messages. Supports partial-match filters on `from` /
   * `to`, exact match on `sendingIdentifierId`, and free-text `keyword`.
   *
   * @example
   * ```ts
   * const { data } = await mi.emails.search({
   *   from: 'notifications@',
   *   status: 'Sent',
   *   limit: 50,
   * });
   * ```
   */
  async search(params: SearchEmailsParams = {}): Promise<Paginated<SearchEmailHit>> {
    const body: Record<string, unknown> = {};
    if (params.from !== undefined) body.from = params.from;
    if (params.sendingIdentifierId !== undefined) body.sending_identifier_id = params.sendingIdentifierId;
    if (params.to !== undefined) body.to = params.to;
    if (params.messageId !== undefined) body.message_id = params.messageId;
    if (params.status !== undefined) body.status = params.status;
    if (params.direction !== undefined) body.direction = params.direction;
    if (params.keyword !== undefined) body.keyword = params.keyword;
    if (params.page !== undefined) body.page = params.page;
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.order !== undefined) body.order = params.order;

    return this.client.request<Paginated<SearchEmailHit>>({
      method: 'POST',
      path: '/api/email/search',
      body,
    });
  }

  /**
   * Report the account's current send-limit state. Only the Free plan has
   * enforced caps; paid plans return `{ limited: false }`.
   */
  async getSendLimit(): Promise<SendLimitStatus> {
    return this.client.request<SendLimitStatus>({
      method: 'GET',
      path: '/api/email/send-limit-status',
    });
  }
}

// Re-exported for legibility elsewhere in the SDK.
export type { SendCapStatus };
