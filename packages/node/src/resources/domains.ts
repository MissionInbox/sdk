import type { MissionInbox } from '../client.js';
import type {
  BulkCreateDomainsParams,
  BulkDeleteDomainsParams,
  BulkPushDnsParams,
  BulkRepushDnsParams,
  BulkVerifyDomainsParams,
  CleanDnsResult,
  CreateDomainParams,
  Domain,
  DomainAdminMailboxes,
  DomainDnsRecords,
  DomainStatistics,
  DomainVerificationResult,
  ListDomainsParams,
  Paginated,
  PushDnsResult,
  RepushDnsResult,
  TaskCreateResponse,
} from '../types.js';
import { DomainRedirects } from './domain-redirects.js';

/**
 * The `domains` resource. Access via `mi.domains`.
 *
 * A domain must be registered on the account before you can create sending
 * identifiers for it or send from any address ending in it. Registration
 * publishes DKIM/SPF/DMARC/return-path DNS records that the API then
 * verifies. Bulk operations return a task id — poll via {@link Tasks.waitFor}.
 */
export class Domains {
  /** Nested redirect management. */
  readonly redirects: DomainRedirects;

  /** @internal */
  constructor(private readonly client: MissionInbox) {
    this.redirects = new DomainRedirects(client);
  }

  /**
   * List domains registered on the account, with filters.
   *
   * @example
   * ```ts
   * const { data } = await mi.domains.list({ verified: true, limit: 100 });
   * ```
   */
  async list(params: ListDomainsParams = {}): Promise<Paginated<Domain>> {
    return this.client.request<Paginated<Domain>>({
      method: 'GET',
      path: '/api/domains',
      query: { ...params },
    });
  }

  /** Retrieve a domain by its UUID. */
  async get(id: string): Promise<Domain> {
    return this.client.request<Domain>({
      method: 'GET',
      path: `/api/domains/by-id/${encodeURIComponent(id)}`,
    });
  }

  /** Retrieve a domain by its name — also returns published DNS records. */
  async getByName(domainName: string): Promise<DomainDnsRecords> {
    return this.client.request<DomainDnsRecords>({
      method: 'GET',
      path: `/api/domains/${encodeURIComponent(domainName)}`,
    });
  }

  /** Account-wide domain statistics (counts). */
  async getStatistics(): Promise<DomainStatistics> {
    return this.client.request<DomainStatistics>({
      method: 'GET',
      path: '/api/domains/statistic',
    });
  }

  /** Export the domain list as CSV. Accepts the same filters as {@link Domains.list}. */
  async exportCsv(params: ListDomainsParams = {}): Promise<string> {
    return this.client.request<string>({
      method: 'GET',
      path: '/api/domains/export',
      query: { ...params },
    });
  }

  /** List the admin/postmaster/abuse mailboxes provisioned for a domain. */
  async getAdminMailboxes(domainName: string): Promise<DomainAdminMailboxes> {
    return this.client.request<DomainAdminMailboxes>({
      method: 'GET',
      path: `/api/domains/${encodeURIComponent(domainName)}/admin-mailboxes`,
    });
  }

  /**
   * Register a new domain on the account.
   *
   * @example
   * ```ts
   * const domain = await mi.domains.create({ domainName: 'acme.com' });
   * ```
   */
  async create(params: CreateDomainParams): Promise<Domain> {
    return this.client.request<Domain>({
      method: 'POST',
      path: '/api/domains/create',
      body: params,
    });
  }

  /** Register many domains at once. Returns a task id; poll via {@link Tasks.waitFor}. */
  async bulkCreate(params: BulkCreateDomainsParams): Promise<TaskCreateResponse> {
    return this.client.request<TaskCreateResponse>({
      method: 'POST',
      path: '/api/domains/bulk-create',
      body: params,
    });
  }

  /**
   * Trigger DNS verification for a single domain. Returns the current state of
   * each DNS check (SPF, DKIM, DMARC, MX, return-path).
   */
  async verify(domainName: string): Promise<DomainVerificationResult> {
    return this.client.request<DomainVerificationResult>({
      method: 'POST',
      path: '/api/domains/verify',
      body: { domainName },
    });
  }

  /** Verify many domains at once. Returns a task id. */
  async bulkVerify(params: BulkVerifyDomainsParams): Promise<TaskCreateResponse> {
    return this.client.request<TaskCreateResponse>({
      method: 'POST',
      path: '/api/domains/bulk-verify',
      body: params,
    });
  }

  /** Push the domain's DNS records to the connected DNS manager. */
  async pushDns(domainName: string): Promise<PushDnsResult> {
    return this.client.request<PushDnsResult>({
      method: 'POST',
      path: '/api/domains/push-dns',
      body: { domainName },
    });
  }

  /** Push DNS records for many domains at once. Returns a task id. */
  async bulkPushDns(params: BulkPushDnsParams): Promise<TaskCreateResponse> {
    return this.client.request<TaskCreateResponse>({
      method: 'POST',
      path: '/api/domains/bulk-push-dns',
      body: params,
    });
  }

  /**
   * Re-push a domain's existing DNS records. Useful after DNS records have
   * been reset externally or after a DMARC change.
   */
  async repushDns(domainName: string): Promise<RepushDnsResult> {
    return this.client.request<RepushDnsResult>({
      method: 'POST',
      path: '/api/domains/repush',
      body: { domainName },
    });
  }

  /** Re-push DNS for many domains at once. Returns a task id. */
  async bulkRepushDns(params: BulkRepushDnsParams): Promise<TaskCreateResponse> {
    return this.client.request<TaskCreateResponse>({
      method: 'POST',
      path: '/api/domains/bulk-repush',
      body: params,
    });
  }

  /** Remove the domain's DNS records from the connected DNS manager. */
  async cleanDns(domainName: string): Promise<CleanDnsResult> {
    return this.client.request<CleanDnsResult>({
      method: 'DELETE',
      path: `/api/domains/${encodeURIComponent(domainName)}/dns`,
    });
  }

  /** Delete a single domain. */
  async delete(domainName: string): Promise<{ message: string }> {
    return this.client.request<{ message: string }>({
      method: 'DELETE',
      path: `/api/domains/${encodeURIComponent(domainName)}`,
    });
  }

  /** Delete many domains at once. Returns a task id. */
  async bulkDelete(params: BulkDeleteDomainsParams): Promise<TaskCreateResponse> {
    return this.client.request<TaskCreateResponse>({
      method: 'POST',
      path: '/api/domains/bulk-delete',
      body: params,
    });
  }
}
