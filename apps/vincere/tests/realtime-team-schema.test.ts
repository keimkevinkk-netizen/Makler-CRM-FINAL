import { describe, expect, it } from 'vitest';
import migration from '../supabase/migrations/202607140003_realtime_team_collaboration.sql?raw';

describe('VINCERE realtime and team collaboration migration', () => {
  it('publishes only the required operational tables with complete delete rows', () => {
    for (const table of ['contacts', 'follow_ups', 'properties', 'appointments', 'call_events']) {
      expect(migration).toContain(`alter table public.${table} replica identity full`);
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain("pubname = 'supabase_realtime'");
  });

  it('scopes active membership and removes direct team mutations', () => {
    expect(migration).toContain('and membership.is_active');
    expect(migration).toContain('drop policy if exists workspace_members_manage_admin');
    expect(migration).toContain('using (public.is_workspace_member(workspace_id))');
  });

  it('protects the last owner at trigger and RPC level', () => {
    expect(migration).toContain('protect_last_workspace_owner_trigger');
    expect(migration).toContain('a user cannot remove their own last owner permission');
    expect(migration).toContain('the last active workspace owner is protected');
  });

  it('implements workspace-bound, hashed and expiring invitations', () => {
    expect(migration).toContain('create table if not exists public.workspace_invitations');
    expect(migration).toContain("encode(digest(raw_token, 'sha256'), 'hex')");
    expect(migration).toContain('invitation.expires_at <= now()');
    expect(migration).toContain('invitation email does not match authenticated user');
    expect(migration).toContain('p_workspace_id uuid');
  });

  it('audits role, activation and invitation changes', () => {
    expect(migration).toContain('public.audit_vincere_team_change');
    expect(migration).toContain("'role_changed'");
    expect(migration).toContain("'deactivated'");
    expect(migration).toContain("'invitation'");
  });

  it('never introduces a service-role secret', () => {
    expect(migration.toLowerCase()).not.toContain('service_role');
  });
});
