const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function compactWhitespace(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

export function normalizeText(value: unknown): string {
  return compactWhitespace(value)
    .toLocaleLowerCase('de-DE')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeName(value: unknown): string {
  return normalizeText(value);
}

export function normalizeAddress(value: unknown): string {
  return normalizeText(value);
}

export function normalizeEmail(value: unknown): string {
  return compactWhitespace(value).toLocaleLowerCase('de-DE');
}

export function isValidEmail(value: unknown): boolean {
  const normalized = normalizeEmail(value);
  return Boolean(normalized && EMAIL_PATTERN.test(normalized));
}

export function normalizePhone(value: unknown): string {
  const text = compactWhitespace(value);
  if (!text) return '';
  const hasPlus = text.trim().startsWith('+');
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0049')) return `+49${digits.slice(4)}`;
  if (digits.startsWith('49') && (hasPlus || digits.length >= 11)) return `+49${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+49${digits.slice(1)}`;
  if (hasPlus) return `+${digits}`;
  return digits;
}

export function isValidPhone(value: unknown): boolean {
  return E164_PATTERN.test(normalizePhone(value));
}

export function stableHash(value: unknown): string {
  const input = canonicalize(value);
  const hash = (seed: number) => {
    let current = seed >>> 0;
    for (let index = 0; index < input.length; index += 1) {
      current ^= input.charCodeAt(index);
      current = Math.imul(current, 0x01000193) >>> 0;
    }
    return current.toString(16).padStart(8, '0');
  };
  return `${hash(0x811c9dc5)}${hash(0x9e3779b9)}`;
}

export function stableId(prefix: string, value: unknown): string {
  return `${prefix}_${stableHash(value)}`;
}

function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value.trim());
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

export function parseDateMs(value: unknown): number | undefined {
  const text = compactWhitespace(value);
  if (!text) return undefined;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function daysBetween(earlier: number, later: number): number {
  return Math.floor((later - earlier) / 86_400_000);
}

export function nextBusinessActionAt(nowIso: string): string {
  const date = new Date(nowIso);
  date.setUTCHours(9, 0, 0, 0);
  let remaining = 2;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toISOString();
}

export function stringSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);
  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost);
    }
    for (let column = 0; column <= right.length; column += 1) previous[column] = current[column];
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}
