export type CloudStatus = 'local' | 'loading' | 'saving' | 'synced' | 'offline' | 'conflict' | 'error';

export type OfflineStatusCode =
  | 'offline'
  | 'local_pending'
  | 'sync_paused'
  | 'conflict_possible'
  | 'reconnected'
  | 'update_available'
  | 'online';

export interface OfflineStatusInput {
  online: boolean;
  reconnected: boolean;
  pendingCount: number;
  conflictCount: number;
  cloudStatus: CloudStatus;
  lastConfirmedAt?: string;
  updateAvailable: boolean;
}

export interface OfflineStatusView {
  code: OfflineStatusCode;
  title: string;
  detail: string;
  persistent: boolean;
}

function formatCloudTime(value?: string) {
  if (!value) return 'Noch kein bestätigter Cloud-Stand verfügbar.';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bestätigter Cloud-Zeitpunkt ist ungültig.';
  return `Letzter bestätigter Cloud-Stand: ${new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)}.`;
}

export function deriveOfflineStatus(input: OfflineStatusInput): OfflineStatusView {
  const cloudTime = formatCloudTime(input.lastConfirmedAt);

  if (!input.online) {
    return {
      code: 'offline',
      title: 'Offline',
      detail: input.pendingCount > 0
        ? `${input.pendingCount} lokale Entwürfe warten. Synchronisation ist pausiert. ${cloudTime}`
        : `Keine Netzwerkverbindung. ${cloudTime}`,
      persistent: true,
    };
  }

  if (input.conflictCount > 0 || (input.pendingCount > 0 && input.cloudStatus === 'conflict')) {
    return {
      code: 'conflict_possible',
      title: 'Konflikt möglich',
      detail: `${input.pendingCount} lokale Entwürfe werden nicht automatisch übertragen. Cloud-Stand und lokale Erfassung müssen geprüft werden. ${cloudTime}`,
      persistent: true,
    };
  }

  if (input.reconnected) {
    return {
      code: 'reconnected',
      title: 'Verbindung wiederhergestellt',
      detail: input.pendingCount > 0
        ? `Synchronisation bleibt pausiert, bis ${input.pendingCount} lokale Entwürfe geprüft wurden. ${cloudTime}`
        : `Die Verbindung ist wieder verfügbar. ${cloudTime}`,
      persistent: input.pendingCount > 0,
    };
  }

  if (input.pendingCount > 0) {
    return {
      code: 'local_pending',
      title: 'Lokale Änderungen ausstehend',
      detail: `${input.pendingCount} temporäre Entwürfe sind nur in dieser Sitzung vorhanden. Synchronisation ist pausiert. ${cloudTime}`,
      persistent: true,
    };
  }

  if (input.cloudStatus === 'offline' || input.cloudStatus === 'error') {
    return {
      code: 'sync_paused',
      title: 'Synchronisation pausiert',
      detail: `Die App ist erreichbar, der Cloud-Abgleich jedoch nicht bestätigt. ${cloudTime}`,
      persistent: true,
    };
  }

  if (input.updateAvailable) {
    return {
      code: 'update_available',
      title: 'Update verfügbar',
      detail: 'Eine neue App-Version ist bereit. Vor dem Aktualisieren lokale Entwürfe prüfen.',
      persistent: true,
    };
  }

  return {
    code: 'online',
    title: 'Online',
    detail: cloudTime,
    persistent: false,
  };
}
