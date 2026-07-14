import type { UserRole } from '../../types/domain';

export type PersonalDataCategory =
  | 'contacts'
  | 'phone_numbers'
  | 'email_addresses'
  | 'addresses'
  | 'conversation_notes'
  | 'follow_ups'
  | 'appointments'
  | 'properties'
  | 'call_events'
  | 'audit_data'
  | 'external_provider_data';

export type ProcessingPurpose =
  | 'contract_initiation'
  | 'customer_care'
  | 'legitimate_interest'
  | 'consent'
  | 'legal_obligation'
  | 'unresolved';

export type ConsentChannel = 'email' | 'phone' | 'messaging' | 'marketing';
export type ConsentDecision = 'allowed' | 'not_allowed' | 'withdrawn' | 'unknown';

export interface PurposeRecord {
  purpose: ProcessingPurpose;
  recordedAt?: string;
  source?: string;
  note?: string;
}

export interface ConsentRecord {
  decision: ConsentDecision;
  recordedAt?: string;
  source?: string;
  evidenceReference?: string;
}

export interface ContactPrivacyMetadata {
  workspaceId: string;
  contactId: string;
  purposes?: PurposeRecord[];
  consents?: Partial<Record<ConsentChannel, ConsentRecord>>;
  dataOrigin?: string;
  originRecordedAt?: string;
  notesReviewedAt?: string;
  processingRestricted?: boolean;
  restrictionReason?: string;
}

export interface DataInventoryItem {
  category: PersonalDataCategory;
  label: string;
  recordSource: string;
  fields: string[];
  purposeStatus: 'requires_mapping' | 'partially_mapped';
  exportRelevant: boolean;
  containsFreeText: boolean;
  externalProvider: boolean;
  notes: string;
}

export type PrivacyFindingCode =
  | 'consent_unknown'
  | 'consent_withdrawn'
  | 'consent_evidence_missing'
  | 'long_inactivity'
  | 'purpose_unresolved'
  | 'data_origin_missing'
  | 'note_review_missing'
  | 'stale_notes'
  | 'orphaned_record'
  | 'deletion_review_required';

export interface PrivacyFinding {
  id: string;
  code: PrivacyFindingCode;
  severity: 'high' | 'medium' | 'low';
  contactId?: string;
  relatedRecordId?: string;
  category: PersonalDataCategory;
  title: string;
  explanation: string;
  legalDecisionRequired: boolean;
}

export interface ConsentView {
  channel: ConsentChannel;
  decision: ConsentDecision;
  recordedAt?: string;
  source?: string;
  evidenceReference?: string;
  evidenceMissing: boolean;
}

export interface ContactPrivacyAssessment {
  contactId: string;
  workspaceId: string;
  inactiveDays: number;
  lastRelevantActivityAt: string;
  purposes: PurposeRecord[];
  purposeUnresolved: boolean;
  consents: ConsentView[];
  dataOrigin?: string;
  hasActiveOperationalContext: boolean;
  exportRelevantRecordCount: number;
  deletionReviewRequired: boolean;
  findings: PrivacyFinding[];
}

export interface PrivacyRuleConfig {
  longInactiveDays: number;
  deletionReviewDays: number;
  staleNoteDays: number;
}

export interface PrivacyAuditEntry {
  id: string;
  workspaceId: string;
  actorId: string;
  actorRole: UserRole | 'unknown';
  entity: string;
  entityId?: string;
  action: string;
  summary: string;
  occurredAt: string;
}

export interface PrivacyComplianceReport {
  workspaceId: string;
  generatedAt: string;
  inventory: DataInventoryItem[];
  contacts: ContactPrivacyAssessment[];
  findings: PrivacyFinding[];
  auditTrail: PrivacyAuditEntry[];
  summary: {
    contactsReviewed: number;
    highFindings: number;
    mediumFindings: number;
    unknownConsentContacts: number;
    withdrawnConsentContacts: number;
    deletionReviewCandidates: number;
    orphanedRecords: number;
  };
}

export type SubjectRequestType =
  | 'access'
  | 'export'
  | 'rectification'
  | 'restriction'
  | 'erasure'
  | 'objection'
  | 'consent_withdrawal';

export interface SubjectRequestInput {
  workspaceId: string;
  contactId: string;
  requestType: SubjectRequestType;
  requestedAt: string;
  actorId: string;
  actorRole: UserRole;
}

export interface SubjectRequestPreview {
  workspaceId: string;
  contactId: string;
  requestType: SubjectRequestType;
  generatedAt: string;
  status: 'preview_only';
  canPrepare: boolean;
  permissionReason?: string;
  recordGroups: Array<{
    category: PersonalDataCategory;
    recordCount: number;
    fields: string[];
  }>;
  blockers: string[];
  recommendedSteps: string[];
  requiresLegalDecision: boolean;
  payloadProduced: false;
  deletionExecuted: false;
}
