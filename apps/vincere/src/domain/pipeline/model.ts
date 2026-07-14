import type {
  Appointment,
  CallEvent,
  Contact,
  ContactStage,
  FollowUp,
  Property,
} from '../../types/domain';

export type PipelineViewStage = ContactStage | 'inactive';
export type PipelineRiskKey =
  | 'no_next_action'
  | 'appointment_without_preparation'
  | 'valuation_without_followup'
  | 'mandate_without_decision'
  | 'stagnant'
  | 'incomplete_data'
  | 'closing_without_followup'
  | 'broken_relationship';

export interface PipelineStageDefinition {
  id: PipelineViewStage;
  label: string;
  subtitle: string;
  order: number;
}

export interface OpportunityFactor {
  key: string;
  label: string;
  detail: string;
  points: number;
}

export interface MandateOpportunity {
  id: string;
  contact: Contact;
  stage: PipelineViewStage;
  stageLabel: string;
  actionValue: number;
  factors: OpportunityFactor[];
  reason: string;
  reasons: string[];
  lastActivityAt?: string;
  lastActivityLabel: string;
  nextAction?: FollowUp;
  nextActionAt?: string;
  risks: string[];
  riskKeys: PipelineRiskKey[];
  missingData: string[];
  recommendedAction: string;
  minimumGoal: string;
  idealGoal: string;
  properties: Property[];
  appointments: Appointment[];
  calls: CallEvent[];
  openFollowUps: FollowUp[];
  knownObjections: string[];
  isOverdue: boolean;
  observedInactivityDays?: number;
}

export interface PipelineStageHealth {
  stage: PipelineViewStage;
  label: string;
  count: number;
  knownPropertyValue: number;
  contactsWithoutProgress: number;
  contactsWithoutNextAction: number;
  overdueOpportunities: number;
  averageObservedInactivityDays?: number;
  averageDwellDays?: number;
  dwellDataAvailable: boolean;
}

export interface PipelineHealth {
  totalContacts: number;
  activeOpportunities: number;
  knownPropertyValue: number;
  stages: PipelineStageHealth[];
  contactsWithoutProgress: number;
  opportunitiesWithoutNextAction: number;
  overdueOpportunities: number;
  upcomingAppointments: number;
  earlyToAdvancedRatio?: number;
  bottlenecks: string[];
  relationshipErrors: string[];
  limitations: string[];
}

export interface PipelineCockpitModel {
  generatedAt: string;
  stages: PipelineStageDefinition[];
  opportunities: MandateOpportunity[];
  focusOpportunities: MandateOpportunity[];
  health: PipelineHealth;
}

export interface PipelineCapabilities {
  canMovePipeline: boolean;
  canManageFollowUps: boolean;
  canLogCalls: boolean;
  readOnly: boolean;
}

export const PIPELINE_STAGES: PipelineStageDefinition[] = [
  { id: 'lead', label: 'Neu', subtitle: 'Noch nicht qualifiziert', order: 0 },
  { id: 'qualified', label: 'Qualifiziert', subtitle: 'Bedarf oder Potenzial bestätigt', order: 1 },
  { id: 'appointment', label: 'Termin', subtitle: 'Bewertung oder Beratung geplant', order: 2 },
  { id: 'mandate', label: 'Mandat', subtitle: 'Auftrag oder Abschlussphase', order: 3 },
  { id: 'sold', label: 'Verkauft', subtitle: 'Erfolgreich abgeschlossen', order: 4 },
  { id: 'inactive', label: 'Verloren / inaktiv', subtitle: 'Aus vorhandenen Signalen ableitbar', order: 5 },
];

export const PIPELINE_STAGE_ORDER = new Map(PIPELINE_STAGES.map((stage) => [stage.id, stage.order]));
export const PIPELINE_STAGE_LABEL = new Map(PIPELINE_STAGES.map((stage) => [stage.id, stage.label]));
