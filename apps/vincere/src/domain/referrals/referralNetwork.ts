import type {
  AppState,
  Appointment,
  AuditEvent,
  CallEvent,
  Contact,
  FollowUp,
  Property,
  UserRole,
} from '../../types/domain';

export type NetworkSegment =
  | 'tippgeber'
  | 'multiplikator'
  | 'kooperationspartner'
  | 'dienstleister'
  | 'finanzierungsberater'
  | 'notar'
  | 'hausverwaltung'
  | 'handwerker'
  | 'lokaler_unternehmer'
  | 'ehemaliger_kunde'
  | 'privates_netzwerk'
  | 'strategischer_kontakt';

export type ReferralOpportunityCode =
  | 'satisfied_without_referral_request'
  | 'sold_without_aftercare'
  | 'partner_without_next_appointment'
  | 'dormant_referrer'
  | 'positive_without_next_step'
  | 'owner_network_potential'
  | 'multiple_successful_interactions'
  | 'partner_open_followup'
  | 'multiplicator_without_structure';

export interface RelationshipFactor {
  code: string;
  label: string;
  points: number;
  maxPoints: number;
  explanation: string;
  evidence: string[];
}

export interface ReferralOpportunity {
  id: string;
  code: ReferralOpportunityCode;
  title: string;
  reason: string;
  recommendedAction: string;
  contactId: string;
  urgency: 'today' | 'soon' | 'develop';
}

export interface RelationshipHistoryItem {
  id: string;
  kind: 'call' | 'followup' | 'appointment' | 'audit';
  occurredAt: string;
  title: string;
  detail: string;
  positive: boolean;
}

export interface NetworkRelationshipModel {
  contact: Contact;
  fullName: string;
  segment: NetworkSegment;
  segmentLabel: string;
  relationshipValue: number;
  relationshipValueLabel: 'hoch' | 'solide' | 'aufbauen';
  factors: RelationshipFactor[];
  lastActivityAt?: string;
  daysSinceActivity?: number;
  openFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  upcomingAppointments: Appointment[];
  linkedProperties: Property[];
  callEvents: CallEvent[];
  successfulInteractions: number;
  negativeInteractions: number;
  opportunities: ReferralOpportunity[];
  history: RelationshipHistoryItem[];
  nextBestAction: string;
  conversationGoal: string;
  prioritizationReasons: string[];
  hasFutureAction: boolean;
  missingPhone: boolean;
}

export interface NetworkSegmentSummary {
  segment: NetworkSegment;
  label: string;
  count: number;
}

export interface NetworkCockpit {
  relationships: NetworkRelationshipModel[];
  topRelationships: NetworkRelationshipModel[];
  todayCare: NetworkRelationshipModel[];
  longPauses: NetworkRelationshipModel[];
  activeReferrers: NetworkRelationshipModel[];
  opportunities: ReferralOpportunity[];
  segmentation: NetworkSegmentSummary[];
  focusQueue: NetworkRelationshipModel[];
}

export interface NetworkCapabilities {
  canLogCalls: boolean;
  canCreateFollowUps: boolean;
  canWrite: boolean;
}

const DAY = 86_400_000;
const SEGMENT_LABELS: Record<NetworkSegment, string> = {
  tippgeber: 'Tippgeber',
  multiplikator: 'Multiplikator',
  kooperationspartner: 'Kooperationspartner',
  dienstleister: 'Dienstleister',
  finanzierungsberater: 'Finanzierungsberater',
  notar: 'Notar',
  hausverwaltung: 'Hausverwaltung',
  handwerker: 'Handwerker',
  lokaler_unternehmer: 'Lokaler Unternehmer',
  ehemaliger_kunde: 'Ehemaliger Kunde',
  privates_netzwerk: 'Privates Netzwerk',
  strategischer_kontakt: 'Strategischer Kontakt',
};

const normalize = (value?: string) => (value ?? '')
  .toLocaleLowerCase('de-DE')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const validTime = (value?: string) => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const compareText = (a: string, b: string) => a.localeCompare(b, 'de-DE', { sensitivity: 'base' });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const sortByDateDesc = <T>(items: T[], getDate: (item: T) => string) => [...items].sort((a, b) => (validTime(getDate(b)) ?? 0) - (validTime(getDate(a)) ?? 0));

function latestActivityAt(
  contact: Contact,
  callEvents: CallEvent[],
  followUps: FollowUp[],
  appointments: Appointment[],
  auditEvents: AuditEvent[],
  now: Date,
) {
  const nowTime = now.getTime();
  const dates = [contact.lastContactAt]
    .concat(callEvents.map((item) => item.createdAt))
    .concat(followUps.filter((item) => item.status === 'done').map((item) => item.dueAt))
    .concat(appointments.filter((item) => (validTime(item.startsAt) ?? nowTime + 1) <= nowTime).map((item) => item.startsAt))
    .concat(auditEvents.map((item) => item.createdAt))
    .map(validTime)
    .filter((item): item is number => item !== undefined && item <= nowTime);

  if (!dates.length) return undefined;
  return new Date(Math.max(...dates)).toISOString();
}

function daysSince(value: string | undefined, now: Date) {
  const time = validTime(value);
  if (time === undefined) return undefined;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY));
}

function hasFutureDate(value: string | undefined, now: Date) {
  const time = validTime(value);
  return time !== undefined && time >= now.getTime();
}

function deriveSegment(contact: Contact): NetworkSegment {
  const text = normalize(`${contact.source} ${contact.notes}`);
  if (contact.role === 'Tippgeber') return 'tippgeber';
  if (/finanz|baufinanz|kredit|bank/.test(text)) return 'finanzierungsberater';
  if (/notar|notariat/.test(text)) return 'notar';
  if (/hausverwaltung|immobilienverwaltung|weg-verwaltung|verwalter/.test(text)) return 'hausverwaltung';
  if (/handwerk|sanierung|elektrik|maler|heizung|dach|schreiner|installateur/.test(text)) return 'handwerker';
  if (/multiplikator|verein|verband|politik|netzwerkveranstaltung|community/.test(text)) return 'multiplikator';
  if (/kooperation|kooperationspartner|partnerbetrieb/.test(text)) return 'kooperationspartner';
  if (/dienstleister|fotograf|homestaging|energieberater|gutachter/.test(text)) return 'dienstleister';
  if (/unternehmer|geschaftsfuhrer|gewerbe|lokalbetrieb|einzelhandler/.test(text)) return 'lokaler_unternehmer';
  if (/familie|freund|bekannt|privat/.test(text)) return 'privates_netzwerk';
  if (contact.stage === 'sold') return 'ehemaliger_kunde';
  return 'strategischer_kontakt';
}

function isNetworkCandidate(contact: Contact, callEvents: CallEvent[]) {
  const segment = deriveSegment(contact);
  const positiveCalls = callEvents.filter((item) => item.outcome === 'conversation' || item.outcome === 'appointment').length;
  return contact.role === 'Tippgeber'
    || contact.role === 'Netzwerk'
    || contact.stage === 'sold'
    || segment !== 'strategischer_kontakt'
    || positiveCalls >= 2
    || (contact.role === 'Eigentümer' && contact.potential >= 70 && positiveCalls > 0);
}

function referralRequestDocumented(contact: Contact, followUps: FollowUp[], auditEvents: AuditEvent[]) {
  const text = normalize([
    contact.notes,
    ...followUps.map((item) => item.title),
    ...auditEvents.flatMap((item) => [item.action, item.summary]),
  ].join(' '));
  return /empfehlungsanfrage|um empfehlung|empfehlung angefragt|weiterempfehlung erbeten|tippgeberanfrage/.test(text);
}

function aftercareDocumented(contact: Contact, followUps: FollowUp[], auditEvents: AuditEvent[]) {
  const text = normalize([
    contact.notes,
    ...followUps.map((item) => item.title),
    ...auditEvents.flatMap((item) => [item.action, item.summary]),
  ].join(' '));
  return /nachbetreuung|aftercare|abschlussgesprach|ubergabe begleitet|kundenpflege nach verkauf/.test(text);
}

function buildFactors(input: {
  contact: Contact;
  lastActivityAt?: string;
  daysSinceActivity?: number;
  openFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  upcomingAppointments: Appointment[];
  linkedProperties: Property[];
  callEvents: CallEvent[];
  successfulInteractions: number;
  negativeInteractions: number;
  hasFutureAction: boolean;
}): RelationshipFactor[] {
  const {
    contact,
    lastActivityAt,
    daysSinceActivity,
    openFollowUps,
    overdueFollowUps,
    upcomingAppointments,
    linkedProperties,
    callEvents,
    successfulInteractions,
    negativeInteractions,
    hasFutureAction,
  } = input;

  const rolePoints = contact.role === 'Tippgeber' ? 10 : contact.role === 'Netzwerk' ? 8 : contact.stage === 'sold' ? 8 : contact.role === 'Eigentümer' ? 6 : 4;
  const priorityPoints = contact.priority === 'high' ? 10 : contact.priority === 'medium' ? 6 : 3;
  const potentialPoints = clamp(Math.round(contact.potential * 0.15), 0, 15);
  const recencyPoints = daysSinceActivity === undefined ? 0 : daysSinceActivity <= 14 ? 15 : daysSinceActivity <= 30 ? 12 : daysSinceActivity <= 60 ? 8 : daysSinceActivity <= 120 ? 4 : 1;
  const followUpPoints = openFollowUps.some((item) => !overdueFollowUps.some((overdue) => overdue.id === item.id)) ? 10 : overdueFollowUps.length ? 4 : hasFutureAction ? 7 : 0;
  const historyPoints = clamp(successfulInteractions * 2 - negativeInteractions, 0, 10);
  const appointmentPoints = upcomingAppointments.length ? 10 : 0;
  const propertyPoints = clamp(linkedProperties.length * 3, 0, 5);
  const pipelinePoints: Record<Contact['stage'], number> = { lead: 2, qualified: 5, appointment: 7, mandate: 9, sold: 10 };
  const successRatioPoints = callEvents.length ? clamp(Math.round((successfulInteractions / callEvents.length) * 10), 0, 10) : 0;
  const nextActionPoints = hasFutureAction ? 5 : overdueFollowUps.length ? 2 : 0;

  return [
    {
      code: 'role',
      label: 'Rolle',
      points: rolePoints,
      maxPoints: 10,
      explanation: 'Die vorhandene Kontaktrolle beschreibt die grundsätzliche Netzwerkfunktion.',
      evidence: [`Rolle: ${contact.role}`],
    },
    {
      code: 'priority',
      label: 'Priorität',
      points: priorityPoints,
      maxPoints: 10,
      explanation: 'Die im CRM gesetzte Priorität wird direkt übernommen.',
      evidence: [`Priorität: ${contact.priority}`],
    },
    {
      code: 'potential',
      label: 'Potenzial',
      points: potentialPoints,
      maxPoints: 15,
      explanation: 'Das vorhandene Potenzial wird linear in maximal 15 Wertpunkte übersetzt.',
      evidence: [`Potenzialwert: ${contact.potential}`],
    },
    {
      code: 'last_activity',
      label: 'Letzte Aktivität',
      points: recencyPoints,
      maxPoints: 15,
      explanation: 'Aktuell gepflegte Beziehungen erhalten mehr Punkte als lange inaktive Beziehungen.',
      evidence: [lastActivityAt ? `Letzte Aktivität: ${lastActivityAt}` : 'Keine Aktivität dokumentiert'],
    },
    {
      code: 'followups',
      label: 'Offene Follow-ups',
      points: followUpPoints,
      maxPoints: 10,
      explanation: 'Eine geplante, nicht überfällige Pflegeaktion zeigt Beziehungsdisziplin.',
      evidence: [`Offen: ${openFollowUps.length}`, `Überfällig: ${overdueFollowUps.length}`],
    },
    {
      code: 'history',
      label: 'Gesprächshistorie',
      points: historyPoints,
      maxPoints: 10,
      explanation: 'Dokumentierte positive Interaktionen stärken den Wert; negative Ergebnisse reduzieren ihn.',
      evidence: [`Positive Interaktionen: ${successfulInteractions}`, `Negative Ergebnisse: ${negativeInteractions}`],
    },
    {
      code: 'appointments',
      label: 'Termine',
      points: appointmentPoints,
      maxPoints: 10,
      explanation: 'Ein bevorstehender Termin belegt eine konkret geplante Beziehungspflege.',
      evidence: [`Bevorstehende Termine: ${upcomingAppointments.length}`],
    },
    {
      code: 'properties',
      label: 'Immobilienverknüpfungen',
      points: propertyPoints,
      maxPoints: 5,
      explanation: 'Bekannte Immobilienbeziehungen zeigen vorhandenen fachlichen Kontext.',
      evidence: [`Verknüpfte Immobilien: ${linkedProperties.length}`],
    },
    {
      code: 'pipeline',
      label: 'Pipeline-Fortschritt',
      points: pipelinePoints[contact.stage],
      maxPoints: 10,
      explanation: 'Die vorhandene Pipeline-Stufe wird als nachweisbarer Beziehungsfortschritt berücksichtigt.',
      evidence: [`Pipeline: ${contact.stage}`],
    },
    {
      code: 'success_frequency',
      label: 'Erfolgreiche Gesprächsfrequenz',
      points: successRatioPoints,
      maxPoints: 10,
      explanation: 'Der Anteil von Gesprächen und Terminen an allen dokumentierten Anrufen wird transparent bewertet.',
      evidence: [`Erfolgreich: ${successfulInteractions} von ${callEvents.length} Anrufen`],
    },
    {
      code: 'next_action',
      label: 'Nächste Aktion',
      points: nextActionPoints,
      maxPoints: 5,
      explanation: 'Eine konkrete zukünftige Aktion verhindert, dass die Beziehung ohne Pflege bleibt.',
      evidence: [hasFutureAction ? 'Zukünftige Aktion vorhanden' : overdueFollowUps.length ? 'Nur überfällige Aktion vorhanden' : 'Keine nächste Aktion vorhanden'],
    },
  ];
}

function buildHistory(
  contactId: string,
  callEvents: CallEvent[],
  followUps: FollowUp[],
  appointments: Appointment[],
  auditEvents: AuditEvent[],
): RelationshipHistoryItem[] {
  const items: RelationshipHistoryItem[] = [
    ...callEvents.map((item) => ({
      id: `call:${item.id}`,
      kind: 'call' as const,
      occurredAt: item.createdAt,
      title: item.outcome === 'appointment' ? 'Termin aus Gespräch' : item.outcome === 'conversation' ? 'Gespräch geführt' : item.outcome === 'not_interested' ? 'Kein Interesse' : 'Nicht erreicht',
      detail: item.note || 'Kein Gesprächsvermerk.',
      positive: item.outcome === 'conversation' || item.outcome === 'appointment',
    })),
    ...followUps.map((item) => ({
      id: `followup:${item.id}`,
      kind: 'followup' as const,
      occurredAt: item.dueAt,
      title: item.title,
      detail: `${item.status === 'done' ? 'Erledigt' : 'Offen'} · ${item.channel}`,
      positive: item.status === 'done',
    })),
    ...appointments.map((item) => ({
      id: `appointment:${item.id}`,
      kind: 'appointment' as const,
      occurredAt: item.startsAt,
      title: item.title,
      detail: item.subtitle,
      positive: true,
    })),
    ...auditEvents.filter((item) => item.entity === 'contact' && item.entityId === contactId).map((item) => ({
      id: `audit:${item.id}`,
      kind: 'audit' as const,
      occurredAt: item.createdAt,
      title: item.action,
      detail: item.summary,
      positive: !/delete|removed|failed|conflict/i.test(item.action),
    })),
  ];

  return sortByDateDesc(items.filter((item) => validTime(item.occurredAt) !== undefined), (item) => item.occurredAt);
}

function createOpportunities(input: {
  contact: Contact;
  segment: NetworkSegment;
  daysSinceActivity?: number;
  successfulInteractions: number;
  callEvents: CallEvent[];
  openFollowUps: FollowUp[];
  upcomingAppointments: Appointment[];
  linkedProperties: Property[];
  auditEvents: AuditEvent[];
  hasFutureAction: boolean;
}): ReferralOpportunity[] {
  const {
    contact,
    segment,
    daysSinceActivity,
    successfulInteractions,
    callEvents,
    openFollowUps,
    upcomingAppointments,
    linkedProperties,
    auditEvents,
    hasFutureAction,
  } = input;
  const candidates: ReferralOpportunity[] = [];
  const hasAsk = referralRequestDocumented(contact, openFollowUps, auditEvents);
  const sold = contact.stage === 'sold' || linkedProperties.some((item) => item.status === 'Verkauft');
  const isPartner = contact.role === 'Tippgeber' || contact.role === 'Netzwerk' || !['ehemaliger_kunde', 'strategischer_kontakt'].includes(segment);
  const lastCall = sortByDateDesc(callEvents, (item) => item.createdAt)[0];
  const add = (code: ReferralOpportunityCode, title: string, reason: string, recommendedAction: string, urgency: ReferralOpportunity['urgency']) => {
    candidates.push({ id: `${contact.id}:${code}`, code, title, reason, recommendedAction, contactId: contact.id, urgency });
  };

  if ((sold || successfulInteractions >= 2) && !hasAsk) {
    add('satisfied_without_referral_request', 'Empfehlungsanfrage prüfen', 'Abschluss oder mehrere positive Interaktionen sind dokumentiert, aber keine Empfehlungsanfrage.', 'Zufriedenheit zuerst bestätigen und anschließend konkret um eine passende Empfehlung bitten.', 'soon');
  }
  if (sold && !aftercareDocumented(contact, openFollowUps, auditEvents)) {
    add('sold_without_aftercare', 'Nachbetreuung fehlt', 'Ein Verkauf ist dokumentiert, eine Nachbetreuung jedoch nicht.', 'Kurzes Nachbetreuungsgespräch planen und den weiteren Nutzen der Beziehung klären.', 'today');
  }
  if (isPartner && upcomingAppointments.length === 0) {
    add('partner_without_next_appointment', 'Kein nächster Beziehungstermin', 'Für den Netzwerkpartner ist kein bevorstehender Termin dokumentiert.', 'Einen konkreten Pflege- oder Kooperationsanlass terminieren.', 'develop');
  }
  if (contact.role === 'Tippgeber' && (daysSinceActivity === undefined || daysSinceActivity > 45)) {
    add('dormant_referrer', 'Tippgeber reaktivieren', daysSinceActivity === undefined ? 'Es ist keine bisherige Aktivität dokumentiert.' : `Der letzte dokumentierte Kontakt liegt ${daysSinceActivity} Tage zurück.`, 'Persönlich anknüpfen, echten Mehrwert liefern und erst danach nach aktuellen Themen fragen.', 'today');
  }
  if (lastCall && (lastCall.outcome === 'conversation' || lastCall.outcome === 'appointment') && !hasFutureAction) {
    add('positive_without_next_step', 'Positives Gespräch ohne nächsten Schritt', 'Das letzte dokumentierte Gespräch war positiv, aber es fehlt eine zukünftige Aktion.', 'Den besprochenen nächsten Schritt als Follow-up oder Termin festhalten.', 'today');
  }
  if (contact.role === 'Eigentümer' && contact.potential >= 70 && successfulInteractions > 0 && !hasAsk) {
    add('owner_network_potential', 'Eigentümerkontakt mit Netzwerkpotenzial', 'Hohes vorhandenes Potenzial und mindestens eine positive Interaktion sind dokumentiert.', 'Im Gespräch nach relevanten Personen oder lokalen Themen fragen, ohne eine Empfehlung zu erzwingen.', 'develop');
  }
  if (successfulInteractions >= 3 && !hasAsk) {
    add('multiple_successful_interactions', 'Mehrere erfolgreiche Interaktionen', `${successfulInteractions} positive Interaktionen sind dokumentiert.`, 'Den passenden Anlass für eine konkrete Empfehlungsfrage vorbereiten.', 'soon');
  }
  if (isPartner && openFollowUps.length > 0) {
    add('partner_open_followup', 'Offenes Partner-Follow-up', `${openFollowUps.length} offene Pflegeaktion(en) sind vorhanden.`, 'Das wichtigste offene Follow-up bearbeiten und das Ergebnis dokumentieren.', 'today');
  }
  if (['multiplikator', 'lokaler_unternehmer', 'strategischer_kontakt'].includes(segment) && !hasFutureAction) {
    add('multiplicator_without_structure', 'Multiplikator ohne strukturierte Pflege', 'Der Kontakt besitzt Multiplikatorpotenzial, aber keine zukünftige Pflegeaktion.', 'Eine wiederkehrende, konkrete Beziehungspflege mit Anlass und Termin aufsetzen.', 'develop');
  }

  return [...new Map(candidates.map((item) => [item.id, item])).values()];
}

function determineNextBestAction(model: Pick<NetworkRelationshipModel, 'missingPhone' | 'overdueFollowUps' | 'opportunities' | 'openFollowUps' | 'upcomingAppointments' | 'hasFutureAction'>) {
  if (model.missingPhone) return 'Kontaktweg ergänzen, bevor eine Pflegeaktion geplant wird.';
  if (model.overdueFollowUps.length) return `Überfälliges Follow-up „${model.overdueFollowUps[0].title}“ bearbeiten.`;
  const urgent = model.opportunities.find((item) => item.urgency === 'today');
  if (urgent) return urgent.recommendedAction;
  if (model.openFollowUps.length) return `Offenes Follow-up „${model.openFollowUps[0].title}“ ausführen.`;
  if (model.upcomingAppointments.length) return `Termin „${model.upcomingAppointments[0].title}“ vorbereiten.`;
  if (!model.hasFutureAction) return 'Eine konkrete nächste Pflegeaktion terminieren.';
  return 'Beziehung gemäß vorhandener nächster Aktion weiterentwickeln.';
}

function determineConversationGoal(opportunities: ReferralOpportunity[], segment: NetworkSegment) {
  const primary = opportunities[0];
  if (primary?.code === 'sold_without_aftercare') return 'Zufriedenheit nach dem Abschluss prüfen und offene Punkte sauber klären.';
  if (primary?.code === 'satisfied_without_referral_request' || primary?.code === 'multiple_successful_interactions') return 'Zufriedenheit bestätigen und eine konkrete, passende Empfehlungsfrage vorbereiten.';
  if (primary?.code === 'dormant_referrer') return 'Beziehung persönlich reaktivieren und aktuellen Kontext verstehen.';
  if (primary?.code === 'positive_without_next_step') return 'Das positive Gespräch in einen verbindlichen nächsten Schritt überführen.';
  if (segment === 'kooperationspartner' || segment === 'finanzierungsberater' || segment === 'notar') return 'Gemeinsamen Nutzen und einen konkreten Kooperationsanlass klären.';
  return 'Aktuelle Situation verstehen und eine belastbare nächste Pflegeaktion vereinbaren.';
}

export function getNetworkCapabilities(role: UserRole): NetworkCapabilities {
  const canWrite = role !== 'viewer';
  return { canLogCalls: canWrite, canCreateFollowUps: canWrite, canWrite };
}

export function buildNetworkRelationship(contact: Contact, state: AppState, now = new Date()): NetworkRelationshipModel {
  const callEvents = sortByDateDesc(state.callEvents.filter((item) => item.contactId === contact.id), (item) => item.createdAt);
  const openFollowUps = state.followUps
    .filter((item) => item.contactId === contact.id && item.status === 'open')
    .sort((a, b) => (validTime(a.dueAt) ?? Number.POSITIVE_INFINITY) - (validTime(b.dueAt) ?? Number.POSITIVE_INFINITY));
  const overdueFollowUps = openFollowUps.filter((item) => (validTime(item.dueAt) ?? Number.POSITIVE_INFINITY) < now.getTime());
  const upcomingAppointments = [...state.appointments]
    .filter((item) => item.contactId === contact.id && hasFutureDate(item.startsAt, now))
    .sort((a, b) => (validTime(a.startsAt) ?? Number.POSITIVE_INFINITY) - (validTime(b.startsAt) ?? Number.POSITIVE_INFINITY));
  const linkedProperties = state.properties.filter((item) => item.ownerContactId === contact.id);
  const contactAuditEvents = state.auditEvents.filter((item) => item.entity === 'contact' && item.entityId === contact.id);
  const lastActivityAt = latestActivityAt(contact, callEvents, state.followUps.filter((item) => item.contactId === contact.id), state.appointments.filter((item) => item.contactId === contact.id), contactAuditEvents, now);
  const daysSinceActivity = daysSince(lastActivityAt, now);
  const successfulInteractions = callEvents.filter((item) => item.outcome === 'conversation' || item.outcome === 'appointment').length;
  const negativeInteractions = callEvents.filter((item) => item.outcome === 'not_interested').length;
  const hasFutureAction = openFollowUps.some((item) => hasFutureDate(item.dueAt, now)) || upcomingAppointments.length > 0 || hasFutureDate(contact.nextActionAt, now);
  const segment = deriveSegment(contact);
  const factors = buildFactors({
    contact,
    lastActivityAt,
    daysSinceActivity,
    openFollowUps,
    overdueFollowUps,
    upcomingAppointments,
    linkedProperties,
    callEvents,
    successfulInteractions,
    negativeInteractions,
    hasFutureAction,
  });
  const totalPoints = factors.reduce((sum, factor) => sum + factor.points, 0);
  const maxPoints = factors.reduce((sum, factor) => sum + factor.maxPoints, 0);
  const relationshipValue = Math.round((totalPoints / maxPoints) * 100);
  const opportunities = createOpportunities({
    contact,
    segment,
    daysSinceActivity,
    successfulInteractions,
    callEvents,
    openFollowUps,
    upcomingAppointments,
    linkedProperties,
    auditEvents: contactAuditEvents,
    hasFutureAction,
  });
  const prioritizationReasons = [
    overdueFollowUps.length ? `${overdueFollowUps.length} überfällige Aktion(en)` : undefined,
    daysSinceActivity === undefined ? 'Keine Aktivität dokumentiert' : daysSinceActivity > 60 ? `${daysSinceActivity} Tage Kontaktpause` : undefined,
    opportunities.length ? `${opportunities.length} offene Empfehlungsgelegenheit(en)` : undefined,
    !hasFutureAction ? 'Keine zukünftige Pflegeaktion' : undefined,
    contact.phone.trim() ? undefined : 'Telefonnummer fehlt',
  ].filter((item): item is string => Boolean(item));

  const partial = {
    missingPhone: !contact.phone.trim(),
    overdueFollowUps,
    opportunities,
    openFollowUps,
    upcomingAppointments,
    hasFutureAction,
  };

  return {
    contact,
    fullName: `${contact.firstName} ${contact.lastName}`.trim(),
    segment,
    segmentLabel: SEGMENT_LABELS[segment],
    relationshipValue,
    relationshipValueLabel: relationshipValue >= 70 ? 'hoch' : relationshipValue >= 45 ? 'solide' : 'aufbauen',
    factors,
    lastActivityAt,
    daysSinceActivity,
    openFollowUps,
    overdueFollowUps,
    upcomingAppointments,
    linkedProperties,
    callEvents,
    successfulInteractions,
    negativeInteractions,
    opportunities,
    history: buildHistory(contact.id, callEvents, state.followUps.filter((item) => item.contactId === contact.id), state.appointments.filter((item) => item.contactId === contact.id), state.auditEvents),
    nextBestAction: determineNextBestAction(partial),
    conversationGoal: determineConversationGoal(opportunities, segment),
    prioritizationReasons,
    hasFutureAction,
    missingPhone: !contact.phone.trim(),
  };
}

export function sortRelationships(models: NetworkRelationshipModel[]) {
  return [...models].sort((a, b) => b.relationshipValue - a.relationshipValue
    || compareText(a.contact.lastName, b.contact.lastName)
    || compareText(a.contact.firstName, b.contact.firstName)
    || compareText(a.contact.id, b.contact.id));
}

export function sortFocusQueue(models: NetworkRelationshipModel[]) {
  const urgency = (item: NetworkRelationshipModel) => {
    const pause = item.daysSinceActivity ?? 180;
    return item.overdueFollowUps.length * 1_000
      + item.opportunities.filter((opportunity) => opportunity.urgency === 'today').length * 300
      + item.opportunities.length * 80
      + (!item.hasFutureAction ? 120 : 0)
      + Math.min(pause, 180)
      + item.relationshipValue;
  };
  return [...models].sort((a, b) => urgency(b) - urgency(a)
    || b.relationshipValue - a.relationshipValue
    || compareText(a.contact.lastName, b.contact.lastName)
    || compareText(a.contact.firstName, b.contact.firstName)
    || compareText(a.contact.id, b.contact.id));
}

export function buildNetworkCockpit(state: AppState, now = new Date()): NetworkCockpit {
  const relationships = sortRelationships(state.contacts
    .filter((contact) => isNetworkCandidate(contact, state.callEvents.filter((item) => item.contactId === contact.id)))
    .map((contact) => buildNetworkRelationship(contact, state, now)));
  const focusQueue = sortFocusQueue(relationships.filter((item) => item.prioritizationReasons.length > 0));
  const opportunities = focusQueue.flatMap((item) => item.opportunities)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  const segmentation = (Object.keys(SEGMENT_LABELS) as NetworkSegment[])
    .map((segment) => ({ segment, label: SEGMENT_LABELS[segment], count: relationships.filter((item) => item.segment === segment).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || compareText(a.label, b.label));

  return {
    relationships,
    topRelationships: relationships.slice(0, 6),
    todayCare: focusQueue.slice(0, 8),
    longPauses: relationships.filter((item) => item.daysSinceActivity === undefined || item.daysSinceActivity > 60)
      .sort((a, b) => (b.daysSinceActivity ?? 999) - (a.daysSinceActivity ?? 999) || compareText(a.fullName, b.fullName)),
    activeReferrers: relationships.filter((item) => item.contact.role === 'Tippgeber' && ((item.daysSinceActivity ?? 999) <= 90 || item.successfulInteractions > 0)),
    opportunities,
    segmentation,
    focusQueue,
  };
}

export function networkSegmentOptions() {
  return (Object.keys(SEGMENT_LABELS) as NetworkSegment[]).map((value) => ({ value, label: SEGMENT_LABELS[value] }));
}
