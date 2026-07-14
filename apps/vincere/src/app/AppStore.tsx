/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { assertPermission } from '../auth/permissions';
import { useAuth } from '../auth/AuthContext';
import { supabaseConfig } from '../config/runtime';
import { SupabaseWorkspaceCloudRepository } from '../data/cloudRepository';
import { exportState, importState, loadState, resetState, saveState } from '../lib/storage';
import type { AppState, AuditEntity, AuditEvent, CallEvent, Contact, FollowUp, Property } from '../types/domain';

export interface CloudSyncState {
  mode: 'local' | 'cloud';
  status: 'local' | 'loading' | 'saving' | 'synced' | 'offline' | 'conflict' | 'error';
  version: number;
  lastSyncedAt?: string;
  error?: string;
}

interface AppStoreValue extends AppState {
  cloudSync: CloudSyncState;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Contact;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  addFollowUp: (followUp: Omit<FollowUp, 'id'>) => void;
  completeFollowUp: (id: string) => void;
  rescheduleFollowUp: (id: string, dueAt: string) => void;
  moveContactStage: (id: string, stage: Contact['stage']) => void;
  addProperty: (property: Omit<Property, 'id'>) => void;
  logCall: (event: Omit<CallEvent, 'id' | 'createdAt'>) => void;
  exportSnapshot: () => string;
  importSnapshot: (payload: string) => void;
  resetDemo: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

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

function isConflictError(message: string) {
  return message.toLowerCase().includes('version conflict') || message.toLowerCase().includes('versionskonflikt');
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const cloudRepository = useMemo(() => new SupabaseWorkspaceCloudRepository(supabaseConfig), []);
  const [state, setState] = useState<AppState>(() => loadState());
  const stateRef = useRef(state);
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({ mode: 'local', status: 'local', version: 0 });
  const cloudVersion = useRef(0);
  const remoteReady = useRef(false);
  const skipNextCloudSave = useRef(false);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  useEffect(() => {
    let active = true;
    remoteReady.current = false;

    if (!auth.configured) return;

    const session = auth.session;
    const membership = auth.membership;
    if (!session || !membership) return;

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
        remoteReady.current = true;
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
  }, [auth.configured, auth.membership, auth.session, cloudRepository]);

  useEffect(() => {
    const session = auth.session;
    const membership = auth.membership;
    if (!auth.configured || !session || !membership || !remoteReady.current) return;
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
        setCloudSync({
          mode: 'cloud',
          status: 'synced',
          version: saved.version,
          lastSyncedAt: saved.updatedAt,
        });
      }).catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : 'Cloud-Daten konnten nicht gespeichert werden.';
        setCloudSync({
          mode: 'cloud',
          status: isConflictError(message) ? 'conflict' : 'offline',
          version: cloudVersion.current,
          error: message,
        });
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [auth.configured, auth.membership, auth.session, cloudRepository, state]);

  const value = useMemo<AppStoreValue>(() => ({
    ...state,
    cloudSync,
    addContact: (input) => {
      assertPermission(state.currentUser, 'contacts:write');
      const contact: Contact = { ...input, id: createId(), createdAt: new Date().toISOString() };
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
      setState((current) => {
        requireContact(current, input.contactId);
        const followUp: FollowUp = { ...input, id: createId() };
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
      setState((current) => {
        if (input.ownerContactId) requireContact(current, input.ownerContactId);
        const property: Property = { ...input, id: createId() };
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
      setState((current) => {
        requireContact(current, input.contactId);
        const now = new Date().toISOString();
        const call: CallEvent = { ...input, id: createId(), createdAt: now };
        return withAudit({
          ...current,
          callEvents: [call, ...current.callEvents],
          contacts: current.contacts.map((contact) => contact.id === input.contactId
            ? { ...contact, lastContactAt: now }
            : contact),
        }, 'call', 'logged', `Telefonergebnis: ${input.outcome}`, call.id);
      });
    },
    exportSnapshot: () => {
      assertPermission(state.currentUser, 'backup:manage');
      return exportState(state);
    },
    importSnapshot: (payload) => {
      assertPermission(state.currentUser, 'backup:manage');
      const imported = importState(payload, state.workspace.id);
      setState(withAudit(imported, 'backup', 'imported', 'Eine geprüfte Workspace-Sicherung wurde importiert.'));
    },
    resetDemo: () => {
      assertPermission(state.currentUser, 'backup:manage');
      resetState();
      const reset = { ...loadState(), workspace: state.workspace, currentUser: state.currentUser };
      setState(withAudit(reset, 'workspace', 'demo_reset', 'Die lokalen VINCERE-Demodaten wurden zurückgesetzt.'));
    },
  }), [cloudSync, state]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used within AppStoreProvider');
  return context;
}
