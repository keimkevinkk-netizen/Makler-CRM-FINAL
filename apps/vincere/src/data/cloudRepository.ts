import type { SupabaseRuntimeConfig } from '../config/runtime';
import type { AppState } from '../types/domain';
import { parseWorkspaceSnapshot } from './repository';

type FetchLike = typeof fetch;

interface SnapshotRow {
  payload: unknown;
  version: number;
  updated_at: string;
}

export interface CloudLoadResult {
  state: AppState;
  version: number;
  updatedAt: string;
}

export interface CloudSaveResult {
  version: number;
  updatedAt: string;
}

async function readError(response: Response) {
  try {
    const data = await response.json() as { message?: string; hint?: string; details?: string };
    return data.message ?? data.details ?? data.hint ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export class SupabaseWorkspaceCloudRepository {
  constructor(
    private readonly config: SupabaseRuntimeConfig,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  private headers(accessToken: string) {
    return {
      apikey: this.config.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async load(workspaceId: string, accessToken: string): Promise<CloudLoadResult | null> {
    if (!this.config.configured) return null;
    const query = new URLSearchParams({
      select: 'payload,version,updated_at',
      workspace_id: `eq.${workspaceId}`,
      limit: '1',
    });
    const response = await this.fetcher(`${this.config.url}/rest/v1/workspace_snapshots?${query}`, {
      headers: this.headers(accessToken),
    });
    if (!response.ok) throw new Error(await readError(response));
    const rows = await response.json() as SnapshotRow[];
    const row = rows[0];
    if (!row) return null;
    return {
      state: parseWorkspaceSnapshot(row.payload),
      version: row.version,
      updatedAt: row.updated_at,
    };
  }

  async save(
    workspaceId: string,
    state: AppState,
    accessToken: string,
    expectedVersion: number,
  ): Promise<CloudSaveResult> {
    if (!this.config.configured) throw new Error('Das VINCERE-Cloud-Backend ist nicht konfiguriert.');
    const response = await this.fetcher(`${this.config.url}/rest/v1/rpc/save_workspace_snapshot`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({
        p_workspace_id: workspaceId,
        p_expected_version: expectedVersion,
        p_payload: state,
      }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json() as { version: number; updated_at: string } | Array<{ version: number; updated_at: string }>;
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error('Die Cloud-Speicherung lieferte kein Ergebnis.');
    return { version: row.version, updatedAt: row.updated_at };
  }
}
