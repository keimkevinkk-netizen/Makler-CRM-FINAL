import { describe, expect, it } from 'vitest';
import {
  cancelOfflineAction,
  enqueueOfflineAction,
  getRunnableOfflineActions,
  hasPotentialVersionConflict,
  markOfflineActionConflict,
  markOfflineActionFailed,
  markOfflineActionRetry,
  retainOfflineQueueForIdentity,
} from '../src/features/offline/offlineQueue';

const baseInput = {
  workspaceId: 'workspace-a',
  actorId: 'user-a',
  actionType: 'prepare_note' as const,
  recordId: 'contact-1',
  expectedVersion: 4,
};

describe('offline queue', () => {
  it('keeps a stable chronological order', () => {
    const later = enqueueOfflineAction([], {
      ...baseInput,
      id: 'b',
      createdAt: '2026-07-14T10:05:00.000Z',
    });
    const queue = enqueueOfflineAction(later, {
      ...baseInput,
      id: 'a',
      recordId: 'contact-2',
      createdAt: '2026-07-14T10:00:00.000Z',
    });

    expect(queue.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('does not enqueue the same active action twice', () => {
    const queue = enqueueOfflineAction([], { ...baseInput, id: 'first' });
    const duplicate = enqueueOfflineAction(queue, { ...baseInput, id: 'second' });

    expect(duplicate).toHaveLength(1);
    expect(duplicate[0].id).toBe('first');
  });

  it('tracks retries and failures without changing queue order', () => {
    const queue = enqueueOfflineAction([], { ...baseInput, id: 'action-1' });
    const retrying = markOfflineActionRetry(queue, 'action-1', 'Netzwerk nicht verfügbar');
    const failed = markOfflineActionFailed(retrying, 'action-1', 'Maximale Versuche erreicht');

    expect(retrying[0]).toMatchObject({ attempt: 1, status: 'retrying' });
    expect(failed[0]).toMatchObject({ attempt: 1, status: 'failed', error: 'Maximale Versuche erreicht' });
    expect(getRunnableOfflineActions(failed)).toEqual([]);
  });

  it('marks an explicit conflict and excludes cancelled actions from execution', () => {
    const queue = enqueueOfflineAction([], { ...baseInput, id: 'action-1' });
    const conflicted = markOfflineActionConflict(queue, 'action-1', {
      detectedAt: '2026-07-14T10:10:00.000Z',
      reason: 'Cloud-Version ist neuer.',
      cloudVersion: 6,
    });
    const cancelled = cancelOfflineAction(conflicted, 'action-1', '2026-07-14T10:11:00.000Z');

    expect(conflicted[0].status).toBe('conflict');
    expect(conflicted[0].conflict?.cloudVersion).toBe(6);
    expect(cancelled[0]).toMatchObject({ status: 'cancelled', cancelledAt: '2026-07-14T10:11:00.000Z' });
    expect(getRunnableOfflineActions(cancelled)).toEqual([]);
  });

  it('detects a possible version conflict without claiming synchronization', () => {
    const [item] = enqueueOfflineAction([], { ...baseInput, id: 'action-1' });

    expect(hasPotentialVersionConflict(item, 4)).toBe(false);
    expect(hasPotentialVersionConflict(item, 5)).toBe(true);
  });

  it('purges drafts from other users and workspaces', () => {
    const own = enqueueOfflineAction([], { ...baseInput, id: 'own' });
    const otherWorkspace = enqueueOfflineAction(own, {
      ...baseInput,
      id: 'other-workspace',
      workspaceId: 'workspace-b',
      recordId: 'contact-2',
    });
    const mixed = enqueueOfflineAction(otherWorkspace, {
      ...baseInput,
      id: 'other-user',
      actorId: 'user-b',
      recordId: 'contact-3',
    });

    expect(retainOfflineQueueForIdentity(mixed, 'workspace-a', 'user-a').map((item) => item.id)).toEqual(['own']);
  });
});
