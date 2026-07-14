import { describe, expect, it } from 'vitest';
import { DEMO_DATA_NOTICE, DEMO_MARKET_OBSERVATIONS, DEMO_SOURCE } from '../src/data/market/demoMarketData';
import { MKK_REGIONS, findMarketRegion, normalizeMarketRegion } from '../src/data/market/mkkRegions';
import { previewMarketImport } from '../src/domain/market/marketImport';
import { valuationMarketReadiness } from '../src/domain/market/marketSelectors';
import { assessMarketQuality, canUseForMarketValue } from '../src/domain/market/qualityScoring';
import type { MarketObservation, MarketSource } from '../src/domain/market/marketTypes';

const now = new Date('2026-07-14T09:00:00.000Z');

const source: MarketSource = {
  id: 'manual-mkk-source',
  name: 'Manuelle MKK Marktbeobachtung',
  publisher: 'VINCERE Test',
  type: 'manuelle-marktbeobachtung',
  geographicCoverage: ['bruchkoebel'],
  period: { from: '2026-04-01', to: '2026-06-30', label: 'Q2 2026' },
  publishedAt: '2026-07-01',
  updateFrequency: 'Quartalsweise',
  licenseStatus: 'internal',
  dataFormat: ['csv', 'json'],
  metrics: ['asking-price-per-sqm', 'listing-count', 'sample-size'],
  limitations: [],
  qualityStatus: 'verified',
  lastCheckedAt: '2026-07-14',
  sourceLink: 'internal://test',
  importStatus: 'ready',
  isSynthetic: false,
};

const observation: MarketObservation = {
  id: 'observation-1',
  sourceId: source.id,
  regionId: 'bruchkoebel',
  period: { from: '2026-04-01', to: '2026-06-30', label: 'Q2 2026' },
  indicator: 'asking-price-per-sqm',
  value: 3600,
  unit: 'EUR_PER_SQM',
  sampleSize: 42,
  coveragePercent: 84,
  capturedAt: '2026-07-01T08:00:00.000Z',
  isSynthetic: false,
};

function validCsv() {
  return [
    'sourceId;region;periodFrom;periodTo;indicator;value;sampleSize;coveragePercent',
    'manual-mkk-source;Bruchköbel;2026-04-01;2026-06-30;asking-price-per-sqm;3600;42;84',
  ].join('\n');
}

describe('MKK region registry', () => {
  it('contains all required municipalities and resolves municipality, district and postal-code aliases', () => {
    expect(MKK_REGIONS.map((region) => region.municipality)).toEqual(expect.arrayContaining([
      'Bruchköbel', 'Hanau', 'Schöneck', 'Nidderau', 'Erlensee', 'Langenselbold',
      'Maintal', 'Neuberg', 'Hammersbach', 'Rodenbach', 'Freigericht', 'Gelnhausen',
    ]));
    expect(findMarketRegion('63486')?.id).toBe('bruchkoebel');
    expect(findMarketRegion('Büdesheim')?.id).toBe('schoeneck');
    expect(normalizeMarketRegion('Grossauheim')).toEqual({ regionId: 'hanau', municipality: 'Hanau' });
  });

  it('rejects unknown regions instead of silently assigning them', () => {
    expect(findMarketRegion('Frankfurt am Main')).toBeUndefined();
    expect(normalizeMarketRegion('Unbekannt')).toBeUndefined();
  });
});

describe('local market import preview', () => {
  it('normalizes a valid CSV locally without cloud persistence', () => {
    const preview = previewMarketImport({ fileName: 'manual-mkk-source.csv', content: validCsv(), sources: [source], now });

    expect(preview.isLocalOnly).toBe(true);
    expect(preview.detectedSourceId).toBe(source.id);
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0]).toMatchObject({ regionId: 'bruchkoebel', indicator: 'asking-price-per-sqm', value: 3600 });
    expect(preview.canImport).toBe(true);
  });

  it('blocks unknown regions, contradictory periods and incomplete metrics', () => {
    const csv = [
      'sourceId;region;periodFrom;periodTo;indicator;value;sampleSize;coveragePercent',
      'manual-mkk-source;Frankfurt;2026-07-01;2026-06-01;unknown-indicator;;5;20',
    ].join('\n');
    const preview = previewMarketImport({ fileName: 'manual-mkk-source.csv', content: csv, sources: [source], now });
    const codes = preview.warnings.map((warning) => warning.code);

    expect(codes).toEqual(expect.arrayContaining(['UNKNOWN_REGION', 'CONTRADICTORY_PERIOD', 'UNSUPPORTED_INDICATOR', 'INVALID_VALUE', 'LOW_SAMPLE_SIZE', 'LOW_COVERAGE']));
    expect(preview.canImport).toBe(false);
    expect(preview.quality.grade).toBe('blocked');
  });

  it('rejects invalid files and missing sources', () => {
    const invalid = previewMarketImport({ fileName: 'data.txt', content: 'not supported', sources: [source], now });
    const missingSource = previewMarketImport({
      fileName: 'unknown.json',
      content: JSON.stringify([{ region: 'Hanau', periodFrom: '2026-01-01', periodTo: '2026-03-31', indicator: 'listing-count', value: 12 }]),
      sources: [source],
      now,
    });

    expect(invalid.canImport).toBe(false);
    expect(invalid.warnings.some((warning) => warning.severity === 'error')).toBe(true);
    expect(missingSource.warnings.map((warning) => warning.code)).toContain('UNKNOWN_SOURCE');
    expect(missingSource.canImport).toBe(false);
  });

  it('warns about old data, low samples and duplicate observations', () => {
    const csv = [
      'sourceId;region;periodFrom;periodTo;indicator;value;sampleSize;coveragePercent',
      'manual-mkk-source;Bruchköbel;2021-01-01;2021-12-31;listing-count;20;6;30',
      'manual-mkk-source;Bruchköbel;2021-01-01;2021-12-31;listing-count;20;6;30',
    ].join('\n');
    const preview = previewMarketImport({ fileName: 'manual-mkk-source.csv', content: csv, sources: [source], now });
    const codes = preview.warnings.map((warning) => warning.code);

    expect(codes).toEqual(expect.arrayContaining(['STALE_DATA', 'LOW_SAMPLE_SIZE', 'LOW_COVERAGE', 'DUPLICATE_OBSERVATION']));
    expect(preview.quality.score).toBeLessThan(50);
  });

  it('detects ambiguous duplicate source matches', () => {
    const secondSource = { ...source, id: 'manual-mkk-source-copy', name: 'Weitere Beobachtung' };
    const csv = [
      'source;region;periodFrom;periodTo;indicator;value;sampleSize;coveragePercent',
      'VINCERE Test;Bruchköbel;2026-04-01;2026-06-30;listing-count;20;40;80',
    ].join('\n');
    const preview = previewMarketImport({ fileName: 'market.csv', content: csv, sources: [source, secondSource], now });

    expect(preview.warnings.map((warning) => warning.code)).toContain('DUPLICATE_SOURCE');
  });
});

describe('deterministic quality and valuation safeguards', () => {
  it('returns the same assessment for the same evidence', () => {
    const first = assessMarketQuality({ source, observation, now });
    const second = assessMarketQuality({ source, observation, now });

    expect(first).toEqual(second);
    expect(first.grade).toBe('A');
    expect(canUseForMarketValue(first, source)).toBe(true);
  });

  it('downgrades old data and very small samples', () => {
    const assessment = assessMarketQuality({
      source,
      observation: {
        ...observation,
        period: { from: '2021-01-01', to: '2021-12-31', label: '2021' },
        sampleSize: 4,
        coveragePercent: 25,
      },
      now,
    });

    expect(assessment.score).toBeLessThan(50);
    expect(assessment.reasons.join(' ')).toContain('24 Monate');
    expect(canUseForMarketValue(assessment, source)).toBe(false);
  });

  it('keeps synthetic demo data visibly labelled and unusable for a market value', () => {
    const assessment = assessMarketQuality({ source: DEMO_SOURCE, observation: DEMO_MARKET_OBSERVATIONS[0], now });
    const readiness = valuationMarketReadiness({
      sources: [DEMO_SOURCE],
      observations: DEMO_MARKET_OBSERVATIONS,
      regionId: 'bruchkoebel',
      now,
    });

    expect(DEMO_DATA_NOTICE).toBe('Demodaten – nicht für reale Bewertungen');
    expect(DEMO_SOURCE.limitations).toContain(DEMO_DATA_NOTICE);
    expect(assessment.score).toBeLessThanOrEqual(45);
    expect(canUseForMarketValue(assessment, DEMO_SOURCE)).toBe(false);
    expect(readiness.canProduceMarketValue).toBe(false);
    expect(readiness.realIndicatorCount).toBe(0);
    expect(readiness.dataGaps).toContain('Keine realen Marktindikatoren importiert');
  });

  it('does not produce a seemingly precise market value without sufficient evidence', () => {
    const readiness = valuationMarketReadiness({ sources: [source], observations: [], regionId: 'bruchkoebel', now });

    expect(readiness.score).toBe(0);
    expect(readiness.canProduceMarketValue).toBe(false);
    expect(readiness.dataGaps).toEqual(expect.arrayContaining([
      'Keine realen Marktindikatoren importiert',
      'Preis-je-Quadratmeter-Indikator fehlt',
    ]));
  });
});
