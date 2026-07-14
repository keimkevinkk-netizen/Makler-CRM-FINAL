import {
  CloudOff,
  Download,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { OfflineStatusView } from './offlineStatus';

const statusIcon = {
  offline: WifiOff,
  local_pending: CloudOff,
  sync_paused: CloudOff,
  conflict_possible: ShieldAlert,
  reconnected: RefreshCw,
  update_available: Download,
  online: Wifi,
} as const;

export interface OfflineStatusBannerProps {
  status: OfflineStatusView;
  version: string;
  onApplyUpdate: () => void;
}

export function OfflineStatusBanner({ status, version, onApplyUpdate }: OfflineStatusBannerProps) {
  if (status.code === 'online') {
    return <span className="mobile-version-chip" aria-label={`VINCERE Version ${version}`}>v{version}</span>;
  }

  const Icon = statusIcon[status.code];

  return (
    <section className={`mobile-status mobile-status-${status.code}`} role="status" aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{status.title}</strong>
        <span>{status.detail}</span>
      </div>
      <small>v{version}</small>
      {status.code === 'update_available' && (
        <button type="button" onClick={onApplyUpdate}>Aktualisieren</button>
      )}
    </section>
  );
}
