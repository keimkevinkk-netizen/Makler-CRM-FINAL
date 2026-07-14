import { describe, expect, it } from 'vitest';
import { buildConversationDebrief, buildConversationPreparation } from '../src/features/ai/salesCoachEngine';
import type { Contact } from '../src/types/domain';

const base = { phone: '000', source: 'anonymes Szenario', priority: 'medium' as const, potential: 60, createdAt: '2026-07-01T00:00:00.000Z' };
const scenarios: Array<{ contact: Contact; modeId: Parameters<typeof buildConversationPreparation>[0]['modeId'] }> = [
  { contact: { ...base, id: 'owner', firstName: 'Person', lastName: 'A', city: 'Ort A', role: 'Eigentümer', stage: 'lead', notes: 'Möchte zunächst privat verkaufen.' }, modeId: 'owner_first_contact' },
  { contact: { ...base, id: 'buyer', firstName: 'Person', lastName: 'B', city: 'Ort B', role: 'Käufer', stage: 'qualified', notes: 'Suchgebiet dokumentiert, Finanzierung noch offen.' }, modeId: 'buyer_qualification' },
  { contact: { ...base, id: 'network', firstName: 'Person', lastName: 'C', city: 'Ort C', role: 'Netzwerk', stage: 'lead' }, modeId: 'reactivation' },
];

describe('anonyme Coach-Evaluationssuite', () => {
  it.each(scenarios)('liefert strukturierte, verständliche Vorbereitung für $modeId', ({ contact, modeId }) => {
    const result = buildConversationPreparation({ contact, modeId, followUps: [], callEvents: [] });
    expect(result.contactSummary).toContain(contact.lastName);
    expect(result.openQuestions.length).toBeGreaterThanOrEqual(3);
    expect(result.minimumGoal).toBeTruthy();
    expect(result.idealGoal).toBeTruthy();
    expect(result.opening).not.toMatch(/garantier|Höchstpreis|exklusiv nur heute/i);
  });

  it('stuft ein Gespräch ohne Motivation und nächsten Schritt als hohes Risiko ein', () => {
    const result = buildConversationDebrief({ outcome: 'conversation' });
    expect(result.salesRisk).toBe('high');
    expect(result.nextStep).toBe('Unbekannt');
    expect(result.followUpSuggestion).toContain('konkreten Anlass');
  });
});
