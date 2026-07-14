import type {
  MarketImportWarning,
  MarketObservation,
  MarketQualityAssessment,
  MarketQualityGrade,
  MarketQualityStatus,
  MarketSource,
} from './marketTypes';

const DAY_MS = 86_400_000;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toDate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function differenceInDays(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / DAY_MS));
}

export function marketDataAgeDays(periodEnd: string, now = new Date()) {
  const end = toDate(periodEnd);
  return end ? differenceInDays(now, end) : Number.POSITIVE_INFINITY;
}

function gradeFor(score: number, blocked: boolean): MarketQualityGrade {
  if (blocked) return 'blocked';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function statusFor(score: number, blocked: boolean): MarketQualityStatus {
  if (blocked) return 'blocked';
  if (score >= 85) return 'verified';
  if (score >= 65) return 'plausible';
  return 'limited';
}

export function assessMarketQuality(input: {
  source?: MarketSource;
  observation?: Partial<MarketObservation>;
  warnings?: MarketImportWarning[];
  now?: Date;
}): MarketQualityAssessment {
  const { source, observation, warnings = [], now = new Date() } = input;
  let score = 100;
  const reasons: string[] = [];
  const blockingReasons: string[] = [];

  if (!source) {
    score -= 45;
    blockingReasons.push('Quelle nicht eindeutig erkannt');
  } else {
    if (source.licenseStatus === 'unknown' || source.licenseStatus === 'review-required') {
      score -= 12;
      reasons.push('Nutzungsstatus muss vor produktivem Import geprüft werden');
    }
    if (source.qualityStatus === 'limited') {
      score -= 10;
      reasons.push('Quelle ist als eingeschränkt klassifiziert');
    }
    if (source.qualityStatus === 'blocked') {
      score -= 35;
      blockingReasons.push('Quelle ist für Bewertungen gesperrt');
    }
    if (source.isSynthetic) {
      score = Math.min(score, 45);
      reasons.push('Synthetische Demodaten dürfen keine reale Bewertung tragen');
    }
  }

  const periodEnd = observation?.period?.to;
  const ageDays = periodEnd ? marketDataAgeDays(periodEnd, now) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(ageDays)) {
    score -= 25;
    blockingReasons.push('Auswertungszeitraum fehlt oder ist ungültig');
  } else if (ageDays > 730) {
    score -= 28;
    reasons.push('Daten sind älter als 24 Monate');
  } else if (ageDays > 365) {
    score -= 15;
    reasons.push('Daten sind älter als 12 Monate');
  } else if (ageDays > 180) {
    score -= 7;
    reasons.push('Daten sind älter als sechs Monate');
  }

  const sampleSize = observation?.sampleSize;
  if (sampleSize === undefined) {
    score -= 8;
    reasons.push('Stichprobengröße ist nicht dokumentiert');
  } else if (sampleSize < 10) {
    score -= 30;
    reasons.push('Stichprobe ist kleiner als 10');
  } else if (sampleSize < 30) {
    score -= 15;
    reasons.push('Stichprobe ist kleiner als 30');
  }

  const coverage = observation?.coveragePercent;
  if (coverage === undefined) {
    score -= 6;
    reasons.push('Datenabdeckung ist nicht dokumentiert');
  } else if (coverage < 40) {
    score -= 24;
    reasons.push('Datenabdeckung liegt unter 40 Prozent');
  } else if (coverage < 70) {
    score -= 12;
    reasons.push('Datenabdeckung liegt unter 70 Prozent');
  }

  warnings.forEach((warning) => {
    if (warning.severity === 'error') {
      score -= 20;
      blockingReasons.push(warning.message);
    } else if (warning.severity === 'warning') {
      score -= 7;
      reasons.push(warning.message);
    }
  });

  const blocked = blockingReasons.length > 0;
  const normalizedScore = clamp(score);
  return {
    score: normalizedScore,
    grade: gradeFor(normalizedScore, blocked),
    status: statusFor(normalizedScore, blocked),
    reasons: [...new Set(reasons)],
    blockingReasons: [...new Set(blockingReasons)],
  };
}

export function canUseForMarketValue(assessment: MarketQualityAssessment, source?: MarketSource) {
  return Boolean(
    source
    && !source.isSynthetic
    && source.licenseStatus !== 'unknown'
    && source.licenseStatus !== 'review-required'
    && assessment.grade !== 'blocked'
    && assessment.score >= 70,
  );
}
