export type OfflineActionType =
  | 'create_followup'
  | 'record_call_outcome'
  | 'prepare_note'
  | 'open_appointment_briefing'
  | 'request_next_action';

export type OfflineQueueStatus = 'pending' | 'retrying' | 'failed' | 'conflict' | 'cancelled';

export interface OfflineConflictState {
  detectedAt: string;
  reason: string;
  cloudVersion?: number;
}

export interface OfflineQueueItem {
  id: string;
  workspaceId: string;
  actorId: string;
  actionType: OfflineActionType;
  recordId: string;
  expectedVersion?: number;
  createdAt: string;
  attempt: number;
  status: OfflineQueueStatus;
  error?: string;
  conflict?: OfflineConflictState;
  cancelledAt?: string;
}

export interface EnqueueOfflineActionInput {
  id?: string;
  workspaceId: string;
  actorId: string;
  actionType: OfflineActionType;
  recordId: string;
  expectedVersion?: number;
  createdAt?: string;
}

const activeStatuses = new Set<OfflineQueueStatus>(['pending', 'retrying', 'failed', 'conflict']);

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function compareQueueItems(left: OfflineQueueItem, right: OfflineQueueItem) {
  const byTime = left.createdAt.localeCompare(right.createdAt);
  return byTime || left.id.localeCompare(right.id);
}

function isDuplicate(queueItem: OfflineQueueItem, input: EnqueueOfflineActionInput) {
  return activeStatuses.has(queueItem.status)
    && queueItem.workspaceId === input.workspaceId
    && queueItem.actorId === input.actorId
    && queueItem.actionType === input.actionType
    && queueItem.recordId === input.recordId
    && queueItem.expectedVersion === input.expectedVersion;
}

export function enqueueOfflineAction(
  queue: OfflineQueueItem[],
  input: EnqueueOfflineActionInput,
): OfflineQueueItem[] {
  if (queue.some((item) => isDuplicate(item, input))) return queue;

  const item: OfflineQueueItem = {
    id: input.id ?? createId(),
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    actionType: input.actionType,
    recordId: input.recordId,
    expectedVersion: input.expectedVersion,
    createdAt: input.createdAt ?? new Date().toISOString(),
    attempt: 0,
    status: 'pending',
  };

  return [...queue, item].sort(compareQueueItems);
}

export function getRunnableOfflineActions(queue: OfflineQueueItem[]) {
  return queue
    .filter((item) => item.status === 'pending' || item.status === 'retrying')
    .sort(compareQueueItems);
}

export function markOfflineActionRetry(
  queue: OfflineQueueItem[],
  id: string,
  error?: string,
): OfflineQueueItem[] {
  return queue.map((item) => item.id === id
    ? { ...item, attempt: item.attempt + 1, status: 'retrying' as const, error }
    : item);
}

export function markOfflineActionFailed(
  queue: OfflineQueueItem[],
  id: string,
  error: string,
): OfflineQueueItem[] {
  return queue.map((item) => item.id === id
    ? { ...item, status: 'failed' as const, error }
    : item);
}

export function markOfflineActionConflict(
  queue: OfflineQueueItem[],
  id: string,
  conflict: OfflineConflictState,
): OfflineQueueItem[] {
  return queue.map((item) => item.id === id
    ? { ...item, status: 'conflict' as const, conflict, error: undefined }
    : item);
}

export function cancelOfflineAction(
  queue: OfflineQueueItem[],
  id: string,
  cancelledAt = new Date().toISOString(),
): OfflineQueueItem[] {
  return queue.map((item) => item.id === id
    ? { ...item, status: 'cancelled' as const, cancelledAt }
    : item);
}

export function retainOfflineQueueForIdentity(
  queue: OfflineQueueItem[],
  workspaceId: string,
  actorId: string,
): OfflineQueueItem[] {
  return queue.filter((item) => item.workspaceId === workspaceId && item.actorId === actorId);
}

export function hasPotentialVersionConflict(
  item: OfflineQueueItem,
  confirmedCloudVersion: number,
) {
  return typeof item.expectedVersion === 'number'
    && confirmedCloudVersion > item.expectedVersion
    && item.status !== 'cancelled';
}
