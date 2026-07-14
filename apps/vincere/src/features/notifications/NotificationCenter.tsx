import type {
  NotificationCenterFilters,
  NotificationStatus,
  VincereNotification,
} from '../../domain/notifications/types';
import { buildNotificationCenterModel } from './notificationCenterModel';

export type NotificationCenterSection =
  | 'unread'
  | 'today'
  | 'critical'
  | 'system'
  | 'snoozed'
  | 'completed';

export interface NotificationCenterProps {
  notifications: VincereNotification[];
  now: string;
  filters?: NotificationCenterFilters;
  activeSection?: NotificationCenterSection;
  onSectionChange?: (section: NotificationCenterSection) => void;
  onOpenRecord?: (notification: VincereNotification) => void;
  onStatusChange?: (notificationId: string, status: NotificationStatus) => void;
}

const SECTION_LABELS: Record<NotificationCenterSection, string> = {
  unread: 'Ungelesen',
  today: 'Heute relevant',
  critical: 'Kritisch',
  system: 'System',
  snoozed: 'Zurückgestellt',
  completed: 'Erledigt',
};

const TYPE_LABELS: Record<VincereNotification['type'], string> = {
  information: 'Information',
  reminder: 'Erinnerung',
  warning: 'Warnung',
  critical: 'Kritisch',
  system_status: 'Systemstatus',
  conflict: 'Konflikt',
  appointment: 'Termin',
  follow_up: 'Follow-up',
  sales_opportunity: 'Vertriebschance',
};

function formatTimestamp(value: string | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Keine Fälligkeit';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NotificationCenter({
  notifications,
  now,
  filters = {},
  activeSection = 'unread',
  onSectionChange,
  onOpenRecord,
  onStatusChange,
}: NotificationCenterProps) {
  const model = buildNotificationCenterModel(notifications, now, filters);
  const activeNotifications = model[activeSection];
  const activeGroups = buildNotificationCenterModel(activeNotifications, now).groups;

  return (
    <section className="notification-center" aria-labelledby="notification-center-title">
      <header className="notification-center__header">
        <div>
          <p className="notification-center__eyebrow">VINCERE</p>
          <h1 id="notification-center-title">Benachrichtigungszentrale</h1>
          <p>Priorisierte Hinweise mit nachvollziehbarer Begründung und nächster Aktion.</p>
        </div>
        <output aria-label="Anzahl ungelesener Meldungen">{model.unread.length} ungelesen</output>
      </header>

      <nav className="notification-center__sections" aria-label="Benachrichtigungsbereiche">
        {(Object.keys(SECTION_LABELS) as NotificationCenterSection[]).map((section) => (
          <button
            key={section}
            type="button"
            aria-pressed={activeSection === section}
            onClick={() => onSectionChange?.(section)}
          >
            {SECTION_LABELS[section]} <span>{model[section].length}</span>
          </button>
        ))}
      </nav>

      {activeGroups.length === 0 ? (
        <div className="notification-center__empty" role="status">
          Keine Meldungen in diesem Bereich.
        </div>
      ) : (
        <div className="notification-center__groups">
          {activeGroups.map((group) => (
            <article className="notification-center__group" key={group.key}>
              <header>
                <div>
                  <h2>{group.label}</h2>
                  <p>{group.notifications.length} relevante Meldung(en)</p>
                </div>
                {group.nextAction ? <strong>Nächste Aktion: {group.nextAction}</strong> : null}
              </header>

              <ul>
                {group.notifications.map((notification) => (
                  <li key={notification.id} data-priority={notification.priority}>
                    <div className="notification-center__notification-heading">
                      <span>{TYPE_LABELS[notification.type]}</span>
                      <span>{notification.priority}</span>
                      <span>{notification.escalation.stage}</span>
                    </div>
                    <h3>{notification.record.label}</h3>
                    <p>{notification.reason}</p>
                    <dl>
                      <div>
                        <dt>Fälligkeit</dt>
                        <dd>{formatTimestamp(notification.dueAt)}</dd>
                      </div>
                      <div>
                        <dt>Empfohlene Aktion</dt>
                        <dd>{notification.recommendedAction}</dd>
                      </div>
                    </dl>
                    <div className="notification-center__actions">
                      <button type="button" onClick={() => onOpenRecord?.(notification)}>
                        Datensatz öffnen
                      </button>
                      {notification.status === 'unread' ? (
                        <button
                          type="button"
                          onClick={() => onStatusChange?.(notification.id, 'read')}
                        >
                          Als gelesen markieren
                        </button>
                      ) : null}
                      {notification.status !== 'completed' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onStatusChange?.(notification.id, 'snoozed')}
                          >
                            Zurückstellen
                          </button>
                          <button
                            type="button"
                            onClick={() => onStatusChange?.(notification.id, 'completed')}
                          >
                            Erledigen
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
