import type { Appointment, AuditEvent, CallEvent, Contact, FollowUp, Property } from '../../types/domain';

export type DataQualitySeverity = 'critical' | 'warning' | 'info';
export type DataQualityCategory = 'completeness' | 'contactability' | 'duplicate' | 'relationship' | 'consistency' | 'timing' | 'assignment';
export type DataQualityEntity = 'contact' | 'followup' | 'property' | 'appointment' | 'call' | 'workspace';
export type DataQualityConfidence = 'certain' | 'high' | 'medium' | 'low';
export type DuplicateCategory = 'certain' | 'very_likely' | 'possible' | 'manual' | 'separate';

export interface DataQualityInput {
  contacts: readonly Contact[];
  followUps: readonly FollowUp[];
  properties: readonly Property[];
  appointments: readonly Appointment[];
  callEvents: readonly CallEvent[];
  auditEvents?: readonly AuditEvent[];
}

export interface DataQualityAnalysisOptions {
  now?: string;
  staleAfterDays?: number;
  criticalStaleAfterDays?: number;
  highPotentialThreshold?: number;
  maxDuplicateAssessments?: number;
}

export interface DuplicateFactor {
  code: 'id' | 'phone' | 'email' | 'name' | 'name_variant' | 'address' | 'city' | 'shared_property' | 'source' | 'phone_conflict' | 'email_conflict' | 'city_conflict';
  label: string;
  contribution: number;
  matched: boolean;
  explanation: string;
}

export interface DuplicateAssessment {
  id: string;
  primaryContactId: string;
  candidateContactId: string;
  primaryRecordIndex: number;
  candidateRecordIndex: number;
  category: DuplicateCategory;
  score: number;
  factors: DuplicateFactor[];
}

export interface DataQualityIssue {
  id: string;
  code: string;
  category: DataQualityCategory;
  severity: DataQualitySeverity;
  entityType: DataQualityEntity;
  entityId?: string;
  relatedEntityIds: string[];
  field?: string;
  title: string;
  description: string;
  currentValue?: unknown;
}

export type CorrectionAction =
  | 'normalize_phone'
  | 'normalize_email'
  | 'compact_whitespace'
  | 'standardize_spelling'
  | 'link_contact'
  | 'group_duplicates'
  | 'flag_orphan'
  | 'create_next_action'
  | 'remove_invalid_relationship';

export interface CorrectionSuggestion {
  id: string;
  action: CorrectionAction;
  entityType: DataQualityEntity;
  entityId: string;
  field?: string;
  oldValue: unknown;
  proposedValue: unknown;
  reason: string;
  confidence: DataQualityConfidence;
  sideEffects: string[];
}

export interface MergeFieldComparison {
  field: keyof Contact;
  primaryValue: unknown;
  duplicateValue: unknown;
  proposedValue: unknown;
  conflict: boolean;
  rationale: string;
}

export interface MergeRelationshipTransfer {
  entityType: Exclude<DataQualityEntity, 'workspace' | 'contact'>;
  entityId: string;
  relationshipField: string;
  fromContactId: string;
  toContactId: string;
}

export interface ContactMergePreview {
  id: string;
  assessmentId: string;
  primaryContactId: string;
  duplicateContactId: string;
  category: DuplicateCategory;
  confidence: DataQualityConfidence;
  fields: MergeFieldComparison[];
  conflicts: MergeFieldComparison[];
  relationshipTransfers: MergeRelationshipTransfer[];
  lostInformation: string[];
  manualDecisions: string[];
  mutatesData: false;
}

export interface QualityDistribution {
  excellent: number;
  good: number;
  atRisk: number;
  critical: number;
}

export interface DataQualitySummary {
  overallScore: number;
  criticalErrors: number;
  duplicates: number;
  incompleteContacts: number;
  orphanedRecords: number;
  invalidRelationships: number;
  quickFixes: number;
  qualityDistribution: QualityDistribution;
}

export interface DataQualityResult {
  generatedAt: string;
  deterministic: true;
  mutatesData: false;
  summary: DataQualitySummary;
  issues: DataQualityIssue[];
  suggestions: CorrectionSuggestion[];
  duplicateAssessments: DuplicateAssessment[];
  mergePreviews: ContactMergePreview[];
}
