import { describe, expect, it } from 'vitest';
import { compareConflictFields, createCollaborationConflict } from '../src/collaboration/conflicts';
import type { Contact } from '../src/types/domain';

const local: Contact = {
  id: 'contact-1', firstName: 'Anna', lastName: 'Becker', phone: '111', city: 'Hanau', source: 'Netzwerk',
  role: 'Eigentümer', stage: 'qualified', priority: 'high', potential: 80, notes: 'Lokale Notiz', createdAt: '2026-07-14T08:00:00.000Z',
};
const cloud: Contact = { ...local, phone: '222', notes: 'Cloud-Notiz', potential: 85 };

describe('VINCERE conflict detection', () => {
  it('identifies every differing field without merging either version', () => {
    const fields = compareConflictFields(local, cloud);
    expect(fields.map((field) => field.path)).toEqual(['notes', 'phone', 'potential']);
    expect(local.phone).toBe('111');
    expect(cloud.phone).toBe('222');
  });

  it('creates a detailed, workspace-bound conflict record', () => {
    const conflict = createCollaborationConflict({
      workspaceId: 'workspace-a',
      localPayload: local,
      localVersion: 3,
      localChangedAt: '2026-07-14T08:10:00.000Z',
      cloudRevision: 9,
      remote: {
        workspaceId: 'workspace-a', collection: 'contacts', eventType: 'UPDATE', id: local.id,
        payload: cloud, version: 4, updatedAt: '2026-07-14T08:11:00.000Z', updatedBy: 'user-b',
      },
    });

    expect(conflict.recordType).toBe('Kontakt');
    expect(conflict.recordName).toBe('Anna Becker');
    expect(conflict.cloudActorId).toBe('user-b');
    expect(conflict.affectedFields).toHaveLength(3);
    expect(conflict.deferred).toBe(false);
  });
});
