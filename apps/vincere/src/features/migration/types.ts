import type { Appointment, AuditEvent, CallEvent, Contact, FollowUp, Property } from '../../types/domain';

export type LegacySourceStatus = 'canonical' | 'parallel' | 'legacy' | 'reference';
export type LegacyEntityKind = 'contact' | 'activity' | 'followup' | 'property' | 'pipeline' | 'valuation' | 'market';
export type DuplicateCategory = 'certain' | 'probable' | 'manual' | 'separate';
export type MigrationSeverity = 'warning' | 'error';

export interface LegacySourceDefinition {
  key: string;
  status: LegacySourceStatus;
  entity: LegacyEntityKind;
  priority: number;
  description: string;
}

export interface DetectedLegacySource extends LegacySourceDefinition {
  count: number;
  shape: 'array' | 'object' | 'empty' | 'invalid';
}

export type SafeJsonObject = Record<string, unknown>;

export interface LegacyRecordEnvelope {
  sourceKey: string;
  sourceIndex: number;
  sourceStatus: LegacySourceStatus;
  sourcePriority: number;
  value: SafeJsonObject;
}

export interface MigrationIssue {
  severity: MigrationSeverity;
  code: string;
  message: string;
  sourceKey?: string;
  sourceIndex?: number;
  field?: string;
}

export interface UnresolvedRelationship {
  sourceKey: string;
  sourceIndex: number;
  relationship: 'contact' | 'owner' | 'buyer' | 'referrer';
  legacyReference?: string;
  candidateContactIds: string[];
  reason: string;
}

export interface DuplicateCandidate {
  entity: 'contact' | 'property';
  category: DuplicateCategory;
  recordIds: string[];
  reasons: string[];
  autoMergedInto?: string;
}

export interface LegacyActivityExtension {
  id: string;
  contactId?: string;
  type: string;
  title: string;
  note?: string;
  occurredAt?: string;
  sourceKey: string;
}

export interface LegacyPipelineExtension {
  id: string;
  contactId?: string;
  title: string;
  stage: string;
  value?: number;
  nextActionAt?: string;
  sourceKey: string;
  rawStatus?: string;
}

export interface LegacyValuationExtension {
  id: string;
  contactId?: string;
  propertyId?: string;
  title: string;
  status: string;
  estimatedValue?: number;
  appointmentAt?: string;
  sourceKey: string;
}

export interface LegacyMarketObservationExtension {
  id: string;
  title: string;
  address?: string;
  city?: string;
  propertyType?: string;
  askingPrice?: number;
  observedAt?: string;
  sourceKey: string;
}

export interface VincereImportRecords {
  contacts: Contact[];
  followUps: FollowUp[];
  properties: Property[];
  appointments: Appointment[];
  callEvents: CallEvent[];
  auditEvents: AuditEvent[];
}

export interface VincereImportExtensions {
  activities: LegacyActivityExtension[];
  pipelineEntries: LegacyPipelineExtension[];
  valuationOpportunities: LegacyValuationExtension[];
  marketObservations: LegacyMarketObservationExtension[];
}

export interface VincereImportPackage {
  format: 'vincere-legacy-import-package';
  formatVersion: 1;
  sourceFingerprint: string;
  records: VincereImportRecords;
  extensions: VincereImportExtensions;
  migration: {
    sourceKeys: string[];
    issues: MigrationIssue[];
    duplicates: DuplicateCandidate[];
    unresolvedRelationships: UnresolvedRelationship[];
    deterministic: true;
    cloudWriteAllowed: false;
  };
}

export interface MigrationPreview {
  fileName: string;
  sourceFingerprint: string;
  sources: DetectedLegacySource[];
  package: VincereImportPackage;
  report: string;
}
