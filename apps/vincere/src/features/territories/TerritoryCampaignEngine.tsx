import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  ClipboardCheck,
  Database,
  MapPinned,
  Megaphone,
  Network,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { Badge, Card, SectionHeader } from '../../components/ui';
import { useAppStore } from '../../app/AppStore';
import { buildTerritoryInsights } from '../../domain/territories/territoryAnalytics';
import type { TerritoryInsight } from '../../domain/territories/territoryTypes';
import { campaignTemplates } from '../../domain/campaigns/campaignTemplates';
import {
  buildCampaignWorkbench,
  buildWeeklyTerritoryPlan,
  recommendCampaigns,
} from '../../domain/campaigns/campaignPlanning';
import type { CampaignType } from '../../domain/campaigns/campaignTypes';
import './territory-campaign-engine.css';

function priorityTone(level: TerritoryInsight['priorityLevel']): 'red' | 'gold' | 'green' {
  if (level === 'high') return 'red';
  if (level === 'medium') return 'gold';
  return 'green';
}

function qualityTone(value: number): 'red' | 'gold' | 'green' {
  if (value < 50) return 'red';
  if (value < 75) return 'gold';
  return 'green';
}

function formatDate(value?: string) {
  if (!value) return 'Keine Aktivität dokumentiert';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(value));
}

function metricLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function TerritoryCampaignEngine() {
  const {
    contacts,
    followUps,
    properties,
    appointments,
    callEvents,
    currentUser,
  } = useAppStore();
  const insights = useMemo(() => buildTerritoryInsights({
    contacts,
    followUps,
    properties,
    appointments,
    callEvents,
  }), [appointments, callEvents, contacts, followUps, properties]);
  const [selectedTerritoryName, setSelectedTerritoryName] = useState(() => insights[0]?.name ?? 'Bruchköbel');
  const selectedTerritory = insights.find((territory) => territory.name === selectedTerritoryName) ?? insights[0];
  const recommendations = useMemo(
    () => selectedTerritory ? recommendCampaigns(selectedTerritory) : [],
    [selectedTerritory],
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<CampaignType>('owner-outreach');

  useEffect(() => {
    if (!recommendations.some((recommendation) => recommendation.template.id === selectedCampaignId)) {
      setSelectedCampaignId(recommendations[0]?.template.id ?? 'owner-outreach');
    }
  }, [recommendations, selectedCampaignId]);

  if (!selectedTerritory) return null;

  const selectedTemplate = campaignTemplates.find((template) => template.id === selectedCampaignId) ?? campaignTemplates[0];
  const selectedRecommendation = recommendations.find((recommendation) => recommendation.template.id === selectedTemplate.id);
  const workbench = buildCampaignWorkbench(selectedTerritory, selectedTemplate, contacts, currentUser.role);
  const weeklyPlan = buildWeeklyTerritoryPlan(selectedTerritory, selectedRecommendation, workbench, currentUser.role);
  const readOnly = !workbench.editable;
  const topTerritories = insights.slice(0, 3);
  const totalOverdue = insights.reduce((sum, territory) => sum + territory.metrics.overdueFollowUps, 0);
  const ownersWithoutAction = insights.reduce((sum, territory) => sum + territory.metrics.ownerContactsWithoutNextAction, 0);

  return (
    <div className="page-stack territory-engine">
      <Card className="hero-card territory-hero">
        <div>
          <span className="eyebrow">Gebiets- und Akquisesteuerung</span>
          <h1>Bearbeite Gebiete nach belegbaren Vertriebsdaten, nicht nach Bauchgefühl.</h1>
          <p>Priorisierung, Kampagnenvorlagen und Wochenplanung werden ausschließlich aus vorhandenen Kontakten, Aufgaben, Immobilien, Terminen und explizit übergebener Datenqualität abgeleitet.</p>
        </div>
        <div className="territory-hero-status">
          <ShieldCheck size={20} />
          <div><strong>Kontrollierter Modus</strong><span>Kein Versand · keine Empfängerlisten · keine Persistenz</span></div>
        </div>
      </Card>

      {readOnly && (
        <div className="territory-readonly" role="status">
          <CircleOff size={18} />
          <div><strong>Viewer-Modus</strong><span>Analysen sind sichtbar, Planungsfelder bleiben schreibgeschützt.</span></div>
        </div>
      )}

      <div className="territory-summary-grid">
        <Card className="territory-summary-card">
          <Target size={19} />
          <span>Aktueller Schwerpunkt</span>
          <strong>{topTerritories[0]?.name ?? 'Keine Daten'}</strong>
          <small>{topTerritories[0]?.priorityScore ?? 0}/100 interner Prioritätswert</small>
        </Card>
        <Card className="territory-summary-card">
          <AlertTriangle size={19} />
          <span>Überfällige Follow-ups</span>
          <strong>{totalOverdue}</strong>
          <small>Aus vorhandenen offenen Aufgaben</small>
        </Card>
        <Card className="territory-summary-card">
          <Users size={19} />
          <span>Eigentümer ohne nächste Aktion</span>
          <strong>{ownersWithoutAction}</strong>
          <small>Kein offenes Follow-up oder Zukunftstermin</small>
        </Card>
        <Card className="territory-summary-card">
          <Database size={19} />
          <span>Marktdatenstatus</span>
          <strong>Keine Ersatzannahmen</strong>
          <small>Fehlende Quellen erhalten null Prioritätspunkte</small>
        </Card>
      </div>

      <div className="territory-main-grid">
        <Card className="territory-ranking-card">
          <SectionHeader title="Gebietsrangfolge" subtitle="Deterministisch sortiert; Gleichstände nach Strategie und Ortsname" />
          <div className="territory-ranking-list">
            {insights.map((territory, index) => (
              <button
                type="button"
                key={territory.name}
                className={`territory-ranking-row ${territory.name === selectedTerritory.name ? 'is-active' : ''}`}
                onClick={() => setSelectedTerritoryName(territory.name)}
              >
                <span className="territory-rank">{String(index + 1).padStart(2, '0')}</span>
                <span className="territory-ranking-copy">
                  <strong>{territory.name}</strong>
                  <small>{territory.segment} · {metricLabel(territory.metrics.contacts, 'Kontakt', 'Kontakte')}</small>
                </span>
                <Badge tone={priorityTone(territory.priorityLevel)}>{territory.priorityScore}</Badge>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </Card>

        <Card className="territory-detail-card">
          <div className="territory-detail-head">
            <div>
              <span className="eyebrow">Ausgewähltes Gebiet</span>
              <h2>{selectedTerritory.name}</h2>
              <p>{selectedTerritory.rationale}</p>
            </div>
            <div className="territory-score-ring" aria-label={`${selectedTerritory.priorityScore} von 100 Punkten`}>
              <strong>{selectedTerritory.priorityScore}</strong><span>/100</span>
            </div>
          </div>
          <div className="territory-pill-row">
            <Badge tone="gold">{selectedTerritory.segment}</Badge>
            <Badge tone={qualityTone(selectedTerritory.metrics.operationalDataQuality)}>{selectedTerritory.metrics.operationalDataQuality}% Datenqualität</Badge>
            {!selectedTerritory.supported && <Badge tone="red">Unbekanntes Gebiet</Badge>}
          </div>
          <p className="territory-focus"><strong>Operativer Fokus:</strong> {selectedTerritory.operatingFocus}</p>

          <div className="territory-metrics-grid">
            <div><Users size={16} /><span>Kontakte</span><strong>{selectedTerritory.metrics.contacts}</strong></div>
            <div><Target size={16} /><span>Eigentümer</span><strong>{selectedTerritory.metrics.ownerContacts}</strong></div>
            <div><BarChart3 size={16} /><span>Bewertungschancen</span><strong>{selectedTerritory.metrics.valuationOpportunities}</strong></div>
            <div><Megaphone size={16} /><span>Aktive Immobilien</span><strong>{selectedTerritory.metrics.activeProperties}</strong></div>
            <div><ClipboardCheck size={16} /><span>Offene Follow-ups</span><strong>{selectedTerritory.metrics.openFollowUps}</strong></div>
            <div><CalendarDays size={16} /><span>Aktive Termine</span><strong>{selectedTerritory.metrics.activeAppointments}</strong></div>
          </div>

          <div className="territory-activity-line">
            <span>Letzte dokumentierte Aktivität</span>
            <strong>{formatDate(selectedTerritory.metrics.lastActivityAt)}</strong>
            {selectedTerritory.metrics.daysSinceActivity !== undefined && <small>{selectedTerritory.metrics.daysSinceActivity} Tage</small>}
          </div>

          <div className="territory-factor-list">
            {selectedTerritory.scoreFactors.map((factor) => (
              <article key={factor.key} className="territory-factor">
                <div><strong>{factor.label}</strong><span>{factor.points}/{factor.maxPoints}</span></div>
                <div className="territory-factor-track"><span style={{ width: `${(factor.points / factor.maxPoints) * 100}%` }} /></div>
                <p>{factor.explanation}</p>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <div className="territory-two-column">
        <Card>
          <SectionHeader title="Diese Woche sinnvoll" subtitle="Maßnahmen aus den vorhandenen Gebietssignalen" />
          <div className="territory-action-list">
            {selectedTerritory.recommendedActions.map((action, index) => (
              <div key={action}><span>{index + 1}</span><p>{action}</p></div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Gebietsrisiken" subtitle="Blocker vor Kontakt- oder Kampagnenarbeit" />
          <div className="territory-risk-list">
            {selectedTerritory.risks.length > 0 ? selectedTerritory.risks.map((risk) => (
              <div key={risk}><AlertTriangle size={16} /><span>{risk}</span></div>
            )) : <div><CheckCircle2 size={16} /><span>Keine zusätzlichen Risiken aus den vorhandenen Daten abgeleitet.</span></div>}
          </div>
        </Card>
      </div>

      <Card className="campaign-library-card">
        <SectionHeader title="Lokale Kampagnenvorlagen" subtitle="Nur Planung und manuelle Einzelbearbeitung; keine Versandfunktion" />
        <div className="campaign-template-grid">
          {recommendations.map((recommendation) => (
            <button
              type="button"
              key={recommendation.template.id}
              className={`campaign-template-card ${selectedTemplate.id === recommendation.template.id ? 'is-selected' : ''}`}
              onClick={() => setSelectedCampaignId(recommendation.template.id)}
              disabled={readOnly}
            >
              <div><Megaphone size={17} /><Badge tone={recommendation.eligible ? 'green' : 'red'}>{recommendation.eligible ? 'Passend' : 'Blockiert'}</Badge></div>
              <strong>{recommendation.template.name}</strong>
              <p>{recommendation.template.objective}</p>
              <span>{recommendation.fitScore}/100 Vorlagenpassung</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="campaign-workbench-card">
        <SectionHeader
          title="Kampagnen-Workbench"
          subtitle="Aggregierte Planung ohne produktive Empfängerlisten"
          action={<Badge tone="red">Versand deaktiviert</Badge>}
        />
        <div className="campaign-workbench-controls">
          <label>
            Zielgebiet
            <select value={selectedTerritory.name} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedTerritoryName(event.target.value)}>
              {insights.map((territory) => <option key={territory.name} value={territory.name}>{territory.name}</option>)}
            </select>
          </label>
          <label>
            Kampagnenvorlage
            <select
              value={selectedTemplate.id}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedCampaignId(event.target.value as CampaignType)}
              disabled={readOnly}
            >
              {campaignTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
          <div><span>Vorhandene Zielkontakte</span><strong>{workbench.targetCount}</strong><small>{workbench.excludedCount} technisch ausgeschlossen</small></div>
          <div><span>Geplante Dauer</span><strong>{workbench.durationDays} Tage</strong><small>Nicht persistierter Arbeitsrahmen</small></div>
        </div>

        <div className="campaign-workbench-grid">
          <section><span className="workbench-label">Zielgruppe</span><p>{workbench.template.targetGroup}</p></section>
          <section><span className="workbench-label">Kampagnenziel</span><p>{workbench.template.objective}</p></section>
          <section><span className="workbench-label">Empfohlener Kanal</span><p>{workbench.recommendedChannel}</p></section>
          <section><span className="workbench-label">Datenqualität</span><p>{workbench.dataQuality}% operative Vollständigkeit; Marktdaten: {selectedTerritory.metrics.marketData.quality}</p></section>
          <section><span className="workbench-label">Aufgabenliste</span><ul>{workbench.tasks.map((task) => <li key={task}>{task}</li>)}</ul></section>
          <section><span className="workbench-label">Erfolgskriterien</span><ul>{workbench.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></section>
          <section><span className="workbench-label">Ausschlusskriterien</span><ul>{workbench.exclusionCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></section>
          <section><span className="workbench-label">Risiken</span><ul>{workbench.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul></section>
          <section className="campaign-legal"><span className="workbench-label">Rechtliche Hinweise</span><ul>{workbench.legalNotes.map((note) => <li key={note}>{note}</li>)}</ul></section>
        </div>
      </Card>

      <Card className="weekly-plan-card">
        <SectionHeader title="Nicht persistierter Wochenplan" subtitle={`${weeklyPlan.focusTerritory.name} · ${weeklyPlan.campaign?.template.name ?? 'Datenprüfung'}`} />
        <div className="weekly-plan-table">
          {weeklyPlan.entries.map((entry) => (
            <article key={entry.day}>
              <div><strong>{entry.day}</strong><span>{entry.activity}</span></div>
              <div><small>Zielkontakte</small><strong>{entry.targetContacts}</strong></div>
              <div><small>Nachfassen</small><strong>{entry.followUps}</strong></div>
              <div><small>Netzwerk</small><strong>{entry.networkAppointments}</strong></div>
              <div className="weekly-task-copy"><small>Kampagnenaufgaben</small><span>{entry.campaignTasks.join(' · ')}</span></div>
              <div className="weekly-review"><small>Review</small><span>{entry.review}</span></div>
            </article>
          ))}
        </div>
        <div className="weekly-plan-source">
          <Database size={17} />
          <div><strong>Planungsgrundlage</strong><span>{weeklyPlan.generatedFrom.join(' · ')}</span></div>
        </div>
      </Card>

      <Card className="territory-compliance-card">
        <div><ShieldCheck size={24} /><div><strong>Sicherheitsgrenzen aktiv</strong><span>Keine Massennachrichten, kein automatischer Versand, keine externen APIs, keine rechtliche Auto-Freigabe.</span></div></div>
        <div><Network size={24} /><div><strong>Nur aggregierte Zielgruppen</strong><span>Die Workbench zeigt Anzahlen und Kriterien, aber keine produktive Empfängerliste.</span></div></div>
        <div><MapPinned size={24} /><div><strong>Keine erfundenen Marktchancen</strong><span>Fehlende Marktdaten werden sichtbar als fehlend bewertet und nicht ersetzt.</span></div></div>
      </Card>
    </div>
  );
}
