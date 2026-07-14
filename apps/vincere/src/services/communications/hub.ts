import type {
  CalendarEntry,
  EmailMessage,
  MessagingEvent,
  PhoneEvent,
  ProviderAuthenticationStatus,
  ProviderRateLimitState,
} from '../../integrations/communications/contracts';
import {
  MOCK_CALENDAR_ENTRIES,
  MOCK_EMAIL_MESSAGES,
  MOCK_MESSAGING_EVENTS,
  MOCK_PHONE_EVENTS,
} from '../../integrations/communications/mockProvider';
import { matchContactIdentity, type MatchableContact } from './contactMatching';
import {
  createUnifiedCommunicationTimeline,
  type CommunicationTimelineItem,
  type CrmActivityInput,
} from './timeline';

export type ProviderConnectionState = 'connected' | 'degraded' | 'offline' | 'expired' | 'mock';

export interface CommunicationProviderStatus {
  providerKey: string;
  displayName: string;
  channelLabel: string;
  connectionState: ProviderConnectionState;
  authentication: ProviderAuthenticationStatus;
  rateLimit: ProviderRateLimitState;
  lastSyncedAt: string | null;
  syncCursor: string | null;
  failureMessage?: string;
}

export interface CommunicationHubSnapshot {
  generatedAt: string;
  unreadMessages: CommunicationTimelineItem[];
  missedCalls: CommunicationTimelineItem[];
  todayAppointments: CommunicationTimelineItem[];
  awaitingResponse: CommunicationTimelineItem[];
  unassignedCommunication: CommunicationTimelineItem[];
  failedSynchronizations: CommunicationProviderStatus[];
  providersByRecentSync: CommunicationProviderStatus[];
  providerStatuses: CommunicationProviderStatus[];
  connectionSummary: {
    connected: number;
    attentionRequired: number;
    total: number;
  };
  timeline: CommunicationTimelineItem[];
}

export interface BuildCommunicationHubInput {
  timeline: CommunicationTimelineItem[];
  providerStatuses: CommunicationProviderStatus[];
  now: string;
}

const berlinDateKey = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const responseKey = (item: CommunicationTimelineItem) =>
  item.contactId ?? item.suggestedContactId ?? `${item.channel}:${item.contactLabel}`;

const awaitingResponseItems = (timeline: CommunicationTimelineItem[]) => {
  const ordered = [...timeline].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  const latestByConversation = new Map<string, CommunicationTimelineItem>();

  for (const item of ordered) {
    if (item.channel !== 'email' && item.channel !== 'message') continue;
    const key = responseKey(item);
    if (!latestByConversation.has(key)) latestByConversation.set(key, item);
  }

  return [...latestByConversation.values()]
    .filter((item) => item.direction === 'inbound')
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
};

export function buildCommunicationHubSnapshot(input: BuildCommunicationHubInput): CommunicationHubSnapshot {
  const failedSynchronizations = input.providerStatuses.filter((provider) =>
    provider.connectionState === 'offline'
    || provider.connectionState === 'expired'
    || provider.connectionState === 'degraded'
    || provider.rateLimit.status === 'limited');
  const providersByRecentSync = [...input.providerStatuses].sort((left, right) => {
    if (!left.lastSyncedAt && !right.lastSyncedAt) return left.providerKey.localeCompare(right.providerKey);
    if (!left.lastSyncedAt) return 1;
    if (!right.lastSyncedAt) return -1;
    const byTime = new Date(right.lastSyncedAt).getTime() - new Date(left.lastSyncedAt).getTime();
    return byTime || left.providerKey.localeCompare(right.providerKey);
  });
  const connected = input.providerStatuses.filter((provider) =>
    provider.connectionState === 'connected' || provider.connectionState === 'mock').length;
  const currentDateKey = berlinDateKey(input.now);

  return {
    generatedAt: input.now,
    unreadMessages: input.timeline.filter((item) =>
      (item.channel === 'email' || item.channel === 'message') && item.unread),
    missedCalls: input.timeline.filter((item) => item.channel === 'phone' && item.status === 'missed'),
    todayAppointments: input.timeline.filter((item) =>
      item.channel === 'appointment' && berlinDateKey(item.occurredAt) === currentDateKey),
    awaitingResponse: awaitingResponseItems(input.timeline),
    unassignedCommunication: input.timeline.filter((item) =>
      item.contactMatchCategory === 'unknown' || item.contactMatchCategory === 'manual_review'),
    failedSynchronizations,
    providersByRecentSync,
    providerStatuses: input.providerStatuses,
    connectionSummary: {
      connected,
      attentionRequired: input.providerStatuses.length - connected,
      total: input.providerStatuses.length,
    },
    timeline: input.timeline,
  };
}

const syntheticContacts: MatchableContact[] = [
  {
    id: 'contact-001',
    email: 'owner.one@example.invalid',
    phone: '+49 160 0000001',
    externalProviderIds: { 'vincere-safe-mock': 'messaging-contact-001' },
  },
  {
    id: 'contact-002',
    email: 'contact.two@example.invalid',
    phone: '+49 160 0000002',
  },
];

const matchEmail = (email: EmailMessage) => {
  const participant = email.direction === 'inbound' ? email.sender : email.recipients[0] ?? {};
  return matchContactIdentity(participant, syntheticContacts, { providerKey: 'vincere-safe-mock' });
};

const matchMessage = (message: MessagingEvent) => {
  const participant = message.direction === 'inbound' ? message.sender : message.recipients[0] ?? {};
  return matchContactIdentity(participant, syntheticContacts, { providerKey: 'vincere-safe-mock' });
};

const matchPhone = (event: PhoneEvent) =>
  matchContactIdentity(event.remoteParty, syntheticContacts, { providerKey: 'vincere-safe-mock' });

const matchAppointment = (entry: CalendarEntry) =>
  matchContactIdentity(entry.attendees[0] ?? entry.organizer ?? {}, syntheticContacts, { providerKey: 'vincere-safe-mock' });

const providerStatuses: CommunicationProviderStatus[] = [
  {
    providerKey: 'mock-email',
    displayName: 'Sicheres Mock-Postfach',
    channelLabel: 'E-Mail',
    connectionState: 'mock',
    authentication: {
      state: 'mock',
      connectionId: 'mock-email-connection',
      expiresAt: '2099-01-01T00:00:00.000Z',
      reauthorizationRequired: false,
      checkedAt: '2026-07-14T08:00:00.000Z',
    },
    rateLimit: { status: 'ok', limit: 100, remaining: 99 },
    lastSyncedAt: '2026-07-14T07:58:00.000Z',
    syncCursor: 'mock-cursor-email-0002',
  },
  {
    providerKey: 'mock-calendar',
    displayName: 'Sicherer Mock-Kalender',
    channelLabel: 'Kalender',
    connectionState: 'mock',
    authentication: {
      state: 'mock',
      connectionId: 'mock-calendar-connection',
      expiresAt: '2099-01-01T00:00:00.000Z',
      reauthorizationRequired: false,
      checkedAt: '2026-07-14T08:00:00.000Z',
    },
    rateLimit: { status: 'ok', limit: 100, remaining: 98 },
    lastSyncedAt: '2026-07-14T07:56:00.000Z',
    syncCursor: 'mock-cursor-calendar-0001',
  },
  {
    providerKey: 'mock-phone',
    displayName: 'Sichere Mock-Telefonie',
    channelLabel: 'Telefonie',
    connectionState: 'offline',
    authentication: {
      state: 'mock',
      connectionId: 'mock-phone-connection',
      expiresAt: '2099-01-01T00:00:00.000Z',
      reauthorizationRequired: false,
      checkedAt: '2026-07-14T08:00:00.000Z',
    },
    rateLimit: { status: 'unknown' },
    lastSyncedAt: '2026-07-14T07:30:00.000Z',
    syncCursor: 'mock-cursor-phone-0001',
    failureMessage: 'Synthetischer Offlinezustand – keine externe Telefonanlage verbunden.',
  },
  {
    providerKey: 'mock-messaging',
    displayName: 'Sicherer Mock-Messagingkanal',
    channelLabel: 'Messaging',
    connectionState: 'expired',
    authentication: {
      state: 'expired',
      connectionId: 'mock-messaging-connection',
      expiresAt: '2026-07-13T08:00:00.000Z',
      reauthorizationRequired: true,
      checkedAt: '2026-07-14T08:00:00.000Z',
    },
    rateLimit: { status: 'limited', limit: 100, remaining: 0, retryAfterMs: 60_000 },
    lastSyncedAt: null,
    syncCursor: null,
    failureMessage: 'Synthetische Verbindung abgelaufen; erneute Freigabe wäre später serverseitig nötig.',
  },
];

const crmActivities: CrmActivityInput[] = [
  {
    id: 'mock-crm-activity-001',
    contactId: 'contact-001',
    occurredAt: '2026-07-13T12:00:00.000Z',
    title: 'CRM-Notiz ergänzt',
    summary: 'Synthetische Aktivität als Beispiel für die gemeinsame Kommunikationshistorie.',
    status: 'completed',
  },
];

export function createMockCommunicationHubSnapshot(): CommunicationHubSnapshot {
  const matches = Object.fromEntries([
    ...MOCK_EMAIL_MESSAGES.map((email) => [`email:${email.providerEventId}`, matchEmail(email)] as const),
    ...MOCK_MESSAGING_EVENTS.map((message) => [`message:${message.providerEventId}`, matchMessage(message)] as const),
    ...MOCK_PHONE_EVENTS.map((event) => [`phone:${event.providerEventId}`, matchPhone(event)] as const),
    ...MOCK_CALENDAR_ENTRIES.map((entry) => [`appointment:${entry.providerEventId}`, matchAppointment(entry)] as const),
  ]);
  const timeline = createUnifiedCommunicationTimeline({
    providerKey: 'vincere-safe-mock',
    emails: MOCK_EMAIL_MESSAGES,
    messages: MOCK_MESSAGING_EVENTS,
    phoneEvents: MOCK_PHONE_EVENTS,
    calendarEntries: MOCK_CALENDAR_ENTRIES,
    crmActivities,
    matches,
  });

  return buildCommunicationHubSnapshot({
    timeline,
    providerStatuses,
    now: '2026-07-14T08:00:00.000Z',
  });
}
