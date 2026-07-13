import { beforeEach, describe, expect, it } from 'vitest';
import { seedState } from '../src/data/seed';
import {
  LEGACY_STORAGE_KEY,
  LocalStorageWorkspaceRepository,
  WORKSPACE_STORAGE_KEY,
} from '../src/data/repository';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('VINCERE workspace repository', () => {
  beforeEach(() => localStorage.clear());

  it('migrates the legacy V1 state into a versioned workspace envelope', () => {
    const legacy = {
      contacts: seedState.contacts.slice(0, 1),
      followUps: [],
      properties: [],
      appointments: [],
      callEvents: [],
    };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));

    const repository = new LocalStorageWorkspaceRepository();
    const migrated = repository.load();

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.contacts).toHaveLength(1);
    expect(migrated.auditEvents[0]?.action).toBe('schema_migrated');
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).not.toBeNull();
  });

  it('rejects backups from a different workspace', () => {
    const repository = new LocalStorageWorkspaceRepository();
    repository.save(seedState);
    const foreign = clone(seedState);
    foreign.workspace.id = 'workspace-foreign';
    foreign.currentUser.workspaceId = 'workspace-foreign';

    expect(() => repository.importSnapshot(
      JSON.stringify(repository.exportSnapshot(foreign)),
      seedState.workspace.id,
    )).toThrow(/anderen VINCERE-Workspace/);
  });

  it('preserves the trusted local identity during imports', () => {
    const repository = new LocalStorageWorkspaceRepository();
    repository.save(seedState);
    const backup = clone(seedState);
    backup.currentUser = {
      id: 'attacker',
      workspaceId: seedState.workspace.id,
      name: 'Untrusted User',
      email: 'untrusted@example.test',
      role: 'owner',
    };

    const imported = repository.importSnapshot(
      JSON.stringify(repository.exportSnapshot(backup)),
      seedState.workspace.id,
    );

    expect(imported.currentUser).toEqual(seedState.currentUser);
  });

  it('rejects incomplete or damaged backup payloads', () => {
    const repository = new LocalStorageWorkspaceRepository();
    expect(() => repository.importSnapshot('{"contacts":[]}')).toThrow(/Ungültige Sicherung/);
  });
});
