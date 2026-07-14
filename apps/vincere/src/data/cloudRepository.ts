import type { SupabaseRuntimeConfig } from '../config/runtime';
import { seedState } from './seed';
import type { AppState } from '../types/domain';
import { parseWorkspaceSnapshot } from './repository';

type FetchLike = typeof fetch;

type CollectionKey = 'contacts' | 'followUps' | 'properties' | 'appointments' | 'callEvents' | 'auditEvents';

interface CollectionDefinition {
  key: CollectionKey;
  table: string;
}

const COLLECTIONS: CollectionDefinition[] = [
  { key: 'contacts', table: 'contacts' },
  { key: 'followUps', table: 'follow_ups' },
  { key: 'properties', table: 'properties' },
  { key: 'appointments', table: 'appointments' },
  { key: 'callEvents', table: 'call_events' },
  { key: 'auditEvents', table: 'audit_events' },
];

const DELETE_ORDER = [...COLLECTIONS].reverse();

interface RelationalRow {
  id: string;
  payload: unknown;
  version: number;
  updated_at: string;
}

interface WorkspaceRow {
  id: string;
  name: string;
  region: string;
  created_at: string;
}

interface RevisionRow {
  revision: number;
  updated_at: string;
}

export type EntityVersionMap = Record<CollectionKey, Record<string, number>>;

export interface RelationalMutation {
  collection: CollectionKey;
  operation: 'upsert' | 'delete';
  id: string;
  expectedVersion: number;
  payload?: unknown;
  relatedContactId?: string;
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

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const stableValue = (value: unknown) => JSON.stringify(value);

function emptyVersions(): EntityVersionMap {
  return {
    contacts: {},
    followUps: {},
    properties: {},
    appointments: {},
    callEvents: {},
    auditEvents: {},
  };
}

function collectionItems(state: AppState, key: CollectionKey): Array<{ id: string; [key: string]: unknown }> {
  return state[key] as Array<{ id: string; [key: string]: unknown }>;
}

function relatedContactId(collection: CollectionKey, record: Record<string, unknown>) {
  if (collection === 'followUps' || collection === 'callEvents') return record.contactId as string;
  if (collection === 'properties') return record.ownerContactId as string | undefined;
  if (collection === 'appointments') return record.contactId as string | undefined;
  return undefined;
}

export function buildRelationalMutations(
  current: AppState,
  baseline: AppState | null,
  versions: EntityVersionMap,
): RelationalMutation[] {
  const mutations: RelationalMutation[] = [];

  for (const definition of COLLECTIONS) {
    const currentById = new Map(collectionItems(current, definition.key).map((item) => [item.id, item]));
    const baselineById = new Map((baseline ? collectionItems(baseline, definition.key) : []).map((item) => [item.id, item]));

    for (const [id, item] of currentById) {
      const previous = baselineById.get(id);
      if (!previous || stableValue(previous) !== stableValue(item)) {
        mutations.push({
          collection: definition.key,
          operation: 'upsert',
          id,
          expectedVersion: versions[definition.key][id] ?? 0,
          payload: item,
          relatedContactId: relatedContactId(definition.key, item),
        });
      }
    }
  }

  for (const definition of DELETE_ORDER) {
    const currentIds = new Set(collectionItems(current, definition.key).map((item) => item.id));
    for (const previous of baseline ? collectionItems(baseline, definition.key) : []) {
      if (!currentIds.has(previous.id)) {
        mutations.push({
          collection: definition.key,
          operation: 'delete',
          id: previous.id,
          expectedVersion: versions[definition.key][previous.id] ?? 0,
        });
      }
    }
  }

  return mutations;
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
  private baseline: AppState | null = null;
  private versions: EntityVersionMap = emptyVersions();

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

  private async readRows(table: string, workspaceId: string, accessToken: string): Promise<RelationalRow[]> {
    const query = new URLSearchParams({
      select: 'id,payload,version,updated_at',
      workspace_id: `eq.${workspaceId}`,
      order: 'updated_at.asc',
    });
    const response = await this.fetcher(`${this.config.url}/rest/v1/${table}?${query}`, {
      headers: this.headers(accessToken),
    });
    if (!response.ok) throw new Error(await readError(response));
    return response.json() as Promise<RelationalRow[]>;
  }

  async load(workspaceId: string, accessToken: string): Promise<CloudLoadResult | null> {
    if (!this.config.configured) return null;

    const workspaceQuery = new URLSearchParams({ select: 'id,name,region,created_at', id: `eq.${workspaceId}`, limit: '1' });
    const revisionQuery = new URLSearchParams({ select: 'revision,updated_at', workspace_id: `eq.${workspaceId}`, limit: '1' });

    const [workspaceResponse, revisionResponse, ...collectionRows] = await Promise.all([
      this.fetcher(`${this.config.url}/rest/v1/workspaces?${workspaceQuery}`, { headers: this.headers(accessToken) }),
      this.fetcher(`${this.config.url}/rest/v1/workspace_sync_revisions?${revisionQuery}`, { headers: this.headers(accessToken) }),
      ...COLLECTIONS.map((definition) => this.readRows(definition.table, workspaceId, accessToken)),
    ]);

    if (!workspaceResponse.ok) throw new Error(await readError(workspaceResponse));
    if (!revisionResponse.ok) throw new Error(await readError(revisionResponse));

    const workspaceRows = await workspaceResponse.json() as WorkspaceRow[];
    const revisionRows = await revisionResponse.json() as RevisionRow[];
    const revision = revisionRows[0];
    const hasRemoteRecords = collectionRows.some((rows) => rows.length > 0);
    if (!revision && !hasRemoteRecords) return null;

    const workspace = workspaceRows[0];
    const remoteCollections = Object.fromEntries(
      COLLECTIONS.map((definition, index) => [definition.key, collectionRows[index].map((row) => row.payload)]),
    ) as Pick<AppState, CollectionKey>;

    const state = parseWorkspaceSnapshot({
      ...seedState,
      ...remoteCollections,
      workspace: {
        ...seedState.workspace,
        id: workspaceId,
        name: workspace?.name ?? seedState.workspace.name,
        region: workspace?.region ?? seedState.workspace.region,
        createdAt: workspace?.created_at ?? seedState.workspace.createdAt,
      },
      currentUser: { ...seedState.currentUser, workspaceId },
    });

    this.versions = emptyVersions();
    COLLECTIONS.forEach((definition, index) => {
      for (const row of collectionRows[index]) this.versions[definition.key][row.id] = row.version;
    });
    this.baseline = clone(state);

    const updatedAt = revision?.updated_at
      ?? collectionRows.flat().map((row) => row.updated_at).sort().at(-1)
      ?? new Date(0).toISOString();

    return { state, version: revision?.revision ?? 0, updatedAt };
  }

  async save(
    workspaceId: string,
    state: AppState,
    accessToken: string,
    expectedVersion: number,
  ): Promise<CloudSaveResult> {
    if (!this.config.configured) throw new Error('Das VINCERE-Cloud-Backend ist nicht konfiguriert.');

    const mutations = buildRelationalMutations(state, this.baseline, this.versions);
    if (mutations.length === 0) {
      return { version: expectedVersion, updatedAt: new Date().toISOString() };
    }

    const response = await this.fetcher(`${this.config.url}/rest/v1/rpc/sync_vincere_records`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({
        p_workspace_id: workspaceId,
        p_expected_revision: expectedVersion,
        p_mutations: mutations,
      }),
    });
    if (!response.ok) throw new Error(await readError(response));

    const result = await response.json() as { revision: number; updated_at: string } | Array<{ revision: number; updated_at: string }>;
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error('Die relationale Cloud-Speicherung lieferte kein Ergebnis.');

    for (const mutation of mutations) {
      if (mutation.operation === 'delete') {
        delete this.versions[mutation.collection][mutation.id];
      } else {
        this.versions[mutation.collection][mutation.id] = mutation.expectedVersion + 1;
      }
    }
    this.baseline = clone(state);

    return { version: row.revision, updatedAt: row.updated_at };
  }
}
