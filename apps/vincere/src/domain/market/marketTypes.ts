export type MarketSourceType =
  | 'bodenrichtwerte'
  | 'grundstuecksmarktbericht'
  | 'angebotsdaten'
  | 'transaktionsdaten'
  | 'mietspiegel'
  | 'bevoelkerungsdaten'
  | 'baugenehmigungen'
  | 'zinsdaten'
  | 'infrastruktur'
  | 'kommunale-statistik'
  | 'manuelle-marktbeobachtung';

export type MarketDataFormat = 'csv' | 'json' | 'xlsx' | 'pdf' | 'api' | 'geoportal' | 'manual';
export type MarketLicenseStatus = 'open' | 'licensed' | 'internal' | 'review-required' | 'unknown';
export type MarketQualityStatus = 'verified' | 'plausible' | 'limited' | 'blocked';
export type MarketImportStatus = 'not-configured' | 'ready' | 'preview-only' | 'imported' | 'rejected';
export type MarketIndicatorKind =
  | 'listing-count'
  | 'average-asking-price'
  | 'asking-price-per-sqm'
  | 'listing-duration-days'
  | 'period-change-percent'
  | 'coverage-percent'
  | 'sample-size'
  | 'data-age-days'
  | 'land-reference-value'
  | 'transactions-count'
  | 'rent-per-sqm'
  | 'population-count'
  | 'building-permits-count'
  | 'mortgage-interest-percent'
  | 'infrastructure-score';

export type MarketQualityGrade = 'A' | 'B' | 'C' | 'D' | 'blocked';

export interface MarketPeriod {
  from: string;
  to: string;
  label: string;
}

export interface MarketRegion {
  id: string;
  municipality: string;
  district: 'Main-Kinzig-Kreis';
  postalCodes: string[];
  subdivisions: string[];
  aliases: string[];
}

export interface MarketSource {
  id: string;
  name: string;
  publisher: string;
  type: MarketSourceType;
  geographicCoverage: string[];
  period?: MarketPeriod;
  publishedAt?: string;
  updateFrequency: string;
  licenseStatus: MarketLicenseStatus;
  dataFormat: MarketDataFormat[];
  metrics: MarketIndicatorKind[];
  limitations: string[];
  qualityStatus: MarketQualityStatus;
  lastCheckedAt: string;
  sourceLink: string;
  importStatus: MarketImportStatus;
  isSynthetic: boolean;
}

export interface MarketObservation {
  id: string;
  sourceId: string;
  regionId: string;
  subdivision?: string;
  postalCode?: string;
  period: MarketPeriod;
  indicator: MarketIndicatorKind;
  value: number;
  unit: 'EUR' | 'EUR_PER_SQM' | 'COUNT' | 'DAYS' | 'PERCENT';
  sampleSize?: number;
  coveragePercent?: number;
  capturedAt: string;
  isSynthetic: boolean;
}

export interface MarketQualityAssessment {
  score: number;
  grade: MarketQualityGrade;
  status: MarketQualityStatus;
  reasons: string[];
  blockingReasons: string[];
}

export type MarketImportWarningCode =
  | 'UNKNOWN_SOURCE'
  | 'UNKNOWN_REGION'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_VALUE'
  | 'INVALID_PERIOD'
  | 'CONTRADICTORY_PERIOD'
  | 'STALE_DATA'
  | 'LOW_SAMPLE_SIZE'
  | 'LOW_COVERAGE'
  | 'DUPLICATE_SOURCE'
  | 'DUPLICATE_OBSERVATION'
  | 'UNSUPPORTED_INDICATOR'
  | 'SYNTHETIC_DATA';

export interface MarketImportWarning {
  code: MarketImportWarningCode;
  severity: 'info' | 'warning' | 'error';
  message: string;
  row?: number;
}

export interface NormalizedMarketRow {
  sourceId: string;
  regionId: string;
  subdivision?: string;
  postalCode?: string;
  periodFrom: string;
  periodTo: string;
  indicator: MarketIndicatorKind;
  value: number;
  unit: MarketObservation['unit'];
  sampleSize?: number;
  coveragePercent?: number;
  isSynthetic: boolean;
}

export interface MarketImportPreview {
  fileName: string;
  format: 'csv' | 'json' | 'unknown';
  detectedSourceId?: string;
  rows: NormalizedMarketRow[];
  warnings: MarketImportWarning[];
  quality: MarketQualityAssessment;
  canImport: boolean;
  isLocalOnly: true;
}

export interface MarketIndicatorView {
  observation: MarketObservation;
  source: MarketSource;
  quality: MarketQualityAssessment;
  freshnessDays: number;
}
