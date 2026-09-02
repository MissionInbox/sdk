<?php

declare(strict_types=1);

namespace MissionInbox\Resources;

use MissionInbox\Http\Client;

/**
 * The `projects` resource. Access via `$mi->projects`.
 */
final class Projects
{
    public function __construct(private readonly Client $http) {}

    /** List all projects on the account. */
    public function list(): array
    {
        return $this->http->request('GET', '/api/projects');
    }

    /** Retrieve a project by id. */
    public function get(string $id): array
    {
        return $this->http->request('GET', '/api/projects/' . rawurlencode($id));
    }

    /**
     * Create a new project.
     *
     * @param array{name: string} $params
     */
    public function create(array $params): array
    {
        return $this->http->request('POST', '/api/projects', body: $params);
    }

    /**
     * Update a project's name.
     *
     * @param array{name?: string} $params
     */
    public function update(string $id, array $params): array
    {
        return $this->http->request('PATCH', '/api/projects/' . rawurlencode($id), body: $params);
    }

    /** Delete a project. */
    public function delete(string $id): array
    {
        return $this->http->request('DELETE', '/api/projects/' . rawurlencode($id));
    }

    /**
     * Move domains into a project.
     *
     * @param array{domainNames: array<string>} $params
     */
    public function assignDomains(string $id, array $params): array
    {
        return $this->http->request('PATCH', '/api/projects/' . rawurlencode($id) . '/domains', body: $params);
    }
}
