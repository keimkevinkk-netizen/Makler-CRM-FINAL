import { describe, expect, it } from 'vitest';
import { analyseDataQuality, emptyDataQualityInput } from '../src/domain/data-quality/engine';
import { exportDataQualityReport } from '../src/domain/data-quality/report';
import { DataQualitySecurityError } from '../src/domain/data-quality/security';
import type { DataQualityInput } from '../src/domain/data-quality/types';
import type { Contact } from '../src/types/domain';

const NOW = '2026-07-14T10:00:00.000Z';

function contact(id: string, patch: Partial<Contact> = {}): Contact {
  return {
    id,
    firstName: 'Demo',
    lastName: id,
    phone: '+49 170 1234567',
    email: `${id}@example.test`,
    city: 'Hanau',
    source: 'Empfehlung',
    role: 'Eigentümer',
    stage: 'qualified',
    priority: 'medium',
    potential: 150000,
    lastContactAt: '2026-07-01T10:00:00.000Z',
    nextActionAt: '2026-07-20T09:00:00.000Z',
    createdAt: '2026-01-01T10:00:00.000Z',
    ...patch,
  };
}

function input(patch: Partial<DataQualityInput> = {}): DataQualityInput {
  return {
    contacts: [],
    followUps: [],
    properties: [],
    appointments: [],
    callEvents: [],
    auditEvents: [],
    ...patch,
  };
}

describe('VINCERE data quality center', () => {
  it('recognizes identical phone numbers across different formats and explains the factors', () => {
    const result = analyseDataQuality(input({ contacts: [
      contact('a', { firstName: 'Anna', lastName: 'Muster', phone: '0170 / 123 45 67', email: undefined }),
      contact('b', { firstName: 'Anna', lastName: 'Muster', phone: '+49 170 1234567', email: undefined }),
    ] }), { now: NOW });

    const duplicate = result.duplicateAssessments.find((item) => item.category !== 'separate');
    expect(duplicate).toBeDefined();
    expect(duplicate?.factors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'phone', matched: true, contribution: 45 })]));
    expect(['certain', 'very_likely']).toContain(duplicate?.category);
  });

  it('recognizes equal normalized emails', () => {
    const result = analyseDataQuality(input({ contacts: [
      contact('a', { firstName: 'Eva', lastName: 'Beispiel', phone: '', email: ' Eva@Example.Test ' }),
      contact('b', { firstName: 'Eva', lastName: 'Beispiel', phone: '', email: 'eva@example.test' }),
    ] }), { now: NOW });

    expect(result.duplicateAssessments.some((item) => item.factors.some((factor) => factor.code === 'email' && factor.matched))).toBe(true);
    expect(result.suggestions).toContainEqual(expect.objectContaining({ action: 'normalize_email', entityId: 'a', proposedValue: 'eva@example.test' }));
  });

  it('keeps same-name contacts separate when valid phone and email values conflict', () => {
    const result = analyseDataQuality(input({ contacts: [
      contact('a', { firstName: 'Max', lastName: 'Müller', phone: '+49 170 1111111', email: 'max.one@example.test' }),
      contact('b', { firstName: 'Max', lastName: 'Müller', phone: '+49 170 2222222', email: 'max.two@example.test' }),
    ] }), { now: NOW });

    expect(result.duplicateAssessments[0]).toMatchObject({ category: 'separate' });
    expect(result.duplicateAssessments[0].factors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'phone_conflict', matched: true }),
      expect.objectContaining({ code: 'email_conflict', matched: true }),
    ]));
  });

  it('detects orphaned relationships without changing them', () => {
    const data = input({
      contacts: [contact('known')],
      followUps: [{ id: 'fu', contactId: 'missing', title: 'Rückruf', dueAt: '2026-07-15T09:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' }],
      appointments: [{ id: 'appointment', contactId: 'missing', title: 'Termin', subtitle: '', startsAt: '2026-07-15T10:00:00.000Z', status: 'tomorrow' }],
      properties: [{ id: 'property', title: 'Objekt', address: 'Musterweg 1', city: 'Hanau', type: 'Haus', status: 'Akquise', estimatedValue: 400000, ownerContactId: 'missing' }],
      callEvents: [{ id: 'call', contactId: 'missing', outcome: 'conversation', createdAt: '2026-07-14T09:00:00.000Z' }],
    });
    const before = JSON.stringify(data);
    const result = analyseDataQuality(data, { now: NOW });

    expect(result.summary.invalidRelationships).toBe(4);
    expect(result.issues.filter((issue) => issue.code.endsWith('orphan-contact'))).toHaveLength(4);
    expect(result.suggestions.some((suggestion) => suggestion.action === 'remove_invalid_relationship')).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('handles empty datasets deterministically', () => {
    const first = analyseDataQuality(emptyDataQualityInput(), { now: NOW });
    const second = analyseDataQuality(emptyDataQualityInput(), { now: NOW });

    expect(first).toEqual(second);
    expect(first.summary.overallScore).toBe(100);
    expect(first.issues).toHaveLength(0);
  });

  it('handles large datasets in a bounded deterministic pass', () => {
    const contacts = Array.from({ length: 5000 }, (_, index) => contact(`bulk-${index}`, {
      firstName: `Demo ${index}`,
      lastName: 'Kontakt',
      phone: `+49 170 ${String(index).padStart(7, '0')}`,
      email: `bulk-${index}@example.test`,
    }));
    const first = analyseDataQuality(input({ contacts }), { now: NOW, maxDuplicateAssessments: 100 });
    const second = analyseDataQuality(input({ contacts }), { now: NOW, maxDuplicateAssessments: 100 });

    expect(first.summary).toEqual(second.summary);
    expect(first.duplicateAssessments.length).toBeLessThanOrEqual(100);
  });

  it('detects contradictory fields and implausible future activity times', () => {
    const result = analyseDataQuality(input({
      contacts: [contact('owner', { stage: 'qualified' })],
      properties: [{ id: 'sold-property', title: 'Verkauft', address: 'Musterweg 1', city: 'Hanau', type: 'Haus', status: 'Verkauft', estimatedValue: 500000, ownerContactId: 'owner' }],
      callEvents: [{ id: 'future-call', contactId: 'owner', outcome: 'conversation', createdAt: '2026-07-15T10:00:00.000Z' }],
    }), { now: NOW });

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'sold-property-stage-mismatch', severity: 'critical' }),
      expect.objectContaining({ code: 'future-call-event', severity: 'critical' }),
    ]));
  });

  it('creates a complete merge preview with conflicts and relationship transfers', () => {
    const result = analyseDataQuality(input({
      contacts: [
        contact('primary', { firstName: 'Anna', lastName: 'Muster', phone: '+49 170 1234567', email: 'same@example.test', city: 'Hanau', notes: 'Hauptkontakt' }),
        contact('duplicate', { firstName: 'Anna', lastName: 'Muster', phone: '01701234567', email: 'SAME@example.test', city: 'Bruchköbel', notes: 'Zusatzinformation', nextActionAt: undefined }),
      ],
      followUps: [{ id: 'fu', contactId: 'duplicate', title: 'Rückruf', dueAt: '2026-07-16T09:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' }],
      properties: [{ id: 'property', title: 'Objekt', address: 'Musterweg 1', city: 'Hanau', type: 'Haus', status: 'Akquise', estimatedValue: 400000, ownerContactId: 'duplicate' }],
    }), { now: NOW });

    const preview = result.mergePreviews[0];
    expect(preview.mutatesData).toBe(false);
    expect(preview.fields.length).toBeGreaterThan(10);
    expect(preview.conflicts.some((field) => field.field === 'city')).toBe(true);
    expect(preview.relationshipTransfers).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'followup', entityId: 'fu' }),
      expect.objectContaining({ entityType: 'property', entityId: 'property' }),
    ]));
    expect(preview.manualDecisions.length).toBeGreaterThan(0);
  });

  it('never mutates source records while generating suggestions and previews', () => {
    const data = input({ contacts: [contact('a', { phone: '0170 1234567', email: ' A@Example.Test ', nextActionAt: undefined })] });
    const before = structuredClone(data);
    const result = analyseDataQuality(data, { now: NOW });

    expect(data).toEqual(before);
    expect(result.mutatesData).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('blocks prototype-pollution structures', () => {
    const malicious = JSON.parse('{"contacts":[],"followUps":[],"properties":[],"appointments":[],"callEvents":[],"__proto__":{"polluted":true}}') as DataQualityInput;
    expect(() => analyseDataQuality(malicious, { now: NOW })).toThrow(DataQualitySecurityError);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('exports an anonymized quality report without personal contact values', () => {
    const result = analyseDataQuality(input({ contacts: [contact('secret', { firstName: 'Geheim', lastName: 'Person', phone: '0170 1234567', email: 'secret@example.test', city: '' })] }), { now: NOW });
    const report = exportDataQualityReport(result, { anonymize: true });

    expect(report).not.toContain('secret@example.test');
    expect(report).not.toContain('0170 1234567');
    expect(report).not.toContain('"entityId": "secret"');
    expect(report).toContain('"anonymized": true');
  });
});
