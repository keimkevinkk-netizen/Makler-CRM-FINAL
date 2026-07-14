/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { assertPermission } from '../auth/permissions';
import { useAuth } from '../auth/AuthContext';
import {
  createCollaborationConflict,
  conflictToRemoteChange,
  type CollaborationConflict,
} from '../collaboration/conflicts';
import {
  WorkspaceRealtimeManager,
  type RealtimeConnectionStatus,
} from '../collaboration/realtimeManager';
import { supabaseConfig } from '../config/runtime';
import {
  CloudConflictError,
  SupabaseWorkspaceCloudRepository,
  collectionItems,
  type CollectionKey,
  type CloudEntity,
  type RealtimeCollectionKey,
  type RelationalMutation,
} from '../data/cloudRepository';
import { exportState, importState, loadState, resetState, saveState } from '../lib/storage';
import type { AppState, AuditEntity, AuditEvent, CallEvent, Contact, FollowUp, Property } from '../types/domain';

export interface CloudSyncState {
  mode: 'local' | 'cloud';
  status: 'local' | 'loading' | 'saving' | 'synced' | 'offline' | 'conflict' | 'error';
  version: number;
  lastSyncedAt?: string;
  error?: string;
}

export interface RealtimeSyncState {
  status: RealtimeConnectionStatus;
  workspaceId?: string;
  lastEventAt?: string;
  error?: string;
}

interface AppStoreValue extends AppState {
  cloudSync: CloudSyncState;
  realtimeSync: RealtimeSyncState;
  conflicts: CollaborationConflict[];
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Contact;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  addFollowUp: (followUp: Omit<FollowUp, 'id'>) => void;
  completeFollowUp: (id: string) => void;
  rescheduleFollowUp: (id: string, dueAt: string) => void;
  moveContactStage: (id: string, stage: Contact['stage']) => void;
  addProperty: (property: Omit<Property, 'id'>) => void;
  logCall: (event: Omit<CallEvent, 'id' | 'createdAt'>) => void;
  acceptCloudConflict: (conflictId: string) => void;
  retryLocalConflict: (conflictId: string) => void;
  deferConflict: (conflictId: string) => void;
  reconnectRealtime: () => void;
  exportSnapshot: () => string;
  importSnapshot: (payload: string) => void;
  resetDemo: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const dirtyKey = (collection: RealtimeCollectionKey, id: string) => `${collection}:${id}`;

function withAudit(
  state: AppState,
  entity: AuditEntity,
  action: string,
  summary: string,
  entityId?: string,
): AppState {
  const event: AuditEvent = {
    id: createId(),
    actorId: state.currentUser.id,
    workspaceId: state.workspace.id,
    entity,
    entityId,
    action,
    summary,
    createdAt: new Date().toISOString(),
  };
  return { ...state, auditEvents: [event, ...state.auditEvents].slice(0, 500) };
}

function requireContact(state: AppState, contactId: string) {
  if (!state.contacts.some((contact) => contact.id === contactId)) {
    throw new Error('Der verknüpfte Kontakt existiert nicht.');
  }
}

function isRealtimeCollection(collection: CollectionKey): collection is RealtimeCollectionKey {
  return collection !== 'auditEvents';
}

function findEntity(state: AppState, collection: RealtimeCollectionKey, id: string): CloudEntity | undefined {
  return collectionItems(state, collection).find((record) => record.id === id);
}

function mergeConflicts(current: CollaborationConflict[], incoming: CollaborationConflict[]) {
  const merged = new Map(current.map((conflict) => [conflict.id, conflict]));
  for (const conflict of incoming) merged.set(conflict.id, conflict);
  return [...merged.values()].sort((left, right) => right.detectedAt.localeCompare(left.detectedAt));
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const cloudRepository = useMemo(() => new SupabaseWorkspaceCloudRepository(supabaseConfig), []);
  const realtimeManager = useMemo(() => new WorkspaceRealtimeManager(supabaseConfig), []);
  const [state, setState] = useState<AppState>(() => loadState());
  const stateRef = useRef(state);
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({ mode: 'local', status: 'local', version: 0 });
  const [realtimeSync, setRealtimeSync] = useState<RealtimeSyncState>({ status: supabaseConfig.configured ? 'connecting' : 'disabled' });
  const [conflicts, setConflicts] = useState<CollaborationConflict[]>([]);
  const [remoteGeneration, setRemoteGeneration] = useState(0);
  const cloudVersion = useRef(0);
  const remoteReady = useRef(false);
  const skipNextCloudSave = useRef(false);
  const localChanges = useRef(new Map<string, string>());

  const markLocalChange = useCallback((collection: RealtimeCollectionKey, id: string, changedAt = new Date().toISOString()) => {
    localChanges.current.set(dirtyKey(collection, id), changedAt);
  }, []);

  const markAllLocal = useCallback((previous: AppState, next: AppState) => {
    const changedAt = new Date().toISOString();
    (['contacts', 'followUps', 'properties', 'appointments', 'callEvents'] as const).forEach((collection) => {
      const ids = new Set([
        ...collectionItems(previous, collection).map((record) => record.id),
        ...collectionItems(next, collection).map((record) => record.id),
      ]);
      ids.forEach((id) => markLocalChange(collection, id, changedAt));
    });
  }, [markLocalChange]);

  const clearSavedMutations = (mutations: RelationalMutation[]) => {
    for (const mutation of mutations) {
      if (isRealtimeCollection(mutation.collection)) localChanges.current.delete(dirtyKey(mutation.collection, mutation.id));
    }
  };

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  useEffect(() => {
    let active = true;
    remoteReady.current = false;
    localChanges.current.clear();
    void Promise.resolve().then(() => { if (active) setConflicts([]); });

    if (!auth.configured) return;

    const session = auth.session;
    const membership = auth.membership;
    if (!session || !membership) return;

    setCloudSync((current) => ({ ...current, mode: 'cloud', status: 'loading', error: undefined }));
    void cloudRepository.load(membership.workspaceId, session.accessToken)
      .then((remote) => {
        if (!active) return;
        if (remote && remote.state.workspace.id !== membership.workspaceId) {
          throw new Error('Die Cloud-Daten gehören nicht zum angemeldeten Workspace.');
        }

        const source = remote?.state ?? stateRef.current;
        const securedState: AppState = {
          ...source,
          workspace: { ...source.workspace, id: membership.workspaceId },
          currentUser: {
            id: session.userId,
            workspaceId: membership.workspaceId,
            name: membership.displayName,
            email: session.email,
            role: membership.role,
          },
        };

        cloudVersion.current = remote?.version ?? 0;
        skipNextCloudSave.current = Boolean(remote);
        if (!remote) markAllLocal(stateRef.current, securedState);
        remoteReady.current = true;
        setRemoteGeneration((current) => current + 1);
        setState(securedState);
        setCloudSync({
          mode: 'cloud',
          status: 'synced',
          version: cloudVersion.current,
          lastSyncedAt: remote?.updatedAt,
        });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const message = reason instanceof Error ? reason.message : 'Cloud-Daten konnten nicht geladen werden.';
        setCloudSync({ mode: 'cloud', status: 'offline', version: cloudVersion.current, error: message });
      });

    return () => { active = false; };
  }, [auth.configured, auth.membership, auth.session, cloudRepository, markAllLocal]);

  useEffect(() => {
    const session = auth.session;
    const membership = auth.membership;
    if (!auth.configured || !session || !membership || !remoteReady.current) {
      realtimeManager.stop();
      setRealtimeSync({ status: auth.configured ? 'offline' : 'disabled' });
      return;
    }

    let active = true;
    realtimeManager.start({
      workspaceId: membership.workspaceId,
      userId: session.userId,
      accessToken: session.accessToken,
      onStatus: (update) => {
        if (!active) return;
        setRealtimeSync((current) => ({ ...current, ...update }));
      },
      onChange: (change) => {
        if (!active || change.workspaceId !== membership.workspaceId) return;
        if (change.updatedBy === session.userId) return;

        const changedAt = localChanges.current.get(dirtyKey(change.collection, change.id));
        if (changedAt) {
          void cloudRepository.getRevision(membership.workspaceId, session.accessToken)
            .catch(() => ({ revision: cloudVersion.current, updated_at: change.updatedAt }))
            .then((revision) => {
              if (!active) return;
              const conflict = createCollaborationConflict({
                workspaceId: membership.workspaceId,
                localPayload: findEntity(stateRef.current, change.collection, change.id),
                localVersion: cloudRepository.getVersion(change.collection, change.id),
                localChangedAt: changedAt,
                cloudRevision: revision.revision,
                remote: change,
              });
              setConflicts((current) => mergeConflicts(current, [conflict]));
              setCloudSync((current) => ({
                ...current,
                status: 'conflict',
                error: 'Eine parallele Änderung muss in der Konfliktzentrale geprüft werden.',
              }));
            });
          return;
        }

        skipNextCloudSave.current = true;
        setState((current) => cloudRepository.applyRemoteChange(current, change));
        setRealtimeSync((current) => ({ ...current, status: 'connected', lastEventAt: change.updatedAt, error: undefined }));
        void cloudRepository.getRevision(membership.workspaceId, session.accessToken).then((revision) => {
          if (!active) return;
          cloudVersion.current = Math.max(cloudVersion.current, revision.revision);
          setCloudSync((current) => ({
            ...current,
            status: 'synced',
            version: cloudVersion.current,
            lastSyncedAt: revision.updated_at,
            error: undefined,
          }));
        }).catch(() => undefined);
      },
    });

    return () => {
      active = false;
      realtimeManager.stop();
    };
  }, [auth.configured, auth.membership, auth.session, cloudRepository, realtimeManager, remoteGeneration]);

  useEffect(() => {
    const session = auth.session;
    const membership = auth.membership;
    if (!auth.configured || !session || !membership || !remoteReady.current || conflicts.length > 0) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      setCloudSync((current) => ({ ...current, mode: 'cloud', status: 'saving', error: undefined }));
      void cloudRepository.save(
        membership.workspaceId,
        state,
        session.accessToken,
        cloudVersion.current,
      ).then((saved) => {
        cloudVersion.current = saved.version;
        clearSavedMutations(saved.mutations);
        setCloudSync({
          mode: 'cloud',
          status: 'synced',
          version: saved.version,
          lastSyncedAt: saved.updatedAt,
        });
      }).catch(async (reason: unknown) => {
        if (reason instanceof CloudConflictError) {
          try {
            const snapshots = await cloudRepository.resolveConflictSnapshots(
              membership.workspaceId,
              session.accessToken,
              reason.mutations,
            );
            const detailed = snapshots.map(({ revision, record }) => createCollaborationConflict({
              workspaceId: membership.workspaceId,
              localPayload: findEntity(stateRef.current, record.collection, record.id),
              localVersion: cloudRepository.getVersion(record.collection, record.id),
              localChangedAt: localChanges.current.get(dirtyKey(record.collection, record.id)) ?? new Date().toISOString(),
              cloudRevision: revision,
              remote: record,
            }));
            setConflicts((current) => mergeConflicts(current, detailed));
          } catch {
            // The original conflict remains visible through the sync state even if detail loading fails.
          }
          setCloudSync({
            mode: 'cloud',
            status: 'conflict',
            version: cloudVersion.current,
            error: 'Parallele Änderungen wurden erkannt. Bitte die Konfliktzentrale öffnen.',
          });
          return;
        }
        const message = reason instanceof Error ? reason.message : 'Cloud-Daten konnten nicht gespeichert werden.';
        setCloudSync({ mode: 'cloud', status: 'offline', version: cloudVersion.current, error: message });
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [auth.configured, auth.membership, auth.session, cloudRepository, conflicts.length, state]);

  const value = useMemo<AppStoreValue>(() => ({
    ...state,
    cloudSync,
    realtimeSync,
    conflicts,
    addContact: (input) => {
      assertPermission(state.currentUser, 'contacts:write');
      const contact: Contact = { ...input, id: createId(), createdAt: new Date().toISOString() };
      markLocalChange('contacts', contact.id, contact.createdAt);
      setState((current) => withAudit(
        { ...current, contacts: [contact, ...current.contacts] },
        'contact',
        'created',
        `${contact.firstName} ${contact.lastName} wurde angelegt.`,
        contact.id,
      ));
      return contact;
    },
    updateContact: (id, patch) => {
      assertPermission(state.currentUser, 'contacts:write');
      markLocalChange('contacts', id);
      setState((current) => {
        requireContact(current, id);
        return withAudit(
          { ...current, contacts: current.contacts.map((contact) => contact.id === id ? { ...contact, ...patch, id } : contact) },
          'contact',
          'updated',
          'Kontaktdaten wurden aktualisiert.',
          id,
        );
      });
    },
    addFollowUp: (input) => {
      assertPermission(state.currentUser, 'followups:write');
      const id = createId();
      markLocalChange('followUps', id);
      setState((current) => {
        requireContact(current, input.contactId);
        const followUp: FollowUp = { ...input, id };
        return withAudit(
          { ...current, followUps: [followUp, ...current.followUps] },
          'followup',
          'created',
          followUp.title,
          followUp.id,
        );
      });
    },
    completeFollowUp: (id) => {
      assertPermission(state.currentUser, 'followups:write');
      markLocalChange('followUps', id);
      setState((current) => {
        if (!current.followUps.some((followUp) => followUp.id === id)) throw new Error('Follow-up wurde nicht gefunden.');
        return withAudit(
          { ...current, followUps: current.followUps.map((followUp) => followUp.id === id ? { ...followUp, status: 'done' } : followUp) },
          'followup',
          'completed',
          'Follow-up wurde erledigt.',
          id,
        );
      });
    },
    rescheduleFollowUp: (id, dueAt) => {
      assertPermission(state.currentUser, 'followups:write');
      markLocalChange('followUps', id);
      setState((current) => {
        if (!current.followUps.some((followUp) => followUp.id === id)) throw new Error('Follow-up wurde nicht gefunden.');
        return withAudit(
          { ...current, followUps: current.followUps.map((followUp) => followUp.id === id ? { ...followUp, dueAt, status: 'open' } : followUp) },
          'followup',
          'rescheduled',
          'Follow-up wurde neu terminiert.',
          id,
        );
      });
    },
    moveContactStage: (id, stage) => {
      assertPermission(state.currentUser, 'pipeline:write');
      markLocalChange('contacts', id);
      setState((current) => {
        requireContact(current, id);
        return withAudit(
          { ...current, contacts: current.contacts.map((contact) => contact.id === id ? { ...contact, stage } : contact) },
          'contact',
          'stage_changed',
          `Pipeline-Status wurde auf ${stage} gesetzt.`,
          id,
        );
      });
    },
    addProperty: (input) => {
      assertPermission(state.currentUser, 'properties:write');
      const id = createId();
      markLocalChange('properties', id);
      setState((current) => {
        if (input.ownerContactId) requireContact(current, input.ownerContactId);
        const property: Property = { ...input, id };
        return withAudit(
          { ...current, properties: [property, ...current.properties] },
          'property',
          'created',
          property.title,
          property.id,
        );
      });
    },
    logCall: (input) => {
      assertPermission(state.currentUser, 'calls:write');
      const id = createId();
      const now = new Date().toISOString();
      markLocalChange('callEvents', id, now);
      markLocalChange('contacts', input.contactId, now);
      setState((current) => {
        requireContact(current, input.contactId);
        const call: CallEvent = { ...input, id, createdAt: now };
        return withAudit({
          ...current,
          callEvents: [call, ...current.callEvents],
          contacts: current.contacts.map((contact) => contact.id === input.contactId
            ? { ...contact, lastContactAt: now }
            : contact),
        }, 'call', 'logged', `Telefonergebnis: ${input.outcome}`, call.id);
      });
    },
    acceptCloudConflict: (conflictId) => {
      const conflict = conflicts.find((item) => item.id === conflictId);
      if (!conflict) return;
      const remote = conflictToRemoteChange(conflict);
      skipNextCloudSave.current = true;
      localChanges.current.delete(dirtyKey(conflict.collection, conflict.recordId));
      cloudVersion.current = Math.max(cloudVersion.current, conflict.cloudRevision);
      setState((current) => cloudRepository.applyRemoteChange(current, remote));
      setConflicts((current) => current.filter((item) => item.id !== conflictId));
      setCloudSync((current) => ({ ...current, status: 'synced', version: cloudVersion.current, error: undefined }));
    },
    retryLocalConflict: (conflictId) => {
      const conflict = conflicts.find((item) => item.id === conflictId);
      if (!conflict) return;
      cloudRepository.prepareLocalRetry(conflictToRemoteChange(conflict));
      cloudVersion.current = Math.max(cloudVersion.current, conflict.cloudRevision);
      markLocalChange(conflict.collection, conflict.recordId);
      setConflicts((current) => current.filter((item) => item.id !== conflictId));
      setState((current) => ({ ...current }));
      setCloudSync((current) => ({ ...current, status: 'saving', version: cloudVersion.current, error: undefined }));
    },
    deferConflict: (conflictId) => {
      setConflicts((current) => current.map((item) => item.id === conflictId ? { ...item, deferred: true } : item));
    },
    reconnectRealtime: () => realtimeManager.reconnect(),
    exportSnapshot: () => {
      assertPermission(state.currentUser, 'backup:manage');
      return exportState(state);
    },
    importSnapshot: (payload) => {
      assertPermission(state.currentUser, 'backup:manage');
      const imported = importState(payload, state.workspace.id);
      markAllLocal(stateRef.current, imported);
      setState(withAudit(imported, 'backup', 'imported', 'Eine geprüfte Workspace-Sicherung wurde importiert.'));
    },
    resetDemo: () => {
      assertPermission(state.currentUser, 'backup:manage');
      resetState();
      const reset = { ...loadState(), workspace: state.workspace, currentUser: state.currentUser };
      markAllLocal(stateRef.current, reset);
      setState(withAudit(reset, 'workspace', 'demo_reset', 'Die lokalen VINCERE-Demodaten wurden zurückgesetzt.'));
    },
  }), [cloudRepository, cloudSync, conflicts, markAllLocal, markLocalChange, realtimeManager, realtimeSync, state]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used within AppStoreProvider');
  return context;
}
