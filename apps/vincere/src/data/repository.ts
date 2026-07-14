import { seedState } from './seed';
import type { AppState, AuditEvent, Workspace, WorkspaceUser } from '../types/domain';

export const CURRENT_SCHEMA_VERSION = 2;
export const WORKSPACE_STORAGE_KEY = 'vincere_workspace_v2';
export const LEGACY_STORAGE_KEY = 'vincere_state_v1';

export interface WorkspaceSnapshot {
  format: 'vincere-workspace';
  schemaVersion: number;
  exportedAt: string;
  workspaceId: string;
  state: AppState;
}

export interface WorkspaceRepository {
  load(): AppState;
  save(state: AppState): void;
  clear(): void;
  exportSnapshot(state: AppState): WorkspaceSnapshot;
  importSnapshot(payload: string | unknown, expectedWorkspaceId?: string): AppState;
}

export interface LocalStorageWorkspaceRepositoryOptions {
  storage?: Storage;
  storageKey?: string;
  legacyStorageKey?: string;
  fallbackState?: AppState;
  allowLegacyMigration?: boolean;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asArray = <T,>(value: unknown, fallback: T[]): T[] => Array.isArray(value) ? value as T[] : fallback;

function normalizeState(value: unknown, fallbackState: AppState = seedState): AppState {
  const source = isRecord(value) ? value : {};
  const fallback = clone(fallbackState);
  const workspace = isRecord(source.workspace)
    ? { ...fallback.workspace, ...source.workspace } as Workspace
    : fallback.workspace;
  const currentUser = isRecord(source.currentUser)
    ? { ...fallback.currentUser, ...source.currentUser, workspaceId: workspace.id } as WorkspaceUser
    : { ...fallback.currentUser, workspaceId: workspace.id };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    workspace,
    currentUser,
    contacts: asArray(source.contacts, fallback.contacts),
    followUps: asArray(source.followUps, fallback.followUps),
    properties: asArray(source.properties, fallback.properties),
    appointments: asArray(source.appointments, fallback.appointments),
    callEvents: asArray(source.callEvents, fallback.callEvents),
    auditEvents: asArray(source.auditEvents, []),
  };
}

function migrationAudit(state: AppState): AuditEvent {
  return {
    id: `audit-migration-${Date.now()}`,
    actorId: state.currentUser.id,
    workspaceId: state.workspace.id,
    entity: 'workspace',
    action: 'schema_migrated',
    summary: 'Lokaler V1-Datenstand wurde in das versionierte V2-Workspace-Format überführt.',
    createdAt: new Date().toISOString(),
  };
}

export function migrateLegacyState(value: unknown, fallbackState: AppState = seedState): AppState {
  const migrated = normalizeState(value, fallbackState);
  return { ...migrated, auditEvents: [migrationAudit(migrated), ...migrated.auditEvents] };
}

export function parseWorkspaceSnapshot(payload: string | unknown, fallbackState: AppState = seedState): AppState {
  const decoded: unknown = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!isRecord(decoded)) throw new Error('Die Sicherungsdatei enthält kein gültiges Objekt.');

  const candidate = isRecord(decoded.state) ? decoded.state : decoded;
  const requiredCollections = ['contacts', 'followUps', 'properties', 'appointments', 'callEvents'];
  const missing = requiredCollections.filter((key) => !Array.isArray(candidate[key]));
  if (missing.length > 0) {
    throw new Error(`Ungültige Sicherung: ${missing.join(', ')} fehlt oder ist beschädigt.`);
  }

  return normalizeState(candidate, fallbackState);
}

export class LocalStorageWorkspaceRepository implements WorkspaceRepository {
  private readonly storage: Storage;
  private readonly storageKey: string;
  private readonly legacyStorageKey: string;
  private readonly fallbackState: AppState;
  private readonly allowLegacyMigration: boolean;

  constructor(options: LocalStorageWorkspaceRepositoryOptions = {}) {
    this.storage = options.storage ?? localStorage;
    this.storageKey = options.storageKey ?? WORKSPACE_STORAGE_KEY;
    this.legacyStorageKey = options.legacyStorageKey ?? LEGACY_STORAGE_KEY;
    this.fallbackState = options.fallbackState ?? seedState;
    this.allowLegacyMigration = options.allowLegacyMigration ?? true;
  }

  load(): AppState {
    try {
      const current = this.storage.getItem(this.storageKey);
      if (current) return parseWorkspaceSnapshot(current, this.fallbackState);

      const legacy = this.allowLegacyMigration ? this.storage.getItem(this.legacyStorageKey) : null;
      if (legacy) {
        const migrated = migrateLegacyState(JSON.parse(legacy), this.fallbackState);
        this.save(migrated);
        return migrated;
      }
    } catch {
      return clone(this.fallbackState);
    }

    return clone(this.fallbackState);
  }

  save(state: AppState) {
    this.storage.setItem(this.storageKey, JSON.stringify(this.exportSnapshot(state)));
  }

  clear() {
    this.storage.removeItem(this.storageKey);
    if (this.allowLegacyMigration) this.storage.removeItem(this.legacyStorageKey);
  }

  exportSnapshot(state: AppState): WorkspaceSnapshot {
    return {
      format: 'vincere-workspace',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      workspaceId: state.workspace.id,
      state: { ...state, schemaVersion: CURRENT_SCHEMA_VERSION },
    };
  }

  importSnapshot(payload: string | unknown, expectedWorkspaceId?: string) {
    const imported = parseWorkspaceSnapshot(payload, this.fallbackState);
    if (expectedWorkspaceId && imported.workspace.id !== expectedWorkspaceId) {
      throw new Error('Die Sicherung gehört zu einem anderen VINCERE-Workspace und wurde nicht importiert.');
    }

    const existing = expectedWorkspaceId ? this.load() : null;
    const secured = existing
      ? { ...imported, workspace: existing.workspace, currentUser: existing.currentUser }
      : imported;
    this.save(secured);
    return secured;
  }
}
