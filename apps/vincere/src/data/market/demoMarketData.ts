import type { MarketObservation, MarketPeriod, MarketSource } from '../../domain/market/marketTypes';
import { MKK_REGIONS } from './mkkRegions';

const demoPeriod = (label: string, from: string, to: string): MarketPeriod => ({ label, from, to });

export const DEMO_SOURCE: MarketSource = {
  id: 'vincere-demo-market-series',
  name: 'VINCERE synthetische Marktserie',
  publisher: 'VINCERE Demo Generator',
  type: 'angebotsdaten',
  geographicCoverage: MKK_REGIONS.map((region) => region.id),
  period: demoPeriod('Synthetische Quartalsreihe 2025–2026', '2025-01-01', '2026-06-30'),
  publishedAt: '2026-07-01',
  updateFrequency: 'Keine – statische Demodaten',
  licenseStatus: 'internal',
  dataFormat: ['json'],
  metrics: [
    'listing-count',
    'average-asking-price',
    'asking-price-per-sqm',
    'listing-duration-days',
    'period-change-percent',
    'coverage-percent',
    'sample-size',
    'data-age-days',
  ],
  limitations: [
    'Demodaten – nicht für reale Bewertungen',
    'Werte sind vollständig synthetisch und bilden keinen tatsächlichen Marktstand ab',
  ],
  qualityStatus: 'limited',
  lastCheckedAt: '2026-07-14',
  sourceLink: 'demo://vincere/mkk-market-series',
  importStatus: 'preview-only',
  isSynthetic: true,
};

const periods = [
  demoPeriod('Q3 2025', '2025-07-01', '2025-09-30'),
  demoPeriod('Q4 2025', '2025-10-01', '2025-12-31'),
  demoPeriod('Q1 2026', '2026-01-01', '2026-03-31'),
  demoPeriod('Q2 2026', '2026-04-01', '2026-06-30'),
];

function regionSeed(regionId: string) {
  return [...regionId].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function observation(
  regionId: string,
  period: MarketPeriod,
  indicator: MarketObservation['indicator'],
  value: number,
  unit: MarketObservation['unit'],
  index: number,
): MarketObservation {
  const seed = regionSeed(regionId);
  return {
    id: `demo-${regionId}-${indicator}-${index}`,
    sourceId: DEMO_SOURCE.id,
    regionId,
    period,
    indicator,
    value,
    unit,
    sampleSize: 18 + ((seed + index * 7) % 55),
    coveragePercent: 62 + ((seed + index * 5) % 33),
    capturedAt: '2026-07-01T08:00:00.000Z',
    isSynthetic: true,
  };
}

export const DEMO_MARKET_OBSERVATIONS: MarketObservation[] = MKK_REGIONS.flatMap((region) => {
  const seed = regionSeed(region.id);
  const basePrice = 2700 + (seed % 1150);
  const baseCount = 24 + (seed % 52);
  const baseDuration = 42 + (seed % 39);

  return periods.flatMap((period, index) => {
    const direction = ((seed % 7) - 3) * 0.004;
    const trendFactor = 1 + direction * index;
    const pricePerSqm = Math.round(basePrice * trendFactor);
    const listingCount = Math.max(8, Math.round(baseCount * (1 + (index - 1.5) * 0.045)));
    const duration = Math.max(18, Math.round(baseDuration * (1 - index * 0.025)));
    const averagePrice = Math.round(pricePerSqm * (86 + (seed % 54)) / 1000) * 1000;
    const previousPrice = index === 0 ? pricePerSqm : Math.round(basePrice * (1 + direction * (index - 1)));
    const change = index === 0 ? 0 : Number((((pricePerSqm - previousPrice) / previousPrice) * 100).toFixed(1));

    return [
      observation(region.id, period, 'listing-count', listingCount, 'COUNT', index),
      observation(region.id, period, 'asking-price-per-sqm', pricePerSqm, 'EUR_PER_SQM', index),
      observation(region.id, period, 'average-asking-price', averagePrice, 'EUR', index),
      observation(region.id, period, 'listing-duration-days', duration, 'DAYS', index),
      observation(region.id, period, 'period-change-percent', change, 'PERCENT', index),
    ];
  });
});

export const DEMO_DATA_NOTICE = 'Demodaten – nicht für reale Bewertungen';
