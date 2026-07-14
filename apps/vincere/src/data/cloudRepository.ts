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
import { seedState } from './seed';

type FetchLike = typeof fetch;
export type CollectionKey = 'contacts' | 'followUps' | 'properties' | 'appointments' | 'callEvents' | 'auditEvents';
export type RealtimeCollectionKey = Exclude<CollectionKey, 'auditEvents'>;
export type CloudEntity = Contact | FollowUp | Property | Appointment | CallEvent | AuditEvent;

interface CollectionDefinition {
  key: CollectionKey;
  table: string;
}

export const COLLECTIONS: readonly CollectionDefinition[] = [
  { key: 'contacts', table: 'contacts' },
  { key: 'followUps', table: 'follow_ups' },
  { key: 'properties', table: 'properties' },
  { key: 'appointments', table: 'appointments' },
  { key: 'callEvents', table: 'call_events' },
  { key: 'auditEvents', table: 'audit_events' },
];

const DELETE_ORDER = [...COLLECTIONS].reverse();

export interface RelationalRow {
  workspace_id?: string;
  id: string;
  payload: CloudEntity;
  version: number;
  updated_at: string;
  updated_by?: string | null;
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

export interface RemoteRecordChange {
  workspaceId: string;
  collection: RealtimeCollectionKey;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
  payload?: CloudEntity;
  version: number;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface CloudLoadResult {
  state: AppState;
  version: number;
  updatedAt: string;
}

export interface CloudSaveResult {
  version: number;
  updatedAt: string;
  mutations: RelationalMutation[];
}

export interface ConflictCloudSnapshot {
  revision: number;
  record: RemoteRecordChange;
}

export class CloudConflictError extends Error {
  constructor(message: string, readonly mutations: RelationalMutation[]) {
    super(message);
    this.name = 'CloudConflictError';
  }
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

export function tableForCollection(collection: CollectionKey) {
  return COLLECTIONS.find((definition) => definition.key === collection)?.table;
}

export function collectionItems(state: AppState, key: CollectionKey): CloudEntity[] {
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

function upsert<T extends { id: string }>(records: T[], payload: T) {
  const index = records.findIndex((record) => record.id === payload.id);
  if (index < 0) return [payload, ...records];
  return records.map((record) => record.id === payload.id ? payload : record);
}

function remove<T extends { id: string }>(records: T[], id: string) {
  return records.filter((record) => record.id !== id);
}

function applyRecord(state: AppState, change: RemoteRecordChange): AppState {
  const deleted = change.eventType === 'DELETE';
  switch (change.collection) {
    case 'contacts':
      return { ...state, contacts: deleted ? remove(state.contacts, change.id) : upsert(state.contacts, change.payload as Contact) };
    case 'followUps':
      return { ...state, followUps: deleted ? remove(state.followUps, change.id) : upsert(state.followUps, change.payload as FollowUp) };
    case 'properties':
      return { ...state, properties: deleted ? remove(state.properties, change.id) : upsert(state.properties, change.payload as Property) };
    case 'appointments':
      return { ...state, appointments: deleted ? remove(state.appointments, change.id) : upsert(state.appointments, change.payload as Appointment) };
    case 'callEvents':
      return { ...state, callEvents: deleted ? remove(state.callEvents, change.id) : upsert(state.callEvents, change.payload as CallEvent) };
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
      select: 'workspace_id,id,payload,version,updated_at,updated_by',
      workspace_id: `eq.${workspaceId}`,
      order: 'updated_at.asc',
    });
    const response = await this.fetcher(`${this.config.url}/rest/v1/${table}?${query}`, {
      headers: this.headers(accessToken),
    });
    if (!response.ok) throw new Error(await readError(response));
    return response.json() as Promise<RelationalRow[]>;
  }

  getVersion(collection: CollectionKey, id: string) {
    return this.versions[collection][id] ?? 0;
  }

  getPendingMutations(state: AppState) {
    return buildRelationalMutations(state, this.baseline, this.versions);
  }

  async getRevision(workspaceId: string, accessToken: string) {
    const query = new URLSearchParams({ select: 'revision,updated_at', workspace_id: `eq.${workspaceId}`, limit: '1' });
    const response = await this.fetcher(`${this.config.url}/rest/v1/workspace_sync_revisions?${query}`, {
      headers: this.headers(accessToken),
    });
    if (!response.ok) throw new Error(await readError(response));
    const row = (await response.json() as RevisionRow[])[0];
    return row ?? { revision: 0, updated_at: new Date(0).toISOString() };
  }

  async fetchRecord(
    collection: RealtimeCollectionKey,
    id: string,
    workspaceId: string,
    accessToken: string,
  ): Promise<RemoteRecordChange> {
    const table = tableForCollection(collection);
    if (!table) throw new Error(`Unbekannte Sammlung: ${collection}`);
    const query = new URLSearchParams({
      select: 'workspace_id,id,payload,version,updated_at,updated_by',
      workspace_id: `eq.${workspaceId}`,
      id: `eq.${id}`,
      limit: '1',
    });
    const response = await this.fetcher(`${this.config.url}/rest/v1/${table}?${query}`, {
      headers: this.headers(accessToken),
    });
    if (!response.ok) throw new Error(await readError(response));
    const row = (await response.json() as RelationalRow[])[0];
    if (!row) {
      return {
        workspaceId,
        collection,
        eventType: 'DELETE',
        id,
        version: 0,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      workspaceId,
      collection,
      eventType: 'UPDATE',
      id: row.id,
      payload: row.payload,
      version: row.version,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  }

  async resolveConflictSnapshots(
    workspaceId: string,
    accessToken: string,
    mutations: RelationalMutation[],
  ): Promise<ConflictCloudSnapshot[]> {
    const revision = await this.getRevision(workspaceId, accessToken);
    const relevant = mutations.filter((mutation): mutation is RelationalMutation & { collection: RealtimeCollectionKey } => mutation.collection !== 'auditEvents');
    const records = await Promise.all(relevant.map(async (mutation) => ({
      revision: revision.revision,
      record: await this.fetchRecord(mutation.collection, mutation.id, workspaceId, accessToken),
    })));
    return records;
  }

  applyRemoteChange(state: AppState, change: RemoteRecordChange) {
    const next = applyRecord(state, change);
    this.baseline = applyRecord(this.baseline ?? state, change);
    if (change.eventType === 'DELETE') delete this.versions[change.collection][change.id];
    else this.versions[change.collection][change.id] = change.version;
    return next;
  }

  prepareLocalRetry(change: RemoteRecordChange) {
    if (!this.baseline) return;
    this.baseline = applyRecord(this.baseline, change);
    if (change.eventType === 'DELETE') delete this.versions[change.collection][change.id];
    else this.versions[change.collection][change.id] = change.version;
  }

  async load(workspaceId: string, accessToken: string): Promise<CloudLoadResult | null> {
    if (!this.config.configured) return null;

    const workspaceQuery = new URLSearchParams({ select: 'id,name,region,created_at', id: `eq.${workspaceId}`, limit: '1' });
    const revisionQuery = new URLSearchParams({ select: 'revision,updated_at', workspace_id: `eq.${workspaceId}`, limit: '1' });

    const [workspaceResponse, revisionResponse, ...rows] = await Promise.all([
      this.fetcher(`${this.config.url}/rest/v1/workspaces?${workspaceQuery}`, { headers: this.headers(accessToken) }),
      this.fetcher(`${this.config.url}/rest/v1/workspace_sync_revisions?${revisionQuery}`, { headers: this.headers(accessToken) }),
      ...COLLECTIONS.map((definition) => this.readRows(definition.table, workspaceId, accessToken)),
    ]);

    if (!workspaceResponse.ok) throw new Error(await readError(workspaceResponse));
    if (!revisionResponse.ok) throw new Error(await readError(revisionResponse));

    const workspace = (await workspaceResponse.json() as WorkspaceRow[])[0];
    const revision = (await revisionResponse.json() as RevisionRow[])[0];
    if (!revision && !rows.some((collection) => collection.length > 0)) return null;

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

    const mutations = buildRelationalMutations(state, this.baseline, this.versions);
    if (mutations.length === 0) return { version: expectedVersion, updatedAt: new Date().toISOString(), mutations };

    const response = await this.fetcher(`${this.config.url}/rest/v1/rpc/sync_vincere_records`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify({
        p_workspace_id: workspaceId,
        p_expected_revision: expectedVersion,
        p_mutations: mutations,
      }),
    });
    if (!response.ok) {
      const message = await readError(response);
      if (message.toLowerCase().includes('conflict')) throw new CloudConflictError(`version conflict: ${message}`, mutations);
      throw new Error(message);
    }

    const result = await response.json() as { revision: number; updated_at: string } | Array<{ revision: number; updated_at: string }>;
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error('Die relationale Cloud-Speicherung lieferte kein Ergebnis.');

    for (const mutation of mutations) {
      if (mutation.operation === 'delete') delete this.versions[mutation.collection][mutation.id];
      else this.versions[mutation.collection][mutation.id] = mutation.expectedVersion + 1;
    }
    this.baseline = clone(state);

    return { version: row.revision, updatedAt: row.updated_at, mutations };
  }
}
