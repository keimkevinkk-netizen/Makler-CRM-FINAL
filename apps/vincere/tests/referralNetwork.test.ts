import { describe, expect, it } from 'vitest';
import type { AppState, Contact } from '../src/types/domain';
import {
  buildNetworkCockpit,
  buildNetworkRelationship,
  getNetworkCapabilities,
  sortRelationships,
} from '../src/domain/referrals/referralNetwork';

const now = new Date('2026-07-14T10:00:00.000Z');
const contact = (patch: Partial<Contact> = {}): Contact => ({
  id: 'c-1',
  firstName: 'Anna',
  lastName: 'Becker',
  phone: '+49 160 1234567',
  email: 'anna@example.de',
  city: 'Bruchköbel',
  source: 'Lokales Netzwerk',
  role: 'Tippgeber',
  stage: 'qualified',
  priority: 'high',
  potential: 80,
  lastContactAt: '2026-07-01T09:00:00.000Z',
  createdAt: '2026-01-01T09:00:00.000Z',
  ...patch,
});
const state = (patch: Partial<AppState> = {}): AppState => ({
  schemaVersion: 2,
  workspace: { id: 'w-1', name: 'VINCERE', region: 'MKK', createdAt: '2026-01-01T00:00:00.000Z' },
  currentUser: { id: 'u-1', workspaceId: 'w-1', name: 'Kevin', email: 'kevin@example.de', role: 'owner' },
  contacts: [contact()],
  followUps: [],
  properties: [],
  appointments: [],
  callEvents: [],
  auditEvents: [],
  ...patch,
});

describe('referral network engine', () => {
  it('handles contacts without activity and prioritizes a missing next action', () => {
    const source = state({ contacts: [contact({ lastContactAt: undefined, nextActionAt: undefined })] });
    const model = buildNetworkRelationship(source.contacts[0], source, now);
    expect(model.lastActivityAt).toBeUndefined();
    expect(model.prioritizationReasons).toContain('Keine Aktivität dokumentiert');
    expect(model.hasFutureAction).toBe(false);
  });

  it('detects a referrer without a follow-up', () => {
    const source = state({ contacts: [contact({ lastContactAt: '2026-04-01T09:00:00.000Z' })] });
    const model = buildNetworkRelationship(source.contacts[0], source, now);
    expect(model.opportunities.some((item) => item.code === 'dormant_referrer')).toBe(true);
    expect(model.opportunities.some((item) => item.code === 'partner_without_next_appointment')).toBe(true);
  });

  it('detects sold contacts without aftercare and referral documentation', () => {
    const sold = contact({ role: 'Netzwerk', stage: 'sold', notes: 'Verkauf erfolgreich abgeschlossen.' });
    const source = state({ contacts: [sold], callEvents: [{ id: 'call-1', contactId: sold.id, outcome: 'conversation', createdAt: '2026-07-01T09:00:00.000Z' }] });
    const codes = buildNetworkRelationship(sold, source, now).opportunities.map((item) => item.code);
    expect(codes).toContain('sold_without_aftercare');
    expect(codes).toContain('satisfied_without_referral_request');
  });

  it('sorts equal relationship values deterministically by name and id', () => {
    const source = state({ contacts: [] });
    const alpha = buildNetworkRelationship(contact({ id: 'a', firstName: 'Zara', lastName: 'Adler' }), source, now);
    const beta = buildNetworkRelationship(contact({ id: 'b', firstName: 'Anna', lastName: 'Berger' }), source, now);
    expect(alpha.relationshipValue).toBe(beta.relationshipValue);
    expect(sortRelationships([beta, alpha]).map((item) => item.contact.id)).toEqual(['a', 'b']);
  });

  it('surfaces a missing telephone number without inventing a contact channel', () => {
    const source = state({ contacts: [contact({ phone: '' })] });
    const model = buildNetworkRelationship(source.contacts[0], source, now);
    expect(model.missingPhone).toBe(true);
    expect(model.nextBestAction).toContain('Kontaktweg ergänzen');
  });

  it('recognizes a long contact pause', () => {
    const source = state({ contacts: [contact({ lastContactAt: '2026-01-01T09:00:00.000Z' })] });
    const cockpit = buildNetworkCockpit(source, now);
    expect(cockpit.longPauses.map((item) => item.contact.id)).toContain('c-1');
  });

  it('distinguishes positive and negative conversation outcomes', () => {
    const source = state({
      callEvents: [
        { id: 'good', contactId: 'c-1', outcome: 'conversation', createdAt: '2026-07-10T09:00:00.000Z' },
        { id: 'bad', contactId: 'c-1', outcome: 'not_interested', createdAt: '2026-07-09T09:00:00.000Z' },
      ],
    });
    const model = buildNetworkRelationship(source.contacts[0], source, now);
    expect(model.successfulInteractions).toBe(1);
    expect(model.negativeInteractions).toBe(1);
    expect(model.factors.find((item) => item.code === 'history')?.evidence).toContain('Negative Ergebnisse: 1');
  });

  it('never creates the same recommendation opportunity twice', () => {
    const source = state({
      contacts: [contact({ stage: 'sold' })],
      properties: [{ id: 'p-1', title: 'Haus', address: 'A', city: 'B', type: 'EFH', status: 'Verkauft', estimatedValue: 500000, ownerContactId: 'c-1' }],
      callEvents: Array.from({ length: 4 }, (_, index) => ({ id: `call-${index}`, contactId: 'c-1', outcome: 'conversation' as const, createdAt: `2026-07-0${index + 1}T09:00:00.000Z` })),
    });
    const opportunities = buildNetworkRelationship(source.contacts[0], source, now).opportunities;
    expect(new Set(opportunities.map((item) => item.id)).size).toBe(opportunities.length);
  });

  it('keeps focus ordering deterministic', () => {
    const source = state({ contacts: [contact({ id: 'b', firstName: 'Berta', lastName: 'Klein' }), contact({ id: 'a', firstName: 'Anna', lastName: 'Klein' })] });
    const first = buildNetworkCockpit(source, now).focusQueue.map((item) => item.contact.id);
    const second = buildNetworkCockpit(source, now).focusQueue.map((item) => item.contact.id);
    expect(first).toEqual(second);
    expect(first).toEqual(['a', 'b']);
  });

  it('exposes no write capabilities for viewers', () => {
    expect(getNetworkCapabilities('viewer')).toEqual({ canLogCalls: false, canCreateFollowUps: false, canWrite: false });
  });

  it('handles empty network inventories', () => {
    const cockpit = buildNetworkCockpit(state({ contacts: [] }), now);
    expect(cockpit.relationships).toEqual([]);
    expect(cockpit.opportunities).toEqual([]);
    expect(cockpit.segmentation).toEqual([]);
    expect(cockpit.focusQueue).toEqual([]);
  });
});
