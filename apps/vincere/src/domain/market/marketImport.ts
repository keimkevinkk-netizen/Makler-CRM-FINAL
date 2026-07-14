import { findMarketRegion, findSubdivision } from '../../data/market/mkkRegions';
import { assessMarketQuality } from './qualityScoring';
import type {
  MarketImportPreview,
  MarketImportWarning,
  MarketIndicatorKind,
  MarketObservation,
  MarketSource,
  NormalizedMarketRow,
} from './marketTypes';

const indicatorAliases: Record<string, MarketIndicatorKind> = {
  'listing-count': 'listing-count',
  angebote: 'listing-count',
  angebotsanzahl: 'listing-count',
  verfuegbareobjekte: 'listing-count',
  'average-asking-price': 'average-asking-price',
  durchschnittlicherangebotspreis: 'average-asking-price',
  angebotspreis: 'average-asking-price',
  'asking-price-per-sqm': 'asking-price-per-sqm',
  preisproquadratmeter: 'asking-price-per-sqm',
  preisjem2: 'asking-price-per-sqm',
  eurprom2: 'asking-price-per-sqm',
  'listing-duration-days': 'listing-duration-days',
  angebotsdauer: 'listing-duration-days',
  vermarktungsdauer: 'listing-duration-days',
  'period-change-percent': 'period-change-percent',
  veraenderung: 'period-change-percent',
  veraenderungprozent: 'period-change-percent',
  'coverage-percent': 'coverage-percent',
  datenabdeckung: 'coverage-percent',
  'sample-size': 'sample-size',
  stichprobengroesse: 'sample-size',
  'land-reference-value': 'land-reference-value',
  bodenrichtwert: 'land-reference-value',
  'transactions-count': 'transactions-count',
  transaktionen: 'transactions-count',
  'rent-per-sqm': 'rent-per-sqm',
  mieteproquadratmeter: 'rent-per-sqm',
  'population-count': 'population-count',
  bevoelkerung: 'population-count',
  'building-permits-count': 'building-permits-count',
  baugenehmigungen: 'building-permits-count',
  'mortgage-interest-percent': 'mortgage-interest-percent',
  wohnungsbauzins: 'mortgage-interest-percent',
  'infrastructure-score': 'infrastructure-score',
  infrastrukturscore: 'infrastructure-score',
};

const units: Record<MarketIndicatorKind, MarketObservation['unit']> = {
  'listing-count': 'COUNT',
  'average-asking-price': 'EUR',
  'asking-price-per-sqm': 'EUR_PER_SQM',
  'listing-duration-days': 'DAYS',
  'period-change-percent': 'PERCENT',
  'coverage-percent': 'PERCENT',
  'sample-size': 'COUNT',
  'data-age-days': 'DAYS',
  'land-reference-value': 'EUR_PER_SQM',
  'transactions-count': 'COUNT',
  'rent-per-sqm': 'EUR_PER_SQM',
  'population-count': 'COUNT',
  'building-permits-count': 'COUNT',
  'mortgage-interest-percent': 'PERCENT',
  'infrastructure-score': 'PERCENT',
};

function fold(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDate(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const candidate = match ? `${match[3]}-${match[2]}-${match[1]}` : text;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : candidate.slice(0, 10);
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(fold);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function parseJson(text: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'));
  if (parsed && typeof parsed === 'object') {
    const object = parsed as Record<string, unknown>;
    const rows = object.rows ?? object.data ?? object.observations;
    if (Array.isArray(rows)) return rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'));
    return [object];
  }
  return [];
}

function valueFrom(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[fold(alias)];
    if (value !== undefined && String(value).trim() !== '') return value;
  }
  return undefined;
}

function detectSource(
  rows: Record<string, unknown>[],
  fileName: string,
  sources: MarketSource[],
): { source?: MarketSource; duplicate: boolean } {
  const sourceToken = valueFrom(rows[0] ?? {}, ['sourceId', 'source', 'quelle', 'publisher', 'herausgeber']);
  const candidates = [fold(sourceToken), fold(fileName)].filter(Boolean);
  const matches = sources.filter((source) => candidates.some((candidate) => (
    candidate.includes(fold(source.id))
    || candidate.includes(fold(source.name))
    || candidate.includes(fold(source.publisher))
  )));
  return { source: matches[0], duplicate: matches.length > 1 };
}

function normalizeIndicator(value: unknown) {
  const direct = String(value ?? '').trim().toLocaleLowerCase('de-DE');
  return indicatorAliases[direct] ?? indicatorAliases[fold(value)];
}

function makeWarning(
  warnings: MarketImportWarning[],
  code: MarketImportWarning['code'],
  severity: MarketImportWarning['severity'],
  message: string,
  row?: number,
) {
  warnings.push({ code, severity, message, row });
}

function normalizeRow(
  row: Record<string, unknown>,
  rowNumber: number,
  source: MarketSource | undefined,
  warnings: MarketImportWarning[],
  now: Date,
): NormalizedMarketRow | undefined {
  const regionInput = valueFrom(row, ['region', 'gemeinde', 'ort', 'stadt', 'municipality', 'postalCode', 'plz']);
  const region = findMarketRegion(String(regionInput ?? ''));
  if (!region) {
    makeWarning(warnings, 'UNKNOWN_REGION', 'error', `Region „${String(regionInput ?? '') || 'leer'}“ ist nicht im MKK-Register vorhanden.`, rowNumber);
  }

  const indicatorInput = valueFrom(row, ['indicator', 'kennzahl', 'metric', 'indikator']);
  const indicator = normalizeIndicator(indicatorInput);
  if (!indicator) {
    makeWarning(warnings, 'UNSUPPORTED_INDICATOR', 'error', `Kennzahl „${String(indicatorInput ?? '') || 'leer'}“ wird nicht unterstützt.`, rowNumber);
  }

  const value = parseNumber(valueFrom(row, ['value', 'wert', 'amount']));
  if (value === undefined) {
    makeWarning(warnings, 'INVALID_VALUE', 'error', 'Kennzahlenwert fehlt oder ist ungültig.', rowNumber);
  }

  const periodFrom = normalizeDate(valueFrom(row, ['periodFrom', 'von', 'from', 'zeitraumVon', 'start']));
  const periodTo = normalizeDate(valueFrom(row, ['periodTo', 'bis', 'to', 'zeitraumBis', 'end']));
  if (!periodFrom || !periodTo) {
    makeWarning(warnings, 'INVALID_PERIOD', 'error', 'Zeitraum ist unvollständig oder ungültig.', rowNumber);
  } else if (periodFrom > periodTo) {
    makeWarning(warnings, 'CONTRADICTORY_PERIOD', 'error', 'Zeitraumbeginn liegt nach dem Zeitraumende.', rowNumber);
  } else {
    const ageDays = Math.floor((now.getTime() - new Date(periodTo).getTime()) / 86_400_000);
    if (ageDays > 730) makeWarning(warnings, 'STALE_DATA', 'warning', 'Datensatz ist älter als 24 Monate.', rowNumber);
  }

  const sampleSize = parseNumber(valueFrom(row, ['sampleSize', 'stichprobe', 'stichprobengroesse', 'n']));
  if (sampleSize !== undefined && sampleSize < 10) {
    makeWarning(warnings, 'LOW_SAMPLE_SIZE', 'warning', 'Stichprobe ist kleiner als 10.', rowNumber);
  }

  const coveragePercent = parseNumber(valueFrom(row, ['coveragePercent', 'coverage', 'abdeckung', 'datenabdeckung']));
  if (coveragePercent !== undefined && coveragePercent < 40) {
    makeWarning(warnings, 'LOW_COVERAGE', 'warning', 'Datenabdeckung liegt unter 40 Prozent.', rowNumber);
  }

  const syntheticValue = valueFrom(row, ['isSynthetic', 'synthetic', 'demodaten']);
  const isSynthetic = source?.isSynthetic === true || ['true', '1', 'ja', 'yes'].includes(fold(syntheticValue));
  if (isSynthetic) makeWarning(warnings, 'SYNTHETIC_DATA', 'info', 'Zeile ist als synthetische Demodaten gekennzeichnet.', rowNumber);

  if (!source) makeWarning(warnings, 'UNKNOWN_SOURCE', 'error', 'Quelle konnte nicht eindeutig erkannt werden.', rowNumber);
  if (!region || !indicator || value === undefined || !periodFrom || !periodTo || periodFrom > periodTo || !source) return undefined;

  const subdivisionInput = String(valueFrom(row, ['subdivision', 'ortsteil', 'stadtteil']) ?? '').trim();
  const subdivision = findSubdivision(region.id, subdivisionInput);
  const postalCode = String(valueFrom(row, ['postalCode', 'plz']) ?? '').trim() || undefined;

  return {
    sourceId: source.id,
    regionId: region.id,
    subdivision,
    postalCode,
    periodFrom,
    periodTo,
    indicator,
    value,
    unit: units[indicator],
    sampleSize,
    coveragePercent,
    isSynthetic,
  };
}

export function previewMarketImport(input: {
  fileName: string;
  content: string;
  sources: MarketSource[];
  now?: Date;
}): MarketImportPreview {
  const { fileName, content, sources, now = new Date() } = input;
  const warnings: MarketImportWarning[] = [];
  const format = fileName.toLocaleLowerCase('de-DE').endsWith('.json')
    ? 'json'
    : fileName.toLocaleLowerCase('de-DE').endsWith('.csv')
      ? 'csv'
      : 'unknown';
  let rawRows: Record<string, unknown>[] = [];

  try {
    rawRows = format === 'json' ? parseJson(content) : format === 'csv' ? parseCsv(content) : [];
  } catch {
    makeWarning(warnings, 'MISSING_REQUIRED_FIELD', 'error', 'Datei konnte nicht gelesen werden. JSON oder CSV prüfen.');
  }

  if (format === 'unknown') {
    makeWarning(warnings, 'MISSING_REQUIRED_FIELD', 'error', 'Nur CSV- und JSON-Dateien werden in der lokalen Vorschau unterstützt.');
  }
  if (rawRows.length === 0) {
    makeWarning(warnings, 'MISSING_REQUIRED_FIELD', 'error', 'Datei enthält keine auswertbaren Datenzeilen.');
  }

  const detected = detectSource(rawRows, fileName, sources);
  if (detected.duplicate) {
    makeWarning(warnings, 'DUPLICATE_SOURCE', 'warning', 'Mehrere Quellen passen zur Datei. Quellen-ID sollte explizit angegeben werden.');
  }

  const rows = rawRows
    .map((row, index) => normalizeRow(row, index + 2, detected.source, warnings, now))
    .filter((row): row is NormalizedMarketRow => Boolean(row));

  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const key = [row.sourceId, row.regionId, row.subdivision, row.postalCode, row.periodFrom, row.periodTo, row.indicator].join('|');
    if (seen.has(key)) {
      makeWarning(warnings, 'DUPLICATE_OBSERVATION', 'warning', 'Doppelte Beobachtung mit identischem Quellen-, Regions- und Zeitraumbezug.', index + 2);
    }
    seen.add(key);
  });

  const representative = rows[0];
  const quality = assessMarketQuality({
    source: detected.source,
    observation: representative ? {
      period: { from: representative.periodFrom, to: representative.periodTo, label: 'Importvorschau' },
      sampleSize: representative.sampleSize,
      coveragePercent: representative.coveragePercent,
    } : undefined,
    warnings,
    now,
  });
  const hasErrors = warnings.some((warning) => warning.severity === 'error');

  return {
    fileName,
    format,
    detectedSourceId: detected.source?.id,
    rows,
    warnings,
    quality,
    canImport: rows.length > 0 && !hasErrors,
    isLocalOnly: true,
  };
}
