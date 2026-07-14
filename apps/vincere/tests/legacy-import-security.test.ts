import { describe, expect, it } from 'vitest';
import { createLegacyImportPackage } from '../src/features/migration/importer';
import { LegacyImportSecurityError, parseSafeJson } from '../src/features/migration/security';

describe('legacy import security', () => {
  it('rejects invalid JSON', () => {
    expect(() => createLegacyImportPackage('{invalid')).toThrow('kein gültiges JSON');
  });

  it('rejects unsupported roots and exports without recognized storage keys', () => {
    expect(() => createLegacyImportPackage('[]')).toThrow('Objekt mit exportierten LocalStorage-Schlüsseln');
    expect(() => createLegacyImportPackage('{"other":[]}')).toThrow('Keine unterstützten MaklerCRM-Datenquellen');
  });

  it('blocks prototype pollution keys before normalization', () => {
    expect(() => createLegacyImportPackage('{"kk_crm_contacts":[{"id":"x","__proto__":{"polluted":true}}]}')).toThrow(LegacyImportSecurityError);
    expect(() => createLegacyImportPackage('{"kk_crm_contacts":[{"id":"x","constructor":{"prototype":{"polluted":true}}}]}')).toThrow(LegacyImportSecurityError);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('limits dangerous nesting and oversized payloads', () => {
    const nested = `${'{"a":'.repeat(90)}0${'}'.repeat(90)}`;
    expect(() => parseSafeJson(nested)).toThrow('zu tief verschachtelt');
    expect(() => parseSafeJson('x'.repeat(25 * 1024 * 1024 + 1))).toThrow('Limit von 25 MB');
  });

  it('marks mixed primitive/object source arrays invalid instead of executing values', () => {
    const result = createLegacyImportPackage('{"kk_crm_contacts":[{"id":"safe","name":"Demo"},"not-an-object"]}');
    expect(result.sources[0].shape).toBe('invalid');
    expect(result.package.records.contacts).toHaveLength(0);
    expect(result.package.migration.issues).toContainEqual(expect.objectContaining({ code: 'invalid-source-shape', severity: 'error' }));
  });
});
