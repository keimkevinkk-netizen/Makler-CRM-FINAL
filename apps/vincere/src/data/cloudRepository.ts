import type { SupabaseRuntimeConfig } from '../config/runtime';
import type {
  AppState,
  Appointment,
  AuditEvent,
  CallEvent,
  Contact,
  FollowUp,
  Property,
} from '../types/domain';
import { parseWorkspaceSnapshot } from './repository';
import { createEmptyState, seedState } from './seed';

type FetchLike = typeof fetch;
type CollectionKey = 'contacts' | 'followUps' | 'properties' | 'appointments' | 'callEvents' | 'auditEvents';
type CloudEntity = Contact | FollowUp | Property | Appointment | CallEvent | AuditEvent;

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
const READ_PAGE_SIZE = 500;
const MAX_READ_PAGES = 100;

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
  payload?: CloudEntity;
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

function collectionItems(state: AppState, key: CollectionKey): CloudEntity[] {
  switch (key) {
    case 'contacts': return state.contacts;
    case 'followUps': return state.followUps;
    case 'properties': return state.properties;
    case 'appointments': return state.appointments;
    case 'callEvents': return state.callEvents;
    case 'auditEvents': return state.auditEvents;
  }
}

function relatedContactId(collection: CollectionKey, record: CloudEntity) {
  switch (collection) {
    case 'followUps': return (record as FollowUp).contactId;
    case 'callEvents': return (record as CallEvent).contactId;
    case 'properties': return (record as Property).ownerContactId;
    case 'appointments': return (record as Appointment).contactId;
    default: return undefined;
  }
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

function payloads<T extends CloudEntity>(rows: RelationalRow[]): T[] {
  return rows.map((row) => row.payload as T);
}

export class SupabaseWorkspaceCloudRepository {
  private baseline: AppState | null = null;
  private versions: EntityVersionMap = emptyVersions();
  private activeWorkspaceId: string | null = null;

  constructor(
    private readonly config: SupabaseRuntimeConfig,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  private headers(accessToken: string) {
    return {
      apikey: this.config.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    };
  }

  private resetWorkspace(workspaceId: string) {
    this.activeWorkspaceId = workspaceId;
    this.versions = emptyVersions();
    this.baseline = createEmptyState({
      workspace: { ...seedState.workspace, id: workspaceId },
      currentUser: { ...seedState.currentUser, workspaceId },
    });
  }

  private async readRows(table: string, workspaceId: string, accessToken: string): Promise<RelationalRow[]> {
    const rows: RelationalRow[] = [];
    const query = new URLSearchParams({
      select: 'id,payload,version,updated_at',
      workspace_id: `eq.${workspaceId}`,
      order: 'updated_at.asc',
    });

    for (let page = 0; page < MAX_READ_PAGES; page += 1) {
      const from = page * READ_PAGE_SIZE;
      const response = await this.fetcher(`${this.config.url}/rest/v1/${table}?${query}`, {
        headers: {
          ...this.headers(accessToken),
          Range: `${from}-${from + READ_PAGE_SIZE - 1}`,
          'Range-Unit': 'items',
        },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(await readError(response));
      const pageRows = await response.json() as RelationalRow[];
      rows.push(...pageRows);
      if (pageRows.length < READ_PAGE_SIZE) return rows;
    }

    throw new Error(`Die Tabelle ${table} überschreitet das sichere Ladelimit. Eine serverseitige Filter- oder Archivierungsstrategie ist erforderlich.`);
  }

  async load(workspaceId: string, accessToken: string): Promise<CloudLoadResult | null> {
    if (!this.config.configured) return null;
    if (this.activeWorkspaceId !== workspaceId) this.resetWorkspace(workspaceId);

    const workspaceQuery = new URLSearchParams({ select: 'id,name,region,created_at', id: `eq.${workspaceId}`, limit: '1' });
    const revisionQuery = new URLSearchParams({ select: 'revision,updated_at', workspace_id: `eq.${workspaceId}`, limit: '1' });

    const [workspaceResponse, revisionResponse, ...rows] = await Promise.all([
      this.fetcher(`${this.config.url}/rest/v1/workspaces?${workspaceQuery}`, { headers: this.headers(accessToken), cache: 'no-store' }),
      this.fetcher(`${this.config.url}/rest/v1/workspace_sync_revisions?${revisionQuery}`, { headers: this.headers(accessToken), cache: 'no-store' }),
      ...COLLECTIONS.map((definition) => this.readRows(definition.table, workspaceId, accessToken)),
    ]);

    if (!workspaceResponse.ok) throw new Error(await readError(workspaceResponse));
    if (!revisionResponse.ok) throw new Error(await readError(revisionResponse));

    const workspace = (await workspaceResponse.json() as WorkspaceRow[])[0];
    const revision = (await revisionResponse.json() as RevisionRow[])[0];
    if (!revision && !rows.some((collection) => collection.length > 0)) {
      this.resetWorkspace(workspaceId);
      return null;
    }

    const state = parseWorkspaceSnapshot({
      ...seedState,
      contacts: payloads<Contact>(rows[0]),
      followUps: payloads<FollowUp>(rows[1]),
      properties: payloads<Property>(rows[2]),
      appointments: payloads<Appointment>(rows[3]),
      callEvents: payloads<CallEvent>(rows[4]),
      auditEvents: payloads<AuditEvent>(rows[5]),
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
      for (const row of rows[index]) this.versions[definition.key][row.id] = row.version;
    });
    this.baseline = clone(state);

    const updatedAt = revision?.updated_at
      ?? rows.flat().map((row) => row.updated_at).sort().at(-1)
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
    if (this.activeWorkspaceId !== workspaceId) {
      throw new Error('Workspace-Wechsel erkannt. Vor dem Speichern müssen die Daten des neuen Workspaces geladen werden.');
    }
    if (state.workspace.id !== workspaceId || state.currentUser.workspaceId !== workspaceId) {
      throw new Error('Workspace-Isolation verletzt: Zustand und aktive Mitgliedschaft stimmen nicht überein.');
    }

    const mutations = buildRelationalMutations(state, this.baseline, this.versions);
    if (mutations.length === 0) return { version: expectedVersion, updatedAt: new Date().toISOString() };

    const response = await this.fetcher(`${this.config.url}/rest/v1/rpc/sync_vincere_records`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({
        p_workspace_id: workspaceId,
        p_expected_revision: expectedVersion,
        p_mutations: mutations,
      }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const message = await readError(response);
      throw new Error(message.includes('revision conflict') ? `version conflict: ${message}` : message);
    }

    const result = await response.json() as { revision: number; updated_at: string } | Array<{ revision: number; updated_at: string }>;
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error('Die relationale Cloud-Speicherung lieferte kein Ergebnis.');

    for (const mutation of mutations) {
      if (mutation.operation === 'delete') delete this.versions[mutation.collection][mutation.id];
      else this.versions[mutation.collection][mutation.id] = mutation.expectedVersion + 1;
    }
    this.baseline = clone(state);

    return { version: row.revision, updatedAt: row.updated_at };
  }
}
