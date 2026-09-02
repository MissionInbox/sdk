import type { MissionInbox } from '../client.js';
import type { CreateSendingIdentifierParams, SendingIdentifier } from '../types.js';

/**
 * The `sendingIdentifiers` resource under {@link MissionInbox.transactional}.
 *
 * A sending identifier is a `From:` address that has been approved for use
 * on the account. It is not a mailbox — there is no inbox, no password, and
 * no IMAP. Registering an identifier only records the authorisation to send
 * as that address.
 *
 * You should not construct this class directly — access it via
 * `mi.transactional.sendingIdentifiers`.
 */
export class SendingIdentifiers {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /**
   * List every sending identifier registered on the authenticated account.
   *
   * @returns All identifiers on the account, including ones that are not yet
   * verified (`canSend: false`).
   *
   * @example
   * ```ts
   * const identifiers = await mi.transactional.sendingIdentifiers.list();
   * const usable = identifiers.filter((id) => id.canSend);
   * ```
   */
  async list(): Promise<SendingIdentifier[]> {
    return this.client.request<SendingIdentifier[]>({
      method: 'GET',
      path: '/api/sending-identifiers',
    });
  }

  /**
   * Register a new sending identifier.
   *
   * The identifier's domain must already exist on the account. On creation,
   * the identifier is not yet usable: `canSend` will be `false` until the
   * domain's DNS records have been published and confirmed by the MTA.
   *
   * @param params - The address to register. See {@link CreateSendingIdentifierParams}.
   * @returns The newly registered identifier, with its current verification state.
   * @throws {ConflictError} when the address is already registered on the account.
   * @throws {PermissionError} when the domain is not registered to the account.
   *
   * @example
   * ```ts
   * const identifier = await mi.transactional.sendingIdentifiers.create({
   *   emailAddress: 'notifications@acme.com',
   *   displayName: 'Acme Notifications',
   * });
   *
   * if (!identifier.canSend) {
   *   console.log(`Waiting on verification: ${identifier.domainVerificationState}`);
   * }
   * ```
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
}
