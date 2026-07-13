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

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asArray = <T,>(value: unknown, fallback: T[]): T[] => Array.isArray(value) ? value as T[] : fallback;

function normalizeState(value: unknown): AppState {
  const source = isRecord(value) ? value : {};
  const fallback = clone(seedState);
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

export function migrateLegacyState(value: unknown): AppState {
  const migrated = normalizeState(value);
  return { ...migrated, auditEvents: [migrationAudit(migrated), ...migrated.auditEvents] };
}

export function parseWorkspaceSnapshot(payload: string | unknown): AppState {
  const decoded: unknown = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!isRecord(decoded)) throw new Error('Die Sicherungsdatei enthält kein gültiges Objekt.');

  const candidate = isRecord(decoded.state) ? decoded.state : decoded;
  const requiredCollections = ['contacts', 'followUps', 'properties', 'appointments', 'callEvents'];
  const missing = requiredCollections.filter((key) => !Array.isArray(candidate[key]));
  if (missing.length > 0) {
    throw new Error(`Ungültige Sicherung: ${missing.join(', ')} fehlt oder ist beschädigt.`);
  }

  return normalizeState(candidate);
}

export class LocalStorageWorkspaceRepository implements WorkspaceRepository {
  load(): AppState {
    try {
      const current = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (current) return parseWorkspaceSnapshot(current);

      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const migrated = migrateLegacyState(JSON.parse(legacy));
        this.save(migrated);
        return migrated;
      }
    } catch {
      return clone(seedState);
    }

    return clone(seedState);
  }

  save(state: AppState) {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(this.exportSnapshot(state)));
  }

  clear() {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
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
    const imported = parseWorkspaceSnapshot(payload);
    if (expectedWorkspaceId && imported.workspace.id !== expectedWorkspaceId) {
      throw new Error('Die Sicherung gehört zu einem anderen VINCERE-Workspace und wurde nicht importiert.');
    }
    this.save(imported);
    return imported;
  }
}
