import { describe, expect, it } from 'vitest';
import {
  buildAppointmentBriefing,
  buildAppointmentOperations,
  deriveAppointmentKind,
  getAppointmentCapabilities,
  type AppointmentOperationsInput,
} from '../src/domain/appointments/appointmentOperations';
import type { Appointment, Contact, Property } from '../src/types/domain';

const now = new Date('2026-07-14T08:00:00.000Z');

const contact: Contact = {
  id: 'contact-1',
  firstName: 'Anna',
  lastName: 'Eigentümerin',
  phone: '+49 6000 123456',
  email: 'anna@example.test',
  city: 'Bruchköbel',
  source: 'Empfehlung',
  role: 'Eigentümer',
  stage: 'appointment',
  priority: 'high',
  potential: 450000,
  lastContactAt: '2026-07-13T10:00:00.000Z',
  createdAt: '2026-07-01T10:00:00.000Z',
  notes: 'Einwand: Noch unsicher wegen des Zeitpunkts',
};

const property: Property = {
  id: 'property-1',
  title: 'Einfamilienhaus',
  address: 'Musterstraße 1',
  city: 'Bruchköbel',
  type: 'Einfamilienhaus',
  status: 'Bewertung',
  estimatedValue: 450000,
  ownerContactId: contact.id,
};

const appointment = (patch: Partial<Appointment> = {}): Appointment => ({
  id: 'appointment-1',
  contactId: contact.id,
  title: 'Bewertungstermin bestätigt',
  subtitle: 'Ziel: Verkaufsbereitschaft klären; Mindestziel: Unterlagenliste abstimmen; Idealziel: Bewertungsauftrag; Frage: Gewünschter Zeitplan',
  startsAt: '2026-07-14T10:00:00.000Z',
  status: 'today',
  ...patch,
});

const input = (patch: Partial<AppointmentOperationsInput> = {}): AppointmentOperationsInput => ({
  appointments: [appointment()],
  contacts: [contact],
  properties: [property],
  followUps: [{
    id: 'followup-1',
    contactId: contact.id,
    title: 'Unterlagen nachfassen',
    dueAt: '2026-07-15T09:00:00.000Z',
    priority: 'high',
    status: 'open',
    channel: 'phone',
  }],
  callEvents: [],
  now,
  ...patch,
});

describe('appointment field operations', () => {
  it('marks an appointment without a contact as a high preparation risk', () => {
    const orphan = appointment({ contactId: undefined });
    const briefing = buildAppointmentBriefing(input({ appointments: [orphan] }), orphan);

    expect(briefing.contact).toBeUndefined();
    expect(briefing.issues.some((issue) => issue.code === 'contact_missing' && issue.severity === 'high')).toBe(true);
  });

  it('marks a valuation appointment without an object link without guessing an object', () => {
    const briefing = buildAppointmentBriefing(input({ properties: [] }), appointment());

    expect(briefing.propertyResolution.status).toBe('missing');
    expect(briefing.issues.some((issue) => issue.code === 'property_missing')).toBe(true);
    expect(briefing.documentAssessment).toContain('Nicht prüfbar');
  });

  it('separates past and future appointments', () => {
    const snapshot = buildAppointmentOperations(input({
      appointments: [
        appointment({ id: 'past', startsAt: '2026-07-13T10:00:00.000Z' }),
        appointment({ id: 'future', startsAt: '2026-07-15T10:00:00.000Z' }),
      ],
    }));

    expect(snapshot.past.map((item) => item.appointment.id)).toEqual(['past']);
    expect(snapshot.future.map((item) => item.appointment.id)).toEqual(['future']);
  });

  it('keeps invalid time values visible instead of dropping them', () => {
    const invalid = appointment({ id: 'invalid', startsAt: 'not-a-date' });
    const snapshot = buildAppointmentOperations(input({ appointments: [invalid] }));

    expect(snapshot.invalid).toHaveLength(1);
    expect(snapshot.invalid[0]?.issues.some((issue) => issue.code === 'invalid_time')).toBe(true);
  });

  it('detects overlapping estimated appointment blocks', () => {
    const snapshot = buildAppointmentOperations(input({
      appointments: [
        appointment({ id: 'first', startsAt: '2026-07-14T10:00:00.000Z' }),
        appointment({ id: 'second', startsAt: '2026-07-14T10:15:00.000Z', title: 'Besichtigung bestätigt' }),
      ],
    }));

    expect(snapshot.today).toHaveLength(2);
    expect(snapshot.today.every((item) => item.issues.some((issue) => issue.code === 'time_conflict'))).toBe(true);
    expect(snapshot.route.find((item) => item.briefing.appointment.id === 'first')?.conflictWithAppointmentIds).toEqual(['second']);
  });

  it('reports missing preparation data deterministically', () => {
    const incompleteContact = { ...contact, phone: '', lastContactAt: undefined, notes: undefined };
    const incomplete = appointment({ title: 'Termin', subtitle: '' });
    const briefing = buildAppointmentBriefing(input({
      contacts: [incompleteContact],
      properties: [],
      followUps: [],
      appointments: [incomplete],
    }), incomplete);
    const codes = briefing.issues.map((issue) => issue.code);

    expect(codes).toEqual(expect.arrayContaining([
      'phone_missing',
      'address_missing',
      'last_conversation_missing',
      'goal_missing',
      'next_action_missing',
      'confirmation_missing',
    ]));
  });

  it('returns a stable empty state for an empty appointment list', () => {
    const snapshot = buildAppointmentOperations(input({ appointments: [] }));

    expect(snapshot.today).toEqual([]);
    expect(snapshot.route).toEqual([]);
    expect(snapshot.highRiskCount).toBe(0);
  });

  it('sorts equal timestamps by title and then id', () => {
    const appointments = [
      appointment({ id: 'z', title: 'Netzwerktermin', startsAt: '2026-07-14T10:00:00.000Z' }),
      appointment({ id: 'b', title: 'Besichtigung', startsAt: '2026-07-14T10:00:00.000Z' }),
      appointment({ id: 'a', title: 'Besichtigung', startsAt: '2026-07-14T10:00:00.000Z' }),
    ];
    const firstRun = buildAppointmentOperations(input({ appointments })).today.map((item) => item.appointment.id);
    const secondRun = buildAppointmentOperations(input({ appointments: [...appointments].reverse() })).today.map((item) => item.appointment.id);

    expect(firstRun).toEqual(['a', 'b', 'z']);
    expect(secondRun).toEqual(firstRun);
  });

  it('keeps viewers read-only', () => {
    expect(getAppointmentCapabilities('viewer')).toEqual({
      canCreateFollowUp: false,
      canMovePipeline: false,
      canPersistAppointmentOutcome: false,
      canEditAppointment: false,
    });
  });

  it('supports an offline mock source without changing prioritisation', () => {
    const workspace = buildAppointmentOperations(input({ sourceMode: 'workspace' }));
    const offline = buildAppointmentOperations(input({ sourceMode: 'offline-mock' }));

    expect(offline.sourceMode).toBe('offline-mock');
    expect(offline.today.map((item) => item.appointment.id)).toEqual(workspace.today.map((item) => item.appointment.id));
    expect(offline.today.map((item) => item.priority)).toEqual(workspace.today.map((item) => item.priority));
  });

  it('marks unclear appointment types visibly', () => {
    expect(deriveAppointmentKind(appointment({ title: 'Kaffee', subtitle: '' }))).toMatchObject({
      kind: 'unklar',
      confidence: 'unclear',
    });
  });
});
