import { useRef, useState } from 'react';
import { Building2, Cloud, Database, Download, Flag, History, LogOut, RotateCcw, ShieldCheck, Upload, UserRound, WifiOff } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { listFeatureFlags } from '../../config/featureFlags';
import { runtimeConfig } from '../../config/runtime';
import { Button, Card, SectionHeader } from '../../components/ui';
import { inMemoryObservability } from '../../observability/observability';

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

const roleLabels = {
  owner: 'Owner',
  admin: 'Administrator',
  agent: 'Makler',
  viewer: 'Lesezugriff',
} as const;

const syncLabels = {
  local: 'Nur lokal',
  loading: 'Cloud wird geladen',
  saving: 'Wird gespeichert',
  synced: 'Synchronisiert',
  offline: 'Offline / nicht erreichbar',
  conflict: 'Versionskonflikt',
  error: 'Fehler',
} as const;

const featureStatusLabels = {
  stable: 'Stabil',
  experimental: 'Experimentell',
  disabled: 'Deaktiviert',
  internal: 'Intern',
} as const;

export function SettingsPage() {
  const state = useAppStore();
  const auth = useAuth();
  const importInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const flags = listFeatureFlags();
  const canManageBackups = can(state.currentUser, 'backup:manage');

  const exportData = () => {
    try {
      const blob = new Blob([state.exportSnapshot()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `vincere-${runtimeConfig.environment}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Versionierte Workspace-Sicherung wurde exportiert. Die Datei enthält personenbezogene Daten und muss geschützt aufbewahrt werden.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Der Export konnte nicht erstellt werden.');
    }
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Die Importdatei überschreitet das sichere Limit von 10 MB.');
      if (file.type && file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
        throw new Error('Es werden ausschließlich JSON-Sicherungen akzeptiert.');
      }
      state.importSnapshot(await file.text());
      setMessage('Sicherung geprüft und erfolgreich importiert.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Die Sicherung konnte nicht importiert werden.');
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  };

  return (
    <div className="page-stack">
      <Card>
        <SectionHeader title="Workspace & Identität" subtitle="Authentifizierte Benutzer-, Rollen- und Mandantentrennung" />
        <div className="settings-list">
          <article><span><Building2 /></span><div><strong>{state.workspace.name}</strong><p>{state.workspace.region} · Workspace-ID: {state.workspace.id}</p></div><em>Aktiv</em></article>
          <article><span><UserRound /></span><div><strong>{state.currentUser.name}</strong><p>{state.currentUser.email}</p></div><em>{roleLabels[state.currentUser.role]}</em></article>
          <article><span><ShieldCheck /></span><div><strong>Serverseitige Zugriffskontrolle</strong><p>{auth.configured ? 'Sitzung und Workspace-Mitgliedschaft werden durch Supabase Auth und PostgreSQL Row Level Security geprüft.' : 'Cloud-Zugang ist nur im lokalen oder kontrollierten Preview-Modus optional.'}</p></div><em>{auth.configured ? 'Aktiv' : 'Lokalmodus'}</em></article>
          {auth.configured && auth.session && <article><span><LogOut /></span><div><strong>Sitzung beenden</strong><p>Sitzungstokens und lokale Echtdaten entfernen und den geschützten Bereich verlassen.</p></div><Button variant="secondary" onClick={() => void auth.signOut()}>Abmelden</Button></article>}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Umgebung & Feature Flags" subtitle="Explizite Trennung von stabilen, experimentellen, deaktivierten und internen Funktionen" />
        <div className="settings-list">
          <article><span><Flag /></span><div><strong>{runtimeConfig.environment.toUpperCase()} · {runtimeConfig.dataMode.toUpperCase()}</strong><p>Version {runtimeConfig.appVersion} · Release {runtimeConfig.release} · {runtimeConfig.mockDataEnabled ? 'sichtbare Testdaten aktiv' : 'keine Mock-Daten aktiv'}</p></div><em>{runtimeConfig.protectedDataReady ? 'Freigegeben' : 'Blockiert'}</em></article>
          <article><span><Cloud /></span><div><strong>Produktive Providerfunktionen</strong><p>Provider werden nur durch eine explizite Environment-Freigabe aktiviert. Es ist keine Überwachungs- oder Kommunikationsplattform fest verdrahtet.</p></div><em>{runtimeConfig.providerFunctionsEnabled ? 'Konfiguriert' : 'Aus'}</em></article>
          {flags.map((flag) => (
            <article key={flag.key}>
              <span><Flag /></span>
              <div><strong>{flag.label}</strong><p>{flag.reason}</p></div>
              <em>{featureStatusLabels[flag.status]} · {flag.enabled ? 'An' : 'Aus'}</em>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Cloud-Synchronisation" subtitle="Lokale Arbeitsfähigkeit mit mandantengeschützter Cloud-Persistenz" />
        <div className="settings-list">
          <article>
            <span>{state.cloudSync.status === 'offline' || state.cloudSync.status === 'conflict' ? <WifiOff /> : <Cloud />}</span>
            <div><strong>{syncLabels[state.cloudSync.status]}</strong><p>{state.cloudSync.error ?? (state.cloudSync.lastSyncedAt ? `Letzte Synchronisation: ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.cloudSync.lastSyncedAt))}` : 'Noch keine Cloud-Synchronisation durchgeführt.')}</p></div>
            <em>Revision {state.cloudSync.version}</em>
          </article>
          <article><span><Database /></span><div><strong>Relationales Workspace Repository V{state.schemaVersion}</strong><p>{state.cloudSync.mode === 'cloud' ? 'Kontakte, Follow-ups, Immobilien, Termine, Telefon- und Auditereignisse werden getrennt, seitenweise geladen und datensatzweise synchronisiert.' : 'Lokaler Adapter bleibt als sichere Entwicklungsgrundlage aktiv.'}</p></div><em>{state.cloudSync.mode === 'cloud' ? 'Cloud' : 'Lokal'}</em></article>
          <article><span><History /></span><div><strong>Änderungs- und Fehlerprotokoll</strong><p>{state.auditEvents.length} Audit-Ereignisse · {inMemoryObservability.events().length} technisch bereinigte Observability-Ereignisse in dieser Sitzung.</p></div><em>Nur Sitzung</em></article>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Daten & Sicherheit" subtitle="Versionierte, prüfbare und workspacegebundene Sicherungen" />
        <div className="settings-list">
          <article><span><Download /></span><div><strong>Backup exportieren</strong><p>Vollständige, versionierte Workspace-Sicherung als JSON erstellen. Der Export enthält personenbezogene Daten.</p></div><Button variant="secondary" disabled={!canManageBackups} onClick={exportData}>Exportieren</Button></article>
          <article><span><Upload /></span><div><strong>Backup importieren</strong><p>Maximal 10 MB. Schema und Workspace-Zugehörigkeit werden geprüft; Identität und Rollen werden nicht überschrieben.</p></div><Button variant="secondary" disabled={!canManageBackups} onClick={() => importInput.current?.click()}>Importieren</Button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} /></article>
          {runtimeConfig.mockDataEnabled && <article><span><RotateCcw /></span><div><strong>Demodaten zurücksetzen</strong><p>Lokale Testdaten verwerfen; Workspace und angemeldete Identität bleiben erhalten.</p></div><Button variant="danger" disabled={!canManageBackups} onClick={() => { state.resetDemo(); setMessage('Demodaten wurden zurückgesetzt.'); }}>Zurücksetzen</Button></article>}
        </div>
        {message && <div className="empty-state" role="status" aria-live="polite">{message}</div>}
      </Card>
    </div>
  );
}
