import { describe, expect, it } from 'vitest';
import { deriveOfflineStatus } from '../src/features/offline/offlineStatus';

const base = {
  online: true,
  reconnected: false,
  pendingCount: 0,
  conflictCount: 0,
  cloudStatus: 'synced' as const,
  lastConfirmedAt: '2026-07-14T08:00:00.000Z',
  updateAvailable: false,
};

describe('offline status model', () => {
  it('shows offline and pending drafts without calling them synchronized', () => {
    const status = deriveOfflineStatus({ ...base, online: false, pendingCount: 2 });

    expect(status.code).toBe('offline');
    expect(status.detail).toContain('2 lokale Entwürfe');
    expect(status.detail.toLowerCase()).not.toContain('synchronisiert');
  });

  it('keeps synchronization paused after reconnect when drafts exist', () => {
    const status = deriveOfflineStatus({ ...base, reconnected: true, pendingCount: 1 });

    expect(status.code).toBe('reconnected');
    expect(status.detail).toContain('Synchronisation bleibt pausiert');
  });

  it('surfaces a possible conflict before an update notice', () => {
    const status = deriveOfflineStatus({
      ...base,
      pendingCount: 1,
      conflictCount: 1,
      updateAvailable: true,
    });

    expect(status.code).toBe('conflict_possible');
  });

  it('shows an update only when no local draft blocks it', () => {
    const status = deriveOfflineStatus({ ...base, updateAvailable: true });

    expect(status.code).toBe('update_available');
  });

  it('shows the last confirmed cloud state', () => {
    const status = deriveOfflineStatus(base);

    expect(status.code).toBe('online');
    expect(status.detail).toContain('Letzter bestätigter Cloud-Stand');
  });
});
