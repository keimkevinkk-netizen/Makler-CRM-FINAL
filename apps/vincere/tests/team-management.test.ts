import { describe, expect, it, vi } from 'vitest';
import { can, assertPermission } from '../src/auth/permissions';
import {
  SupabaseTeamRepository,
  canChangeMemberRole,
  canSetMemberActive,
} from '../src/team/teamRepository';
import type { WorkspaceUser } from '../src/types/domain';

const viewer: WorkspaceUser = { id: 'viewer', workspaceId: 'workspace-a', name: 'Leser', email: 'viewer@example.de', role: 'viewer' };

describe('VINCERE team rules', () => {
  it('protects the last owner, including self-demotion', () => {
    expect(canChangeMemberRole({
      actorRole: 'owner', actorUserId: 'owner-a', targetUserId: 'owner-a', targetRole: 'owner', nextRole: 'admin', activeOwnerCount: 1,
    })).toEqual({ allowed: false, reason: 'Die eigene letzte Owner-Berechtigung kann nicht entfernt werden.' });

    expect(canSetMemberActive({
      actorRole: 'owner', actorUserId: 'owner-a', targetUserId: 'owner-a', targetRole: 'owner', nextActive: false, activeOwnerCount: 1,
    }).allowed).toBe(false);
  });

  it('prevents administrators from changing owner permissions', () => {
    expect(canChangeMemberRole({
      actorRole: 'admin', actorUserId: 'admin-a', targetUserId: 'owner-a', targetRole: 'owner', nextRole: 'agent', activeOwnerCount: 2,
    }).allowed).toBe(false);
  });

  it('enforces viewer write protection in the central permission contract', () => {
    expect(can(viewer, 'contacts:write')).toBe(false);
    expect(() => assertPermission(viewer, 'properties:write')).toThrow('Fehlende Berechtigung');
  });

  it('creates invitations through the workspace RPC without email delivery', async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response(JSON.stringify([{
        id: 'invite-1', workspace_id: 'workspace-a', email: 'agent@example.de', role: 'agent',
        expires_at: '2026-07-21T08:00:00.000Z', created_at: '2026-07-14T08:00:00.000Z', invited_by: 'owner-a',
        accepted_at: null, revoked_at: null, token: 'a'.repeat(64),
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const repository = new SupabaseTeamRepository(
      { url: 'https://example.supabase.co', publishableKey: 'publishable-test-key', configured: true },
      fetcher as typeof fetch,
    );
    const invitation = await repository.createInvitation({ workspaceId: 'workspace-a', email: 'Agent@Example.de', role: 'agent', expiresHours: 168 }, {
      accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000, userId: 'owner-a', email: 'owner@example.de',
    });

    expect(invitation.token).toHaveLength(64);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/rpc/create_workspace_invitation'), expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body))).toMatchObject({
      p_workspace_id: 'workspace-a', p_email: 'agent@example.de', p_expires_hours: 168,
    });
  });
});
