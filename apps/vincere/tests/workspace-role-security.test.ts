import { describe, expect, it } from 'vitest';
import migration from '../supabase/migrations/202607140003_harden_workspace_roles.sql?raw';

describe('VINCERE workspace role hardening migration', () => {
  it('removes direct membership management from browser roles', () => {
    expect(migration).toContain('drop policy if exists workspace_members_manage_admin');
    expect(migration).toContain('revoke insert, update, delete on table public.workspace_members from authenticated');
  });

  it('allows membership changes only through an owner-controlled RPC', () => {
    expect(migration).toContain('create or replace function public.manage_vincere_workspace_member');
    expect(migration).toContain("array['owner']::public.vincere_role[]");
    expect(migration).toContain("raise exception 'owner permission required'");
  });

  it('prevents owner escalation, owner deletion and self-demotion', () => {
    expect(migration).toContain("if p_role = 'owner'");
    expect(migration).toContain("owner role cannot be assigned through this operation");
    expect(migration).toContain("if existing_role = 'owner'");
    expect(migration).toContain("if p_user_id = auth.uid()");
  });
});
