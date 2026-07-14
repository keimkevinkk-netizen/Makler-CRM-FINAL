import { describe, expect, it } from 'vitest';
import type { AppState, Contact } from '../../types/domain';
import {
  buildContactCockpitModel,
  buildContactCockpitModels,
  filterAndSortContacts,
  mergeContactTimeline,
  validateContactRelations,
  type ContactFilters,
} from './contactCockpit';

const now = new Date('2026-07-14T10:00:00.000Z');
const workspace = { id: 'w-1', name: 'VINCERE', region: 'MKK', createdAt: '2026-01-01T00:00:00.000Z' };
const currentUser = { id: 'u-1', workspaceId: 'w-1', name: 'Kevin', email: 'kevin@example.de', role: 'owner' as const };

const contact = (patch: Partial<Contact> = {}): Contact => ({
  id: 'c-1',
  firstName: 'Anna',
  lastName: 'Becker',
  phone: '+49 160 1234567',
  email: 'anna@example.de',
  city: 'Bruchköbel',
  source: 'Empfehlung',
  role: 'Eigentümer',
  stage: 'qualified',
  priority: 'high',
  potential: 88,
  lastContactAt: '2026-07-10T09:00:00.000Z',
  nextActionAt: '2026-07-15T09:00:00.000Z',
  notes: 'Interesse an einer Bewertung des Einfamilienhauses.',
  createdAt: '2026-06-01T09:00:00.000Z',
  ...patch,
});

const state = (patch: Partial<AppState> = {}): AppState => ({
  schemaVersion: 2,
  workspace,
  currentUser,
  contacts: [contact()],
  followUps: [],
  properties: [],
  appointments: [],
  callEvents: [],
  auditEvents: [],
  ...patch,
});

const filters: ContactFilters = {
  query: '',
  role: 'all',
  stage: 'all',
  priority: 'all',
  followUp: 'all',
  minPotential: 0,
};

describe('contact cockpit selectors', () => {
  it('filters by search, role, follow-up state and minimum potential', () => {
    const source = state({
      contacts: [
        contact(),
        contact({ id: 'c-2', firstName: 'Ben', lastName: 'Roth', city: 'Hanau', role: 'Käufer', priority: 'low', potential: 40 }),
      ],
      followUps: [{ id: 'f-1', contactId: 'c-1', title: 'Rückruf', dueAt: '2026-07-13T08:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' }],
    });
    const models = buildContactCockpitModels(source, now);
    const result = filterAndSortContacts(models, { ...filters, query: 'bruch', role: 'Eigentümer', followUp: 'overdue', minPotential: 80 }, 'name');
    expect(result.map((item) => item.contact.id)).toEqual(['c-1']);
  });

  it('sorts by priority, potential, next action and data quality deterministically', () => {
    const source = state({
      contacts: [
        contact({ id: 'c-1', firstName: 'Anna', priority: 'medium', potential: 70, nextActionAt: '2026-07-17T10:00:00.000Z' }),
        contact({ id: 'c-2', firstName: 'Ben', priority: 'high', potential: 60, nextActionAt: '2026-07-16T10:00:00.000Z', email: undefined, notes: undefined }),
        contact({ id: 'c-3', firstName: 'Clara', priority: 'low', potential: 95, nextActionAt: '2026-07-15T10:00:00.000Z' }),
      ],
    });
    const models = buildContactCockpitModels(source, now);
    expect(filterAndSortContacts(models, filters, 'priority')[0].contact.id).toBe('c-2');
    expect(filterAndSortContacts(models, filters, 'potential')[0].contact.id).toBe('c-3');
    expect(filterAndSortContacts(models, filters, 'nextAction')[0].contact.id).toBe('c-3');
    expect(filterAndSortContacts(models, filters, 'dataQuality')[0].contact.id).not.toBe('c-2');
  });

  it('merges calls, follow-ups, appointments, property audits and contact audits chronologically', () => {
    const source = state({
      followUps: [{ id: 'f-1', contactId: 'c-1', title: 'Rückruf', dueAt: '2026-07-15T08:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' }],
      properties: [{ id: 'p-1', title: 'Haus Becker', address: 'Teststraße 1', city: 'Bruchköbel', type: 'Einfamilienhaus', status: 'Bewertung', estimatedValue: 500000, ownerContactId: 'c-1' }],
      appointments: [{ id: 'a-1', contactId: 'c-1', title: 'Bewertungstermin', subtitle: 'Vor Ort', startsAt: '2026-07-16T08:00:00.000Z', status: 'tomorrow' }],
      callEvents: [{ id: 'call-1', contactId: 'c-1', outcome: 'conversation', note: 'Bewertung besprochen', createdAt: '2026-07-14T09:00:00.000Z' }],
      auditEvents: [
        { id: 'audit-1', actorId: 'u-1', workspaceId: 'w-1', entity: 'property', entityId: 'p-1', action: 'created', summary: 'Haus Becker wurde verknüpft.', createdAt: '2026-07-13T09:00:00.000Z' },
        { id: 'audit-2', actorId: 'u-1', workspaceId: 'w-1', entity: 'contact', entityId: 'c-1', action: 'stage_changed', summary: 'Pipeline-Status geändert.', createdAt: '2026-07-12T09:00:00.000Z' },
      ],
    });
    const timeline = mergeContactTimeline('c-1', source);
    expect(timeline.map((item) => item.kind)).toEqual(['appointment', 'followup', 'call', 'property', 'audit']);
    expect(timeline[0].title).toBe('Bewertungstermin');
    expect(timeline.some((item) => item.detail.includes('actor'))).toBe(false);
  });

  it('marks overdue actions and high-potential contacts without a future action', () => {
    const source = state({
      contacts: [contact({ nextActionAt: '2026-07-13T08:00:00.000Z', potential: 90 })],
      followUps: [{ id: 'f-1', contactId: 'c-1', title: 'Rückruf', dueAt: '2026-07-13T08:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' }],
    });
    const model = buildContactCockpitModel(source.contacts[0], source, now);
    expect(model.overdueFollowUps).toHaveLength(1);
    expect(model.insights.some((item) => item.code === 'overdue')).toBe(true);
  });

  it('handles contacts without activities without inventing history', () => {
    const source = state({ contacts: [contact({ lastContactAt: undefined, nextActionAt: undefined, createdAt: '2026-06-01T09:00:00.000Z' })] });
    const model = buildContactCockpitModel(source.contacts[0], source, now);
    expect(model.timeline).toEqual([]);
    expect(model.lastActivityAt).toBeUndefined();
    expect(model.insights.some((item) => item.code === 'never_contacted')).toBe(true);
  });

  it('handles a contact with many activities and retains chronological order', () => {
    const callEvents = Array.from({ length: 50 }, (_, index) => ({
      id: `call-${index}`,
      contactId: 'c-1',
      outcome: index % 4 === 0 ? 'no_answer' as const : 'conversation' as const,
      note: `Aktivität ${index}`,
      createdAt: new Date(Date.parse('2026-07-14T09:00:00.000Z') - index * 60_000).toISOString(),
    }));
    const source = state({ callEvents });
    const model = buildContactCockpitModel(source.contacts[0], source, now);
    expect(model.callEvents).toHaveLength(50);
    expect(model.timeline).toHaveLength(50);
    expect(Date.parse(model.timeline[0].occurredAt)).toBeGreaterThan(Date.parse(model.timeline[49].occurredAt));
  });

  it('surfaces a missing phone number as a critical, traceable warning', () => {
    const source = state({ contacts: [contact({ phone: '' })] });
    const model = buildContactCockpitModel(source.contacts[0], source, now);
    const warning = model.insights.find((item) => item.code === 'missing_phone');
    expect(warning?.severity).toBe('critical');
    expect(warning?.evidence).toContain('Feld Telefon ist leer');
    expect(model.dataQuality.missingFields).toContain('Telefon');
  });

  it('detects invalid relation links without attaching them to a valid contact', () => {
    const source = state({
      followUps: [{ id: 'f-orphan', contactId: 'missing', title: 'Orphan', dueAt: '2026-07-15T08:00:00.000Z', priority: 'low', status: 'open', channel: 'email' }],
      appointments: [{ id: 'a-orphan', contactId: 'missing', title: 'Orphan', subtitle: '', startsAt: '2026-07-15T08:00:00.000Z', status: 'today' }],
      callEvents: [{ id: 'call-orphan', contactId: 'missing', outcome: 'no_answer', createdAt: '2026-07-14T08:00:00.000Z' }],
      properties: [{ id: 'p-orphan', title: 'Orphan', address: '', city: '', type: '', status: 'Akquise', estimatedValue: 0, ownerContactId: 'missing' }],
    });
    const diagnostics = validateContactRelations(source);
    expect(diagnostics.total).toBe(4);
    expect(buildContactCockpitModel(source.contacts[0], source, now).timeline).toEqual([]);
  });

  it('flags repeated no-answer attempts and owner candidates without a property using explicit rules', () => {
    const source = state({
      properties: [],
      callEvents: [
        { id: 'call-1', contactId: 'c-1', outcome: 'no_answer', createdAt: '2026-07-14T09:00:00.000Z' },
        { id: 'call-2', contactId: 'c-1', outcome: 'no_answer', createdAt: '2026-07-13T09:00:00.000Z' },
      ],
    });
    const model = buildContactCockpitModel(source.contacts[0], source, now);
    expect(model.insights.some((item) => item.code === 'repeated_no_answer')).toBe(true);
    expect(model.insights.some((item) => item.code === 'owner_without_property')).toBe(true);
    expect(model.ownerIndexReasons).toContain('Rolle Eigentümer');
  });
});
