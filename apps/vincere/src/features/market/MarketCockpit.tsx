import { useMemo, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Database,
  FileSearch,
  Gauge,
  MapPinned,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Badge, Card, SectionHeader } from '../../components/ui';
import { DEMO_DATA_NOTICE, DEMO_MARKET_OBSERVATIONS, DEMO_SOURCE } from '../../data/market/demoMarketData';
import { MARKET_SOURCE_REGISTRY } from '../../data/market/marketSources';
import { MKK_REGIONS } from '../../data/market/mkkRegions';
import { previewMarketImport } from '../../domain/market/marketImport';
import { latestIndicatorViews, observationSeries, sourcesForRegion } from '../../domain/market/marketSelectors';
import type {
  MarketImportPreview,
  MarketIndicatorKind,
  MarketIndicatorView,
  MarketObservation,
  MarketQualityGrade,
} from '../../domain/market/marketTypes';
import './market-intelligence.css';

const sources = [...MARKET_SOURCE_REGISTRY, DEMO_SOURCE];
const currency = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

const indicatorLabels: Record<MarketIndicatorKind, string> = {
  'listing-count': 'Verfügbare Objekte',
  'average-asking-price': 'Ø Angebotspreis',
  'asking-price-per-sqm': 'Preis je Quadratmeter',
  'listing-duration-days': 'Angebotsdauer',
  'period-change-percent': 'Veränderung zum Vorzeitraum',
  'coverage-percent': 'Datenabdeckung',
  'sample-size': 'Stichprobengröße',
  'data-age-days': 'Datenalter',
  'land-reference-value': 'Bodenrichtwert',
  'transactions-count': 'Transaktionen',
  'rent-per-sqm': 'Miete je Quadratmeter',
  'population-count': 'Bevölkerung',
  'building-permits-count': 'Baugenehmigungen',
  'mortgage-interest-percent': 'Wohnungsbauzins',
  'infrastructure-score': 'Infrastrukturwert',
};

function gradeTone(grade: MarketQualityGrade) {
  if (grade === 'A' || grade === 'B') return 'green' as const;
  if (grade === 'C') return 'gold' as const;
  if (grade === 'D') return 'red' as const;
  return 'neutral' as const;
}

function valueLabel(observation: MarketObservation) {
  if (observation.unit === 'EUR') return currency.format(observation.value);
  if (observation.unit === 'EUR_PER_SQM') return `${number.format(observation.value)} €/m²`;
  if (observation.unit === 'DAYS') return `${number.format(observation.value)} Tage`;
  if (observation.unit === 'PERCENT') return `${observation.value > 0 ? '+' : ''}${number.format(observation.value)} %`;
  return number.format(observation.value);
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return <div className="mi-chart-empty">Keine Zeitreihe vorhanden</div>;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 84 - ((value - minimum) / spread) * 64;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="mi-sparkline" viewBox="0 0 100 100" role="img" aria-label="Synthetische Zeitreihe">
      <line x1="0" y1="84" x2="100" y2="84" />
      <polyline points={points} />
      {points.split(' ').map((point) => {
        const [cx, cy] = point.split(',');
        return <circle key={point} cx={cx} cy={cy} r="2.3" />;
      })}
    </svg>
  );
}

function IndicatorCard({ view }: { view: MarketIndicatorView }) {
  return (
    <article className="mi-indicator-card">
      <div className="mi-indicator-head">
        <span>{indicatorLabels[view.observation.indicator]}</span>
        <Badge tone={gradeTone(view.quality.grade)}>Qualität {view.quality.grade}</Badge>
      </div>
      <strong>{valueLabel(view.observation)}</strong>
      <small>{view.observation.period.label} · {view.observation.sampleSize ?? '–'} Fälle · {view.observation.coveragePercent ?? '–'}% Abdeckung</small>
      <p><Clock3 size={13} /> Stand {view.observation.period.to} · Quelle: {view.source.name}</p>
    </article>
  );
}

function ImportPreviewPanel({ preview }: { preview: MarketImportPreview }) {
  const errors = preview.warnings.filter((warning) => warning.severity === 'error').length;
  const warnings = preview.warnings.filter((warning) => warning.severity === 'warning').length;
  return (
    <div className="mi-import-result">
      <div className="mi-import-summary">
        <span><strong>{preview.rows.length}</strong><small>gültige Zeilen</small></span>
        <span><strong>{errors}</strong><small>Fehler</small></span>
        <span><strong>{warnings}</strong><small>Warnungen</small></span>
        <span><strong>{preview.quality.grade}</strong><small>Qualitätsstufe</small></span>
      </div>
      <p className={preview.canImport ? 'is-valid' : 'is-blocked'}>
        {preview.canImport
          ? 'Schema ist für eine lokale Vorschau gültig. Es erfolgt keine Speicherung.'
          : 'Vorschau ist gesperrt, bis alle Fehler behoben sind.'}
      </p>
      {preview.detectedSourceId && <small>Erkannte Quelle: {preview.detectedSourceId}</small>}
      <div className="mi-warning-list">
        {preview.warnings.slice(0, 8).map((warning, index) => (
          <p key={`${warning.code}-${warning.row ?? 0}-${index}`} data-severity={warning.severity}>
            <AlertTriangle size={13} />
            <span>{warning.row ? `Zeile ${warning.row}: ` : ''}{warning.message}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function MarketCockpit() {
  const [selectedRegionId, setSelectedRegionId] = useState('bruchkoebel');
  const [selectedIndicator, setSelectedIndicator] = useState<MarketIndicatorKind>('asking-price-per-sqm');
  const [importPreview, setImportPreview] = useState<MarketImportPreview>();

  const region = MKK_REGIONS.find((item) => item.id === selectedRegionId) ?? MKK_REGIONS[0];
  const latestViews = useMemo(() => latestIndicatorViews({
    observations: DEMO_MARKET_OBSERVATIONS,
    sources,
    regionId: region.id,
    now: new Date('2026-07-14T09:00:00.000Z'),
  }), [region.id]);
  const relevantSources = useMemo(() => sourcesForRegion(sources, region.id), [region.id]);
  const series = useMemo(() => observationSeries(DEMO_MARKET_OBSERVATIONS, region.id, selectedIndicator), [region.id, selectedIndicator]);
  const comparison = useMemo(() => MKK_REGIONS.map((item) => {
    const view = latestIndicatorViews({
      observations: DEMO_MARKET_OBSERVATIONS,
      sources,
      regionId: item.id,
      now: new Date('2026-07-14T09:00:00.000Z'),
    }).find((candidate) => candidate.observation.indicator === 'asking-price-per-sqm');
    return { region: item, view };
  }).sort((left, right) => (right.view?.observation.value ?? 0) - (left.view?.observation.value ?? 0)), []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setImportPreview(previewMarketImport({
      fileName: file.name,
      content,
      sources,
      now: new Date('2026-07-14T09:00:00.000Z'),
    }));
    event.target.value = '';
  }

  return (
    <div className="mi-stack">
      <Card className="mi-demo-banner">
        <ShieldCheck size={18} />
        <div><strong>{DEMO_DATA_NOTICE}</strong><span>Alle sichtbaren Zahlen im Markt-Cockpit sind synthetisch. Registrierte offizielle Quellen enthalten noch keine importierten Werte.</span></div>
      </Card>

      <Card className="mi-cockpit-card">
        <SectionHeader
          title="Regionales Markt-Cockpit"
          subtitle="Quellen, Aktualität, Abdeckung und Qualitätsgrenzen transparent zusammenführen"
          action={(
            <label className="mi-region-select">
              <MapPinned size={15} />
              <select value={region.id} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedRegionId(event.target.value)} aria-label="Gebiet auswählen">
                {MKK_REGIONS.map((item) => <option key={item.id} value={item.id}>{item.municipality}</option>)}
              </select>
            </label>
          )}
        />

        <div className="mi-region-context">
          <span><strong>{region.municipality}</strong><small>{region.district}</small></span>
          <span><strong>{region.postalCodes.join(', ')}</strong><small>Postleitzahl</small></span>
          <span><strong>{region.subdivisions.length || '–'}</strong><small>vorbereitete Ortsteile</small></span>
          <span><strong>{relevantSources.length}</strong><small>registrierte Quellen</small></span>
          <span><strong>0</strong><small>produktive Datensätze</small></span>
        </div>

        <div className="mi-indicator-grid">
          {latestViews
            .filter((view) => ['listing-count', 'asking-price-per-sqm', 'average-asking-price', 'listing-duration-days', 'period-change-percent'].includes(view.observation.indicator))
            .map((view) => <IndicatorCard key={view.observation.id} view={view} />)}
        </div>
      </Card>

      <div className="mi-two-column">
        <Card>
          <SectionHeader title="Zeitreihenansicht" subtitle="Indikator, Zeitraum und Quelle bleiben sichtbar" />
          <div className="mi-chart-toolbar">
            <select value={selectedIndicator} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedIndicator(event.target.value as MarketIndicatorKind)} aria-label="Indikator auswählen">
              {(['asking-price-per-sqm', 'listing-count', 'average-asking-price', 'listing-duration-days', 'period-change-percent'] as MarketIndicatorKind[])
                .map((indicator) => <option key={indicator} value={indicator}>{indicatorLabels[indicator]}</option>)}
            </select>
            <Badge tone="gold">Synthetische Reihe</Badge>
          </div>
          <div className="mi-chart">
            <Sparkline values={series.map((item) => item.value)} />
            <div className="mi-chart-points">
              {series.map((item) => <span key={item.id}><small>{item.period.label}</small><strong>{valueLabel(item)}</strong></span>)}
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Datenlage" subtitle="Was für eine belastbare Bewertung noch fehlt" />
          <div className="mi-gap-list">
            <p><Database size={15} /><span><strong>Keine produktiven Marktbeobachtungen</strong><small>Quellenregister vorhanden, aber keine realen Kennzahlen importiert.</small></span></p>
            <p><Gauge size={15} /><span><strong>Qualität nicht übertragbar</strong><small>Demoqualität wird bewusst auf maximal 45 Punkte begrenzt.</small></span></p>
            <p><FileSearch size={15} /><span><strong>Lizenzprüfung offen</strong><small>Quellen mit unbekanntem Nutzungsstatus bleiben für Marktwerte gesperrt.</small></span></p>
            <p><AlertTriangle size={15} /><span><strong>Keine scheinpräzise Bewertung</strong><small>Markt- oder Verkehrswert darf erst nach ausreichender realer Evidenz entstehen.</small></span></p>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Regionale Vergleichsansicht" subtitle="Vergleichsmethodik vorbereitet – aktuell ausschließlich synthetische Demonstration" />
        <div className="mi-comparison-table" role="table" aria-label="Synthetischer regionaler Vergleich">
          <div role="row" className="mi-table-head"><span>Gebiet</span><span>PLZ</span><span>Demo-Preis/m²</span><span>Stichprobe</span><span>Qualität</span></div>
          {comparison.map(({ region: item, view }) => (
            <button key={item.id} type="button" role="row" onClick={() => setSelectedRegionId(item.id)} className={item.id === region.id ? 'is-selected' : ''}>
              <span><strong>{item.municipality}</strong><small>{item.subdivisions.length} Ortsteile vorbereitet</small></span>
              <span>{item.postalCodes.join(', ')}</span>
              <span>{view ? valueLabel(view.observation) : 'Keine Daten'}</span>
              <span>{view?.observation.sampleSize ?? '–'}</span>
              <span>{view ? <Badge tone={gradeTone(view.quality.grade)}>{view.quality.grade}</Badge> : '–'}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Quellenübersicht" subtitle="Metadatenregister ohne verschleierte Aktualität oder Nutzungsrechte" />
        <div className="mi-source-grid">
          {relevantSources.map((source) => (
            <article key={source.id}>
              <div><Database size={15} /><Badge tone={source.isSynthetic ? 'gold' : source.qualityStatus === 'limited' ? 'red' : 'blue'}>{source.isSynthetic ? 'Demo' : source.importStatus}</Badge></div>
              <h3>{source.name}</h3>
              <p>{source.publisher}</p>
              <dl>
                <div><dt>Typ</dt><dd>{source.type}</dd></div>
                <div><dt>Zeitraum</dt><dd>{source.period?.label ?? 'Noch nicht erfasst'}</dd></div>
                <div><dt>Aktualisierung</dt><dd>{source.updateFrequency}</dd></div>
                <div><dt>Nutzung</dt><dd>{source.licenseStatus}</dd></div>
                <div><dt>Formate</dt><dd>{source.dataFormat.join(', ')}</dd></div>
                <div><dt>Letzte Prüfung</dt><dd>{source.lastCheckedAt}</dd></div>
              </dl>
              <small>{source.limitations.join(' · ')}</small>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Lokale Importvorschau" subtitle="Datei → Quelle → Schema → Zeitraum → Region → Kennzahl → Warnungen → Qualität" />
        <div className="mi-import-layout">
          <label className="mi-upload">
            <Upload size={22} />
            <strong>CSV oder JSON lokal prüfen</strong>
            <span>Keine Cloud-Speicherung. Keine externe Übertragung. Die Datei bleibt im Browser.</span>
            <input type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFile} />
          </label>
          {importPreview
            ? <ImportPreviewPanel preview={importPreview} />
            : <div className="mi-import-placeholder"><BarChart3 size={26} /><strong>Noch keine Datei ausgewählt</strong><span>Erwartete Felder: sourceId, region, periodFrom, periodTo, indicator, value; optional sampleSize und coveragePercent.</span></div>}
        </div>
      </Card>
    </div>
  );
}
