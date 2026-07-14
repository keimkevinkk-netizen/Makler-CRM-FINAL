import type { Appointment, Contact, FollowUp, Property } from '../../types/domain';

export type PropertySort = 'action' | 'value' | 'readiness' | 'name';

export interface PropertyFilters {
  query: string;
  status: Property['status'] | 'all';
  type: string | 'all';
  city: string | 'all';
  sort: PropertySort;
}

export interface ScoreFactor {
  label: string;
  points: number;
}

export interface PropertyOpportunity {
  property: Property;
  owner?: Contact;
  ownerReferenceBroken: boolean;
  openFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  nextAppointment?: Appointment;
  actionScore: number;
  actionFactors: ScoreFactor[];
  readiness: number;
  dataGaps: string[];
  risks: string[];
  recommendedAction: string;
  internalRange?: { min: number; max: number; spread: number };
}

export interface PropertyPortfolioSummary {
  total: number;
  active: number;
  urgent: number;
  withoutOwner: number;
  withoutNextAction: number;
  pipelineValue: number;
  averageReadiness: number;
}

const activeStatuses = new Set<Property['status']>(['Akquise', 'Bewertung', 'Vermarktung']);

const statusBase: Record<Property['status'], number> = {
  Akquise: 22,
  Bewertung: 26,
  Vermarktung: 18,
  Verkauft: 4,
};

const priorityPoints: Record<Contact['priority'], number> = {
  high: 14,
  medium: 7,
  low: 2,
};

const validTimestamp = (value?: string) => value && !Number.isNaN(Date.parse(value));
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function buildReadiness(property: Property, owner?: Contact) {
  let score = 0;
  const gaps: string[] = [];

  if (property.title.trim()) score += 15;
  else gaps.push('Bezeichnung fehlt');

  if (property.address.trim()) score += 15;
  else gaps.push('Adresse fehlt');

  if (property.city.trim()) score += 10;
  else gaps.push('Ort fehlt');

  if (property.type.trim()) score += 10;
  else gaps.push('Objektart fehlt');

  if (property.estimatedValue > 0) score += 20;
  else gaps.push('Arbeitswert fehlt');

  if (owner) score += 20;
  else gaps.push('Eigentümer ist nicht verknüpft');

  if (owner?.phone.trim()) score += 10;
  else if (owner) gaps.push('Telefonnummer des Eigentümers fehlt');

  return { readiness: clamp(score), dataGaps: gaps };
}

function nextAppointmentFor(_property: Property, owner: Contact | undefined, appointments: Appointment[], now: Date) {
  if (!owner) return undefined;
  return appointments
    .filter((appointment) => appointment.contactId === owner.id && validTimestamp(appointment.startsAt))
    .filter((appointment) => Date.parse(appointment.startsAt) >= now.getTime())
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];
}

function recommendation(
  property: Property,
  owner: Contact | undefined,
  ownerReferenceBroken: boolean,
  overdueFollowUps: FollowUp[],
  openFollowUps: FollowUp[],
  nextAppointment?: Appointment,
) {
  if (ownerReferenceBroken) return 'Fehlerhafte Eigentümerverknüpfung prüfen';
  if (!owner) return 'Eigentümer verknüpfen und qualifizieren';
  if (!owner.phone.trim()) return 'Telefonnummer ergänzen und Kontaktweg klären';
  if (overdueFollowUps.length > 0) return 'Überfälliges Eigentümer-Follow-up erledigen';
  if (property.estimatedValue <= 0) return 'Bewertungsgrundlage und internen Arbeitswert erfassen';
  if (property.status === 'Akquise') return openFollowUps.length > 0 ? 'Akquise-Follow-up durchführen' : 'Eigentümergespräch als nächste Aktion planen';
  if (property.status === 'Bewertung') return nextAppointment ? 'Bewertungstermin vorbereiten' : 'Bewertungstermin vereinbaren';
  if (property.status === 'Vermarktung') return 'Vermarktungsfortschritt mit dem Eigentümer abstimmen';
  return 'Nachbetreuung und Empfehlungsanfrage planen';
}

export function buildPropertyOpportunity(
  property: Property,
  context: {
    contacts: Contact[];
    followUps: FollowUp[];
    appointments: Appointment[];
    now?: Date;
  },
): PropertyOpportunity {
  const now = context.now ?? new Date();
  const owner = property.ownerContactId
    ? context.contacts.find((contact) => contact.id === property.ownerContactId)
    : undefined;
  const ownerReferenceBroken = Boolean(property.ownerContactId && !owner);

  const openFollowUps = owner
    ? context.followUps
      .filter((followUp) => followUp.contactId === owner.id && followUp.status === 'open')
      .sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt))
    : [];
  const overdueFollowUps = openFollowUps.filter(
    (followUp) => validTimestamp(followUp.dueAt) && Date.parse(followUp.dueAt) < now.getTime(),
  );
  const nextAppointment = nextAppointmentFor(property, owner, context.appointments, now);
  const { readiness, dataGaps } = buildReadiness(property, owner);
  const actionFactors: ScoreFactor[] = [{ label: `Phase ${property.status}`, points: statusBase[property.status] }];

  if (activeStatuses.has(property.status) && !owner) actionFactors.push({ label: 'Kein Eigentümer verknüpft', points: 16 });
  if (ownerReferenceBroken) actionFactors.push({ label: 'Verknüpfung ist fehlerhaft', points: 18 });
  if (owner) {
    actionFactors.push({ label: `Kontaktpriorität ${owner.priority}`, points: priorityPoints[owner.priority] });
    const potentialPoints = Math.round(clamp(owner.potential) * 0.18);
    if (potentialPoints > 0) actionFactors.push({ label: 'Eigentümerpotenzial', points: potentialPoints });
    if (owner.role === 'Eigentümer') actionFactors.push({ label: 'Bestätigter Eigentümerkontakt', points: 8 });
  }
  if (overdueFollowUps.length > 0) actionFactors.push({ label: 'Überfälliges Follow-up', points: 18 });
  else if (openFollowUps.length > 0) actionFactors.push({ label: 'Geplante nächste Aktion', points: 5 });
  else if (activeStatuses.has(property.status)) actionFactors.push({ label: 'Keine nächste Aktion geplant', points: 11 });
  if (nextAppointment) actionFactors.push({ label: 'Bevorstehender Termin', points: 7 });
  if (property.estimatedValue >= 500_000) actionFactors.push({ label: 'Hohes Objektvolumen', points: 7 });
  else if (property.estimatedValue >= 250_000) actionFactors.push({ label: 'Relevantes Objektvolumen', points: 4 });

  const risks: string[] = [];
  if (ownerReferenceBroken) risks.push('Die gespeicherte Eigentümer-ID verweist auf keinen vorhandenen Kontakt.');
  else if (!owner) risks.push('Ohne Eigentümerverknüpfung fehlen Gesprächsverlauf und nächste Aktion.');
  if (activeStatuses.has(property.status) && openFollowUps.length === 0) risks.push('Für dieses aktive Objekt ist kein offenes Follow-up geplant.');
  if (property.status === 'Bewertung' && !nextAppointment) risks.push('Bewertungsphase ohne bevorstehenden Termin.');
  if (property.estimatedValue <= 0) risks.push('Es ist kein interner Arbeitswert hinterlegt.');
  if (owner && !owner.phone.trim()) risks.push('Der verknüpfte Eigentümer besitzt keine Telefonnummer.');

  const spread = readiness >= 85 ? 0.07 : readiness >= 65 ? 0.1 : 0.15;
  const internalRange = property.estimatedValue > 0
    ? {
      min: Math.round(property.estimatedValue * (1 - spread)),
      max: Math.round(property.estimatedValue * (1 + spread)),
      spread,
    }
    : undefined;

  return {
    property,
    owner,
    ownerReferenceBroken,
    openFollowUps,
    overdueFollowUps,
    nextAppointment,
    actionScore: clamp(actionFactors.reduce((sum, factor) => sum + factor.points, 0)),
    actionFactors,
    readiness,
    dataGaps,
    risks,
    recommendedAction: recommendation(
      property,
      owner,
      ownerReferenceBroken,
      overdueFollowUps,
      openFollowUps,
      nextAppointment,
    ),
    internalRange,
  };
}

export function buildPropertyOpportunities(
  properties: Property[],
  context: {
    contacts: Contact[];
    followUps: FollowUp[];
    appointments: Appointment[];
    now?: Date;
  },
) {
  return properties.map((property) => buildPropertyOpportunity(property, context));
}

export function filterPropertyOpportunities(items: PropertyOpportunity[], filters: PropertyFilters) {
  const query = filters.query.trim().toLocaleLowerCase('de-DE');
  const filtered = items.filter((item) => {
    const haystack = [
      item.property.title,
      item.property.address,
      item.property.city,
      item.property.type,
      item.owner ? `${item.owner.firstName} ${item.owner.lastName}` : '',
    ].join(' ').toLocaleLowerCase('de-DE');
    return (!query || haystack.includes(query))
      && (filters.status === 'all' || item.property.status === filters.status)
      && (filters.type === 'all' || item.property.type === filters.type)
      && (filters.city === 'all' || item.property.city === filters.city);
  });

  return [...filtered].sort((left, right) => {
    if (filters.sort === 'value') return right.property.estimatedValue - left.property.estimatedValue || left.property.title.localeCompare(right.property.title, 'de');
    if (filters.sort === 'readiness') return right.readiness - left.readiness || right.actionScore - left.actionScore;
    if (filters.sort === 'name') return left.property.title.localeCompare(right.property.title, 'de');
    return right.actionScore - left.actionScore || right.property.estimatedValue - left.property.estimatedValue || left.property.title.localeCompare(right.property.title, 'de');
  });
}

export function summarizePropertyPortfolio(items: PropertyOpportunity[]): PropertyPortfolioSummary {
  const active = items.filter((item) => activeStatuses.has(item.property.status));
  return {
    total: items.length,
    active: active.length,
    urgent: items.filter((item) => item.overdueFollowUps.length > 0 || item.ownerReferenceBroken || item.actionScore >= 70).length,
    withoutOwner: items.filter((item) => !item.owner).length,
    withoutNextAction: active.filter((item) => item.openFollowUps.length === 0).length,
    pipelineValue: active.reduce((sum, item) => sum + Math.max(0, item.property.estimatedValue), 0),
    averageReadiness: items.length === 0 ? 0 : Math.round(items.reduce((sum, item) => sum + item.readiness, 0) / items.length),
  };
}
