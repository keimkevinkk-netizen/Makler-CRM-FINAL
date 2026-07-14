import type { Appointment, CallEvent, Contact, FollowUp, Property } from '../../types/domain';
import { assessContactDuplicates } from './duplicates';
import { buildContactMergePreview } from './mergePreview';
import {
  compactWhitespace,
  daysBetween,
  isValidEmail,
  isValidPhone,
  nextBusinessActionAt,
  normalizeEmail,
  normalizePhone,
  parseDateMs,
  stableId,
} from './normalization';
import { assertSafeDataQualityInput } from './security';
import type {
  CorrectionSuggestion,
  DataQualityAnalysisOptions,
  DataQualityCategory,
  DataQualityConfidence,
  DataQualityEntity,
  DataQualityInput,
  DataQualityIssue,
  DataQualityResult,
  DataQualitySeverity,
  DataQualitySummary,
  DuplicateAssessment,
  QualityDistribution,
} from './types';

const DEFAULT_NOW = '2026-01-01T12:00:00.000Z';
const FAR_FUTURE_DAYS = 365 * 5;
const EARLIEST_REASONABLE_DATE = Date.parse('1900-01-01T00:00:00.000Z');

interface BuildContext {
  input: DataQualityInput;
  nowIso: string;
  nowMs: number;
  staleAfterDays: number;
  criticalStaleAfterDays: number;
  highPotentialThreshold: number;
  issues: DataQualityIssue[];
  suggestions: CorrectionSuggestion[];
  contactsById: Map<string, Contact>;
  openFollowUpsByContact: Map<string, FollowUp[]>;
  propertiesByOwner: Map<string, Property[]>;
}

function confidenceRank(confidence: DataQualityConfidence): number {
  return ({ certain: 4, high: 3, medium: 2, low: 1 } satisfies Record<DataQualityConfidence, number>)[confidence];
}

function severityRank(severity: DataQualitySeverity): number {
  return ({ critical: 0, warning: 1, info: 2 } satisfies Record<DataQualitySeverity, number>)[severity];
}

function addIssue(context: BuildContext, issue: Omit<DataQualityIssue, 'id' | 'relatedEntityIds'> & { relatedEntityIds?: string[] }) {
  context.issues.push({
    ...issue,
    id: stableId('quality_issue', { code: issue.code, entityType: issue.entityType, entityId: issue.entityId, field: issue.field, relatedEntityIds: issue.relatedEntityIds ?? [] }),
    relatedEntityIds: [...(issue.relatedEntityIds ?? [])].sort(),
  });
}

function addSuggestion(context: BuildContext, suggestion: Omit<CorrectionSuggestion, 'id'>) {
  context.suggestions.push({
    ...suggestion,
    id: stableId('quality_suggestion', { action: suggestion.action, entityType: suggestion.entityType, entityId: suggestion.entityId, field: suggestion.field, proposedValue: suggestion.proposedValue }),
  });
}

function addRelationshipIssue(
  context: BuildContext,
  entityType: DataQualityEntity,
  entityId: string,
  field: string,
  contactId: string,
  title: string,
) {
  const repaired = [...context.contactsById.keys()].filter((id) => id.trim().toLocaleLowerCase('de-DE') === contactId.trim().toLocaleLowerCase('de-DE'));
  addIssue(context, {
    code: `${entityType}-orphan-contact`,
    category: 'relationship',
    severity: 'critical',
    entityType,
    entityId,
    field,
    title,
    description: `Die gespeicherte Kontakt-ID „${contactId}“ verweist auf keinen vorhandenen Kontakt.`,
    currentValue: contactId,
  });
  if (repaired.length === 1) {
    addSuggestion(context, {
      action: 'link_contact',
      entityType,
      entityId,
      field,
      oldValue: contactId,
      proposedValue: repaired[0],
      reason: 'Genau eine vorhandene Kontakt-ID stimmt nach sicherer Leerzeichen- und Groß-/Kleinschreibungsnormalisierung überein.',
      confidence: 'certain',
      sideEffects: ['Die Beziehung würde auf den eindeutig identifizierten Kontakt umgehängt.'],
    });
  } else {
    addSuggestion(context, {
      action: 'flag_orphan',
      entityType,
      entityId,
      field,
      oldValue: contactId,
      proposedValue: 'verwaist',
      reason: 'Die Ziel-ID existiert nicht und es gibt keinen eindeutig sicheren Ersatzkontakt.',
      confidence: 'certain',
      sideEffects: ['Der Datensatz bleibt unverändert, wird aber für manuelle Prüfung markiert.'],
    });
    addSuggestion(context, {
      action: 'remove_invalid_relationship',
      entityType,
      entityId,
      field,
      oldValue: contactId,
      proposedValue: null,
      reason: 'Die referenzierte Kontakt-ID existiert nicht. Das Entfernen wird nur als Vorschau angeboten.',
      confidence: 'high',
      sideEffects: ['Der Datensatz wäre anschließend fachlich unzugeordnet und müsste manuell neu verknüpft werden.'],
    });
  }
}

function whitespaceSuggestion(context: BuildContext, entityType: DataQualityEntity, entityId: string, field: string, value: unknown) {
  if (typeof value !== 'string') return;
  const compact = compactWhitespace(value);
  if (compact === value || !compact) return;
  addSuggestion(context, {
    action: 'compact_whitespace',
    entityType,
    entityId,
    field,
    oldValue: value,
    proposedValue: compact,
    reason: 'Überflüssige führende, nachgestellte oder mehrfache Leerzeichen wurden erkannt.',
    confidence: 'certain',
    sideEffects: ['Nur die Darstellung des Textwerts würde vereinheitlicht.'],
  });
}

function contactQuality(context: BuildContext, contact: Contact) {
  whitespaceSuggestion(context, 'contact', contact.id, 'firstName', contact.firstName);
  whitespaceSuggestion(context, 'contact', contact.id, 'lastName', contact.lastName);
  whitespaceSuggestion(context, 'contact', contact.id, 'city', contact.city);
  whitespaceSuggestion(context, 'contact', contact.id, 'source', contact.source);

  if (!compactWhitespace(contact.firstName) && !compactWhitespace(contact.lastName)) {
    addIssue(context, { code: 'contact-missing-name', category: 'completeness', severity: 'critical', entityType: 'contact', entityId: contact.id, field: 'name', title: 'Kontakt ohne Namen', description: 'Vor- und Nachname fehlen vollständig.' });
  }
  if (!compactWhitespace(contact.phone)) {
    addIssue(context, { code: 'contact-missing-phone', category: 'contactability', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'phone', title: 'Telefonnummer fehlt', description: 'Der Kontakt kann nicht telefonisch kontaktiert werden.' });
  } else if (!isValidPhone(contact.phone)) {
    addIssue(context, { code: 'contact-invalid-phone', category: 'contactability', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'phone', title: 'Ungültige Telefonnummer', description: 'Die Telefonnummer lässt sich nicht sicher als internationale Rufnummer validieren.', currentValue: contact.phone });
  } else {
    const normalized = normalizePhone(contact.phone);
    if (normalized !== contact.phone) addSuggestion(context, { action: 'normalize_phone', entityType: 'contact', entityId: contact.id, field: 'phone', oldValue: contact.phone, proposedValue: normalized, reason: 'Die Rufnummer kann verlustfrei in ein einheitliches E.164-Format überführt werden.', confidence: 'certain', sideEffects: ['Anzeige und Suchvergleich werden vereinheitlicht; die Nummer selbst bleibt fachlich gleich.'] });
  }

  if (contact.email && !isValidEmail(contact.email)) {
    addIssue(context, { code: 'contact-invalid-email', category: 'contactability', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'email', title: 'Ungültige E-Mail-Adresse', description: 'Die E-Mail-Adresse besitzt kein plausibles Format.', currentValue: contact.email });
  } else if (contact.email) {
    const normalized = normalizeEmail(contact.email);
    if (normalized !== contact.email) addSuggestion(context, { action: 'normalize_email', entityType: 'contact', entityId: contact.id, field: 'email', oldValue: contact.email, proposedValue: normalized, reason: 'E-Mail-Adressen sind nicht case-sensitiv und können sicher kleingeschrieben werden.', confidence: 'certain', sideEffects: ['Nur die Schreibweise wird vereinheitlicht.'] });
  }

  if (!isValidPhone(contact.phone) && !isValidEmail(contact.email)) {
    addIssue(context, { code: 'contact-no-valid-channel', category: 'contactability', severity: 'critical', entityType: 'contact', entityId: contact.id, title: 'Kein gültiger Kontaktweg', description: 'Weder Telefonnummer noch E-Mail-Adresse sind zuverlässig nutzbar.' });
  }
  if (!compactWhitespace(contact.city)) addIssue(context, { code: 'contact-missing-city', category: 'completeness', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'city', title: 'Ort fehlt', description: 'Der Kontakt kann regional nicht sicher zugeordnet werden.' });
  if (!compactWhitespace(contact.role)) addIssue(context, { code: 'contact-missing-role', category: 'assignment', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'role', title: 'Rolle fehlt', description: 'Die fachliche Kontaktrolle ist nicht gesetzt.' });
  if (!compactWhitespace(contact.source)) addIssue(context, { code: 'contact-missing-source', category: 'assignment', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'source', title: 'Quelle fehlt', description: 'Die Herkunft des Kontakts ist nicht nachvollziehbar.' });

  const openFollowUps = context.openFollowUpsByContact.get(contact.id) ?? [];
  if (contact.stage !== 'sold' && !contact.nextActionAt && openFollowUps.length === 0) {
    addIssue(context, { code: 'contact-missing-next-action', category: 'completeness', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'nextActionAt', title: 'Nächste Aktion fehlt', description: 'Für den aktiven Kontakt ist weder ein nächster Schritt noch ein offenes Follow-up hinterlegt.' });
    addSuggestion(context, { action: 'create_next_action', entityType: 'contact', entityId: contact.id, field: 'nextActionAt', oldValue: null, proposedValue: nextBusinessActionAt(context.nowIso), reason: 'Aktive Kontakte ohne nächsten Schritt drohen aus der Bearbeitung zu fallen. Der Termin ist nur ein Vorschlag.', confidence: 'medium', sideEffects: ['Vor einer tatsächlichen Anlage müssen Kanal, Inhalt und Priorität manuell bestätigt werden.'] });
  }
  const highPotential = contact.potential >= context.highPotentialThreshold || contact.priority === 'high' || contact.stage === 'appointment' || contact.stage === 'mandate';
  if (highPotential && openFollowUps.length === 0 && !contact.nextActionAt && contact.stage !== 'sold') {
    addIssue(context, { code: 'contact-high-potential-without-followup', category: 'consistency', severity: 'critical', entityType: 'contact', entityId: contact.id, field: 'nextActionAt', title: 'Hohes Potenzial ohne Follow-up', description: 'Der Kontakt besitzt hohes Vertriebs- oder Abschluss­potenzial, aber keine abgesicherte Folgeaktion.' });
  }

  if (contact.lastContactAt) {
    const timestamp = parseDateMs(contact.lastContactAt);
    if (timestamp === undefined) addIssue(context, { code: 'contact-invalid-last-activity', category: 'timing', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'lastContactAt', title: 'Ungültige letzte Aktivität', description: 'Der Zeitpunkt der letzten Aktivität kann nicht ausgewertet werden.', currentValue: contact.lastContactAt });
    else if (timestamp > context.nowMs + 86_400_000) addIssue(context, { code: 'contact-future-last-activity', category: 'timing', severity: 'critical', entityType: 'contact', entityId: contact.id, field: 'lastContactAt', title: 'Letzte Aktivität liegt in der Zukunft', description: 'Der gespeicherte Aktivitätszeitpunkt ist zeitlich unplausibel.', currentValue: contact.lastContactAt });
    else {
      const age = daysBetween(timestamp, context.nowMs);
      if (age >= context.criticalStaleAfterDays) addIssue(context, { code: 'contact-very-stale', category: 'timing', severity: 'critical', entityType: 'contact', entityId: contact.id, field: 'lastContactAt', title: 'Sehr alte letzte Aktivität', description: `Seit ${age} Tagen ist keine Aktivität dokumentiert.`, currentValue: contact.lastContactAt });
      else if (age >= context.staleAfterDays) addIssue(context, { code: 'contact-stale', category: 'timing', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'lastContactAt', title: 'Alte letzte Aktivität', description: `Seit ${age} Tagen ist keine Aktivität dokumentiert.`, currentValue: contact.lastContactAt });
    }
  }

  const ownerProperties = context.propertiesByOwner.get(contact.id) ?? [];
  const soldProperties = ownerProperties.filter((property) => property.status === 'Verkauft');
  if (contact.role === 'Eigentümer' && ownerProperties.length === 0) addIssue(context, { code: 'owner-without-property', category: 'relationship', severity: 'warning', entityType: 'contact', entityId: contact.id, title: 'Eigentümerkontakt ohne Immobilie', description: 'Der Kontakt ist als Eigentümer klassifiziert, aber mit keiner Immobilie verknüpft.' });
  if (soldProperties.length > 0 && contact.stage !== 'sold') addIssue(context, { code: 'sold-property-stage-mismatch', category: 'consistency', severity: 'critical', entityType: 'contact', entityId: contact.id, field: 'stage', title: 'Verkauf und Pipeline-Stufe widersprechen sich', description: 'Mindestens eine verknüpfte Immobilie ist verkauft, der Eigentümerkontakt steht jedoch nicht auf „sold“.', currentValue: contact.stage, relatedEntityIds: soldProperties.map((property) => property.id) });
  if (contact.stage === 'sold' && soldProperties.length === 0 && ownerProperties.some((property) => property.status !== 'Verkauft')) addIssue(context, { code: 'contact-sold-with-active-property', category: 'consistency', severity: 'warning', entityType: 'contact', entityId: contact.id, field: 'stage', title: 'Verkaufter Kontakt mit aktiver Immobilie', description: 'Der Kontakt ist als verkauft markiert, besitzt jedoch nur aktive oder offene Immobilien.', currentValue: contact.stage, relatedEntityIds: ownerProperties.map((property) => property.id) });
}

function followUpQuality(context: BuildContext, followUp: FollowUp) {
  whitespaceSuggestion(context, 'followup', followUp.id, 'title', followUp.title);
  if (!context.contactsById.has(followUp.contactId)) addRelationshipIssue(context, 'followup', followUp.id, 'contactId', followUp.contactId, 'Follow-up ohne vorhandenen Kontakt');
  const due = parseDateMs(followUp.dueAt);
  if (due === undefined) addIssue(context, { code: followUp.status === 'done' ? 'completed-followup-invalid-date' : 'followup-invalid-date', category: 'timing', severity: 'critical', entityType: 'followup', entityId: followUp.id, field: 'dueAt', title: 'Follow-up mit ungültigem Datum', description: 'Das Fälligkeitsdatum kann nicht sicher ausgewertet werden.', currentValue: followUp.dueAt });
  else if (due < EARLIEST_REASONABLE_DATE || daysBetween(context.nowMs, due) > FAR_FUTURE_DAYS) addIssue(context, { code: 'followup-implausible-date', category: 'timing', severity: 'critical', entityType: 'followup', entityId: followUp.id, field: 'dueAt', title: 'Unplausibles Follow-up-Datum', description: 'Der gespeicherte Zeitpunkt liegt außerhalb eines plausiblen Arbeitszeitraums.', currentValue: followUp.dueAt });
  else if (followUp.status === 'done' && due > context.nowMs + 86_400_000) addIssue(context, { code: 'completed-followup-future-date', category: 'timing', severity: 'warning', entityType: 'followup', entityId: followUp.id, field: 'dueAt', title: 'Erledigtes Follow-up liegt in der Zukunft', description: 'Ein erledigter Vorgang besitzt ein zukünftiges Fälligkeitsdatum.', currentValue: followUp.dueAt });
}

function propertyQuality(context: BuildContext, property: Property) {
  whitespaceSuggestion(context, 'property', property.id, 'title', property.title);
  whitespaceSuggestion(context, 'property', property.id, 'address', property.address);
  whitespaceSuggestion(context, 'property', property.id, 'city', property.city);
  if (!property.ownerContactId) {
    addIssue(context, { code: 'property-without-owner', category: 'assignment', severity: 'warning', entityType: 'property', entityId: property.id, field: 'ownerContactId', title: 'Immobilie ohne Eigentümer', description: 'Die Immobilie besitzt keine fachlich sichere Eigentümerzuordnung.' });
    addSuggestion(context, { action: 'flag_orphan', entityType: 'property', entityId: property.id, field: 'ownerContactId', oldValue: null, proposedValue: 'Eigentümerzuordnung offen', reason: 'Ohne Eigentümerkontakt darf keine Beziehung geraten werden.', confidence: 'certain', sideEffects: ['Die Immobilie bleibt unverändert und wird für manuelle Zuordnung markiert.'] });
  } else if (!context.contactsById.has(property.ownerContactId)) addRelationshipIssue(context, 'property', property.id, 'ownerContactId', property.ownerContactId, 'Immobilie mit ungültiger Eigentümer-ID');
}

function appointmentQuality(context: BuildContext, appointment: Appointment) {
  whitespaceSuggestion(context, 'appointment', appointment.id, 'title', appointment.title);
  if (!appointment.contactId) addIssue(context, { code: 'appointment-without-contact', category: 'assignment', severity: 'warning', entityType: 'appointment', entityId: appointment.id, field: 'contactId', title: 'Termin ohne sichere Kontaktzuordnung', description: 'Der Termin ist keinem Kontakt zugeordnet und bleibt fachlich offen.' });
  else if (!context.contactsById.has(appointment.contactId)) addRelationshipIssue(context, 'appointment', appointment.id, 'contactId', appointment.contactId, 'Termin ohne vorhandenen Kontakt');
  checkFutureActivity(context, 'appointment', appointment.id, 'startsAt', appointment.startsAt, 'Termin');
}

function callQuality(context: BuildContext, call: CallEvent) {
  if (!context.contactsById.has(call.contactId)) addRelationshipIssue(context, 'call', call.id, 'contactId', call.contactId, 'Telefonereignis ohne Kontakt');
  checkFutureActivity(context, 'call', call.id, 'createdAt', call.createdAt, 'Telefonereignis');
}

function checkFutureActivity(context: BuildContext, entityType: DataQualityEntity, entityId: string, field: string, value: string, label: string) {
  const timestamp = parseDateMs(value);
  if (timestamp === undefined) addIssue(context, { code: `${entityType}-invalid-time`, category: 'timing', severity: 'critical', entityType, entityId, field, title: `${label} mit ungültigem Zeitpunkt`, description: 'Der Zeitwert kann nicht ausgewertet werden.', currentValue: value });
  else if (timestamp < EARLIEST_REASONABLE_DATE || daysBetween(context.nowMs, timestamp) > FAR_FUTURE_DAYS) addIssue(context, { code: `${entityType}-implausible-time`, category: 'timing', severity: 'critical', entityType, entityId, field, title: `${label} mit unplausiblem Zeitwert`, description: 'Der Zeitwert liegt außerhalb eines plausiblen Arbeitszeitraums.', currentValue: value });
  else if (entityType === 'call' && timestamp > context.nowMs + 5 * 60_000) addIssue(context, { code: 'future-call-event', category: 'timing', severity: 'critical', entityType, entityId, field, title: 'Zukünftige Aktivität mit unplausiblem Zeitwert', description: 'Ein bereits protokolliertes Telefonereignis liegt in der Zukunft.', currentValue: value });
}

function duplicateQuality(context: BuildContext, assessments: DuplicateAssessment[]) {
  for (const assessment of assessments) {
    if (assessment.category === 'separate') continue;
    const severity: DataQualitySeverity = assessment.category === 'certain' || assessment.category === 'very_likely' ? 'critical' : 'warning';
    addIssue(context, {
      code: `contact-duplicate-${assessment.category}`,
      category: 'duplicate',
      severity,
      entityType: 'contact',
      entityId: assessment.primaryContactId,
      title: assessment.category === 'certain' ? 'Sicher identische Kontakte' : assessment.category === 'very_likely' ? 'Sehr wahrscheinlich identische Kontakte' : assessment.category === 'possible' ? 'Möglicherweise identische Kontakte' : 'Dublettenprüfung erforderlich',
      description: `Die Dublettenbewertung erreicht ${assessment.score} von 100 Punkten.`,
      relatedEntityIds: [assessment.candidateContactId],
    });
    addSuggestion(context, {
      action: 'group_duplicates',
      entityType: 'contact',
      entityId: assessment.primaryContactId,
      oldValue: [assessment.primaryContactId, assessment.candidateContactId],
      proposedValue: { reviewGroupId: assessment.id, category: assessment.category },
      reason: 'Die Kontakte werden ausschließlich als Prüfgruppe vorgeschlagen; es findet keine Zusammenführung statt.',
      confidence: assessment.category === 'certain' ? 'certain' : assessment.category === 'very_likely' ? 'high' : assessment.category === 'possible' ? 'medium' : 'low',
      sideEffects: ['Keine Datenänderung. Eine spätere Zusammenführung erfordert eine separate manuelle Freigabe.'],
    });
  }
}

function scoreSummary(input: DataQualityInput, issues: DataQualityIssue[], suggestions: CorrectionSuggestion[], duplicates: DuplicateAssessment[]): DataQualitySummary {
  const entityCount = Math.max(1, input.contacts.length + input.followUps.length + input.properties.length + input.appointments.length + input.callEvents.length);
  const penalty = issues.reduce((sum, issue) => sum + (issue.severity === 'critical' ? 12 : issue.severity === 'warning' ? 5 : 2), 0);
  const overallScore = Math.max(0, Math.min(100, Math.round(100 - (penalty / (entityCount * 18)) * 100)));
  const incompleteCodes = new Set(['contact-missing-name', 'contact-missing-phone', 'contact-missing-city', 'contact-missing-role', 'contact-missing-source', 'contact-missing-next-action']);
  const orphanCodes = new Set(['followup-orphan-contact', 'appointment-orphan-contact', 'property-orphan-contact', 'call-orphan-contact', 'property-without-owner', 'appointment-without-contact']);
  const invalidRelationshipCodes = new Set(['followup-orphan-contact', 'appointment-orphan-contact', 'property-orphan-contact', 'call-orphan-contact']);
  const issuesByContact = new Map<string, DataQualityIssue[]>();
  for (const issue of issues) {
    if (issue.entityType !== 'contact' || !issue.entityId) continue;
    const bucket = issuesByContact.get(issue.entityId) ?? [];
    bucket.push(issue);
    issuesByContact.set(issue.entityId, bucket);
  }
  const qualityDistribution: QualityDistribution = { excellent: 0, good: 0, atRisk: 0, critical: 0 };
  for (const contact of input.contacts) {
    const contactPenalty = (issuesByContact.get(contact.id) ?? []).reduce((sum, issue) => sum + (issue.severity === 'critical' ? 22 : issue.severity === 'warning' ? 10 : 4), 0);
    const score = Math.max(0, 100 - contactPenalty);
    if (score >= 90) qualityDistribution.excellent += 1;
    else if (score >= 75) qualityDistribution.good += 1;
    else if (score >= 50) qualityDistribution.atRisk += 1;
    else qualityDistribution.critical += 1;
  }
  return {
    overallScore,
    criticalErrors: issues.filter((issue) => issue.severity === 'critical').length,
    duplicates: duplicates.filter((assessment) => assessment.category !== 'separate').length,
    incompleteContacts: new Set(issues.filter((issue) => incompleteCodes.has(issue.code)).map((issue) => issue.entityId).filter(Boolean)).size,
    orphanedRecords: issues.filter((issue) => orphanCodes.has(issue.code)).length,
    invalidRelationships: issues.filter((issue) => invalidRelationshipCodes.has(issue.code)).length,
    quickFixes: suggestions.filter((suggestion) => confidenceRank(suggestion.confidence) >= confidenceRank('high')).length,
    qualityDistribution,
  };
}

function buildContext(input: DataQualityInput, options: DataQualityAnalysisOptions): BuildContext {
  const nowIso = options.now ?? DEFAULT_NOW;
  const nowMs = parseDateMs(nowIso);
  if (nowMs === undefined) throw new Error('Der Analysezeitpunkt ist ungültig.');
  const contactsById = new Map(input.contacts.map((contact) => [contact.id, contact]));
  const openFollowUpsByContact = new Map<string, FollowUp[]>();
  for (const followUp of input.followUps) {
    if (followUp.status !== 'open') continue;
    const bucket = openFollowUpsByContact.get(followUp.contactId) ?? [];
    bucket.push(followUp);
    openFollowUpsByContact.set(followUp.contactId, bucket);
  }
  const propertiesByOwner = new Map<string, Property[]>();
  for (const property of input.properties) {
    if (!property.ownerContactId) continue;
    const bucket = propertiesByOwner.get(property.ownerContactId) ?? [];
    bucket.push(property);
    propertiesByOwner.set(property.ownerContactId, bucket);
  }
  return {
    input,
    nowIso: new Date(nowMs).toISOString(),
    nowMs,
    staleAfterDays: options.staleAfterDays ?? 180,
    criticalStaleAfterDays: options.criticalStaleAfterDays ?? 365,
    highPotentialThreshold: options.highPotentialThreshold ?? 250_000,
    issues: [],
    suggestions: [],
    contactsById,
    openFollowUpsByContact,
    propertiesByOwner,
  };
}

export function analyseDataQuality(input: DataQualityInput, options: DataQualityAnalysisOptions = {}): DataQualityResult {
  assertSafeDataQualityInput(input);
  const context = buildContext(input, options);
  for (const contact of input.contacts) contactQuality(context, contact);
  for (const followUp of input.followUps) followUpQuality(context, followUp);
  for (const property of input.properties) propertyQuality(context, property);
  for (const appointment of input.appointments) appointmentQuality(context, appointment);
  for (const call of input.callEvents) callQuality(context, call);

  const duplicates = assessContactDuplicates(input, options.maxDuplicateAssessments ?? 500);
  duplicateQuality(context, duplicates);
  const mergePreviews = duplicates
    .filter((assessment) => assessment.category !== 'separate')
    .map((assessment) => buildContactMergePreview(input, assessment))
    .filter((preview): preview is NonNullable<typeof preview> => Boolean(preview));

  const issues = [...context.issues].sort((left, right) => severityRank(left.severity) - severityRank(right.severity) || left.category.localeCompare(right.category) || (left.entityId ?? '').localeCompare(right.entityId ?? '') || left.code.localeCompare(right.code));
  const suggestions = [...context.suggestions].sort((left, right) => confidenceRank(right.confidence) - confidenceRank(left.confidence) || left.entityType.localeCompare(right.entityType) || left.entityId.localeCompare(right.entityId) || left.action.localeCompare(right.action));
  return {
    generatedAt: context.nowIso,
    deterministic: true,
    mutatesData: false,
    summary: scoreSummary(input, issues, suggestions, duplicates),
    issues,
    suggestions,
    duplicateAssessments: duplicates,
    mergePreviews,
  };
}

export function emptyDataQualityInput(): DataQualityInput {
  return { contacts: [], followUps: [], properties: [], appointments: [], callEvents: [], auditEvents: [] };
}

export function qualityIssueCountByCategory(result: DataQualityResult): Record<DataQualityCategory, number> {
  const counts: Record<DataQualityCategory, number> = { completeness: 0, contactability: 0, duplicate: 0, relationship: 0, consistency: 0, timing: 0, assignment: 0 };
  for (const issue of result.issues) counts[issue.category] += 1;
  return counts;
}
