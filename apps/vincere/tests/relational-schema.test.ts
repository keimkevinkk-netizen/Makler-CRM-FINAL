import { describe, expect, it } from 'vitest';
import migration from '../supabase/migrations/202607140002_relational_workspace_data.sql?raw';

describe('VINCERE relational Supabase migration', () => {
  it.each([
    'contacts',
    'follow_ups',
    'properties',
    'appointments',
    'call_events',
    'audit_events',
  ])('creates the %s workspace table', (table) => {
    expect(migration).toContain(`create table if not exists public.${table}`);
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it('enforces workspace membership, writer roles and optimistic revisions', () => {
    expect(migration).toContain('public.is_workspace_member(workspace_id)');
    expect(migration).toContain("array['owner', 'admin', 'agent']::public.vincere_role[]");
    expect(migration).toContain('p_expected_revision bigint');
    expect(migration).toContain("raise exception 'workspace revision conflict'");
    expect(migration).toContain("raise exception 'record version conflict: %.%'");
  });

  it('keeps contact-linked records inside the same workspace', () => {
    expect(migration).toContain('foreign key (workspace_id, related_contact_id)');
    expect(migration).toContain('references public.contacts(workspace_id, id)');
  });
});
