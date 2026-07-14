import type {
  CalendarEntry,
  CommunicationDirection,
  EmailMessage,
  MessagingEvent,
  PhoneEvent,
} from '../../integrations/communications/contracts';
import type { ContactMatchCategory, ContactMatchResult } from './contactMatching';

export type CommunicationTimelineChannel = 'email' | 'message' | 'phone' | 'appointment' | 'crm';
export type CommunicationTimelineStatus =
  | 'unread'
  | 'received'
  | 'sent'
  | 'missed'
  | 'answered'
  | 'cancelled'
  | 'scheduled'
  | 'completed'
  | 'open';

export interface CrmActivityInput {
  id: string;
  contactId?: string;
  occurredAt: string;
  title: string;
  summary: string;
  status?: 'open' | 'completed';
}

export interface CommunicationTimelineItem {
  id: string;
  sourceId: string;
  providerKey: string;
  channel: CommunicationTimelineChannel;
  direction: CommunicationDirection;
  occurredAt: string;
  title: string;
  summary: string;
  status: CommunicationTimelineStatus;
  unread: boolean;
  contactLabel: string;
  contactMatchCategory: ContactMatchCategory;
  contactId?: string;
  suggestedContactId?: string;
  requiresManualReview: boolean;
  metadata: Record<string, string | number | boolean | null>;
}

export interface CommunicationTimelineInput {
  providerKey: string;
  emails?: EmailMessage[];
  messages?: MessagingEvent[];
  phoneEvents?: PhoneEvent[];
  calendarEntries?: CalendarEntry[];
  crmActivities?: CrmActivityInput[];
  matches?: Record<string, ContactMatchResult>;
}

const channelRank: Record<CommunicationTimelineChannel, number> = {
  email: 1,
  message: 2,
  phone: 3,
  appointment: 4,
  crm: 5,
};

const unknownMatch: ContactMatchResult = {
  category: 'unknown',
  candidateContactIds: [],
  autoAssignable: false,
  reasons: ['Noch keine Kontaktzuordnung vorhanden.'],
  normalized: { email: null, phone: null },
};

const resolveMatch = (
  matches: Record<string, ContactMatchResult> | undefined,
  channel: CommunicationTimelineChannel,
  sourceId: string,
  fallbackContactId?: string,
): ContactMatchResult => {
  const provided = matches?.[`${channel}:${sourceId}`];
  if (provided) return provided;
  if (fallbackContactId) {
    return {
      category: 'definite',
      matchedContactId: fallbackContactId,
      candidateContactIds: [fallbackContactId],
      autoAssignable: true,
      reasons: ['Vorhandene CRM-Kontakt-ID.'],
      normalized: { email: null, phone: null },
    };
  }
  return unknownMatch;
};

const contactFields = (match: ContactMatchResult) => ({
  contactMatchCategory: match.category,
  contactId: match.matchedContactId,
  suggestedContactId: match.suggestedContactId,
  requiresManualReview: match.category === 'probable' || match.category === 'manual_review',
});

const participantLabel = (displayName?: string, email?: string, phone?: string) =>
  displayName?.trim() || email?.trim() || phone?.trim() || 'Unbekannter Absender';

export function createUnifiedCommunicationTimeline(input: CommunicationTimelineInput): CommunicationTimelineItem[] {
  const items: CommunicationTimelineItem[] = [];

  for (const email of input.emails ?? []) {
    const participant = email.direction === 'inbound' ? email.sender : email.recipients[0];
    const match = resolveMatch(input.matches, 'email', email.providerEventId, participant?.contactId);
    items.push({
      id: `email:${email.providerEventId}`,
      sourceId: email.providerEventId,
      providerKey: input.providerKey,
      channel: 'email',
      direction: email.direction,
      occurredAt: email.occurredAt,
      title: email.subject || '(Kein Betreff)',
      summary: email.bodyPreview,
      status: email.unread ? 'unread' : email.direction === 'outbound' ? 'sent' : 'received',
      unread: email.unread,
      contactLabel: participantLabel(participant?.displayName, participant?.email, participant?.phone),
      ...contactFields(match),
      metadata: { threadId: email.threadId },
    });
  }

  for (const message of input.messages ?? []) {
    const participant = message.direction === 'inbound' ? message.sender : message.recipients[0];
    const match = resolveMatch(input.matches, 'message', message.providerEventId, participant?.contactId);
    items.push({
      id: `message:${message.providerEventId}`,
      sourceId: message.providerEventId,
      providerKey: input.providerKey,
      channel: 'message',
      direction: message.direction,
      occurredAt: message.occurredAt,
      title: message.direction === 'inbound' ? 'Eingegangene Nachricht' : 'Gesendete Nachricht',
      summary: message.bodyPreview,
      status: message.unread ? 'unread' : message.direction === 'outbound' ? 'sent' : 'received',
      unread: message.unread,
      contactLabel: participantLabel(participant?.displayName, participant?.email, participant?.phone),
      ...contactFields(match),
      metadata: { conversationId: message.conversationId },
    });
  }

  for (const phoneEvent of input.phoneEvents ?? []) {
    const match = resolveMatch(input.matches, 'phone', phoneEvent.providerEventId, phoneEvent.remoteParty.contactId);
    items.push({
      id: `phone:${phoneEvent.providerEventId}`,
      sourceId: phoneEvent.providerEventId,
      providerKey: input.providerKey,
      channel: 'phone',
      direction: phoneEvent.direction,
      occurredAt: phoneEvent.occurredAt,
      title: phoneEvent.outcome === 'missed' ? 'Verpasster Anruf' : 'Telefonereignis',
      summary: phoneEvent.note ?? (phoneEvent.outcome === 'missed' ? 'Rückruf noch nicht dokumentiert.' : 'Anruf im Mock-Provider erfasst.'),
      status: phoneEvent.outcome === 'missed' ? 'missed' : phoneEvent.outcome === 'answered' ? 'answered' : 'received',
      unread: phoneEvent.outcome === 'missed',
      contactLabel: participantLabel(
        phoneEvent.remoteParty.displayName,
        phoneEvent.remoteParty.email,
        phoneEvent.remoteParty.phone,
      ),
      ...contactFields(match),
      metadata: { outcome: phoneEvent.outcome, endedAt: phoneEvent.endedAt ?? null },
    });
  }

  for (const entry of input.calendarEntries ?? []) {
    const participant = entry.attendees[0] ?? entry.organizer;
    const match = resolveMatch(input.matches, 'appointment', entry.providerEventId, participant?.contactId);
    items.push({
      id: `appointment:${entry.providerEventId}`,
      sourceId: entry.providerEventId,
      providerKey: input.providerKey,
      channel: 'appointment',
      direction: 'internal',
      occurredAt: entry.startsAt,
      title: entry.title,
      summary: entry.description ?? (entry.status === 'cancelled' ? 'Der Termin wurde abgesagt.' : 'Kalendereintrag aus dem sicheren Mock-Modus.'),
      status: entry.status === 'cancelled' ? 'cancelled' : 'scheduled',
      unread: false,
      contactLabel: participantLabel(participant?.displayName, participant?.email, participant?.phone),
      ...contactFields(match),
      metadata: { endsAt: entry.endsAt, calendarStatus: entry.status },
    });
  }

  for (const activity of input.crmActivities ?? []) {
    const match = resolveMatch(input.matches, 'crm', activity.id, activity.contactId);
    items.push({
      id: `crm:${activity.id}`,
      sourceId: activity.id,
      providerKey: 'vincere-crm',
      channel: 'crm',
      direction: 'internal',
      occurredAt: activity.occurredAt,
      title: activity.title,
      summary: activity.summary,
      status: activity.status ?? 'completed',
      unread: false,
      contactLabel: activity.contactId ? `Kontakt ${activity.contactId}` : 'Allgemeine CRM-Aktivität',
      ...contactFields(match),
      metadata: {},
    });
  }

  return items.sort((left, right) => {
    const byTime = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    if (byTime !== 0) return byTime;
    const byChannel = channelRank[left.channel] - channelRank[right.channel];
    if (byChannel !== 0) return byChannel;
    return left.id.localeCompare(right.id, 'de');
  });
}
