import type { PrivacyComplianceReport, PrivacyFinding, SubjectRequestType } from '../../domain/privacy/privacyTypes';

export const subjectRequestLabels: Record<SubjectRequestType, string> = {
  access: 'Datenauskunft',
  export: 'Datenexport',
  rectification: 'Berichtigung',
  restriction: 'Einschränkung',
  erasure: 'Löschanfrage',
  objection: 'Widerspruch',
  consent_withdrawal: 'Einwilligungswiderruf',
};

export const findingLabels: Record<PrivacyFinding['code'], string> = {
  consent_unknown: 'Einwilligung unbekannt',
  consent_withdrawn: 'Einwilligung widerrufen',
  consent_evidence_missing: 'Einwilligungsnachweis fehlt',
  long_inactivity: 'Lange Inaktivität',
  purpose_unresolved: 'Zweck ungeklärt',
  data_origin_missing: 'Datenherkunft fehlt',
  note_review_missing: 'Notizprüfung fehlt',
  stale_notes: 'Notiz veraltet',
  orphaned_record: 'Nicht zuordenbarer Datensatz',
  deletion_review_required: 'Löschprüfung erforderlich',
};

export function buildPrivacyDashboardView(report: PrivacyComplianceReport) {
  const topFindings = report.findings.slice(0, 25);
  return {
    metrics: [
      { label: 'Kontakte geprüft', value: report.summary.contactsReviewed },
      { label: 'Kritische Prüfhinweise', value: report.summary.highFindings },
      { label: 'Einwilligung unbekannt', value: report.summary.unknownConsentContacts },
      { label: 'Löschprüfung', value: report.summary.deletionReviewCandidates },
    ],
    topFindings,
    inventoryCoverage: report.inventory.map((item) => ({
      category: item.category,
      label: item.label,
      fieldCount: item.fields.length,
      exportRelevant: item.exportRelevant,
      status: item.purposeStatus,
    })),
  };
}
