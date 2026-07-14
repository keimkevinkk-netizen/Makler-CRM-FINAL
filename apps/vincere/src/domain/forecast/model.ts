import type { ContactStage, UserRole } from '../../types/domain';

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'rolling30';

export interface DateRange {
  start: number;
  end: number;
  label: string;
}

export interface MetricComparison {
  current: number;
  previous: number | null;
  delta: number | null;
  deltaPercent: number | null;
  comparable: boolean;
  note?: string;
}

export interface SalesKpis {
  activeContacts: number;
  newContacts: number;
  ownerContacts: number;
  openFollowUps: number;
  overdueFollowUps: number;
  calls: number;
  conversations: number;
  conversationRate: number | null;
  appointments: number;
  appointmentRate: number | null;
  valuationOpportunities: number;
  activeProperties: number;
  contactsWithoutNextAction: number;
  highPriorityUntouched: number;
  averageContactPauseDays: number | null;
  contactsMissingContactHistory: number;
  dataQualityPercent: number;
  mandateContacts: number;
  soldContacts: number;
}

export interface FunnelStageAnalysis {
  id: ContactStage;
  label: string;
  count: number;
  documentedEntries: number | null;
  stalledCount: number;
  withoutNextAction: number;
  averageDwellDays: number | null;
  dwellCoverage: number;
  bottleneck: 'none' | 'watch' | 'critical';
  nextMeasure: string;
}

export interface ForecastItem {
  id: string;
  propertyId: string;
  contactId?: string;
  title: string;
  contactName: string;
  stage: ContactStage | 'unlinked';
  propertyStatus: string;
  workValue: number;
  orientationFactor: number;
  weightedValue: number;
  evidenceCoverage: number;
  formula: string;
  usedData: string[];
  missingFactors: string[];
  uncertainty: 'niedrig' | 'mittel' | 'hoch';
  actions: string[];
}

export interface ForecastSummary {
  securedPipelineValue: number;
  weightedOrientationValue: number;
  qualifiedLowerBound: number;
  opportunityUpperBound: number;
  activePropertyCount: number;
  possibleChanceCount: number;
  insufficientDataCount: number;
  invalidValueCount: number;
  items: ForecastItem[];
  methodology: string[];
}

export interface SalesControlSnapshot {
  generatedAt: number;
  period: DateRange;
  previousPeriod: DateRange;
  kpis: SalesKpis;
  comparisons: {
    newContacts: MetricComparison;
    calls: MetricComparison;
    conversations: MetricComparison;
    appointments: MetricComparison;
    conversationRate: MetricComparison;
    appointmentRate: MetricComparison;
  };
  funnel: FunnelStageAnalysis[];
  forecast: ForecastSummary;
  pipelineDistribution: Record<ContactStage, number>;
  risks: string[];
  recommendations: string[];
  historicalWarnings: string[];
  invalidDateCount: number;
}

export interface ScenarioInput {
  annualGoal: number;
  monthlyGoal: number;
  averagePropertyValue: number;
  effectiveCommissionRate: number;
  contactToConversationRate: number;
  conversationToAppointmentRate: number;
  appointmentToMandateRate: number;
  mandateToSaleRate: number;
  availableWorkDays: number;
}

export interface ScenarioRequirement {
  monthlyRevenueGoal: number;
  revenuePerClosing: number;
  closings: number;
  mandates: number;
  appointments: number;
  conversations: number;
  contacts: number;
  daily: {
    contacts: number;
    conversations: number;
    appointments: number;
    mandates: number;
  };
  weekly: {
    contacts: number;
    conversations: number;
    appointments: number;
    mandates: number;
  };
  formulas: string[];
  issues: string[];
}

export interface AnalyticsCapabilities {
  readOnlyWorkspace: boolean;
  canEditLocalScenario: boolean;
  scenarioPersistence: 'none';
}

export function getAnalyticsCapabilities(role: UserRole): AnalyticsCapabilities {
  return {
    readOnlyWorkspace: role === 'viewer',
    canEditLocalScenario: true,
    scenarioPersistence: 'none',
  };
}
