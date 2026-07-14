import { useMemo, useState, type ChangeEvent } from 'react';
import { ArchiveX, ClipboardList, Database, FileSearch, ShieldAlert, UserRoundSearch } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import {
  buildPrivacyComplianceReport,
  prepareSubjectRequestPreview,
} from '../../domain/privacy/privacyRules';
import type {
  SubjectRequestPreview,
  SubjectRequestType,
} from '../../domain/privacy/privacyTypes';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../../components/ui';
import { buildPrivacyDashboardView, subjectRequestLabels } from '../privacy/privacyViewModel';

const formatDate = (value: string) => new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const requestTypes = Object.keys(subjectRequestLabels) as SubjectRequestType[];

export function PrivacyComplianceCenterPage() {
  const store = useAppStore();
  const generatedAt = useMemo(() => new Date().toISOString(), []);
  const report = useMemo(() => buildPrivacyComplianceReport(store, [], generatedAt), [generatedAt, store]);
  const view = useMemo(() => buildPrivacyDashboardView(report), [report]);
  const [contactId, setContactId] = useState(store.contacts[0]?.id ?? '');
  const [requestType, setRequestType] = useState<SubjectRequestType>('access');
  const [preview, setPreview] = useState<SubjectRequestPreview | null>(null);

  const createPreview = () => {
    if (!contactId) return;
    setPreview(prepareSubjectRequestPreview(store, [], {
      workspaceId: store.workspace.id,
      contactId,
      requestType,
      requestedAt: generatedAt,
      actorId: store.currentUser.id,
      actorRole: store.currentUser.role,
    }, generatedAt));
  };

  return (
    <div className="page-stack">
      <Card className="hero-card">
        <div>
          <span className="eyebrow"><ShieldAlert size={15} /> Datenschutz und Compliance</span>
          <h1>Prüfpflichten sichtbar machen, ohne Rechtsentscheidungen zu automatisieren.</h1>
          <p>Die Zentrale inventarisiert vorhandene Daten, erkennt technische Lücken und bereitet Betroffenenanfragen ausschließlich als Vorschau vor. Es werden keine Daten gelöscht, exportiert oder rechtlich bewertet.</p>
        </div>
        <Badge tone="gold">Technische Prüfung · keine Rechtsberatung</Badge>
      </Card>

      <div className="kpi-grid">
        {view.metrics.map((metric) => (
          <Card key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeader title="Offene Prüfhinweise" subtitle={`Deterministisch erzeugt am ${formatDate(report.generatedAt)}`} />
        {view.topFindings.length === 0 ? (
          <EmptyState title="Keine technischen Prüfhinweise" text="Für den aktuellen Datenstand wurden keine Regelbefunde erzeugt." />
        ) : (
          <div className="list-stack">
            {view.topFindings.map((finding) => (
              <article key={finding.id} className="list-row">
                <span><ClipboardList size={18} /></span>
                <div>
                  <strong>{finding.title}</strong>
                  <p>{finding.explanation}</p>
                </div>
                <Badge tone={finding.severity === 'high' ? 'red' : finding.severity === 'medium' ? 'gold' : 'neutral'}>
                  {finding.severity === 'high' ? 'Hohe Prüfung' : finding.severity === 'medium' ? 'Prüfung' : 'Hinweis'}
                </Badge>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Dateninventar" subtitle="Aktuelle AppState-Felder und vorbereitete externe Providerkategorie" />
        <div className="list-stack">
          {report.inventory.map((item) => (
            <article className="list-row" key={item.category}>
              <span><Database size={18} /></span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.recordSource} · {item.fields.length} erfasste Feldgruppen</p>
                <small>{item.notes}</small>
              </div>
              <Badge tone={item.externalProvider ? 'blue' : 'neutral'}>{item.externalProvider ? 'Später' : 'Vorhanden'}</Badge>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Betroffenenanfrage vorbereiten" subtitle="Nur Workflow- und Umfangsvorschau; keine Ausführung" />
        {store.contacts.length === 0 ? (
          <EmptyState title="Keine Kontakte" text="Ohne Kontakt kann keine Anfragevorschau vorbereitet werden." />
        ) : (
          <div className="form-grid">
            <label>Kontakt
              <select value={contactId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setContactId(event.target.value); setPreview(null); }}>
                {store.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}
              </select>
            </label>
            <label>Anfragetyp
              <select value={requestType} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setRequestType(event.target.value as SubjectRequestType); setPreview(null); }}>
                {requestTypes.map((type) => <option key={type} value={type}>{subjectRequestLabels[type]}</option>)}
              </select>
            </label>
            <div className="form-actions">
              <Button onClick={createPreview}><FileSearch size={17} /> Vorschau erzeugen</Button>
            </div>
          </div>
        )}

        {preview && (
          <div className="list-stack">
            <article className="list-row">
              <span>{preview.requestType === 'erasure' ? <ArchiveX size={18} /> : <UserRoundSearch size={18} />}</span>
              <div>
                <strong>{subjectRequestLabels[preview.requestType]} · Vorschau</strong>
                <p>{preview.recordGroups.reduce((sum, group) => sum + group.recordCount, 0)} relevante Datensätze in {preview.recordGroups.filter((group) => group.recordCount > 0).length} Kategorien.</p>
                <small>Payload erstellt: nein · Löschung ausgeführt: nein · juristische Entscheidung erforderlich: ja</small>
              </div>
              <Badge tone={preview.canPrepare ? 'green' : 'red'}>{preview.canPrepare ? 'Vorbereitung erlaubt' : 'Nur lesend'}</Badge>
            </article>
            {preview.permissionReason && <p role="status">{preview.permissionReason}</p>}
            {preview.blockers.map((blocker) => <p key={blocker}>• {blocker}</p>)}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Auditübersicht" subtitle="Rolle zum Ereigniszeitpunkt wird nur angezeigt, wenn sie technisch belegt ist" />
        {report.auditTrail.length === 0 ? (
          <EmptyState title="Keine Auditereignisse" text="Im aktuellen Workspace sind keine Auditdaten vorhanden." />
        ) : (
          <div className="list-stack">
            {report.auditTrail.slice(0, 20).map((event) => (
              <article className="list-row" key={event.id}>
                <div>
                  <strong>{event.action}</strong>
                  <p>{event.summary}</p>
                  <small>{formatDate(event.occurredAt)} · Benutzer {event.actorId} · Rolle {event.actorRole}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
