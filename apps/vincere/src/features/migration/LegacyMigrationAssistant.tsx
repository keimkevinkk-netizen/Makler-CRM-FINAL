import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, DatabaseZap, Download, FileJson, FlaskConical, Link2Off, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../../components/ui';
import { buildMigrationReport } from './report';
import { createLegacyImportPackage, importPackageJson } from './importer';
import type { MigrationPreview, VincereImportPackage } from './types';

const SYNTHETIC_DEMO = JSON.stringify({
  kk_crm_contacts: [
    { id: 'demo-contact-owner', firstName: 'Demo', lastName: 'Eigentümer', phone: '+49 000 100000', email: 'owner@demo.invalid', city: 'Demo-Stadt', role: 'Eigentümer', status: 'qualified' },
    { id: 'demo-contact-buyer', name: 'Demo Käufer', phone: '+49 000 200000', email: 'buyer@demo.invalid', city: 'Demo-Stadt', role: 'Käufer' },
  ],
  kk_eigentuemer: [{ id: 'legacy-owner-copy', name: 'Demo Eigentümer', phone: '+49 000 100000', city: 'Demo-Stadt' }],
  kk_followups: [{ id: 'demo-followup', contactId: 'demo-contact-owner', title: 'Demo-Rückruf', dueAt: '2030-01-02T09:00:00.000Z', priority: 'high' }],
  kk_crm_objects: [{ id: 'demo-property', title: 'Demo-Objekt', address: 'Musterweg 1', city: 'Demo-Stadt', type: 'Einfamilienhaus', ownerId: 'demo-contact-owner', estimatedValue: 450000 }],
  kk_sales_pipeline: [{ id: 'demo-deal', contactId: 'demo-contact-owner', title: 'Demo-Mandat', stage: 'appointment', value: 450000 }],
}, null, 2);

const duplicateLabels = {
  certain: 'Sicher identisch',
  probable: 'Wahrscheinlich identisch',
  manual: 'Manuelle Prüfung',
  separate: 'Eindeutig getrennt',
} as const;

function downloadText(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function packageCounts(importPackage: VincereImportPackage) {
  return [
    ['Kontakte', importPackage.records.contacts.length],
    ['Follow-ups', importPackage.records.followUps.length],
    ['Immobilien', importPackage.records.properties.length],
    ['Termine', importPackage.records.appointments.length],
    ['Telefonereignisse', importPackage.records.callEvents.length],
    ['Erweiterungsdaten', importPackage.extensions.activities.length + importPackage.extensions.pipelineEntries.length + importPackage.extensions.valuationOpportunities.length + importPackage.extensions.marketObservations.length],
  ] as const;
}

export function LegacyMigrationAssistant() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<MigrationPreview>();
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  const analyse = async (fileName: string, payload: string) => {
    setWorking(true);
    setMessage('');
    try {
      const result = createLegacyImportPackage(payload);
      setPreview({
        fileName,
        sourceFingerprint: result.package.sourceFingerprint,
        sources: result.sources,
        package: result.package,
        report: buildMigrationReport(fileName, result.sources, result.package),
      });
      setMessage('Datei wurde lokal analysiert. Es wurden keine Daten gespeichert oder übertragen.');
    } catch (error) {
      setPreview(undefined);
      setMessage(error instanceof Error ? error.message : 'Die Importdatei konnte nicht verarbeitet werden.');
    } finally {
      setWorking(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const analyseFile = async (file?: File) => {
    if (!file) return;
    await analyse(file.name, await file.text());
  };

  const warnings = preview?.package.migration.issues.filter((issue) => issue.severity === 'warning') ?? [];
  const errors = preview?.package.migration.issues.filter((issue) => issue.severity === 'error') ?? [];

  return (
    <Card className="migration-assistant">
      <SectionHeader
        title="MaklerCRM → VINCERE Migrationsassistent"
        subtitle="Lokale, wiederholbare Analyse exportierter JSON-Daten – ohne Cloud-Schreibzugriff"
        action={<Badge tone="gold">Trockenlauf</Badge>}
      />

      <div className="migration-security-banner">
        <ShieldCheck size={20} />
        <div><strong>Geschützter Analysemodus</strong><span>Die ausgewählte Datei bleibt im Browser. Altdaten, AppStore und Cloud-Repository werden nicht verändert.</span></div>
      </div>

      <div className="migration-actions">
        <Button onClick={() => fileInput.current?.click()} disabled={working}><Upload size={16} />{working ? 'Wird geprüft …' : 'JSON-Datei auswählen'}</Button>
        <Button variant="secondary" onClick={() => void analyse('vincere-synthetische-testdaten.json', SYNTHETIC_DEMO)} disabled={working}><FlaskConical size={16} />Synthetische Testdaten</Button>
        <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={(event) => void analyseFile(event.target.files?.[0])} />
      </div>

      {message && <div className={`migration-message ${preview ? 'is-success' : 'is-error'}`} role="status">{preview ? <CheckCircle2 size={17} /> : <XCircle size={17} />}<span>{message}</span></div>}

      {!preview ? (
        <EmptyState title="Noch keine Importvorschau" text="Wähle einen MaklerCRM-JSON-Export oder lade die vollständig synthetischen Testdaten. Es wird nichts automatisch importiert." />
      ) : (
        <div className="migration-results">
          <div className="migration-summary-grid">
            {packageCounts(preview.package).map(([label, count]) => <article key={label}><span>{label}</span><strong>{count}</strong></article>)}
          </div>

          <div className="migration-section">
            <div className="migration-section-title"><FileJson size={17} /><div><strong>Erkannte Datenquellen</strong><span>{preview.fileName} · Fingerprint {preview.sourceFingerprint}</span></div></div>
            <div className="migration-source-list">
              {preview.sources.map((source) => (
                <article key={source.key}>
                  <code>{source.key}</code>
                  <span>{source.description}</span>
                  <Badge tone={source.status === 'canonical' ? 'green' : source.status === 'parallel' ? 'gold' : 'neutral'}>{source.status}</Badge>
                  <strong>{source.count}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="migration-two-column">
            <div className="migration-section">
              <div className="migration-section-title"><AlertTriangle size={17} /><div><strong>Fehler & Warnungen</strong><span>{errors.length} Fehler · {warnings.length} Warnungen</span></div></div>
              <div className="migration-issue-list">
                {[...errors, ...warnings].slice(0, 20).map((issue, index) => <article key={`${issue.code}-${issue.sourceKey}-${index}`} className={issue.severity}><strong>{issue.code}</strong><span>{issue.message}</span><small>{issue.sourceKey ?? 'Paketweit'}{issue.sourceIndex === undefined ? '' : ` · Datensatz ${issue.sourceIndex + 1}`}</small></article>)}
                {errors.length + warnings.length === 0 && <p className="migration-inline-empty">Keine Fehler oder Warnungen erkannt.</p>}
              </div>
            </div>

            <div className="migration-section">
              <div className="migration-section-title"><DatabaseZap size={17} /><div><strong>Dublettenbewertung</strong><span>Automatische Zusammenführung nur bei hoher Sicherheit</span></div></div>
              <div className="migration-duplicate-list">
                {(['certain', 'probable', 'manual', 'separate'] as const).map((category) => {
                  const groups = preview.package.migration.duplicates.filter((item) => item.category === category);
                  return <article key={category}><span>{duplicateLabels[category]}</span><strong>{groups.length}</strong><small>{groups.reduce((sum, group) => sum + group.recordIds.length, 0)} Datensätze</small></article>;
                })}
              </div>
            </div>
          </div>

          <div className="migration-section">
            <div className="migration-section-title"><Link2Off size={17} /><div><strong>Nicht auflösbare Verknüpfungen</strong><span>Unsichere Zuordnungen werden bewusst nicht geraten</span></div></div>
            {preview.package.migration.unresolvedRelationships.length === 0 ? <p className="migration-inline-empty">Alle vorhandenen Beziehungen konnten eindeutig aufgelöst werden.</p> : (
              <div className="migration-table-wrap"><table className="migration-table"><thead><tr><th>Quelle</th><th>Beziehung</th><th>Referenz</th><th>Kandidaten</th><th>Grund</th></tr></thead><tbody>{preview.package.migration.unresolvedRelationships.slice(0, 50).map((item) => <tr key={`${item.sourceKey}-${item.sourceIndex}-${item.relationship}`}><td><code>{item.sourceKey}</code></td><td>{item.relationship}</td><td>{item.legacyReference ?? '—'}</td><td>{item.candidateContactIds.length}</td><td>{item.reason}</td></tr>)}</tbody></table></div>
            )}
          </div>

          <div className="migration-section">
            <div className="migration-section-title"><DatabaseZap size={17} /><div><strong>Importvorschau</strong><span>Erste normalisierte Datensätze; noch keine Übernahme in den aktiven Workspace</span></div></div>
            <div className="migration-preview-grid">
              <div><strong>Kontakte</strong>{preview.package.records.contacts.slice(0, 8).map((contact) => <span key={contact.id}>{contact.firstName} {contact.lastName}<small>{contact.role} · {contact.city || 'Ort offen'}</small></span>)}</div>
              <div><strong>Immobilien</strong>{preview.package.records.properties.slice(0, 8).map((property) => <span key={property.id}>{property.title}<small>{property.status} · {property.city || 'Ort offen'}</small></span>)}</div>
              <div><strong>Follow-ups</strong>{preview.package.records.followUps.slice(0, 8).map((followUp) => <span key={followUp.id}>{followUp.title}<small>{followUp.status} · {followUp.dueAt}</small></span>)}</div>
            </div>
          </div>

          <div className="migration-downloads">
            <div><strong>Prüfbare Ergebnisse herunterladen</strong><span>Das Paket enthält normalisierte Daten, Erweiterungsdaten, Warnungen, Dubletten und offene Verknüpfungen.</span></div>
            <Button variant="secondary" onClick={() => downloadText(`vincere-importpaket-${preview.sourceFingerprint}.json`, importPackageJson(preview.package), 'application/json')}><Download size={16} />Importpaket</Button>
            <Button variant="secondary" onClick={() => downloadText(`vincere-migrationsbericht-${preview.sourceFingerprint}.md`, preview.report, 'text/markdown')}><Download size={16} />Migrationsbericht</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
