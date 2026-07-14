import type { UserRole } from '../../types/domain';
import type { TerritoryInsight, TerritorySegment } from '../territories/territoryTypes';

export type CampaignType =
  | 'owner-outreach'
  | 'referral'
  | 'neighborhood'
  | 'valuation'
  | 'reactivation'
  | 'network'
  | 'market-information'
  | 'existing-customer';

export type CampaignChannel = 'Telefon' | 'Persönlich' | 'E-Mail einzeln' | 'Brief' | 'Netzwerktermin';

export interface CampaignTemplate {
  id: CampaignType;
  name: string;
  objective: string;
  targetGroup: string;
  recommendedSegments: TerritorySegment[];
  recommendedChannel: CampaignChannel;
  durationDays: number;
  tasks: string[];
  successCriteria: string[];
  exclusionCriteria: string[];
  risks: string[];
  legalNotes: string[];
}

export interface CampaignRecommendationFilter {
  query?: string;
  eligibility?: 'all' | 'eligible' | 'blocked';
  channel?: CampaignChannel | 'all';
}

export interface CampaignRecommendation {
  template: CampaignTemplate;
  fitScore: number;
  eligible: boolean;
  reasons: string[];
  blockers: string[];
}

export interface CampaignWorkbench {
  territory: TerritoryInsight;
  template: CampaignTemplate;
  targetCount: number;
  excludedCount: number;
  dataQuality: number;
  recommendedChannel: CampaignChannel;
  tasks: string[];
  durationDays: number;
  successCriteria: string[];
  exclusionCriteria: string[];
  risks: string[];
  legalNotes: string[];
  sendMode: 'disabled';
  requiresManualApproval: true;
  editable: boolean;
}

export interface WeeklyPlanEntry {
  day: 'Montag' | 'Dienstag' | 'Mittwoch' | 'Donnerstag' | 'Freitag' | 'Wochenende';
  territory: string;
  activity: string;
  targetContacts: number;
  followUps: number;
  networkAppointments: number;
  campaignTasks: string[];
  review: string;
}

export interface WeeklyTerritoryPlan {
  focusTerritory: TerritoryInsight;
  campaign?: CampaignRecommendation;
  entries: WeeklyPlanEntry[];
  generatedFrom: string[];
  persisted: false;
  editable: boolean;
}

export function canEditCampaignWorkbench(role: UserRole) {
  return role !== 'viewer';
}
