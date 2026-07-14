import type {
  AppState,
  Appointment,
  AuditEvent,
  CallEvent,
  Contact,
  FollowUp,
  Priority,
  Property,
} from '../../types/domain';

export type ContactCockpitSource = Pick<
  AppState,
  'contacts' | 'followUps' | 'properties' | 'appointments' | 'callEvents' | 'auditEvents'
>;

export const CONTACT_RULES = {
  highPotential: 75,
  staleContactDays: 21,
  newContactGraceDays: 7,
  repeatedNoAnswerCount: 2,
  appointmentPreparationDays: 7,
} as const;

export type InsightSeverity = 'critical' | 'warning' | 'info';
export type TimelineKind = 'call' | 'followup' | 'appointment' | 'property' | 'audit';
export type FollowUpFilter = 'all' | 'overdue' | 'open' | 'none';
export type ContactSortKey = 'priority' | 'potential' | 'lastActivity' | 'nextAction' | 'ownerIndex' | 'dataQuality' | 'name';

export interface ContactFilters {
  query: string;
  role: Contact['role'] | 'all';
  stage: Contact['stage'] | 'all';
  priority: Priority | 'all';
  followUp: FollowUpFilter;
  minPotential: number;
}

export interface SalesInsight {
  code:
    | 'missing_phone'
    | 'overdue'
    | 'stale'
    | 'never_contacted'
    | 'high_potential_without_action'
    | 'appointment_without_preparation'
    | 'owner_without_property'
    | 'repeated_no_answer'
    | 'closing_stage_without_followup';
  severity: InsightSeverity;
  title: string;
  detail: string;
  evidence: string[];
  recommendedAction: string;
}

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  occurredAt: string;
  title: string;
  detail: string;
  tone: 'neutral' | 'gold' | 'green' | 'red' | 'blue';
}

export interface ContactDataQuality {
  score: number;
  label: 'Vollständig' | 'Prüfen' | 'Lückenhaft';
  missingFields: string[];
}

export interface ContactCockpitModel {
  contact: Contact;
  fullName: string;
  openFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  appointments: Appointment[];
  callEvents: CallEvent[];
  properties: Property[];
  timeline: TimelineItem[];
  insights: SalesInsight[];
  lastActivityAt?: string;
  nextActionAt?: string;
  nextActionLabel: string;
  ownerIndex: number;
  ownerIndexReasons: string[];
  dataQuality: ContactDataQuality;
  noAnswerCount: number;
  salesSummary: string;
}

export interface RelationDiagnostics {
  total: number;
  orphanFollowUpIds: string[];
  orphanAppointmentIds: string[];
  orphanCallIds: string[];
  orphanPropertyIds: string[];
}

const DAY_MS = 86_400_000;
const PREPARATION_PATTERN = /vorbereit|unterlag|agenda|termin|bewertung|exposé|expose/i;
const OWNER_NOTE_PATTERN = /eigentum|immobil|haus|wohnung|grundstück|bewertung|verkauf|mandat/i;
const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

const validDate = (value?: string) => {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const descendingDate = (left?: string, right?: string) => (validDate(right) ?? -Infinity) - (validDate(left) ?? -Infinity);
const ascendingDate = (left?: string, right?: string) => (validDate(left) ?? Infinity) - (validDate(right) ?? Infinity);
const daysSince = (value: string, now: Date) => Math.floor((now.getTime() - Date.parse(value)) / DAY_MS);
const isPast = (value: string, now: Date) => Date.parse(value) < now.getTime();
const isFutureOrNow = (value: string, now: Date) => Date.parse(value) >= now.getTime();

function formatRuleDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function callOutcomeLabel(outcome: CallEvent['outcome']) {
  switch (outcome) {
    case 'no_answer': return 'Nicht erreicht';
    case 'conversation': return 'Gespräch geführt';
    case 'appointment': return 'Termin vereinbart';
    case 'not_interested': return 'Aktuell kein Interesse';
  }
}

function callTone(outcome: CallEvent['outcome']): TimelineItem['tone'] {
  if (outcome === 'appointment') return 'green';
  if (outcome === 'conversation') return 'blue';
  if (outcome === 'not_interested') return 'red';
  return 'neutral';
}

function auditTitle(event: AuditEvent) {
  const labels: Record<string, string> = {
    created: 'Datensatz angelegt',
    updated: 'Datensatz aktualisiert',
    completed: 'Aufgabe abgeschlossen',
    rescheduled: 'Aufgabe neu terminiert',
    stage_changed: 'Pipeline-Status geändert',
    logged: 'Aktivität dokumentiert',
  };
  return labels[event.action] ?? 'Aktivität aktualisiert';
}

export function validateContactRelations(source: ContactCockpitSource): RelationDiagnostics {
  const ids = new Set(source.contacts.map((contact) => contact.id));
  const orphanFollowUpIds = source.followUps.filter((item) => !ids.has(item.contactId)).map((item) => item.id);
  const orphanAppointmentIds = source.appointments.filter((item) => item.contactId && !ids.has(item.contactId)).map((item) => item.id);
  const orphanCallIds = source.callEvents.filter((item) => !ids.has(item.contactId)).map((item) => item.id);
  const orphanPropertyIds = source.properties.filter((item) => item.ownerContactId && !ids.has(item.ownerContactId)).map((item) => item.id);
  return {
    total: orphanFollowUpIds.length + orphanAppointmentIds.length + orphanCallIds.length + orphanPropertyIds.length,
    orphanFollowUpIds,
    orphanAppointmentIds,
    orphanCallIds,
    orphanPropertyIds,
  };
}

export function calculateDataQuality(contact: Contact, hasNextAction: boolean): ContactDataQuality {
  const fields = [
    { label: 'Vorname', value: contact.firstName, weight: 10 },
    { label: 'Nachname', value: contact.lastName, weight: 10 },
    { label: 'Telefon', value: contact.phone, weight: 20 },
    { label: 'Ort', value: contact.city, weight: 12 },
    { label: 'Quelle', value: contact.source, weight: 10 },
    { label: 'E-Mail', value: contact.email, weight: 8 },
    { label: 'Notizen', value: contact.notes, weight: 10 },
    { label: 'Letzte Aktivität', value: contact.lastContactAt, weight: 10 },
    { label: 'Nächste Aktion', value: hasNextAction ? 'ja' : '', weight: 10 },
  ];
  const missingFields = fields.filter((field) => !String(field.value ?? '').trim()).map((field) => field.label);
  const score = fields.reduce((sum, field) => sum + (String(field.value ?? '').trim() ? field.weight : 0), 0);
  return {
    score,
    label: score >= 85 ? 'Vollständig' : score >= 60 ? 'Prüfen' : 'Lückenhaft',
    missingFields,
  };
}

export function calculateOwnerIndex(contact: Contact, properties: Property[]) {
  const reasons: string[] = [];
  let score = 0;
  if (contact.role === 'Eigentümer') { score += 45; reasons.push('Rolle Eigentümer'); }
  if (properties.length > 0) { score += 25; reasons.push(`${properties.length} verknüpfte Immobilie${properties.length === 1 ? '' : 'n'}`); }
  if (contact.stage === 'qualified') { score += 10; reasons.push('qualifizierter Kontakt'); }
  if (contact.stage === 'appointment') { score += 15; reasons.push('Terminphase'); }
  if (contact.stage === 'mandate' || contact.stage === 'sold') { score += 20; reasons.push('Mandats- oder Abschlussphase'); }
  if (OWNER_NOTE_PATTERN.test(contact.notes ?? '')) { score += 10; reasons.push('konkreter Immobilienbezug in Notizen'); }
  if (/empfehl|marktbericht|tippgeber/i.test(contact.source)) { score += 5; reasons.push('qualifizierende Quelle'); }
  return { score: Math.min(score, 100), reasons };
}

export function mergeContactTimeline(contactId: string, source: ContactCockpitSource): TimelineItem[] {
  const followUps = source.followUps.filter((item) => item.contactId === contactId);
  const appointments = source.appointments.filter((item) => item.contactId === contactId);
  const calls = source.callEvents.filter((item) => item.contactId === contactId);
  const properties = source.properties.filter((item) => item.ownerContactId === contactId);
  const relatedIds = new Set([
    contactId,
    ...followUps.map((item) => item.id),
    ...appointments.map((item) => item.id),
    ...calls.map((item) => item.id),
    ...properties.map((item) => item.id),
  ]);

  const timeline: TimelineItem[] = [
    ...calls.map((call): TimelineItem => ({
      id: `call-${call.id}`,
      kind: 'call',
      occurredAt: call.createdAt,
      title: callOutcomeLabel(call.outcome),
      detail: call.note?.trim() || 'Telefonereignis ohne zusätzliche Notiz.',
      tone: callTone(call.outcome),
    })),
    ...followUps.map((followUp): TimelineItem => ({
      id: `followup-${followUp.id}`,
      kind: 'followup',
      occurredAt: followUp.dueAt,
      title: followUp.status === 'done' ? `Erledigt: ${followUp.title}` : `Geplant: ${followUp.title}`,
      detail: `${followUp.channel === 'phone' ? 'Telefon' : followUp.channel === 'email' ? 'E-Mail' : 'Termin'} · Priorität ${followUp.priority}`,
      tone: followUp.status === 'done' ? 'green' : 'gold',
    })),
    ...appointments.map((appointment): TimelineItem => ({
      id: `appointment-${appointment.id}`,
      kind: 'appointment',
      occurredAt: appointment.startsAt,
      title: appointment.title,
      detail: appointment.subtitle,
      tone: 'blue',
    })),
    ...source.auditEvents
      .filter((event) => event.entityId && relatedIds.has(event.entityId))
      .filter((event) => !(event.action === 'created' && (event.entity === 'followup' || event.entity === 'call')))
      .map((event): TimelineItem => ({
        id: `audit-${event.id}`,
        kind: event.entity === 'property' ? 'property' : 'audit',
        occurredAt: event.createdAt,
        title: auditTitle(event),
        detail: event.summary,
        tone: event.entity === 'property' ? 'gold' : 'neutral',
      })),
  ];

  return timeline
    .filter((item) => validDate(item.occurredAt) !== undefined)
    .sort((left, right) => descendingDate(left.occurredAt, right.occurredAt));
}

function lastActivityAt(contact: Contact, calls: CallEvent[], appointments: Appointment[], followUps: FollowUp[], audits: AuditEvent[], now: Date) {
  const candidates = [
    contact.lastContactAt,
    ...calls.map((item) => item.createdAt),
    ...appointments.filter((item) => isPast(item.startsAt, now)).map((item) => item.startsAt),
    ...followUps.filter((item) => item.status === 'done').map((item) => item.dueAt),
    ...audits.filter((item) => isPast(item.createdAt, now)).map((item) => item.createdAt),
  ].filter((value): value is string => validDate(value) !== undefined);
  return candidates.sort(descendingDate)[0];
}

function nextAction(contact: Contact, followUps: FollowUp[], appointments: Appointment[], now: Date) {
  const items = [
    ...followUps.filter((item) => item.status === 'open').map((item) => ({ at: item.dueAt, label: item.title })),
    ...appointments.filter((item) => isFutureOrNow(item.startsAt, now)).map((item) => ({ at: item.startsAt, label: item.title })),
    ...(contact.nextActionAt ? [{ at: contact.nextActionAt, label: 'Geplante nächste Aktion' }] : []),
  ].filter((item) => validDate(item.at) !== undefined).sort((left, right) => ascendingDate(left.at, right.at));
  return items[0];
}

function buildInsights(
  contact: Contact,
  openFollowUps: FollowUp[],
  overdueFollowUps: FollowUp[],
  appointments: Appointment[],
  calls: CallEvent[],
  properties: Property[],
  lastActivity: string | undefined,
  nextActionAt: string | undefined,
  ownerIndex: number,
  now: Date,
): SalesInsight[] {
  const insights: SalesInsight[] = [];
  const upcomingAppointments = appointments.filter((item) => {
    const delta = Date.parse(item.startsAt) - now.getTime();
    return delta >= 0 && delta <= CONTACT_RULES.appointmentPreparationDays * DAY_MS;
  });
  const noAnswerCount = calls.slice().sort((a, b) => descendingDate(a.createdAt, b.createdAt)).slice(0, 5).filter((item) => item.outcome === 'no_answer').length;
  const hasFutureAction = Boolean(nextActionAt && isFutureOrNow(nextActionAt, now));

  if (!contact.phone.trim()) {
    insights.push({ code: 'missing_phone', severity: 'critical', title: 'Telefonnummer fehlt', detail: 'Der wichtigste Direktkanal ist nicht nutzbar.', evidence: ['Feld Telefon ist leer'], recommendedAction: 'Telefonnummer ergänzen' });
  }
  if (overdueFollowUps.length > 0 || (contact.nextActionAt && isPast(contact.nextActionAt, now))) {
    const evidence = overdueFollowUps.map((item) => `${item.title} war fällig am ${formatRuleDate(item.dueAt)}`);
    if (contact.nextActionAt && isPast(contact.nextActionAt, now)) evidence.push(`Nächste Aktion war geplant am ${formatRuleDate(contact.nextActionAt)}`);
    insights.push({ code: 'overdue', severity: 'critical', title: 'Kontakt ist überfällig', detail: 'Eine zugesagte oder geplante Aktion wurde nicht rechtzeitig erledigt.', evidence, recommendedAction: 'Heute aktiv nachfassen' });
  }
  if (lastActivity && daysSince(lastActivity, now) >= CONTACT_RULES.staleContactDays) {
    insights.push({ code: 'stale', severity: 'warning', title: 'Beziehung kühlt ab', detail: `Seit ${daysSince(lastActivity, now)} Tagen wurde keine Aktivität dokumentiert.`, evidence: [`Letzte Aktivität: ${formatRuleDate(lastActivity)}`, `Schwelle: ${CONTACT_RULES.staleContactDays} Tage`], recommendedAction: 'Persönlichen Kontakt herstellen' });
  }
  if (!lastActivity && daysSince(contact.createdAt, now) >= CONTACT_RULES.newContactGraceDays) {
    insights.push({ code: 'never_contacted', severity: 'warning', title: 'Noch keine Aktivität', detail: 'Der Kontakt wurde angelegt, aber noch nicht bearbeitet.', evidence: [`Angelegt am ${formatRuleDate(contact.createdAt)}`], recommendedAction: 'Erstkontakt durchführen' });
  }
  if (contact.potential >= CONTACT_RULES.highPotential && !hasFutureAction && openFollowUps.length === 0) {
    insights.push({ code: 'high_potential_without_action', severity: 'critical', title: 'Hohes Potenzial ohne nächsten Schritt', detail: 'Ein wichtiger Kontakt ist nicht durch eine konkrete Folgeaktion abgesichert.', evidence: [`Potenzialwert: ${contact.potential}`, `Schwelle: ${CONTACT_RULES.highPotential}`, 'Kein offenes Follow-up'], recommendedAction: 'Verbindlichen nächsten Schritt planen' });
  }
  for (const appointment of upcomingAppointments) {
    const hasPreparation = openFollowUps.some((followUp) => Date.parse(followUp.dueAt) <= Date.parse(appointment.startsAt) && PREPARATION_PATTERN.test(followUp.title));
    if (!hasPreparation) {
      insights.push({ code: 'appointment_without_preparation', severity: 'warning', title: 'Termin ohne Vorbereitungsaufgabe', detail: appointment.title, evidence: [`Termin: ${formatRuleDate(appointment.startsAt)}`, 'Kein offenes Follow-up mit Vorbereitungsbezug vor dem Termin'], recommendedAction: 'Vorbereitungsaufgabe anlegen' });
      break;
    }
  }
  if ((contact.role === 'Eigentümer' || ownerIndex >= 60) && properties.length === 0) {
    insights.push({ code: 'owner_without_property', severity: 'warning', title: 'Eigentümerkandidat ohne Immobilie', detail: 'Der Eigentümerbezug ist erkennbar, aber es ist kein Objekt verknüpft.', evidence: [`Eigentümerindex: ${ownerIndex}`, `Rolle: ${contact.role}`], recommendedAction: 'Immobilie erfassen oder verknüpfen' });
  }
  if (noAnswerCount >= CONTACT_RULES.repeatedNoAnswerCount) {
    insights.push({ code: 'repeated_no_answer', severity: 'warning', title: 'Mehrere erfolglose Kontaktversuche', detail: `In den letzten fünf Anrufen wurde die Person ${noAnswerCount}-mal nicht erreicht.`, evidence: [`Schwelle: ${CONTACT_RULES.repeatedNoAnswerCount} nicht erreichte Anrufe`], recommendedAction: 'Kanal oder Kontaktzeit wechseln' });
  }
  if ((contact.stage === 'appointment' || contact.stage === 'mandate') && !hasFutureAction && openFollowUps.length === 0) {
    insights.push({ code: 'closing_stage_without_followup', severity: 'critical', title: 'Abschlussphase ohne Follow-up', detail: 'Der Pipeline-Status signalisiert Abschlussnähe, aber die nächste Aktion fehlt.', evidence: [`Pipeline-Stufe: ${contact.stage}`], recommendedAction: 'Follow-up verbindlich terminieren' });
  }

  const severityOrder: Record<InsightSeverity, number> = { critical: 3, warning: 2, info: 1 };
  return insights.sort((left, right) => severityOrder[right.severity] - severityOrder[left.severity]);
}

function createSalesSummary(contact: Contact, model: Pick<ContactCockpitModel, 'ownerIndex' | 'properties' | 'openFollowUps' | 'overdueFollowUps' | 'lastActivityAt' | 'nextActionLabel'>) {
  const relationship = model.lastActivityAt ? `Letzte dokumentierte Aktivität am ${formatRuleDate(model.lastActivityAt)}.` : 'Bisher ist keine belastbare Aktivität dokumentiert.';
  const propertyContext = model.properties.length > 0 ? `${model.properties.length} Immobilie${model.properties.length === 1 ? '' : 'n'} verknüpft.` : 'Noch keine Immobilie verknüpft.';
  const followUpContext = model.overdueFollowUps.length > 0
    ? `${model.overdueFollowUps.length} Aktion${model.overdueFollowUps.length === 1 ? '' : 'en'} überfällig.`
    : `${model.openFollowUps.length} offene Folgeaktion${model.openFollowUps.length === 1 ? '' : 'en'}.`;
  return `${contact.role} aus ${contact.city || 'unbekanntem Ort'}, Pipeline ${contact.stage}, Potenzial ${contact.potential}. ${relationship} ${propertyContext} ${followUpContext} Nächster Schritt: ${model.nextActionLabel}.`;
}

export function buildContactCockpitModel(contact: Contact, source: ContactCockpitSource, now = new Date()): ContactCockpitModel {
  const openFollowUps = source.followUps.filter((item) => item.contactId === contact.id && item.status === 'open').sort((a, b) => ascendingDate(a.dueAt, b.dueAt));
  const overdueFollowUps = openFollowUps.filter((item) => isPast(item.dueAt, now));
  const appointments = source.appointments.filter((item) => item.contactId === contact.id).sort((a, b) => ascendingDate(a.startsAt, b.startsAt));
  const callEvents = source.callEvents.filter((item) => item.contactId === contact.id).sort((a, b) => descendingDate(a.createdAt, b.createdAt));
  const properties = source.properties.filter((item) => item.ownerContactId === contact.id);
  const relatedIds = new Set([contact.id, ...openFollowUps.map((item) => item.id), ...appointments.map((item) => item.id), ...callEvents.map((item) => item.id), ...properties.map((item) => item.id)]);
  const audits = source.auditEvents.filter((item) => item.entityId && relatedIds.has(item.entityId));
  const lastActivity = lastActivityAt(contact, callEvents, appointments, source.followUps.filter((item) => item.contactId === contact.id), audits, now);
  const next = nextAction(contact, openFollowUps, appointments, now);
  const owner = calculateOwnerIndex(contact, properties);
  const dataQuality = calculateDataQuality(contact, Boolean(next));
  const insights = buildInsights(contact, openFollowUps, overdueFollowUps, appointments, callEvents, properties, lastActivity, next?.at, owner.score, now);
  const noAnswerCount = callEvents.slice(0, 5).filter((item) => item.outcome === 'no_answer').length;
  const partial = {
    ownerIndex: owner.score,
    properties,
    openFollowUps,
    overdueFollowUps,
    lastActivityAt: lastActivity,
    nextActionLabel: next?.label ?? 'keine Aktion geplant',
  };
  return {
    contact,
    fullName: `${contact.firstName} ${contact.lastName}`.trim(),
    openFollowUps,
    overdueFollowUps,
    appointments,
    callEvents,
    properties,
    timeline: mergeContactTimeline(contact.id, source),
    insights,
    lastActivityAt: lastActivity,
    nextActionAt: next?.at,
    nextActionLabel: next?.label ?? 'Keine Aktion geplant',
    ownerIndex: owner.score,
    ownerIndexReasons: owner.reasons,
    dataQuality,
    noAnswerCount,
    salesSummary: createSalesSummary(contact, partial),
  };
}

export function buildContactCockpitModels(source: ContactCockpitSource, now = new Date()) {
  return source.contacts.map((contact) => buildContactCockpitModel(contact, source, now));
}

export function filterAndSortContacts(models: ContactCockpitModel[], filters: ContactFilters, sortKey: ContactSortKey) {
  const query = filters.query.trim().toLocaleLowerCase('de-DE');
  const filtered = models.filter((model) => {
    const haystack = [model.fullName, model.contact.city, model.contact.role, model.contact.source, model.contact.phone, model.contact.email, model.contact.notes].filter(Boolean).join(' ').toLocaleLowerCase('de-DE');
    if (query && !haystack.includes(query)) return false;
    if (filters.role !== 'all' && model.contact.role !== filters.role) return false;
    if (filters.stage !== 'all' && model.contact.stage !== filters.stage) return false;
    if (filters.priority !== 'all' && model.contact.priority !== filters.priority) return false;
    if (model.contact.potential < filters.minPotential) return false;
    if (filters.followUp === 'overdue' && model.overdueFollowUps.length === 0) return false;
    if (filters.followUp === 'open' && model.openFollowUps.length === 0) return false;
    if (filters.followUp === 'none' && model.openFollowUps.length > 0) return false;
    return true;
  });

  return filtered.sort((left, right) => {
    switch (sortKey) {
      case 'priority': return PRIORITY_WEIGHT[right.contact.priority] - PRIORITY_WEIGHT[left.contact.priority] || right.contact.potential - left.contact.potential;
      case 'potential': return right.contact.potential - left.contact.potential;
      case 'lastActivity': return descendingDate(left.lastActivityAt, right.lastActivityAt);
      case 'nextAction': return ascendingDate(left.nextActionAt, right.nextActionAt);
      case 'ownerIndex': return right.ownerIndex - left.ownerIndex;
      case 'dataQuality': return right.dataQuality.score - left.dataQuality.score;
      case 'name': return left.fullName.localeCompare(right.fullName, 'de-DE');
    }
  });
}
