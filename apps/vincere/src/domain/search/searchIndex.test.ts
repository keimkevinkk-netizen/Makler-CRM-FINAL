import { describe, expect, it } from 'vitest';
import type { AppState } from '../../types/domain';
import { buildSearchIndex, searchIndex, type SearchIndexEntry } from './searchIndex';

const now = new Date('2026-07-14T10:00:00.000Z');

function createState(): AppState {
  return {
    schemaVersion: 2,
    workspace: { id: 'workspace-a', name: 'VINCERE', region: 'MKK', createdAt: '2026-01-01T00:00:00.000Z' },
    currentUser: { id: 'user-a', workspaceId: 'workspace-a', name: 'Kevin', email: 'kevin@example.de', role: 'owner' },
    contacts: [
      { id: 'contact-a', firstName: 'Anna', lastName: 'Müller', phone: '+49 160 123 45 67', email: 'ANNA@EXAMPLE.DE', city: 'Bruchköbel', source: 'Empfehlung', role: 'Eigentümer', stage: 'appointment', priority: 'high', potential: 90, lastContactAt: '2026-07-13T09:00:00.000Z', nextActionAt: '2026-07-13T12:00:00.000Z', notes: 'Vertrauliches Stichwort Dachausbau', createdAt: '2026-07-01T09:00:00.000Z' },
      { id: 'contact-b', firstName: 'Anna', lastName: 'Müller', phone: '06181 555000', email: 'anna.zwei@example.de', city: 'Hanau', source: 'Website', role: 'Käufer', stage: 'lead', priority: 'low', potential: 30, createdAt: '2026-07-01T09:00:00.000Z' },
      { id: 'contact-c', firstName: 'Bernd', lastName: 'Koch', phone: '0170 999888', city: 'Nidderau', source: 'Gewerbeverein', role: 'Netzwerk', stage: 'qualified', priority: 'medium', potential: 60, createdAt: '2026-06-01T09:00:00.000Z' },
    ],
    followUps: [
      { id: 'followup-a', contactId: 'contact-a', title: 'Bewertungstermin bestätigen', dueAt: '2026-07-13T08:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' },
    ],
    properties: [
      { id: 'property-a', title: 'Einfamilienhaus Müller', address: 'Hauptstraße 12', city: 'Bruchköbel', type: 'Einfamilienhaus', status: 'Bewertung', estimatedValue: 620000, ownerContactId: 'contact-a' },
    ],
    appointments: [
      { id: 'appointment-a', contactId: 'contact-a', title: 'Bewertung vor Ort', subtitle: 'Unterlagen prüfen', startsAt: '2026-07-14T14:00:00.000Z', status: 'today' },
    ],
    callEvents: [
      { id: 'call-a', contactId: 'contact-a', outcome: 'appointment', note: 'Nicht indexieren', createdAt: '2026-07-13T09:00:00.000Z' },
    ],
    auditEvents: [],
  };
}

describe('global search index', () => {
  it('keeps identical names stable and deterministic', () => {
    const state = createState();
    const results = searchIndex(buildSearchIndex(state, { now }), 'Anna Müller', { workspaceId: state.workspace.id, types: ['contact'], now });
    expect(results.map((result) => result.entityId)).toEqual(['contact-a', 'contact-b']);
    expect(searchIndex(buildSearchIndex(state, { now }), 'Anna Müller', { workspaceId: state.workspace.id, types: ['contact'], now }).map((result) => result.id)).toEqual(results.map((result) => result.id));
  });

  it('normalizes German and international phone formats', () => {
    const state = createState();
    const [result] = searchIndex(buildSearchIndex(state, { now }), '0160 1234567', { workspaceId: state.workspace.id, now });
    expect(result.entityId).toBe('contact-a');
    expect(result.directMatch).toBe('phone');
  });

  it('normalizes email casing', () => {
    const state = createState();
    const [result] = searchIndex(buildSearchIndex(state, { now }), 'anna@example.de', { workspaceId: state.workspace.id, now });
    expect(result.entityId).toBe('contact-a');
    expect(result.directMatch).toBe('email');
  });

  it('supports umlauts, word prefixes and limited typos', () => {
    const state = createState();
    const index = buildSearchIndex(state, { now });
    expect(searchIndex(index, 'Müller', { workspaceId: state.workspace.id, types: ['contact'], now })[0].entityId).toBe('contact-a');
    expect(searchIndex(index, 'Bruchk', { workspaceId: state.workspace.id, now })[0].entityId).toBe('contact-a');
    expect(searchIndex(index, 'Muellr', { workspaceId: state.workspace.id, types: ['contact'], now })[0].directMatch).toBe('fuzzy');
  });

  it('prioritizes overdue open high-priority pipeline work transparently', () => {
    const state = createState();
    const [result] = searchIndex(buildSearchIndex(state, { now }), 'Bewertungstermin', { workspaceId: state.workspace.id, now });
    expect(result.type).toBe('followup');
    expect(result.reasons).toEqual(expect.arrayContaining(['Überfällig', 'Aktive Pipeline', 'Offene Aktion', 'Hohe Priorität']));
  });

  it('indexes all supported existing record categories', () => {
    const state = createState();
    const types = new Set(buildSearchIndex(state, { now }).map((entry) => entry.type));
    expect(types).toEqual(new Set(['contact', 'pipeline', 'next-action', 'network', 'property', 'valuation', 'followup', 'appointment', 'call']));
  });

  it('does not index notes by default and can opt in explicitly', () => {
    const state = createState();
    const defaultIndex = buildSearchIndex(state, { now });
    expect(searchIndex(defaultIndex, 'Dachausbau', { workspaceId: state.workspace.id, now })).toHaveLength(0);
    const optedIn = buildSearchIndex(state, { now, includeContactNotes: true });
    expect(searchIndex(optedIn, 'Dachausbau', { workspaceId: state.workspace.id, now })[0].entityId).toBe('contact-a');
    expect(searchIndex(defaultIndex, 'Nicht indexieren', { workspaceId: state.workspace.id, now })).toHaveLength(0);
  });

  it('handles empty data and empty queries', () => {
    const state = createState();
    state.contacts = [];
    state.followUps = [];
    state.properties = [];
    state.appointments = [];
    state.callEvents = [];
    expect(buildSearchIndex(state, { now })).toEqual([]);
    expect(searchIndex([], '', { workspaceId: state.workspace.id, now })).toEqual([]);
  });

  it('keeps workspace results separated', () => {
    const state = createState();
    const index = buildSearchIndex(state, { now });
    const foreign: SearchIndexEntry = { ...index[0], id: 'foreign', entityId: 'foreign', workspaceId: 'workspace-b', label: 'Anna Foreign' };
    const results = searchIndex([...index, foreign], 'Anna', { workspaceId: 'workspace-a', now });
    expect(results.some((result) => result.workspaceId === 'workspace-b')).toBe(false);
  });

  it('rejects mismatched user and workspace state', () => {
    const state = createState();
    state.currentUser = { ...state.currentUser, workspaceId: 'workspace-b' };
    expect(() => buildSearchIndex(state, { now })).toThrow(/Workspace/);
  });

  it('skips orphaned dependent records instead of guessing a relation', () => {
    const state = createState();
    state.followUps.push({ id: 'orphan', contactId: 'missing', title: 'Fremde Aktion', dueAt: '2026-07-13T08:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' });
    expect(buildSearchIndex(state, { now }).some((entry) => entry.entityId === 'orphan')).toBe(false);
  });
});
