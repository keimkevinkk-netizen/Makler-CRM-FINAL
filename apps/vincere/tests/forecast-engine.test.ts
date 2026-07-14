import { describe, expect, it } from 'vitest';
import { buildSalesControlSnapshot, calculateSalesScenario } from '../src/domain/forecast/engine';
import { getAnalyticsCapabilities } from '../src/domain/forecast/model';
import type { AppState, Appointment, AuditEvent, CallEvent, Contact, FollowUp, Property } from '../src/types/domain';

const NOW = Date.parse('2026-07-14T12:00:00.000Z');

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'contact-1',
    firstName: 'Anna',
    lastName: 'Müller',
    phone: '+49 170 1234567',
    email: 'anna@example.com',
    city: 'Hanau',
    source: 'Empfehlung',
    role: 'Eigentümer',
    stage: 'qualified',
    priority: 'high',
    potential: 85,
    lastContactAt: '2026-07-10T10:00:00.000Z',
    nextActionAt: undefined,
    notes: 'Verkaufsinteresse',
    createdAt: '2026-07-02T10:00:00.000Z',
    ...overrides,
  };
}

function followUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return {
    id: 'followup-1',
    contactId: 'contact-1',
    title: 'Bewertung besprechen',
    dueAt: '2026-07-13T10:00:00.000Z',
    priority: 'high',
    status: 'open',
    channel: 'phone',
    ...overrides,
  };
}

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: 'property-1',
    title: 'Einfamilienhaus Hanau',
    address: 'Musterstraße 1',
    city: 'Hanau',
    type: 'Haus',
    status: 'Bewertung',
    estimatedValue: 500_000,
    ownerContactId: 'contact-1',
    ...overrides,
  };
}

function call(overrides: Partial<CallEvent> = {}): CallEvent {
  return {
    id: 'call-1',
    contactId: 'contact-1',
    outcome: 'conversation',
    createdAt: '2026-07-10T10:00:00.000Z',
    ...overrides,
  };
}

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1',
    contactId: 'contact-1',
    title: 'Bewertungstermin',
    subtitle: 'Vor Ort',
    startsAt: '2026-07-16T10:00:00.000Z',
    status: 'tomorrow',
    ...overrides,
  };
}

function audit(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'audit-1',
    actorId: 'user-1',
    workspaceId: 'workspace-1',
    entity: 'contact',
    entityId: 'contact-1',
    action: 'stage_changed',
    summary: 'Pipeline-Status wurde auf qualified gesetzt.',
    createdAt: '2026-07-05T10:00:00.000Z',
    ...overrides,
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    schemaVersion: 2,
    workspace: { id: 'workspace-1', name: 'VINCERE', region: 'Main-Kinzig-Kreis', createdAt: '2026-06-01T10:00:00.000Z' },
    currentUser: { id: 'user-1', workspaceId: 'workspace-1', name: 'Kevin', email: 'kevin@example.com', role: 'owner' },
    contacts: [contact()],
    followUps: [followUp()],
    properties: [property()],
    appointments: [appointment()],
    callEvents: [call()],
    auditEvents: [audit()],
    ...overrides,
  };
}

describe('buildSalesControlSnapshot', () => {
  it('liefert bei leeren Datenbeständen belastbare Nullwerte statt erfundener Aussagen', () => {
    const snapshot = buildSalesControlSnapshot(state({ contacts: [], followUps: [], properties: [], appointments: [], callEvents: [], auditEvents: [] }), NOW, 'month');

    expect(snapshot.kpis.activeContacts).toBe(0);
    expect(snapshot.kpis.conversationRate).toBeNull();
    expect(snapshot.forecast.weightedOrientationValue).toBe(0);
    expect(snapshot.forecast.items).toEqual([]);
    expect(snapshot.historicalWarnings.length).toBeGreaterThan(0);
  });

  it('kennzeichnet fehlende historische Daten und erfindet keinen vorherigen Vergleich', () => {
    const snapshot = buildSalesControlSnapshot(state(), NOW, 'today');

    expect(snapshot.comparisons.calls.comparable).toBe(false);
    expect(snapshot.comparisons.calls.previous).toBeNull();
    expect(snapshot.historicalWarnings.some((warning) => warning.includes('vorherigen Vergleichszeitraum'))).toBe(true);
  });

  it('bildet Kontakte in allen Pipeline-Stufen exakt ab', () => {
    const contacts = ['lead', 'qualified', 'appointment', 'mandate', 'sold'].map((stage, index) => contact({ id: `contact-${index}`, stage: stage as Contact['stage'] }));
    const snapshot = buildSalesControlSnapshot(state({ contacts, followUps: [], properties: [], appointments: [], callEvents: [] }), NOW, 'month');

    expect(snapshot.funnel.map((stage) => stage.count)).toEqual([1, 1, 1, 1, 1]);
    expect(snapshot.pipelineDistribution).toEqual({ lead: 1, qualified: 1, appointment: 1, mandate: 1, sold: 1 });
  });

  it('sortiert gleiche gewichtete Chancen stabil nach ID', () => {
    const contacts = [contact({ id: 'contact-a' }), contact({ id: 'contact-b' })];
    const properties = [
      property({ id: 'property-b', ownerContactId: 'contact-b' }),
      property({ id: 'property-a', ownerContactId: 'contact-a' }),
    ];
    const followUps = [followUp({ id: 'followup-a', contactId: 'contact-a' }), followUp({ id: 'followup-b', contactId: 'contact-b' })];
    const appointments = [appointment({ id: 'appointment-a', contactId: 'contact-a' }), appointment({ id: 'appointment-b', contactId: 'contact-b' })];
    const calls = [call({ id: 'call-a', contactId: 'contact-a' }), call({ id: 'call-b', contactId: 'contact-b' })];
    const snapshot = buildSalesControlSnapshot(state({ contacts, properties, followUps, appointments, callEvents: calls }), NOW, 'month');

    expect(snapshot.forecast.items.map((item) => item.id)).toEqual(['property-a', 'property-b']);
  });

  it('ignoriert ungültige Zeitangaben und weist sie sichtbar aus', () => {
    const snapshot = buildSalesControlSnapshot(state({
      contacts: [contact({ createdAt: 'nicht-valide', lastContactAt: 'kaputt' })],
      followUps: [followUp({ dueAt: 'ungültig' })],
      callEvents: [call({ createdAt: 'falsch' })],
      appointments: [appointment({ startsAt: 'kein-datum' })],
    }), NOW, 'month');

    expect(snapshot.invalidDateCount).toBeGreaterThanOrEqual(5);
    expect(snapshot.kpis.calls).toBe(0);
    expect(snapshot.historicalWarnings.some((warning) => warning.includes('ungültige Zeitangabe'))).toBe(true);
  });

  it('schließt negative oder fehlende Objektwerte aus dem Forecast aus', () => {
    const snapshot = buildSalesControlSnapshot(state({
      properties: [property({ id: 'negative', estimatedValue: -10 }), property({ id: 'zero', estimatedValue: 0 })],
    }), NOW, 'month');

    expect(snapshot.forecast.items).toHaveLength(0);
    expect(snapshot.forecast.invalidValueCount).toBe(2);
    expect(snapshot.forecast.securedPipelineValue).toBe(0);
  });

  it('liefert bei identischem Zustand und Bewertungszeitpunkt identische Ergebnisse', () => {
    const input = state();
    expect(buildSalesControlSnapshot(input, NOW, 'rolling30')).toEqual(buildSalesControlSnapshot(input, NOW, 'rolling30'));
  });

  it('erkennt Funnel-Abbrüche aus belegter Inaktivität und fehlender nächster Aktion', () => {
    const stale = contact({
      stage: 'qualified',
      lastContactAt: '2026-05-01T10:00:00.000Z',
      nextActionAt: undefined,
    });
    const snapshot = buildSalesControlSnapshot(state({ contacts: [stale], followUps: [], appointments: [], callEvents: [] }), NOW, 'month');
    const qualified = snapshot.funnel.find((stage) => stage.id === 'qualified');

    expect(qualified?.stalledCount).toBe(1);
    expect(qualified?.withoutNextAction).toBe(1);
    expect(qualified?.bottleneck).toBe('critical');
  });

  it('liefert zu jeder gewichteten Chance Formel, Daten, Lücken und Unsicherheit', () => {
    const snapshot = buildSalesControlSnapshot(state({ followUps: [], appointments: [], callEvents: [] }), NOW, 'month');
    const [item] = snapshot.forecast.items;

    expect(item.formula).toContain('Arbeitswert');
    expect(item.usedData.length).toBeGreaterThan(0);
    expect(item.missingFactors).toEqual(expect.arrayContaining(['Kein offenes Follow-up', 'Kein bevorstehender Termin']));
    expect(item.uncertainty).toBe('mittel');
  });
});

describe('calculateSalesScenario', () => {
  it('berechnet Zielkette sowie Tages- und Wochenaktivität nachvollziehbar', () => {
    const result = calculateSalesScenario({
      annualGoal: 120_000,
      monthlyGoal: 10_000,
      averagePropertyValue: 500_000,
      effectiveCommissionRate: 0.02,
      contactToConversationRate: 0.5,
      conversationToAppointmentRate: 0.5,
      appointmentToMandateRate: 0.5,
      mandateToSaleRate: 0.5,
      availableWorkDays: 20,
    });

    expect(result.revenuePerClosing).toBe(10_000);
    expect(result.closings).toBe(1);
    expect(result.mandates).toBe(2);
    expect(result.appointments).toBe(4);
    expect(result.conversations).toBe(8);
    expect(result.contacts).toBe(16);
    expect(result.daily.contacts).toBe(0.8);
    expect(result.weekly.contacts).toBe(4);
    expect(result.formulas.length).toBeGreaterThan(0);
  });

  it('weist ungültige Annahmen aus statt Ergebnisse zu erfinden', () => {
    const result = calculateSalesScenario({
      annualGoal: 0,
      monthlyGoal: 0,
      averagePropertyValue: -1,
      effectiveCommissionRate: 0,
      contactToConversationRate: 2,
      conversationToAppointmentRate: 0,
      appointmentToMandateRate: 0,
      mandateToSaleRate: 0,
      availableWorkDays: 0,
    });

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.closings).toBe(0);
  });
});

describe('getAnalyticsCapabilities', () => {
  it('hält Viewer im Workspace schreibgeschützt, erlaubt aber lokale Szenarien', () => {
    expect(getAnalyticsCapabilities('viewer')).toEqual({
      readOnlyWorkspace: true,
      canEditLocalScenario: true,
      scenarioPersistence: 'none',
    });
  });
});
