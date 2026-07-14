import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Clock3,
  Database,
  Info,
  PhoneCall,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { Badge, Card, EmptyState } from '../../components/ui';
import { buildSalesControlSnapshot } from '../../domain/forecast/engine';
import { getAnalyticsCapabilities, type AnalyticsPeriod, type MetricComparison } from '../../domain/forecast/model';
import { buildDailyExecutionPlan } from '../../domain/next-best-action/engine';
import { ScenarioPlanner } from '../performance/ScenarioPlanner';

const integer = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const percent = (value: number | null) => value === null ? '–' : `${decimal.format(value * 100)} %`;

const periodOptions: Array<{ id: AnalyticsPeriod; label: string }> = [
  { id: 'today', label: 'Heute' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'rolling30', label: '30 Tage' },
];

function Comparison({ value, percentage = false }: { value: MetricComparison; percentage?: boolean }) {
  if (!value.comparable) return <span className="kpi-comparison neutral">Kein Vergleich</span>;
  const positive = (value.delta ?? 0) > 0;
  const negative = (value.delta ?? 0) < 0;
  const display = percentage
    ? `${(value.delta ?? 0) > 0 ? '+' : ''}${decimal.format((value.delta ?? 0) * 100)} PP`
    : `${(value.delta ?? 0) > 0 ? '+' : ''}${integer.format(value.delta ?? 0)}`;
  return <span className={`kpi-comparison ${positive ? 'positive' : negative ? 'negative' : 'neutral'}`}>{display} zum Vergleich</span>;
}

function KpiCard({ icon, label, value, detail, comparison }: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  comparison?: ReactNode;
}) {
  return (
    <article className="executive-kpi">
      <span className="executive-kpi-icon">{icon}</span>
      <div><small>{label}</small><strong>{value}</strong><span>{detail}</span>{comparison}</div>
    </article>
  );
}

function FunnelStage({ stage, index }: {
  stage: ReturnType<typeof buildSalesControlSnapshot>['funnel'][number];
  index: number;
}) {
  return (
    <div className={`funnel-stage bottleneck-${stage.bottleneck}`}>
      <div className="funnel-stage-top">
        <span>{index + 1}</span>
        <Badge tone={stage.bottleneck === 'critical' ? 'red' : stage.bottleneck === 'watch' ? 'gold' : 'neutral'}>{stage.count}</Badge>
      </div>
      <strong>{stage.label}</strong>
      <small>{stage.documentedEntries === null
        ? 'Startstufe'
        : stage.documentedEntries > 0
          ? `${stage.documentedEntries} dokumentierte Eintritte`
          : 'Übergangshistorie fehlt'}</small>
      <div className="funnel-stage-stats">
        <span><b>{stage.stalledCount}</b> ohne Fortschritt</span>
        <span><b>{stage.withoutNextAction}</b> ohne Aktion</span>
      </div>
      <div className="funnel-dwell"><Clock3 size={13} /> {stage.averageDwellDays === null
        ? 'Verweildauer nicht rekonstruierbar'
        : `Ø ${decimal.format(stage.averageDwellDays)} Tage · ${stage.dwellCoverage} % Abdeckung`}</div>
      <p>{stage.nextMeasure}</p>
    </div>
  );
}

export function SalesForecastCockpit() {
  const state = useAppStore();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [now] = useState(() => Date.now());
  const snapshot = useMemo(() => buildSalesControlSnapshot(state, now, period), [state, now, period]);
  const monthSnapshot = useMemo(() => buildSalesControlSnapshot(state, now, 'month'), [state, now]);
  const execution = useMemo(() => buildDailyExecutionPlan(state, now), [state, now]);
  const capabilities = getAnalyticsCapabilities(state.currentUser.role);
  const weakestStages = [...snapshot.funnel]
    .filter((stage) => stage.id !== 'sold' && stage.count > 0)
    .sort((left, right) => {
      const leftRatio = Math.max(left.stalledCount, left.withoutNextAction) / left.count;
      const rightRatio = Math.max(right.stalledCount, right.withoutNextAction) / right.count;
      return rightRatio - leftRatio || left.id.localeCompare(right.id);
    })
    .slice(0, 2);

  return (
    <div className="sales-control-page">
      <section className="sales-control-hero">
        <div>
          <span className="eyebrow"><BarChart3 size={15} /> Vertriebssteuerung</span>
          <h1>KPI-, Forecast- und Pipeline-Cockpit</h1>
          <p>Faktenbasierte Steuerung aus vorhandenen Kontakten, Aktivitäten, Follow-ups, Terminen und Immobilien. Keine erfundene Abschlusswahrscheinlichkeit.</p>
        </div>
        <div className="sales-control-actions">
          <span className="method-chip"><ShieldCheck size={15} /> Deterministische Methodik</span>
          {capabilities.readOnlyWorkspace && <span className="method-chip viewer"><Database size={15} /> Viewer · keine Schreibaktion</span>}
          <div className="period-switch" aria-label="Analysezeitraum">
            {periodOptions.map((option) => (
              <button key={option.id} className={period === option.id ? 'active' : ''} onClick={() => setPeriod(option.id)}>{option.label}</button>
            ))}
          </div>
        </div>
      </section>

      {snapshot.historicalWarnings.length > 0 && (
        <div className="history-warning">
          <Info size={18} />
          <div><strong>Historische Aussagekraft begrenzt</strong>{snapshot.historicalWarnings.map((warning) => <span key={warning}>{warning}</span>)}</div>
        </div>
      )}

      <section className="executive-kpi-grid">
        <KpiCard icon={<Users />} label="Aktive Kontakte" value={snapshot.kpis.activeContacts} detail={`${snapshot.kpis.ownerContacts} Eigentümerkontakte`} />
        <KpiCard icon={<TrendingUp />} label="Neue Kontakte" value={snapshot.kpis.newContacts} detail={snapshot.period.label} comparison={<Comparison value={snapshot.comparisons.newContacts} />} />
        <KpiCard icon={<PhoneCall />} label="Gespräche" value={snapshot.kpis.conversations} detail={`${snapshot.kpis.calls} dokumentierte Anrufe`} comparison={<Comparison value={snapshot.comparisons.conversations} />} />
        <KpiCard icon={<Target />} label="Gesprächsquote" value={percent(snapshot.kpis.conversationRate)} detail="Gespräch oder Termin aus Anrufen" comparison={<Comparison value={snapshot.comparisons.conversationRate} percentage />} />
        <KpiCard icon={<CalendarDays />} label="Terminquote" value={percent(snapshot.kpis.appointmentRate)} detail={`${snapshot.kpis.appointments} Termine im Zeitraum`} comparison={<Comparison value={snapshot.comparisons.appointmentRate} percentage />} />
        <KpiCard icon={<Building2 />} label="Aktive Immobilien" value={snapshot.kpis.activeProperties} detail={`${snapshot.kpis.valuationOpportunities} Bewertungschancen`} />
        <KpiCard icon={<AlertTriangle />} label="Aktionslücke" value={snapshot.kpis.contactsWithoutNextAction} detail={`${snapshot.kpis.overdueFollowUps} Follow-ups überfällig`} />
        <KpiCard icon={<Database />} label="Datenqualität" value={`${snapshot.kpis.dataQualityPercent} %`} detail={`${snapshot.kpis.contactsMissingContactHistory} Kontakte ohne Kontakthistorie`} />
      </section>

      <section className="sales-control-grid forecast-row">
        <Card className="forecast-corridor-card">
          <div className="cockpit-card-heading">
            <div><span className="section-accent" /><h2>Forecast-Korridor</h2><p>Arbeitswerte, Reifegrade und belegte Signale – ausdrücklich keine Umsatzgarantie</p></div>
            <Badge tone="gold">{snapshot.forecast.activePropertyCount} aktive Werte</Badge>
          </div>
          <div className="forecast-corridor">
            <div><small>Belegstarker Unterkorridor</small><strong>{euro.format(snapshot.forecast.qualifiedLowerBound)}</strong><span>Termin/Mandat mit hoher Datenabdeckung</span></div>
            <div className="forecast-primary"><small>Gewichtete Orientierung</small><strong>{euro.format(snapshot.forecast.weightedOrientationValue)}</strong><span>Transparente Reifegradregel</span></div>
            <div><small>Aktiver Arbeitswert</small><strong>{euro.format(snapshot.forecast.opportunityUpperBound)}</strong><span>Ungewichtete Obergrenze</span></div>
          </div>
          <div className="forecast-boundary"><AlertTriangle size={16} /><span>Die gewichtete Pipeline ist eine Steuerungsorientierung. Sie ist weder Abschlusswahrscheinlichkeit noch Umsatzversprechen.</span></div>
          <details className="method-details"><summary>Forecast-Methodik anzeigen</summary>{snapshot.forecast.methodology.map((item) => <p key={item}>{item}</p>)}</details>
        </Card>

        <Card className="pipeline-health-card">
          <div className="cockpit-card-heading"><div><span className="section-accent" /><h2>Pipeline-Gesundheit</h2><p>Bestand, Mandate, Abschlüsse und strukturelle Lücken</p></div></div>
          <div className="pipeline-health-list">
            <div><span>Mandatsstufe</span><strong>{snapshot.kpis.mandateContacts}</strong><small>aktuelle Kontakte</small></div>
            <div><span>Verkauft</span><strong>{snapshot.kpis.soldContacts}</strong><small>dokumentierte Abschlüsse</small></div>
            <div><span>Hohe Priorität unbearbeitet</span><strong>{snapshot.kpis.highPriorityUntouched}</strong><small>≥ 14 Tage ohne Beleg</small></div>
            <div><span>Ø Kontaktpause</span><strong>{snapshot.kpis.averageContactPauseDays === null ? '–' : `${decimal.format(snapshot.kpis.averageContactPauseDays)} T.`}</strong><small>nur valide Kontakthistorie</small></div>
            <div><span>Forecast nicht qualifiziert</span><strong>{snapshot.forecast.insufficientDataCount}</strong><small>Eigentümerkontakte</small></div>
            <div><span>Objektwerte unbrauchbar</span><strong>{snapshot.forecast.invalidValueCount}</strong><small>fehlend, null oder negativ</small></div>
          </div>
        </Card>
      </section>

      <Card className="funnel-card">
        <div className="cockpit-card-heading">
          <div><span className="section-accent" /><h2>Funnel-Analyse</h2><p>Kontakt → qualifiziert → Termin → Mandat → verkauft</p></div>
          <span className="method-chip"><Info size={14} /> Keine erfundenen Conversion-Raten</span>
        </div>
        <div className="funnel-flow">{snapshot.funnel.map((stage, index) => <FunnelStage key={stage.id} stage={stage} index={index} />)}</div>
        {weakestStages.length > 0 && (
          <div className="weak-stage-strip">
            <strong>Schwächste Stufen</strong>
            {weakestStages.map((stage) => <span key={stage.id}><b>{stage.label}</b>{stage.nextMeasure}</span>)}
          </div>
        )}
      </Card>

      <section className="sales-control-grid operations-row">
        <Card className="opportunity-card">
          <div className="cockpit-card-heading"><div><span className="section-accent" /><h2>Stärkste Chancen</h2><p>Nach gewichtbarem Arbeitswert, stabil und nachvollziehbar sortiert</p></div></div>
          <div className="opportunity-list">
            {snapshot.forecast.items.length > 0 ? snapshot.forecast.items.slice(0, 5).map((item, index) => (
              <article key={item.id}>
                <span className="opportunity-rank">{index + 1}</span>
                <div className="opportunity-main"><strong>{item.title}</strong><span>{item.contactName} · {item.propertyStatus} · {item.stage}</span><small>{item.formula}</small></div>
                <div className="opportunity-value"><strong>{euro.format(item.weightedValue)}</strong><span>{Math.round(item.orientationFactor * 100)} % Orientierungsfaktor</span><Badge tone={item.uncertainty === 'niedrig' ? 'green' : item.uncertainty === 'mittel' ? 'gold' : 'red'}>{item.uncertainty}</Badge></div>
                <details>
                  <summary>Erklärung und Verbesserung</summary>
                  <p><b>Verwendet:</b> {item.usedData.join(' · ')}</p>
                  <p><b>Fehlt:</b> {item.missingFactors.length > 0 ? item.missingFactors.join(' · ') : 'Keine wesentlichen Faktoren in diesem Modell.'}</p>
                  {item.actions.map((action) => <p key={action}><ArrowRight size={13} /> {action}</p>)}
                </details>
              </article>
            )) : <EmptyState title="Keine gewichtbare Chance" text="Aktive Immobilien benötigen einen positiven Arbeitswert. Eigentümerbeziehungen und nächste Aktionen erhöhen die Aussagekraft." />}
          </div>
        </Card>

        <Card className="risk-card">
          <div className="cockpit-card-heading"><div><span className="section-accent" /><h2>Risiken und Hebel</h2><p>Konkrete Veränderungen, die Datenqualität und Forecast verbessern</p></div></div>
          <div className="risk-section"><strong>Pipeline-Risiken</strong>{snapshot.risks.map((risk) => <span key={risk}><AlertTriangle size={15} /> {risk}</span>)}</div>
          <div className="recommendation-section"><strong>Empfohlene Maßnahmen</strong>{snapshot.recommendations.map((recommendation, index) => <span key={recommendation}><b>{index + 1}</b>{recommendation}</span>)}</div>
        </Card>
      </section>

      <Card className="scenario-card">
        <ScenarioPlanner actuals={{
          contacts: monthSnapshot.kpis.newContacts,
          conversations: monthSnapshot.kpis.conversations,
          appointments: monthSnapshot.kpis.appointments,
        }} />
      </Card>

      <Card className="execution-bridge-card">
        <div className="cockpit-card-heading">
          <div><span className="section-accent" /><h2>Heute mit größtem Vertriebswert</h2><p>Direkte Brücke zur unveränderten Follow-up Intelligence</p></div>
          <Link to="/today" className="text-link">Daily Execution öffnen <ArrowRight size={15} /></Link>
        </div>
        <div className="execution-bridge-list">
          {execution.topActions.length > 0 ? execution.topActions.slice(0, 5).map((action, index) => (
            <Link key={action.id} to={action.channel === 'phone' && !action.blockedReason ? `/phone?contact=${action.contactId}` : '/today'}>
              <span>{index + 1}</span>
              <div><strong>{action.title}</strong><small>{action.reason}</small></div>
              <Badge tone={index === 0 ? 'red' : index < 3 ? 'gold' : 'neutral'}>{action.score}</Badge>
            </Link>
          )) : <EmptyState title="Keine priorisierte Aktion" text="Die Daily Execution Engine erkennt derzeit keine offene oder fehlende nächste Aktion." />}
        </div>
      </Card>
    </div>
  );
}
