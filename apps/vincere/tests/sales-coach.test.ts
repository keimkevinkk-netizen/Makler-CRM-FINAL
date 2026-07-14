import { describe, expect, it } from 'vitest';
import { buildConversationDebrief, buildConversationPreparation, UNKNOWN_VALUE } from '../src/features/ai/salesCoachEngine';
import { conversationModes, objectionGuides } from '../src/features/ai/salesCoachKnowledge';
import type { Contact } from '../src/types/domain';

const contact: Contact = {
  id: 'contact-1',
  firstName: 'Anna',
  lastName: 'Beispiel',
  phone: '06000 000000',
  city: 'Beispielstadt',
  source: 'Empfehlung',
  role: 'Eigentümer',
  stage: 'lead',
  priority: 'high',
  potential: 82,
  createdAt: '2026-07-01T08:00:00.000Z',
};

describe('Sales-Coach-Domänenlogik', () => {
  it('markiert fehlende Fakten ausdrücklich als unbekannt', () => {
    const preparation = buildConversationPreparation({ contact, followUps: [], callEvents: [], modeId: 'owner_first_contact' });
    expect(preparation.lastContact).toBe(UNKNOWN_VALUE);
    expect(preparation.knownInterests).toEqual([UNKNOWN_VALUE]);
    expect(preparation.unknownFields).toContain('Interessen und individuelle Motive');
    expect(JSON.stringify(preparation)).not.toContain('Musterstraße');
  });

  it('übernimmt dokumentierte Hinweise, ohne zusätzliche Behauptungen zu ergänzen', () => {
    const withNotes = { ...contact, notes: 'Familie möchte zunächst eine neutrale Werteinschätzung.' };
    const preparation = buildConversationPreparation({ contact: withNotes, followUps: [], callEvents: [], modeId: 'valuation_appointment' });
    expect(preparation.knownInterests).toEqual(['Dokumentierter Hinweis: Familie möchte zunächst eine neutrale Werteinschätzung.']);
  });

  it('enthält alle geforderten Gesprächsmodi mit zehn klaren Schritten', () => {
    expect(conversationModes).toHaveLength(8);
    for (const mode of conversationModes) {
      expect(mode.steps.map((step) => step.id)).toEqual([
        'opening', 'needs', 'situation', 'motivation', 'problem', 'consequence', 'solution', 'trust', 'next_step', 'close',
      ]);
      expect(mode.minimumGoal.length).toBeGreaterThan(10);
      expect(mode.idealGoal.length).toBeGreaterThan(10);
    }
  });

  it('liefert für alle Einwände vollständige und nicht manipulative Hilfen', () => {
    expect(objectionGuides).toHaveLength(10);
    const prohibited = /garantier|müssen sofort|unter druck|scheitern sicher|trick/i;
    for (const guide of objectionGuides) {
      expect(guide.type).toBeTruthy();
      expect(guide.possibleMotive).toBeTruthy();
      expect(guide.followUpQuestion).toMatch(/\?$/);
      expect(guide.responseStrategy).toBeTruthy();
      expect(guide.unsuitableReaction).toBeTruthy();
      expect(guide.realisticGoal).toBeTruthy();
      expect(JSON.stringify(guide)).not.toMatch(prohibited);
    }
  });

  it('erzeugt eine klare Nachbereitung ohne unerlaubtes Versprechen', () => {
    const debrief = buildConversationDebrief({
      contact,
      outcome: 'appointment',
      summary: 'Eigentümerin wünscht eine nachvollziehbare Werteinschätzung.',
      motivation: 'Entscheidung innerhalb der Familie vorbereiten.',
      objections: ['Provision/Nutzen noch unklar'],
      nextStep: 'Bewertungstermin am 20. Juli um 17 Uhr bestätigen.',
      missingInformation: ['Grundstücksfläche'],
      followUpDate: '2026-07-20T15:00:00.000Z',
    });
    expect(debrief.appointmentNeeded).toBe(true);
    expect(debrief.salesRisk).toBe('low');
    expect(debrief.recommendedMessage).toContain('nächste Schritt');
    expect(debrief.recommendedMessage).not.toMatch(/garantier|sicherer Verkauf|Höchstpreis/i);
  });
});
