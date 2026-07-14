import { findLegacySource, LEGACY_SOURCE_CATALOG, SUPPORTED_LEGACY_KEYS } from '../../data/legacy/sourceCatalog';
import type { Appointment, AuditEvent, CallEvent, Contact, ContactStage, FollowUp, Property } from '../../types/domain';
import { deduplicateContacts, deduplicateProperties, type ContactCandidate, type PropertyCandidate } from './duplicates';
import {
  canonicalize,
  compactText,
  legacyId,
  normalizeAddress,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizePriority,
  normalizeRole,
  normalizeStage,
  readAddress,
  readCity,
  readDate,
  readFirst,
  readNumber,
  readText,
  splitName,
  stableHash,
  stableId,
  stageRank,
} from './normalization';
import { isSafeObject, parseNestedJson, parseSafeJson } from './security';
import type {
  DetectedLegacySource,
  LegacyActivityExtension,
  LegacyMarketObservationExtension,
  LegacyPipelineExtension,
  LegacyRecordEnvelope,
  LegacyValuationExtension,
  MigrationIssue,
  SafeJsonObject,
  UnresolvedRelationship,
  VincereImportPackage,
} from './types';

const FALLBACK_DATE = '1970-01-01T00:00:00.000Z';
const CONTACT_REFERENCE_ALIASES = ['contactId', 'contact_id', 'personId', 'person_id', 'customerId', 'customer_id', 'kundeId', 'kontaktId', 'ownerId', 'buyerId', 'leadId', 'referralId'] as const;
const CONTACT_NAME_ALIASES = {
  contact: ['contactName', 'customerName', 'name', 'person', 'kunde', 'kontakt'],
  owner: ['ownerName', 'eigentuemerName', 'contactName', 'customerName', 'kontakt'],
  buyer: ['buyerName', 'kaeuferName', 'contactName', 'customerName', 'kontakt'],
  referrer: ['referrerName', 'referralName', 'tippgeberName', 'contactName', 'kontakt'],
} as const;
const PHONE_ALIASES = ['phone', 'telefon', 'telephone', 'mobile', 'mobil', 'phoneNumber', 'tel'] as const;
const EMAIL_ALIASES = ['email', 'mail', 'emailAddress'] as const;
const STATUS_ALIASES = ['stage', 'status', 'phase', 'pipelineStage', 'productionStage', 'state'] as const;

interface ExtractedSources {
  sources: DetectedLegacySource[];
  envelopes: LegacyRecordEnvelope[];
  fingerprintInput: Record<string, unknown>;
  issues: MigrationIssue[];
}

interface ContactResolver {
  resolve: (record: SafeJsonObject, envelope: LegacyRecordEnvelope, relationship: UnresolvedRelationship['relationship']) => string | undefined;
  unresolved: UnresolvedRelationship[];
}

function isRecordArray(value: unknown): value is SafeJsonObject[] {
  return Array.isArray(value) && value.every(isSafeObject);
}

function unwrapExport(parsed: unknown): unknown {
  if (Array.isArray(parsed)) {
    const entries = parsed.filter(isSafeObject);
    if (entries.length > 0 && entries.every((entry) => typeof entry.key === 'string' && 'value' in entry)) {
      return Object.fromEntries(entries.map((entry) => [String(entry.key), entry.value]));
    }
    return parsed;
  }
  if (!isSafeObject(parsed)) return parsed;
  if (Object.keys(parsed).some((key) => SUPPORTED_LEGACY_KEYS.has(key))) return parsed;

  for (const wrapper of ['localStorage', 'storage', 'data', 'payload', 'backup', 'values']) {
    const candidate = parseNestedJson(parsed[wrapper]);
    if (isSafeObject(candidate) && Object.keys(candidate).some((key) => SUPPORTED_LEGACY_KEYS.has(key))) return candidate;
  }
  return parsed;
}

function asRecords(value: unknown): { records: SafeJsonObject[]; shape: DetectedLegacySource['shape'] } {
  const parsed = parseNestedJson(value);
  if (Array.isArray(parsed)) {
    const records = parsed.filter(isSafeObject);
    return { records, shape: parsed.length === 0 ? 'empty' : records.length === parsed.length ? 'array' : 'invalid' };
  }
  if (!isSafeObject(parsed)) return { records: [], shape: parsed === null || parsed === '' ? 'empty' : 'invalid' };

  for (const alias of ['items', 'records', 'entries', 'data', 'list']) {
    const nested = parseNestedJson(parsed[alias]);
    if (isRecordArray(nested)) return { records: nested, shape: nested.length === 0 ? 'empty' : 'array' };
  }

  const values = Object.values(parsed);
  if (values.length > 0 && values.every(isSafeObject)) return { records: values, shape: 'object' };
  return { records: [parsed], shape: 'object' };
}

function extractSources(payload: string): ExtractedSources {
  const parsed = unwrapExport(parseSafeJson(payload));
  if (!isSafeObject(parsed)) throw new Error('Das JSON muss ein Objekt mit exportierten LocalStorage-Schlüsseln enthalten.');

  const sources: DetectedLegacySource[] = [];
  const envelopes: LegacyRecordEnvelope[] = [];
  const fingerprintInput: Record<string, unknown> = {};
  const issues: MigrationIssue[] = [];

  for (const definition of LEGACY_SOURCE_CATALOG) {
    if (!(definition.key in parsed)) continue;
    const sourceValue = parseNestedJson(parsed[definition.key]);
    const { records, shape } = asRecords(sourceValue);
    sources.push({ ...definition, count: records.length, shape });
    fingerprintInput[definition.key] = sourceValue;

    if (shape === 'invalid') {
      issues.push({ severity: 'error', code: 'invalid-source-shape', message: 'Die Datenquelle enthält keine unterstützte Liste oder Objektstruktur.', sourceKey: definition.key });
      continue;
    }

    records.forEach((value, sourceIndex) => envelopes.push({
      sourceKey: definition.key,
      sourceIndex,
      sourceStatus: definition.status,
      sourcePriority: definition.priority,
      value,
    }));
  }

  if (sources.length === 0) {
    throw new Error('Keine unterstützten MaklerCRM-Datenquellen erkannt. Erwartet werden beispielsweise kk_crm_contacts, kk_followups oder kk_crm_objects.');
  }

  sources.sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key));
  envelopes.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.sourceIndex - right.sourceIndex);
  return { sources, envelopes, fingerprintInput, issues };
}

function meaningfulLegacyIds(envelope: LegacyRecordEnvelope) {
  const id = legacyId(envelope.value);
  if (!id) return [];
  const ids = [`${envelope.sourceKey}:${id}`];
  if (id.length >= 8 || /[a-zA-Z_-]/.test(id)) ids.push(id);
  return ids;
}

function contactCandidate(envelope: LegacyRecordEnvelope): ContactCandidate | undefined {
  const { firstName, lastName } = splitName(envelope.value);
  const phone = readText(envelope.value, PHONE_ALIASES) ?? '';
  const email = readText(envelope.value, EMAIL_ALIASES);
  if (!firstName && !lastName && !phone && !email) return undefined;

  const identity = {
    sourceKey: envelope.sourceKey,
    legacyId: legacyId(envelope.value),
    name: normalizeName(`${firstName} ${lastName}`),
    phone: normalizePhone(phone),
    email: normalizeEmail(email),
    city: normalizeName(readCity(envelope.value)),
    sourceIndex: envelope.sourceIndex,
  };
  const createdAt = readDate(envelope.value, ['createdAt', 'created_at', 'created', 'angelegtAm', 'date']) ?? FALLBACK_DATE;
  const notes = readText(envelope.value, ['notes', 'note', 'notiz', 'bemerkung', 'description', 'details']);
  const potential = readNumber(envelope.value, ['potential', 'value', 'dealValue', 'estimatedValue', 'provision', 'commission']) ?? 0;

  return {
    sourceKey: envelope.sourceKey,
    sourcePriority: envelope.sourcePriority,
    legacyIds: meaningfulLegacyIds(envelope),
    record: {
      id: stableId('legacy_contact', identity),
      firstName,
      lastName,
      phone,
      email,
      city: readCity(envelope.value),
      source: readText(envelope.value, ['source', 'quelle', 'leadSource', 'origin']) ?? envelope.sourceKey,
      role: normalizeRole(readFirst(envelope.value, ['role', 'type', 'category', 'kontaktart', 'kind']), envelope.sourceKey),
      stage: normalizeStage(readFirst(envelope.value, STATUS_ALIASES)),
      priority: normalizePriority(readFirst(envelope.value, ['priority', 'prioritaet', 'importance', 'class'])),
      potential,
      lastContactAt: readDate(envelope.value, ['lastContactAt', 'lastContact', 'last_contact_at', 'zuletztKontaktiert', 'lastActivityAt']),
      nextActionAt: readDate(envelope.value, ['nextActionAt', 'nextAction', 'next_action_at', 'nextStepAt', 'followUpAt', 'dueAt']),
      notes,
      createdAt,
    },
  };
}

function hasContactIdentity(record: SafeJsonObject) {
  const { firstName, lastName } = splitName(record);
  return Boolean(firstName || lastName) && Boolean(readText(record, PHONE_ALIASES) || readText(record, EMAIL_ALIASES));
}

function buildContactCandidates(envelopes: LegacyRecordEnvelope[]) {
  const candidates: ContactCandidate[] = [];
  for (const envelope of envelopes) {
    const source = findLegacySource(envelope.sourceKey);
    if (!source) continue;
    if (source.entity === 'contact' || ((source.entity === 'pipeline' || source.entity === 'valuation') && hasContactIdentity(envelope.value))) {
      const candidate = contactCandidate(envelope);
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

function buildContactResolver(candidates: ContactCandidate[], contacts: Contact[], aliases: Map<string, string>): ContactResolver {
  const unresolved: UnresolvedRelationship[] = [];
  const referenceIndex = new Map<string, Set<string>>();
  const nameIndex = new Map<string, Contact[]>();

  const addReference = (reference: string, contactId: string) => {
    if (!reference) return;
    const bucket = referenceIndex.get(reference) ?? new Set<string>();
    bucket.add(contactId);
    referenceIndex.set(reference, bucket);
  };

  for (const candidate of candidates) {
    const contactId = aliases.get(candidate.record.id) ?? candidate.record.id;
    candidate.legacyIds.forEach((id) => addReference(id, contactId));
  }
  for (const contact of contacts) {
    const name = normalizeName(`${contact.firstName} ${contact.lastName}`);
    if (name) {
      const bucket = nameIndex.get(name) ?? [];
      bucket.push(contact);
      nameIndex.set(name, bucket);
    }
  }

  const resolve = (record: SafeJsonObject, envelope: LegacyRecordEnvelope, relationship: UnresolvedRelationship['relationship']) => {
    const direct = compactText(readFirst(record, CONTACT_REFERENCE_ALIASES));
    if (direct) {
      const candidatesByReference = new Set<string>([
        ...(referenceIndex.get(direct) ?? []),
        ...(referenceIndex.get(`${envelope.sourceKey}:${direct}`) ?? []),
      ]);
      if (candidatesByReference.size === 1) return [...candidatesByReference][0];
      if (candidatesByReference.size > 1) {
        unresolved.push({ sourceKey: envelope.sourceKey, sourceIndex: envelope.sourceIndex, relationship, legacyReference: direct, candidateContactIds: [...candidatesByReference].sort(), reason: 'Die Legacy-ID verweist auf mehrere mögliche Kontakte.' });
        return undefined;
      }
    }

    const nameAliases = CONTACT_NAME_ALIASES[relationship];
    const explicitName = readFirst(record, nameAliases);
    const split = relationship === 'contact' ? splitName(record) : { firstName: '', lastName: '' };
    const name = normalizeName(explicitName ?? `${split.firstName} ${split.lastName}`);
    if (!name) {
      if (direct) unresolved.push({ sourceKey: envelope.sourceKey, sourceIndex: envelope.sourceIndex, relationship, legacyReference: direct, candidateContactIds: [], reason: 'Die angegebene Legacy-Kontakt-ID wurde nicht gefunden.' });
      return undefined;
    }

    let candidatesByName = [...(nameIndex.get(name) ?? [])];
    const phone = normalizePhone(readFirst(record, PHONE_ALIASES));
    const email = normalizeEmail(readFirst(record, EMAIL_ALIASES));
    if (phone) candidatesByName = candidatesByName.filter((contact) => normalizePhone(contact.phone) === phone);
    if (email) candidatesByName = candidatesByName.filter((contact) => normalizeEmail(contact.email) === email);
    if (candidatesByName.length === 1) return candidatesByName[0].id;

    unresolved.push({
      sourceKey: envelope.sourceKey,
      sourceIndex: envelope.sourceIndex,
      relationship,
      legacyReference: compactText(explicitName ?? `${split.firstName} ${split.lastName}`),
      candidateContactIds: candidatesByName.map((contact) => contact.id).sort(),
      reason: candidatesByName.length === 0 ? 'Keine eindeutige Kontaktzuordnung gefunden.' : 'Mehrere Kontakte tragen denselben Namen; die Zuordnung wird nicht geraten.',
    });
    return undefined;
  };

  return { resolve, unresolved };
}

function propertyStatus(value: unknown): Property['status'] {
  const text = normalizeName(value);
  if (text.includes('verkauft') || text.includes('sold')) return 'Verkauft';
  if (text.includes('vermarkt') || text.includes('online') || text.includes('angebot')) return 'Vermarktung';
  if (text.includes('bewert') || text.includes('valuation') || text.includes('termin')) return 'Bewertung';
  return 'Akquise';
}

function propertyCandidate(envelope: LegacyRecordEnvelope, resolver: ContactResolver, forceValuation = false): PropertyCandidate | undefined {
  const address = readAddress(envelope.value) ?? '';
  const city = readCity(envelope.value);
  const title = readText(envelope.value, ['title', 'name', 'objectName', 'propertyName', 'bezeichnung']) ?? [readText(envelope.value, ['type', 'objectType', 'propertyType', 'objektart']), address || city].filter(Boolean).join(' · ');
  if (!title && !address && !city) return undefined;

  const identity = { sourceKey: envelope.sourceKey, legacyId: legacyId(envelope.value), address: normalizeAddress(`${address} ${city}`), title: normalizeName(title), sourceIndex: envelope.sourceIndex };
  const ownerContactId = resolver.resolve(envelope.value, envelope, 'owner');
  return {
    sourceKey: envelope.sourceKey,
    sourcePriority: envelope.sourcePriority,
    legacyIds: meaningfulLegacyIds(envelope),
    record: {
      id: stableId('legacy_property', identity),
      title: title || 'Unbenanntes Legacy-Objekt',
      address,
      city,
      type: readText(envelope.value, ['type', 'objectType', 'propertyType', 'objektart', 'category']) ?? 'Unbekannt',
      status: forceValuation ? 'Bewertung' : propertyStatus(readFirst(envelope.value, STATUS_ALIASES)),
      estimatedValue: readNumber(envelope.value, ['estimatedValue', 'marketValue', 'value', 'price', 'askingPrice', 'kaufpreis', 'preis']) ?? 0,
      ownerContactId,
    },
  };
}

function buildPropertyCandidates(envelopes: LegacyRecordEnvelope[], resolver: ContactResolver) {
  const candidates: PropertyCandidate[] = [];
  for (const envelope of envelopes) {
    const source = findLegacySource(envelope.sourceKey);
    if (!source) continue;
    if (source.entity === 'property') {
      const candidate = propertyCandidate(envelope, resolver);
      if (candidate) candidates.push(candidate);
    } else if (source.entity === 'valuation' && readAddress(envelope.value)) {
      const candidate = propertyCandidate(envelope, resolver, true);
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

function buildPropertyResolver(candidates: PropertyCandidate[], aliases: Map<string, string>, properties: Property[]) {
  const referenceIndex = new Map<string, Set<string>>();
  const addressIndex = new Map<string, Property[]>();
  const add = (reference: string, propertyId: string) => {
    if (!reference) return;
    const bucket = referenceIndex.get(reference) ?? new Set<string>();
    bucket.add(propertyId);
    referenceIndex.set(reference, bucket);
  };
  for (const candidate of candidates) {
    const propertyId = aliases.get(candidate.record.id) ?? candidate.record.id;
    candidate.legacyIds.forEach((id) => add(id, propertyId));
  }
  for (const property of properties) {
    const address = normalizeAddress(`${property.address} ${property.city}`);
    if (!address) continue;
    const bucket = addressIndex.get(address) ?? [];
    bucket.push(property);
    addressIndex.set(address, bucket);
  }
  return (record: SafeJsonObject) => {
    const direct = compactText(readFirst(record, ['propertyId', 'property_id', 'objectId', 'object_id', 'objektId']));
    if (direct) {
      const ids = referenceIndex.get(direct);
      if (ids?.size === 1) return [...ids][0];
    }
    const address = normalizeAddress(`${readAddress(record) ?? ''} ${readCity(record)}`);
    const matches = addressIndex.get(address) ?? [];
    return matches.length === 1 ? matches[0].id : undefined;
  };
}

function normalizeChannel(value: unknown): FollowUp['channel'] {
  const text = normalizeName(value);
  if (text.includes('mail') || text.includes('email')) return 'email';
  if (text.includes('termin') || text.includes('meeting') || text.includes('personlich')) return 'meeting';
  return 'phone';
}

function isDone(value: unknown) {
  if (value === true || value === 1) return true;
  const text = normalizeName(value);
  return text.includes('done') || text.includes('erledigt') || text.includes('completed') || text.includes('abgeschlossen');
}

function mapFollowUps(envelopes: LegacyRecordEnvelope[], resolver: ContactResolver, issues: MigrationIssue[]) {
  const records: FollowUp[] = [];
  for (const envelope of envelopes.filter((item) => findLegacySource(item.sourceKey)?.entity === 'followup')) {
    const contactId = resolver.resolve(envelope.value, envelope, 'contact');
    const dueAt = readDate(envelope.value, ['dueAt', 'due', 'date', 'datum', 'followUpAt', 'nextActionAt', 'scheduledAt']);
    if (!contactId || !dueAt) {
      if (!dueAt) issues.push({ severity: 'error', code: 'followup-missing-date', message: 'Follow-up ohne gültiges Fälligkeitsdatum wurde nicht in operative VINCERE-Daten übernommen.', sourceKey: envelope.sourceKey, sourceIndex: envelope.sourceIndex, field: 'dueAt' });
      continue;
    }
    records.push({
      id: stableId('legacy_followup', { sourceKey: envelope.sourceKey, legacyId: legacyId(envelope.value), contactId, dueAt, title: readText(envelope.value, ['title', 'task', 'text', 'note', 'subject']), sourceIndex: envelope.sourceIndex }),
      contactId,
      title: readText(envelope.value, ['title', 'task', 'text', 'note', 'subject', 'beschreibung']) ?? 'Legacy-Follow-up',
      dueAt,
      priority: normalizePriority(readFirst(envelope.value, ['priority', 'prioritaet', 'importance'])),
      status: isDone(readFirst(envelope.value, ['status', 'done', 'completed'])) ? 'done' : 'open',
      channel: normalizeChannel(readFirst(envelope.value, ['channel', 'type', 'kind', 'contactType'])),
    });
  }
  return records;
}

function mapActivities(envelopes: LegacyRecordEnvelope[], resolver: ContactResolver, issues: MigrationIssue[]) {
  const activities: LegacyActivityExtension[] = [];
  const calls: CallEvent[] = [];
  const appointments: Appointment[] = [];

  for (const envelope of envelopes.filter((item) => findLegacySource(item.sourceKey)?.entity === 'activity')) {
    const contactId = resolver.resolve(envelope.value, envelope, 'contact');
    const type = readText(envelope.value, ['type', 'kind', 'activityType', 'channel']) ?? 'activity';
    const normalizedType = normalizeName(type);
    const occurredAt = readDate(envelope.value, ['createdAt', 'occurredAt', 'date', 'datum', 'timestamp', 'startsAt']);
    const title = readText(envelope.value, ['title', 'subject', 'summary', 'text', 'note']) ?? 'Legacy-Aktivität';
    const note = readText(envelope.value, ['note', 'notes', 'description', 'details', 'result', 'outcome']);
    const id = stableId('legacy_activity', { sourceKey: envelope.sourceKey, legacyId: legacyId(envelope.value), contactId, occurredAt, title, sourceIndex: envelope.sourceIndex });
    activities.push({ id, contactId, type, title, note, occurredAt, sourceKey: envelope.sourceKey });

    if (contactId && (normalizedType.includes('call') || normalizedType.includes('telefon') || normalizedType.includes('anruf'))) {
      if (!occurredAt) {
        issues.push({ severity: 'warning', code: 'call-missing-date', message: 'Telefonaktivität ohne gültigen Zeitpunkt bleibt als Erweiterungsdaten erhalten und wird nicht als relationales Telefonereignis ausgegeben.', sourceKey: envelope.sourceKey, sourceIndex: envelope.sourceIndex, field: 'createdAt' });
      } else {
        const outcomeText = normalizeName(readFirst(envelope.value, ['outcome', 'result', 'status', 'ergebnis']));
        const outcome: CallEvent['outcome'] = outcomeText.includes('termin') || outcomeText.includes('appointment')
          ? 'appointment'
          : outcomeText.includes('kein') || outcomeText.includes('no answer') || outcomeText.includes('nicht erreicht')
            ? 'no_answer'
            : outcomeText.includes('kein interesse') || outcomeText.includes('not interested')
              ? 'not_interested'
              : 'conversation';
        calls.push({ id: stableId('legacy_call', id), contactId, outcome, note: note ?? title, createdAt: occurredAt });
      }
    }

    if (normalizedType.includes('termin') || normalizedType.includes('meeting') || normalizedType.includes('appointment')) {
      const startsAt = occurredAt ?? readDate(envelope.value, ['appointmentAt', 'meetingAt', 'scheduledAt']);
      if (startsAt) appointments.push({ id: stableId('legacy_appointment', id), contactId, title, subtitle: note ?? envelope.sourceKey, startsAt, status: 'today' });
    }
  }
  return { activities, calls, appointments };
}

function mapPipeline(envelopes: LegacyRecordEnvelope[], resolver: ContactResolver, contacts: Contact[]) {
  const entries: LegacyPipelineExtension[] = [];
  const stageUpdates = new Map<string, ContactStage>();
  for (const envelope of envelopes.filter((item) => findLegacySource(item.sourceKey)?.entity === 'pipeline')) {
    const contactId = resolver.resolve(envelope.value, envelope, 'contact');
    const stageText = readText(envelope.value, STATUS_ALIASES) ?? 'Unbekannt';
    const stage = normalizeStage(stageText);
    if (contactId) {
      const current = stageUpdates.get(contactId) ?? contacts.find((contact) => contact.id === contactId)?.stage ?? 'lead';
      if (stageRank(stage) > stageRank(current)) stageUpdates.set(contactId, stage);
    }
    entries.push({
      id: stableId('legacy_pipeline', { sourceKey: envelope.sourceKey, legacyId: legacyId(envelope.value), contactId, stageText, sourceIndex: envelope.sourceIndex }),
      contactId,
      title: readText(envelope.value, ['title', 'name', 'dealName', 'opportunityName', 'contactName', 'ownerName']) ?? 'Legacy-Pipeline-Eintrag',
      stage: stageText,
      value: readNumber(envelope.value, ['value', 'dealValue', 'price', 'commission', 'provision', 'potential']),
      nextActionAt: readDate(envelope.value, ['nextActionAt', 'nextStepAt', 'dueAt', 'followUpAt']),
      sourceKey: envelope.sourceKey,
      rawStatus: compactText(readFirst(envelope.value, STATUS_ALIASES)),
    });
  }
  return { entries, stageUpdates };
}

function mapValuations(envelopes: LegacyRecordEnvelope[], resolver: ContactResolver, propertyResolver: (record: SafeJsonObject) => string | undefined) {
  const valuations: LegacyValuationExtension[] = [];
  const appointments: Appointment[] = [];
  for (const envelope of envelopes.filter((item) => findLegacySource(item.sourceKey)?.entity === 'valuation')) {
    const contactId = resolver.resolve(envelope.value, envelope, 'owner');
    const propertyId = propertyResolver(envelope.value);
    const appointmentAt = readDate(envelope.value, ['appointmentAt', 'valuationAt', 'meetingAt', 'date', 'datum', 'scheduledAt']);
    const title = readText(envelope.value, ['title', 'name', 'ownerName', 'contactName', 'objectName']) ?? 'Legacy-Bewertungschance';
    const id = stableId('legacy_valuation', { sourceKey: envelope.sourceKey, legacyId: legacyId(envelope.value), contactId, propertyId, title, sourceIndex: envelope.sourceIndex });
    valuations.push({
      id,
      contactId,
      propertyId,
      title,
      status: readText(envelope.value, STATUS_ALIASES) ?? 'Unbekannt',
      estimatedValue: readNumber(envelope.value, ['estimatedValue', 'marketValue', 'value', 'price', 'kaufpreis']),
      appointmentAt,
      sourceKey: envelope.sourceKey,
    });
    if (appointmentAt) appointments.push({ id: stableId('legacy_appointment', id), contactId, title: `Bewertung: ${title}`, subtitle: envelope.sourceKey, startsAt: appointmentAt, status: 'today' });
  }
  return { valuations, appointments };
}

function mapMarketObservations(envelopes: LegacyRecordEnvelope[]) {
  const observations: LegacyMarketObservationExtension[] = [];
  for (const envelope of envelopes.filter((item) => findLegacySource(item.sourceKey)?.entity === 'market')) {
    const title = readText(envelope.value, ['title', 'name', 'objectName', 'address', 'adresse']) ?? 'Legacy-Marktbeobachtung';
    observations.push({
      id: stableId('legacy_market', { sourceKey: envelope.sourceKey, legacyId: legacyId(envelope.value), address: readAddress(envelope.value), title, sourceIndex: envelope.sourceIndex }),
      title,
      address: readAddress(envelope.value),
      city: readCity(envelope.value) || undefined,
      propertyType: readText(envelope.value, ['type', 'objectType', 'propertyType', 'objektart']),
      askingPrice: readNumber(envelope.value, ['askingPrice', 'price', 'kaufpreis', 'angebotspreis']),
      observedAt: readDate(envelope.value, ['observedAt', 'createdAt', 'date', 'datum', 'firstSeenAt', 'lastSeenAt']),
      sourceKey: envelope.sourceKey,
    });
  }
  return observations;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const byId = new Map<string, T>();
  for (const item of [...items].sort((left, right) => left.id.localeCompare(right.id))) byId.set(item.id, item);
  return [...byId.values()];
}

function sortIssues(issues: MigrationIssue[]) {
  return [...issues].sort((left, right) => left.severity.localeCompare(right.severity) || (left.sourceKey ?? '').localeCompare(right.sourceKey ?? '') || (left.sourceIndex ?? -1) - (right.sourceIndex ?? -1) || left.code.localeCompare(right.code));
}

function buildAuditEvents(issues: MigrationIssue[], fingerprint: string): AuditEvent[] {
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  return [{
    id: stableId('legacy_audit', fingerprint),
    actorId: 'legacy-importer',
    workspaceId: 'pending-workspace-assignment',
    entity: 'backup',
    action: 'legacy_package_created',
    summary: `Legacy-Importpaket vorbereitet: ${warnings} Warnungen, ${errors} Fehler. Keine Cloud-Speicherung ausgeführt.`,
    createdAt: FALLBACK_DATE,
  }];
}

export function createLegacyImportPackage(payload: string) {
  const extracted = extractSources(payload);
  const issues = [...extracted.issues];
  const contactCandidates = buildContactCandidates(extracted.envelopes);
  const contactResult = deduplicateContacts(contactCandidates);
  const resolver = buildContactResolver(contactCandidates, contactResult.records, contactResult.aliases);

  const propertyCandidates = buildPropertyCandidates(extracted.envelopes, resolver);
  const propertyResult = deduplicateProperties(propertyCandidates);
  const propertyResolver = buildPropertyResolver(propertyCandidates, propertyResult.aliases, propertyResult.records);

  const followUps = mapFollowUps(extracted.envelopes, resolver, issues);
  const activityResult = mapActivities(extracted.envelopes, resolver, issues);
  const pipelineResult = mapPipeline(extracted.envelopes, resolver, contactResult.records);
  const valuationResult = mapValuations(extracted.envelopes, resolver, propertyResolver);
  const marketObservations = mapMarketObservations(extracted.envelopes);

  const contacts = contactResult.records.map((contact) => {
    const stage = pipelineResult.stageUpdates.get(contact.id);
    return stage ? { ...contact, stage } : contact;
  });

  if (marketObservations.length > 0) {
    issues.push({ severity: 'warning', code: 'market-observations-extension', message: 'Marktbeobachtungen bleiben im Importpaket getrennt. Das aktuelle relationale Property-Modell besitzt noch keinen sicheren Markt-/Research-Datensatztyp.' });
  }
  if (pipelineResult.entries.length > 0) {
    issues.push({ severity: 'warning', code: 'pipeline-extension', message: 'Pipeline-Einträge werden vollständig als Erweiterungsdaten erhalten; nur eindeutig verknüpfte Kontaktstufen werden in das aktuelle Kontaktmodell übertragen.' });
  }
  if (activityResult.activities.length > 0) {
    issues.push({ severity: 'warning', code: 'activities-extension', message: 'Allgemeine CRM-Aktivitäten werden als Erweiterungsdaten erhalten. Telefonate und rekonstruierbare Termine werden zusätzlich in relationale VINCERE-Datensätze überführt.' });
  }

  const sourceFingerprint = stableHash(extracted.fingerprintInput);
  const sortedIssues = sortIssues(issues);
  const duplicateCandidates = [...contactResult.duplicates, ...propertyResult.duplicates].sort((left, right) => left.entity.localeCompare(right.entity) || left.category.localeCompare(right.category) || canonicalize(left.recordIds).localeCompare(canonicalize(right.recordIds)));
  const unresolvedRelationships = [...resolver.unresolved].sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.sourceIndex - right.sourceIndex || left.relationship.localeCompare(right.relationship));

  const importPackage: VincereImportPackage = {
    format: 'vincere-legacy-import-package',
    formatVersion: 1,
    sourceFingerprint,
    records: {
      contacts: contacts.sort((left, right) => left.id.localeCompare(right.id)),
      followUps: dedupeById(followUps),
      properties: propertyResult.records,
      appointments: dedupeById([...activityResult.appointments, ...valuationResult.appointments]),
      callEvents: dedupeById(activityResult.calls),
      auditEvents: buildAuditEvents(sortedIssues, sourceFingerprint),
    },
    extensions: {
      activities: dedupeById(activityResult.activities),
      pipelineEntries: dedupeById(pipelineResult.entries),
      valuationOpportunities: dedupeById(valuationResult.valuations),
      marketObservations: dedupeById(marketObservations),
    },
    migration: {
      sourceKeys: extracted.sources.map((source) => source.key).sort(),
      issues: sortedIssues,
      duplicates: duplicateCandidates,
      unresolvedRelationships,
      deterministic: true,
      cloudWriteAllowed: false,
    },
  };

  return { sources: extracted.sources, package: importPackage };
}

export function importPackageJson(importPackage: VincereImportPackage) {
  return `${JSON.stringify(importPackage, null, 2)}\n`;
}

export function sourceCount(importPackage: VincereImportPackage) {
  return importPackage.migration.sourceKeys.length;
}
