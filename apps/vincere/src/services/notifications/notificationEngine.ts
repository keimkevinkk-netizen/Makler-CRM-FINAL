import {
  DEFAULT_NOTIFICATION_THRESHOLDS,
  collectNotificationCandidates,
} from '../../domain/notifications/rules';
import type {
  EscalationStage,
  NotificationCandidate,
  NotificationEngineOptions,
  NotificationEngineResult,
  NotificationPriority,
  NotificationSourceSnapshot,
  NotificationStatus,
  VincereNotification,
} from '../../domain/notifications/types';

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

const ESCALATION_WEIGHT: Record<EscalationStage, number> = {
  upcoming: 0,
  due: 1,
  overdue: 2,
  critical: 3,
  snoozed: -1,
  completed: -2,
};

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function candidateRank(candidate: NotificationCandidate): number {
  return PRIORITY_WEIGHT[candidate.priority] * 10 + ESCALATION_WEIGHT[candidate.escalation.stage];
}

function compareCandidates(left: NotificationCandidate, right: NotificationCandidate): number {
  const rankDifference = candidateRank(right) - candidateRank(left);
  if (rankDifference !== 0) return rankDifference;
  const dueDifference = Date.parse(left.dueAt ?? '9999-12-31T23:59:59.999Z') - Date.parse(right.dueAt ?? '9999-12-31T23:59:59.999Z');
  if (dueDifference !== 0) return dueDifference;
  return left.deduplicationKey.localeCompare(right.deduplicationKey);
}

function deduplicateCandidates(candidates: NotificationCandidate[]): {
  selected: NotificationCandidate[];
  suppressed: NotificationCandidate[];
} {
  const byKey = new Map<string, NotificationCandidate>();
  const suppressed: NotificationCandidate[] = [];

  for (const candidate of [...candidates].sort(compareCandidates)) {
    const existing = byKey.get(candidate.deduplicationKey);
    if (!existing) {
      byKey.set(candidate.deduplicationKey, candidate);
      continue;
    }
    suppressed.push(candidate);
  }

  const byCoordinationKey = new Map<string, NotificationCandidate>();
  const selectedWithoutCollisions: NotificationCandidate[] = [];
  for (const candidate of [...byKey.values()].sort(compareCandidates)) {
    const coordinationKey = candidate.metadata.coordinationKey;
    if (!coordinationKey) {
      selectedWithoutCollisions.push(candidate);
      continue;
    }
    const existing = byCoordinationKey.get(coordinationKey);
    if (!existing) {
      byCoordinationKey.set(coordinationKey, candidate);
      selectedWithoutCollisions.push(candidate);
      continue;
    }
    suppressed.push(candidate);
    existing.metadata = {
      ...existing.metadata,
      relatedCount: (existing.metadata.relatedCount ?? 1) + 1,
    };
  }

  return { selected: selectedWithoutCollisions, suppressed };
}

function capContactFlood(
  candidates: NotificationCandidate[],
  maxActivePerContact: number,
): { selected: NotificationCandidate[]; suppressed: NotificationCandidate[] } {
  const selected: NotificationCandidate[] = [];
  const suppressed: NotificationCandidate[] = [];
  const countByContact = new Map<string, number>();

  for (const candidate of [...candidates].sort(compareCandidates)) {
    const contactId = candidate.record.contactId;
    if (!contactId) {
      selected.push(candidate);
      continue;
    }
    const currentCount = countByContact.get(contactId) ?? 0;
    if (currentCount >= maxActivePerContact) {
      suppressed.push(candidate);
      continue;
    }
    countByContact.set(contactId, currentCount + 1);
    selected.push(candidate);
  }

  return { selected, suppressed };
}

function evaluatedModules(snapshot: NotificationSourceSnapshot): Set<string> {
  const modules = new Set<string>();
  if (snapshot.followUps !== undefined) modules.add('followups');
  if (snapshot.appointments !== undefined) modules.add('appointments');
  if (snapshot.contacts !== undefined) modules.add('contacts');
  if (snapshot.properties !== undefined) modules.add('properties');
  if (snapshot.conflicts !== undefined) modules.add('conflicts');
  if (snapshot.missingRequirements !== undefined) modules.add('requirements');
  if (snapshot.system !== undefined) {
    modules.add('offline');
    modules.add('sync');
    modules.add('realtime');
  }
  return modules;
}

function isSnoozeActive(notification: VincereNotification, now: number): boolean {
  if (notification.status !== 'snoozed' || !notification.snoozedUntil) return false;
  const snoozedUntil = Date.parse(notification.snoozedUntil);
  return Number.isFinite(snoozedUntil) && snoozedUntil > now;
}

function createNotification(candidate: NotificationCandidate, now: string): VincereNotification {
  return {
    ...candidate,
    id: `notification-${stableHash(candidate.deduplicationKey)}`,
    createdAt: now,
    status: 'unread',
  };
}

function updateNotification(
  current: VincereNotification,
  candidate: NotificationCandidate,
  now: string,
): VincereNotification {
  const nowMs = Date.parse(now);
  const escalated =
    ESCALATION_WEIGHT[candidate.escalation.stage] > ESCALATION_WEIGHT[current.escalation.stage];
  const keepSnoozed = isSnoozeActive(current, nowMs) && candidate.priority !== 'critical';
  const status: NotificationStatus = keepSnoozed ? 'snoozed' : 'unread';

  return {
    ...current,
    ...candidate,
    status,
    readAt: status === 'unread' ? undefined : current.readAt,
    snoozedUntil: keepSnoozed ? current.snoozedUntil : undefined,
    escalation: {
      ...candidate.escalation,
      previousStage: current.escalation.stage,
      escalatedAt: escalated ? now : current.escalation.escalatedAt,
    },
  };
}

function completeMissingNotifications(
  existing: VincereNotification[],
  selectedKeys: Set<string>,
  evaluated: Set<string>,
  now: string,
): VincereNotification[] {
  return existing.map((notification) => {
    if (
      notification.status === 'completed' ||
      selectedKeys.has(notification.deduplicationKey) ||
      !evaluated.has(notification.metadata.sourceModule)
    ) {
      return notification;
    }
    return {
      ...notification,
      status: 'completed',
      completedAt: now,
      snoozedUntil: undefined,
      escalation: {
        stage: 'completed',
        previousStage: notification.escalation.stage,
        escalatedAt: now,
        reason: 'Der auslösende Zustand ist nicht mehr aktiv.',
      },
    };
  });
}

export function evaluateNotifications(
  snapshot: NotificationSourceSnapshot,
  existing: VincereNotification[],
  options: NotificationEngineOptions,
): NotificationEngineResult {
  const nowMs = Date.parse(options.now);
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid engine timestamp: ${options.now}`);

  const thresholds = { ...DEFAULT_NOTIFICATION_THRESHOLDS, ...options.thresholds };
  const rawCandidates = collectNotificationCandidates(snapshot, options.now, thresholds);
  const deduplicated = deduplicateCandidates(rawCandidates);
  const capped = capContactFlood(deduplicated.selected, thresholds.maxActivePerContact);
  const selectedCandidates = capped.selected;
  const suppressed = [...deduplicated.suppressed, ...capped.suppressed];
  const selectedKeys = new Set(selectedCandidates.map((candidate) => candidate.deduplicationKey));
  const currentNotifications = completeMissingNotifications(
    existing,
    selectedKeys,
    evaluatedModules(snapshot),
    options.now,
  );
  const existingByKey = new Map(
    currentNotifications.map((notification) => [notification.deduplicationKey, notification]),
  );
  const emitted: VincereNotification[] = [];
  const updated: VincereNotification[] = [];

  for (const candidate of selectedCandidates) {
    const current = existingByKey.get(candidate.deduplicationKey);
    if (!current || current.status === 'completed') {
      const created = createNotification(candidate, options.now);
      existingByKey.set(candidate.deduplicationKey, created);
      emitted.push(created);
      continue;
    }

    if (current.stateFingerprint === candidate.stateFingerprint) continue;
    const next = updateNotification(current, candidate, options.now);
    existingByKey.set(candidate.deduplicationKey, next);
    updated.push(next);
  }

  const notifications = [...existingByKey.values()].sort((left, right) => {
    const priorityDifference = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
    if (priorityDifference !== 0) return priorityDifference;
    const dueDifference = Date.parse(left.dueAt ?? '9999-12-31T23:59:59.999Z') - Date.parse(right.dueAt ?? '9999-12-31T23:59:59.999Z');
    if (dueDifference !== 0) return dueDifference;
    return left.id.localeCompare(right.id);
  });

  return { notifications, emitted, updated, suppressed };
}

export function markNotificationRead(
  notification: VincereNotification,
  readAt: string,
): VincereNotification {
  if (notification.status === 'completed') return notification;
  return { ...notification, status: 'read', readAt };
}

export function snoozeNotification(
  notification: VincereNotification,
  snoozedUntil: string,
): VincereNotification {
  const parsed = Date.parse(snoozedUntil);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid snooze timestamp: ${snoozedUntil}`);
  if (notification.status === 'completed') return notification;
  return {
    ...notification,
    status: 'snoozed',
    snoozedUntil,
    escalation: {
      stage: 'snoozed',
      previousStage: notification.escalation.stage,
      reason: 'Vom Nutzer lokal zurückgestellt.',
    },
  };
}

export function completeNotification(
  notification: VincereNotification,
  completedAt: string,
): VincereNotification {
  return {
    ...notification,
    status: 'completed',
    completedAt,
    snoozedUntil: undefined,
    escalation: {
      stage: 'completed',
      previousStage: notification.escalation.stage,
      escalatedAt: completedAt,
    },
  };
}
