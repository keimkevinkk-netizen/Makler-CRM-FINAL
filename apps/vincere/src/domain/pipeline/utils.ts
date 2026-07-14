import type { Appointment, CallEvent, Contact, FollowUp, Property } from '../../types/domain';
import type { PipelineViewStage } from './model';

export const DAY_MS = 86_400_000;
export const UPCOMING_APPOINTMENT_MS = 72 * 3_600_000;
const PREPARATION_WINDOW_MS = 7 * DAY_MS;

export function parseTimestamp(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return [...items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

export function groupByContact<T extends { contactId: string }>(items: T[]): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const item of items) {
    const current = result.get(item.contactId) ?? [];
    current.push(item);
    result.set(item.contactId, current);
  }
  return result;
}

export function groupPropertiesByOwner(properties: Property[]): Map<string, Property[]> {
  const result = new Map<string, Property[]>();
  for (const property of properties) {
    if (!property.ownerContactId) continue;
    const current = result.get(property.ownerContactId) ?? [];
    current.push(property);
    result.set(property.ownerContactId, current);
  }
  return result;
}

export function sortCalls(calls: CallEvent[]): CallEvent[] {
  return [...calls].sort((left, right) => {
    const leftTime = parseTimestamp(left.createdAt) ?? 0;
    const rightTime = parseTimestamp(right.createdAt) ?? 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}

export function getViewStage(contact: Contact, calls: CallEvent[], now: number): PipelineViewStage {
  if (contact.stage === 'sold') return 'sold';
  const latest = sortCalls(calls)[0];
  const nextAction = parseTimestamp(contact.nextActionAt);
  if (latest?.outcome === 'not_interested' && (!nextAction || nextAction < now)) return 'inactive';
  return contact.stage;
}

export function getLastActivity(
  contact: Contact,
  calls: CallEvent[],
  followUps: FollowUp[],
  appointments: Appointment[],
  now: number,
): { at?: string; label: string } {
  const candidates: { at?: string; label: string }[] = [
    { at: contact.lastContactAt, label: 'Letzter Kontakt' },
    ...calls.map((call) => ({
      at: call.createdAt,
      label: call.outcome === 'appointment'
        ? 'Termin vereinbart'
        : call.outcome === 'conversation'
          ? 'Gespräch geführt'
          : call.outcome === 'no_answer'
            ? 'Nicht erreicht'
            : 'Kein Interesse',
    })),
    ...followUps
      .filter((followUp) => followUp.status === 'done')
      .map((followUp) => ({ at: followUp.dueAt, label: `Follow-up erledigt: ${followUp.title}` })),
    ...appointments.map((appointment) => ({ at: appointment.startsAt, label: `Termin: ${appointment.title}` })),
    { at: contact.createdAt, label: 'Kontakt angelegt' },
  ].filter((candidate) => {
    const timestamp = parseTimestamp(candidate.at);
    return timestamp !== undefined && timestamp <= now;
  });

  candidates.sort((left, right) => (parseTimestamp(right.at) ?? 0) - (parseTimestamp(left.at) ?? 0));
  return candidates[0] ?? { label: 'Keine Aktivität rekonstruierbar' };
}

export function getNextOpenFollowUp(followUps: FollowUp[]): FollowUp | undefined {
  return followUps
    .filter((followUp) => followUp.status === 'open')
    .sort((left, right) => {
      const leftTime = parseTimestamp(left.dueAt) ?? Number.POSITIVE_INFINITY;
      const rightTime = parseTimestamp(right.dueAt) ?? Number.POSITIVE_INFINITY;
      return leftTime !== rightTime ? leftTime - rightTime : left.id.localeCompare(right.id);
    })[0];
}

export function hasFutureContactAction(contact: Contact, now: number): boolean {
  const nextActionAt = parseTimestamp(contact.nextActionAt);
  return nextActionAt !== undefined && nextActionAt >= now;
}

export function getUpcomingAppointments(appointments: Appointment[], now: number): Appointment[] {
  return appointments
    .filter((appointment) => {
      const startsAt = parseTimestamp(appointment.startsAt);
      return startsAt !== undefined && startsAt >= now && startsAt <= now + UPCOMING_APPOINTMENT_MS;
    })
    .sort((left, right) => {
      const leftTime = parseTimestamp(left.startsAt) ?? Number.POSITIVE_INFINITY;
      const rightTime = parseTimestamp(right.startsAt) ?? Number.POSITIVE_INFINITY;
      return leftTime !== rightTime ? leftTime - rightTime : left.id.localeCompare(right.id);
    });
}

export function hasPreparationFollowUp(followUps: FollowUp[], appointment: Appointment): boolean {
  const appointmentTime = parseTimestamp(appointment.startsAt);
  if (appointmentTime === undefined) return false;
  return followUps.some((followUp) => {
    if (followUp.status !== 'open') return false;
    const dueAt = parseTimestamp(followUp.dueAt);
    if (dueAt === undefined || dueAt > appointmentTime || dueAt < appointmentTime - PREPARATION_WINDOW_MS) return false;
    return followUp.channel === 'meeting' || /vorbereit|unterlag|agenda|termin|bewertung/.test(followUp.title.toLowerCase());
  });
}

export function hasValuationSignal(properties: Property[], appointments: Appointment[]): boolean {
  return properties.some((property) => property.status === 'Bewertung')
    || appointments.some((appointment) => /bewert/.test(`${appointment.title} ${appointment.subtitle}`.toLowerCase()));
}

export function getKnownObjections(contact: Contact, calls: CallEvent[]): string[] {
  const source = [contact.notes, ...calls.map((call) => call.note)]
    .filter((value): value is string => Boolean(value?.trim()));
  const patterns = [
    /selbst verkaufen/i,
    /schon (einen|eine) makler/i,
    /provision/i,
    /preis/i,
    /keine eile/i,
    /noch nicht/i,
    /überlegen/i,
  ];
  return [...new Set(source.filter((text) => patterns.some((pattern) => pattern.test(text))).map((text) => text.trim()))].slice(0, 5);
}
