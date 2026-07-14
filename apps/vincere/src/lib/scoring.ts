import {
  prioritizeActions,
  type PrioritizedAction,
} from '../domain/next-best-action/engine';
import type { AppState, Contact, FollowUp } from '../types/domain';

export type NextBestAction = PrioritizedAction;

function scoringState(followUp: FollowUp, contact?: Contact): AppState {
  const normalizedContact = contact ? { ...contact, id: followUp.contactId } : undefined;
  return {
    schemaVersion: 1,
    workspace: {
      id: 'scoring-workspace',
      name: 'Scoring',
      region: '',
      createdAt: '1970-01-01T00:00:00.000Z',
    },
    currentUser: {
      id: 'scoring-user',
      workspaceId: 'scoring-workspace',
      name: 'Scoring',
      email: '',
      role: 'viewer',
    },
    contacts: normalizedContact ? [normalizedContact] : [],
    followUps: [followUp],
    properties: [],
    appointments: [],
    callEvents: [],
    auditEvents: [],
  };
}

export function scoreFollowUp(followUp: FollowUp, contact?: Contact, now = Date.now()): number {
  return prioritizeActions(scoringState(followUp, contact), now)[0]?.score ?? 0;
}

export function getNextBestActions(state: AppState, now = Date.now()): NextBestAction[] {
  return prioritizeActions(state, now);
}
