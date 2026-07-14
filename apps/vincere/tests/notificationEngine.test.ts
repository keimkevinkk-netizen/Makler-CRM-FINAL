import { describe, expect, it } from 'vitest';
import type {
  NotificationSourceSnapshot,
  VincereNotification,
} from '../src/domain/notifications/types';
import {
  completeNotification,
  evaluateNotifications,
  snoozeNotification,
} from '../src/services/notifications/notificationEngine';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  planNotificationDelivery,
} from '../src/services/notifications/preferences';

const NOW = '2026-07-14T08:00:00.000Z';

function followUpSnapshot(dueAt = '2026-07-14T08:30:00.000Z'): NotificationSourceSnapshot {
  return {
    followUps: [
      {
        id: 'follow-up-1',
        contactId: 'contact-1',
        contactLabel: 'Anna Beispiel',
        dueAt,
        completed: false,
      },
    ],
  };
}

function evaluate(snapshot: NotificationSourceSnapshot, existing: VincereNotification[] = []) {
  return evaluateNotifications(snapshot, existing, { now: NOW });
}

describe('notification engine', () => {
  it('deduplicates identical messages and records the suppression', () => {
    const duplicated = followUpSnapshot();
    duplicated.followUps = [duplicated.followUps![0], { ...duplicated.followUps![0] }];

    const result = evaluate(duplicated);

    expect(result.notifications).toHaveLength(1);
    expect(result.emitted).toHaveLength(1);
    expect(result.suppressed).toHaveLength(1);
    expect(result.notifications[0].deduplicationKey).toBe('follow_up:follow-up-1:deadline');
  });

  it('updates one notification when its escalation stage changes', () => {
    const first = evaluate(followUpSnapshot());
    const second = evaluateNotifications(followUpSnapshot(), first.notifications, {
      now: '2026-07-15T09:00:00.000Z',
    });

    expect(second.notifications).toHaveLength(1);
    expect(second.emitted).toHaveLength(0);
    expect(second.updated).toHaveLength(1);
    expect(second.notifications[0].id).toBe(first.notifications[0].id);
    expect(second.notifications[0].priority).toBe('critical');
    expect(second.notifications[0].escalation).toMatchObject({
      stage: 'critical',
      previousStage: 'upcoming',
    });
  });

  it('completes an existing notification when the source record is completed', () => {
    const first = evaluate(followUpSnapshot());
    const completedSnapshot = followUpSnapshot();
    completedSnapshot.followUps![0].completed = true;

    const result = evaluate(completedSnapshot, first.notifications);

    expect(result.notifications[0].status).toBe('completed');
    expect(result.notifications[0].escalation.stage).toBe('completed');
  });

  it('creates a warning for an invalid due date instead of guessing', () => {
    const result = evaluate(followUpSnapshot('not-a-date'));

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toMatchObject({
      type: 'warning',
      priority: 'high',
      recommendedAction: 'Zeitangabe prüfen und korrigieren',
    });
  });

  it('caps simultaneous messages for the same contact deterministically', () => {
    const snapshot: NotificationSourceSnapshot = {
      followUps: [
        {
          id: 'f1',
          contactId: 'contact-1',
          contactLabel: 'Anna Beispiel',
          dueAt: '2026-07-14T08:10:00.000Z',
          completed: false,
        },
        {
          id: 'f2',
          contactId: 'contact-1',
          contactLabel: 'Anna Beispiel',
          dueAt: '2026-07-14T10:10:00.000Z',
          completed: false,
        },
        {
          id: 'f3',
          contactId: 'contact-1',
          contactLabel: 'Anna Beispiel',
          dueAt: '2026-07-14T12:10:00.000Z',
          completed: false,
        },
        {
          id: 'f4',
          contactId: 'contact-1',
          contactLabel: 'Anna Beispiel',
          dueAt: '2026-07-14T14:10:00.000Z',
          completed: false,
        },
      ],
    };

    const result = evaluateNotifications(snapshot, [], {
      now: NOW,
      thresholds: { maxActivePerContact: 2 },
    });

    expect(result.notifications).toHaveLength(2);
    expect(result.suppressed).toHaveLength(2);
    expect(result.notifications.map((notification) => notification.record.entityId)).toEqual(['f1', 'f2']);
  });

  it('raises unresolved conflicts to critical after the documented threshold', () => {
    const result = evaluate({
      conflicts: [
        {
          id: 'conflict-1',
          recordType: 'contact',
          recordId: 'contact-1',
          label: 'Versionskonflikt Anna Beispiel',
          waitingSince: '2026-07-13T07:00:00.000Z',
          resolved: false,
        },
      ],
    });

    expect(result.notifications[0]).toMatchObject({
      type: 'conflict',
      priority: 'critical',
      recommendedAction: 'Konfliktvergleich öffnen und gültige Version auswählen',
    });
  });

  it('creates one actionable offline system status without duplicate realtime noise', () => {
    const result = evaluate({
      system: {
        offline: true,
        realtimeConnected: false,
        realtimeInterruptedAt: '2026-07-14T07:55:00.000Z',
      },
    });

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toMatchObject({
      type: 'system_status',
      deduplicationKey: 'system:connectivity:offline',
      priority: 'high',
    });
  });

  it('respects quiet hours while allowing explicitly immediate critical messages', () => {
    const notification = evaluate(followUpSnapshot()).notifications[0];
    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      dailySummary: false,
    };

    const queued = planNotificationDelivery(notification, preferences, '2026-07-14T22:00:00+02:00');
    const critical = planNotificationDelivery(
      { ...notification, priority: 'critical' },
      preferences,
      '2026-07-14T22:00:00+02:00',
    );

    expect(queued.decision).toBe('queue_for_working_hours');
    expect(queued.nextEligibleAt).toContain('2026-07-15T08:00:00+02:00');
    expect(critical.decision).toBe('deliver_now');
  });

  it('produces identical priority and ordering for identical input', () => {
    const snapshot: NotificationSourceSnapshot = {
      ...followUpSnapshot(),
      properties: [
        {
          id: 'property-1',
          title: 'Wohnhaus Bruchköbel',
          active: true,
          nextActionAt: null,
        },
      ],
      system: {
        offline: false,
        realtimeConnected: true,
        syncFailedAt: '2026-07-14T06:00:00.000Z',
      },
    };

    const first = evaluate(snapshot);
    const second = evaluate(snapshot);

    expect(second.notifications).toEqual(first.notifications);
  });

  it('handles empty source data without synthetic messages', () => {
    const result = evaluate({});

    expect(result).toEqual({ notifications: [], emitted: [], updated: [], suppressed: [] });
  });

  it('supports explicit snooze and completion transitions', () => {
    const notification = evaluate(followUpSnapshot()).notifications[0];
    const snoozed = snoozeNotification(notification, '2026-07-14T12:00:00.000Z');
    const completed = completeNotification(snoozed, '2026-07-14T09:00:00.000Z');

    expect(snoozed.status).toBe('snoozed');
    expect(snoozed.escalation.stage).toBe('snoozed');
    expect(completed.status).toBe('completed');
    expect(completed.snoozedUntil).toBeUndefined();
  });
});
