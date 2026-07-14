import { createMockAiProvider } from '../../services/ai/mockProvider';
import { buildConversationDebrief, buildConversationPreparation } from './salesCoachEngine';
import type { ConversationDebriefInput, SalesCoachContext } from './salesCoachTypes';

export function createSalesCoachMockProvider() {
  return createMockAiProvider({
    latencyMs: 80,
    handlers: {
      conversation_preparation: (input) => buildConversationPreparation(input as SalesCoachContext),
      conversation_debrief: (input) => buildConversationDebrief(input as ConversationDebriefInput),
    },
  });
}
