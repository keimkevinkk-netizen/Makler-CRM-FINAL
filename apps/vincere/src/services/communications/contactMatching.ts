import type { ContactIdentityHints } from '../../integrations/communications/contracts';

export type ContactMatchCategory = 'definite' | 'probable' | 'manual_review' | 'unknown';

export interface MatchableContact {
  id: string;
  email?: string;
  phone?: string;
  externalProviderIds?: Record<string, string>;
}

export interface ContactMatchResult {
  category: ContactMatchCategory;
  matchedContactId?: string;
  suggestedContactId?: string;
  candidateContactIds: string[];
  autoAssignable: boolean;
  reasons: string[];
  normalized: {
    email: string | null;
    phone: string | null;
  };
}

export interface ContactMatchContext {
  providerKey?: string;
  defaultCountryCallingCode?: string;
}

export const normalizeEmailAddress = (value?: string): string | null => {
  const normalized = value?.trim().normalize('NFKC').toLowerCase() ?? '';
  if (!normalized || normalized.length > 320) return null;
  const at = normalized.indexOf('@');
  if (at <= 0 || at !== normalized.lastIndexOf('@') || at === normalized.length - 1) return null;
  return normalized;
};

export const normalizePhoneNumber = (value?: string, defaultCountryCallingCode = '49'): string | null => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  const startsInternational = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;

  if (startsInternational) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+${defaultCountryCallingCode}${digits.slice(1)}`;
  return `+${defaultCountryCallingCode}${digits}`;
};

const uniqueIds = (values: string[]) => [...new Set(values)].sort();

export function matchContactIdentity(
  hints: ContactIdentityHints,
  contacts: MatchableContact[],
  context: ContactMatchContext = {},
): ContactMatchResult {
  const normalizedEmail = normalizeEmailAddress(hints.email);
  const normalizedPhone = normalizePhoneNumber(hints.phone, context.defaultCountryCallingCode);
  const reasons: string[] = [];

  const directMatches = hints.contactId ? contacts.filter((contact) => contact.id === hints.contactId) : [];
  const externalMatches = hints.externalProviderId && context.providerKey
    ? contacts.filter((contact) => contact.externalProviderIds?.[context.providerKey ?? ''] === hints.externalProviderId)
    : [];
  const emailMatches = normalizedEmail
    ? contacts.filter((contact) => normalizeEmailAddress(contact.email) === normalizedEmail)
    : [];
  const phoneMatches = normalizedPhone
    ? contacts.filter((contact) => normalizePhoneNumber(contact.phone, context.defaultCountryCallingCode) === normalizedPhone)
    : [];

  if (directMatches.length === 1) {
    return {
      category: 'definite',
      matchedContactId: directMatches[0].id,
      candidateContactIds: [directMatches[0].id],
      autoAssignable: true,
      reasons: ['Vorhandene Kontakt-ID stimmt eindeutig überein.'],
      normalized: { email: normalizedEmail, phone: normalizedPhone },
    };
  }

  if (hints.contactId && directMatches.length === 0) reasons.push('Die übermittelte Kontakt-ID existiert lokal nicht.');

  if (externalMatches.length === 1 && !hints.contactId) {
    return {
      category: 'definite',
      matchedContactId: externalMatches[0].id,
      candidateContactIds: [externalMatches[0].id],
      autoAssignable: true,
      reasons: ['Externe Provider-ID stimmt innerhalb des Providers eindeutig überein.'],
      normalized: { email: normalizedEmail, phone: normalizedPhone },
    };
  }

  const emailIds = uniqueIds(emailMatches.map((contact) => contact.id));
  const phoneIds = uniqueIds(phoneMatches.map((contact) => contact.id));
  const externalIds = uniqueIds(externalMatches.map((contact) => contact.id));
  const candidateContactIds = uniqueIds([...emailIds, ...phoneIds, ...externalIds]);

  const emailUnique = emailIds.length === 1 ? emailIds[0] : null;
  const phoneUnique = phoneIds.length === 1 ? phoneIds[0] : null;

  if (!hints.contactId && emailUnique && phoneUnique && emailUnique === phoneUnique) {
    return {
      category: 'definite',
      matchedContactId: emailUnique,
      candidateContactIds: [emailUnique],
      autoAssignable: true,
      reasons: ['Normalisierte E-Mail-Adresse und Telefonnummer verweisen auf denselben Kontakt.'],
      normalized: { email: normalizedEmail, phone: normalizedPhone },
    };
  }

  const hasDuplicateIdentifier = emailIds.length > 1 || phoneIds.length > 1 || externalIds.length > 1;
  const hasConflictingSignals = Boolean(emailUnique && phoneUnique && emailUnique !== phoneUnique);
  const hasStaleDirectReference = Boolean(hints.contactId && directMatches.length === 0 && candidateContactIds.length > 0);

  if (hasDuplicateIdentifier || hasConflictingSignals || hasStaleDirectReference) {
    if (emailIds.length > 1) reasons.push('Die normalisierte E-Mail-Adresse ist mehreren Kontakten zugeordnet.');
    if (phoneIds.length > 1) reasons.push('Die normalisierte Telefonnummer ist mehreren Kontakten zugeordnet.');
    if (externalIds.length > 1) reasons.push('Die externe Provider-ID ist nicht eindeutig.');
    if (hasConflictingSignals) reasons.push('E-Mail-Adresse und Telefonnummer verweisen auf unterschiedliche Kontakte.');
    return {
      category: 'manual_review',
      candidateContactIds,
      autoAssignable: false,
      reasons,
      normalized: { email: normalizedEmail, phone: normalizedPhone },
    };
  }

  const singleSignalId = emailUnique ?? phoneUnique ?? (externalIds.length === 1 ? externalIds[0] : null);
  if (singleSignalId) {
    reasons.push(emailUnique
      ? 'Eine normalisierte E-Mail-Adresse stimmt eindeutig überein; ein zweites Bestätigungssignal fehlt.'
      : phoneUnique
        ? 'Eine normalisierte Telefonnummer stimmt eindeutig überein; ein zweites Bestätigungssignal fehlt.'
        : 'Eine externe Provider-ID stimmt überein; die Zuordnung bleibt bis zur Bestätigung unverbindlich.');
    return {
      category: 'probable',
      suggestedContactId: singleSignalId,
      candidateContactIds: [singleSignalId],
      autoAssignable: false,
      reasons,
      normalized: { email: normalizedEmail, phone: normalizedPhone },
    };
  }

  return {
    category: 'unknown',
    candidateContactIds: [],
    autoAssignable: false,
    reasons: reasons.length ? reasons : ['Keine vorhandene Kontakt-ID oder normalisierte Kennung stimmt überein.'],
    normalized: { email: normalizedEmail, phone: normalizedPhone },
  };
}
