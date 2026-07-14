import type {
  NotificationChannel,
  NotificationDeliveryPlan,
  NotificationPreferences,
  NotificationPriority,
  VincereNotification,
  WorkingTimeRange,
} from '../../domain/notifications/types';

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

interface ZonedParts {
  instant: number;
  offsetMinutes: number;
  year: number;
  month: number;
  day: number;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minuteOfDay: number;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  workingHours: {
    1: { start: '08:00', end: '18:00' },
    2: { start: '08:00', end: '18:00' },
    3: { start: '08:00', end: '18:00' },
    4: { start: '08:00', end: '18:00' },
    5: { start: '08:00', end: '18:00' },
  },
  quietHours: { start: '20:00', end: '07:00' },
  channels: { in_app: true, push: false, email: false, sms: false },
  minimumPriority: 'normal',
  dailySummary: true,
  immediateCritical: true,
};

function parseClock(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid clock value: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid clock value: ${value}`);
  return hours * 60 + minutes;
}

function parseOffsetMinutes(value: string): number {
  if (value.endsWith('Z')) return 0;
  const match = /([+-])(\d{2}):(\d{2})$/.exec(value);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

function zonedParts(value: string): ZonedParts {
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) throw new Error(`Invalid timestamp: ${value}`);
  const offsetMinutes = parseOffsetMinutes(value);
  const local = new Date(instant + offsetMinutes * 60_000);
  return {
    instant,
    offsetMinutes,
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    weekday: local.getUTCDay() as ZonedParts['weekday'],
    minuteOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

function isInsideRange(minuteOfDay: number, range: WorkingTimeRange): boolean {
  const start = parseClock(range.start);
  const end = parseClock(range.end);
  if (start === end) return true;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

function enabledChannels(preferences: NotificationPreferences): NotificationChannel[] {
  return (Object.entries(preferences.channels) as [NotificationChannel, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([channel]) => channel);
}

function formatWithOffset(instant: number, offsetMinutes: number): string {
  const local = new Date(instant + offsetMinutes * 60_000);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, '0');
  const day = String(local.getUTCDate()).padStart(2, '0');
  const hours = String(local.getUTCHours()).padStart(2, '0');
  const minutes = String(local.getUTCMinutes()).padStart(2, '0');
  const seconds = String(local.getUTCSeconds()).padStart(2, '0');
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0');
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetRemainder}`;
}

function nextWorkingStart(now: ZonedParts, preferences: NotificationPreferences): string | undefined {
  const localMidnight = Date.UTC(now.year, now.month, now.day) - now.offsetMinutes * 60_000;
  for (let dayOffset = 0; dayOffset <= 8; dayOffset += 1) {
    const candidateDay = new Date(localMidnight + dayOffset * 24 * 60 * 60_000 + now.offsetMinutes * 60_000);
    const weekday = candidateDay.getUTCDay() as ZonedParts['weekday'];
    const range = preferences.workingHours[weekday];
    if (!range) continue;
    const startMinutes = parseClock(range.start);
    const candidateInstant =
      Date.UTC(
        candidateDay.getUTCFullYear(),
        candidateDay.getUTCMonth(),
        candidateDay.getUTCDate(),
        Math.floor(startMinutes / 60),
        startMinutes % 60,
      ) - now.offsetMinutes * 60_000;
    if (candidateInstant > now.instant) return formatWithOffset(candidateInstant, now.offsetMinutes);
  }
  return undefined;
}

export function planNotificationDelivery(
  notification: VincereNotification,
  preferences: NotificationPreferences,
  nowIso: string,
): NotificationDeliveryPlan {
  const now = zonedParts(nowIso);
  const channels = enabledChannels(preferences);

  if (notification.status === 'completed' || notification.status === 'snoozed') {
    return { decision: 'muted', channels: [], reason: 'Erledigte oder zurückgestellte Meldungen werden nicht zugestellt.' };
  }
  if (channels.length === 0) {
    return { decision: 'muted', channels: [], reason: 'Es ist kein Benachrichtigungskanal aktiviert.' };
  }
  if (PRIORITY_WEIGHT[notification.priority] < PRIORITY_WEIGHT[preferences.minimumPriority]) {
    return { decision: 'muted', channels: [], reason: 'Die Meldung liegt unterhalb der lokalen Prioritätsgrenze.' };
  }
  if (notification.priority === 'critical' && preferences.immediateCritical) {
    return {
      decision: 'deliver_now',
      channels,
      reason: 'Kritische Meldungen dürfen die lokale Ruhezeit überschreiben.',
    };
  }

  const quiet = preferences.quietHours
    ? isInsideRange(now.minuteOfDay, preferences.quietHours)
    : false;
  const workingRange = preferences.workingHours[now.weekday];
  const working = workingRange ? isInsideRange(now.minuteOfDay, workingRange) : false;

  if (!quiet && working) {
    return { decision: 'deliver_now', channels, reason: 'Die Meldung liegt innerhalb der lokalen Arbeitszeit.' };
  }
  if (preferences.dailySummary && PRIORITY_WEIGHT[notification.priority] <= PRIORITY_WEIGHT.normal) {
    return {
      decision: 'daily_summary',
      channels,
      reason: 'Nicht dringende Meldung wird für die tägliche Zusammenfassung vorgemerkt.',
    };
  }
  return {
    decision: 'queue_for_working_hours',
    channels,
    reason: quiet ? 'Lokale Ruhezeit ist aktiv.' : 'Außerhalb der lokalen Arbeitszeit.',
    nextEligibleAt: nextWorkingStart(now, preferences),
  };
}
