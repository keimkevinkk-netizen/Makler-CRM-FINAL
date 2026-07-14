import { describe, expect, it } from 'vitest';
import type { AppState, Appointment, CallEvent, Contact, FollowUp, Property, UserRole } from '../../types/domain';
import {
  buildDailyExecutionPlan,
  getExecutionCapabilities,
  prioritizeActions,
} from './engine';

const NOW = Date.parse('2026-07-14T08:00:00.000Z');

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
    lastContactAt: '2026-07-01T08:00:00.000Z',
    nextActionAt: undefined,
    notes: 'Verkaufsinteresse',
    createdAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

function followUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return {
    id: 'followup-1',
    contactId: 'contact-1',
    title: 'Rückruf zur Bewertung',
    dueAt: '2026-07-12T08:00:00.000Z',
    priority: 'high',
    status: 'open',
    channel: 'phone',
    ...overrides,
  };
}

function call(overrides: Partial<CallEvent> = {}): CallEvent {
  return {
    id: 'call-1',
    contactId: 'contact-1',
    outcome: 'conversation',
    createdAt: '2026-07-10T08:00:00.000Z',
    note: 'Positives Gespräch',
    ...overrides,
  };
}

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1',
    contactId: 'contact-1',
    title: 'Bewertungstermin',
    subtitle: 'Vor Ort',
    startsAt: '2026-07-14T12:00:00.000Z',
    status: 'today',
    ...overrides,
  };
}

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: 'property-1',
    title: 'Einfamilienhaus',
    address: 'Musterstraße 1',
    city: 'Hanau',
    type: 'Haus',
    status: 'Bewertung',
    estimatedValue: 500_000,
    ownerContactId: 'contact-1',
    ...overrides,
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    schemaVersion: 1,
    workspace: {
      id: 'workspace-1',
      name: 'VINCERE',
      region: 'Main-Kinzig-Kreis',
      createdAt: '2026-06-01T08:00:00.000Z',
    },
    currentUser: {
      id: 'user-1',
      workspaceId: 'workspace-1',
      name: 'Kevin',
      email: 'kevin@example.com',
      role: 'owner',
    },
    contacts: [contact()],
    followUps: [followUp()],
    properties: [],
    appointments: [],
    callEvents: [],
    auditEvents: [],
    ...overrides,
  };
}

describe('prioritizeActions', () => {
  it('priorisiert ein überfälliges Eigentümer-Follow-up vor einer späteren Niedrig-Priorität-Aktion', () => {
    const lowContact = contact({
      id: 'contact-2',
      firstName: 'Ben',
      lastName: 'Schmidt',
      role: 'Käufer',
      priority: 'low',
      potential: 30,
      lastContactAt: '2026-07-13T08:00:00.000Z',
    });
    const result = prioritizeActions(state({
      contacts: [lowContact, contact()],
      followUps: [
        followUp({ id: 'followup-2', contactId: 'contact-2', dueAt: '2026-07-20T08:00:00.000Z', priority: 'low' }),
        followUp(),
      ],
    }), NOW);

    expect(result.map((action) => action.contactId)).toEqual(['contact-1', 'contact-2']);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('liefert eine nachvollziehbare Punkte- und Textbegründung', () => {
    const [action] = prioritizeActions(state({
      properties: [property()],
      appointments: [appointment()],
      callEvents: [call()],
    }), NOW);

    expect(action.reason).toContain('Priorisiert, weil');
    expect(action.factors.map((factor) => factor.key)).toEqual(expect.arrayContaining([
      'followup_overdue',
      'owner_role',
      'valuation_opportunity',
      'upcoming_appointment',
      'recent_positive_outcome',
    ]));
    expect(action.factors.reduce((sum, factor) => sum + factor.points, 0)).toBe(action.score);
  });

  it('erzeugt bei doppelt gelieferten Kontaktdatensätzen keine doppelte Aktion', () => {
    const duplicate = contact({ notes: 'Duplikat aus Synchronisation' });
    const result = prioritizeActions(state({
      contacts: [contact(), duplicate],
      followUps: [followUp()],
    }), NOW);

    expect(result).toHaveLength(1);
    expect(result[0].contactId).toBe('contact-1');
  });

  it('bündelt mehrere offene Follow-ups desselben Kontakts in genau eine Aktion', () => {
    const result = prioritizeActions(state({
      followUps: [
        followUp({ id: 'followup-a', dueAt: '2026-07-11T08:00:00.000Z' }),
        followUp({ id: 'followup-b', dueAt: '2026-07-13T08:00:00.000Z', priority: 'medium' }),
      ],
    }), NOW);

    expect(result).toHaveLength(1);
    expect(result[0].relatedFollowUpIds).toEqual(['followup-a', 'followup-b']);
    expect(result[0].factors.some((factor) => factor.key === 'multiple_open_followups')).toBe(true);
  });

  it('ignoriert erledigte Follow-ups vollständig', () => {
    const result = prioritizeActions(state({
      contacts: [contact({ nextActionAt: '2026-07-16T08:00:00.000Z' })],
      followUps: [followUp({ status: 'done' })],
    }), NOW);

    expect(result).toEqual([]);
  });

  it('erzeugt für einen hoch priorisierten Kontakt ohne nächste Aktion eine Lücken-Aktion', () => {
    const [action] = prioritizeActions(state({ followUps: [] }), NOW);

    expect(action.kind).toBe('contact-gap');
    expect(action.followUpId).toBeUndefined();
    expect(action.factors.some((factor) => factor.key === 'no_next_action')).toBe(true);
    expect(action.missingSignals).toContain('Es ist keine zukünftige nächste Aktion hinterlegt.');
  });

  it('blockiert einen Telefonkontakt ohne Telefonnummer und ohne alternative E-Mail', () => {
    const [action] = prioritizeActions(state({
      contacts: [contact({ phone: '', email: undefined })],
    }), NOW);

    expect(action.channel).toBe('planning');
    expect(action.blockedReason).toContain('Keine Telefonnummer');
    expect(action.missingSignals).toContain('Telefonnummer fehlt.');
  });

  it('wechselt nach drei erfolglosen Anrufen deterministisch auf E-Mail', () => {
    const calls = [1, 2, 3].map((index) => call({
      id: `call-${index}`,
      outcome: 'no_answer',
      createdAt: `2026-07-${10 + index}T08:00:00.000Z`,
    }));
    const [action] = prioritizeActions(state({ callEvents: calls }), NOW);

    expect(action.channel).toBe('email');
    expect(action.factors.some((factor) => factor.key === 'failed_calls')).toBe(true);
    expect(action.missingSignals.some((signal) => signal.includes('Kanal'))).toBe(true);
  });

  it('sortiert gleiche Scores stabil nach Fälligkeit und Kontakt-ID', () => {
    const first = contact({ id: 'a-contact', firstName: 'A', role: 'Käufer', potential: 50, priority: 'medium' });
    const second = contact({ id: 'b-contact', firstName: 'B', role: 'Käufer', potential: 50, priority: 'medium' });
    const result = prioritizeActions(state({
      contacts: [second, first],
      followUps: [
        followUp({ id: 'followup-b', contactId: 'b-contact', dueAt: '2026-07-13T08:00:00.000Z', priority: 'medium' }),
        followUp({ id: 'followup-a', contactId: 'a-contact', dueAt: '2026-07-13T08:00:00.000Z', priority: 'medium' }),
      ],
    }), NOW);

    expect(result[0].score).toBe(result[1].score);
    expect(result.map((action) => action.contactId)).toEqual(['a-contact', 'b-contact']);
  });

  it('liefert bei identischen Eingaben und gleichem Bewertungszeitpunkt identische Ergebnisse', () => {
    const input = state({
      contacts: [contact(), contact({ id: 'contact-2', firstName: 'Berta' })],
      followUps: [followUp(), followUp({ id: 'followup-2', contactId: 'contact-2' })],
      callEvents: [call()],
      properties: [property()],
    });

    expect(prioritizeActions(input, NOW)).toEqual(prioritizeActions(input, NOW));
  });
});

describe('buildDailyExecutionPlan', () => {
  it('trennt überfällige Aufgaben, schnelle Erfolge, Eigentümer und Kontakte ohne nächste Aktion', () => {
    const ownerWithoutAction = contact({
      id: 'contact-2',
      firstName: 'Otto',
      lastName: 'Eigentümer',
      phone: '+49 160 1234567',
      lastContactAt: undefined,
    });
    const plan = buildDailyExecutionPlan(state({
      contacts: [contact(), ownerWithoutAction],
      followUps: [followUp()],
    }), NOW);

    expect(plan.topActions.length).toBeGreaterThan(0);
    expect(plan.overdueFollowUps).toHaveLength(1);
    expect(plan.quickWins.length).toBeGreaterThan(0);
    expect(plan.importantOwnerActions.map((action) => action.contactId)).toEqual(expect.arrayContaining(['contact-1', 'contact-2']));
    expect(plan.contactsWithoutNextAction.map((item) => item.id)).toContain('contact-2');
  });

  it('berücksichtigt nur zukünftige Termine und verwirft vergangene Termine als Dringlichkeitssignal', () => {
    const plan = buildDailyExecutionPlan(state({
      appointments: [
        appointment({ id: 'past', startsAt: '2026-07-13T12:00:00.000Z' }),
        appointment({ id: 'future', startsAt: '2026-07-14T12:00:00.000Z' }),
      ],
    }), NOW);

    expect(plan.upcomingAppointments.map((item) => item.id)).toEqual(['future']);
    expect(plan.actions[0].factors.filter((factor) => factor.key === 'upcoming_appointment')).toHaveLength(1);
  });

  it('berechnet Tagesziel und Fortschritt aus dokumentierten Aktionen des UTC-Tages', () => {
    const plan = buildDailyExecutionPlan(state({
      callEvents: [call({ id: 'today-call', createdAt: '2026-07-14T07:00:00.000Z' })],
      auditEvents: [{
        id: 'audit-1',
        actorId: 'user-1',
        workspaceId: 'workspace-1',
        entity: 'followup',
        entityId: 'followup-old',
        action: 'completed',
        summary: 'Erledigt',
        createdAt: '2026-07-14T06:00:00.000Z',
      }],
    }), NOW);

    expect(plan.progress.callsLogged).toBe(1);
    expect(plan.progress.followUpsCompleted).toBe(1);
    expect(plan.progress.completed).toBeLessThanOrEqual(plan.progress.target);
  });
});

describe('getExecutionCapabilities', () => {
  it.each<UserRole>(['owner', 'admin', 'agent'])('erlaubt %s die Ausführung', (role) => {
    expect(getExecutionCapabilities(role)).toEqual({
      canLogCalls: true,
      canManageFollowUps: true,
      canMovePipeline: true,
      readOnly: false,
    });
  });

  it('setzt viewer konsequent auf Lesezugriff', () => {
    expect(getExecutionCapabilities('viewer')).toEqual({
      canLogCalls: false,
      canManageFollowUps: false,
      canMovePipeline: false,
      readOnly: true,
    });
  });
});
