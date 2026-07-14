import { useState } from 'react';
import { CheckCircle2, CloudDownload, GitCompareArrows, RefreshCw, ShieldAlert, TimerReset } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../../components/ui';

const formatDate = (value: string) => new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const formatValue = (value: unknown) => value === undefined
  ? '—'
  : typeof value === 'string'
    ? value
    : JSON.stringify(value, null, 2);

export function ConflictCenterPage() {
  const store = useAppStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const active = store.conflicts.filter((conflict) => !conflict.deferred);
  const deferred = store.conflicts.filter((conflict) => conflict.deferred);

  return (
    <div className="page-stack">
      <Card className="hero-card collaboration-hero">
        <div>
          <span className="eyebrow"><ShieldAlert size={15} /> Datensicherheit</span>
          <h1>Keine parallele Änderung wird still überschrieben.</h1>
          <p>Lokale und Cloud-Versionen bleiben getrennt sichtbar, bis Sie bewusst entscheiden. VINCERE führt keine automatische Zusammenführung durch, wenn dabei Informationen verloren gehen könnten.</p>
        </div>
        <div className="hero-score"><small>Offene Konflikte</small><strong>{active.length}</strong><span>{deferred.length} zurückgestellt</span></div>
      </Card>

      <Card>
        <SectionHeader title="Konfliktzentrale" subtitle="Lokale Arbeit gegen den aktuellen Cloud-Stand prüfen" />
        {store.conflicts.length === 0 && (
          <EmptyState title="Keine Konflikte" text="Realtime-Änderungen können sicher übernommen werden. Es liegen keine ungeklärten Paralleländerungen vor." />
        )}
        <div className="conflict-list">
          {store.conflicts.map((conflict) => (
            <article className={`conflict-card ${conflict.deferred ? 'is-deferred' : ''}`} key={conflict.id}>
              <div className="conflict-card-head">
                <span className="conflict-icon"><GitCompareArrows /></span>
                <div>
                  <small>{conflict.recordType}</small>
                  <strong>{conflict.recordName}</strong>
                  <span>ID: {conflict.recordId}</span>
                </div>
                <Badge tone={conflict.deferred ? 'neutral' : 'red'}>{conflict.deferred ? 'Zurückgestellt' : 'Prüfung nötig'}</Badge>
              </div>

              <div className="conflict-meta-grid">
                <div><small>Lokale Version</small><strong>V{conflict.localVersion}</strong><span>{formatDate(conflict.localChangedAt)}</span></div>
                <div><small>Cloud-Version</small><strong>V{conflict.cloudVersion}</strong><span>{formatDate(conflict.cloudChangedAt)}</span></div>
                <div><small>Cloud-Benutzer</small><strong>{conflict.cloudActorId ?? 'Nicht verfügbar'}</strong><span>Revision {conflict.cloudRevision}</span></div>
                <div><small>Betroffene Felder</small><strong>{conflict.affectedFields.length}</strong><span>{conflict.affectedFields.slice(0, 3).map((field) => field.path).join(', ') || 'Datensatzstatus'}</span></div>
              </div>

              {expanded === conflict.id && (
                <div className="conflict-comparison">
                  <div className="comparison-heading"><strong>Manueller Feldvergleich</strong><span>Keine Seite wird automatisch bevorzugt.</span></div>
                  <div className="comparison-table">
                    <div className="comparison-row comparison-header"><span>Feld</span><span>Lokal</span><span>Cloud</span></div>
                    {(conflict.affectedFields.length ? conflict.affectedFields : [{ path: 'Datensatz', localValue: conflict.localPayload, cloudValue: conflict.cloudPayload }]).map((field) => (
                      <div className="comparison-row" key={field.path}>
                        <strong>{field.path}</strong>
                        <pre>{formatValue(field.localValue)}</pre>
                        <pre>{formatValue(field.cloudValue)}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="conflict-actions">
                <Button variant="secondary" onClick={() => store.acceptCloudConflict(conflict.id)}><CloudDownload size={16} /> Cloud-Version übernehmen</Button>
                <Button onClick={() => store.retryLocalConflict(conflict.id)}><RefreshCw size={16} /> Lokal erneut prüfen & speichern</Button>
                <Button variant="ghost" onClick={() => setExpanded((current) => current === conflict.id ? null : conflict.id)}><GitCompareArrows size={16} /> Manuell vergleichen</Button>
                <Button variant="ghost" onClick={() => store.deferConflict(conflict.id)} disabled={conflict.deferred}><TimerReset size={16} /> Zurückstellen</Button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card className="collaboration-note">
        <CheckCircle2 />
        <div><strong>Sicherheitsregel</strong><p>„Lokal erneut speichern“ setzt zuerst die bekannte Cloud-Version als neue Prüfgrundlage. Erst danach wird die lokale Fassung mit einer erneuten Versionskontrolle geschrieben.</p></div>
      </Card>
    </div>
  );
}
