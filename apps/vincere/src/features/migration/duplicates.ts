import type { Contact, Property } from '../../types/domain';
import { normalizeAddress, normalizeEmail, normalizeName, normalizePhone, stageRank } from './normalization';
import type { DuplicateCandidate } from './types';

export interface ContactCandidate {
  record: Contact;
  sourceKey: string;
  sourcePriority: number;
  legacyIds: string[];
}

export interface PropertyCandidate {
  record: Property;
  sourceKey: string;
  sourcePriority: number;
  legacyIds: string[];
}

interface UnionFind {
  parent: Map<string, string>;
  find: (value: string) => string;
  union: (left: string, right: string) => void;
}

function createUnionFind(ids: string[]): UnionFind {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (value: string): string => {
    const current = parent.get(value) ?? value;
    if (current === value) return value;
    const root = find(current);
    parent.set(value, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    const [first, second] = [leftRoot, rightRoot].sort();
    parent.set(second, first);
  };
  return { parent, find, union };
}

function addBucket(map: Map<string, string[]>, key: string, id: string) {
  if (!key) return;
  const bucket = map.get(key) ?? [];
  bucket.push(id);
  map.set(key, bucket);
}

function unionBuckets(unionFind: UnionFind, buckets: Map<string, string[]>) {
  for (const ids of buckets.values()) {
    if (ids.length < 2) continue;
    const first = ids[0];
    for (const id of ids.slice(1)) unionFind.union(first, id);
  }
}

function contactName(contact: Contact) {
  return normalizeName(`${contact.firstName} ${contact.lastName}`);
}

function contactKeys(candidate: ContactCandidate) {
  const name = contactName(candidate.record);
  const phone = normalizePhone(candidate.record.phone);
  const email = normalizeEmail(candidate.record.email);
  const city = normalizeName(candidate.record.city);
  return {
    name,
    phone,
    email,
    city,
    strong: [
      email && phone ? `email-phone:${email}|${phone}` : '',
      email && name ? `email-name:${email}|${name}` : '',
      phone.length >= 7 && name ? `phone-name:${phone}|${name}` : '',
      ...candidate.legacyIds.filter(Boolean).map((id) => `legacy:${id}`),
    ].filter(Boolean),
    probable: [email ? `email:${email}` : '', phone.length >= 7 ? `phone:${phone}` : '', name && city ? `name-city:${name}|${city}` : ''].filter(Boolean),
    manual: [name ? `name:${name}` : ''].filter(Boolean),
  };
}

function propertyKeys(candidate: PropertyCandidate) {
  const address = normalizeAddress(`${candidate.record.address} ${candidate.record.city}`);
  const title = normalizeName(candidate.record.title);
  const type = normalizeName(candidate.record.type);
  return {
    address,
    title,
    strong: [
      address && type ? `address-type:${address}|${type}` : '',
      ...candidate.legacyIds.filter(Boolean).map((id) => `legacy:${id}`),
    ].filter(Boolean),
    probable: [address ? `address:${address}` : ''].filter(Boolean),
    manual: [title && candidate.record.city ? `title-city:${title}|${normalizeName(candidate.record.city)}` : ''].filter(Boolean),
  };
}

function newest(left?: string, right?: string) {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

function earliest(left?: string, right?: string) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function mergeContactGroup(group: ContactCandidate[]) {
  const ordered = [...group].sort((left, right) => right.sourcePriority - left.sourcePriority || left.record.id.localeCompare(right.record.id));
  const base = { ...ordered[0].record };
  for (const candidate of ordered.slice(1)) {
    const item = candidate.record;
    base.firstName ||= item.firstName;
    base.lastName ||= item.lastName;
    base.phone ||= item.phone;
    base.email ||= item.email;
    base.city ||= item.city;
    base.source ||= item.source;
    base.notes ||= item.notes;
    base.potential = Math.max(base.potential, item.potential);
    base.lastContactAt = newest(base.lastContactAt, item.lastContactAt);
    base.nextActionAt = earliest(base.nextActionAt, item.nextActionAt);
    if (stageRank(item.stage) > stageRank(base.stage)) base.stage = item.stage;
    if (base.priority === 'low' && item.priority !== 'low') base.priority = item.priority;
    if (base.priority === 'medium' && item.priority === 'high') base.priority = 'high';
  }
  return base;
}

function mergePropertyGroup(group: PropertyCandidate[]) {
  const ordered = [...group].sort((left, right) => right.sourcePriority - left.sourcePriority || left.record.id.localeCompare(right.record.id));
  const base = { ...ordered[0].record };
  for (const candidate of ordered.slice(1)) {
    const item = candidate.record;
    base.title ||= item.title;
    base.address ||= item.address;
    base.city ||= item.city;
    base.type ||= item.type;
    base.estimatedValue = Math.max(base.estimatedValue, item.estimatedValue);
    base.ownerContactId ||= item.ownerContactId;
  }
  return base;
}

function candidateGroups<T extends { record: { id: string } }>(items: T[], keys: (item: T) => { probable: string[]; manual: string[] }, excluded: Set<string>) {
  const probableBuckets = new Map<string, string[]>();
  const manualBuckets = new Map<string, string[]>();
  for (const item of items) {
    if (excluded.has(item.record.id)) continue;
    const itemKeys = keys(item);
    for (const key of itemKeys.probable) addBucket(probableBuckets, key, item.record.id);
    for (const key of itemKeys.manual) addBucket(manualBuckets, key, item.record.id);
  }

  const duplicates: DuplicateCandidate[] = [];
  const probableIds = new Set<string>();
  for (const [reason, ids] of [...probableBuckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const unique = [...new Set(ids)].sort();
    if (unique.length < 2) continue;
    unique.forEach((id) => probableIds.add(id));
    duplicates.push({ entity: 'contact', category: 'probable', recordIds: unique, reasons: [reason] });
  }
  for (const [reason, ids] of [...manualBuckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const unique = [...new Set(ids)].filter((id) => !probableIds.has(id)).sort();
    if (unique.length < 2) continue;
    duplicates.push({ entity: 'contact', category: 'manual', recordIds: unique, reasons: [reason] });
  }
  return duplicates;
}

export function deduplicateContacts(candidates: ContactCandidate[]) {
  const ordered = [...candidates].sort((left, right) => left.record.id.localeCompare(right.record.id));
  const unionFind = createUnionFind(ordered.map((candidate) => candidate.record.id));
  const strongBuckets = new Map<string, string[]>();
  for (const candidate of ordered) {
    for (const key of contactKeys(candidate).strong) addBucket(strongBuckets, key, candidate.record.id);
  }
  unionBuckets(unionFind, strongBuckets);

  const groups = new Map<string, ContactCandidate[]>();
  for (const candidate of ordered) {
    const root = unionFind.find(candidate.record.id);
    const group = groups.get(root) ?? [];
    group.push(candidate);
    groups.set(root, group);
  }

  const records: Contact[] = [];
  const aliases = new Map<string, string>();
  const duplicates: DuplicateCandidate[] = [];
  const autoMerged = new Set<string>();

  for (const group of [...groups.values()].sort((left, right) => left[0].record.id.localeCompare(right[0].record.id))) {
    const merged = mergeContactGroup(group);
    records.push(merged);
    for (const candidate of group) {
      aliases.set(candidate.record.id, merged.id);
      candidate.legacyIds.forEach((id) => aliases.set(id, merged.id));
      if (group.length > 1) autoMerged.add(candidate.record.id);
    }
    if (group.length > 1) {
      duplicates.push({
        entity: 'contact',
        category: 'certain',
        recordIds: group.map((candidate) => candidate.record.id).sort(),
        reasons: ['Übereinstimmende starke Identität (Legacy-ID oder Kombination aus Name, Telefon und E-Mail)'],
        autoMergedInto: merged.id,
      });
    }
  }

  duplicates.push(...candidateGroups(ordered, contactKeys, autoMerged));
  const duplicateIds = new Set(duplicates.flatMap((candidate) => candidate.recordIds));
  const separate = ordered.map((candidate) => candidate.record.id).filter((id) => !duplicateIds.has(id));
  if (separate.length > 0) duplicates.push({ entity: 'contact', category: 'separate', recordIds: separate, reasons: ['Keine belastbare Identitätsüberschneidung erkannt'] });

  return { records: records.sort((left, right) => left.id.localeCompare(right.id)), aliases, duplicates };
}

export function deduplicateProperties(candidates: PropertyCandidate[]) {
  const ordered = [...candidates].sort((left, right) => left.record.id.localeCompare(right.record.id));
  const unionFind = createUnionFind(ordered.map((candidate) => candidate.record.id));
  const strongBuckets = new Map<string, string[]>();
  for (const candidate of ordered) {
    for (const key of propertyKeys(candidate).strong) addBucket(strongBuckets, key, candidate.record.id);
  }
  unionBuckets(unionFind, strongBuckets);

  const groups = new Map<string, PropertyCandidate[]>();
  for (const candidate of ordered) {
    const root = unionFind.find(candidate.record.id);
    const group = groups.get(root) ?? [];
    group.push(candidate);
    groups.set(root, group);
  }

  const records: Property[] = [];
  const aliases = new Map<string, string>();
  const duplicates: DuplicateCandidate[] = [];
  const mergedIds = new Set<string>();
  for (const group of [...groups.values()].sort((left, right) => left[0].record.id.localeCompare(right[0].record.id))) {
    const merged = mergePropertyGroup(group);
    records.push(merged);
    for (const candidate of group) {
      aliases.set(candidate.record.id, merged.id);
      candidate.legacyIds.forEach((id) => aliases.set(id, merged.id));
      if (group.length > 1) mergedIds.add(candidate.record.id);
    }
    if (group.length > 1) {
      duplicates.push({ entity: 'property', category: 'certain', recordIds: group.map((candidate) => candidate.record.id).sort(), reasons: ['Gleiche Objekt-ID oder normalisierte Adresse und Objektart'], autoMergedInto: merged.id });
    }
  }

  const probableBuckets = new Map<string, string[]>();
  const manualBuckets = new Map<string, string[]>();
  for (const candidate of ordered) {
    if (mergedIds.has(candidate.record.id)) continue;
    const keys = propertyKeys(candidate);
    keys.probable.forEach((key) => addBucket(probableBuckets, key, candidate.record.id));
    keys.manual.forEach((key) => addBucket(manualBuckets, key, candidate.record.id));
  }
  const probableIds = new Set<string>();
  for (const [reason, ids] of [...probableBuckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const unique = [...new Set(ids)].sort();
    if (unique.length < 2) continue;
    unique.forEach((id) => probableIds.add(id));
    duplicates.push({ entity: 'property', category: 'probable', recordIds: unique, reasons: [reason] });
  }
  for (const [reason, ids] of [...manualBuckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const unique = [...new Set(ids)].filter((id) => !probableIds.has(id)).sort();
    if (unique.length < 2) continue;
    duplicates.push({ entity: 'property', category: 'manual', recordIds: unique, reasons: [reason] });
  }
  const duplicateIds = new Set(duplicates.flatMap((candidate) => candidate.recordIds));
  const separate = ordered.map((candidate) => candidate.record.id).filter((id) => !duplicateIds.has(id));
  if (separate.length > 0) duplicates.push({ entity: 'property', category: 'separate', recordIds: separate, reasons: ['Keine belastbare Objektüberschneidung erkannt'] });

  return { records: records.sort((left, right) => left.id.localeCompare(right.id)), aliases, duplicates };
}
