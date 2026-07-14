import type { CallEvent, Contact, FollowUp } from '../../types/domain';

export type ConversationModeId =
  | 'owner_first_contact'
  | 'owner_follow_up'
  | 'valuation_appointment'
  | 'referral_partner'
  | 'buyer_qualification'
  | 'network_conversation'
  | 'reactivation'
  | 'objection_handling';

export type ConversationStepId =
  | 'opening'
  | 'needs'
  | 'situation'
  | 'motivation'
  | 'problem'
  | 'consequence'
  | 'solution'
  | 'trust'
  | 'next_step'
  | 'close';

export interface ConversationStep {
  id: ConversationStepId;
  label: string;
  objective: string;
  guidance: string;
  prompt: string;
  listenFor: string[];
}

export interface ConversationMode {
  id: ConversationModeId;
  label: string;
  shortLabel: string;
  description: string;
  minimumGoal: string;
  idealGoal: string;
  steps: ConversationStep[];
}

export interface ObjectionGuide {
  id: string;
  objection: string;
  type: string;
  possibleMotive: string;
  followUpQuestion: string;
  responseStrategy: string;
  unsuitableReaction: string;
  realisticGoal: string;
}

export interface SalesCoachContext {
  contact?: Contact;
  followUps: FollowUp[];
  callEvents: CallEvent[];
  modeId: ConversationModeId;
  now?: Date;
}

export interface ConversationPreparation {
  contactSummary: string;
  role: string;
  lastContact: string;
  openFollowUps: string[];
  knownInterests: string[];
  possibleGoals: string[];
  opening: string;
  openQuestions: string[];
  likelyObjections: string[];
  minimumGoal: string;
  idealGoal: string;
  unknownFields: string[];
  evidence: string[];
}

export interface ConversationDebriefInput {
  contact?: Contact;
  outcome: CallEvent['outcome'];
  summary?: string;
  motivation?: string;
  objections?: string[];
  nextStep?: string;
  missingInformation?: string[];
  followUpDate?: string;
}

export type SalesRisk = 'low' | 'medium' | 'high';

export interface ConversationDebrief {
  result: string;
  conversationSummary: string;
  detectedMotivation: string;
  detectedObjections: string[];
  nextStep: string;
  followUpSuggestion: string;
  appointmentNeeded: boolean;
  missingInformation: string[];
  recommendedMessage: string;
  salesRisk: SalesRisk;
  riskReason: string;
}
