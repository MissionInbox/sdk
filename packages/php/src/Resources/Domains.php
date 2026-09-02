<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `domains` resource. Access via `$mi->domains`.
 */
final class Domains
{
    /** Nested redirect management. */
    public readonly DomainRedirects $redirects;

    public function __construct(private readonly Client $http)
    {
        $this->redirects = new DomainRedirects($http);
    }

    /**
     * List domains registered on the account, with filters.
     *
     * @param array<string, mixed> $params
     */
    public function list(array $params = []): array
    {
        return $this->http->request('GET', '/api/domains', query: $params);
    }

    /** Retrieve a domain by its UUID. */
    public function get(string $id): array
    {
        return $this->http->request('GET', '/api/domains/by-id/' . rawurlencode($id));
    }

    /** Retrieve a domain by name (with published DNS records). */
    public function getByName(string $domainName): array
    {
        return $this->http->request('GET', '/api/domains/' . rawurlencode($domainName));
    }

    /** Account-wide domain statistics. */
    public function getStatistics(): array
    {
        return $this->http->request('GET', '/api/domains/statistic');
    }

    /**
     * Export domains as CSV.
     *
     * @param array<string, mixed> $params
     */
    public function exportCsv(array $params = []): string
    {
        $result = $this->http->request('GET', '/api/domains/export', query: $params);
        return is_string($result) ? $result : '';
    }

    /** List admin/postmaster/abuse mailboxes provisioned for a domain. */
    public function getAdminMailboxes(string $domainName): array
    {
        return $this->http->request('GET', '/api/domains/' . rawurlencode($domainName) . '/admin-mailboxes');
    }

    /**
     * Register a new domain.
     *
     * @param array{domainName: string, projectId?: string, redirectUrl?: string} $params
     */
    public function create(array $params): array
    {
        return $this->http->request('POST', '/api/domains/create', body: $params);
    }

    /**
     * Register many domains at once. Returns a task id.
     *
     * @param array{domains: array<array{domainName: string, projectName?: string, redirectUrl?: string}>} $params
     */
    public function bulkCreate(array $params): array
    {
        return $this->http->request('POST', '/api/domains/bulk-create', body: $params);
    }

    /** Trigger DNS verification for a single domain. */
    public function verify(string $domainName): array
    {
        return $this->http->request('POST', '/api/domains/verify', body: ['domainName' => $domainName]);
    }

    /** Verify many domains at once. Returns a task id. */
    public function bulkVerify(array $params): array
    {
        return $this->http->request('POST', '/api/domains/bulk-verify', body: $params);
    }

    /** Push the domain's DNS records to the connected DNS manager. */
    public function pushDns(string $domainName): array
    {
        return $this->http->request('POST', '/api/domains/push-dns', body: ['domainName' => $domainName]);
    }

    /** Push DNS records for many domains. Returns a task id. */
    public function bulkPushDns(array $params): array
    {
        return $this->http->request('POST', '/api/domains/bulk-push-dns', body: $params);
    }

    /** Re-push a domain's existing DNS records. */
    public function repushDns(string $domainName): array
    {
        return $this->http->request('POST', '/api/domains/repush', body: ['domainName' => $domainName]);
    }

    /** Re-push DNS for many domains. Returns a task id. */
    public function bulkRepushDns(array $params): array
    {
        return $this->http->request('POST', '/api/domains/bulk-repush', body: $params);
    }

    /** Remove the domain's DNS records from the connected DNS manager. */
    public function cleanDns(string $domainName): array
    {
        return $this->http->request('DELETE', '/api/domains/' . rawurlencode($domainName) . '/dns');
    }

    /** Delete a single domain. */
    public function delete(string $domainName): array
    {
        return $this->http->request('DELETE', '/api/domains/' . rawurlencode($domainName));
    }

    /** Delete many domains. Returns a task id. */
    public function bulkDelete(array $params): array
    {
        return $this->http->request('POST', '/api/domains/bulk-delete', body: $params);
    }
}
