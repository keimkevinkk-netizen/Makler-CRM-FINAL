export type TrainingScenarioId =
  | 'owner_first_contact'
  | 'private_sale_attempt'
  | 'commission_objection'
  | 'existing_agent'
  | 'nonbinding_valuation'
  | 'no_current_sale_intent'
  | 'later_callback'
  | 'difficult_contact'
  | 'appointment_booking'
  | 'closing_question'
  | 'referral_request'
  | 'network_partner';

export type TrainingCategory =
  | 'owner_acquisition'
  | 'objection_handling'
  | 'appointment'
  | 'closing'
  | 'network'
  | 'qualification';

export type TrainingDifficulty = 1 | 2 | 3 | 4 | 5;

export interface TrainingScenario {
  id: TrainingScenarioId;
  order: number;
  title: string;
  category: TrainingCategory;
  difficulty: TrainingDifficulty;
  openingSituation: string;
  partnerProfile: string;
  primaryGoal: string;
  minimumGoal: string;
  objections: string[];
  allowedFacts: string[];
  unknownFacts: string[];
  successCriteria: string[];
  failureCriteria: string[];
  quickReplies: string[];
}

export type LearningPathId =
  | 'beginner'
  | 'owner_acquisition'
  | 'objection_handling'
  | 'appointment_closing'
  | 'network'
  | 'mandate_winning'
  | 'advanced'
  | 'exam';

export interface LearningPath {
  id: LearningPathId;
  label: string;
  description: string;
  scenarioIds: TrainingScenarioId[];
  recommendedMinimumScore: number;
}

export type EvaluationDimensionId =
  | 'opening'
  | 'questioning'
  | 'needs_discovery'
  | 'listening'
  | 'objection_handling'
  | 'benefit_argumentation'
  | 'trust_building'
  | 'goal_orientation'
  | 'next_step'
  | 'closing';

export interface DimensionScore {
  id: EvaluationDimensionId;
  label: string;
  score: number;
  evidence: string[];
}

export type EvaluationFlag =
  | 'empty_response'
  | 'invented_fact'
  | 'aggressive_language'
  | 'unlawful_promise'
  | 'manipulative_language'
  | 'legally_problematic_statement'
  | 'missing_closing_goal'
  | 'unclear_next_action'
  | 'early_argumentation';

export interface TrainingEvaluation {
  totalScore: number;
  result: 'insufficient' | 'developing' | 'solid' | 'strong';
  dimensions: DimensionScore[];
  flags: EvaluationFlag[];
  strengths: string[];
  improvements: string[];
  missedQuestions: string[];
  earlyArgumentation: boolean;
  unclearNextAction: boolean;
  problematicPhrases: string[];
  betterExample: string;
  repeatRecommendation: string;
}

export interface TrainingProgress {
  pathId: LearningPathId;
  completed: number;
  total: number;
  percent: number;
  nextScenarioId?: TrainingScenarioId;
}

export interface TrainingCatalogState {
  isEmpty: boolean;
  scenarioCount: number;
  pathCount: number;
  orderedScenarioIds: TrainingScenarioId[];
}
