/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadState, resetState, saveState } from '../lib/storage';
import type { AppState, CallEvent, Contact, FollowUp, Property } from '../types/domain';

interface AppStoreValue extends AppState {
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Contact;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  addFollowUp: (followUp: Omit<FollowUp, 'id'>) => void;
  completeFollowUp: (id: string) => void;
  rescheduleFollowUp: (id: string, dueAt: string) => void;
  moveContactStage: (id: string, stage: Contact['stage']) => void;
  addProperty: (property: Omit<Property, 'id'>) => void;
  logCall: (event: Omit<CallEvent, 'id' | 'createdAt'>) => void;
  resetDemo: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => saveState(state), [state]);

  const value = useMemo<AppStoreValue>(() => ({
    ...state,
    addContact: (input) => {
      const contact: Contact = { ...input, id: createId(), createdAt: new Date().toISOString() };
      setState((current) => ({ ...current, contacts: [contact, ...current.contacts] }));
      return contact;
    },
    updateContact: (id, patch) => setState((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => contact.id === id ? { ...contact, ...patch } : contact),
    })),
    addFollowUp: (input) => setState((current) => ({
      ...current,
      followUps: [{ ...input, id: createId() }, ...current.followUps],
    })),
    completeFollowUp: (id) => setState((current) => ({
      ...current,
      followUps: current.followUps.map((followUp) => followUp.id === id ? { ...followUp, status: 'done' } : followUp),
    })),
    rescheduleFollowUp: (id, dueAt) => setState((current) => ({
      ...current,
      followUps: current.followUps.map((followUp) => followUp.id === id ? { ...followUp, dueAt, status: 'open' } : followUp),
    })),
    moveContactStage: (id, stage) => setState((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => contact.id === id ? { ...contact, stage } : contact),
    })),
    addProperty: (input) => setState((current) => ({
      ...current,
      properties: [{ ...input, id: createId() }, ...current.properties],
    })),
    logCall: (input) => setState((current) => ({
      ...current,
      callEvents: [{ ...input, id: createId(), createdAt: new Date().toISOString() }, ...current.callEvents],
      contacts: current.contacts.map((contact) => contact.id === input.contactId
        ? { ...contact, lastContactAt: new Date().toISOString() }
        : contact),
    })),
    resetDemo: () => {
      resetState();
      setState(loadState());
    },
  }), [state]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used within AppStoreProvider');
  return context;
}
