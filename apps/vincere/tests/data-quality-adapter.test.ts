import { describe, expect, it } from 'vitest';
import { dataQualityInputFromLegacyPackage } from '../src/data/legacy/dataQualityAdapter';
import type { VincereImportPackage } from '../src/features/migration/types';

describe('legacy data quality adapter', () => {
  it('exposes normalized import records without mutating or activating them', () => {
    const importPackage = {
      records: { contacts: [], followUps: [], properties: [], appointments: [], callEvents: [], auditEvents: [] },
    } as unknown as VincereImportPackage;
    const result = dataQualityInputFromLegacyPackage(importPackage);

    expect(result.contacts).toBe(importPackage.records.contacts);
    expect(result.followUps).toBe(importPackage.records.followUps);
  });
});
