import { describe, expect, it } from 'vitest';
import { createMockCommunicationHubSnapshot } from '../src/services/communications/hub';
import { createUnifiedCommunicationTimeline } from '../src/services/communications/timeline';

const occurredAt = '2026-07-14T08:00:00.000Z';

describe('unified communication timeline', () => {
  it('uses a deterministic channel and id tiebreaker', () => {
    const timeline = createUnifiedCommunicationTimeline({
      providerKey: 'mock',
      emails: [{
        providerEventId: 'email-1',
        threadId: 'thread-1',
        direction: 'inbound',
        subject: 'E-Mail',
        bodyPreview: 'Text',
        sender: { email: 'sender@example.invalid' },
        recipients: [],
        occurredAt,
        unread: true,
      }],
      messages: [{
        providerEventId: 'message-1',
        conversationId: 'conversation-1',
        direction: 'inbound',
        occurredAt,
        bodyPreview: 'Nachricht',
        sender: { phone: '+49 160 0000001' },
        recipients: [],
        unread: true,
      }],
      phoneEvents: [{
        providerEventId: 'phone-1',
        direction: 'inbound',
        occurredAt,
        outcome: 'missed',
        remoteParty: { phone: '+49 160 0000002' },
      }],
      calendarEntries: [{
        providerEventId: 'appointment-1',
        title: 'Termin',
        startsAt: occurredAt,
        endsAt: '2026-07-14T09:00:00.000Z',
        status: 'confirmed',
        attendees: [],
      }],
      crmActivities: [{
        id: 'crm-1',
        occurredAt,
        title: 'CRM',
        summary: 'Aktivität',
      }],
    });

    expect(timeline.map((item) => item.channel)).toEqual(['email', 'message', 'phone', 'appointment', 'crm']);
  });

  it('produces the same complete mock timeline on repeated builds', () => {
    const first = createMockCommunicationHubSnapshot();
    const second = createMockCommunicationHubSnapshot();

    expect(first.timeline).toEqual(second.timeline);
    expect(new Set(first.timeline.map((item) => item.channel))).toEqual(new Set(['email', 'message', 'phone', 'appointment', 'crm']));
    expect(first.unreadMessages.length).toBeGreaterThan(0);
    expect(first.missedCalls.length).toBeGreaterThan(0);
    expect(first.todayAppointments.some((item) => item.status === 'cancelled')).toBe(true);
    expect(first.unassignedCommunication.length).toBeGreaterThan(0);
    expect(first.failedSynchronizations.length).toBeGreaterThan(0);
  });
});
