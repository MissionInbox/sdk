import type { MissionInbox } from '../client.js';
import type {
  CreateSendingIdentifierParams,
  SendingIdentifier,
  UpdateSendingIdentifierParams,
} from '../types.js';

/**
 * The `sendingIdentifiers` resource. Access via `mi.sendingIdentifiers`.
 *
 * A sending identifier is a `From:` address that has been approved for use
 * on the account. It is not a mailbox — no inbox, no password, no IMAP.
 */
export class SendingIdentifiers {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /**
   * List every sending identifier registered on the authenticated account.
   *
   * @example
   * ```ts
   * const identifiers = await mi.sendingIdentifiers.list();
   * const usable = identifiers.filter((id) => id.canSend);
   * ```
   */
  async list(): Promise<SendingIdentifier[]> {
    return this.client.request<SendingIdentifier[]>({
      method: 'GET',
      path: '/api/sending-identifiers',
    });
  }

  /** Retrieve a single sending identifier by its UUID. */
  async get(id: string): Promise<SendingIdentifier> {
    return this.client.request<SendingIdentifier>({
      method: 'GET',
      path: `/api/sending-identifiers/${encodeURIComponent(id)}`,
    });
  }

  /**
   * Register a new sending identifier. The identifier's domain must already
   * exist on the account. On creation `canSend` is `false` until DNS +
   * verification complete.
   */
  async create(params: CreateSendingIdentifierParams): Promise<SendingIdentifier> {
    const body: { emailAddress: string; displayName?: string } = {
      emailAddress: params.emailAddress,
    };
    if (params.displayName !== undefined) body.displayName = params.displayName;

    return this.client.request<SendingIdentifier>({
      method: 'POST',
      path: '/api/sending-identifiers',
      body,
    });
  }

  /** Update the identifier's display name. Pass an empty string to clear it. */
  async update(id: string, params: UpdateSendingIdentifierParams): Promise<SendingIdentifier> {
    return this.client.request<SendingIdentifier>({
      method: 'PATCH',
      path: `/api/sending-identifiers/${encodeURIComponent(id)}`,
      body: params,
    });
  }

  /** Delete a sending identifier. Soft-deleted server-side; may be recreated later. */
  async delete(id: string): Promise<{ message: string }> {
    return this.client.request<{ message: string }>({
      method: 'DELETE',
      path: `/api/sending-identifiers/${encodeURIComponent(id)}`,
    });
  }
}
