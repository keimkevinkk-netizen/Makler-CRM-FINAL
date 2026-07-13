import { describe, expect, it } from 'vitest';
import { assertPermission, can } from '../src/auth/permissions';
import { seedState } from '../src/data/seed';

const userWithRole = (role: 'owner' | 'admin' | 'agent' | 'viewer') => ({ ...seedState.currentUser, role });

describe('VINCERE permissions', () => {
  it('allows owners to manage backups and workspace settings', () => {
    expect(can(userWithRole('owner'), 'backup:manage')).toBe(true);
    expect(can(userWithRole('owner'), 'workspace:manage')).toBe(true);
  });

  it('allows agents to work operationally but not manage the workspace', () => {
    expect(can(userWithRole('agent'), 'contacts:write')).toBe(true);
    expect(can(userWithRole('agent'), 'workspace:manage')).toBe(false);
  });

  it('blocks viewers from write commands', () => {
    expect(() => assertPermission(userWithRole('viewer'), 'contacts:write')).toThrow(/Fehlende Berechtigung/);
  });
});
