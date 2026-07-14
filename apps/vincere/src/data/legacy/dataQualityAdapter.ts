import type { DataQualityInput } from '../../domain/data-quality/types';
import type { VincereImportPackage } from '../../features/migration/types';

export function dataQualityInputFromLegacyPackage(importPackage: VincereImportPackage): DataQualityInput {
  return {
    contacts: importPackage.records.contacts,
    followUps: importPackage.records.followUps,
    properties: importPackage.records.properties,
    appointments: importPackage.records.appointments,
    callEvents: importPackage.records.callEvents,
    auditEvents: importPackage.records.auditEvents,
  };
}
