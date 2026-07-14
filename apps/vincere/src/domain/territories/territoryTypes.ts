import type { ContactStage } from '../../types/domain';

export const territorySegments = [
  'Kernfestung',
  'Volumenmaschine',
  'Hochpreis',
  'Erweiterungsring',
  'selektive Bearbeitung',
] as const;

export type TerritorySegment = (typeof territorySegments)[number];
export type MarketDataQuality = 'verified' | 'partial' | 'missing';

export interface MarketDataStatus {
  quality: MarketDataQuality;
  sourceCount: number;
  lastVerifiedAt?: string;
  note?: string;
}

export interface TerritoryDefinition {
  name: string;
  segment: TerritorySegment;
  strategicWeight: number;
  rationale: string;
  operatingFocus: string;
}

export interface TerritoryScoreFactor {
  key:
    | 'strategy'
    | 'activeContacts'
    | 'ownerPotential'
    | 'unattendedOpportunities'
    | 'overdueTasks'
    | 'activeProperties'
    | 'inactivity'
    | 'marketData';
  label: string;
  points: number;
  maxPoints: number;
  explanation: string;
}

export interface TerritoryMetrics {
  contacts: number;
  activeContacts: number;
  ownerContacts: number;
  networkContacts: number;
  soldContacts: number;
  activeProperties: number;
  valuationOpportunities: number;
  openFollowUps: number;
  overdueFollowUps: number;
  activeAppointments: number;
  contactsWithoutNextAction: number;
  ownerContactsWithoutNextAction: number;
  lastActivityAt?: string;
  daysSinceActivity?: number;
  pipelineDistribution: Record<ContactStage, number>;
  operationalDataQuality: number;
  marketData: MarketDataStatus;
}

export interface TerritoryInsight {
  name: string;
  supported: boolean;
  segment: TerritorySegment;
  rationale: string;
  operatingFocus: string;
  metrics: TerritoryMetrics;
  priorityScore: number;
  priorityLevel: 'high' | 'medium' | 'low';
  scoreFactors: TerritoryScoreFactor[];
  recommendedActions: string[];
  risks: string[];
}
