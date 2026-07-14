import type { AppState, Appointment, UserRole } from '../../types/domain';
import { buildOpportunity } from './opportunity';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER,
  type MandateOpportunity,
  type PipelineCapabilities,
  type PipelineCockpitModel,
  type PipelineHealth,
  type PipelineStageHealth,
} from './model';
import {
  getUpcomingAppointments,
  groupByContact,
  groupPropertiesByOwner,
  parseTimestamp,
  uniqueById,
} from './utils';

export type {
  MandateOpportunity,
  PipelineCapabilities,
  PipelineCockpitModel,
  PipelineHealth,
  PipelineRiskKey,
  PipelineStageDefinition,
  PipelineStageHealth,
  PipelineViewStage,
} from './model';
export { PIPELINE_STAGES } from './model';

function compareOpportunities(left: MandateOpportunity, right: MandateOpportunity): number {
  if (left.actionValue !== right.actionValue) return right.actionValue - left.actionValue;
  if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;
  const leftNext = parseTimestamp(left.nextActionAt) ?? Number.POSITIVE_INFINITY;
  const rightNext = parseTimestamp(right.nextActionAt) ?? Number.POSITIVE_INFINITY;
  if (leftNext !== rightNext) return leftNext - rightNext;
  if (left.contact.potential !== right.contact.potential) return right.contact.potential - left.contact.potential;
  const leftStage = PIPELINE_STAGE_ORDER.get(left.stage) ?? 99;
  const rightStage = PIPELINE_STAGE_ORDER.get(right.stage) ?? 99;
  if (leftStage !== rightStage) return rightStage - leftStage;
  const leftName = `${left.contact.lastName} ${left.contact.firstName}`;
  const rightName = `${right.contact.lastName} ${right.contact.firstName}`;
  const nameOrder = leftName.localeCompare(rightName, 'de');
  return nameOrder !== 0 ? nameOrder : left.contact.id.localeCompare(right.contact.id);
}

function buildRelationshipErrors(state: AppState): string[] {
  const contactIds = new Set(state.contacts.map((contact) => contact.id));
  const errors: string[] = [];
  for (const followUp of state.followUps) {
    if (!contactIds.has(followUp.contactId)) errors.push(`Follow-up „${followUp.title}“ verweist auf einen fehlenden Kontakt.`);
  }
  for (const call of state.callEvents) {
    if (!contactIds.has(call.contactId)) errors.push(`Telefonereignis ${call.id} verweist auf einen fehlenden Kontakt.`);
  }
  for (const appointment of state.appointments) {
    if (appointment.contactId && !contactIds.has(appointment.contactId)) errors.push(`Termin „${appointment.title}“ verweist auf einen fehlenden Kontakt.`);
  }
  for (const property of state.properties) {
    if (property.ownerContactId && !contactIds.has(property.ownerContactId)) errors.push(`Immobilie „${property.title}“ besitzt eine fehlerhafte Eigentümerbeziehung.`);
  }
  return [...new Set(errors)].sort((left, right) => left.localeCompare(right, 'de'));
}

function buildHealth(
  state: AppState,
  opportunities: MandateOpportunity[],
  relationshipErrors: string[],
  now: number,
): PipelineHealth {
  const stages = PIPELINE_STAGES.map((definition) => {
    const entries = opportunities.filter((opportunity) => opportunity.stage === definition.id);
    const inactivityValues = entries
      .map((opportunity) => opportunity.observedInactivityDays)
      .filter((value): value is number => value !== undefined);
    return {
      stage: definition.id,
      label: definition.label,
      count: entries.length,
      knownPropertyValue: entries.reduce((sum, opportunity) => sum + opportunity.properties.reduce((propertySum, property) => propertySum + Math.max(0, property.estimatedValue || 0), 0), 0),
      contactsWithoutProgress: entries.filter((opportunity) => opportunity.riskKeys.includes('stagnant')).length,
      contactsWithoutNextAction: entries.filter((opportunity) => opportunity.riskKeys.includes('no_next_action')).length,
      overdueOpportunities: entries.filter((opportunity) => opportunity.isOverdue).length,
      averageObservedInactivityDays: inactivityValues.length > 0
        ? Math.round(inactivityValues.reduce((sum, value) => sum + value, 0) / inactivityValues.length)
        : undefined,
      averageDwellDays: undefined,
      dwellDataAvailable: false,
    } satisfies PipelineStageHealth;
  });

  const early = opportunities.filter((opportunity) => opportunity.stage === 'lead' || opportunity.stage === 'qualified').length;
  const advanced = opportunities.filter((opportunity) => opportunity.stage === 'appointment' || opportunity.stage === 'mandate').length;
  const earlyToAdvancedRatio = advanced > 0 ? Number((early / advanced).toFixed(2)) : undefined;
  const active = opportunities.filter((opportunity) => opportunity.stage !== 'sold' && opportunity.stage !== 'inactive');
  const withoutNext = active.filter((opportunity) => opportunity.riskKeys.includes('no_next_action')).length;
  const stagnant = active.filter((opportunity) => opportunity.riskKeys.includes('stagnant')).length;
  const appointmentPrep = active.filter((opportunity) => opportunity.riskKeys.includes('appointment_without_preparation')).length;
  const valuationGaps = active.filter((opportunity) => opportunity.riskKeys.includes('valuation_without_followup')).length;
  const bottlenecks: string[] = [];

  if (active.length > 0 && withoutNext / active.length >= 0.25) bottlenecks.push(`${withoutNext} aktive Chancen besitzen keine nächste Aktion.`);
  if (stagnant > 0) bottlenecks.push(`${stagnant} Chancen stagnieren nach transparenten Inaktivitätsschwellen.`);
  if (appointmentPrep > 0) bottlenecks.push(`${appointmentPrep} kurzfristige Termine besitzen keine erkennbare Vorbereitung.`);
  if (valuationGaps > 0) bottlenecks.push(`${valuationGaps} Bewertungschancen besitzen keine Nachfassaktion.`);
  if (advanced === 0 && early >= 3) bottlenecks.push('Die Pipeline enthält frühe Chancen, aber keine fortgeschrittene Termin- oder Mandatsstufe.');
  else if (earlyToAdvancedRatio !== undefined && earlyToAdvancedRatio >= 3) bottlenecks.push(`Das Verhältnis früher zu fortgeschrittenen Stufen liegt bei ${earlyToAdvancedRatio}:1.`);
  if (relationshipErrors.length > 0) bottlenecks.push(`${relationshipErrors.length} fehlerhafte Beziehungen begrenzen die Auswertbarkeit.`);

  return {
    totalContacts: uniqueById(state.contacts).length,
    activeOpportunities: active.length,
    knownPropertyValue: uniqueById(state.properties).reduce((sum, property) => sum + Math.max(0, property.estimatedValue || 0), 0),
    stages,
    contactsWithoutProgress: stagnant,
    opportunitiesWithoutNextAction: withoutNext,
    overdueOpportunities: active.filter((opportunity) => opportunity.isOverdue).length,
    upcomingAppointments: active.filter((opportunity) => getUpcomingAppointments(opportunity.appointments, now).length > 0).length,
    earlyToAdvancedRatio,
    bottlenecks,
    relationshipErrors,
    limitations: [
      'Historische Pipeline-Übergänge sind nicht gespeichert. Eine echte durchschnittliche Verweildauer oder Verlustquote je Stufe wird deshalb nicht berechnet.',
      'Der Handlungswert ist ein transparenter Priorisierungswert aus vorhandenen Signalen und keine Abschlusswahrscheinlichkeit.',
      'Bekannte Objektwerte werden nur aus vorhandenen estimatedValue-Feldern summiert; fehlende oder unklare Werte werden nicht ergänzt.',
    ],
  };
}

export function buildPipelineCockpit(state: AppState, now = Date.now()): PipelineCockpitModel {
  const contacts = uniqueById(state.contacts);
  const followUps = uniqueById(state.followUps);
  const calls = uniqueById(state.callEvents);
  const properties = uniqueById(state.properties);
  const appointments = uniqueById(state.appointments);
  const callsByContact = groupByContact(calls);
  const followUpsByContact = groupByContact(followUps);
  const propertiesByOwner = groupPropertiesByOwner(properties);
  const appointmentsByContact = groupByContact(
    appointments.filter((appointment): appointment is Appointment & { contactId: string } => Boolean(appointment.contactId)),
  );
  const normalizedState = { ...state, contacts, followUps, callEvents: calls, properties, appointments };
  const opportunities = contacts
    .map((contact) => buildOpportunity(contact, now, callsByContact, followUpsByContact, propertiesByOwner, appointmentsByContact))
    .sort(compareOpportunities);
  const relationshipErrors = buildRelationshipErrors(normalizedState);
  const focusOpportunities = opportunities
    .filter((opportunity) => opportunity.stage !== 'sold' && opportunity.stage !== 'inactive')
    .filter((opportunity) => opportunity.actionValue > 0 || opportunity.risks.length > 0)
    .slice(0, 5);

  return {
    generatedAt: new Date(now).toISOString(),
    stages: PIPELINE_STAGES,
    opportunities,
    focusOpportunities,
    health: buildHealth(normalizedState, opportunities, relationshipErrors, now),
  };
}

export function getPipelineCapabilities(role: UserRole): PipelineCapabilities {
  const writable = role !== 'viewer';
  return {
    canMovePipeline: writable,
    canManageFollowUps: writable,
    canLogCalls: writable,
    readOnly: !writable,
  };
}
