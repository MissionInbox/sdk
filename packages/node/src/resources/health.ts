import type { MissionInbox } from '../client.js';
import type { HealthStatus } from '../types.js';

/**
 * The `health` resource. Access via `mi.health`.
 *
 * The health endpoint is unauthenticated and returns a small plain-text or
 * JSON response indicating the API is reachable. Useful as a liveness probe.
 */
export class Health {
  /** @internal */
  constructor(private readonly client: MissionInbox) {}

  /** Ping the API. Resolves with the API's health string on success. */
  async check(): Promise<HealthStatus> {
    return this.client.request<HealthStatus>({
      method: 'GET',
      path: '/api/health',
    });
  }
}
