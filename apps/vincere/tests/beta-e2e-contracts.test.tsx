import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStoreProvider, useAppStore } from '../src/app/AppStore';
import { AuthProvider } from '../src/auth/AuthContext';
import { SupabaseRestAuthClient } from '../src/auth/cloudAuth';
import type { SupabaseRuntimeConfig } from '../src/config/runtime';
import { SupabaseWorkspaceCloudRepository } from '../src/data/cloudRepository';
import { LocalStorageWorkspaceRepository } from '../src/data/repository';
import { createEmptyState, seedState } from '../src/data/seed';
import { appRepository } from '../src/lib/storage';
import { inMemoryObservability, installGlobalErrorMonitoring } from '../src/observability/observability';
import type { AppState } from '../src/types/domain';

const config: SupabaseRuntimeConfig = {
  url: 'https://project.supabase.co',
  publishableKey: 'sb_publishable_browser_key',
  configured: true,
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

function renderStore(initialState?: AppState) {
  if (initialState) appRepository.save(initialState);
  let current: ReturnType<typeof useAppStore> | null = null;

  function Harness() {
    current = useAppStore();
    return <div data-testid="store-ready" />;
  }

  const view = render(
    <AuthProvider>
      <AppStoreProvider><Harness /></AppStoreProvider>
    </AuthProvider>,
  );

  return {
    view,
    getStore: () => {
      if (!current) throw new Error('Store wurde nicht initialisiert.');
      return current;
    },
  };
}

const newContact = {
  firstName: 'Beta',
  lastName: 'Tester',
  phone: '+49 160 0000000',
  email: 'beta@example.test',
  city: 'Bruchköbel',
  source: 'Private Beta',
  role: 'Eigentümer' as const,
  stage: 'lead' as const,
  priority: 'high' as const,
  potential: 80,
  notes: 'E2E-Testkontakt',
};

describe('VINCERE private beta E2E contracts', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    inMemoryObservability.clear();
  });

  afterEach(() => cleanup());

  it('Anmeldung: authentifiziert und löst die Workspace-Mitgliedschaft auf', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'user-1', email: 'beta@example.test' },
      }))
      .mockResolvedValueOnce(jsonResponse([{
        workspace_id: 'workspace-beta',
        role: 'owner',
        display_name: 'Beta Tester',
      }]));
    const client = new SupabaseRestAuthClient(config, sessionStorage, fetcher);

    const session = await client.signIn('beta@example.test', 'secure-password');
    const membership = await client.getMembership(session);

    expect(membership).toEqual({ workspaceId: 'workspace-beta', role: 'owner', displayName: 'Beta Tester' });
  });

  it('Kontakt anlegen: erstellt Kontakt und Auditereignis', () => {
    const { getStore } = renderStore();
    const before = getStore().contacts.length;
    let contactId = '';

    act(() => { contactId = getStore().addContact(newContact).id; });

    expect(getStore().contacts).toHaveLength(before + 1);
    expect(getStore().auditEvents.some((event) => event.entityId === contactId && event.action === 'created')).toBe(true);
  });

  it('Follow-up anlegen: verknüpft nur mit vorhandenem Kontakt', () => {
    const { getStore } = renderStore();
    let contactId = '';
    act(() => { contactId = getStore().addContact(newContact).id; });

    act(() => getStore().addFollowUp({
      contactId,
      title: 'Beta-Follow-up',
      dueAt: new Date(Date.now() + 3_600_000).toISOString(),
      priority: 'high',
      status: 'open',
      channel: 'phone',
    }));

    expect(getStore().followUps.some((followUp) => followUp.contactId === contactId)).toBe(true);
  });

  it('Gespräch protokollieren: aktualisiert Historie und letzten Kontakt', () => {
    const { getStore } = renderStore();
    const contactId = getStore().contacts[0].id;

    act(() => getStore().logCall({ contactId, outcome: 'conversation', note: 'Beta-Gespräch' }));

    expect(getStore().callEvents[0]).toMatchObject({ contactId, outcome: 'conversation' });
    expect(getStore().contacts.find((contact) => contact.id === contactId)?.lastContactAt).toBeTruthy();
  });

  it('Termin anzeigen: stellt vorhandene Workspace-Termine bereit', () => {
    const { getStore } = renderStore();

    expect(getStore().appointments.length).toBeGreaterThan(0);
    expect(getStore().appointments[0]).toHaveProperty('startsAt');
  });

  it('Immobilie anlegen: wahrt die Eigentümerbeziehung', () => {
    const { getStore } = renderStore();
    const ownerContactId = getStore().contacts[0].id;

    act(() => getStore().addProperty({
      title: 'Beta-Immobilie',
      address: 'Teststraße 1',
      city: 'Schöneck',
      type: 'Einfamilienhaus',
      status: 'Akquise',
      estimatedValue: 500000,
      ownerContactId,
    }));

    expect(getStore().properties[0]).toMatchObject({ title: 'Beta-Immobilie', ownerContactId });
  });

  it('Konflikt auslösen: überschreibt eine fremde Revision nicht stillschweigend', async () => {
    const fetcher = vi.fn().mockImplementation((input: string) => {
      if (input.includes('/rpc/sync_vincere_records')) return Promise.resolve(jsonResponse({ message: 'revision conflict' }, 409));
      if (input.includes('/workspaces?')) return Promise.resolve(jsonResponse([{
        id: seedState.workspace.id,
        name: seedState.workspace.name,
        region: seedState.workspace.region,
        created_at: seedState.workspace.createdAt,
      }]));
      if (input.includes('/workspace_sync_revisions?')) return Promise.resolve(jsonResponse([{ revision: 3, updated_at: new Date().toISOString() }]));
      return Promise.resolve(jsonResponse([]));
    });
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);
    const loaded = await repository.load(seedState.workspace.id, 'token');
    const changed = structuredClone(loaded?.state ?? createEmptyState());
    changed.contacts = [seedState.contacts[0]];

    await expect(repository.save(seedState.workspace.id, changed, 'token', 3)).rejects.toThrow(/version conflict/);
  });

  it('Offline und Reconnect: erfasst beide Netzwerkzustände kontrolliert', () => {
    const dispose = installGlobalErrorMonitoring();

    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));

    expect(inMemoryObservability.events().map((event) => event.name)).toEqual(expect.arrayContaining(['network.offline', 'network.online']));
    dispose();
  });

  it('Viewer-Schreibschutz: verweigert mutierende Kontaktaktionen', () => {
    const viewerState = structuredClone(seedState);
    viewerState.currentUser.role = 'viewer';
    const { getStore } = renderStore(viewerState);

    expect(() => getStore().addContact(newContact)).toThrow(/Fehlende Berechtigung/);
  });

  it('Datenexport: erstellt ein versioniertes Workspace-Envelope', () => {
    const { getStore } = renderStore();
    const exported = JSON.parse(getStore().exportSnapshot()) as { format: string; workspaceId: string; schemaVersion: number };

    expect(exported).toMatchObject({
      format: 'vincere-workspace',
      workspaceId: seedState.workspace.id,
      schemaVersion: 2,
    });
  });

  it('Kontrollierter Import: lehnt einen fremden Workspace ab', () => {
    const { getStore } = renderStore();
    const foreign = structuredClone(seedState);
    foreign.workspace.id = 'workspace-foreign';
    foreign.currentUser.workspaceId = 'workspace-foreign';

    expect(() => getStore().importSnapshot(JSON.stringify({ state: foreign }))).toThrow(/anderen VINCERE-Workspace/);
  });

  it('Abmeldung: entfernt lokal gehaltene Sitzungstokens', async () => {
    sessionStorage.setItem('vincere_auth_session_v1', JSON.stringify({ accessToken: 'token' }));
    const client = new SupabaseRestAuthClient(config, sessionStorage, vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await client.signOut({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      userId: 'user-1',
      email: 'beta@example.test',
    });

    expect(sessionStorage.getItem('vincere_auth_session_v1')).toBeNull();
  });

  it('Workspace-Isolation: getrennte Speicherbereiche lesen keine fremden Datensätze', () => {
    const empty = createEmptyState();
    const first = new LocalStorageWorkspaceRepository({ storage: localStorage, storageKey: 'workspace-a', fallbackState: empty, allowLegacyMigration: false });
    const second = new LocalStorageWorkspaceRepository({ storage: localStorage, storageKey: 'workspace-b', fallbackState: empty, allowLegacyMigration: false });

    first.save(seedState);

    expect(first.load().contacts.length).toBeGreaterThan(0);
    expect(second.load().contacts).toHaveLength(0);
  });
});
