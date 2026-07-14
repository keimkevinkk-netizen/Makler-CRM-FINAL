import { describe, expect, it } from 'vitest';
import {
  matchContactIdentity,
  normalizeEmailAddress,
  normalizePhoneNumber,
  type MatchableContact,
} from '../src/services/communications/contactMatching';

const contacts: MatchableContact[] = [
  {
    id: 'contact-001',
    email: 'Owner.One@Example.Invalid ',
    phone: '0160 0000001',
    externalProviderIds: { mock: 'external-001' },
  },
  { id: 'contact-002', email: 'contact.two@example.invalid', phone: '+49 160 0000002' },
];

describe('communication contact matching', () => {
  it('normalizes email addresses and German phone numbers deterministically', () => {
    expect(normalizeEmailAddress('  Owner.One@Example.Invalid ')).toBe('owner.one@example.invalid');
    expect(normalizePhoneNumber('0160 / 0000001')).toBe('+491600000001');
    expect(normalizePhoneNumber('0049 160 0000001')).toBe('+491600000001');
  });

  it('assigns an existing contact id unambiguously', () => {
    const result = matchContactIdentity({ contactId: 'contact-002' }, contacts);

    expect(result.category).toBe('definite');
    expect(result.matchedContactId).toBe('contact-002');
    expect(result.autoAssignable).toBe(true);
  });

  it('requires two matching normalized signals for automatic identifier assignment', () => {
    const definite = matchContactIdentity({
      email: 'owner.one@example.invalid',
      phone: '+49 160 0000001',
    }, contacts);
    const probable = matchContactIdentity({ email: 'contact.two@example.invalid' }, contacts);

    expect(definite.category).toBe('definite');
    expect(definite.matchedContactId).toBe('contact-001');
    expect(definite.autoAssignable).toBe(true);
    expect(probable.category).toBe('probable');
    expect(probable.suggestedContactId).toBe('contact-002');
    expect(probable.autoAssignable).toBe(false);
  });

  it('matches an external provider id only within its provider namespace', () => {
    const result = matchContactIdentity({ externalProviderId: 'external-001' }, contacts, { providerKey: 'mock' });

    expect(result.category).toBe('definite');
    expect(result.matchedContactId).toBe('contact-001');
  });

  it('requires manual review for duplicate or conflicting identifiers', () => {
    const duplicates: MatchableContact[] = [
      ...contacts,
      { id: 'contact-003', email: 'owner.one@example.invalid', phone: '+49 160 0000003' },
    ];
    const duplicateResult = matchContactIdentity({ email: 'owner.one@example.invalid' }, duplicates);
    const conflictResult = matchContactIdentity({
      email: 'owner.one@example.invalid',
      phone: '+49 160 0000002',
    }, contacts);

    expect(duplicateResult.category).toBe('manual_review');
    expect(duplicateResult.autoAssignable).toBe(false);
    expect(conflictResult.category).toBe('manual_review');
    expect(conflictResult.candidateContactIds).toEqual(['contact-001', 'contact-002']);
  });

  it('does not guess or merge an unknown contact', () => {
    const result = matchContactIdentity({ email: 'unknown@example.invalid', phone: '+49 160 9999999' }, contacts);

    expect(result.category).toBe('unknown');
    expect(result.candidateContactIds).toEqual([]);
    expect(result.autoAssignable).toBe(false);
    expect(result.matchedContactId).toBeUndefined();
  });
});
