import { Database, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Button, Card, SectionHeader } from '../../components/ui';

export function SettingsPage() {
  const state = useAppStore();
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ contacts: state.contacts, followUps: state.followUps, properties: state.properties, appointments: state.appointments, callEvents: state.callEvents }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `vincere-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="page-stack"><Card><SectionHeader title="Daten & Sicherheit" subtitle="Lokale V1-Daten kontrolliert verwalten" /><div className="settings-list"><article><span><Database /></span><div><strong>Lokaler Datenspeicher</strong><p>Die aktuelle Foundation speichert Daten ausschließlich im Browser. Eine zentrale Datenbank folgt als eigenes, geprüftes Arbeitspaket.</p></div><em>Aktiv</em></article><article><span><ShieldCheck /></span><div><strong>Produktionsschutz</strong><p>Kein Merge und kein Deployment ohne ausdrückliche Freigabe.</p></div><em>Workflow-Regel</em></article><article><span><Download /></span><div><strong>Backup exportieren</strong><p>Kontakte, Follow-ups, Immobilien und Gesprächsereignisse als JSON sichern.</p></div><Button variant="secondary" onClick={exportData}>Exportieren</Button></article><article><span><RotateCcw /></span><div><strong>Demo zurücksetzen</strong><p>Lokale Änderungen verwerfen und Ausgangsdaten wiederherstellen.</p></div><Button variant="danger" onClick={state.resetDemo}>Zurücksetzen</Button></article></div></Card></div>;
}
