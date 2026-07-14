import type { CloudEntity, RemoteRecordChange, RealtimeCollectionKey } from '../data/cloudRepository';

export interface ConflictField {
  path: string;
  localValue: unknown;
  cloudValue: unknown;
}

export interface CollaborationConflict {
  id: string;
  workspaceId: string;
  collection: RealtimeCollectionKey;
  recordType: string;
  recordId: string;
  recordName: string;
  localVersion: number;
  cloudVersion: number;
  cloudRevision: number;
  localPayload?: CloudEntity;
  cloudPayload?: CloudEntity;
  localChangedAt: string;
  cloudChangedAt: string;
  cloudActorId?: string | null;
  affectedFields: ConflictField[];
  deferred: boolean;
  detectedAt: string;
  cloudEventType: RemoteRecordChange['eventType'];
}

const collectionLabels: Record<RealtimeCollectionKey, string> = {
  contacts: 'Kontakt',
  followUps: 'Follow-up',
  properties: 'Immobilie',
  appointments: 'Termin',
  callEvents: 'Telefonereignis',
};

const stable = (value: unknown) => JSON.stringify(value);

function flatten(value: unknown, prefix = '', output = new Map<string, unknown>()) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    output.set(prefix || 'Wert', value);
    return output;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

export function compareConflictFields(localValue: unknown, cloudValue: unknown): ConflictField[] {
  const local = flatten(localValue);
  const cloud = flatten(cloudValue);
  const paths = new Set([...local.keys(), ...cloud.keys()]);
  return [...paths]
    .filter((path) => stable(local.get(path)) !== stable(cloud.get(path)))
    .sort((left, right) => left.localeCompare(right))
    .map((path) => ({ path, localValue: local.get(path), cloudValue: cloud.get(path) }));
}

export function conflictRecordName(collection: RealtimeCollectionKey, payload: CloudEntity | undefined, id: string) {
  if (!payload) return id;
  const record = payload as unknown as Record<string, unknown>;
  if (collection === 'contacts') {
    const name = `${String(record.firstName ?? '')} ${String(record.lastName ?? '')}`.trim();
    return name || id;
  }
  const title = record.title;
  return typeof title === 'string' && title.trim() ? title : id;
}

export function createCollaborationConflict(input: {
  workspaceId: string;
  localPayload?: CloudEntity;
  localVersion: number;
  localChangedAt: string;
  cloudRevision: number;
  remote: RemoteRecordChange;
}): CollaborationConflict {
  const payloadForName = input.localPayload ?? input.remote.payload;
  return {
    id: `${input.remote.collection}:${input.remote.id}`,
    workspaceId: input.workspaceId,
    collection: input.remote.collection,
    recordType: collectionLabels[input.remote.collection],
    recordId: input.remote.id,
    recordName: conflictRecordName(input.remote.collection, payloadForName, input.remote.id),
    localVersion: input.localVersion,
    cloudVersion: input.remote.version,
    cloudRevision: input.cloudRevision,
    localPayload: input.localPayload,
    cloudPayload: input.remote.payload,
    localChangedAt: input.localChangedAt,
    cloudChangedAt: input.remote.updatedAt,
    cloudActorId: input.remote.updatedBy,
    affectedFields: compareConflictFields(input.localPayload, input.remote.payload),
    deferred: false,
    detectedAt: new Date().toISOString(),
    cloudEventType: input.remote.eventType,
  };
}

export function conflictToRemoteChange(conflict: CollaborationConflict): RemoteRecordChange {
  return {
    workspaceId: conflict.workspaceId,
    collection: conflict.collection,
    eventType: conflict.cloudEventType,
    id: conflict.recordId,
    payload: conflict.cloudPayload,
    version: conflict.cloudVersion,
    updatedAt: conflict.cloudChangedAt,
    updatedBy: conflict.cloudActorId,
  };
}
