import { AlertTriangle, Database, MapPinned, Scale, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui';
import { DEMO_DATA_NOTICE, DEMO_MARKET_OBSERVATIONS, DEMO_SOURCE } from '../../data/market/demoMarketData';
import { MARKET_SOURCE_REGISTRY } from '../../data/market/marketSources';
import { normalizeMarketRegion } from '../../data/market/mkkRegions';
import { sourcesForRegion, valuationMarketReadiness } from '../../domain/market/marketSelectors';

const sources = [...MARKET_SOURCE_REGISTRY, DEMO_SOURCE];

export function ValuationMarketPanel({ city, workingValueLabel }: { city?: string; workingValueLabel: string }) {
  const normalized = normalizeMarketRegion(city);
  const readiness = valuationMarketReadiness({
    sources,
    observations: DEMO_MARKET_OBSERVATIONS,
    regionId: normalized?.regionId,
    now: new Date('2026-07-14T09:00:00.000Z'),
  });
  const availableSources = normalized ? sourcesForRegion(sources, normalized.regionId) : [];

  return (
    <div className="mi-valuation-panel">
      <div className="mi-valuation-panel-head">
        <div><MapPinned size={17} /><span><small>Regionale Bewertungsgrundlage</small><strong>{normalized?.municipality ?? 'Region nicht zugeordnet'}</strong></span></div>
        <Badge tone={readiness.canProduceMarketValue ? 'green' : 'red'}>{readiness.canProduceMarketValue ? `Qualität ${readiness.grade}` : 'Marktwert gesperrt'}</Badge>
      </div>

      <div className="mi-value-boundaries">
        <article><Database size={16} /><span>Arbeitswert</span><strong>{workingValueLabel}</strong><small>Manuell hinterlegter interner Wert</small></article>
        <article><ShieldCheck size={16} /><span>Marktindikator</span><strong>Nur Demo vorhanden</strong><small>{DEMO_DATA_NOTICE}</small></article>
        <article><Scale size={16} /><span>Verkehrswert</span><strong>Nicht ermittelt</strong><small>Erfordert fachgerechtes Wertermittlungsverfahren</small></article>
      </div>

      <div className="mi-valuation-source-summary">
        <span><strong>{availableSources.length}</strong><small>Quellen registriert</small></span>
        <span><strong>{readiness.realIndicatorCount}</strong><small>reale Indikatoren</small></span>
        <span><strong>{readiness.demoIndicatorCount}</strong><small>Demoindikatoren</small></span>
        <span><strong>{readiness.score}</strong><small>nutzbare Qualitätsbasis</small></span>
      </div>

      <div className="mi-valuation-gaps">
        <h3>Datenlücken und methodische Grenzen</h3>
        {readiness.dataGaps.map((gap) => <p key={gap}><AlertTriangle size={14} /> {gap}</p>)}
        <p><AlertTriangle size={14} /> Demoindikatoren werden nie zur Marktwertfreigabe gezählt.</p>
      </div>
    </div>
  );
}
