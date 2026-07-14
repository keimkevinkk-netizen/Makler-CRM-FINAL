export type NotificationType =
  | 'information'
  | 'reminder'
  | 'warning'
  | 'critical'
  | 'system_status'
  | 'conflict'
  | 'appointment'
  | 'follow_up'
  | 'sales_opportunity';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationStatus = 'unread' | 'read' | 'snoozed' | 'completed';

export type EscalationStage =
  | 'upcoming'
  | 'due'
  | 'overdue'
  | 'critical'
  | 'snoozed'
  | 'completed';

export type NotificationEntityType =
  | 'contact'
  | 'follow_up'
  | 'appointment'
  | 'property'
  | 'conflict'
  | 'document'
  | 'task'
  | 'transaction'
  | 'system';

export interface NotificationRecordReference {
  entityType: NotificationEntityType;
  entityId: string;
  label: string;
  contactId?: string;
  propertyId?: string;
}

export interface NotificationEscalation {
  stage: EscalationStage;
  previousStage?: EscalationStage;
  escalatedAt?: string;
  reason?: string;
}

export interface NotificationMetadata {
  sourceModule: string;
  coordinationKey?: string;
  relatedCount?: number;
  tags?: string[];
}

export interface VincereNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  record: NotificationRecordReference;
  reason: string;
  createdAt: string;
  dueAt?: string;
  recommendedAction: string;
  deduplicationKey: string;
  stateFingerprint: string;
  status: NotificationStatus;
  escalation: NotificationEscalation;
  metadata: NotificationMetadata;
  readAt?: string;
  snoozedUntil?: string;
  completedAt?: string;
}

export interface NotificationCandidate
  extends Omit<
    VincereNotification,
    'id' | 'createdAt' | 'status' | 'readAt' | 'snoozedUntil' | 'completedAt' | 'escalation'
  > {
  escalation: Omit<NotificationEscalation, 'previousStage' | 'escalatedAt'>;
}

export interface FollowUpNotificationInput {
  id: string;
  contactId: string;
  contactLabel: string;
  dueAt: string | null;
  completed: boolean;
  recommendedAction?: string;
}

export interface AppointmentNotificationInput {
  id: string;
  title: string;
  startsAt: string;
  contactId?: string;
  contactLabel?: string;
  propertyId?: string;
  preparationComplete: boolean;
  completed: boolean;
}

export interface ContactResponseNotificationInput {
  id: string;
  displayName: string;
  awaitingResponseSince: string | null;
  responseDueAt?: string | null;
  archived?: boolean;
}

export interface PropertyNotificationInput {
  id: string;
  title: string;
  active: boolean;
  contactId?: string;
  nextActionAt: string | null;
  nextActionLabel?: string | null;
}

export interface ConflictNotificationInput {
  id: string;
  recordType: NotificationEntityType;
  recordId: string;
  label: string;
  waitingSince: string;
  resolved: boolean;
  contactId?: string;
  propertyId?: string;
}

export interface MissingRequirementNotificationInput {
  id: string;
  parentType: Extract<NotificationEntityType, 'appointment' | 'property' | 'transaction'>;
  parentId: string;
  parentLabel: string;
  requirementType: Extract<NotificationEntityType, 'document' | 'task'>;
  requirementLabel: string;
  dueAt?: string | null;
  completed: boolean;
  contactId?: string;
  propertyId?: string;
}

export interface NotificationSystemStateInput {
  offline: boolean;
  syncFailedAt?: string | null;
  realtimeConnected: boolean | null;
  realtimeInterruptedAt?: string | null;
}

export interface NotificationSourceSnapshot {
  followUps?: FollowUpNotificationInput[];
  appointments?: AppointmentNotificationInput[];
  contacts?: ContactResponseNotificationInput[];
  properties?: PropertyNotificationInput[];
  conflicts?: ConflictNotificationInput[];
  missingRequirements?: MissingRequirementNotificationInput[];
  system?: NotificationSystemStateInput;
}

export interface NotificationEngineThresholds {
  followUpUpcomingMinutes: number;
  appointmentUpcomingMinutes: number;
  appointmentPreparationMinutes: number;
  contactResponseHours: number;
  conflictCriticalHours: number;
  syncCriticalMinutes: number;
  maxActivePerContact: number;
}

export interface NotificationEngineOptions {
  now: string;
  thresholds?: Partial<NotificationEngineThresholds>;
}

export interface NotificationEngineResult {
  notifications: VincereNotification[];
  emitted: VincereNotification[];
  updated: VincereNotification[];
  suppressed: NotificationCandidate[];
}

export interface NotificationCenterFilters {
  priorities?: NotificationPriority[];
  types?: NotificationType[];
  statuses?: NotificationStatus[];
  entityTypes?: NotificationEntityType[];
  search?: string;
}

export interface NotificationGroup {
  key: string;
  label: string;
  notifications: VincereNotification[];
  nextAction?: string;
}

export interface NotificationCenterModel {
  unread: VincereNotification[];
  today: VincereNotification[];
  critical: VincereNotification[];
  system: VincereNotification[];
  snoozed: VincereNotification[];
  completed: VincereNotification[];
  filtered: VincereNotification[];
  groups: NotificationGroup[];
}

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export interface WorkingTimeRange {
  start: string;
  end: string;
}

export interface NotificationPreferences {
  workingHours: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, WorkingTimeRange>>;
  quietHours?: WorkingTimeRange;
  channels: Record<NotificationChannel, boolean>;
  minimumPriority: NotificationPriority;
  dailySummary: boolean;
  immediateCritical: boolean;
}

export type DeliveryDecision = 'deliver_now' | 'queue_for_working_hours' | 'daily_summary' | 'muted';

export interface NotificationDeliveryPlan {
  decision: DeliveryDecision;
  channels: NotificationChannel[];
  reason: string;
  nextEligibleAt?: string;
}
