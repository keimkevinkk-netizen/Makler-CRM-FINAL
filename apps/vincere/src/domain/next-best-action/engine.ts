import type {
  AppState,
  Appointment,
  CallEvent,
  Contact,
  FollowUp,
  Priority,
  Property,
  UserRole,
} from '../../types/domain';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const UPCOMING_APPOINTMENT_WINDOW_MS = 48 * HOUR_MS;
const RECENT_POSITIVE_WINDOW_MS = 14 * DAY_MS;
const RECENT_NEGATIVE_WINDOW_MS = 30 * DAY_MS;

export type ActionKind = 'followup' | 'contact-gap';
export type ActionChannel = FollowUp['channel'] | 'planning';
export type ActionUrgency = 'critical' | 'high' | 'normal' | 'low';

export type ScoreFactorKey =
  | 'followup_overdue'
  | 'overdue_duration'
  | 'followup_due_today'
  | 'followup_due_soon'
  | 'followup_far_future'
  | 'followup_priority'
  | 'contact_priority'
  | 'potential'
  | 'pipeline_stage'
  | 'owner_role'
  | 'upcoming_appointment'
  | 'contact_pause'
  | 'no_activity'
  | 'no_next_action'
  | 'failed_calls'
  | 'recent_positive_outcome'
  | 'recent_negative_outcome'
  | 'valuation_opportunity'
  | 'active_acquisition'
  | 'active_marketing'
  | 'sold_property'
  | 'multiple_open_followups'
  | 'missing_contact_channel';

export interface ScoreFactor {
  key: ScoreFactorKey;
  label: string;
  detail: string;
  points: number;
}

export interface PrioritizedAction {
  id: string;
  kind: ActionKind;
  contactId: string;
  followUpId?: string;
  relatedFollowUpIds: string[];
  title: string;
  actionLabel: string;
  channel: ActionChannel;
  score: number;
  urgency: ActionUrgency;
  dueAt?: string;
  reason: string;
  reasons: string[];
  factors: ScoreFactor[];
  missingSignals: string[];
  movesUp: string[];
  movesDown: string[];
  estimatedMinutes: number;
  blockedReason?: string;
}

export interface OverdueFollowUpItem {
  followUp: FollowUp;
  contact?: Contact;
  overdueHours: number;
}

export interface DailyProgress {
  target: number;
  completed: number;
  percent: number;
  callsLogged: number;
  followUpsCompleted: number;
  label: string;
}

export interface DailyExecutionPlan {
  generatedAt: string;
  actions: PrioritizedAction[];
  topActions: PrioritizedAction[];
  additionalActions: PrioritizedAction[];
  overdueFollowUps: OverdueFollowUpItem[];
  quickWins: PrioritizedAction[];
  importantOwnerActions: PrioritizedAction[];
  upcomingAppointments: Appointment[];
  contactsWithoutNextAction: Contact[];
  progress: DailyProgress;
}

export interface ExecutionCapabilities {
  canLogCalls: boolean;
  canManageFollowUps: boolean;
  canMovePipeline: boolean;
  readOnly: boolean;
}

interface IndexedState {
  contacts: Contact[];
  contactsById: Map<string, Contact>;
  openFollowUps: FollowUp[];
  openFollowUpsByContact: Map<string, FollowUp[]>;
  callEventsByContact: Map<string, CallEvent[]>;
  propertiesByOwner: Map<string, Property[]>;
  appointmentsByContact: Map<string, Appointment[]>;
}

interface CandidateContext {
  contact?: Contact;
  followUps: FollowUp[];
  primaryFollowUp?: FollowUp;
  calls: CallEvent[];
  properties: Property[];
  appointments: Appointment[];
  now: number;
}

const followUpPriorityPoints: Record<Priority, number> = {
  high: 18,
  medium: 9,
  low: 3,
};

const contactPriorityPoints: Record<Priority, number> = {
  high: 16,
  medium: 8,
  low: 2,
};

function parseTimestamp(value?: string): number | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const sorted = [...items].sort((left, right) => left.id.localeCompare(right.id));
  const seen = new Set<string>();
  return sorted.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function groupByContact<T extends { contactId: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const current = groups.get(item.contactId) ?? [];
    current.push(item);
    groups.set(item.contactId, current);
  }
  return groups;
}

function groupPropertiesByOwner(properties: Property[]): Map<string, Property[]> {
  const groups = new Map<string, Property[]>();
  for (const property of properties) {
    if (!property.ownerContactId) continue;
    const current = groups.get(property.ownerContactId) ?? [];
    current.push(property);
    groups.set(property.ownerContactId, current);
  }
  return groups;
}

function groupAppointmentsByContact(appointments: Appointment[]): Map<string, Appointment[]> {
  const groups = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    if (!appointment.contactId) continue;
    const current = groups.get(appointment.contactId) ?? [];
    current.push(appointment);
    groups.set(appointment.contactId, current);
  }
  return groups;
}

function indexState(state: AppState): IndexedState {
  const contacts = uniqueById(state.contacts);
  const openFollowUps = uniqueById(state.followUps).filter((followUp) => followUp.status === 'open');
  const calls = uniqueById(state.callEvents);
  const properties = uniqueById(state.properties);
  const appointments = uniqueById(state.appointments);

  return {
    contacts,
    contactsById: new Map(contacts.map((contact) => [contact.id, contact])),
    openFollowUps,
    openFollowUpsByContact: groupByContact(openFollowUps),
    callEventsByContact: groupByContact(calls),
    propertiesByOwner: groupPropertiesByOwner(properties),
    appointmentsByContact: groupAppointmentsByContact(appointments),
  };
}

function addFactor(
  factors: ScoreFactor[],
  key: ScoreFactorKey,
  label: string,
  detail: string,
  points: number,
): void {
  if (points === 0) return;
  factors.push({ key, label, detail, points });
}

function compareFollowUps(left: FollowUp, right: FollowUp, now: number): number {
  const leftDue = parseTimestamp(left.dueAt) ?? Number.POSITIVE_INFINITY;
  const rightDue = parseTimestamp(right.dueAt) ?? Number.POSITIVE_INFINITY;
  const leftOverdue = leftDue < now;
  const rightOverdue = rightDue < now;

  if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
  if (leftDue !== rightDue) return leftDue - rightDue;
  if (followUpPriorityPoints[left.priority] !== followUpPriorityPoints[right.priority]) {
    return followUpPriorityPoints[right.priority] - followUpPriorityPoints[left.priority];
  }
  return left.id.localeCompare(right.id);
}

function latestTimestamp(contact: Contact, calls: CallEvent[]): number | undefined {
  const values = [
    parseTimestamp(contact.lastContactAt),
    ...calls.map((call) => parseTimestamp(call.createdAt)),
  ].filter((value): value is number => value !== undefined);
  return values.length > 0 ? Math.max(...values) : undefined;
}

function sortedCalls(calls: CallEvent[]): CallEvent[] {
  return [...calls].sort((left, right) => {
    const leftTime = parseTimestamp(left.createdAt) ?? 0;
    const rightTime = parseTimestamp(right.createdAt) ?? 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}

function countConsecutiveNoAnswers(calls: CallEvent[]): number {
  let count = 0;
  for (const call of sortedCalls(calls)) {
    if (call.outcome !== 'no_answer') break;
    count += 1;
  }
  return count;
}

function latestOutcome(calls: CallEvent[], outcomes: CallEvent['outcome'][]): CallEvent | undefined {
  return sortedCalls(calls).find((call) => outcomes.includes(call.outcome));
}

function upcomingAppointments(appointments: Appointment[], now: number): Appointment[] {
  return appointments
    .filter((appointment) => {
      const startsAt = parseTimestamp(appointment.startsAt);
      return startsAt !== undefined && startsAt >= now && startsAt <= now + UPCOMING_APPOINTMENT_WINDOW_MS;
    })
    .sort((left, right) => {
      const leftTime = parseTimestamp(left.startsAt) ?? Number.POSITIVE_INFINITY;
      const rightTime = parseTimestamp(right.startsAt) ?? Number.POSITIVE_INFINITY;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return left.id.localeCompare(right.id);
    });
}

function hasFutureNextAction(contact: Contact, now: number): boolean {
  const nextActionAt = parseTimestamp(contact.nextActionAt);
  return nextActionAt !== undefined && nextActionAt >= now;
}

function scorePotential(potential: number): { points: number; detail?: string } {
  if (potential >= 85) return { points: 18, detail: `Sehr hohes Potenzial (${potential}/100)` };
  if (potential >= 70) return { points: 13, detail: `Hohes Potenzial (${potential}/100)` };
  if (potential >= 50) return { points: 7, detail: `Solides Potenzial (${potential}/100)` };
  if (potential >= 30) return { points: 3, detail: `Erkennbares Potenzial (${potential}/100)` };
  return { points: 0 };
}

function addFollowUpFactors(factors: ScoreFactor[], followUp: FollowUp | undefined, now: number): void {
  if (!followUp) return;

  const dueAt = parseTimestamp(followUp.dueAt);
  addFactor(
    factors,
    'followup_priority',
    'Follow-up-Priorität',
    `Follow-up ist als ${followUp.priority === 'high' ? 'hoch' : followUp.priority === 'medium' ? 'mittel' : 'niedrig'} priorisiert`,
    followUpPriorityPoints[followUp.priority],
  );

  if (dueAt === undefined) return;
  const delta = dueAt - now;
  if (delta < 0) {
    const overdueHours = Math.max(1, Math.ceil(Math.abs(delta) / HOUR_MS));
    const overdueDays = Math.max(1, Math.ceil(overdueHours / 24));
    addFactor(factors, 'followup_overdue', 'Follow-up überfällig', 'Das Follow-up ist bereits fällig', 24);
    addFactor(
      factors,
      'overdue_duration',
      'Dauer der Überfälligkeit',
      `Seit ${overdueDays} ${overdueDays === 1 ? 'Tag' : 'Tagen'} überfällig`,
      Math.min(18, overdueDays * 3),
    );
    return;
  }

  if (delta <= 12 * HOUR_MS) {
    addFactor(factors, 'followup_due_today', 'Heute fällig', 'Das Follow-up ist innerhalb der nächsten zwölf Stunden fällig', 12);
  } else if (delta <= 24 * HOUR_MS) {
    addFactor(factors, 'followup_due_soon', 'Bald fällig', 'Das Follow-up ist innerhalb der nächsten 24 Stunden fällig', 8);
  } else if (delta > 7 * DAY_MS) {
    addFactor(factors, 'followup_far_future', 'Später geplant', 'Die Aktion ist erst in mehr als sieben Tagen fällig', -4);
  }
}

function addContactFactors(
  factors: ScoreFactor[],
  missingSignals: string[],
  contact: Contact | undefined,
  calls: CallEvent[],
  now: number,
): void {
  if (!contact) {
    missingSignals.push('Der verknüpfte Kontakt fehlt.');
    return;
  }

  addFactor(
    factors,
    'contact_priority',
    'Kontaktpriorität',
    `Kontaktpriorität ${contact.priority === 'high' ? 'hoch' : contact.priority === 'medium' ? 'mittel' : 'niedrig'}`,
    contactPriorityPoints[contact.priority],
  );

  const potential = scorePotential(contact.potential);
  if (potential.detail) {
    addFactor(factors, 'potential', 'Potenzial', potential.detail, potential.points);
  } else {
    missingSignals.push('Das Vertriebspotenzial ist noch nicht belastbar bewertet.');
  }

  const stagePoints = {
    lead: 2,
    qualified: 8,
    appointment: 13,
    mandate: 10,
    sold: -25,
  } as const;
  const stageLabels = {
    lead: 'Lead',
    qualified: 'qualifiziert',
    appointment: 'Terminphase',
    mandate: 'Mandatsphase',
    sold: 'bereits verkauft',
  } as const;
  addFactor(
    factors,
    'pipeline_stage',
    'Pipeline-Stufe',
    `Kontakt befindet sich in der Stufe „${stageLabels[contact.stage]}“`,
    stagePoints[contact.stage],
  );

  if (contact.role === 'Eigentümer') {
    addFactor(factors, 'owner_role', 'Eigentümerrolle', 'Der Kontakt ist als Eigentümer eingeordnet', 14);
  }

  const lastActivityAt = latestTimestamp(contact, calls);
  if (lastActivityAt === undefined) {
    addFactor(
      factors,
      'no_activity',
      'Keine Aktivität',
      contact.role === 'Eigentümer'
        ? 'Beim Eigentümerkontakt ist noch keine Aktivität dokumentiert'
        : 'Beim Kontakt ist noch keine Aktivität dokumentiert',
      contact.role === 'Eigentümer' ? 12 : 6,
    );
    missingSignals.push('Letzter Kontaktzeitpunkt fehlt.');
  } else {
    const pauseDays = Math.max(0, Math.floor((now - lastActivityAt) / DAY_MS));
    if (pauseDays >= 60) {
      addFactor(factors, 'contact_pause', 'Lange Kontaktpause', `Seit ${pauseDays} Tagen kein dokumentierter Kontakt`, 15);
    } else if (pauseDays >= 30) {
      addFactor(factors, 'contact_pause', 'Kontaktpause', `Seit ${pauseDays} Tagen kein dokumentierter Kontakt`, 10);
    } else if (pauseDays >= 14) {
      addFactor(factors, 'contact_pause', 'Kontaktpause', `Seit ${pauseDays} Tagen kein dokumentierter Kontakt`, 6);
    } else if (pauseDays >= 7) {
      addFactor(factors, 'contact_pause', 'Kontaktpause', `Seit ${pauseDays} Tagen kein dokumentierter Kontakt`, 3);
    } else if (pauseDays <= 2) {
      addFactor(factors, 'contact_pause', 'Sehr frischer Kontakt', 'Der letzte Kontakt liegt höchstens zwei Tage zurück', -4);
    }
  }

  const noAnswers = countConsecutiveNoAnswers(calls);
  if (noAnswers >= 2) {
    addFactor(
      factors,
      'failed_calls',
      'Mehrfach nicht erreicht',
      `${noAnswers} erfolglose Anrufversuche in Folge – ein Kanalwechsel ist sinnvoll`,
      Math.min(8, noAnswers * 2),
    );
  }

  const positive = latestOutcome(calls, ['appointment', 'conversation']);
  const positiveAt = parseTimestamp(positive?.createdAt);
  if (positive && positiveAt !== undefined && positiveAt <= now && now - positiveAt <= RECENT_POSITIVE_WINDOW_MS) {
    addFactor(
      factors,
      'recent_positive_outcome',
      'Positives Gesprächssignal',
      positive.outcome === 'appointment'
        ? 'Kürzlich wurde ein Termin als Gesprächsergebnis dokumentiert'
        : 'Kürzlich wurde ein positives Gespräch dokumentiert',
      positive.outcome === 'appointment' ? 14 : 9,
    );
  }

  const negative = latestOutcome(calls, ['not_interested']);
  const negativeAt = parseTimestamp(negative?.createdAt);
  if (negativeAt !== undefined && negativeAt <= now && now - negativeAt <= RECENT_NEGATIVE_WINDOW_MS) {
    addFactor(
      factors,
      'recent_negative_outcome',
      'Aktuelles Negativsignal',
      'In den vergangenen 30 Tagen wurde „kein Interesse“ dokumentiert',
      -22,
    );
  }
}

function addAppointmentFactors(factors: ScoreFactor[], appointments: Appointment[], now: number): void {
  const nextAppointment = upcomingAppointments(appointments, now)[0];
  if (!nextAppointment) return;
  const startsAt = parseTimestamp(nextAppointment.startsAt);
  if (startsAt === undefined) return;
  const delta = startsAt - now;
  const points = delta <= 4 * HOUR_MS ? 15 : delta <= 24 * HOUR_MS ? 12 : 7;
  addFactor(
    factors,
    'upcoming_appointment',
    'Bevorstehender Termin',
    delta <= 4 * HOUR_MS
      ? 'Ein Termin beginnt innerhalb der nächsten vier Stunden'
      : delta <= 24 * HOUR_MS
        ? 'Ein Termin findet innerhalb der nächsten 24 Stunden statt'
        : 'Ein Termin findet innerhalb der nächsten 48 Stunden statt',
    points,
  );
}

function addPropertyFactors(
  factors: ScoreFactor[],
  missingSignals: string[],
  contact: Contact | undefined,
  properties: Property[],
): void {
  if (properties.some((property) => property.status === 'Bewertung')) {
    addFactor(factors, 'valuation_opportunity', 'Bewertungschance', 'Eine verknüpfte Immobilie befindet sich in Bewertung', 14);
  }
  if (properties.some((property) => property.status === 'Akquise')) {
    addFactor(factors, 'active_acquisition', 'Aktive Akquise', 'Eine verknüpfte Immobilie befindet sich in aktiver Akquise', 12);
  }
  if (properties.some((property) => property.status === 'Vermarktung')) {
    addFactor(factors, 'active_marketing', 'Aktive Vermarktung', 'Eine verknüpfte Immobilie befindet sich in Vermarktung', 5);
  }
  if (properties.length > 0 && properties.every((property) => property.status === 'Verkauft')) {
    addFactor(factors, 'sold_property', 'Verkauf abgeschlossen', 'Alle verknüpften Immobilien sind bereits verkauft', -5);
  }
  if (contact?.role === 'Eigentümer' && properties.length === 0) {
    missingSignals.push('Es ist noch keine Immobilie oder Bewertungschance verknüpft.');
  }
}

function resolveChannel(
  contact: Contact | undefined,
  requestedChannel: ActionChannel,
  noAnswers: number,
  missingSignals: string[],
): { channel: ActionChannel; blockedReason?: string } {
  if (!contact) return { channel: requestedChannel, blockedReason: 'Der verknüpfte Kontakt fehlt.' };

  const hasPhone = contact.phone.trim().length > 0;
  const hasEmail = Boolean(contact.email?.trim());

  if (requestedChannel === 'phone') {
    if (noAnswers >= 3 && hasEmail) {
      missingSignals.push('Mehrere Anrufversuche waren erfolglos; E-Mail wird als alternativer Kanal empfohlen.');
      return { channel: 'email' };
    }
    if (!hasPhone && hasEmail) {
      missingSignals.push('Telefonnummer fehlt; E-Mail wird als alternativer Kanal empfohlen.');
      return { channel: 'email' };
    }
    if (!hasPhone) {
      missingSignals.push('Telefonnummer fehlt.');
      return { channel: 'planning', blockedReason: 'Keine Telefonnummer oder alternative E-Mail-Adresse vorhanden.' };
    }
  }

  if (requestedChannel === 'email' && !hasEmail) {
    if (hasPhone) {
      missingSignals.push('E-Mail-Adresse fehlt; Telefon wird als alternativer Kanal empfohlen.');
      return { channel: 'phone' };
    }
    missingSignals.push('E-Mail-Adresse fehlt.');
    return { channel: 'planning', blockedReason: 'Keine E-Mail-Adresse oder alternative Telefonnummer vorhanden.' };
  }

  if (requestedChannel === 'planning' && !hasPhone && !hasEmail) {
    missingSignals.push('Weder Telefonnummer noch E-Mail-Adresse sind vorhanden.');
    return { channel: 'planning', blockedReason: 'Vor der Kontaktaufnahme müssen Kontaktdaten ergänzt werden.' };
  }

  return { channel: requestedChannel };
}

function actionLabel(channel: ActionChannel, kind: ActionKind): string {
  if (kind === 'contact-gap') {
    if (channel === 'phone') return 'Kontakt anrufen';
    if (channel === 'email') return 'E-Mail senden';
    return 'Nächste Aktion planen';
  }
  if (channel === 'phone') return 'Follow-up anrufen';
  if (channel === 'email') return 'Follow-up per E-Mail';
  if (channel === 'meeting') return 'Termin vorbereiten';
  return 'Follow-up planen';
}

function actionTitle(contact: Contact | undefined, followUp: FollowUp | undefined, channel: ActionChannel): string {
  const name = contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Unbekannten Kontakt';
  if (followUp) {
    if (channel === 'phone') return `${name} anrufen`;
    if (channel === 'email') return `${name} per E-Mail kontaktieren`;
    if (channel === 'meeting') return `${followUp.title} vorbereiten`;
    return `${followUp.title} klären`;
  }
  if (channel === 'phone') return `${name} kontaktieren und nächsten Schritt festlegen`;
  if (channel === 'email') return `${name} anschreiben und nächsten Schritt festlegen`;
  return `Nächste Aktion für ${name} festlegen`;
}

function buildMovementHints(
  contact: Contact | undefined,
  followUp: FollowUp | undefined,
  properties: Property[],
  appointments: Appointment[],
  calls: CallEvent[],
  now: number,
): { movesUp: string[]; movesDown: string[] } {
  const movesUp: string[] = [];
  const movesDown: string[] = [];

  if (!followUp) movesUp.push('Ein verbindliches Follow-up mit konkreter Fälligkeit hinterlegen.');
  if (contact && contact.priority !== 'high') movesUp.push('Kontaktpriorität auf „hoch“ setzen, sobald konkrete Fakten dies rechtfertigen.');
  if (contact && contact.potential < 70) movesUp.push('Potenzial anhand konkreter Verkaufsindikatoren belastbar höher bewerten.');
  if (contact?.role === 'Eigentümer' && properties.length === 0) movesUp.push('Eine Immobilie oder Bewertungschance mit dem Eigentümer verknüpfen.');
  if (upcomingAppointments(appointments, now).length === 0) movesUp.push('Einen qualifizierten Termin vereinbaren und dokumentieren.');
  if (!latestOutcome(calls, ['conversation', 'appointment'])) movesUp.push('Ein positives Gesprächsergebnis dokumentieren.');

  const dueAt = parseTimestamp(followUp?.dueAt);
  if (dueAt !== undefined && dueAt < now) movesDown.push('Das überfällige Follow-up erledigen oder realistisch neu terminieren.');
  if (countConsecutiveNoAnswers(calls) >= 2) movesDown.push('Nach mehreren erfolglosen Anrufen den Kanal wechseln oder die Kontaktierbarkeit klären.');
  if (upcomingAppointments(appointments, now).length > 0) movesDown.push('Den bevorstehenden Termin durchführen und das Ergebnis dokumentieren.');
  movesDown.push('Ein aktuelles, belastbares Negativsignal senkt die Priorität.');

  return {
    movesUp: [...new Set(movesUp)].slice(0, 4),
    movesDown: [...new Set(movesDown)].slice(0, 4),
  };
}

function summarizeReasons(factors: ScoreFactor[]): { reason: string; reasons: string[] } {
  const reasons = factors
    .filter((factor) => factor.points > 0)
    .sort((left, right) => right.points - left.points || left.key.localeCompare(right.key))
    .slice(0, 5)
    .map((factor) => factor.detail);

  if (reasons.length === 0) {
    return {
      reason: 'Aktuell liegen keine starken positiven Prioritätssignale vor.',
      reasons: [],
    };
  }

  return {
    reason: `Priorisiert, weil ${reasons.slice(0, 3).map((item) => item.charAt(0).toLowerCase() + item.slice(1)).join('; ')}.`,
    reasons,
  };
}

function urgencyFor(score: number, followUp: FollowUp | undefined, now: number): ActionUrgency {
  const dueAt = parseTimestamp(followUp?.dueAt);
  if (dueAt !== undefined && dueAt < now - DAY_MS) return 'critical';
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'normal';
  return 'low';
}

function scoreCandidate(context: CandidateContext): PrioritizedAction {
  const {
    contact,
    followUps,
    primaryFollowUp,
    calls,
    properties,
    appointments,
    now,
  } = context;

  const factors: ScoreFactor[] = [];
  const missingSignals: string[] = [];

  addFollowUpFactors(factors, primaryFollowUp, now);
  addContactFactors(factors, missingSignals, contact, calls, now);
  addAppointmentFactors(factors, appointments, now);
  addPropertyFactors(factors, missingSignals, contact, properties);

  if (!primaryFollowUp) {
    addFactor(factors, 'no_next_action', 'Keine nächste Aktion', 'Für den Kontakt ist keine zukünftige Aktion hinterlegt', 14);
    missingSignals.push('Es ist keine zukünftige nächste Aktion hinterlegt.');
  }

  if (followUps.length > 1) {
    addFactor(
      factors,
      'multiple_open_followups',
      'Mehrere offene Follow-ups',
      `${followUps.length} offene Follow-ups werden zu einer Kontaktaktion gebündelt`,
      Math.min(9, (followUps.length - 1) * 3),
    );
  }

  const requestedChannel: ActionChannel = primaryFollowUp?.channel
    ?? (contact?.phone.trim() ? 'phone' : contact?.email?.trim() ? 'email' : 'planning');
  const resolvedChannel = resolveChannel(contact, requestedChannel, countConsecutiveNoAnswers(calls), missingSignals);

  if (resolvedChannel.blockedReason) {
    addFactor(
      factors,
      'missing_contact_channel',
      'Kontaktweg fehlt',
      resolvedChannel.blockedReason,
      -20,
    );
  }

  const rawScore = factors.reduce((total, factor) => total + factor.points, 0);
  const score = Math.max(0, Math.round(rawScore));
  const summary = summarizeReasons(factors);
  const movement = buildMovementHints(contact, primaryFollowUp, properties, appointments, calls, now);
  const kind: ActionKind = primaryFollowUp ? 'followup' : 'contact-gap';
  const contactId = contact?.id ?? primaryFollowUp?.contactId ?? 'missing-contact';
  const relatedFollowUpIds = followUps.map((followUp) => followUp.id).sort((left, right) => left.localeCompare(right));
  const id = primaryFollowUp
    ? `followup:${contactId}:${primaryFollowUp.id}`
    : `contact-gap:${contactId}`;

  return {
    id,
    kind,
    contactId,
    followUpId: primaryFollowUp?.id,
    relatedFollowUpIds,
    title: actionTitle(contact, primaryFollowUp, resolvedChannel.channel),
    actionLabel: actionLabel(resolvedChannel.channel, kind),
    channel: resolvedChannel.channel,
    score,
    urgency: urgencyFor(score, primaryFollowUp, now),
    dueAt: primaryFollowUp?.dueAt,
    reason: summary.reason,
    reasons: summary.reasons,
    factors: factors.sort((left, right) => right.points - left.points || left.key.localeCompare(right.key)),
    missingSignals: [...new Set(missingSignals)],
    movesUp: movement.movesUp,
    movesDown: movement.movesDown,
    estimatedMinutes: resolvedChannel.channel === 'meeting' ? 15 : resolvedChannel.channel === 'planning' ? 5 : 5,
    blockedReason: resolvedChannel.blockedReason,
  };
}

function compareActions(left: PrioritizedAction, right: PrioritizedAction): number {
  if (left.score !== right.score) return right.score - left.score;
  if (Boolean(left.blockedReason) !== Boolean(right.blockedReason)) return left.blockedReason ? 1 : -1;

  const leftDue = parseTimestamp(left.dueAt) ?? Number.POSITIVE_INFINITY;
  const rightDue = parseTimestamp(right.dueAt) ?? Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;
  if (left.contactId !== right.contactId) return left.contactId.localeCompare(right.contactId);
  return left.id.localeCompare(right.id);
}

function buildActions(state: AppState, now: number): PrioritizedAction[] {
  const indexed = indexState(state);
  const actions: PrioritizedAction[] = [];

  const contactIdsWithFollowUps = [...indexed.openFollowUpsByContact.keys()].sort((left, right) => left.localeCompare(right));
  for (const contactId of contactIdsWithFollowUps) {
    const followUps = [...(indexed.openFollowUpsByContact.get(contactId) ?? [])]
      .sort((left, right) => compareFollowUps(left, right, now));
    const contact = indexed.contactsById.get(contactId);
    actions.push(scoreCandidate({
      contact,
      followUps,
      primaryFollowUp: followUps[0],
      calls: indexed.callEventsByContact.get(contactId) ?? [],
      properties: indexed.propertiesByOwner.get(contactId) ?? [],
      appointments: indexed.appointmentsByContact.get(contactId) ?? [],
      now,
    }));
  }

  for (const contact of indexed.contacts) {
    if (indexed.openFollowUpsByContact.has(contact.id)) continue;
    const futureAppointments = upcomingAppointments(indexed.appointmentsByContact.get(contact.id) ?? [], now);
    if (hasFutureNextAction(contact, now) || futureAppointments.length > 0 || contact.stage === 'sold') continue;

    actions.push(scoreCandidate({
      contact,
      followUps: [],
      calls: indexed.callEventsByContact.get(contact.id) ?? [],
      properties: indexed.propertiesByOwner.get(contact.id) ?? [],
      appointments: indexed.appointmentsByContact.get(contact.id) ?? [],
      now,
    }));
  }

  return actions.sort(compareActions);
}

function isSameUtcDay(timestamp: number, now: number): boolean {
  return new Date(timestamp).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
}

function overdueItems(state: AppState, now: number): OverdueFollowUpItem[] {
  const contactsById = new Map(uniqueById(state.contacts).map((contact) => [contact.id, contact]));
  return uniqueById(state.followUps)
    .filter((followUp) => followUp.status === 'open')
    .map((followUp) => ({ followUp, dueAt: parseTimestamp(followUp.dueAt) }))
    .filter((item): item is { followUp: FollowUp; dueAt: number } => item.dueAt !== undefined && item.dueAt < now)
    .sort((left, right) => left.dueAt - right.dueAt || left.followUp.id.localeCompare(right.followUp.id))
    .map(({ followUp, dueAt }) => ({
      followUp,
      contact: contactsById.get(followUp.contactId),
      overdueHours: Math.max(1, Math.ceil((now - dueAt) / HOUR_MS)),
    }));
}

function planProgress(state: AppState, actions: PrioritizedAction[], now: number): DailyProgress {
  const callsLogged = uniqueById(state.callEvents).filter((call) => {
    const timestamp = parseTimestamp(call.createdAt);
    return timestamp !== undefined && isSameUtcDay(timestamp, now);
  }).length;

  const completedFollowUpIds = new Set(
    uniqueById(state.auditEvents)
      .filter((event) => {
        const timestamp = parseTimestamp(event.createdAt);
        return event.entity === 'followup'
          && event.action === 'completed'
          && timestamp !== undefined
          && isSameUtcDay(timestamp, now)
          && Boolean(event.entityId);
      })
      .map((event) => event.entityId as string),
  );

  const followUpsCompleted = completedFollowUpIds.size;
  const executableActions = actions.filter((action) => !action.blockedReason);
  const target = Math.min(5, executableActions.length);
  const completed = Math.min(target, Math.max(callsLogged, followUpsCompleted));
  const percent = target === 0 ? 100 : Math.min(100, Math.round((completed / target) * 100));

  return {
    target,
    completed,
    percent,
    callsLogged,
    followUpsCompleted,
    label: target === 0
      ? 'Keine offene priorisierte Aktion'
      : `${completed} von ${target} priorisierten Aktionen umgesetzt`,
  };
}

export function getExecutionCapabilities(role: UserRole): ExecutionCapabilities {
  const writable = role === 'owner' || role === 'admin' || role === 'agent';
  return {
    canLogCalls: writable,
    canManageFollowUps: writable,
    canMovePipeline: writable,
    readOnly: !writable,
  };
}

export function prioritizeActions(state: AppState, now: number): PrioritizedAction[] {
  return buildActions(state, now);
}

export function buildDailyExecutionPlan(state: AppState, now: number): DailyExecutionPlan {
  const indexed = indexState(state);
  const actions = buildActions(state, now);
  const upcoming = uniqueById(state.appointments)
    .filter((appointment) => {
      const startsAt = parseTimestamp(appointment.startsAt);
      return startsAt !== undefined && startsAt >= now && startsAt <= now + UPCOMING_APPOINTMENT_WINDOW_MS;
    })
    .sort((left, right) => {
      const leftTime = parseTimestamp(left.startsAt) ?? Number.POSITIVE_INFINITY;
      const rightTime = parseTimestamp(right.startsAt) ?? Number.POSITIVE_INFINITY;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return left.id.localeCompare(right.id);
    });

  const contactsWithoutNextAction = indexed.contacts
    .filter((contact) => {
      const hasOpenFollowUp = indexed.openFollowUpsByContact.has(contact.id);
      const hasUpcomingAppointment = upcoming.some((appointment) => appointment.contactId === contact.id);
      return !hasOpenFollowUp && !hasFutureNextAction(contact, now) && !hasUpcomingAppointment && contact.stage !== 'sold';
    })
    .sort((left, right) => {
      const priorityDifference = contactPriorityPoints[right.priority] - contactPriorityPoints[left.priority];
      if (priorityDifference !== 0) return priorityDifference;
      if (left.potential !== right.potential) return right.potential - left.potential;
      return left.id.localeCompare(right.id);
    });

  return {
    generatedAt: new Date(now).toISOString(),
    actions,
    topActions: actions.slice(0, 3),
    additionalActions: actions.slice(3),
    overdueFollowUps: overdueItems(state, now),
    quickWins: actions
      .filter((action) => !action.blockedReason && action.estimatedMinutes <= 5 && action.score >= 30)
      .slice(0, 5),
    importantOwnerActions: actions
      .filter((action) => indexed.contactsById.get(action.contactId)?.role === 'Eigentümer')
      .slice(0, 5),
    upcomingAppointments: upcoming,
    contactsWithoutNextAction,
    progress: planProgress(state, actions, now),
  };
}
