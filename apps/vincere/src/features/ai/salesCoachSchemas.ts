import type { AiResponseSchema } from '../../services/ai/types';
import type { ConversationDebrief, ConversationPreparation } from './salesCoachTypes';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Die Antwort ist kein Objekt.');
  return value as Record<string, unknown>;
}

function strings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new Error(`${field} muss eine Textliste sein.`);
  return value;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`${field} muss Text sein.`);
  return value;
}

export const conversationPreparationSchema: AiResponseSchema<ConversationPreparation> = {
  name: 'vincere.conversation_preparation.v1',
  parse(value) {
    const data = object(value);
    return {
      contactSummary: text(data.contactSummary, 'contactSummary'),
      role: text(data.role, 'role'),
      lastContact: text(data.lastContact, 'lastContact'),
      openFollowUps: strings(data.openFollowUps, 'openFollowUps'),
      knownInterests: strings(data.knownInterests, 'knownInterests'),
      possibleGoals: strings(data.possibleGoals, 'possibleGoals'),
      opening: text(data.opening, 'opening'),
      openQuestions: strings(data.openQuestions, 'openQuestions'),
      likelyObjections: strings(data.likelyObjections, 'likelyObjections'),
      minimumGoal: text(data.minimumGoal, 'minimumGoal'),
      idealGoal: text(data.idealGoal, 'idealGoal'),
      unknownFields: strings(data.unknownFields, 'unknownFields'),
      evidence: strings(data.evidence, 'evidence'),
    };
  },
};

export const conversationDebriefSchema: AiResponseSchema<ConversationDebrief> = {
  name: 'vincere.conversation_debrief.v1',
  parse(value) {
    const data = object(value);
    if (!['low', 'medium', 'high'].includes(String(data.salesRisk))) throw new Error('salesRisk ist ungültig.');
    return {
      result: text(data.result, 'result'),
      conversationSummary: text(data.conversationSummary, 'conversationSummary'),
      detectedMotivation: text(data.detectedMotivation, 'detectedMotivation'),
      detectedObjections: strings(data.detectedObjections, 'detectedObjections'),
      nextStep: text(data.nextStep, 'nextStep'),
      followUpSuggestion: text(data.followUpSuggestion, 'followUpSuggestion'),
      appointmentNeeded: Boolean(data.appointmentNeeded),
      missingInformation: strings(data.missingInformation, 'missingInformation'),
      recommendedMessage: text(data.recommendedMessage, 'recommendedMessage'),
      salesRisk: data.salesRisk as ConversationDebrief['salesRisk'],
      riskReason: text(data.riskReason, 'riskReason'),
    };
  },
};
