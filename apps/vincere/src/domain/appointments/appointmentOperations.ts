import type {
  Appointment,
  CallEvent,
  Contact,
  FollowUp,
  Priority,
  Property,
  UserRole,
} from '../../types/domain';

export type AppointmentKind =
  | 'Erstgespräch'
  | 'Bewertungstermin'
  | 'Besichtigung'
  | 'Nachfassgespräch'
  | 'Netzwerktermin'
  | 'Telefontermin'
  | 'Beratung'
  | 'sonstiger Termin'
  | 'unklar';

export type AppointmentSourceMode = 'workspace' | 'offline-mock';

export type PreparationIssueCode =
  | 'contact_missing'
  | 'phone_missing'
  | 'address_missing'
  | 'property_missing'
  | 'last_conversation_missing'
  | 'goal_missing'
  | 'next_action_missing'
  | 'open_followup'
  | 'overdue_followup'
  | 'owner_link_missing'
  | 'confirmation_missing'
  | 'time_conflict'
  | 'invalid_time'
  | 'appointment_in_past'
  | 'documents_not_modeled';

export type PreparationSeverity = 'high' | 'medium' | 'info';

export interface AppointmentKindResolution {
  kind: AppointmentKind;
  confidence: 'explicit' | 'unclear';
  reason: string;
}

export interface PreparationIssue {
  code: PreparationIssueCode;
  severity: PreparationSeverity;
  title: string;
  detail: string;
}

export interface AppointmentGoals {
  conversationGoal?: string;
  minimumGoal?: string;
  idealGoal?: string;
  openQuestions: string[];
}

export interface ResolvedProperty {
  property?: Property;
  status: 'linked' | 'ambiguous' | 'missing';
  candidates: Property[];
}

export interface AppointmentBriefing {
  appointment: Appointment;
  kind: AppointmentKindResolution;
  startsAt?: Date;
  contact?: Contact;
  propertyResolution: ResolvedProperty;
  location?: string;
  contactDetails: string[];
  lastActivity?: string;
  openFollowUps: FollowUp[];
  knownObjections: string[];
  goals: AppointmentGoals;
  issues: PreparationIssue[];
  risks: string[];
  recommendedPreparation: string[];
  checklist: string[];
  estimatedPreparationMinutes: number;
  estimatedDurationMinutes: number;
  priority: Priority;
  confirmation: 'documented' | 'not_documented';
  documentAssessment: string;
  sourceMode: AppointmentSourceMode;
}

export interface DailyRouteItem {
  briefing: AppointmentBriefing;
  chronologicalIndex: number;
  locationChange: 'first_stop' | 'same_location' | 'different_location' | 'unknown';
  estimatedTransferBufferMinutes: number;
  recommendedPostAppointmentBufferMinutes: number;
  conflictWithAppointmentIds: string[];
  requiredCallback?: string;
  planningNotice: string;
}

export interface AppointmentOperationsSnapshot {
  generatedAt: string;
  sourceMode: AppointmentSourceMode;
  today: AppointmentBriefing[];
  future: AppointmentBriefing[];
  past: AppointmentBriefing[];
  invalid: AppointmentBriefing[];
  route: DailyRouteItem[];
  unresolvedTypeCount: number;
  highRiskCount: number;
  callbacksRequired: number;
}

export interface AppointmentOperationsInput {
  appointments: Appointment[];
  contacts: Contact[];
  properties: Property[];
  followUps: FollowUp[];
  callEvents: CallEvent[];
  now: Date;
  sourceMode?: AppointmentSourceMode;
}

export interface AppointmentCapabilities {
  canCreateFollowUp: boolean;
  canMovePipeline: boolean;
  canPersistAppointmentOutcome: false;
  canEditAppointment: false;
}

const KIND_RULES: ReadonlyArray<{
  kind: Exclude<AppointmentKind, 'sonstiger Termin' | 'unklar'>;
  terms: readonly string[];
}> = [
  { kind: 'Bewertungstermin', terms: ['bewertung', 'marktwert', 'wertermittlung'] },
  { kind: 'Besichtigung', terms: ['besichtigung', 'objektbegehung'] },
  { kind: 'Nachfassgespräch', terms: ['nachfass', 'follow-up', 'follow up', 'nachbereitung'] },
  { kind: 'Netzwerktermin', terms: ['netzwerk', 'tippgeber', 'kooperation', 'partnertermin'] },
  { kind: 'Telefontermin', terms: ['telefontermin', 'telefonat', 'rückruf', 'call'] },
  { kind: 'Erstgespräch', terms: ['erstgespräch', 'kennenlernen', 'erstkontakt'] },
  { kind: 'Beratung', terms: ['beratung', 'beratungsgespräch'] },
];

const DURATION_MINUTES: Record<AppointmentKind, number> = {
  Erstgespräch: 60,
  Bewertungstermin: 75,
  Besichtigung: 60,
  Nachfassgespräch: 30,
  Netzwerktermin: 45,
  Telefontermin: 30,
  Beratung: 60,
  'sonstiger Termin': 45,
  unklar: 45,
};

const BASE_PREPARATION_MINUTES: Record<AppointmentKind, number> = {
  Erstgespräch: 20,
  Bewertungstermin: 35,
  Besichtigung: 25,
  Nachfassgespräch: 15,
  Netzwerktermin: 15,
  Telefontermin: 10,
  Beratung: 20,
  'sonstiger Termin': 15,
  unklar: 20,
};

const OUTCOME_LABELS: Record<CallEvent['outcome'], string> = {
  no_answer: 'nicht erreicht',
  conversation: 'Gespräch geführt',
  appointment: 'Termin vereinbart',
  not_interested: 'kein Interesse',
};

const normalize = (value: string | undefined) => value?.trim().toLocaleLowerCase('de-DE') ?? '';

function validDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function localDateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function compareAppointments(left: AppointmentBriefing, right: AppointmentBriefing): number {
  const leftTime = left.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightTime = right.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (leftTime !== rightTime) return leftTime - rightTime;
  const titleComparison = left.appointment.title.localeCompare(right.appointment.title, 'de');
  if (titleComparison !== 0) return titleComparison;
  return left.appointment.id.localeCompare(right.appointment.id, 'de');
}

function extractLabeledValues(text: string, labels: readonly string[]): string[] {
  const segments = text
    .split(/[\n|;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const values: string[] = [];
  for (const segment of segments) {
    const separator = segment.indexOf(':');
    if (separator < 0) continue;
    const label = normalize(segment.slice(0, separator));
    const value = segment.slice(separator + 1).trim();
    if (!value) continue;
    if (labels.some((candidate) => label === normalize(candidate))) values.push(value);
  }
  return values;
}

function appointmentText(appointment: Appointment): string {
  return `${appointment.title}\n${appointment.subtitle}`.trim();
}

export function deriveAppointmentKind(appointment: Appointment): AppointmentKindResolution {
  const text = normalize(appointmentText(appointment));
  for (const rule of KIND_RULES) {
    const term = rule.terms.find((candidate) => text.includes(candidate));
    if (term) {
      return {
        kind: rule.kind,
        confidence: 'explicit',
        reason: `Aus dem vorhandenen Begriff „${term}“ abgeleitet.`,
      };
    }
  }

  if (text.includes('termin')) {
    return {
      kind: 'sonstiger Termin',
      confidence: 'explicit',
      reason: 'Als allgemeiner Termin bezeichnet; keine spezifischere Terminart dokumentiert.',
    };
  }

  return {
    kind: 'unklar',
    confidence: 'unclear',
    reason: 'Titel und Untertitel enthalten keine belastbare Terminart.',
  };
}

export function extractAppointmentGoals(appointment: Appointment): AppointmentGoals {
  const text = appointmentText(appointment);
  return {
    conversationGoal: extractLabeledValues(text, ['Ziel', 'Gesprächsziel'])[0],
    minimumGoal: extractLabeledValues(text, ['Mindestziel'])[0],
    idealGoal: extractLabeledValues(text, ['Idealziel'])[0],
    openQuestions: extractLabeledValues(text, ['Frage', 'Offene Frage', 'Offene Fragen']),
  };
}

function resolveProperty(contact: Contact | undefined, properties: Property[]): ResolvedProperty {
  if (!contact) return { status: 'missing', candidates: [] };
  const candidates = properties
    .filter((property) => property.ownerContactId === contact.id)
    .sort((left, right) => left.title.localeCompare(right.title, 'de') || left.id.localeCompare(right.id));
  if (candidates.length === 1) return { status: 'linked', property: candidates[0], candidates };
  if (candidates.length > 1) return { status: 'ambiguous', candidates };
  return { status: 'missing', candidates };
}

function resolveLocation(appointment: Appointment, propertyResolution: ResolvedProperty): string | undefined {
  if (propertyResolution.property) {
    return [propertyResolution.property.address, propertyResolution.property.city].filter(Boolean).join(', ');
  }
  return extractLabeledValues(appointmentText(appointment), ['Ort', 'Adresse', 'Treffpunkt'])[0];
}

function getKnownObjections(contact: Contact | undefined): string[] {
  if (!contact?.notes) return [];
  return extractLabeledValues(contact.notes, ['Einwand', 'Einwände']);
}

function getLastActivity(contact: Contact | undefined, callEvents: CallEvent[]): string | undefined {
  if (!contact) return undefined;
  const latestCall = callEvents
    .filter((event) => event.contactId === contact.id)
    .map((event) => ({ event, date: validDate(event.createdAt) }))
    .filter((entry): entry is { event: CallEvent; date: Date } => Boolean(entry.date))
    .sort((left, right) => right.date.getTime() - left.date.getTime() || left.event.id.localeCompare(right.event.id))[0];

  const lastContact = validDate(contact.lastContactAt);
  if (latestCall && (!lastContact || latestCall.date.getTime() >= lastContact.getTime())) {
    return `${latestCall.date.toLocaleString('de-DE')}: ${OUTCOME_LABELS[latestCall.event.outcome]}${latestCall.event.note ? ` – ${latestCall.event.note}` : ''}`;
  }
  return lastContact ? `${lastContact.toLocaleString('de-DE')}: letzter Kontakt dokumentiert` : undefined;
}

function hasDocumentedConfirmation(appointment: Appointment): boolean {
  const text = normalize(appointmentText(appointment));
  return text.includes('bestätigt') || text.includes('confirmed');
}

function isPropertyRelevant(kind: AppointmentKind): boolean {
  return kind === 'Bewertungstermin' || kind === 'Besichtigung';
}

function makeIssue(
  code: PreparationIssueCode,
  severity: PreparationSeverity,
  title: string,
  detail: string,
): PreparationIssue {
  return { code, severity, title, detail };
}

function conflictMap(appointments: Appointment[]): Map<string, Set<string>> {
  const valid = appointments
    .map((appointment) => ({ appointment, start: validDate(appointment.startsAt) }))
    .filter((entry): entry is { appointment: Appointment; start: Date } => Boolean(entry.start))
    .map((entry) => ({
      ...entry,
      duration: DURATION_MINUTES[deriveAppointmentKind(entry.appointment).kind],
    }));

  const map = new Map<string, Set<string>>();
  for (let index = 0; index < valid.length; index += 1) {
    const left = valid[index];
    if (!left) continue;
    const leftEnd = left.start.getTime() + left.duration * 60_000;
    for (let otherIndex = index + 1; otherIndex < valid.length; otherIndex += 1) {
      const right = valid[otherIndex];
      if (!right) continue;
      const rightEnd = right.start.getTime() + right.duration * 60_000;
      if (left.start.getTime() < rightEnd && right.start.getTime() < leftEnd) {
        const leftConflicts = map.get(left.appointment.id) ?? new Set<string>();
        leftConflicts.add(right.appointment.id);
        map.set(left.appointment.id, leftConflicts);
        const rightConflicts = map.get(right.appointment.id) ?? new Set<string>();
        rightConflicts.add(left.appointment.id);
        map.set(right.appointment.id, rightConflicts);
      }
    }
  }
  return map;
}

function appointmentPriority(
  startsAt: Date | undefined,
  now: Date,
  kind: AppointmentKind,
  issues: PreparationIssue[],
): Priority {
  const highIssue = issues.some((issue) => issue.severity === 'high');
  const isCommercialCore = kind === 'Bewertungstermin' || kind === 'Besichtigung' || kind === 'Erstgespräch';
  const hoursUntil = startsAt ? (startsAt.getTime() - now.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;

  if (issues.some((issue) => issue.code === 'time_conflict' || issue.code === 'invalid_time')) return 'high';
  if (highIssue && (hoursUntil <= 24 || isCommercialCore)) return 'high';
  if (hoursUntil <= 24 || issues.length > 0) return 'medium';
  return 'low';
}

function recommendedPreparationFromIssues(
  kind: AppointmentKind,
  issues: PreparationIssue[],
  knownObjections: string[],
): string[] {
  const recommendations: string[] = [];
  const codes = new Set(issues.map((issue) => issue.code));
  if (codes.has('confirmation_missing')) recommendations.push('Terminbestätigung aktiv nachholen und dokumentieren.');
  if (codes.has('goal_missing')) recommendations.push('Gesprächsziel, Mindestziel und Idealziel vor dem Termin festlegen.');
  if (codes.has('last_conversation_missing')) recommendations.push('Letzten Gesprächsstand beim Kontakt klären oder als unbekannt markieren.');
  if (codes.has('property_missing')) recommendations.push('Objektbezug vor dem Termin eindeutig klären.');
  if (codes.has('address_missing')) recommendations.push('Treffpunkt beziehungsweise vollständige Adresse bestätigen.');
  if (codes.has('overdue_followup')) recommendations.push('Überfälliges Follow-up vor dem Termin prüfen und konsolidieren.');
  if (codes.has('next_action_missing')) recommendations.push('Konkrete nächste Aktion nach dem Termin vorplanen.');
  if (codes.has('time_conflict')) recommendations.push('Terminüberschneidung vor dem Außendienststart auflösen.');
  if (knownObjections.length > 0) recommendations.push('Dokumentierte Einwände und passende Rückfragen vorbereiten.');
  if (kind === 'Bewertungstermin' || kind === 'Besichtigung') {
    recommendations.push('Benötigte Objektunterlagen manuell prüfen; ihr Status ist derzeit nicht im Datenmodell erfasst.');
  }
  return [...new Set(recommendations)];
}

function checklistFor(
  kind: AppointmentKind,
  issues: PreparationIssue[],
  goals: AppointmentGoals,
): string[] {
  const checklist = ['Terminzeit und Kontakt prüfen', 'Gesprächsergebnis und nächste Aktion direkt nach dem Termin festhalten'];
  const codes = new Set(issues.map((issue) => issue.code));
  if (codes.has('confirmation_missing')) checklist.push('Termin bestätigen');
  if (codes.has('address_missing')) checklist.push('Adresse oder Treffpunkt klären');
  if (codes.has('phone_missing')) checklist.push('Kontaktweg ergänzen');
  if (codes.has('property_missing')) checklist.push('Objekt eindeutig zuordnen');
  if (!goals.conversationGoal) checklist.push('Konkretes Gesprächsziel definieren');
  if (kind === 'Bewertungstermin') checklist.push('Bewertungsunterlagen und offene Objektfragen prüfen');
  if (kind === 'Besichtigung') checklist.push('Besichtigungsablauf und objektbezogene Fragen vorbereiten');
  if (kind === 'Netzwerktermin') checklist.push('Konkreten gegenseitigen nächsten Schritt festlegen');
  return [...new Set(checklist)];
}

export function buildAppointmentBriefing(
  input: AppointmentOperationsInput,
  appointment: Appointment,
  conflicts: ReadonlySet<string> = new Set<string>(),
): AppointmentBriefing {
  const sourceMode = input.sourceMode ?? 'workspace';
  const kind = deriveAppointmentKind(appointment);
  const startsAt = validDate(appointment.startsAt);
  const contact = appointment.contactId
    ? input.contacts.find((candidate) => candidate.id === appointment.contactId)
    : undefined;
  const propertyResolution = resolveProperty(contact, input.properties);
  const location = resolveLocation(appointment, propertyResolution);
  const goals = extractAppointmentGoals(appointment);
  const knownObjections = getKnownObjections(contact);
  const lastActivity = getLastActivity(contact, input.callEvents);
  const openFollowUps = contact
    ? input.followUps
      .filter((followUp) => followUp.contactId === contact.id && followUp.status === 'open')
      .sort((left, right) => {
        const leftDate = validDate(left.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
        const rightDate = validDate(right.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
        return leftDate - rightDate || left.id.localeCompare(right.id);
      })
    : [];
  const issues: PreparationIssue[] = [];

  if (!appointment.contactId || !contact) {
    issues.push(makeIssue('contact_missing', 'high', 'Kontakt fehlt', 'Der Termin ist keinem vorhandenen Kontakt eindeutig zugeordnet.'));
  } else if (!contact.phone.trim()) {
    issues.push(makeIssue('phone_missing', 'high', 'Telefonnummer fehlt', 'Für den verknüpften Kontakt ist keine Telefonnummer dokumentiert.'));
  }

  if (!location) {
    issues.push(makeIssue('address_missing', 'high', 'Adresse oder Treffpunkt fehlt', 'Aus Objektbezug und ausdrücklich beschrifteten Termindaten ist kein Ort ableitbar.'));
  }

  if (isPropertyRelevant(kind.kind) && propertyResolution.status !== 'linked') {
    issues.push(makeIssue(
      'property_missing',
      'high',
      propertyResolution.status === 'ambiguous' ? 'Objektzuordnung ist mehrdeutig' : 'Objekt ist nicht verknüpft',
      propertyResolution.status === 'ambiguous'
        ? `${propertyResolution.candidates.length} Immobilien sind dem Kontakt zugeordnet; der Termin nennt keine eindeutige Auswahl.`
        : 'Für diese Terminart ist kein eindeutig verknüpftes Objekt vorhanden.',
    ));
  }

  if (contact && !lastActivity) {
    issues.push(makeIssue('last_conversation_missing', 'medium', 'Letzter Gesprächsstand fehlt', 'Weder letzter Kontaktzeitpunkt noch Telefonereignis sind dokumentiert.'));
  }

  if (!goals.conversationGoal) {
    issues.push(makeIssue('goal_missing', 'high', 'Kein klares Terminziel', 'Ein ausdrücklich als Ziel gekennzeichneter Eintrag fehlt.'));
  }

  const followUpAfterAppointment = startsAt
    ? openFollowUps.some((followUp) => {
      const dueAt = validDate(followUp.dueAt);
      return Boolean(dueAt && dueAt.getTime() > startsAt.getTime());
    })
    : false;
  if (!followUpAfterAppointment) {
    issues.push(makeIssue('next_action_missing', 'medium', 'Keine nächste Aktion nach dem Termin', 'Es ist kein offenes Follow-up nach dem Terminzeitpunkt dokumentiert.'));
  }

  if (openFollowUps.length > 0) {
    issues.push(makeIssue('open_followup', 'info', 'Offene Follow-ups vorhanden', `${openFollowUps.length} offenes Follow-up muss im Briefing berücksichtigt werden.`));
  }
  const overdueCount = openFollowUps.filter((followUp) => {
    const dueAt = validDate(followUp.dueAt);
    return Boolean(dueAt && dueAt.getTime() < input.now.getTime());
  }).length;
  if (overdueCount > 0) {
    issues.push(makeIssue('overdue_followup', 'high', 'Überfälliges Follow-up', `${overdueCount} Follow-up ist vor dem Termin bereits überfällig.`));
  }

  if (
    isPropertyRelevant(kind.kind)
    && (!contact || contact.role !== 'Eigentümer' || propertyResolution.property?.ownerContactId !== contact.id)
  ) {
    issues.push(makeIssue('owner_link_missing', 'high', 'Eigentümerverknüpfung fehlt', 'Die vorhandenen Beziehungen belegen keine eindeutige Eigentümer-Objekt-Zuordnung.'));
  }

  const confirmation = hasDocumentedConfirmation(appointment) ? 'documented' : 'not_documented';
  if (confirmation === 'not_documented') {
    issues.push(makeIssue('confirmation_missing', 'medium', 'Termin nicht bestätigt', 'In Titel und Untertitel ist keine ausdrückliche Bestätigung dokumentiert.'));
  }

  if (!startsAt) {
    issues.push(makeIssue('invalid_time', 'high', 'Ungültige Zeitangabe', 'Die gespeicherte Startzeit kann nicht als Datum verarbeitet werden.'));
  } else if (startsAt.getTime() < input.now.getTime()) {
    issues.push(makeIssue('appointment_in_past', 'info', 'Termin liegt in der Vergangenheit', 'Der Termin benötigt eine Nachbereitung oder Statusklärung.'));
  }

  if (conflicts.size > 0) {
    issues.push(makeIssue('time_conflict', 'high', 'Terminkonflikt', `Der geschätzte Zeitblock überschneidet sich mit ${conflicts.size} weiterem Termin.`));
  }

  const documentAssessment = isPropertyRelevant(kind.kind)
    ? 'Nicht prüfbar: Unterlagen und Dokumentenstatus sind im aktuellen Datenmodell nicht erfasst.'
    : 'Für diese Terminart ist im aktuellen Datenmodell kein Unterlagenstatus vorgesehen.';
  if (isPropertyRelevant(kind.kind)) {
    issues.push(makeIssue('documents_not_modeled', 'info', 'Unterlagenstatus nicht prüfbar', documentAssessment));
  }

  const highIssueCount = issues.filter((issue) => issue.severity === 'high').length;
  const estimatedPreparationMinutes = Math.min(
    75,
    BASE_PREPARATION_MINUTES[kind.kind] + highIssueCount * 5 + (knownObjections.length > 0 ? 5 : 0),
  );
  const recommendedPreparation = recommendedPreparationFromIssues(kind.kind, issues, knownObjections);

  return {
    appointment,
    kind,
    startsAt,
    contact,
    propertyResolution,
    location,
    contactDetails: contact ? [contact.phone, contact.email].filter((value): value is string => Boolean(value?.trim())) : [],
    lastActivity,
    openFollowUps,
    knownObjections,
    goals,
    issues,
    risks: issues.filter((issue) => issue.severity !== 'info').map((issue) => issue.title),
    recommendedPreparation,
    checklist: checklistFor(kind.kind, issues, goals),
    estimatedPreparationMinutes,
    estimatedDurationMinutes: DURATION_MINUTES[kind.kind],
    priority: appointmentPriority(startsAt, input.now, kind.kind, issues),
    confirmation,
    documentAssessment,
    sourceMode,
  };
}

function buildDailyRoute(today: AppointmentBriefing[]): DailyRouteItem[] {
  const sorted = [...today].sort(compareAppointments);
  return sorted.map((briefing, index) => {
    const previous = sorted[index - 1];
    let locationChange: DailyRouteItem['locationChange'] = 'first_stop';
    let estimatedTransferBufferMinutes = 0;

    if (previous) {
      if (!previous.location || !briefing.location) {
        locationChange = 'unknown';
        estimatedTransferBufferMinutes = 15;
      } else if (normalize(previous.location) === normalize(briefing.location)) {
        locationChange = 'same_location';
      } else {
        locationChange = 'different_location';
        estimatedTransferBufferMinutes = 30;
      }
    }

    const conflictWithAppointmentIds = briefing.issues.some((issue) => issue.code === 'time_conflict')
      ? sorted
        .filter((candidate) => candidate.appointment.id !== briefing.appointment.id)
        .filter((candidate) => {
          if (!candidate.startsAt || !briefing.startsAt) return false;
          const candidateEnd = candidate.startsAt.getTime() + candidate.estimatedDurationMinutes * 60_000;
          const briefingEnd = briefing.startsAt.getTime() + briefing.estimatedDurationMinutes * 60_000;
          return candidate.startsAt.getTime() < briefingEnd && briefing.startsAt.getTime() < candidateEnd;
        })
        .map((candidate) => candidate.appointment.id)
      : [];

    let requiredCallback: string | undefined;
    if (briefing.confirmation === 'not_documented') {
      requiredCallback = briefing.contact?.phone
        ? 'Terminbestätigung telefonisch nachholen.'
        : 'Kontaktweg für die Terminbestätigung klären.';
    }

    return {
      briefing,
      chronologicalIndex: index + 1,
      locationChange,
      estimatedTransferBufferMinutes,
      recommendedPostAppointmentBufferMinutes: 15,
      conflictWithAppointmentIds,
      requiredCallback,
      planningNotice: 'Dauer und Puffer sind lokale Planungsannahmen; es werden keine Karten- oder Navigationsdaten verwendet.',
    };
  });
}

export function buildAppointmentOperations(input: AppointmentOperationsInput): AppointmentOperationsSnapshot {
  const conflicts = conflictMap(input.appointments);
  const briefings = input.appointments
    .map((appointment) => buildAppointmentBriefing(input, appointment, conflicts.get(appointment.id)))
    .sort(compareAppointments);
  const todayKey = localDateKey(input.now);
  const today = briefings.filter((briefing) => briefing.startsAt && localDateKey(briefing.startsAt) === todayKey);
  const future = briefings.filter((briefing) => briefing.startsAt && localDateKey(briefing.startsAt) > todayKey);
  const past = briefings.filter((briefing) => briefing.startsAt && localDateKey(briefing.startsAt) < todayKey);
  const invalid = briefings.filter((briefing) => !briefing.startsAt);
  const route = buildDailyRoute(today);

  return {
    generatedAt: input.now.toISOString(),
    sourceMode: input.sourceMode ?? 'workspace',
    today,
    future,
    past,
    invalid,
    route,
    unresolvedTypeCount: briefings.filter((briefing) => briefing.kind.kind === 'unklar').length,
    highRiskCount: briefings.filter((briefing) => briefing.issues.some((issue) => issue.severity === 'high')).length,
    callbacksRequired: route.filter((item) => Boolean(item.requiredCallback)).length,
  };
}

export function getAppointmentCapabilities(role: UserRole): AppointmentCapabilities {
  const canWrite = role !== 'viewer';
  return {
    canCreateFollowUp: canWrite,
    canMovePipeline: canWrite,
    canPersistAppointmentOutcome: false,
    canEditAppointment: false,
  };
}

export function formatAppointmentTime(briefing: AppointmentBriefing): string {
  return briefing.startsAt
    ? briefing.startsAt.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Ungültige Zeitangabe';
}
