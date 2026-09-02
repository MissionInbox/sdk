import type { MissionInbox } from '../client.js';
import type {
  AssignDomainsToProjectParams,
  AssignDomainsToProjectResult,
  CreateProjectParams,
  Project,
  UpdateProjectParams,
} from '../types.js';

/**
 * The `projects` resource. Access via `mi.projects`.
 *
 * Projects group domains for organisation and reporting. A domain belongs to
 * at most one project.
 */
export class Projects {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /** List all projects on the account. */
  async list(): Promise<Project[]> {
    return this.client.request<Project[]>({
      method: 'GET',
      path: '/api/projects',
    });
  }

  /** Retrieve a project by id. */
  async get(id: string): Promise<Project> {
    return this.client.request<Project>({
      method: 'GET',
      path: `/api/projects/${encodeURIComponent(id)}`,
    });
  }

  /** Create a new project. */
  async create(params: CreateProjectParams): Promise<Project> {
    return this.client.request<Project>({
      method: 'POST',
      path: '/api/projects',
      body: params,
    });
  }

  /** Update a project's name. */
  async update(id: string, params: UpdateProjectParams): Promise<Project> {
    return this.client.request<Project>({
      method: 'PATCH',
      path: `/api/projects/${encodeURIComponent(id)}`,
      body: params,
    });
  }

  /** Delete a project. Domains previously assigned become unassigned. */
  async delete(id: string): Promise<{ message: string }> {
    return this.client.request<{ message: string }>({
      method: 'DELETE',
      path: `/api/projects/${encodeURIComponent(id)}`,
    });
  }

  /**
   * Move domains into a project. Domains previously in another project are
   * reassigned and the response reports the previous owner per domain.
   */
  async assignDomains(id: string, params: AssignDomainsToProjectParams): Promise<AssignDomainsToProjectResult> {
    return this.client.request<AssignDomainsToProjectResult>({
      method: 'PATCH',
      path: `/api/projects/${encodeURIComponent(id)}/domains`,
      body: params,
    });
  }
}
