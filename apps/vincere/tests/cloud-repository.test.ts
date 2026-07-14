import { describe, expect, it, vi } from 'vitest';
import { buildRelationalMutations, SupabaseWorkspaceCloudRepository, type EntityVersionMap } from '../src/data/cloudRepository';
import { seedState } from '../src/data/seed';
import type { SupabaseRuntimeConfig } from '../src/config/runtime';

const config: SupabaseRuntimeConfig = {
  url: 'https://project.supabase.co',
  publishableKey: 'public-key',
  configured: true,
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const emptyVersions = (): EntityVersionMap => ({
  contacts: {}, followUps: {}, properties: {}, appointments: {}, callEvents: {}, auditEvents: {},
});

function cloudReadResponse(input: string, revision = 7) {
  if (input.includes('/workspaces?')) return jsonResponse([{
    id: seedState.workspace.id,
    name: seedState.workspace.name,
    region: seedState.workspace.region,
    created_at: seedState.workspace.createdAt,
  }]);
  if (input.includes('/workspace_sync_revisions?')) return jsonResponse([{
    revision,
    updated_at: '2026-07-14T08:00:00.000Z',
  }]);
  return jsonResponse([]);
}

describe('SupabaseWorkspaceCloudRepository', () => {
  it('loads relational records only from the requested workspace', async () => {
    const fetcher = vi.fn().mockImplementation((input: string) => {
      if (input.includes('/workspaces?')) return Promise.resolve(jsonResponse([{
        id: seedState.workspace.id,
        name: seedState.workspace.name,
        region: seedState.workspace.region,
        created_at: seedState.workspace.createdAt,
      }]));
      if (input.includes('/workspace_sync_revisions?')) return Promise.resolve(jsonResponse([{
        revision: 7,
        updated_at: '2026-07-14T08:00:00.000Z',
      }]));
      if (input.includes('/contacts?')) return Promise.resolve(jsonResponse([{
        id: seedState.contacts[0].id,
        payload: seedState.contacts[0],
        version: 3,
        updated_at: '2026-07-14T07:59:00.000Z',
      }]));
      return Promise.resolve(jsonResponse([]));
    });
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);

    const result = await repository.load(seedState.workspace.id, 'access-token');

    expect(result?.version).toBe(7);
    expect(result?.state.contacts).toEqual([seedState.contacts[0]]);
    expect(result?.state.followUps).toEqual([]);
    expect(fetcher.mock.calls.every(([url]) => String(url).includes(`workspace_id=eq.${seedState.workspace.id}`)
      || String(url).includes(`id=eq.${seedState.workspace.id}`))).toBe(true);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer access-token' });
  });

  it('saves individual record mutations through the workspace revision RPC', async () => {
    const fetcher = vi.fn().mockImplementation((input: string) => {
      if (input.includes('/rpc/sync_vincere_records')) return Promise.resolve(jsonResponse({
        revision: 8,
        updated_at: '2026-07-14T08:05:00.000Z',
      }));
      return Promise.resolve(cloudReadResponse(input));
    });
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);
    const loaded = await repository.load(seedState.workspace.id, 'access-token');
    expect(loaded?.version).toBe(7);

    const result = await repository.save(seedState.workspace.id, seedState, 'access-token', 7);
    const rpcCall = fetcher.mock.calls.find(([url]) => String(url).includes('/rpc/sync_vincere_records'));
    const request = rpcCall?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      p_expected_revision: number;
      p_workspace_id: string;
      p_mutations: Array<{ collection: string; operation: string }>;
    };

    expect(result.version).toBe(8);
    expect(body.p_expected_revision).toBe(7);
    expect(body.p_workspace_id).toBe(seedState.workspace.id);
    expect(body.p_mutations.some((mutation) => mutation.collection === 'contacts' && mutation.operation === 'upsert')).toBe(true);
    expect(body.p_mutations.some((mutation) => mutation.collection === 'followUps')).toBe(true);
  });

  it('creates only changed mutations and deletes dependants before contacts', () => {
    const baseline = structuredClone(seedState);
    const current = structuredClone(seedState);
    current.contacts[0].city = 'Schöneck';
    current.followUps = current.followUps.filter((item) => item.contactId !== current.contacts[1].id);
    current.contacts = current.contacts.filter((item) => item.id !== baseline.contacts[1].id);

    const versions = emptyVersions();
    versions.contacts[baseline.contacts[0].id] = 4;
    versions.contacts[baseline.contacts[1].id] = 2;
    for (const followUp of baseline.followUps) versions.followUps[followUp.id] = 3;

    const mutations = buildRelationalMutations(current, baseline, versions);
    const contactUpdate = mutations.find((mutation) => mutation.collection === 'contacts' && mutation.id === baseline.contacts[0].id);
    const contactDeleteIndex = mutations.findIndex((mutation) => mutation.collection === 'contacts' && mutation.id === baseline.contacts[1].id);
    const dependantDeleteIndex = mutations.findIndex((mutation) => mutation.collection === 'followUps' && mutation.operation === 'delete');

    expect(contactUpdate).toMatchObject({ operation: 'upsert', expectedVersion: 4 });
    expect(dependantDeleteIndex).toBeGreaterThanOrEqual(0);
    expect(contactDeleteIndex).toBeGreaterThan(dependantDeleteIndex);
  });

  it('surfaces record or workspace conflicts instead of silently overwriting data', async () => {
    const fetcher = vi.fn().mockImplementation((input: string) => {
      if (input.includes('/rpc/sync_vincere_records')) return Promise.resolve(jsonResponse({ message: 'record version conflict: contacts.c-1' }, 409));
      return Promise.resolve(cloudReadResponse(input, 2));
    });
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);
    await repository.load(seedState.workspace.id, 'access-token');

    await expect(repository.save(seedState.workspace.id, seedState, 'access-token', 2))
      .rejects.toThrow('record version conflict');
  });

  it('refuses writes after a workspace switch until the new workspace is loaded', async () => {
    const fetcher = vi.fn().mockImplementation((input: string) => Promise.resolve(cloudReadResponse(input)));
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);
    await repository.load(seedState.workspace.id, 'access-token');

    const foreign = structuredClone(seedState);
    foreign.workspace.id = 'workspace-foreign';
    foreign.currentUser.workspaceId = 'workspace-foreign';

    await expect(repository.save('workspace-foreign', foreign, 'access-token', 0))
      .rejects.toThrow(/Workspace-Wechsel/);
  });
});
