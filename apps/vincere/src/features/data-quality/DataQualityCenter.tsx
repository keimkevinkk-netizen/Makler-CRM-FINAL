import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSearch, GitMerge, Link2Off, RefreshCw, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';
import { analyseDataQuality } from '../../domain/data-quality/engine';
import { buildDataQualityMarkdown, exportDataQualityReport } from '../../domain/data-quality/report';
import type { DataQualityIssue, DuplicateCategory } from '../../domain/data-quality/types';

const duplicateLabels: Record<DuplicateCategory, string> = {
  certain: 'Sicher identisch',
  very_likely: 'Sehr wahrscheinlich identisch',
  possible: 'Möglicherweise identisch',
  manual: 'Manuelle Prüfung',
  separate: 'Eindeutig getrennt',
};

const severityLabels = { critical: 'Kritisch', warning: 'Warnung', info: 'Hinweis' } as const;

function downloadText(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function issueTone(issue: DataQualityIssue) {
  if (issue.severity === 'critical') return 'red' as const;
  if (issue.severity === 'warning') return 'gold' as const;
  return 'blue' as const;
}

export function DataQualityCenter() {
  const state = useAppStore();
  const [analysisTime, setAnalysisTime] = useState(() => new Date().toISOString());
  const [selectedMergeId, setSelectedMergeId] = useState<string>();
  const input = useMemo(() => ({
    contacts: state.contacts,
    followUps: state.followUps,
    properties: state.properties,
    appointments: state.appointments,
    callEvents: state.callEvents,
    auditEvents: state.auditEvents,
  }), [state.appointments, state.auditEvents, state.callEvents, state.contacts, state.followUps, state.properties]);
  const result = useMemo(() => analyseDataQuality(input, { now: analysisTime }), [analysisTime, input]);
  const contactNames = useMemo(() => new Map(state.contacts.map((contact) => [contact.id, `${contact.firstName} ${contact.lastName}`.trim() || contact.id])), [state.contacts]);
  const selectedMerge = result.mergePreviews.find((preview) => preview.id === selectedMergeId) ?? result.mergePreviews[0];
  const metrics = [
    ['Gesamtqualität', `${result.summary.overallScore}/100`],
    ['Kritische Fehler', result.summary.criticalErrors],
    ['Dubletten', result.summary.duplicates],
    ['Unvollständige Kontakte', result.summary.incompleteContacts],
    ['Verwaiste Datensätze', result.summary.orphanedRecords],
    ['Fehlerhafte Beziehungen', result.summary.invalidRelationships],
    ['Schnell behebbar', result.summary.quickFixes],
  ] as const;
  const distribution = result.summary.qualityDistribution;
  const distributionTotal = Math.max(1, distribution.excellent + distribution.good + distribution.atRisk + distribution.critical);

  return (
    <Card className="data-quality-center">
      <SectionHeader
        title="Datenqualitäts-, Dubletten- und Integritätszentrale"
        subtitle="Deterministische Prüfung des aktiven Workspace – vollständig lesend und ohne automatische Korrekturen"
        action={<Badge tone="green">Nur Vorschau</Badge>}
      />

      <div className="data-quality-safety">
        <ShieldCheck size={20} />
        <div><strong>Keine Mutation, kein Merge, kein Cloud-Schreibvorgang</strong><span>Alle Korrekturen und Kontaktzusammenführungen werden ausschließlich als prüfbarer Vorschauplan erzeugt.</span></div>
        <Button variant="secondary" onClick={() => { setAnalysisTime(new Date().toISOString()); setSelectedMergeId(undefined); }}><RefreshCw size={16} />Neu prüfen</Button>
      </div>

      <div className="data-quality-metrics">
        {metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>

      <div className="data-quality-grid">
        <section className="data-quality-panel">
          <div className="data-quality-panel-title"><FileSearch size={18} /><div><strong>Prüfbericht</strong><span>{result.issues.length} Befunde · Analyse {new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.generatedAt))}</span></div></div>
          <div className="data-quality-issue-list">
            {result.issues.slice(0, 40).map((issue) => (
              <article key={issue.id}>
                <Badge tone={issueTone(issue)}>{severityLabels[issue.severity]}</Badge>
                <div><strong>{issue.title}</strong><p>{issue.description}</p><small>{issue.entityType}{issue.entityId ? ` · ${issue.entityId}` : ''}{issue.field ? ` · ${issue.field}` : ''}</small></div>
              </article>
            ))}
            {result.issues.length === 0 && <div className="data-quality-empty"><CheckCircle2 size={18} />Keine Qualitätsprobleme erkannt.</div>}
          </div>
        </section>

        <section className="data-quality-panel">
          <div className="data-quality-panel-title"><Users size={18} /><div><strong>Qualitätsverteilung</strong><span>Kontaktbezogene Qualitätsklassen</span></div></div>
          <div className="data-quality-distribution" aria-label="Qualitätsverteilung">
            {([
              ['Exzellent', distribution.excellent, 'excellent'],
              ['Gut', distribution.good, 'good'],
              ['Gefährdet', distribution.atRisk, 'risk'],
              ['Kritisch', distribution.critical, 'critical'],
            ] as const).map(([label, count, className]) => (
              <article key={label}>
                <div><span>{label}</span><strong>{count}</strong></div>
                <span className="data-quality-bar"><i className={className} style={{ width: `${Math.round((count / distributionTotal) * 100)}%` }} /></span>
              </article>
            ))}
          </div>

          <div className="data-quality-panel-title compact"><Wrench size={18} /><div><strong>Sichere Korrekturvorschläge</strong><span>{result.suggestions.length} Vorschläge mit Begründung und Nebenwirkungen</span></div></div>
          <div className="data-quality-suggestion-list">
            {result.suggestions.slice(0, 24).map((suggestion) => (
              <article key={suggestion.id}>
                <div><strong>{suggestion.action.replaceAll('_', ' ')}</strong><span>{suggestion.entityType} · {suggestion.entityId}</span></div>
                <Badge tone={suggestion.confidence === 'certain' ? 'green' : suggestion.confidence === 'high' ? 'blue' : 'neutral'}>{suggestion.confidence}</Badge>
                <p>{suggestion.reason}</p>
                <small>Nebenwirkung: {suggestion.sideEffects.join(' ')}</small>
              </article>
            ))}
            {result.suggestions.length === 0 && <div className="data-quality-empty"><CheckCircle2 size={18} />Keine sicheren Korrekturvorschläge erforderlich.</div>}
          </div>
        </section>
      </div>

      <section className="data-quality-panel data-quality-duplicates">
        <div className="data-quality-panel-title"><GitMerge size={18} /><div><strong>Dublettenmodell und Merge-Vorschau</strong><span>Jede Bewertung erklärt ihre Faktoren; keine Zusammenführung wird ausgeführt.</span></div></div>
        <div className="data-quality-duplicate-layout">
          <div className="data-quality-duplicate-list">
            {result.duplicateAssessments.filter((assessment) => assessment.category !== 'separate').map((assessment) => {
              const preview = result.mergePreviews.find((item) => item.assessmentId === assessment.id);
              return (
                <button key={assessment.id} className={selectedMerge?.assessmentId === assessment.id ? 'is-active' : ''} onClick={() => preview && setSelectedMergeId(preview.id)}>
                  <span><strong>{contactNames.get(assessment.primaryContactId) ?? assessment.primaryContactId}</strong><small>vs. {contactNames.get(assessment.candidateContactId) ?? assessment.candidateContactId}</small></span>
                  <span><Badge tone={assessment.category === 'certain' ? 'red' : assessment.category === 'very_likely' ? 'gold' : 'neutral'}>{duplicateLabels[assessment.category]}</Badge><b>{assessment.score}/100</b></span>
                  <small>{assessment.factors.filter((factor) => factor.matched).map((factor) => `${factor.label} (${factor.contribution > 0 ? '+' : ''}${factor.contribution})`).join(' · ')}</small>
                </button>
              );
            })}
            {result.duplicateAssessments.every((assessment) => assessment.category === 'separate') && <div className="data-quality-empty"><CheckCircle2 size={18} />Keine prüfungsrelevanten Dubletten erkannt.</div>}
          </div>

          <div className="data-quality-merge-preview">
            {!selectedMerge ? <div className="data-quality-empty"><GitMerge size={18} />Keine Merge-Vorschau erforderlich.</div> : (
              <>
                <div className="data-quality-merge-heading">
                  <div><strong>{contactNames.get(selectedMerge.primaryContactId) ?? selectedMerge.primaryContactId}</strong><span>Hauptkontakt</span></div>
                  <GitMerge size={18} />
                  <div><strong>{contactNames.get(selectedMerge.duplicateContactId) ?? selectedMerge.duplicateContactId}</strong><span>Mögliche Dublette</span></div>
                </div>
                <div className="data-quality-merge-facts">
                  <span><b>{selectedMerge.conflicts.length}</b> Feldkonflikte</span>
                  <span><b>{selectedMerge.relationshipTransfers.length}</b> Beziehungen</span>
                  <span><b>{selectedMerge.manualDecisions.length}</b> manuelle Entscheidungen</span>
                </div>
                <div className="data-quality-table-wrap"><table><thead><tr><th>Feld</th><th>Hauptkontakt</th><th>Dublette</th><th>Vorschlag</th></tr></thead><tbody>{selectedMerge.fields.map((field) => <tr key={field.field} className={field.conflict ? 'has-conflict' : ''}><td>{field.field}</td><td>{String(field.primaryValue ?? '—')}</td><td>{String(field.duplicateValue ?? '—')}</td><td>{String(field.proposedValue ?? '—')}<small>{field.rationale}</small></td></tr>)}</tbody></table></div>
                {(selectedMerge.lostInformation.length > 0 || selectedMerge.manualDecisions.length > 0) && <div className="data-quality-merge-warnings"><AlertTriangle size={17} /><div>{selectedMerge.lostInformation.map((item) => <p key={item}>{item}</p>)}{selectedMerge.manualDecisions.map((item) => <p key={item}>{item}</p>)}</div></div>}
              </>
            )}
          </div>
        </div>
      </section>

      <div className="data-quality-downloads">
        <div><Link2Off size={19} /><span><strong>Exportierbarer Qualitätsreport</strong><small>Wahlweise vollständig oder mit pseudonymisierten IDs und entfernten Kontaktwerten.</small></span></div>
        <Button variant="secondary" onClick={() => downloadText(`vincere-datenqualitaet-${result.generatedAt.slice(0, 10)}.json`, exportDataQualityReport(result), 'application/json')}><Download size={16} />Vollständiger Report</Button>
        <Button variant="secondary" onClick={() => downloadText(`vincere-datenqualitaet-anonym-${result.generatedAt.slice(0, 10)}.json`, exportDataQualityReport(result, { anonymize: true }), 'application/json')}><Download size={16} />Anonymisiert</Button>
        <Button variant="secondary" onClick={() => downloadText(`vincere-datenqualitaet-${result.generatedAt.slice(0, 10)}.md`, buildDataQualityMarkdown(result), 'text/markdown')}><Download size={16} />Prüfbericht</Button>
      </div>
    </Card>
  );
}
