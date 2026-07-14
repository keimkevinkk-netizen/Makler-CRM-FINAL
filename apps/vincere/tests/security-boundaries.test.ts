import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseRestAuthClient } from '../src/auth/cloudAuth';
import { assertPermission } from '../src/auth/permissions';
import type { SupabaseRuntimeConfig } from '../src/config/runtime';
import { SupabaseWorkspaceCloudRepository } from '../src/data/cloudRepository';
import { LocalStorageWorkspaceRepository } from '../src/data/repository';
import { createEmptyState, seedState } from '../src/data/seed';

const config: SupabaseRuntimeConfig = {
  url: 'https://project.supabase.co',
  publishableKey: 'sb_publishable_browser_key',
  configured: true,
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

describe('VINCERE security boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores browser sessions in session storage instead of persistent local storage', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      user: { id: 'user-1', email: 'user@example.test' },
    }));
    const client = new SupabaseRestAuthClient(config, sessionStorage, fetcher);

    await client.signIn('user@example.test', 'secure-password');

    expect(sessionStorage.getItem('vincere_auth_session_v1')).not.toBeNull();
    expect(localStorage.getItem('vincere_auth_session_v1')).toBeNull();
  });

  it('keeps local environment stores isolated', () => {
    const empty = createEmptyState();
    const betaRepository = new LocalStorageWorkspaceRepository({
      storage: localStorage,
      storageKey: 'vincere_beta_live',
      fallbackState: empty,
      allowLegacyMigration: false,
    });
    const previewRepository = new LocalStorageWorkspaceRepository({
      storage: localStorage,
      storageKey: 'vincere_preview_demo',
      fallbackState: empty,
      allowLegacyMigration: false,
    });

    betaRepository.save(seedState);

    expect(betaRepository.load().contacts).toHaveLength(seedState.contacts.length);
    expect(previewRepository.load().contacts).toHaveLength(0);
  });

  it('blocks viewer mutations', () => {
    const viewer = { ...seedState.currentUser, role: 'viewer' as const };

    expect(() => assertPermission(viewer, 'contacts:write')).toThrow(/Fehlende Berechtigung/);
    expect(() => assertPermission(viewer, 'backup:manage')).toThrow(/Fehlende Berechtigung/);
  });

  it('refuses cloud writes before the requested workspace has been loaded', async () => {
    const repository = new SupabaseWorkspaceCloudRepository(config, vi.fn());

    await expect(repository.save(seedState.workspace.id, seedState, 'token', 0))
      .rejects.toThrow(/Workspace-Wechsel|geladen/);
  });

  it('rejects imported data from a foreign workspace and preserves trusted identity', () => {
    const repository = new LocalStorageWorkspaceRepository({ storage: localStorage });
    repository.save(seedState);
    const foreign = structuredClone(seedState);
    foreign.workspace.id = 'workspace-foreign';
    foreign.currentUser = {
      id: 'attacker',
      workspaceId: 'workspace-foreign',
      name: 'Untrusted',
      email: 'untrusted@example.test',
      role: 'owner',
    };

    expect(() => repository.importSnapshot(
      JSON.stringify(repository.exportSnapshot(foreign)),
      seedState.workspace.id,
    )).toThrow(/anderen VINCERE-Workspace/);
  });
});
