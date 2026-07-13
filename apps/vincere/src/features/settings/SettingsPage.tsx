import { useRef, useState } from 'react';
import { Building2, Database, Download, History, RotateCcw, ShieldCheck, Upload, UserRound } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Button, Card, SectionHeader } from '../../components/ui';

const roleLabels = {
  owner: 'Owner',
  admin: 'Administrator',
  agent: 'Makler',
  viewer: 'Lesezugriff',
} as const;

export function SettingsPage() {
  const state = useAppStore();
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
        <SectionHeader title="Workspace & Identität" subtitle="Vorbereitung für sichere Benutzer-, Rollen- und Mandantentrennung" />
        <div className="settings-list">
          <article><span><Building2 /></span><div><strong>{state.workspace.name}</strong><p>{state.workspace.region} · Workspace-ID: {state.workspace.id}</p></div><em>Aktiv</em></article>
          <article><span><UserRound /></span><div><strong>{state.currentUser.name}</strong><p>{state.currentUser.email}</p></div><em>{roleLabels[state.currentUser.role]}</em></article>
          <article><span><ShieldCheck /></span><div><strong>Rollen- und Rechtevertrag</strong><p>Schreibzugriffe laufen bereits über zentrale Berechtigungsprüfungen. Eine echte Anmeldung folgt mit dem Cloud-Backend.</p></div><em>Foundation</em></article>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Daten & Sicherheit" subtitle="Versionierte, prüfbare und workspacegebundene Datenhaltung" />
        <div className="settings-list">
          <article><span><Database /></span><div><strong>Workspace Repository V{state.schemaVersion}</strong><p>Aktuell lokaler Adapter mit klarer Schnittstelle für die spätere Cloud-Datenbank.</p></div><em>Aktiv</em></article>
          <article><span><History /></span><div><strong>Änderungsprotokoll</strong><p>{state.auditEvents.length} lokale Audit-Ereignisse. Mutationen werden mit Nutzer, Workspace und Zeitpunkt protokolliert.</p></div><em>Max. 500</em></article>
          <article><span><Download /></span><div><strong>Backup exportieren</strong><p>Vollständige, versionierte Workspace-Sicherung als JSON erstellen.</p></div><Button variant="secondary" onClick={exportData}>Exportieren</Button></article>
          <article><span><Upload /></span><div><strong>Backup importieren</strong><p>Schema und Workspace-Zugehörigkeit werden vor der Übernahme geprüft. Identität und Rollen werden nicht überschrieben.</p></div><Button variant="secondary" onClick={() => importInput.current?.click()}>Importieren</Button><input ref={importInput} hidden type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} /></article>
          <article><span><RotateCcw /></span><div><strong>Demo zurücksetzen</strong><p>Lokale Arbeitsdaten verwerfen; Workspace und angemeldete Identität bleiben erhalten.</p></div><Button variant="danger" onClick={() => { state.resetDemo(); setMessage('Demodaten wurden zurückgesetzt.'); }}>Zurücksetzen</Button></article>
        </div>
        {message && <div className="empty-state" role="status">{message}</div>}
      </Card>
    </div>
  );
}
