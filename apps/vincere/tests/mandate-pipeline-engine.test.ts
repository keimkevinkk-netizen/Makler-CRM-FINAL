import { describe, expect, it } from 'vitest';
import {
  buildPipelineCockpit,
  getPipelineCapabilities,
  type PipelineViewStage,
} from '../src/domain/pipeline/engine';
import type {
  AppState,
  Appointment,
  CallEvent,
  Contact,
  ContactStage,
  FollowUp,
  Property,
} from '../src/types/domain';

const NOW = Date.parse('2026-07-14T08:00:00.000Z');
const day = (offset: number) => new Date(NOW + offset * 86_400_000).toISOString();
const hour = (offset: number) => new Date(NOW + offset * 3_600_000).toISOString();

function contact(id: string, stage: ContactStage = 'lead', patch: Partial<Contact> = {}): Contact {
  return {
    id,
    firstName: 'Anna',
    lastName: id,
    phone: '+49 170 1234567',
    email: `${id}@example.de`,
    city: 'Bruchköbel',
    source: 'Test',
    role: 'Eigentümer',
    stage,
    priority: 'medium',
    potential: 70,
    notes: 'Verkaufssituation besprochen.',
    createdAt: day(-5),
    ...patch,
  };
}

function state(patch: Partial<AppState> = {}): AppState {
  return {
    schemaVersion: 2,
    workspace: {
      id: 'workspace-test',
      name: 'VINCERE Test',
      region: 'Main-Kinzig-Kreis',
      createdAt: day(-100),
    },
    currentUser: {
      id: 'user-test',
      workspaceId: 'workspace-test',
      name: 'Test User',
      email: 'test@example.de',
      role: 'owner',
    },
    contacts: [],
    followUps: [],
    properties: [],
    appointments: [],
    callEvents: [],
    auditEvents: [],
    ...patch,
  };
}

function openFollowUp(id: string, contactId: string, patch: Partial<FollowUp> = {}): FollowUp {
  return {
    id,
    contactId,
    title: 'Nächsten Schritt klären',
    dueAt: day(2),
    priority: 'medium',
    status: 'open',
    channel: 'phone',
    ...patch,
  };
}

function appointment(id: string, contactId: string, patch: Partial<Appointment> = {}): Appointment {
  return {
    id,
    contactId,
    title: 'Bewertungstermin',
    subtitle: 'Vor-Ort-Termin',
    startsAt: hour(24),
    status: 'tomorrow',
    ...patch,
  };
}

function property(id: string, ownerContactId: string | undefined, patch: Partial<Property> = {}): Property {
  return {
    id,
    title: `Immobilie ${id}`,
    address: 'Teststraße 1',
    city: 'Bruchköbel',
    type: 'Einfamilienhaus',
    status: 'Akquise',
    estimatedValue: 500_000,
    ownerContactId,
    ...patch,
  };
}

function call(id: string, contactId: string, patch: Partial<CallEvent> = {}): CallEvent {
  return {
    id,
    contactId,
    outcome: 'conversation',
    note: 'Positives Gespräch.',
    createdAt: day(-1),
    ...patch,
  };
}

describe('VINCERE mandate pipeline engine', () => {
  it('bildet Kontakte in jeder vorhandenen Pipeline-Stufe und einen ableitbaren Inaktiv-Status ab', () => {
    const contacts = [
      contact('lead', 'lead'),
      contact('qualified', 'qualified'),
      contact('appointment', 'appointment'),
      contact('mandate', 'mandate'),
      contact('sold', 'sold'),
      contact('inactive', 'qualified'),
    ];
    const model = buildPipelineCockpit(state({
      contacts,
      callEvents: [call('call-inactive', 'inactive', { outcome: 'not_interested' })],
    }), NOW);

    const stages = new Set(model.opportunities.map((item) => item.stage));
    expect(stages).toEqual(new Set<PipelineViewStage>(['lead', 'qualified', 'appointment', 'mandate', 'sold', 'inactive']));
    expect(model.health.stages).toHaveLength(6);
  });

  it('liefert für eine leere Pipeline einen belastbaren Nullzustand', () => {
    const model = buildPipelineCockpit(state(), NOW);
    expect(model.opportunities).toEqual([]);
    expect(model.focusOpportunities).toEqual([]);
    expect(model.health.totalContacts).toBe(0);
    expect(model.health.activeOpportunities).toBe(0);
    expect(model.health.knownPropertyValue).toBe(0);
  });

  it('erkennt stagnierende Chancen anhand transparenter Stufenschwellen', () => {
    const model = buildPipelineCockpit(state({
      contacts: [contact('stagnant', 'qualified', { createdAt: day(-30), lastContactAt: day(-20) })],
    }), NOW);
    const opportunity = model.opportunities[0];
    expect(opportunity.riskKeys).toContain('stagnant');
    expect(opportunity.observedInactivityDays).toBe(20);
    expect(model.health.contactsWithoutProgress).toBe(1);
  });

  it('erkennt aktive Kontakte ohne nächste Aktion', () => {
    const model = buildPipelineCockpit(state({ contacts: [contact('no-action', 'qualified')] }), NOW);
    expect(model.opportunities[0].riskKeys).toContain('no_next_action');
    expect(model.health.opportunitiesWithoutNextAction).toBe(1);
  });

  it('erkennt einen kurzfristigen Termin ohne Vorbereitung', () => {
    const model = buildPipelineCockpit(state({
      contacts: [contact('term', 'appointment')],
      appointments: [appointment('a-term', 'term')],
    }), NOW);
    expect(model.opportunities[0].riskKeys).toContain('appointment_without_preparation');
    expect(model.health.upcomingAppointments).toBe(1);
  });

  it('erkennt eine Bewertung ohne offene Nachfassaktion', () => {
    const model = buildPipelineCockpit(state({
      contacts: [contact('valuation', 'appointment')],
      properties: [property('p-valuation', 'valuation', { status: 'Bewertung' })],
    }), NOW);
    expect(model.opportunities[0].riskKeys).toContain('valuation_without_followup');
  });

  it('sortiert gleiche Handlungswerte stabil nach Name und ID', () => {
    const same = {
      stage: 'qualified' as const,
      priority: 'medium' as const,
      potential: 70,
      createdAt: day(-5),
      lastContactAt: day(-1),
      nextActionAt: day(2),
    };
    const model = buildPipelineCockpit(state({
      contacts: [
        contact('z-id', 'qualified', { ...same, firstName: 'Zora', lastName: 'Zimmer' }),
        contact('a-id', 'qualified', { ...same, firstName: 'Anna', lastName: 'Albrecht' }),
      ],
      followUps: [
        openFollowUp('f-z', 'z-id'),
        openFollowUp('f-a', 'a-id'),
      ],
    }), NOW);
    expect(model.opportunities[0].actionValue).toBe(model.opportunities[1].actionValue);
    expect(model.opportunities.map((item) => item.contact.id)).toEqual(['a-id', 'z-id']);
  });

  it('weist bei Eigentümerkontakten ohne Objekt auf die fehlende Verknüpfung hin', () => {
    const model = buildPipelineCockpit(state({ contacts: [contact('owner-no-property')] }), NOW);
    expect(model.opportunities[0].missingData).toContain('Verknüpfte Immobilie');
    expect(model.opportunities[0].riskKeys).toContain('incomplete_data');
  });

  it('meldet fehlerhafte Beziehungen, ohne sie einem Kontakt zuzuraten', () => {
    const model = buildPipelineCockpit(state({
      contacts: [contact('valid')],
      followUps: [openFollowUp('orphan-followup', 'missing-contact')],
      properties: [property('orphan-property', 'missing-contact')],
      appointments: [appointment('orphan-appointment', 'missing-contact')],
      callEvents: [call('orphan-call', 'missing-contact')],
    }), NOW);
    expect(model.health.relationshipErrors).toHaveLength(4);
    expect(model.opportunities).toHaveLength(1);
    expect(model.opportunities[0].contact.id).toBe('valid');
  });

  it('bleibt bei identischer Eingabe und identischem Bewertungszeitpunkt deterministisch', () => {
    const input = state({
      contacts: [contact('one', 'appointment'), contact('two', 'mandate')],
      followUps: [openFollowUp('f-one', 'one', { dueAt: day(-1) }), openFollowUp('f-two', 'two')],
      properties: [property('p-one', 'one'), property('p-two', 'two', { estimatedValue: 750_000 })],
    });
    const first = buildPipelineCockpit(input, NOW);
    const second = buildPipelineCockpit(input, NOW);
    expect(second).toEqual(first);
  });

  it('ignoriert zukünftige Termine bei der beobachteten letzten Aktivität', () => {
    const model = buildPipelineCockpit(state({
      contacts: [contact('future-term', 'qualified', { createdAt: day(-40), lastContactAt: day(-20) })],
      appointments: [appointment('future-a', 'future-term', { startsAt: day(2) })],
    }), NOW);
    expect(model.opportunities[0].observedInactivityDays).toBe(20);
    expect(model.opportunities[0].riskKeys).toContain('stagnant');
  });

  it('liefert für Viewer ausschließlich lesende Fähigkeiten', () => {
    expect(getPipelineCapabilities('viewer')).toEqual({
      canMovePipeline: false,
      canManageFollowUps: false,
      canLogCalls: false,
      readOnly: true,
    });
    expect(getPipelineCapabilities('agent').readOnly).toBe(false);
  });
});
