import type { Contact, Property } from '../../types/domain';
import { isValidEmail, isValidPhone, normalizeAddress, normalizeEmail, normalizeName, normalizePhone, stableId, stringSimilarity } from './normalization';
import type { DataQualityInput, DuplicateAssessment, DuplicateCategory, DuplicateFactor } from './types';

interface IndexedContact {
  contact: Contact;
  index: number;
  key: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  propertyIds: Set<string>;
  propertyAddresses: Set<string>;
}

function addBucket(map: Map<string, IndexedContact[]>, key: string, item: IndexedContact) {
  if (!key) return;
  const bucket = map.get(key) ?? [];
  bucket.push(item);
  map.set(key, bucket);
}

function pairKey(left: IndexedContact, right: IndexedContact) {
  return [left.key, right.key].sort().join('|');
}

function selectPairs(input: DataQualityInput, maxAssessments: number): Array<[IndexedContact, IndexedContact]> {
  const propertiesByOwner = new Map<string, Property[]>();
  for (const property of input.properties) {
    if (!property.ownerContactId) continue;
    const bucket = propertiesByOwner.get(property.ownerContactId) ?? [];
    bucket.push(property);
    propertiesByOwner.set(property.ownerContactId, bucket);
  }

  const contacts: IndexedContact[] = input.contacts.map((contact, index) => {
    const properties = propertiesByOwner.get(contact.id) ?? [];
    return {
      contact,
      index,
      key: `${contact.id}#${index}`,
      name: normalizeName(`${contact.firstName} ${contact.lastName}`),
      phone: normalizePhone(contact.phone),
      email: normalizeEmail(contact.email),
      city: normalizeName(contact.city),
      propertyIds: new Set(properties.map((property) => property.id)),
      propertyAddresses: new Set(properties.map((property) => normalizeAddress(`${property.address} ${property.city}`)).filter(Boolean)),
    };
  });

  const buckets = [new Map<string, IndexedContact[]>(), new Map<string, IndexedContact[]>(), new Map<string, IndexedContact[]>(), new Map<string, IndexedContact[]>()];
  for (const contact of contacts) {
    addBucket(buckets[0], isValidPhone(contact.phone) ? contact.phone : '', contact);
    addBucket(buckets[1], isValidEmail(contact.email) ? contact.email : '', contact);
    addBucket(buckets[2], contact.name, contact);
    addBucket(buckets[3], contact.name && contact.city ? `${contact.name}|${contact.city}` : '', contact);
  }

  const pairs = new Map<string, [IndexedContact, IndexedContact]>();
  const addPair = (left: IndexedContact, right: IndexedContact) => {
    if (left.key === right.key || pairs.size >= maxAssessments * 3) return;
    const ordered: [IndexedContact, IndexedContact] = left.key.localeCompare(right.key) <= 0 ? [left, right] : [right, left];
    pairs.set(pairKey(...ordered), ordered);
  };

  for (const bucketMap of buckets) {
    for (const bucket of bucketMap.values()) {
      if (bucket.length < 2) continue;
      const ordered = [...bucket].sort((left, right) => left.key.localeCompare(right.key));
      const anchor = ordered[0];
      for (const item of ordered.slice(1)) addPair(anchor, item);
    }
  }

  const byName = [...contacts].filter((contact) => contact.name).sort((left, right) => left.name.localeCompare(right.name) || left.key.localeCompare(right.key));
  for (let index = 0; index < byName.length; index += 1) {
    const left = byName[index];
    for (let offset = 1; offset <= 3 && index + offset < byName.length; offset += 1) {
      const right = byName[index + offset];
      if (Math.abs(left.name.length - right.name.length) > 4) continue;
      if (left.name[0] !== right.name[0]) continue;
      if (stringSimilarity(left.name, right.name) >= 0.82) addPair(left, right);
    }
  }

  return [...pairs.values()]
    .sort((left, right) => pairKey(...left).localeCompare(pairKey(...right)))
    .slice(0, maxAssessments);
}

function intersection(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => right.has(value)).sort();
}

function factor(code: DuplicateFactor['code'], label: string, contribution: number, matched: boolean, explanation: string): DuplicateFactor {
  return { code, label, contribution: matched ? contribution : 0, matched, explanation };
}

function categoryFor(score: number, factors: DuplicateFactor[]): DuplicateCategory {
  const matched = new Set(factors.filter((item) => item.matched).map((item) => item.code));
  const strongMatches = ['id', 'phone', 'email', 'shared_property'].filter((code) => matched.has(code as DuplicateFactor['code'])).length;
  if (matched.has('id') || (score >= 78 && strongMatches >= 2)) return 'certain';
  if (score >= 55) return 'very_likely';
  if (score >= 35) return 'possible';
  if (score >= 20) return 'manual';
  return 'separate';
}

function completeness(contact: Contact): number {
  return [contact.firstName, contact.lastName, contact.phone, contact.email, contact.city, contact.source, contact.role, contact.nextActionAt].filter(Boolean).length;
}

function assessPair(left: IndexedContact, right: IndexedContact): DuplicateAssessment {
  const phoneExact = Boolean(left.phone && right.phone && isValidPhone(left.phone) && left.phone === right.phone);
  const emailExact = Boolean(left.email && right.email && isValidEmail(left.email) && left.email === right.email);
  const nameExact = Boolean(left.name && left.name === right.name);
  const similarity = stringSimilarity(left.name, right.name);
  const nameVariant = !nameExact && similarity >= 0.82;
  const cityExact = Boolean(left.city && left.city === right.city);
  const sharedPropertyIds = intersection(left.propertyIds, right.propertyIds);
  const sharedAddresses = intersection(left.propertyAddresses, right.propertyAddresses);
  const sameSource = Boolean(left.contact.source && right.contact.source && normalizeName(left.contact.source) === normalizeName(right.contact.source));
  const phoneConflict = Boolean(isValidPhone(left.phone) && isValidPhone(right.phone) && left.phone !== right.phone);
  const emailConflict = Boolean(isValidEmail(left.email) && isValidEmail(right.email) && left.email !== right.email);
  const cityConflict = Boolean(left.city && right.city && left.city !== right.city);

  const factors: DuplicateFactor[] = [
    factor('id', 'Vorhandene ID', 60, left.contact.id === right.contact.id, left.contact.id === right.contact.id ? 'Beide Datensätze verwenden dieselbe Kontakt-ID.' : 'Unterschiedliche Kontakt-IDs.'),
    factor('phone', 'Telefonnummer', 45, phoneExact, phoneExact ? 'Die normalisierten Telefonnummern stimmen exakt überein.' : 'Keine identische gültige Telefonnummer.'),
    factor('email', 'E-Mail', 45, emailExact, emailExact ? 'Die normalisierten E-Mail-Adressen stimmen exakt überein.' : 'Keine identische gültige E-Mail-Adresse.'),
    factor('name', 'Normalisierter Name', 22, nameExact, nameExact ? 'Vor- und Nachname stimmen nach Normalisierung überein.' : 'Der normalisierte Name ist nicht exakt gleich.'),
    factor('name_variant', 'Schreibvariante', 12, nameVariant, nameVariant ? `Hohe Namensähnlichkeit von ${Math.round(similarity * 100)} %.` : 'Keine ausreichend ähnliche Schreibvariante.'),
    factor('city', 'Ort', 8, cityExact, cityExact ? 'Der normalisierte Ort stimmt überein.' : 'Der Ort liefert keine Übereinstimmung.'),
    factor('address', 'Adresse', 14, sharedAddresses.length > 0, sharedAddresses.length > 0 ? 'Mindestens eine Eigentümeradresse ist identisch.' : 'Keine identische verknüpfte Adresse.'),
    factor('shared_property', 'Gemeinsame Immobilie', 20, sharedPropertyIds.length > 0, sharedPropertyIds.length > 0 ? 'Mindestens dieselbe Immobilien-ID ist beiden Kontakten zugeordnet.' : 'Keine gemeinsame Immobilien-ID.'),
    factor('source', 'Historische Quelle', 4, sameSource, sameSource ? 'Die historische Kontaktquelle stimmt überein.' : 'Unterschiedliche oder fehlende Quellen.'),
    factor('phone_conflict', 'Telefonkonflikt', -28, phoneConflict, phoneConflict ? 'Beide Datensätze besitzen unterschiedliche gültige Telefonnummern.' : 'Kein belastbarer Telefonkonflikt.'),
    factor('email_conflict', 'E-Mail-Konflikt', -32, emailConflict, emailConflict ? 'Beide Datensätze besitzen unterschiedliche gültige E-Mail-Adressen.' : 'Kein belastbarer E-Mail-Konflikt.'),
    factor('city_conflict', 'Ortskonflikt', -4, cityConflict, cityConflict ? 'Die Orte unterscheiden sich.' : 'Kein belastbarer Ortskonflikt.'),
  ];

  const score = Math.max(0, Math.min(100, factors.reduce((sum, item) => sum + item.contribution, 0)));
  const leftCompleteness = completeness(left.contact);
  const rightCompleteness = completeness(right.contact);
  const primary = leftCompleteness > rightCompleteness || (leftCompleteness === rightCompleteness && left.contact.id.localeCompare(right.contact.id) <= 0) ? left : right;
  const candidate = primary === left ? right : left;
  return {
    id: stableId('duplicate', { left: left.key, right: right.key, score }),
    primaryContactId: primary.contact.id,
    candidateContactId: candidate.contact.id,
    primaryRecordIndex: primary.index,
    candidateRecordIndex: candidate.index,
    category: categoryFor(score, factors),
    score,
    factors,
  };
}

export function assessContactDuplicates(input: DataQualityInput, maxAssessments = 500): DuplicateAssessment[] {
  return selectPairs(input, Math.max(1, maxAssessments))
    .map(([left, right]) => assessPair(left, right))
    .sort((left, right) => right.score - left.score || left.primaryContactId.localeCompare(right.primaryContactId) || left.candidateContactId.localeCompare(right.candidateContactId));
}
