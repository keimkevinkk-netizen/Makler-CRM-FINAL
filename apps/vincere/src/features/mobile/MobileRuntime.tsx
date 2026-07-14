import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../app/AppStore';
import { usePwaRuntime } from '../../pwa/pwaRuntime';
import {
  cancelOfflineAction,
  enqueueOfflineAction,
  hasPotentialVersionConflict,
  type OfflineQueueItem,
} from '../offline/offlineQueue';
import { OfflineStatusBanner } from '../offline/OfflineStatusBanner';
import { deriveOfflineStatus } from '../offline/offlineStatus';
import { MobileNavigation } from './MobileNavigation';
import { MobileQuickActions, type MobileDraftInput } from './MobileQuickActions';

function useConnectivityState() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [reconnected, setReconnected] = useState(false);
  const reconnectTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onOffline = () => {
      window.clearTimeout(reconnectTimer.current);
      setOnline(false);
      setReconnected(false);
    };
    const onOnline = () => {
      setOnline(true);
      setReconnected(true);
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = window.setTimeout(() => setReconnected(false), 8000);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearTimeout(reconnectTimer.current);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return { online, reconnected };
}

export function MobileRuntime() {
  const { workspace, currentUser, cloudSync, conflicts } = useAppStore();
  const pwa = usePwaRuntime();
  const { online, reconnected } = useConnectivityState();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [drafts, setDrafts] = useState<MobileDraftInput[]>([]);
  const identityRef = useRef(`${workspace.id}:${currentUser.id}`);
  const identityKey = `${workspace.id}:${currentUser.id}`;

  const clearTemporaryState = useCallback(() => {
    setQueue([]);
    setDrafts([]);
    setQuickActionsOpen(false);
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_TEMPORARY_STATE' });
  }, []);

  useEffect(() => {
    if (identityRef.current !== identityKey) {
      identityRef.current = identityKey;
      clearTemporaryState();
    }
  }, [clearTemporaryState, identityKey]);

  useEffect(() => {
    window.addEventListener('vincere:logout', clearTemporaryState);
    return () => window.removeEventListener('vincere:logout', clearTemporaryState);
  }, [clearTemporaryState]);

  const stageDraft = useCallback((draft: MobileDraftInput) => {
    setDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft]);
    setQueue((current) => enqueueOfflineAction(current, {
      id: draft.id,
      workspaceId: workspace.id,
      actorId: currentUser.id,
      actionType: draft.actionType,
      recordId: draft.recordId,
      expectedVersion: cloudSync.version,
    }));
  }, [cloudSync.version, currentUser.id, workspace.id]);

  const cancelDraft = useCallback((id: string) => {
    setQueue((current) => cancelOfflineAction(current, id));
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }, []);

  const activeQueue = useMemo(
    () => queue.filter((item) => item.status !== 'cancelled'),
    [queue],
  );
  const potentialConflictCount = useMemo(
    () => activeQueue.filter((item) => hasPotentialVersionConflict(item, cloudSync.version)).length,
    [activeQueue, cloudSync.version],
  );
  const status = deriveOfflineStatus({
    online,
    reconnected,
    pendingCount: activeQueue.length,
    conflictCount: conflicts.length + potentialConflictCount,
    cloudStatus: cloudSync.status,
    lastConfirmedAt: cloudSync.lastSyncedAt,
    updateAvailable: pwa.status === 'update_available',
  });

  return (
    <div className="mobile-runtime" data-pwa-status={pwa.status} data-offline-status={status.code}>
      <OfflineStatusBanner status={status} version={pwa.version} onApplyUpdate={pwa.applyUpdate} />
      <MobileNavigation onOpenQuickActions={() => setQuickActionsOpen(true)} version={pwa.version} />
      <MobileQuickActions
        key={identityKey}
        open={quickActionsOpen}
        drafts={drafts}
        pendingActions={activeQueue}
        onClose={() => setQuickActionsOpen(false)}
        onStageDraft={stageDraft}
        onCancelDraft={cancelDraft}
      />
    </div>
  );
}
