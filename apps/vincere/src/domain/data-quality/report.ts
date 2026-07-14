import { stableHash } from './normalization';
import type { ContactMergePreview, CorrectionSuggestion, DataQualityIssue, DataQualityResult, DuplicateAssessment } from './types';

export interface DataQualityReportOptions {
  anonymize?: boolean;
}

function pseudonym(prefix: string, value: string): string {
  return `${prefix}_${stableHash(value).slice(0, 8)}`;
}

function anonymizeId(value: string | undefined, entity = 'record'): string | undefined {
  return value ? pseudonym(entity, value) : undefined;
}

function anonymizeValue(field: string | undefined, value: unknown): unknown {
  if (value === undefined || value === null) return value;
  const normalizedField = (field ?? '').toLocaleLowerCase('de-DE');
  if (normalizedField.includes('email')) return '[E-MAIL]';
  if (normalizedField.includes('phone') || normalizedField.includes('telefon')) return '[TELEFON]';
  if (normalizedField.includes('firstname') || normalizedField.includes('lastname') || normalizedField === 'name') return '[NAME]';
  if (normalizedField.includes('address') || normalizedField.includes('adresse')) return '[ADRESSE]';
  if (normalizedField.includes('city') || normalizedField.includes('ort')) return '[ORT]';
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? pseudonym('record', item) : item);
  if (typeof value === 'object') return '[STRUKTURIERTER WERT ENTFERNT]';
  return value;
}

function issueForReport(issue: DataQualityIssue, anonymize: boolean) {
  if (!anonymize) return issue;
  const currentText = typeof issue.currentValue === 'string' ? issue.currentValue : undefined;
  return {
    ...issue,
    entityId: anonymizeId(issue.entityId, issue.entityType),
    relatedEntityIds: issue.relatedEntityIds.map((id) => pseudonym('related', id)),
    description: currentText ? issue.description.replaceAll(currentText, '[WERT]') : issue.description,
    currentValue: anonymizeValue(issue.field, issue.currentValue),
  };
}

function suggestionForReport(suggestion: CorrectionSuggestion, anonymize: boolean) {
  if (!anonymize) return suggestion;
  return {
    ...suggestion,
    entityId: pseudonym(suggestion.entityType, suggestion.entityId),
    oldValue: anonymizeValue(suggestion.field, suggestion.oldValue),
    proposedValue: anonymizeValue(suggestion.field, suggestion.proposedValue),
  };
}

function duplicateForReport(assessment: DuplicateAssessment, anonymize: boolean) {
  if (!anonymize) return assessment;
  return {
    ...assessment,
    primaryContactId: pseudonym('contact', assessment.primaryContactId),
    candidateContactId: pseudonym('contact', assessment.candidateContactId),
    primaryRecordIndex: -1,
    candidateRecordIndex: -1,
  };
}

function mergeForReport(preview: ContactMergePreview, anonymize: boolean) {
  if (!anonymize) return preview;
  return {
    ...preview,
    primaryContactId: pseudonym('contact', preview.primaryContactId),
    duplicateContactId: pseudonym('contact', preview.duplicateContactId),
    fields: preview.fields.map((field) => ({
      ...field,
      primaryValue: anonymizeValue(String(field.field), field.primaryValue),
      duplicateValue: anonymizeValue(String(field.field), field.duplicateValue),
      proposedValue: anonymizeValue(String(field.field), field.proposedValue),
    })),
    conflicts: preview.conflicts.map((field) => ({
      ...field,
      primaryValue: anonymizeValue(String(field.field), field.primaryValue),
      duplicateValue: anonymizeValue(String(field.field), field.duplicateValue),
      proposedValue: anonymizeValue(String(field.field), field.proposedValue),
    })),
    relationshipTransfers: preview.relationshipTransfers.map((transfer) => ({
      ...transfer,
      entityId: pseudonym(transfer.entityType, transfer.entityId),
      fromContactId: pseudonym('contact', transfer.fromContactId),
      toContactId: pseudonym('contact', transfer.toContactId),
    })),
  };
}

export function dataQualityReportObject(result: DataQualityResult, options: DataQualityReportOptions = {}) {
  const anonymize = options.anonymize ?? false;
  return {
    format: 'vincere-data-quality-report',
    formatVersion: 1,
    generatedAt: result.generatedAt,
    anonymized: anonymize,
    deterministic: result.deterministic,
    mutatesData: result.mutatesData,
    summary: result.summary,
    issues: result.issues.map((issue) => issueForReport(issue, anonymize)),
    suggestions: result.suggestions.map((suggestion) => suggestionForReport(suggestion, anonymize)),
    duplicateAssessments: result.duplicateAssessments.map((assessment) => duplicateForReport(assessment, anonymize)),
    mergePreviews: result.mergePreviews.map((preview) => mergeForReport(preview, anonymize)),
  };
}

export function exportDataQualityReport(result: DataQualityResult, options: DataQualityReportOptions = {}): string {
  return `${JSON.stringify(dataQualityReportObject(result, options), null, 2)}\n`;
}

export function buildDataQualityMarkdown(result: DataQualityResult): string {
  const distribution = result.summary.qualityDistribution;
  const duplicateCounts = result.duplicateAssessments.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {});
  const lines = [
    '# VINCERE Datenqualitätsbericht',
    '',
    `Erzeugt: ${result.generatedAt}`,
    '',
    '## Gesamtstatus',
    '',
    `- Gesamtqualität: ${result.summary.overallScore}/100`,
    `- Kritische Fehler: ${result.summary.criticalErrors}`,
    `- Dubletten: ${result.summary.duplicates}`,
    `- Unvollständige Kontakte: ${result.summary.incompleteContacts}`,
    `- Verwaiste Datensätze: ${result.summary.orphanedRecords}`,
    `- Fehlerhafte Beziehungen: ${result.summary.invalidRelationships}`,
    `- Leicht behebbare Probleme: ${result.summary.quickFixes}`,
    '',
    '## Qualitätsverteilung',
    '',
    `- Exzellent: ${distribution.excellent}`,
    `- Gut: ${distribution.good}`,
    `- Gefährdet: ${distribution.atRisk}`,
    `- Kritisch: ${distribution.critical}`,
    '',
    '## Dublettenklassen',
    '',
    `- Sicher identisch: ${duplicateCounts.certain ?? 0}`,
    `- Sehr wahrscheinlich identisch: ${duplicateCounts.very_likely ?? 0}`,
    `- Möglicherweise identisch: ${duplicateCounts.possible ?? 0}`,
    `- Manuelle Prüfung: ${duplicateCounts.manual ?? 0}`,
    `- Eindeutig getrennt: ${duplicateCounts.separate ?? 0}`,
    '',
    '## Wichtigste Befunde',
    '',
    ...result.issues.slice(0, 50).map((issue) => `- **${issue.title}** (${issue.severity}, ${issue.entityType}${issue.entityId ? ` ${issue.entityId}` : ''}): ${issue.description}`),
    '',
    '## Sicherheit',
    '',
    '- Dieser Bericht ist eine reine Vorschau.',
    '- Es wurden keine Datensätze gelöscht, verändert oder zusammengeführt.',
    '- Es wurden keine Cloud-Schreibvorgänge ausgelöst.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}
