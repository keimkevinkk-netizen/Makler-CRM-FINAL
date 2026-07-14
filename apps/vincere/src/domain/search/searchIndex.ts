import type { AppState, Contact, Priority } from '../../types/domain';

export type SearchRecordType =
  | 'contact'
  | 'property'
  | 'followup'
  | 'appointment'
  | 'call'
  | 'pipeline'
  | 'network'
  | 'valuation'
  | 'next-action';

export interface SearchIndexEntry {
  id: string;
  entityId: string;
  workspaceId: string;
  type: SearchRecordType;
  label: string;
  subtitle: string;
  searchValues: string[];
  tokens: string[];
  phones: string[];
  emails: string[];
  priority?: Priority;
  activePipeline: boolean;
  openAction: boolean;
  overdue: boolean;
  activityAt?: string;
}

export interface SearchResult extends SearchIndexEntry {
  score: number;
  reasons: string[];
  directMatch: 'phone' | 'email' | 'exact' | 'prefix' | 'fuzzy' | 'contains';
}

export interface SearchIndexOptions {
  includeContactNotes?: boolean;
  now?: Date;
}

export interface SearchRequest {
  workspaceId: string;
  types?: SearchRecordType[];
  limit?: number;
  now?: Date;
}

const typeOrder: Record<SearchRecordType, number> = {
  contact: 0,
  pipeline: 1,
  followup: 2,
  'next-action': 3,
  appointment: 4,
  property: 5,
  valuation: 6,
  network: 7,
  call: 8,
};

const priorityWeight: Record<Priority, number> = { high: 50, medium: 24, low: 8 };
const pipelineStages = new Set<Contact['stage']>(['qualified', 'appointment', 'mandate']);

export function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@.+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase('de-DE');
}

function tokenize(values: string[]) {
  return [...new Set(values.flatMap((value) => normalizeSearchText(value).split(' ')).filter(Boolean))];
}

function phoneAliases(value: string) {
  const normalized = normalizePhone(value);
  if (!normalized) return [];
  const aliases = new Set([normalized]);
  if (normalized.startsWith('49') && normalized.length > 4) aliases.add(`0${normalized.slice(2)}`);
  if (normalized.startsWith('0') && normalized.length > 4) aliases.add(`49${normalized.slice(1)}`);
  return [...aliases];
}

function makeEntry(input: Omit<SearchIndexEntry, 'searchValues' | 'tokens' | 'phones' | 'emails'> & {
  values: string[];
  phones?: string[];
  emails?: string[];
}): SearchIndexEntry {
  const searchValues = [...new Set(input.values.map(normalizeSearchText).filter(Boolean))];
  return {
    id: input.id,
    entityId: input.entityId,
    workspaceId: input.workspaceId,
    type: input.type,
    label: input.label,
    subtitle: input.subtitle,
    searchValues,
    tokens: tokenize(input.values),
    phones: [...new Set((input.phones ?? []).flatMap(phoneAliases))],
    emails: [...new Set((input.emails ?? []).map(normalizeEmail).filter(Boolean))],
    priority: input.priority,
    activePipeline: input.activePipeline,
    openAction: input.openAction,
    overdue: input.overdue,
    activityAt: input.activityAt,
  };
}

function contactName(contact: Contact) {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

function isOverdue(date: string | undefined, now: Date) {
  return Boolean(date && new Date(date).getTime() < now.getTime());
}

export function buildSearchIndex(state: AppState, options: SearchIndexOptions = {}) {
  if (state.currentUser.workspaceId !== state.workspace.id) {
    throw new Error('Suchindex verweigert: Benutzer und Workspace stimmen nicht überein.');
  }

  const now = options.now ?? new Date();
  const workspaceId = state.workspace.id;
  const contacts = new Map(state.contacts.map((contact) => [contact.id, contact]));
  const openFollowUpsByContact = new Map<string, number>();
  for (const followUp of state.followUps) {
    if (followUp.status === 'open' && contacts.has(followUp.contactId)) {
      openFollowUpsByContact.set(followUp.contactId, (openFollowUpsByContact.get(followUp.contactId) ?? 0) + 1);
    }
  }

  const entries: SearchIndexEntry[] = [];

  for (const contact of state.contacts) {
    const name = contactName(contact);
    const activePipeline = pipelineStages.has(contact.stage);
    const openAction = Boolean(contact.nextActionAt) || (openFollowUpsByContact.get(contact.id) ?? 0) > 0;
    const values = [name, contact.firstName, contact.lastName, contact.city, contact.role, contact.source, contact.stage];
    if (options.includeContactNotes && contact.notes) values.push(contact.notes);

    entries.push(makeEntry({
      id: `contact:${contact.id}`,
      entityId: contact.id,
      workspaceId,
      type: 'contact',
      label: name,
      subtitle: `${contact.role} · ${contact.city} · ${contact.stage}`,
      values,
      phones: [contact.phone],
      emails: contact.email ? [contact.email] : [],
      priority: contact.priority,
      activePipeline,
      openAction,
      overdue: isOverdue(contact.nextActionAt, now),
      activityAt: contact.lastContactAt ?? contact.createdAt,
    }));

    if (contact.role === 'Netzwerk') {
      entries.push(makeEntry({
        id: `network:${contact.id}`,
        entityId: contact.id,
        workspaceId,
        type: 'network',
        label: name,
        subtitle: `Netzwerkpartner · ${contact.city} · ${contact.source}`,
        values: [name, contact.city, contact.source, 'Netzwerk', 'Netzwerkpartner'],
        phones: [contact.phone],
        emails: contact.email ? [contact.email] : [],
        priority: contact.priority,
        activePipeline: false,
        openAction,
        overdue: isOverdue(contact.nextActionAt, now),
        activityAt: contact.lastContactAt ?? contact.createdAt,
      }));
    }

    if (activePipeline) {
      entries.push(makeEntry({
        id: `pipeline:${contact.id}`,
        entityId: contact.id,
        workspaceId,
        type: 'pipeline',
        label: `${name} · ${contact.stage}`,
        subtitle: `Pipeline-Chance · Potenzial ${contact.potential} · ${contact.city}`,
        values: [name, contact.stage, contact.city, contact.role, 'Pipeline', 'Chance'],
        phones: [contact.phone],
        emails: contact.email ? [contact.email] : [],
        priority: contact.priority,
        activePipeline: true,
        openAction,
        overdue: isOverdue(contact.nextActionAt, now),
        activityAt: contact.lastContactAt ?? contact.createdAt,
      }));
    }

    if (contact.nextActionAt) {
      entries.push(makeEntry({
        id: `next-action:${contact.id}`,
        entityId: contact.id,
        workspaceId,
        type: 'next-action',
        label: `Nächste Aktion · ${name}`,
        subtitle: `${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(contact.nextActionAt))} · ${contact.city}`,
        values: [name, contact.city, 'naechste Aktion', 'nächste Aktion', contact.role],
        phones: [contact.phone],
        emails: contact.email ? [contact.email] : [],
        priority: contact.priority,
        activePipeline,
        openAction: true,
        overdue: isOverdue(contact.nextActionAt, now),
        activityAt: contact.nextActionAt,
      }));
    }
  }

  for (const property of state.properties) {
    const owner = property.ownerContactId ? contacts.get(property.ownerContactId) : undefined;
    entries.push(makeEntry({
      id: `property:${property.id}`,
      entityId: property.id,
      workspaceId,
      type: 'property',
      label: property.title,
      subtitle: `${property.address} · ${property.city} · ${property.status}`,
      values: [property.title, property.address, property.city, property.type, property.status, owner ? contactName(owner) : ''],
      priority: property.status === 'Akquise' || property.status === 'Bewertung' ? 'high' : 'medium',
      activePipeline: property.status !== 'Verkauft',
      openAction: property.status === 'Akquise' || property.status === 'Bewertung',
      overdue: false,
    }));

    if (property.status === 'Bewertung') {
      entries.push(makeEntry({
        id: `valuation:${property.id}`,
        entityId: property.id,
        workspaceId,
        type: 'valuation',
        label: `Bewertung · ${property.title}`,
        subtitle: `${property.address} · ${property.city}`,
        values: [property.title, property.address, property.city, property.type, 'Bewertung', owner ? contactName(owner) : ''],
        priority: 'high',
        activePipeline: true,
        openAction: true,
        overdue: false,
      }));
    }
  }

  for (const followUp of state.followUps) {
    const contact = contacts.get(followUp.contactId);
    if (!contact) continue;
    entries.push(makeEntry({
      id: `followup:${followUp.id}`,
      entityId: followUp.id,
      workspaceId,
      type: 'followup',
      label: followUp.title,
      subtitle: `${contactName(contact)} · ${followUp.channel} · ${followUp.status}`,
      values: [followUp.title, contactName(contact), contact.city, followUp.channel, followUp.status, 'Follow-up'],
      phones: [contact.phone],
      emails: contact.email ? [contact.email] : [],
      priority: followUp.priority,
      activePipeline: pipelineStages.has(contact.stage),
      openAction: followUp.status === 'open',
      overdue: followUp.status === 'open' && isOverdue(followUp.dueAt, now),
      activityAt: followUp.dueAt,
    }));
  }

  for (const appointment of state.appointments) {
    const contact = appointment.contactId ? contacts.get(appointment.contactId) : undefined;
    if (appointment.contactId && !contact) continue;
    entries.push(makeEntry({
      id: `appointment:${appointment.id}`,
      entityId: appointment.id,
      workspaceId,
      type: 'appointment',
      label: appointment.title,
      subtitle: `${appointment.subtitle} · ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(appointment.startsAt))}`,
      values: [appointment.title, appointment.subtitle, appointment.status, contact ? contactName(contact) : '', contact?.city ?? '', 'Termin'],
      phones: contact ? [contact.phone] : [],
      emails: contact?.email ? [contact.email] : [],
      priority: appointment.status === 'now' || appointment.status === 'today' ? 'high' : 'medium',
      activePipeline: Boolean(contact && pipelineStages.has(contact.stage)),
      openAction: true,
      overdue: false,
      activityAt: appointment.startsAt,
    }));
  }

  for (const call of state.callEvents) {
    const contact = contacts.get(call.contactId);
    if (!contact) continue;
    entries.push(makeEntry({
      id: `call:${call.id}`,
      entityId: call.id,
      workspaceId,
      type: 'call',
      label: `Telefonanruf · ${contactName(contact)}`,
      subtitle: `${call.outcome} · ${new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(call.createdAt))}`,
      values: [contactName(contact), contact.city, call.outcome, 'Telefonanruf', 'Anruf'],
      phones: [contact.phone],
      emails: contact.email ? [contact.email] : [],
      priority: contact.priority,
      activePipeline: pipelineStages.has(contact.stage),
      openAction: false,
      overdue: false,
      activityAt: call.createdAt,
    }));
  }

  return entries;
}

function maxDistance(token: string) {
  if (token.length >= 8) return 2;
  if (token.length >= 4) return 1;
  return 0;
}

export function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(previous[rightIndex] + 1, current[rightIndex - 1] + 1, substitution);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function fuzzyDistance(queryTokens: string[], entryTokens: string[]) {
  let total = 0;
  for (const queryToken of queryTokens) {
    const allowed = maxDistance(queryToken);
    if (allowed === 0) return null;
    let best = Number.POSITIVE_INFINITY;
    for (const entryToken of entryTokens) best = Math.min(best, levenshteinDistance(queryToken, entryToken));
    if (best > allowed) return null;
    total += best;
  }
  return total;
}

function recencyWeight(activityAt: string | undefined, now: Date) {
  if (!activityAt) return 0;
  const age = Math.max(0, now.getTime() - new Date(activityAt).getTime());
  const days = age / 86_400_000;
  if (days <= 1) return 32;
  if (days <= 7) return 24;
  if (days <= 30) return 14;
  if (days <= 90) return 6;
  return 0;
}

function matchEntry(entry: SearchIndexEntry, rawQuery: string, now: Date): SearchResult | null {
  const query = normalizeSearchText(rawQuery);
  if (!query) return null;
  const queryTokens = query.split(' ').filter(Boolean);
  const queryPhone = normalizePhone(rawQuery);
  const queryEmail = normalizeEmail(rawQuery);
  const reasons: string[] = [];
  let score = 0;
  let directMatch: SearchResult['directMatch'] | null = null;

  const phoneMatch = queryPhone.length >= 5 && entry.phones.some((phone) => phone === queryPhone || phone.endsWith(queryPhone) || queryPhone.endsWith(phone));
  const emailMatch = queryEmail.includes('@') && entry.emails.includes(queryEmail);
  const exactValue = entry.searchValues.includes(query);
  const exactTokens = queryTokens.every((token) => entry.tokens.includes(token));
  const prefixTokens = queryTokens.every((token) => entry.tokens.some((candidate) => candidate.startsWith(token)));
  const contains = entry.searchValues.some((value) => value.includes(query));

  if (phoneMatch) {
    score = 1_250;
    directMatch = 'phone';
    reasons.push('Direkter Telefonnummerntreffer');
  } else if (emailMatch) {
    score = 1_250;
    directMatch = 'email';
    reasons.push('Direkter E-Mail-Treffer');
  } else if (exactValue || exactTokens) {
    score = exactValue ? 1_100 : 960;
    directMatch = 'exact';
    reasons.push('Exakter Treffer');
  } else if (prefixTokens) {
    score = 790;
    directMatch = 'prefix';
    reasons.push('Wortanfang');
  } else if (contains) {
    score = 650;
    directMatch = 'contains';
    reasons.push('Enthaltener Suchbegriff');
  } else {
    const distance = fuzzyDistance(queryTokens, entry.tokens);
    if (distance === null) return null;
    score = 500 - distance * 35;
    directMatch = 'fuzzy';
    reasons.push(`Tippfehler-Toleranz ${distance}`);
  }

  if (entry.overdue) {
    score += 95;
    reasons.push('Überfällig');
  }
  if (entry.activePipeline) {
    score += 80;
    reasons.push('Aktive Pipeline');
  }
  if (entry.openAction) {
    score += 70;
    reasons.push('Offene Aktion');
  }
  if (entry.priority) {
    score += priorityWeight[entry.priority];
    if (entry.priority === 'high') reasons.push('Hohe Priorität');
  }
  const recency = recencyWeight(entry.activityAt, now);
  if (recency > 0) {
    score += recency;
    reasons.push('Aktuelle Aktivität');
  }

  return { ...entry, score, reasons, directMatch };
}

export function searchIndex(index: SearchIndexEntry[], rawQuery: string, request: SearchRequest) {
  const now = request.now ?? new Date();
  const allowedTypes = request.types?.length ? new Set(request.types) : null;
  return index
    .filter((entry) => entry.workspaceId === request.workspaceId)
    .filter((entry) => !allowedTypes || allowedTypes.has(entry.type))
    .map((entry) => matchEntry(entry, rawQuery, now))
    .filter((entry): entry is SearchResult => entry !== null)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.overdue !== left.overdue) return Number(right.overdue) - Number(left.overdue);
      if (right.activePipeline !== left.activePipeline) return Number(right.activePipeline) - Number(left.activePipeline);
      if (right.openAction !== left.openAction) return Number(right.openAction) - Number(left.openAction);
      const leftActivity = left.activityAt ? new Date(left.activityAt).getTime() : 0;
      const rightActivity = right.activityAt ? new Date(right.activityAt).getTime() : 0;
      if (rightActivity !== leftActivity) return rightActivity - leftActivity;
      if (typeOrder[left.type] !== typeOrder[right.type]) return typeOrder[left.type] - typeOrder[right.type];
      const labelComparison = left.label.localeCompare(right.label, 'de-DE', { sensitivity: 'base' });
      return labelComparison || left.id.localeCompare(right.id);
    })
    .slice(0, request.limit ?? 30);
}
