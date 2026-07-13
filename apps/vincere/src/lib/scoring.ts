import type { AppState, Contact, FollowUp } from '../types/domain';

export interface NextBestAction {
  id: string;
  contactId: string;
  title: string;
  reason: string;
  score: number;
  urgency: 'critical' | 'high' | 'normal';
  dueAt?: string;
}

const priorityWeight = { high: 30, medium: 16, low: 8 } as const;

export function scoreFollowUp(followUp: FollowUp, contact?: Contact): number {
  const overdueHours = Math.max(0, (Date.now() - new Date(followUp.dueAt).getTime()) / 3_600_000);
  const overdueScore = Math.min(35, overdueHours * 1.5);
  const potentialScore = contact ? contact.potential * 0.35 : 0;
  return Math.round(priorityWeight[followUp.priority] + overdueScore + potentialScore);
}

export function getNextBestActions(state: AppState): NextBestAction[] {
  return state.followUps
    .filter((item) => item.status === 'open')
    .map((followUp) => {
      const contact = state.contacts.find((item) => item.id === followUp.contactId);
      const score = scoreFollowUp(followUp, contact);
      const overdue = new Date(followUp.dueAt).getTime() < Date.now();
      return {
        id: followUp.id,
        contactId: followUp.contactId,
        title: contact ? `${contact.firstName} ${contact.lastName} anrufen` : followUp.title,
        reason: overdue
          ? `${followUp.title} ist überfällig und besitzt hohe Abschlussrelevanz.`
          : `${followUp.title} ist die nächste geplante Vertriebsaktion.`,
        score,
        urgency: overdue && followUp.priority === 'high' ? 'critical' : score >= 65 ? 'high' : 'normal',
        dueAt: followUp.dueAt,
      } satisfies NextBestAction;
    })
    .sort((a, b) => b.score - a.score);
}
