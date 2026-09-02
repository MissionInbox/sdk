import type { MissionInbox } from '../client.js';
import type {
  BulkCreateOrUpdateRedirectParams,
  BulkCreateOrUpdateRedirectResponse,
  BulkDeleteRedirectParams,
  BulkRedirectResponse,
  BulkSetupRedirectParams,
  BulkUpdateRedirectParams,
  DeleteRedirectResult,
  DomainRedirectStatus,
  PushRedirectDnsResult,
  RedirectDnsConfig,
  RedirectEventsResult,
  SetupRedirectParams,
  SetupRedirectResult,
  VerifyRedirectDnsResult,
} from '../types.js';

/**
 * Domain redirects (Mission Redirect). Access via `mi.domains.redirects`.
 *
 * Point one domain at another URL. Redirects are DNS-based — the SDK
 * publishes the required records to your DNS manager (if connected) and
 * verifies propagation.
 */
export class DomainRedirects {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /**
   * Return the IP + CNAME target values you need to publish manually if you
   * don't have a DNS manager connected.
   */
  async getDnsConfig(): Promise<RedirectDnsConfig> {
    return this.client.request<RedirectDnsConfig>({
      method: 'GET',
      path: '/api/domains/redirect/dns-config',
    });
  }

  /** Get the current redirect configuration for a domain. */
  async get(domainName: string): Promise<DomainRedirectStatus> {
    return this.client.request<DomainRedirectStatus>({
      method: 'GET',
      path: `/api/domains/${encodeURIComponent(domainName)}/redirect`,
    });
  }

  /**
   * Create or update the redirect for a domain.
   *
   * @example
   * ```ts
   * await mi.domains.redirects.setup('acme.com', {
   *   redirectUrl: 'https://www.acme.com',
   *   forceHttps: true,
   * });
   * ```
   */
  async setup(domainName: string, params: SetupRedirectParams): Promise<SetupRedirectResult> {
    const body: Record<string, unknown> = { redirectUrl: params.redirectUrl };
    if (params.enabled !== undefined) body.enabled = params.enabled;
    if (params.forceHttps !== undefined) body.forceHttps = params.forceHttps;
    return this.client.request<SetupRedirectResult>({
      method: 'PUT',
      path: `/api/domains/${encodeURIComponent(domainName)}/redirect`,
      body,
    });
  }

  /** Push the redirect's DNS records to the connected DNS manager. */
  async pushDns(domainName: string): Promise<PushRedirectDnsResult> {
    return this.client.request<PushRedirectDnsResult>({
      method: 'POST',
      path: `/api/domains/${encodeURIComponent(domainName)}/redirect/push-dns`,
    });
  }

  /** Verify the redirect's DNS records have propagated. */
  async verifyDns(domainName: string): Promise<VerifyRedirectDnsResult> {
    return this.client.request<VerifyRedirectDnsResult>({
      method: 'POST',
      path: `/api/domains/${encodeURIComponent(domainName)}/redirect/verify-dns`,
    });
  }

  /** Retrieve the redirect's audit event log. */
  async getEvents(domainName: string, limit?: number): Promise<RedirectEventsResult> {
    const query: Record<string, unknown> = {};
    if (limit !== undefined) query.limit = limit;
    return this.client.request<RedirectEventsResult>({
      method: 'GET',
      path: `/api/domains/${encodeURIComponent(domainName)}/redirect/events`,
      query,
    });
  }

  /** Delete the redirect. */
  async delete(domainName: string): Promise<DeleteRedirectResult> {
    return this.client.request<DeleteRedirectResult>({
      method: 'DELETE',
      path: `/api/domains/${encodeURIComponent(domainName)}/redirect`,
    });
  }

  /** Create redirects on many domains in one call. */
  async bulkSetup(params: BulkSetupRedirectParams): Promise<BulkRedirectResponse> {
    return this.client.request<BulkRedirectResponse>({
      method: 'POST',
      path: '/api/domains/redirects/bulk-setup',
      body: params,
    });
  }

  /** Update redirect settings on many domains in one call. */
  async bulkUpdate(params: BulkUpdateRedirectParams): Promise<BulkRedirectResponse> {
    return this.client.request<BulkRedirectResponse>({
      method: 'PATCH',
      path: '/api/domains/redirects/bulk-update',
      body: params,
    });
  }

  /** Delete redirects on many domains in one call. */
  async bulkDelete(params: BulkDeleteRedirectParams): Promise<BulkRedirectResponse> {
    return this.client.request<BulkRedirectResponse>({
      method: 'DELETE',
      path: '/api/domains/redirects/bulk-delete',
      body: params,
    });
  }

  /** Idempotent bulk create-or-update. Existing redirects are updated; missing ones are created. */
  async bulkCreateOrUpdate(params: BulkCreateOrUpdateRedirectParams): Promise<BulkCreateOrUpdateRedirectResponse> {
    return this.client.request<BulkCreateOrUpdateRedirectResponse>({
      method: 'POST',
      path: '/api/domains/redirects/bulk-create-or-update',
      body: params,
    });
  }
}
