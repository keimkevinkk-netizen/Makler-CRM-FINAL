import type { Appointment, CallEvent, Contact, FollowUp, Property } from '../../types/domain';
import type { MandateOpportunity, OpportunityFactor, PipelineRiskKey, PipelineViewStage } from './model';
import { PIPELINE_STAGE_LABEL } from './model';
import {
  DAY_MS,
  getKnownObjections,
  getLastActivity,
  getNextOpenFollowUp,
  getUpcomingAppointments,
  getViewStage,
  hasFutureContactAction,
  hasPreparationFollowUp,
  hasValuationSignal,
  parseTimestamp,
  sortCalls,
} from './utils';

function goalsForStage(stage: PipelineViewStage): { minimum: string; ideal: string; recommendation: string } {
  switch (stage) {
    case 'lead':
      return {
        minimum: 'Situation, Rolle und echtes Interesse qualifizieren.',
        ideal: 'Einen konkreten Eigentümer- oder Bewertungstermin vereinbaren.',
        recommendation: 'Kontakt qualifizieren und einen verbindlichen nächsten Schritt terminieren.',
      };
    case 'qualified':
      return {
        minimum: 'Motivation, Zeitrahmen und Entscheidungsweg klären.',
        ideal: 'Bewertungs- oder Beratungstermin verbindlich vereinbaren.',
        recommendation: 'Offene Entscheidungsfragen schließen und den Termin festziehen.',
      };
    case 'appointment':
      return {
        minimum: 'Termin vorbereiten und gewünschte Entscheidung definieren.',
        ideal: 'Klare Mandatsnachbereitung mit Termin, Unterlagen und Verantwortlichkeit vereinbaren.',
        recommendation: 'Termin auf ein konkretes Abschlussziel ausrichten und Nachbereitung planen.',
      };
    case 'mandate':
      return {
        minimum: 'Offene Einwände oder fehlende Entscheidungsvoraussetzungen klären.',
        ideal: 'Nächsten verbindlichen Abschluss- oder Vermarktungsmeilenstein sichern.',
        recommendation: 'Abschlussphase absichern und keine offene Entscheidung ohne Folgetermin lassen.',
      };
    case 'sold':
      return {
        minimum: 'Abschluss sauber dokumentieren.',
        ideal: 'Empfehlung, Referenz oder langfristige Beziehung sichern.',
        recommendation: 'Nachbetreuung und Empfehlungsanlass planen.',
      };
    case 'inactive':
      return {
        minimum: 'Status und Kontaktfreigabe eindeutig klären.',
        ideal: 'Bewusst reaktivieren oder fachlich sauber zurückstellen.',
        recommendation: 'Keinen unklaren Schwebezustand lassen; Reaktivierung oder Inaktivität entscheiden.',
      };
  }
}

function addFactor(
  factors: OpportunityFactor[],
  key: string,
  label: string,
  detail: string,
  points: number,
): void {
  if (points !== 0) factors.push({ key, label, detail, points });
}

function inactivityDays(lastActivityAt: string | undefined, now: number): number | undefined {
  const timestamp = parseTimestamp(lastActivityAt);
  if (timestamp === undefined || timestamp > now) return undefined;
  return Math.max(0, Math.floor((now - timestamp) / DAY_MS));
}

function stagnationThreshold(stage: PipelineViewStage): number | undefined {
  if (stage === 'lead') return 21;
  if (stage === 'qualified') return 14;
  if (stage === 'appointment') return 7;
  if (stage === 'mandate') return 10;
  return undefined;
}

export function buildOpportunity(
  contact: Contact,
  now: number,
  callsByContact: Map<string, CallEvent[]>,
  followUpsByContact: Map<string, FollowUp[]>,
  propertiesByOwner: Map<string, Property[]>,
  appointmentsByContact: Map<string, Appointment[]>,
): MandateOpportunity {
  const calls = sortCalls(callsByContact.get(contact.id) ?? []);
  const followUps = followUpsByContact.get(contact.id) ?? [];
  const openFollowUps = followUps.filter((followUp) => followUp.status === 'open');
  const properties = propertiesByOwner.get(contact.id) ?? [];
  const appointments = appointmentsByContact.get(contact.id) ?? [];
  const upcomingAppointments = getUpcomingAppointments(appointments, now);
  const nextAction = getNextOpenFollowUp(followUps);
  const nextActionAt = [parseTimestamp(contact.nextActionAt), parseTimestamp(nextAction?.dueAt)]
    .filter((value): value is number => value !== undefined)
    .sort((left, right) => left - right)[0];
  const lastActivity = getLastActivity(contact, calls, followUps, appointments, now);
  const observedInactivityDays = inactivityDays(lastActivity.at, now);
  const stage = getViewStage(contact, calls, now);
  const activeProperties = properties.filter((property) => property.status !== 'Verkauft');
  const latest = calls[0];
  const positiveCalls = calls.filter((call) => call.outcome === 'conversation' || call.outcome === 'appointment');
  const noNextAction = !nextAction && !hasFutureContactAction(contact, now);
  const overdue = nextActionAt !== undefined && nextActionAt < now;
  const threshold = stagnationThreshold(stage);
  const stagnant = threshold !== undefined
    && observedInactivityDays !== undefined
    && observedInactivityDays >= threshold;
  const appointmentWithoutPreparation = upcomingAppointments.some((item) => !hasPreparationFollowUp(followUps, item));
  const valuationWithoutFollowUp = hasValuationSignal(properties, appointments) && openFollowUps.length === 0;
  const mandateWithoutDecision = stage === 'appointment' && positiveCalls.length > 0 && noNextAction;
  const closingWithoutFollowUp = stage === 'mandate' && openFollowUps.length === 0;

  const risks: string[] = [];
  const riskKeys: PipelineRiskKey[] = [];
  const missingData: string[] = [];
  const factors: OpportunityFactor[] = [];
  const reasons: string[] = [];
  const risk = (key: PipelineRiskKey, text: string) => {
    if (!riskKeys.includes(key)) {
      riskKeys.push(key);
      risks.push(text);
    }
  };

  if (!contact.firstName.trim() || !contact.lastName.trim()) missingData.push('Vollständiger Kontaktname');
  if (!contact.phone.trim() && !contact.email?.trim()) missingData.push('Gültiger Kontaktweg');
  if (!contact.city.trim()) missingData.push('Ort');
  if (!contact.notes?.trim()) missingData.push('Gesprächs- oder Situationsnotiz');
  if (contact.role === 'Eigentümer' && properties.length === 0) missingData.push('Verknüpfte Immobilie');
  if (missingData.length > 0) risk('incomplete_data', 'Wichtige Vertriebsdaten sind unvollständig.');

  if (noNextAction && stage !== 'sold' && stage !== 'inactive') {
    risk('no_next_action', 'Es ist keine belastbare nächste Aktion geplant.');
    addFactor(factors, 'no_next_action', 'Keine nächste Aktion', 'Weder offenes Follow-up noch zukünftige Kontaktaktion.', 16);
    reasons.push('ohne nächste Aktion');
  }
  if (appointmentWithoutPreparation) {
    risk('appointment_without_preparation', 'Ein bevorstehender Termin besitzt keine erkennbare Vorbereitung.');
    addFactor(factors, 'appointment_without_preparation', 'Termin ohne Vorbereitung', 'Termin innerhalb von 72 Stunden ohne passende Vorbereitung.', 18);
    reasons.push('Termin kurzfristig und unvorbereitet');
  }
  if (valuationWithoutFollowUp) {
    risk('valuation_without_followup', 'Eine Bewertungschance besitzt keine Mandatsnachbereitung.');
    addFactor(factors, 'valuation_without_followup', 'Bewertung ohne Nachfassaktion', 'Bewertungssignal vorhanden, aber kein offenes Follow-up.', 17);
    reasons.push('Bewertung ohne Nachfassaktion');
  }
  if (mandateWithoutDecision) {
    risk('mandate_without_decision', 'Die Mandatschance besitzt nach positivem Gespräch keine klare Entscheidungslinie.');
    addFactor(factors, 'mandate_without_decision', 'Unklare Entscheidung', 'Positive Signale ohne nächsten Schritt.', 14);
    reasons.push('positive Signale ohne Entscheidungspfad');
  }
  if (stagnant) {
    risk('stagnant', `Seit ${observedInactivityDays} Tagen ist kein belastbarer Fortschritt erkennbar.`);
    addFactor(factors, 'stagnant', 'Stagnierende Chance', `Inaktivität über dem Schwellenwert von ${threshold} Tagen.`, 13);
    reasons.push('stagnierende Chance');
  }
  if (closingWithoutFollowUp) {
    risk('closing_without_followup', 'Abschlussphase ohne geplantes Follow-up.');
    addFactor(factors, 'closing_without_followup', 'Abschlussphase ungesichert', 'Mandatsphase ohne offene Folgeaktion.', 18);
    reasons.push('Abschlussphase ohne Follow-up');
  }
  if (overdue) {
    addFactor(factors, 'overdue', 'Überfällige Aktion', 'Die früheste bekannte nächste Aktion liegt in der Vergangenheit.', 20);
    reasons.push('überfällige Aktion');
  }

  const stagePoints: Record<PipelineViewStage, number> = {
    lead: 4,
    qualified: 10,
    appointment: 18,
    mandate: 17,
    sold: -30,
    inactive: -20,
  };
  addFactor(factors, 'stage', 'Pipeline-Stufe', `${PIPELINE_STAGE_LABEL.get(stage) ?? stage} ist die aktuelle abgeleitete Stufe.`, stagePoints[stage]);

  if (contact.role === 'Eigentümer') {
    addFactor(factors, 'owner_role', 'Eigentümerkontakt', 'Der Kontakt ist als Eigentümer geführt.', 10);
    reasons.push('Eigentümerkontakt');
  }
  if (activeProperties.length > 0) {
    addFactor(factors, 'active_property', 'Aktives Objekt', `${activeProperties.length} aktive Objekte verknüpft.`, 13);
    reasons.push('aktives Objekt');
  }
  if (properties.some((property) => property.status === 'Akquise') && noNextAction) {
    addFactor(factors, 'acquisition_without_followup', 'Akquise ohne Follow-up', 'Objekt in Akquise, aber Folgeaktion fehlt.', 14);
    reasons.push('Akquise ohne Follow-up');
  }
  if (upcomingAppointments.length > 0) {
    addFactor(factors, 'upcoming_appointment', 'Bevorstehender Termin', `Innerhalb von 72 Stunden: ${upcomingAppointments[0].title}.`, 16);
    reasons.push('bevorstehender Termin');
  }
  if (contact.potential >= 85) addFactor(factors, 'potential', 'Sehr hohes vorhandenes Potenzial', `${contact.potential}/100 sind hinterlegt.`, 16);
  else if (contact.potential >= 70) addFactor(factors, 'potential', 'Hohes vorhandenes Potenzial', `${contact.potential}/100 sind hinterlegt.`, 11);
  else if (contact.potential >= 50) addFactor(factors, 'potential', 'Solides vorhandenes Potenzial', `${contact.potential}/100 sind hinterlegt.`, 5);
  if (latest?.outcome === 'appointment' || latest?.outcome === 'conversation') {
    addFactor(factors, 'positive_conversation', 'Positiver Gesprächsverlauf', 'Jüngstes Gespräch war positiv.', 9);
    reasons.push('positiver Gesprächsverlauf');
  }
  if (positiveCalls.length >= 2 && noNextAction) {
    addFactor(factors, 'multiple_positive_calls', 'Mehrere erfolgreiche Gespräche', `${positiveCalls.length} positive Ergebnisse ohne Abschlussaktion.`, 10);
    reasons.push('mehrere erfolgreiche Gespräche ohne Abschlussaktion');
  }

  const goals = goalsForStage(stage);
  return {
    id: `mandate-${contact.id}`,
    contact,
    stage,
    stageLabel: PIPELINE_STAGE_LABEL.get(stage) ?? stage,
    actionValue: factors.reduce((sum, factor) => sum + factor.points, 0),
    factors: [...factors].sort((left, right) => right.points - left.points || left.key.localeCompare(right.key)),
    reason: reasons.length > 0
      ? `Priorisiert wegen ${reasons.slice(0, 3).join(', ')}.`
      : 'Keine akute Mandatschance aus den vorhandenen Signalen ableitbar.',
    reasons,
    lastActivityAt: lastActivity.at,
    lastActivityLabel: lastActivity.label,
    nextAction,
    nextActionAt: nextActionAt !== undefined ? new Date(nextActionAt).toISOString() : undefined,
    risks,
    riskKeys,
    missingData,
    recommendedAction: goals.recommendation,
    minimumGoal: goals.minimum,
    idealGoal: goals.ideal,
    properties,
    appointments: [...appointments].sort((left, right) => (parseTimestamp(left.startsAt) ?? 0) - (parseTimestamp(right.startsAt) ?? 0)),
    calls,
    openFollowUps: [...openFollowUps].sort((left, right) => (parseTimestamp(left.dueAt) ?? 0) - (parseTimestamp(right.dueAt) ?? 0)),
    knownObjections: getKnownObjections(contact, calls),
    isOverdue: overdue,
    observedInactivityDays,
  };
}
