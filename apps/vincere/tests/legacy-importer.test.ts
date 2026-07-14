import { describe, expect, it } from 'vitest';
import { createLegacyImportPackage, importPackageJson } from '../src/features/migration/importer';
import { buildMigrationReport } from '../src/features/migration/report';

function packageFrom(value: unknown) {
  return createLegacyImportPackage(JSON.stringify(value));
}

describe('controlled legacy importer', () => {
  it('detects direct, wrapped and key/value LocalStorage exports', () => {
    const direct = packageFrom({ kk_crm_contacts: [{ id: 'c1', name: 'Demo Direkt' }] });
    const wrapped = packageFrom({ localStorage: { kk_crm_contacts: JSON.stringify([{ id: 'c1', name: 'Demo Direkt' }]) } });
    const keyValue = packageFrom([{ key: 'kk_crm_contacts', value: [{ id: 'c1', name: 'Demo Direkt' }] }]);

    expect(direct.sources[0].key).toBe('kk_crm_contacts');
    expect(wrapped.sources[0].shape).toBe('array');
    expect(keyValue.package.records.contacts).toHaveLength(1);
  });

  it('normalizes equivalent legacy fields and resolves ID-based relationships', () => {
    const result = packageFrom({
      kk_crm_contacts: [{ uid: 'contact-alpha', fullName: 'Demo Eigentümer', telefon: '+49 000 111111', mail: 'owner@demo.invalid', ort: 'Demo-Ort', kontaktart: 'Eigentümer', status: 'Termin', created: '2026-01-02' }],
      kk_followups: [{ id: 'fu-1', kontaktId: 'contact-alpha', text: 'Rückruf', datum: '2026-02-03', prioritaet: 'hoch', completed: true, type: 'Telefon' }],
      kk_crm_objects: [{ id: 'object-1', bezeichnung: 'Demo-Haus', strasse: 'Musterweg', hausnummer: '1', ort: 'Demo-Ort', objektart: 'Haus', ownerId: 'contact-alpha', marketValue: '450000', status: 'Vermarktung' }],
    });

    const contact = result.package.records.contacts[0];
    expect(contact.firstName).toBe('Demo');
    expect(contact.lastName).toBe('Eigentümer');
    expect(contact.role).toBe('Eigentümer');
    expect(contact.stage).toBe('appointment');
    expect(result.package.records.followUps[0]).toMatchObject({ contactId: contact.id, status: 'done', priority: 'high', channel: 'phone' });
    expect(result.package.records.properties[0]).toMatchObject({ ownerContactId: contact.id, estimatedValue: 450000, status: 'Vermarktung' });
  });

  it('prioritizes canonical records and auto-merges only certain duplicates', () => {
    const result = packageFrom({
      kk_crm_contacts: [{ id: 'canonical-owner', name: 'Demo Eigentümer', phone: '+49 000 222222', email: 'same@demo.invalid', city: 'Kanonischer Ort', notes: 'kanonisch' }],
      kk_eigentuemer: [{ id: 'legacy-owner', name: 'Demo Eigentümer', telefon: '+49 000 222222', mail: 'same@demo.invalid', city: 'Legacy-Ort', notes: 'legacy' }],
      kk_crmpro_leads: [
        { id: 'probable-a', name: 'Demo A', email: 'probable@demo.invalid', phone: '+49 000 300001' },
        { id: 'probable-b', name: 'Demo B', email: 'probable@demo.invalid', phone: '+49 000 300002' },
        { id: 'manual-a', name: 'Namensgleich' },
        { id: 'manual-b', name: 'Namensgleich' },
      ],
    });

    expect(result.package.records.contacts.filter((contact) => contact.email === 'same@demo.invalid')).toHaveLength(1);
    expect(result.package.records.contacts.find((contact) => contact.email === 'same@demo.invalid')?.city).toBe('Kanonischer Ort');
    expect(result.package.migration.duplicates.some((item) => item.category === 'certain' && item.autoMergedInto)).toBe(true);
    expect(result.package.migration.duplicates.some((item) => item.category === 'probable')).toBe(true);
    expect(result.package.migration.duplicates.some((item) => item.category === 'manual')).toBe(true);
  });

  it('does not guess ambiguous name-based relationships', () => {
    const result = packageFrom({
      kk_crm_contacts: [
        { id: 'person-a', name: 'Gleicher Demo Name', phone: '+49 000 400001' },
        { id: 'person-b', name: 'Gleicher Demo Name', phone: '+49 000 400002' },
      ],
      kk_crm_followups: [{ id: 'fu-ambiguous', contactName: 'Gleicher Demo Name', title: 'Nicht raten', dueAt: '2027-01-01' }],
    });

    expect(result.package.records.followUps).toHaveLength(0);
    expect(result.package.migration.unresolvedRelationships).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationship: 'contact', candidateContactIds: expect.arrayContaining([expect.any(String), expect.any(String)]) }),
    ]));
  });

  it('keeps parallel pipeline, valuation, activity and market structures as extensions', () => {
    const result = packageFrom({
      kk_crm_contacts: [{ id: 'contact-1', name: 'Demo Kontakt', phone: '+49 000 500000' }],
      kk_crm_activities: [{ id: 'activity-1', contactId: 'contact-1', type: 'Telefonat', title: 'Gespräch', outcome: 'Termin', createdAt: '2026-03-01T10:00:00Z' }],
      kk_pipeline_deals: [{ id: 'deal-1', contactId: 'contact-1', title: 'Chance', phase: 'Mandat', value: 123000 }],
      kk_valuation_pipeline: [{ id: 'valuation-1', contactId: 'contact-1', title: 'Bewertung', appointmentAt: '2026-04-01T10:00:00Z', estimatedValue: 345000 }],
      kk_market_observations_v1: [{ id: 'market-1', title: 'Marktobjekt', address: 'Beispielweg 2', city: 'Demo-Ort', price: 555000 }],
    });

    expect(result.package.extensions.activities).toHaveLength(1);
    expect(result.package.records.callEvents).toHaveLength(1);
    expect(result.package.extensions.pipelineEntries).toHaveLength(1);
    expect(result.package.extensions.valuationOpportunities).toHaveLength(1);
    expect(result.package.records.appointments).toHaveLength(1);
    expect(result.package.extensions.marketObservations).toHaveLength(1);
    expect(result.package.records.properties).toHaveLength(0);
  });

  it('reports missing required fields without damaging the result package', () => {
    const result = packageFrom({
      kk_crm_contacts: [{ id: 'contact-1', name: 'Demo Kontakt' }],
      kk_fu_items: [{ id: 'fu-missing-date', contactId: 'contact-1', text: 'Datum fehlt' }],
    });

    expect(result.package.records.followUps).toHaveLength(0);
    expect(result.package.migration.issues).toContainEqual(expect.objectContaining({ severity: 'error', code: 'followup-missing-date' }));
    expect(result.package.migration.cloudWriteAllowed).toBe(false);
  });

  it('generates stable IDs, fingerprints, packages and reports repeatedly', () => {
    const first = createLegacyImportPackage('{"kk_crm_contacts":[{"phone":"+49 000 600000","name":"Deterministisch","id":"stable"}],"kk_followups":[]}');
    const second = createLegacyImportPackage('{"kk_followups":[],"kk_crm_contacts":[{"id":"stable","name":"Deterministisch","phone":"+49 000 600000"}]}');

    expect(first.package).toEqual(second.package);
    expect(importPackageJson(first.package)).toBe(importPackageJson(second.package));
    expect(buildMigrationReport('demo.json', first.sources, first.package)).toBe(buildMigrationReport('demo.json', second.sources, second.package));
    expect(first.package.records.contacts[0].id).toMatch(/^legacy_contact_/);
  });

  it('handles large exported collections in one deterministic pass', () => {
    const contacts = Array.from({ length: 5000 }, (_, index) => ({ id: `bulk-${index}`, name: `Demo Kontakt ${index}`, phone: `+49 000 ${String(index).padStart(6, '0')}` }));
    const result = packageFrom({ kk_crm_contacts: contacts });

    expect(result.package.records.contacts).toHaveLength(5000);
    expect(result.sources[0].count).toBe(5000);
    expect(new Set(result.package.records.contacts.map((contact) => contact.id)).size).toBe(5000);
  });
});
