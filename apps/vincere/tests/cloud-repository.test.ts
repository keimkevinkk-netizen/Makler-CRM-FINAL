import { describe, expect, it, vi } from 'vitest';
import { SupabaseWorkspaceCloudRepository } from '../src/data/cloudRepository';
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

describe('SupabaseWorkspaceCloudRepository', () => {
  it('loads only the requested workspace snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([{
      payload: seedState,
      version: 7,
      updated_at: '2026-07-14T08:00:00.000Z',
    }]));
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);

    const result = await repository.load(seedState.workspace.id, 'access-token');

    expect(result?.version).toBe(7);
    expect(result?.state.workspace.id).toBe(seedState.workspace.id);
    expect(fetcher.mock.calls[0][0]).toContain(`workspace_id=eq.${seedState.workspace.id}`);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer access-token' });
  });

  it('saves through the optimistic concurrency RPC', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      version: 8,
      updated_at: '2026-07-14T08:05:00.000Z',
    }));
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);

    const result = await repository.save(seedState.workspace.id, seedState, 'access-token', 7);
    const request = fetcher.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;

    expect(result.version).toBe(8);
    expect(fetcher.mock.calls[0][0]).toContain('/rest/v1/rpc/save_workspace_snapshot');
    expect(body.p_expected_version).toBe(7);
    expect(body.p_workspace_id).toBe(seedState.workspace.id);
  });

  it('surfaces version conflicts instead of silently overwriting data', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ message: 'version conflict' }, 409));
    const repository = new SupabaseWorkspaceCloudRepository(config, fetcher);

    await expect(repository.save(seedState.workspace.id, seedState, 'access-token', 2))
      .rejects.toThrow('version conflict');
  });
});
