import type { Contact } from '../../types/domain';
import { normalizeEmail, normalizePhone, parseDateMs, stableId } from './normalization';
import type { ContactMergePreview, DataQualityConfidence, DataQualityInput, DuplicateAssessment, MergeFieldComparison, MergeRelationshipTransfer } from './types';

const CONTACT_FIELDS: Array<keyof Contact> = [
  'firstName',
  'lastName',
  'phone',
  'email',
  'city',
  'source',
  'role',
  'stage',
  'priority',
  'potential',
  'lastContactAt',
  'nextActionAt',
  'notes',
  'createdAt',
];

function meaningful(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function sameValue(field: keyof Contact, left: unknown, right: unknown): boolean {
  if (field === 'phone') return normalizePhone(left) === normalizePhone(right);
  if (field === 'email') return normalizeEmail(left) === normalizeEmail(right);
  return left === right;
}

function chooseValue(field: keyof Contact, primary: Contact, duplicate: Contact): { value: unknown; rationale: string } {
  const left = primary[field];
  const right = duplicate[field];
  if (!meaningful(left) && meaningful(right)) return { value: right, rationale: 'Der Hauptkontakt besitzt keinen Wert; der vorhandene Dublettenwert würde übernommen.' };
  if (meaningful(left) && !meaningful(right)) return { value: left, rationale: 'Der Hauptkontaktwert bleibt erhalten.' };
  if (!meaningful(left) && !meaningful(right)) return { value: left, rationale: 'Beide Werte sind leer.' };
  if (sameValue(field, left, right)) return { value: left, rationale: 'Die Werte sind fachlich gleichwertig.' };
  if (field === 'potential') return { value: Math.max(Number(left) || 0, Number(right) || 0), rationale: 'In der Vorschau bleibt das höhere dokumentierte Potenzial erhalten.' };
  if (field === 'lastContactAt') {
    const leftTime = parseDateMs(left) ?? 0;
    const rightTime = parseDateMs(right) ?? 0;
    return { value: rightTime > leftTime ? right : left, rationale: 'Der jüngste belastbare Kontaktzeitpunkt wird vorgeschlagen.' };
  }
  if (field === 'nextActionAt') {
    const leftTime = parseDateMs(left) ?? Number.POSITIVE_INFINITY;
    const rightTime = parseDateMs(right) ?? Number.POSITIVE_INFINITY;
    return { value: rightTime < leftTime ? right : left, rationale: 'Die frühere offene nächste Aktion wird vorgeschlagen.' };
  }
  if (field === 'createdAt') {
    const leftTime = parseDateMs(left) ?? Number.POSITIVE_INFINITY;
    const rightTime = parseDateMs(right) ?? Number.POSITIVE_INFINITY;
    return { value: rightTime < leftTime ? right : left, rationale: 'Der früheste belegte Erstellzeitpunkt wird vorgeschlagen.' };
  }
  return { value: left, rationale: 'Konflikt: Ohne manuelle Entscheidung bleibt der Hauptkontaktwert bestehen.' };
}

function confidenceFor(category: DuplicateAssessment['category']): DataQualityConfidence {
  if (category === 'certain') return 'certain';
  if (category === 'very_likely') return 'high';
  if (category === 'possible') return 'medium';
  return 'low';
}

function relationshipTransfers(input: DataQualityInput, duplicateId: string, primaryId: string): MergeRelationshipTransfer[] {
  const transfers: MergeRelationshipTransfer[] = [];
  for (const followUp of input.followUps) {
    if (followUp.contactId === duplicateId) transfers.push({ entityType: 'followup', entityId: followUp.id, relationshipField: 'contactId', fromContactId: duplicateId, toContactId: primaryId });
  }
  for (const appointment of input.appointments) {
    if (appointment.contactId === duplicateId) transfers.push({ entityType: 'appointment', entityId: appointment.id, relationshipField: 'contactId', fromContactId: duplicateId, toContactId: primaryId });
  }
  for (const call of input.callEvents) {
    if (call.contactId === duplicateId) transfers.push({ entityType: 'call', entityId: call.id, relationshipField: 'contactId', fromContactId: duplicateId, toContactId: primaryId });
  }
  for (const property of input.properties) {
    if (property.ownerContactId === duplicateId) transfers.push({ entityType: 'property', entityId: property.id, relationshipField: 'ownerContactId', fromContactId: duplicateId, toContactId: primaryId });
  }
  return transfers.sort((left, right) => left.entityType.localeCompare(right.entityType) || left.entityId.localeCompare(right.entityId));
}

export function buildContactMergePreview(input: DataQualityInput, assessment: DuplicateAssessment): ContactMergePreview | undefined {
  const primary = input.contacts[assessment.primaryRecordIndex];
  const duplicate = input.contacts[assessment.candidateRecordIndex];
  if (!primary || !duplicate) return undefined;

  const fields: MergeFieldComparison[] = CONTACT_FIELDS.map((field) => {
    const primaryValue = primary[field];
    const duplicateValue = duplicate[field];
    const proposal = chooseValue(field, primary, duplicate);
    return {
      field,
      primaryValue,
      duplicateValue,
      proposedValue: proposal.value,
      conflict: meaningful(primaryValue) && meaningful(duplicateValue) && !sameValue(field, primaryValue, duplicateValue),
      rationale: proposal.rationale,
    };
  });
  const conflicts = fields.filter((field) => field.conflict);
  const lostInformation = conflicts
    .filter((field) => field.proposedValue !== field.duplicateValue)
    .map((field) => `${String(field.field)}: Der abweichende Dublettenwert würde ohne manuelle Übernahme nicht in den Hauptwert einfließen.`);
  const manualDecisions = conflicts
    .filter((field) => !['potential', 'lastContactAt', 'nextActionAt', 'createdAt'].includes(String(field.field)))
    .map((field) => `Feld „${String(field.field)}“ manuell prüfen.`);

  return {
    id: stableId('merge_preview', assessment.id),
    assessmentId: assessment.id,
    primaryContactId: primary.id,
    duplicateContactId: duplicate.id,
    category: assessment.category,
    confidence: confidenceFor(assessment.category),
    fields,
    conflicts,
    relationshipTransfers: relationshipTransfers(input, duplicate.id, primary.id),
    lostInformation,
    manualDecisions,
    mutatesData: false,
  };
}
