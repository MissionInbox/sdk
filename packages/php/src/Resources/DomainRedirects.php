<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * Domain redirects (Mission Redirect). Access via `$mi->domains->redirects`.
 */
final class DomainRedirects
{
    public function __construct(private readonly Client $http) {}

    /** Return the IP + CNAME target values for manual DNS publishing. */
    public function getDnsConfig(): array
    {
        return $this->http->request('GET', '/api/domains/redirect/dns-config');
    }

    /** Get the current redirect configuration for a domain. */
    public function get(string $domainName): array
    {
        return $this->http->request('GET', '/api/domains/' . rawurlencode($domainName) . '/redirect');
    }

    /**
     * Create or update the redirect for a domain.
     *
     * @param array{redirectUrl: string, enabled?: bool, forceHttps?: bool} $params
     */
    public function setup(string $domainName, array $params): array
    {
        return $this->http->request(
            'PUT',
            '/api/domains/' . rawurlencode($domainName) . '/redirect',
            body: $params,
        );
    }

    /** Push the redirect's DNS records to the connected DNS manager. */
    public function pushDns(string $domainName): array
    {
        return $this->http->request('POST', '/api/domains/' . rawurlencode($domainName) . '/redirect/push-dns');
    }

    /** Verify the redirect's DNS records have propagated. */
    public function verifyDns(string $domainName): array
    {
        return $this->http->request('POST', '/api/domains/' . rawurlencode($domainName) . '/redirect/verify-dns');
    }

    /** Retrieve the redirect's audit event log. */
    public function getEvents(string $domainName, ?int $limit = null): array
    {
        $query = $limit !== null ? ['limit' => $limit] : null;
        return $this->http->request(
            'GET',
            '/api/domains/' . rawurlencode($domainName) . '/redirect/events',
            query: $query,
        );
    }

    /** Delete the redirect. */
    public function delete(string $domainName): array
    {
        return $this->http->request('DELETE', '/api/domains/' . rawurlencode($domainName) . '/redirect');
    }

    /**
     * Create redirects on many domains.
     *
     * @param array{redirects: array<array{domainName: string, redirectUrl: string, enabled?: bool, forceHttps?: bool}>} $params
     */
    public function bulkSetup(array $params): array
    {
        return $this->http->request('POST', '/api/domains/redirects/bulk-setup', body: $params);
    }

    /**
     * Update redirect settings on many domains.
     *
     * @param array{updates: array<array{domainName: string, destination?: string, enabled?: bool, tags?: string}>} $params
     */
    public function bulkUpdate(array $params): array
    {
        return $this->http->request('PATCH', '/api/domains/redirects/bulk-update', body: $params);
    }

    /**
     * Delete redirects on many domains.
     *
     * @param array{domainNames: array<string>} $params
     */
    public function bulkDelete(array $params): array
    {
        return $this->http->request('DELETE', '/api/domains/redirects/bulk-delete', body: $params);
    }

    /**
     * Idempotent bulk create-or-update.
     *
     * @param array{redirects: array<array{domainName: string, redirectUrl: string, enabled?: bool, forceHttps?: bool}>} $params
     */
    public function bulkCreateOrUpdate(array $params): array
    {
        return $this->http->request('POST', '/api/domains/redirects/bulk-create-or-update', body: $params);
    }
}
