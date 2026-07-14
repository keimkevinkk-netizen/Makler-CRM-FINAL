import type { AppState, AuditEvent, Contact, ContactStage, Property } from '../../types/domain';
import type {
  AnalyticsPeriod,
  DateRange,
  ForecastItem,
  ForecastSummary,
  FunnelStageAnalysis,
  MetricComparison,
  SalesControlSnapshot,
  SalesKpis,
  ScenarioInput,
  ScenarioRequirement,
} from './model';

const DAY = 86_400_000;
const STAGES: ContactStage[] = ['lead', 'qualified', 'appointment', 'mandate', 'sold'];
const STAGE_LABELS: Record<ContactStage, string> = {
  lead: 'Kontakt',
  qualified: 'Qualifiziert',
  appointment: 'Termin',
  mandate: 'Mandat',
  sold: 'Verkauft',
};
const STAGE_MATURITY: Record<ContactStage, number> = {
  lead: 0.1,
  qualified: 0.25,
  appointment: 0.45,
  mandate: 0.7,
  sold: 1,
};
const PROPERTY_MATURITY: Record<Property['status'], number> = {
  Akquise: 0.2,
  Bewertung: 0.4,
  Vermarktung: 0.75,
  Verkauft: 1,
};
const STALL_THRESHOLDS: Record<ContactStage, number> = {
  lead: 7,
  qualified: 10,
  appointment: 7,
  mandate: 14,
  sold: Number.POSITIVE_INFINITY,
};
const NEXT_MEASURES: Record<ContactStage, string> = {
  lead: 'Kontakt qualifizieren und einen konkreten nächsten Schritt terminieren.',
  qualified: 'Bewertungs- oder Beratungstermin verbindlich vereinbaren.',
  appointment: 'Termin vorbereiten, Bedarf sichern und Mandatsentscheidung nachhalten.',
  mandate: 'Vermarktungsfortschritt und Abschlusshemmnisse aktiv steuern.',
  sold: 'Empfehlung, Bewertung und langfristige Beziehungspflege sichern.',
};

function validTime(value?: string): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function startOfUtcDay(now: number) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(now: number) {
  const dayStart = startOfUtcDay(now);
  const weekday = new Date(dayStart).getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  return dayStart - mondayOffset * DAY;
}

function startOfUtcMonth(now: number) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function getAnalyticsRange(period: AnalyticsPeriod, now: number): { current: DateRange; previous: DateRange } {
  const end = now;
  let start: number;
  let label: string;
  if (period === 'today') {
    start = startOfUtcDay(now);
    label = 'Heute';
  } else if (period === 'week') {
    start = startOfUtcWeek(now);
    label = 'Diese Woche';
  } else if (period === 'month') {
    start = startOfUtcMonth(now);
    label = 'Dieser Monat';
  } else {
    start = now - 30 * DAY;
    label = 'Rollierende 30 Tage';
  }
  const duration = Math.max(1, end - start);
  return {
    current: { start, end, label },
    previous: { start: start - duration, end: start, label: `Vorheriger Vergleichszeitraum (${label})` },
  };
}

function inRange(value: string | undefined, range: DateRange) {
  const timestamp = validTime(value);
  return timestamp !== null && timestamp >= range.start && timestamp < range.end;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function comparison(current: number, previous: number | null, note?: string): MetricComparison {
  if (previous === null) return { current, previous: null, delta: null, deltaPercent: null, comparable: false, note };
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    deltaPercent: previous === 0 ? null : round((delta / previous) * 100, 1),
    comparable: true,
    note,
  };
}

function hasNextAction(state: AppState, contact: Contact, now: number) {
  const openFollowUp = state.followUps.some((item) => item.contactId === contact.id && item.status === 'open' && validTime(item.dueAt) !== null);
  const plannedContactAction = (validTime(contact.nextActionAt) ?? 0) >= now;
  const futureAppointment = state.appointments.some((item) => item.contactId === contact.id && (validTime(item.startsAt) ?? 0) >= now);
  return openFollowUp || plannedContactAction || futureAppointment;
}

function latestActivityAt(state: AppState, contact: Contact): number | null {
  const callTimes = state.callEvents
    .filter((item) => item.contactId === contact.id)
    .map((item) => validTime(item.createdAt))
    .filter((item): item is number => item !== null);
  const values = [validTime(contact.lastContactAt), ...callTimes].filter((item): item is number => item !== null);
  return values.length > 0 ? Math.max(...values) : null;
}

function contactDataQuality(contact: Contact) {
  const checks = [
    Boolean(contact.firstName.trim()),
    Boolean(contact.lastName.trim()),
    Boolean(contact.phone.trim() || contact.email?.trim()),
    Boolean(contact.city.trim()),
    Boolean(contact.source.trim()),
    Boolean(contact.role),
    Boolean(contact.stage),
    Boolean(contact.priority),
    Number.isFinite(contact.potential) && contact.potential >= 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

function currentStageEnteredAt(contact: Contact, auditEvents: AuditEvent[]): number | null {
  const target = contact.stage.toLowerCase();
  const timestamps = auditEvents
    .filter((event) => event.entity === 'contact'
      && event.entityId === contact.id
      && event.action === 'stage_changed'
      && event.summary.toLowerCase().includes(target))
    .map((event) => validTime(event.createdAt))
    .filter((item): item is number => item !== null);
  if (timestamps.length > 0) return Math.max(...timestamps);
  if (contact.stage === 'lead') return validTime(contact.createdAt);
  return null;
}

function countInvalidDates(state: AppState) {
  const values = [
    ...state.contacts.flatMap((item) => [item.createdAt, item.lastContactAt, item.nextActionAt]),
    ...state.followUps.map((item) => item.dueAt),
    ...state.appointments.map((item) => item.startsAt),
    ...state.callEvents.map((item) => item.createdAt),
    ...state.auditEvents.map((item) => item.createdAt),
  ].filter((item): item is string => Boolean(item));
  return values.filter((item) => validTime(item) === null).length;
}

function buildKpis(state: AppState, range: DateRange, now: number): SalesKpis {
  const activeContacts = state.contacts.filter((contact) => contact.stage !== 'sold');
  const periodCalls = state.callEvents.filter((call) => inRange(call.createdAt, range));
  const conversations = periodCalls.filter((call) => call.outcome === 'conversation' || call.outcome === 'appointment').length;
  const appointmentsFromCalls = periodCalls.filter((call) => call.outcome === 'appointment').length;
  const appointments = state.appointments.filter((item) => inRange(item.startsAt, range)).length;
  const openFollowUps = state.followUps.filter((item) => item.status === 'open' && validTime(item.dueAt) !== null);
  const contactPauses = activeContacts
    .map((contact) => latestActivityAt(state, contact))
    .filter((item): item is number => item !== null)
    .map((timestamp) => Math.max(0, (now - timestamp) / DAY));
  const highPriorityUntouched = activeContacts.filter((contact) => {
    if (contact.priority !== 'high' && contact.potential < 80) return false;
    const latest = latestActivityAt(state, contact);
    return latest === null || now - latest > 14 * DAY;
  }).length;
  const valuationContactIds = new Set(
    state.properties
      .filter((property) => property.status === 'Bewertung' && property.ownerContactId)
      .map((property) => property.ownerContactId),
  );
  const valuationOpportunities = activeContacts.filter((contact) => contact.role === 'Eigentümer' && (
    valuationContactIds.has(contact.id) || contact.stage === 'qualified' || contact.stage === 'appointment'
  )).length;
  const quality = state.contacts.length > 0
    ? state.contacts.reduce((sum, contact) => sum + contactDataQuality(contact), 0) / state.contacts.length
    : 0;

  return {
    activeContacts: activeContacts.length,
    newContacts: state.contacts.filter((contact) => inRange(contact.createdAt, range)).length,
    ownerContacts: activeContacts.filter((contact) => contact.role === 'Eigentümer').length,
    openFollowUps: openFollowUps.length,
    overdueFollowUps: openFollowUps.filter((item) => (validTime(item.dueAt) ?? now) < now).length,
    calls: periodCalls.length,
    conversations,
    conversationRate: ratio(conversations, periodCalls.length),
    appointments,
    appointmentRate: ratio(appointmentsFromCalls, conversations),
    valuationOpportunities,
    activeProperties: state.properties.filter((property) => property.status !== 'Verkauft').length,
    contactsWithoutNextAction: activeContacts.filter((contact) => !hasNextAction(state, contact, now)).length,
    highPriorityUntouched,
    averageContactPauseDays: contactPauses.length > 0
      ? round(contactPauses.reduce((sum, value) => sum + value, 0) / contactPauses.length, 1)
      : null,
    contactsMissingContactHistory: activeContacts.length - contactPauses.length,
    dataQualityPercent: round(quality * 100),
    mandateContacts: state.contacts.filter((contact) => contact.stage === 'mandate').length,
    soldContacts: state.contacts.filter((contact) => contact.stage === 'sold').length,
  };
}

function buildFunnel(state: AppState, now: number): FunnelStageAnalysis[] {
  return STAGES.map((stage) => {
    const contacts = state.contacts.filter((contact) => contact.stage === stage);
    const dwellValues = contacts
      .map((contact) => currentStageEnteredAt(contact, state.auditEvents))
      .filter((item): item is number => item !== null)
      .map((timestamp) => Math.max(0, (now - timestamp) / DAY));
    const stalledCount = contacts.filter((contact) => {
      if (stage === 'sold') return false;
      const latest = latestActivityAt(state, contact)
        ?? currentStageEnteredAt(contact, state.auditEvents)
        ?? validTime(contact.createdAt);
      return latest === null || now - latest > STALL_THRESHOLDS[stage] * DAY;
    }).length;
    const withoutNextAction = contacts.filter((contact) => stage !== 'sold' && !hasNextAction(state, contact, now)).length;
    const documentedEntries = stage === 'lead'
      ? null
      : new Set(state.auditEvents
        .filter((event) => event.entity === 'contact'
          && event.action === 'stage_changed'
          && event.summary.toLowerCase().includes(stage))
        .map((event) => event.entityId)
        .filter(Boolean)).size;
    const bottleneckRatio = contacts.length > 0 ? Math.max(stalledCount, withoutNextAction) / contacts.length : 0;
    return {
      id: stage,
      label: STAGE_LABELS[stage],
      count: contacts.length,
      documentedEntries,
      stalledCount,
      withoutNextAction,
      averageDwellDays: dwellValues.length > 0
        ? round(dwellValues.reduce((sum, value) => sum + value, 0) / dwellValues.length, 1)
        : null,
      dwellCoverage: contacts.length > 0 ? round((dwellValues.length / contacts.length) * 100) : 0,
      bottleneck: bottleneckRatio >= 0.5 && contacts.length > 0
        ? 'critical'
        : bottleneckRatio >= 0.25
          ? 'watch'
          : 'none',
      nextMeasure: NEXT_MEASURES[stage],
    };
  });
}

function buildForecastItem(state: AppState, property: Property, now: number): ForecastItem | null {
  if (property.status === 'Verkauft' || !Number.isFinite(property.estimatedValue) || property.estimatedValue <= 0) return null;
  const contact = property.ownerContactId
    ? state.contacts.find((item) => item.id === property.ownerContactId)
    : undefined;
  const activeFollowUp = contact
    ? state.followUps.some((item) => item.contactId === contact.id && item.status === 'open' && validTime(item.dueAt) !== null)
    : false;
  const futureAppointment = contact
    ? state.appointments.some((item) => item.contactId === contact.id && (validTime(item.startsAt) ?? 0) >= now)
    : false;
  const latest = contact ? latestActivityAt(state, contact) : null;
  const recentActivity = latest !== null && now - latest <= 30 * DAY;
  const contactable = Boolean(contact && (contact.phone.trim() || contact.email?.trim()));
  const evidence = [Boolean(contact), activeFollowUp, futureAppointment, recentActivity, contactable];
  const evidenceCoverage = evidence.filter(Boolean).length / evidence.length;
  const stageMaturity = contact ? STAGE_MATURITY[contact.stage] : 0.1;
  const propertyMaturity = PROPERTY_MATURITY[property.status];
  const orientationFactor = round(Math.min(stageMaturity, propertyMaturity) * evidenceCoverage, 3);
  const weightedValue = Math.round(property.estimatedValue * orientationFactor);
  const missingFactors: string[] = [];
  const actions: string[] = [];
  if (!contact) {
    missingFactors.push('Keine belastbare Eigentümerverknüpfung');
    actions.push('Eigentümer eindeutig mit der Immobilie verknüpfen.');
  }
  if (!activeFollowUp) {
    missingFactors.push('Kein offenes Follow-up');
    actions.push('Konkretes Follow-up mit Termin und Kanal anlegen.');
  }
  if (!futureAppointment) {
    missingFactors.push('Kein bevorstehender Termin');
    actions.push('Nächsten qualifizierenden Termin vereinbaren.');
  }
  if (!recentActivity) {
    missingFactors.push('Keine belegte Aktivität in den letzten 30 Tagen');
    actions.push('Kontaktstatus aktualisieren und Gespräch dokumentieren.');
  }
  if (!contactable) {
    missingFactors.push('Kein belastbarer Kontaktkanal');
    actions.push('Telefonnummer oder E-Mail ergänzen.');
  }
  const usedData = [
    `Arbeitswert: ${property.estimatedValue}`,
    `Objektstatus: ${property.status}`,
    `Pipeline-Stufe: ${contact?.stage ?? 'nicht verknüpft'}`,
    `Belegabdeckung: ${Math.round(evidenceCoverage * 100)} %`,
  ];
  return {
    id: property.id,
    propertyId: property.id,
    contactId: contact?.id,
    title: property.title,
    contactName: contact ? `${contact.firstName} ${contact.lastName}` : 'Eigentümer nicht verknüpft',
    stage: contact?.stage ?? 'unlinked',
    propertyStatus: property.status,
    workValue: property.estimatedValue,
    orientationFactor,
    weightedValue,
    evidenceCoverage: round(evidenceCoverage, 2),
    formula: `Arbeitswert × min(Pipeline-Reife ${stageMaturity}, Objekt-Reife ${propertyMaturity}) × Belegabdeckung ${round(evidenceCoverage, 2)}`,
    usedData,
    missingFactors,
    uncertainty: evidenceCoverage >= 0.8 && contact?.stage === 'mandate'
      ? 'niedrig'
      : evidenceCoverage >= 0.6
        ? 'mittel'
        : 'hoch',
    actions: [...new Set(actions)].slice(0, 3),
  };
}

function buildForecast(state: AppState, now: number): ForecastSummary {
  const activePositiveProperties = state.properties.filter((property) => property.status !== 'Verkauft'
    && Number.isFinite(property.estimatedValue)
    && property.estimatedValue > 0);
  const items = activePositiveProperties
    .map((property) => buildForecastItem(state, property, now))
    .filter((item): item is ForecastItem => item !== null)
    .sort((left, right) => right.weightedValue - left.weightedValue || left.id.localeCompare(right.id));
  const ownerIdsWithPositiveProperty = new Set(activePositiveProperties
    .map((property) => property.ownerContactId)
    .filter(Boolean));
  const possibleChanceCount = state.contacts.filter((contact) => contact.role === 'Eigentümer'
    && contact.stage !== 'sold'
    && !ownerIdsWithPositiveProperty.has(contact.id)
    && (contact.stage !== 'lead' || contact.potential >= 70)).length;
  const insufficientDataCount = state.contacts.filter((contact) => contact.role === 'Eigentümer'
    && contact.stage !== 'sold'
    && ((!contact.phone.trim() && !contact.email?.trim()) || !hasNextAction(state, contact, now))).length;
  const invalidValueCount = state.properties.filter((property) => property.status !== 'Verkauft'
    && (!Number.isFinite(property.estimatedValue) || property.estimatedValue <= 0)).length;
  const securedPipelineValue = activePositiveProperties.reduce((sum, property) => sum + property.estimatedValue, 0);
  const weightedOrientationValue = items.reduce((sum, item) => sum + item.weightedValue, 0);
  const qualifiedLowerBound = items
    .filter((item) => item.evidenceCoverage >= 0.8 && (item.stage === 'appointment' || item.stage === 'mandate'))
    .reduce((sum, item) => sum + item.weightedValue, 0);
  return {
    securedPipelineValue,
    weightedOrientationValue,
    qualifiedLowerBound,
    opportunityUpperBound: securedPipelineValue,
    activePropertyCount: activePositiveProperties.length,
    possibleChanceCount,
    insufficientDataCount,
    invalidValueCount,
    items,
    methodology: [
      'Sicher vorhandene Pipeline = Summe positiver Arbeitswerte aktiver Immobilien. Sie ist kein Umsatzversprechen.',
      'Gewichtete Orientierung = Arbeitswert × konservativer Reifegradfaktor × belegte Datensignale.',
      'Die Reifegradfaktoren sind transparente Steuerungsregeln, keine Abschlusswahrscheinlichkeiten.',
      'Der untere Korridor enthält nur belegstarke Termin- und Mandatschancen; die Obergrenze ist der ungewichtete aktive Arbeitswert.',
    ],
  };
}

function buildRisks(kpis: SalesKpis, funnel: FunnelStageAnalysis[], forecast: ForecastSummary) {
  const risks: string[] = [];
  if (kpis.overdueFollowUps > 0) risks.push(`${kpis.overdueFollowUps} Follow-up${kpis.overdueFollowUps === 1 ? '' : 's'} sind überfällig.`);
  if (kpis.contactsWithoutNextAction > 0) risks.push(`${kpis.contactsWithoutNextAction} aktive Kontakte besitzen keine belastbare nächste Aktion.`);
  if (kpis.highPriorityUntouched > 0) risks.push(`${kpis.highPriorityUntouched} hoch priorisierte Kontakte wurden seit mindestens 14 Tagen nicht belegt bearbeitet.`);
  funnel
    .filter((stage) => stage.bottleneck === 'critical')
    .forEach((stage) => risks.push(`Kritischer Engpass in „${stage.label}“: ${Math.max(stage.stalledCount, stage.withoutNextAction)} von ${stage.count} Kontakten benötigen Steuerung.`));
  if (forecast.invalidValueCount > 0) risks.push(`${forecast.invalidValueCount} aktive Immobilien besitzen keinen positiven, verwertbaren Arbeitswert.`);
  if (forecast.insufficientDataCount > 0) risks.push(`${forecast.insufficientDataCount} Eigentümerkontakte sind für einen belastbaren Forecast nicht ausreichend qualifiziert.`);
  return risks.length > 0 ? risks : ['Keine kritische Regelverletzung im aktuellen Datenstand erkannt.'];
}

function buildRecommendations(kpis: SalesKpis, funnel: FunnelStageAnalysis[], forecast: ForecastSummary) {
  const recommendations: string[] = [];
  if (kpis.overdueFollowUps > 0) recommendations.push('Überfällige Follow-ups zuerst abarbeiten und jedes Ergebnis dokumentieren.');
  if (kpis.contactsWithoutNextAction > 0) recommendations.push('Für Kontakte ohne nächste Aktion einen konkreten Termin, Kanal und Zweck festlegen.');
  const weakest = [...funnel]
    .filter((stage) => stage.count > 0 && stage.id !== 'sold')
    .sort((left, right) => {
      const leftGap = Math.max(left.stalledCount, left.withoutNextAction) / left.count;
      const rightGap = Math.max(right.stalledCount, right.withoutNextAction) / right.count;
      return rightGap - leftGap || STAGES.indexOf(left.id) - STAGES.indexOf(right.id);
    })[0];
  if (weakest) recommendations.push(`${weakest.label}: ${weakest.nextMeasure}`);
  const topImprovement = forecast.items.find((item) => item.actions.length > 0);
  if (topImprovement) recommendations.push(`${topImprovement.title}: ${topImprovement.actions[0]}`);
  if (kpis.dataQualityPercent < 80) recommendations.push('Kontaktkanäle, Quellen und Pipeline-Angaben vervollständigen, bevor Forecast-Werte interpretiert werden.');
  return [...new Set(recommendations)].slice(0, 5);
}

export function buildSalesControlSnapshot(state: AppState, now: number, period: AnalyticsPeriod): SalesControlSnapshot {
  const ranges = getAnalyticsRange(period, now);
  const current = buildKpis(state, ranges.current, now);
  const previous = buildKpis(state, ranges.previous, ranges.current.start);
  const previousEvidence = state.contacts.some((item) => inRange(item.createdAt, ranges.previous))
    || state.callEvents.some((item) => inRange(item.createdAt, ranges.previous))
    || state.appointments.some((item) => inRange(item.startsAt, ranges.previous));
  const funnel = buildFunnel(state, now);
  const forecast = buildForecast(state, now);
  const invalidDateCount = countInvalidDates(state);
  const historicalWarnings: string[] = [];
  if (!previousEvidence) historicalWarnings.push('Für den vorherigen Vergleichszeitraum liegen keine auswertbaren historischen Aktivitätsdaten vor.');
  if (!state.auditEvents.some((event) => event.action === 'stage_changed')) historicalWarnings.push('Pipeline-Übergänge und Verweildauern sind nur teilweise rekonstruierbar, weil Stufenwechsel-Historie fehlt.');
  if (invalidDateCount > 0) historicalWarnings.push(`${invalidDateCount} ungültige Zeitangabe${invalidDateCount === 1 ? '' : 'n'} wurde${invalidDateCount === 1 ? '' : 'n'} von Zeitberechnungen ausgeschlossen.`);
  const previousValue = (value: number) => previousEvidence ? value : null;
  const currentConversationRate = current.conversationRate ?? 0;
  const previousConversationRate = previous.conversationRate;
  const currentAppointmentRate = current.appointmentRate ?? 0;
  const previousAppointmentRate = previous.appointmentRate;
  return {
    generatedAt: now,
    period: ranges.current,
    previousPeriod: ranges.previous,
    kpis: current,
    comparisons: {
      newContacts: comparison(current.newContacts, previousValue(previous.newContacts)),
      calls: comparison(current.calls, previousValue(previous.calls)),
      conversations: comparison(current.conversations, previousValue(previous.conversations)),
      appointments: comparison(current.appointments, previousValue(previous.appointments)),
      conversationRate: comparison(
        currentConversationRate,
        previousEvidence && previousConversationRate !== null ? previousConversationRate : null,
        'Quote aus dokumentierten Telefonereignissen.',
      ),
      appointmentRate: comparison(
        currentAppointmentRate,
        previousEvidence && previousAppointmentRate !== null ? previousAppointmentRate : null,
        'Quote aus dokumentierten Gesprächen mit Termin-Ergebnis.',
      ),
    },
    funnel,
    forecast,
    pipelineDistribution: Object.fromEntries(STAGES.map((stage) => [
      stage,
      state.contacts.filter((contact) => contact.stage === stage).length,
    ])) as Record<ContactStage, number>,
    risks: buildRisks(current, funnel, forecast),
    recommendations: buildRecommendations(current, funnel, forecast),
    historicalWarnings,
    invalidDateCount,
  };
}

function positiveRate(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 1;
}

function safeCeil(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
}

export function calculateSalesScenario(input: ScenarioInput): ScenarioRequirement {
  const issues: string[] = [];
  const monthlyRevenueGoal = input.monthlyGoal > 0
    ? input.monthlyGoal
    : input.annualGoal > 0
      ? input.annualGoal / 12
      : 0;
  if (monthlyRevenueGoal <= 0) issues.push('Jahres- oder Monatsziel muss positiv sein.');
  if (!Number.isFinite(input.averagePropertyValue) || input.averagePropertyValue <= 0) issues.push('Durchschnittlicher Objektwert muss positiv sein.');
  if (!positiveRate(input.effectiveCommissionRate)) issues.push('Effektiver Provisionsanteil muss zwischen 0 und 100 Prozent liegen.');
  const rateFields: Array<[number, string]> = [
    [input.contactToConversationRate, 'Kontakt-zu-Gespräch-Quote'],
    [input.conversationToAppointmentRate, 'Gespräch-zu-Termin-Quote'],
    [input.appointmentToMandateRate, 'Termin-zu-Mandat-Quote'],
    [input.mandateToSaleRate, 'Mandat-zu-Abschluss-Quote'],
  ];
  rateFields.forEach(([value, label]) => {
    if (!positiveRate(value)) issues.push(`${label} muss zwischen 0 und 100 Prozent liegen.`);
  });
  if (!Number.isFinite(input.availableWorkDays) || input.availableWorkDays <= 0) issues.push('Verfügbare Arbeitstage müssen positiv sein.');
  const revenuePerClosing = input.averagePropertyValue * input.effectiveCommissionRate;
  if (issues.length > 0 || revenuePerClosing <= 0) {
    return {
      monthlyRevenueGoal,
      revenuePerClosing: Math.max(0, revenuePerClosing || 0),
      closings: 0,
      mandates: 0,
      appointments: 0,
      conversations: 0,
      contacts: 0,
      daily: { contacts: 0, conversations: 0, appointments: 0, mandates: 0 },
      weekly: { contacts: 0, conversations: 0, appointments: 0, mandates: 0 },
      formulas: [],
      issues,
    };
  }
  const closings = safeCeil(monthlyRevenueGoal / revenuePerClosing);
  const mandates = safeCeil(closings / input.mandateToSaleRate);
  const appointments = safeCeil(mandates / input.appointmentToMandateRate);
  const conversations = safeCeil(appointments / input.conversationToAppointmentRate);
  const contacts = safeCeil(conversations / input.contactToConversationRate);
  const perDay = (value: number) => round(value / input.availableWorkDays, 1);
  return {
    monthlyRevenueGoal,
    revenuePerClosing,
    closings,
    mandates,
    appointments,
    conversations,
    contacts,
    daily: {
      contacts: perDay(contacts),
      conversations: perDay(conversations),
      appointments: perDay(appointments),
      mandates: perDay(mandates),
    },
    weekly: {
      contacts: round(perDay(contacts) * 5, 1),
      conversations: round(perDay(conversations) * 5, 1),
      appointments: round(perDay(appointments) * 5, 1),
      mandates: round(perDay(mandates) * 5, 1),
    },
    formulas: [
      'Monatsziel = eingegebenes Monatsziel oder Jahresziel ÷ 12.',
      'Erlös je Abschluss = durchschnittlicher Objektwert × effektiver Provisionsanteil.',
      'Benötigte Abschlüsse = Monatsziel ÷ Erlös je Abschluss, jeweils aufgerundet.',
      'Vorstufen = Ziel der Folgestufe ÷ jeweilige angenommene Übergangsquote, jeweils aufgerundet.',
      'Tagesaktivität = Monatsbedarf ÷ verfügbare Arbeitstage; Wochenaktivität = Tagesaktivität × 5.',
    ],
    issues,
  };
}
