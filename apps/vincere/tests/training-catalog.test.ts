import { describe, expect, it } from 'vitest';
import { buildTrainingCatalogState, buildTrainingProgress, learningPaths } from '../src/domain/training/learningPaths';
import { trainingScenarios } from '../src/domain/training/scenarios';

const expectedOrder = [
  'owner_first_contact',
  'private_sale_attempt',
  'commission_objection',
  'existing_agent',
  'nonbinding_valuation',
  'no_current_sale_intent',
  'later_callback',
  'difficult_contact',
  'appointment_booking',
  'closing_question',
  'referral_request',
  'network_partner',
];

describe('VINCERE Trainingskatalog', () => {
  it('enthält alle geforderten Szenarien in stabiler Reihenfolge', () => {
    const state = buildTrainingCatalogState();
    expect(state.isEmpty).toBe(false);
    expect(state.scenarioCount).toBe(12);
    expect(state.orderedScenarioIds).toEqual(expectedOrder);
  });

  it('liefert für jedes Szenario vollständige Trainingsdaten', () => {
    for (const scenario of trainingScenarios) {
      expect(scenario.openingSituation).toBeTruthy();
      expect(scenario.partnerProfile).toBeTruthy();
      expect(scenario.primaryGoal).toBeTruthy();
      expect(scenario.minimumGoal).toBeTruthy();
      expect(scenario.objections.length).toBeGreaterThanOrEqual(3);
      expect(scenario.allowedFacts.length).toBeGreaterThanOrEqual(3);
      expect(scenario.unknownFacts.length).toBeGreaterThanOrEqual(3);
      expect(scenario.successCriteria.length).toBeGreaterThanOrEqual(4);
      expect(scenario.failureCriteria.length).toBeGreaterThanOrEqual(4);
      expect(scenario.difficulty).toBeGreaterThanOrEqual(1);
      expect(scenario.difficulty).toBeLessThanOrEqual(5);
    }
  });

  it('enthält alle geforderten Lernpfade', () => {
    expect(learningPaths.map((path) => path.id)).toEqual([
      'beginner',
      'owner_acquisition',
      'objection_handling',
      'appointment_closing',
      'network',
      'mandate_winning',
      'advanced',
      'exam',
    ]);
  });

  it('berechnet lokalen Fortschritt deterministisch', () => {
    const result = buildTrainingProgress('beginner', ['owner_first_contact', 'later_callback']);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(3);
    expect(result.percent).toBe(67);
    expect(result.nextScenarioId).toBe('nonbinding_valuation');
  });

  it('behandelt leere Trainingsdaten als kontrollierten Leerzustand', () => {
    expect(buildTrainingCatalogState([], [])).toEqual({
      isEmpty: true,
      scenarioCount: 0,
      pathCount: 0,
      orderedScenarioIds: [],
    });
  });
});
