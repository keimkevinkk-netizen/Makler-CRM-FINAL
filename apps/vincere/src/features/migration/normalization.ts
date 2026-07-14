import type { ContactStage, Priority } from '../../types/domain';
import type { SafeJsonObject } from './types';
import { isSafeObject } from './security';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const NUMBER_CLEANUP = /[^0-9,.-]/g;

export function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value.trim());
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (isSafeObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function fnv1a(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function stableHash(value: unknown) {
  const canonical = canonicalize(value);
  return `${fnv1a(canonical, 0x811c9dc5)}${fnv1a(canonical, 0x9e3779b9)}`;
}

export function stableId(prefix: string, identity: unknown) {
  return `${prefix}_${stableHash(identity)}`;
}

export function compactText(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

export function readPath(record: SafeJsonObject, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = record;
  for (const part of parts) {
    if (!isSafeObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

export function readFirst(record: SafeJsonObject, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const value = readPath(record, alias);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function readText(record: SafeJsonObject, aliases: readonly string[]): string | undefined {
  return compactText(readFirst(record, aliases));
}

export function normalizeName(value: unknown) {
  return compactText(value)?.toLocaleLowerCase('de-DE').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim() ?? '';
}

export function splitName(record: SafeJsonObject) {
  const firstName = readText(record, ['firstName', 'firstname', 'first_name', 'vorname']);
  const lastName = readText(record, ['lastName', 'lastname', 'last_name', 'nachname']);
  if (firstName || lastName) return { firstName: firstName ?? '', lastName: lastName ?? '' };

  const fullName = readText(record, ['name', 'fullName', 'fullname', 'contactName', 'ownerName', 'buyerName', 'person', 'kunde', 'kontakt']);
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? '' };
}

export function normalizePhone(value: unknown) {
  const text = compactText(value);
  if (!text) return '';
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('0049')) digits = `0${digits.slice(4)}`;
  if (digits.startsWith('49') && !digits.startsWith('490')) digits = `0${digits.slice(2)}`;
  return digits;
}

export function normalizeEmail(value: unknown) {
  return compactText(value)?.toLocaleLowerCase('de-DE') ?? '';
}

export function normalizeAddress(value: unknown) {
  return compactText(value)?.toLocaleLowerCase('de-DE').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim() ?? '';
}

export function readAddress(record: SafeJsonObject) {
  const direct = readText(record, ['address', 'adresse', 'fullAddress', 'objectAddress', 'propertyAddress']);
  if (direct) return direct;

  const street = readText(record, ['street', 'strasse', 'straße', 'addr.street', 'address.street']);
  const number = readText(record, ['houseNumber', 'hausnummer', 'number', 'addr.houseNumber', 'address.houseNumber']);
  const postalCode = readText(record, ['postalCode', 'zip', 'plz', 'addr.postalCode', 'address.postalCode']);
  const city = readText(record, ['city', 'ort', 'town', 'addr.city', 'address.city']);
  return [street, number, postalCode, city].filter(Boolean).join(' ') || undefined;
}

export function readCity(record: SafeJsonObject) {
  return readText(record, ['city', 'ort', 'town', 'location', 'addr.city', 'address.city']) ?? '';
}

export function readNumber(record: SafeJsonObject, aliases: readonly string[]): number | undefined {
  const raw = readFirst(record, aliases);
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  const text = compactText(raw);
  if (!text) return undefined;
  const cleaned = text.replace(NUMBER_CLEANUP, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeDate(value: unknown): string | undefined {
  const text = compactText(value);
  if (!text) return undefined;
  if (DATE_ONLY.test(text)) return `${text}T12:00:00.000Z`;
  const germanDate = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(text);
  if (germanDate) {
    const [, day, month, year, hour = '12', minute = '00'] = germanDate;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function readDate(record: SafeJsonObject, aliases: readonly string[]) {
  return normalizeDate(readFirst(record, aliases));
}

export function normalizePriority(value: unknown): Priority {
  const text = normalizeName(value);
  if (['hoch', 'high', 'a', 'urgent', 'dringend', '1'].includes(text)) return 'high';
  if (['niedrig', 'low', 'c', '3'].includes(text)) return 'low';
  return 'medium';
}

export function normalizeRole(value: unknown, sourceKey: string): 'Eigentümer' | 'Käufer' | 'Tippgeber' | 'Netzwerk' {
  const text = normalizeName(value);
  if (sourceKey.includes('eigentuemer') || text.includes('eigentumer') || text.includes('verkaufer') || text.includes('owner')) return 'Eigentümer';
  if (text.includes('kaufer') || text.includes('buyer') || text.includes('suchkunde')) return 'Käufer';
  if (sourceKey.includes('referral') || text.includes('tippgeber') || text.includes('empfehler') || text.includes('referral')) return 'Tippgeber';
  return 'Netzwerk';
}

export function normalizeStage(value: unknown): ContactStage {
  const text = normalizeName(value);
  if (text.includes('verkauft') || text.includes('sold') || text.includes('abschluss')) return 'sold';
  if (text.includes('mandat') || text.includes('auftrag') || text.includes('vermarkt')) return 'mandate';
  if (text.includes('termin') || text.includes('appointment') || text.includes('bewertung')) return 'appointment';
  if (text.includes('qualifiz') || text.includes('warm') || text.includes('interess')) return 'qualified';
  return 'lead';
}

export function stageRank(stage: ContactStage) {
  return ({ lead: 0, qualified: 1, appointment: 2, mandate: 3, sold: 4 } satisfies Record<ContactStage, number>)[stage];
}

export function legacyId(record: SafeJsonObject) {
  return readText(record, ['id', 'uid', 'contactId', 'contact_id', 'legacyId', '_id']);
}
