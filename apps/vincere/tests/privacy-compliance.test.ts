import { describe, expect, it } from 'vitest';
import {
  buildPrivacyAuditTrail,
  buildPrivacyComplianceReport,
  prepareSubjectRequestPreview,
} from '../src/domain/privacy/privacyRules';
import type { ContactPrivacyMetadata } from '../src/domain/privacy/privacyTypes';
import type { AppState, Contact, UserRole } from '../src/types/domain';

const AS_OF = '2026-07-14T08:00:00.000Z';

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'contact-1',
    firstName: 'Test',
    lastName: 'Kontakt',
    phone: '+49 000 000000',
    email: 'test@example.invalid',
    city: 'Musterstadt',
    source: 'Synthetischer Testdatensatz',
    role: 'Eigentümer',
    stage: 'lead',
    priority: 'medium',
    potential: 50,
    lastContactAt: '2026-07-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
    ...overrides,
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    schemaVersion: 2,
    workspace: { id: 'workspace-a', name: 'Test Workspace', region: 'Testregion', createdAt: '2026-01-01T08:00:00.000Z' },
    currentUser: { id: 'owner-1', workspaceId: 'workspace-a', name: 'Test Owner', email: 'owner@example.invalid', role: 'owner' },
    contacts: [contact()],
    followUps: [],
    properties: [],
    appointments: [],
    callEvents: [],
    auditEvents: [],
    ...overrides,
  };
}

function metadata(overrides: Partial<ContactPrivacyMetadata> = {}): ContactPrivacyMetadata {
  return {
    workspaceId: 'workspace-a',
    contactId: 'contact-1',
    purposes: [{ purpose: 'customer_care', recordedAt: '2026-07-01T08:00:00.000Z', source: 'Synthetischer Test' }],
    dataOrigin: 'Synthetischer Test',
    ...overrides,
  };
}

describe('VINCERE privacy and compliance rules', () => {
  it('treats missing consent data as unknown without implying permission', () => {
    const report = buildPrivacyComplianceReport(state(), [metadata()], AS_OF);
    const assessment = report.contacts[0];

    expect(assessment.consents.every((consent) => consent.decision === 'unknown')).toBe(true);
    expect(assessment.findings.filter((finding) => finding.code === 'consent_unknown')).toHaveLength(4);
  });

  it('surfaces withdrawn consent as a high-priority technical signal', () => {
    const report = buildPrivacyComplianceReport(state(), [metadata({
      consents: {
        marketing: { decision: 'withdrawn', recordedAt: '2026-07-10T08:00:00.000Z', source: 'Synthetischer Widerruf' },
      },
    })], AS_OF);

    expect(report.contacts[0].findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'consent_withdrawn', severity: 'high' }),
    ]));
  });

  it('detects long inactivity and marks a deletion review candidate without deleting', () => {
    const oldContact = contact({
      createdAt: '2020-01-01T08:00:00.000Z',
      lastContactAt: '2023-01-01T08:00:00.000Z',
    });
    const report = buildPrivacyComplianceReport(state({ contacts: [oldContact] }), [], AS_OF);

    expect(report.contacts[0].inactiveDays).toBeGreaterThanOrEqual(730);
    expect(report.contacts[0].deletionReviewRequired).toBe(true);
    expect(report.findings.some((finding) => finding.code === 'deletion_review_required')).toBe(true);
  });

  it('detects a missing data source', () => {
    const report = buildPrivacyComplianceReport(state({ contacts: [contact({ source: '' })] }), [], AS_OF);
    expect(report.findings.some((finding) => finding.code === 'data_origin_missing')).toBe(true);
  });

  it('prepares an export preview without producing an export payload', () => {
    const inputState = state({
      followUps: [{ id: 'followup-1', contactId: 'contact-1', title: 'Test', dueAt: '2026-07-20T08:00:00.000Z', priority: 'high', status: 'open', channel: 'phone' }],
      callEvents: [{ id: 'call-1', contactId: 'contact-1', outcome: 'conversation', note: 'Synthetische Notiz', createdAt: '2026-07-01T08:00:00.000Z' }],
    });
    const preview = prepareSubjectRequestPreview(inputState, [metadata()], {
      workspaceId: 'workspace-a',
      contactId: 'contact-1',
      requestType: 'export',
      requestedAt: AS_OF,
      actorId: 'owner-1',
      actorRole: 'owner',
    }, AS_OF);

    expect(preview.canPrepare).toBe(true);
    expect(preview.payloadProduced).toBe(false);
    expect(preview.recordGroups.find((group) => group.category === 'follow_ups')?.recordCount).toBe(1);
    expect(preview.recordGroups.find((group) => group.category === 'call_events')?.recordCount).toBe(1);
  });

  it('prepares an erasure preview with blockers and never executes deletion', () => {
    const inputState = state({
      properties: [{ id: 'property-1', title: 'Testobjekt', address: 'Teststraße 1', city: 'Musterstadt', type: 'Haus', status: 'Vermarktung', estimatedValue: 1, ownerContactId: 'contact-1' }],
    });
    const preview = prepareSubjectRequestPreview(inputState, [metadata()], {
      workspaceId: 'workspace-a',
      contactId: 'contact-1',
      requestType: 'erasure',
      requestedAt: AS_OF,
      actorId: 'owner-1',
      actorRole: 'owner',
    }, AS_OF);

    expect(preview.deletionExecuted).toBe(false);
    expect(preview.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining('Aktive Objektbeziehungen'),
    ]));
  });

  it('rejects every workspace-crossing evaluation', () => {
    expect(() => buildPrivacyComplianceReport(state(), [], AS_OF, 'workspace-b')).toThrow('Workspace-Isolation');
    expect(() => buildPrivacyComplianceReport(state(), [{ ...metadata(), workspaceId: 'workspace-b' }], AS_OF)).toThrow('Workspace-Isolation');
  });

  it('keeps viewers read-only for subject request workflows', () => {
    const viewerState = state({
      currentUser: { id: 'viewer-1', workspaceId: 'workspace-a', name: 'Test Viewer', email: 'viewer@example.invalid', role: 'viewer' },
    });
    const preview = prepareSubjectRequestPreview(viewerState, [metadata()], {
      workspaceId: 'workspace-a',
      contactId: 'contact-1',
      requestType: 'access',
      requestedAt: AS_OF,
      actorId: 'viewer-1',
      actorRole: 'viewer',
    }, AS_OF);

    expect(preview.canPrepare).toBe(false);
    expect(preview.permissionReason).toContain('Lesezugriff');
  });

  it('shows audit data with a role only when technically supported', () => {
    const inputState = state({
      auditEvents: [
        { id: 'audit-1', actorId: 'owner-1', workspaceId: 'workspace-a', entity: 'contact', entityId: 'contact-1', action: 'updated', summary: 'Synthetische Änderung', createdAt: '2026-07-10T08:00:00.000Z' },
        { id: 'audit-2', actorId: 'former-user', workspaceId: 'workspace-a', entity: 'contact', entityId: 'contact-1', action: 'viewed', summary: 'Synthetischer Zugriff', createdAt: '2026-07-09T08:00:00.000Z' },
      ],
    });
    const roles: Record<string, UserRole> = { 'former-user': 'agent' };
    const trail = buildPrivacyAuditTrail(inputState, 'workspace-a', roles);

    expect(trail[0]).toMatchObject({ actorId: 'owner-1', actorRole: 'owner' });
    expect(trail[1]).toMatchObject({ actorId: 'former-user', actorRole: 'agent' });
  });

  it('returns byte-for-byte deterministic rule output for the same inputs', () => {
    const inputState = state({
      contacts: [contact({ id: 'contact-b' }), contact({ id: 'contact-a', email: undefined })],
    });
    const first = buildPrivacyComplianceReport(inputState, [], AS_OF);
    const second = buildPrivacyComplianceReport(inputState, [], AS_OF);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.contacts.map((item) => item.contactId)).toEqual(['contact-a', 'contact-b']);
  });
});
