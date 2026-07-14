import type { Appointment, CallEvent, Contact, ContactStage, FollowUp, Property } from '../../types/domain';
import { fallbackTerritorySegment, getTerritoryDefinition, territoryDefinitions } from './territoryConfig';
import type {
  MarketDataStatus,
  TerritoryInsight,
  TerritoryMetrics,
  TerritoryScoreFactor,
} from './territoryTypes';

const pipelineStages: readonly ContactStage[] = ['lead', 'qualified', 'appointment', 'mandate', 'sold'];
const supportedNames = new Set(territoryDefinitions.map((territory) => territory.name));
const unassignedTerritory = 'Nicht zugeordnet';

export interface TerritoryAnalyticsInput {
  contacts: Contact[];
  followUps: FollowUp[];
  properties: Property[];
  appointments: Appointment[];
  callEvents: CallEvent[];
  now?: Date;
  marketDataByTerritory?: Record<string, MarketDataStatus | undefined>;
}

function validDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function territoryName(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || unassignedTerritory;
}

function isOverdue(followUp: FollowUp, now: Date) {
  const dueAt = validDate(followUp.dueAt);
  return followUp.status === 'open' && Boolean(dueAt && dueAt.getTime() < now.getTime());
}

function isFuture(value: string | undefined, now: Date) {
  const date = validDate(value);
  return Boolean(date && date.getTime() >= now.getTime());
}

function hasOpenNextAction(contact: Contact, followUps: FollowUp[], now: Date) {
  return followUps.some((followUp) => followUp.contactId === contact.id && followUp.status === 'open')
    || isFuture(contact.nextActionAt, now);
}

function isActiveContact(contact: Contact, followUps: FollowUp[], appointments: Appointment[], now: Date) {
  if (contact.stage === 'sold') return false;
  const lastContact = validDate(contact.lastContactAt);
  const contactedRecently = Boolean(lastContact && now.getTime() - lastContact.getTime() <= 90 * 86_400_000);
  const hasOpenFollowUp = followUps.some((followUp) => followUp.contactId === contact.id && followUp.status === 'open');
  const hasUpcomingAppointment = appointments.some((appointment) => (
    appointment.contactId === contact.id && isFuture(appointment.startsAt, now)
  ));
  return contactedRecently || hasOpenFollowUp || hasUpcomingAppointment || isFuture(contact.nextActionAt, now);
}

function calculateOperationalDataQuality(
  contacts: Contact[],
  properties: Property[],
  contactIds: Set<string>,
) {
  let earned = 0;
  let possible = 0;

  contacts.forEach((contact) => {
    possible += 5;
    earned += contact.city.trim() ? 1 : 0;
    earned += contact.phone.trim() || contact.email?.trim() ? 1 : 0;
    earned += contact.source.trim() ? 1 : 0;
    earned += validDate(contact.createdAt) ? 1 : 0;
    earned += validDate(contact.lastContactAt) || validDate(contact.nextActionAt) ? 1 : 0;
  });

  properties.forEach((property) => {
    possible += 5;
    earned += property.city.trim() ? 1 : 0;
    earned += property.address.trim() ? 1 : 0;
    earned += property.type.trim() ? 1 : 0;
    earned += property.estimatedValue > 0 ? 1 : 0;
    earned += !property.ownerContactId || contactIds.has(property.ownerContactId) ? 1 : 0;
  });

  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
}

function latestActivity(
  contacts: Contact[],
  appointments: Appointment[],
  callEvents: CallEvent[],
  now: Date,
) {
  const contactIds = new Set(contacts.map((contact) => contact.id));
  const candidates: Date[] = [];

  contacts.forEach((contact) => {
    const lastContact = validDate(contact.lastContactAt);
    if (lastContact && lastContact.getTime() <= now.getTime()) candidates.push(lastContact);
  });

  callEvents.forEach((event) => {
    if (!contactIds.has(event.contactId)) return;
    const createdAt = validDate(event.createdAt);
    if (createdAt && createdAt.getTime() <= now.getTime()) candidates.push(createdAt);
  });

  appointments.forEach((appointment) => {
    if (!appointment.contactId || !contactIds.has(appointment.contactId)) return;
    const startsAt = validDate(appointment.startsAt);
    if (startsAt && startsAt.getTime() <= now.getTime()) candidates.push(startsAt);
  });

  if (!candidates.length) return {};
  const latest = candidates.sort((left, right) => right.getTime() - left.getTime())[0];
  return {
    lastActivityAt: latest.toISOString(),
    daysSinceActivity: Math.max(0, Math.floor((now.getTime() - latest.getTime()) / 86_400_000)),
  };
}

function normalizePoints(value: number, maximumValue: number, maximumPoints: number) {
  if (value <= 0 || maximumValue <= 0) return 0;
  return Math.round((value / maximumValue) * maximumPoints);
}

function priorityLevel(score: number): TerritoryInsight['priorityLevel'] {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function inactivityPoints(metrics: TerritoryMetrics) {
  const hasOperationalData = metrics.contacts > 0 || metrics.activeProperties > 0;
  if (!hasOperationalData) return 0;
  if (metrics.daysSinceActivity === undefined) return 7;
  if (metrics.daysSinceActivity >= 60) return 7;
  if (metrics.daysSinceActivity >= 30) return 5;
  if (metrics.daysSinceActivity >= 14) return 3;
  return 0;
}

function marketDataPoints(status: MarketDataStatus) {
  if (status.quality === 'verified') return 5;
  if (status.quality === 'partial') return 3;
  return 0;
}

function recommendedActions(metrics: TerritoryMetrics) {
  const actions: string[] = [];
  if (metrics.overdueFollowUps > 0) actions.push('Überfällige Follow-ups zuerst abarbeiten');
  if (metrics.ownerContactsWithoutNextAction > 0) actions.push('Eigentümer ohne nächste Aktion qualifizieren');
  if (metrics.activeProperties > 0) actions.push('Objektbezogene Nachbarschafts- oder Empfehlungsaktion prüfen');
  if ((metrics.daysSinceActivity ?? 0) >= 30 && metrics.contacts > 0) actions.push('Reaktivierungsblock für bestehende Kontakte einplanen');
  if (metrics.networkContacts > 0) actions.push('Lokale Netzwerkpflege mit konkretem Gesprächsanlass terminieren');
  if (actions.length === 0 && metrics.contacts === 0 && metrics.activeProperties === 0) {
    actions.push('Zuerst Datenbasis und vorhandene Beziehungen prüfen; keine Kampagne ableiten');
  }
  if (actions.length === 0) actions.push('Bestehende Kontakte prüfen und nächsten sinnvollen Schritt festlegen');
  return actions.slice(0, 4);
}

function territoryRisks(metrics: TerritoryMetrics, supported: boolean) {
  const risks: string[] = [];
  if (!supported) risks.push('Gebiet ist nicht Bestandteil der konfigurierten MKK-Segmentierung.');
  if (metrics.marketData.quality === 'missing') risks.push('Keine verifizierte Marktdatenqualität hinterlegt.');
  if (metrics.operationalDataQuality < 60 && (metrics.contacts > 0 || metrics.activeProperties > 0)) {
    risks.push('Operative Datenqualität ist für eine belastbare Segmentierung zu niedrig.');
  }
  if (metrics.contactsWithoutNextAction > 0) risks.push('Kontakte ohne dokumentierte nächste Aktion können verloren gehen.');
  if (metrics.overdueFollowUps > 0) risks.push('Überfällige Aufgaben erhöhen das Bearbeitungsrisiko.');
  return risks;
}

function createPipelineDistribution(contacts: Contact[]) {
  return pipelineStages.reduce<Record<ContactStage, number>>((distribution, stage) => {
    distribution[stage] = contacts.filter((contact) => contact.stage === stage).length;
    return distribution;
  }, { lead: 0, qualified: 0, appointment: 0, mandate: 0, sold: 0 });
}

function buildMetrics(
  name: string,
  input: TerritoryAnalyticsInput,
  now: Date,
): TerritoryMetrics {
  const contacts = input.contacts.filter((contact) => territoryName(contact.city) === name);
  const contactIds = new Set(contacts.map((contact) => contact.id));
  const properties = input.properties.filter((property) => territoryName(property.city) === name);
  const followUps = input.followUps.filter((followUp) => contactIds.has(followUp.contactId));
  const appointments = input.appointments.filter((appointment) => (
    Boolean(appointment.contactId) && contactIds.has(appointment.contactId as string)
  ));
  const ownerContacts = contacts.filter((contact) => contact.role === 'Eigentümer');
  const activeProperties = properties.filter((property) => property.status !== 'Verkauft');
  const contactsWithoutNextAction = contacts.filter((contact) => (
    contact.stage !== 'sold' && !hasOpenNextAction(contact, followUps, now)
  ));
  const ownerContactsWithoutNextAction = ownerContacts.filter((contact) => (
    contact.stage !== 'sold' && !hasOpenNextAction(contact, followUps, now)
  ));
  const valuationOwnerIds = new Set(
    properties
      .filter((property) => property.status === 'Bewertung' && property.ownerContactId)
      .map((property) => property.ownerContactId as string),
  );
  ownerContacts
    .filter((contact) => contact.stage === 'qualified' || contact.stage === 'appointment')
    .forEach((contact) => valuationOwnerIds.add(contact.id));
  const unassignedValuations = properties.filter((property) => (
    property.status === 'Bewertung' && !property.ownerContactId
  )).length;
  const marketData = input.marketDataByTerritory?.[name] ?? {
    quality: 'missing' as const,
    sourceCount: 0,
    note: 'Für dieses Gebiet wurde keine verifizierte Marktdatenquelle an die Gebietslogik übergeben.',
  };

  return {
    contacts: contacts.length,
    activeContacts: contacts.filter((contact) => isActiveContact(contact, followUps, appointments, now)).length,
    ownerContacts: ownerContacts.length,
    networkContacts: contacts.filter((contact) => contact.role === 'Netzwerk' || contact.role === 'Tippgeber').length,
    soldContacts: contacts.filter((contact) => contact.stage === 'sold').length,
    activeProperties: activeProperties.length,
    valuationOpportunities: valuationOwnerIds.size + unassignedValuations,
    openFollowUps: followUps.filter((followUp) => followUp.status === 'open').length,
    overdueFollowUps: followUps.filter((followUp) => isOverdue(followUp, now)).length,
    activeAppointments: appointments.filter((appointment) => isFuture(appointment.startsAt, now)).length,
    contactsWithoutNextAction: contactsWithoutNextAction.length,
    ownerContactsWithoutNextAction: ownerContactsWithoutNextAction.length,
    ...latestActivity(contacts, appointments, input.callEvents, now),
    pipelineDistribution: createPipelineDistribution(contacts),
    operationalDataQuality: calculateOperationalDataQuality(contacts, properties, contactIds),
    marketData,
  };
}

function buildScoreFactors(
  insightBase: Pick<TerritoryInsight, 'name' | 'supported' | 'metrics'>,
  maxima: {
    activeContacts: number;
    ownerPotential: number;
    unattendedOpportunities: number;
    overdueTasks: number;
    activeProperties: number;
  },
  ownerPotentialValue: number,
): TerritoryScoreFactor[] {
  const definition = getTerritoryDefinition(insightBase.name);
  const metrics = insightBase.metrics;
  const strategyPoints = definition?.strategicWeight ?? 0;
  const unattended = metrics.ownerContactsWithoutNextAction + metrics.valuationOpportunities;
  const inactivePoints = inactivityPoints(metrics);
  const marketPoints = marketDataPoints(metrics.marketData);

  return [
    {
      key: 'strategy',
      label: 'Strategische Gebietskategorie',
      points: strategyPoints,
      maxPoints: 25,
      explanation: definition
        ? `${definition.segment}: konfigurierter strategischer Basiswert ${strategyPoints}/25.`
        : 'Unbekanntes Gebiet: kein strategischer Basiswert vergeben.',
    },
    {
      key: 'activeContacts',
      label: 'Aktive Kontakte',
      points: normalizePoints(metrics.activeContacts, maxima.activeContacts, 15),
      maxPoints: 15,
      explanation: `${metrics.activeContacts} aktive Kontakte im Verhältnis zum höchsten vorhandenen Gebietswert.`,
    },
    {
      key: 'ownerPotential',
      label: 'Eigentümerpotenzial',
      points: normalizePoints(ownerPotentialValue, maxima.ownerPotential, 15),
      maxPoints: 15,
      explanation: `Nur gespeicherte Potenzialwerte aktiver Eigentümerkontakte werden verwendet (${ownerPotentialValue.toFixed(2)} gewichtete Einheiten).`,
    },
    {
      key: 'unattendedOpportunities',
      label: 'Unbearbeitete Chancen',
      points: normalizePoints(unattended, maxima.unattendedOpportunities, 15),
      maxPoints: 15,
      explanation: `${metrics.ownerContactsWithoutNextAction} Eigentümer ohne nächste Aktion und ${metrics.valuationOpportunities} ableitbare Bewertungschancen.`,
    },
    {
      key: 'overdueTasks',
      label: 'Überfällige Aufgaben',
      points: normalizePoints(metrics.overdueFollowUps, maxima.overdueTasks, 10),
      maxPoints: 10,
      explanation: `${metrics.overdueFollowUps} offene Follow-ups sind zum Auswertungszeitpunkt überfällig.`,
    },
    {
      key: 'activeProperties',
      label: 'Vorhandene Immobilien',
      points: normalizePoints(metrics.activeProperties, maxima.activeProperties, 8),
      maxPoints: 8,
      explanation: `${metrics.activeProperties} nicht verkaufte Immobilien sind dem Gebiet zugeordnet.`,
    },
    {
      key: 'inactivity',
      label: 'Fehlende Aktivität',
      points: inactivePoints,
      maxPoints: 7,
      explanation: metrics.contacts === 0 && metrics.activeProperties === 0
        ? 'Ohne operative Bestandsdaten wird keine Aktivitätslücke unterstellt.'
        : metrics.daysSinceActivity === undefined
          ? 'Bestandsdaten vorhanden, aber keine vergangene Aktivität dokumentiert.'
          : `Letzte dokumentierte Aktivität vor ${metrics.daysSinceActivity} Tagen.`,
    },
    {
      key: 'marketData',
      label: 'Marktdatenqualität',
      points: marketPoints,
      maxPoints: 5,
      explanation: metrics.marketData.quality === 'missing'
        ? 'Keine verifizierten Marktdaten übergeben; es werden 0 Punkte vergeben.'
        : `${metrics.marketData.sourceCount} hinterlegte Quellen, Qualitätsstatus ${metrics.marketData.quality}.`,
    },
  ];
}

export function buildTerritoryInsights(input: TerritoryAnalyticsInput): TerritoryInsight[] {
  const now = input.now ?? new Date();
  const territoryNames = new Set(territoryDefinitions.map((territory) => territory.name));
  input.contacts.forEach((contact) => territoryNames.add(territoryName(contact.city)));
  input.properties.forEach((property) => territoryNames.add(territoryName(property.city)));

  const raw = Array.from(territoryNames).map((name) => {
    const metrics = buildMetrics(name, input, now);
    const contacts = input.contacts.filter((contact) => territoryName(contact.city) === name);
    const ownerPotential = contacts
      .filter((contact) => contact.role === 'Eigentümer' && contact.stage !== 'sold')
      .reduce((sum, contact) => sum + clamp(contact.potential) / 100, 0);
    return { name, metrics, ownerPotential };
  });

  const maxima = {
    activeContacts: Math.max(0, ...raw.map((item) => item.metrics.activeContacts)),
    ownerPotential: Math.max(0, ...raw.map((item) => item.ownerPotential)),
    unattendedOpportunities: Math.max(0, ...raw.map((item) => (
      item.metrics.ownerContactsWithoutNextAction + item.metrics.valuationOpportunities
    ))),
    overdueTasks: Math.max(0, ...raw.map((item) => item.metrics.overdueFollowUps)),
    activeProperties: Math.max(0, ...raw.map((item) => item.metrics.activeProperties)),
  };

  return raw.map(({ name, metrics, ownerPotential }) => {
    const definition = getTerritoryDefinition(name);
    const supported = supportedNames.has(name);
    const factors = buildScoreFactors({ name, supported, metrics }, maxima, ownerPotential);
    const score = factors.reduce((sum, factor) => sum + factor.points, 0);
    return {
      name,
      supported,
      segment: definition?.segment ?? fallbackTerritorySegment,
      rationale: definition?.rationale ?? 'Nicht konfiguriertes Gebiet; nur vorhandene operative Daten werden angezeigt.',
      operatingFocus: definition?.operatingFocus ?? 'Manuelle Prüfung vor jeder Gebiets- oder Kampagnenentscheidung.',
      metrics,
      priorityScore: score,
      priorityLevel: priorityLevel(score),
      scoreFactors: factors,
      recommendedActions: recommendedActions(metrics),
      risks: territoryRisks(metrics, supported),
    } satisfies TerritoryInsight;
  }).sort((left, right) => (
    right.priorityScore - left.priorityScore
    || (getTerritoryDefinition(right.name)?.strategicWeight ?? 0) - (getTerritoryDefinition(left.name)?.strategicWeight ?? 0)
    || left.name.localeCompare(right.name, 'de')
  ));
}

export function getUnassignedTerritoryName() {
  return unassignedTerritory;
}
