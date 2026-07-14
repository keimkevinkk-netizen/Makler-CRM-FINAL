import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseRestAuthClient } from '../src/auth/cloudAuth';
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

describe('SupabaseRestAuthClient', () => {
  beforeEach(() => localStorage.clear());

  it('authenticates with password and resolves the active workspace membership', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'user-1', email: 'kevin@example.de' },
      }))
      .mockResolvedValueOnce(jsonResponse([{
        workspace_id: 'workspace-1',
        role: 'owner',
        display_name: 'Kevin Keim',
        is_active: true,
      }]));

    const client = new SupabaseRestAuthClient(config, localStorage, fetcher);
    const session = await client.signIn('kevin@example.de', 'secure-password');
    const membership = await client.getMembership(session);

    expect(session.userId).toBe('user-1');
    expect(membership).toEqual({ workspaceId: 'workspace-1', role: 'owner', displayName: 'Kevin Keim' });
    expect(fetcher.mock.calls[0][0]).toContain('/auth/v1/token?grant_type=password');
    expect(fetcher.mock.calls[1][0]).toContain('/rest/v1/workspace_members?');
  });

  it('clears invalid persisted sessions instead of trusting them', async () => {
    localStorage.setItem('vincere_auth_session_v1', JSON.stringify({ accessToken: '', userId: '' }));
    const client = new SupabaseRestAuthClient(config, localStorage, vi.fn());

    await expect(client.restoreSession()).resolves.toBeNull();
    expect(localStorage.getItem('vincere_auth_session_v1')).toBeNull();
  });

  it('rejects users without an active workspace membership', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([]));
    const client = new SupabaseRestAuthClient(config, localStorage, fetcher);

    await expect(client.getMembership({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      userId: 'user-1',
      email: 'kevin@example.de',
    })).rejects.toThrow('kein aktiver VINCERE-Workspace');
  });

  it('rejects explicitly deactivated workspace memberships', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([{
      workspace_id: 'workspace-1',
      role: 'agent',
      display_name: 'Deaktivierter Nutzer',
      is_active: false,
    }]));
    const client = new SupabaseRestAuthClient(config, localStorage, fetcher);

    await expect(client.getMembership({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      userId: 'user-2',
      email: 'inactive@example.de',
    })).rejects.toThrow('kein aktiver VINCERE-Workspace');
  });
});
