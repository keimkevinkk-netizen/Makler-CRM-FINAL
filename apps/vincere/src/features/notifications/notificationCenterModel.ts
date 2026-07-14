import type {
  NotificationCenterFilters,
  NotificationCenterModel,
  NotificationGroup,
  NotificationPriority,
  VincereNotification,
} from '../../domain/notifications/types';

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

function dateKey(value: string | undefined): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return value.slice(0, 10);
}

function compareNotifications(left: VincereNotification, right: VincereNotification): number {
  const priorityDifference = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
  if (priorityDifference !== 0) return priorityDifference;
  const dueDifference =
    Date.parse(left.dueAt ?? '9999-12-31T23:59:59.999Z') -
    Date.parse(right.dueAt ?? '9999-12-31T23:59:59.999Z');
  if (dueDifference !== 0) return dueDifference;
  return left.id.localeCompare(right.id);
}

function matchesFilters(
  notification: VincereNotification,
  filters: NotificationCenterFilters,
): boolean {
  if (filters.priorities?.length && !filters.priorities.includes(notification.priority)) return false;
  if (filters.types?.length && !filters.types.includes(notification.type)) return false;
  if (filters.statuses?.length && !filters.statuses.includes(notification.status)) return false;
  if (filters.entityTypes?.length && !filters.entityTypes.includes(notification.record.entityType)) return false;
  if (filters.search?.trim()) {
    const query = filters.search.trim().toLocaleLowerCase('de-DE');
    const searchable = [
      notification.record.label,
      notification.reason,
      notification.recommendedAction,
      notification.record.entityId,
    ]
      .join(' ')
      .toLocaleLowerCase('de-DE');
    if (!searchable.includes(query)) return false;
  }
  return true;
}

function groupNotifications(notifications: VincereNotification[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  for (const notification of notifications) {
    const key = notification.record.contactId
      ? `contact:${notification.record.contactId}`
      : notification.record.propertyId
        ? `property:${notification.record.propertyId}`
        : `${notification.record.entityType}:${notification.record.entityId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.notifications.push(notification);
      continue;
    }
    groups.set(key, {
      key,
      label: notification.record.label,
      notifications: [notification],
    });
  }

  return [...groups.values()]
    .map((group) => {
      const sorted = [...group.notifications].sort(compareNotifications);
      return {
        ...group,
        notifications: sorted,
        nextAction: sorted.find((notification) => notification.status !== 'completed')?.recommendedAction,
      };
    })
    .sort((left, right) => compareNotifications(left.notifications[0], right.notifications[0]));
}

export function buildNotificationCenterModel(
  notifications: VincereNotification[],
  nowIso: string,
  filters: NotificationCenterFilters = {},
): NotificationCenterModel {
  if (!Number.isFinite(Date.parse(nowIso))) throw new Error(`Invalid viewer timestamp: ${nowIso}`);
  const todayKey = dateKey(nowIso);
  const sorted = [...notifications].sort(compareNotifications);
  const filtered = sorted.filter((notification) => matchesFilters(notification, filters));

  return {
    unread: filtered.filter((notification) => notification.status === 'unread'),
    today: filtered.filter(
      (notification) =>
        notification.status !== 'completed' &&
        (dateKey(notification.dueAt) === todayKey || dateKey(notification.createdAt) === todayKey),
    ),
    critical: filtered.filter(
      (notification) => notification.priority === 'critical' && notification.status !== 'completed',
    ),
    system: filtered.filter(
      (notification) => notification.type === 'system_status' && notification.status !== 'completed',
    ),
    snoozed: filtered.filter((notification) => notification.status === 'snoozed'),
    completed: filtered.filter((notification) => notification.status === 'completed'),
    filtered,
    groups: groupNotifications(filtered),
  };
}
