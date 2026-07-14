import { useRef, useState } from 'react';
import { Building2, Cloud, Database, Download, History, LogOut, RotateCcw, ShieldCheck, Upload, UserRound, WifiOff } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { useAuth } from '../../auth/AuthContext';
import { Button, Card, SectionHeader } from '../../components/ui';

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

export function SettingsPage() {
  const state = useAppStore();
  const auth = useAuth();
  const importInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportData = () => {
    const blob = new Blob([state.exportSnapshot()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vincere-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Versionierte Workspace-Sicherung wurde exportiert.');
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
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
          <article><span><ShieldCheck /></span><div><strong>Serverseitige Zugriffskontrolle</strong><p>{auth.configured ? 'Sitzung und Workspace-Mitgliedschaft werden durch Supabase Auth und PostgreSQL Row Level Security geprüft.' : 'Cloud-Zugang ist noch nicht konfiguriert. Die Anwendung läuft kontrolliert im lokalen Entwicklungsmodus.'}</p></div><em>{auth.configured ? 'Aktiv' : 'Lokalmodus'}</em></article>
          {auth.configured && auth.session && <article><span><LogOut /></span><div><strong>Sitzung beenden</strong><p>Lokale Sitzungstokens entfernen und den geschützten Bereich verlassen.</p></div><Button variant="secondary" onClick={() => void auth.signOut()}>Abmelden</Button></article>}
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
          <article><span><Database /></span><div><strong>Relationales Workspace Repository V{state.schemaVersion}</strong><p>{state.cloudSync.mode === 'cloud' ? 'Kontakte, Follow-ups, Immobilien, Termine, Telefon- und Auditereignisse werden getrennt und datensatzweise synchronisiert.' : 'Lokaler Adapter bleibt als sichere Entwicklungs- und Offline-Grundlage aktiv.'}</p></div><em>{state.cloudSync.mode === 'cloud' ? 'Cloud' : 'Lokal'}</em></article>
          <article><span><History /></span><div><strong>Änderungsprotokoll</strong><p>{state.auditEvents.length} Audit-Ereignisse. Mutationen werden mit Nutzer, Workspace und Zeitpunkt protokolliert.</p></div><em>Max. 500</em></article>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Daten & Sicherheit" subtitle="Versionierte, prüfbare und workspacegebundene Sicherungen" />
        <div className="settings-list">
          <article><span><Download /></span><div><strong>Backup exportieren</strong><p>Vollständige, versionierte Workspace-Sicherung als JSON erstellen.</p></div><Button variant="secondary" onClick={exportData}>Exportieren</Button></article>
          <article><span><Upload /></span><div><strong>Backup importieren</strong><p>Schema und Workspace-Zugehörigkeit werden vor der Übernahme geprüft. Identität und Rollen werden nicht überschrieben.</p></div><Button variant="secondary" onClick={() => importInput.current?.click()}>Importieren</Button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} /></article>
          <article><span><RotateCcw /></span><div><strong>Demo zurücksetzen</strong><p>Arbeitsdaten verwerfen; Workspace und angemeldete Identität bleiben erhalten.</p></div><Button variant="danger" onClick={() => { state.resetDemo(); setMessage('Demodaten wurden zurückgesetzt.'); }}>Zurücksetzen</Button></article>
        </div>
        {message && <div className="empty-state" role="status">{message}</div>}
      </Card>
    </div>
  );
}
