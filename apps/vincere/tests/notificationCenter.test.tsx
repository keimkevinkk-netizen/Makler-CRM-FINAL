import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VincereNotification } from '../src/domain/notifications/types';
import { NotificationCenter } from '../src/features/notifications/NotificationCenter';
import { buildNotificationCenterModel } from '../src/features/notifications/notificationCenterModel';

const NOW = '2026-07-14T08:00:00.000Z';

function notification(overrides: Partial<VincereNotification>): VincereNotification {
  return {
    id: 'notification-1',
    type: 'follow_up',
    priority: 'high',
    record: {
      entityType: 'follow_up',
      entityId: 'follow-up-1',
      label: 'Anna Beispiel',
      contactId: 'contact-1',
    },
    reason: 'Follow-up ist fällig.',
    createdAt: NOW,
    dueAt: NOW,
    recommendedAction: 'Anna Beispiel anrufen',
    deduplicationKey: 'follow_up:follow-up-1:deadline',
    stateFingerprint: 'due',
    status: 'unread',
    escalation: { stage: 'due' },
    metadata: { sourceModule: 'followups' },
    ...overrides,
  };
}

describe('notification center viewer', () => {
  it('builds all required views and groups related contact messages', () => {
    const notifications = [
      notification({}),
      notification({
        id: 'notification-2',
        type: 'critical',
        priority: 'critical',
        record: {
          entityType: 'contact',
          entityId: 'contact-1',
          label: 'Anna Beispiel',
          contactId: 'contact-1',
        },
        deduplicationKey: 'contact:contact-1:response',
        stateFingerprint: 'critical',
        recommendedAction: 'Rückmeldung senden',
      }),
      notification({
        id: 'notification-3',
        type: 'system_status',
        priority: 'high',
        record: { entityType: 'system', entityId: 'sync', label: 'Synchronisation' },
        deduplicationKey: 'system:sync:failed',
        stateFingerprint: 'failed',
      }),
      notification({
        id: 'notification-4',
        status: 'snoozed',
        deduplicationKey: 'follow_up:follow-up-4:deadline',
        stateFingerprint: 'snoozed',
      }),
      notification({
        id: 'notification-5',
        status: 'completed',
        deduplicationKey: 'follow_up:follow-up-5:deadline',
        stateFingerprint: 'completed',
      }),
    ];

    const model = buildNotificationCenterModel(notifications, NOW);

    expect(model.unread).toHaveLength(3);
    expect(model.today).toHaveLength(4);
    expect(model.critical).toHaveLength(1);
    expect(model.system).toHaveLength(1);
    expect(model.snoozed).toHaveLength(1);
    expect(model.completed).toHaveLength(1);
    expect(model.groups.find((group) => group.key === 'contact:contact-1')?.notifications).toHaveLength(4);
  });

  it('renders the viewer and exposes the next action and status controls', () => {
    const onOpenRecord = vi.fn();
    const onStatusChange = vi.fn();
    render(
      <NotificationCenter
        notifications={[notification({})]}
        now={NOW}
        onOpenRecord={onOpenRecord}
        onStatusChange={onStatusChange}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Benachrichtigungszentrale' })).toBeInTheDocument();
    expect(screen.getByText('Nächste Aktion: Anna Beispiel anrufen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Datensatz öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Als gelesen markieren' }));

    expect(onOpenRecord).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith('notification-1', 'read');
  });

  it('renders a stable empty state', () => {
    render(<NotificationCenter notifications={[]} now={NOW} />);

    expect(screen.getByText('Keine Meldungen in diesem Bereich.')).toBeInTheDocument();
  });

  it('filters the viewer by type and search term', () => {
    const notifications = [
      notification({}),
      notification({
        id: 'notification-2',
        type: 'system_status',
        record: { entityType: 'system', entityId: 'sync', label: 'Synchronisation' },
        reason: 'Synchronisation ist fehlgeschlagen.',
        deduplicationKey: 'system:sync:failed',
      }),
    ];

    const model = buildNotificationCenterModel(notifications, NOW, {
      types: ['system_status'],
      search: 'synchronisation',
    });

    expect(model.filtered).toHaveLength(1);
    expect(model.filtered[0].record.entityId).toBe('sync');
  });
});
