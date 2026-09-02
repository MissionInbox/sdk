<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `sendingIdentifiers` resource. Access via `$mi->sendingIdentifiers`.
 *
 * A sending identifier is an approved `From:` address on the account. It is
 * not a mailbox — no inbox, no password, no IMAP.
 */
final class SendingIdentifiers
{
    public function __construct(private readonly Client $http) {}

    /**
     * List every registered sending identifier.
     *
     * @return array<array<string, mixed>>
     */
    public function list(): array
    {
        return $this->http->request('GET', '/api/sending-identifiers');
    }

    /** Retrieve a single sending identifier by UUID. */
    public function get(string $id): array
    {
        return $this->http->request('GET', '/api/sending-identifiers/' . rawurlencode($id));
    }

    /**
     * Register a new sending identifier.
     *
     * @param array{emailAddress: string, displayName?: string} $params
     */
    public function create(array $params): array
    {
        return $this->http->request('POST', '/api/sending-identifiers', body: $params);
    }

    /**
     * Update the identifier's display name.
     *
     * @param array{displayName?: string} $params
     */
    public function update(string $id, array $params): array
    {
        return $this->http->request('PATCH', '/api/sending-identifiers/' . rawurlencode($id), body: $params);
    }

    /** Delete a sending identifier. */
    public function delete(string $id): array
    {
        return $this->http->request('DELETE', '/api/sending-identifiers/' . rawurlencode($id));
    }
}
