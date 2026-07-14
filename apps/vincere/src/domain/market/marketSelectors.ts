import { assessMarketQuality, marketDataAgeDays } from './qualityScoring';
import type {
  MarketIndicatorKind,
  MarketIndicatorView,
  MarketObservation,
  MarketSource,
} from './marketTypes';

export function sourcesForRegion(sources: MarketSource[], regionId: string) {
  return sources.filter((source) => (
    source.geographicCoverage.includes(regionId)
    || source.geographicCoverage.includes('Main-Kinzig-Kreis')
    || source.geographicCoverage.includes('Hessen')
    || source.geographicCoverage.includes('Deutschland')
  ));
}

export function latestIndicatorViews(input: {
  observations: MarketObservation[];
  sources: MarketSource[];
  regionId: string;
  now?: Date;
}): MarketIndicatorView[] {
  const { observations, sources, regionId, now = new Date() } = input;
  const latest = new Map<MarketIndicatorKind, MarketObservation>();

  observations
    .filter((observation) => observation.regionId === regionId)
    .sort((left, right) => right.period.to.localeCompare(left.period.to) || left.id.localeCompare(right.id))
    .forEach((observation) => {
      if (!latest.has(observation.indicator)) latest.set(observation.indicator, observation);
    });

  return [...latest.values()].flatMap((observation) => {
    const source = sources.find((item) => item.id === observation.sourceId);
    if (!source) return [];
    return [{
      observation,
      source,
      quality: assessMarketQuality({ source, observation, now }),
      freshnessDays: marketDataAgeDays(observation.period.to, now),
    }];
  });
}

export function observationSeries(
  observations: MarketObservation[],
  regionId: string,
  indicator: MarketIndicatorKind,
) {
  return observations
    .filter((observation) => observation.regionId === regionId && observation.indicator === indicator)
    .sort((left, right) => left.period.to.localeCompare(right.period.to) || left.id.localeCompare(right.id));
}

export function valuationMarketReadiness(input: {
  sources: MarketSource[];
  observations: MarketObservation[];
  regionId?: string;
  now?: Date;
}) {
  const { sources, observations, regionId, now = new Date() } = input;
  if (!regionId) {
    return {
      grade: 'blocked' as const,
      score: 0,
      canProduceMarketValue: false,
      dataGaps: ['Standort ist keiner vorbereiteten MKK-Region zugeordnet'],
      availableSourceCount: 0,
      realIndicatorCount: 0,
      demoIndicatorCount: 0,
    };
  }

  const availableSources = sourcesForRegion(sources, regionId);
  const views = latestIndicatorViews({ observations, sources, regionId, now });
  const realViews = views.filter((view) => !view.source.isSynthetic);
  const demoViews = views.filter((view) => view.source.isSynthetic);
  const usableViews = realViews.filter((view) => view.quality.score >= 70 && view.quality.grade !== 'blocked');
  const dataGaps: string[] = [];

  if (availableSources.length === 0) dataGaps.push('Keine Quelle für die Region registriert');
  if (realViews.length === 0) dataGaps.push('Keine realen Marktindikatoren importiert');
  if (realViews.length > 0 && usableViews.length === 0) dataGaps.push('Vorhandene reale Indikatoren erreichen die Mindestqualität nicht');
  if (!realViews.some((view) => view.observation.indicator === 'asking-price-per-sqm')) dataGaps.push('Preis-je-Quadratmeter-Indikator fehlt');
  if (!realViews.some((view) => view.observation.indicator === 'sample-size')) dataGaps.push('Separate Stichprobenkennzahl fehlt');

  const score = usableViews.length === 0
    ? 0
    : Math.round(usableViews.reduce((sum, view) => sum + view.quality.score, 0) / usableViews.length);

  return {
    grade: score >= 85 ? 'A' as const : score >= 70 ? 'B' as const : score >= 50 ? 'C' as const : score > 0 ? 'D' as const : 'blocked' as const,
    score,
    canProduceMarketValue: usableViews.length >= 3 && dataGaps.length === 0,
    dataGaps,
    availableSourceCount: availableSources.length,
    realIndicatorCount: realViews.length,
    demoIndicatorCount: demoViews.length,
  };
}
