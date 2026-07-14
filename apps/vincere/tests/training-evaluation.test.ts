import { describe, expect, it } from 'vitest';
import { getTrainingScenario } from '../src/domain/training/scenarios';
import { evaluateTrainingResponse } from '../src/features/simulation/evaluationEngine';
import { trainingEvaluationFixtures } from '../src/features/simulation/evaluationFixtures';

describe('deterministische Trainingsbewertung', () => {
  it.each(trainingEvaluationFixtures)('bewertet $label erwartungsgemäß', (fixture) => {
    const evaluation = evaluateTrainingResponse({
      scenario: getTrainingScenario(fixture.scenarioId),
      responses: fixture.responses,
    });

    for (const flag of fixture.expectedFlags) expect(evaluation.flags).toContain(flag);
    if (fixture.expectedFlags.length === 0) expect(evaluation.flags).toEqual([]);
    if (fixture.minimumScore !== undefined) expect(evaluation.totalScore).toBeGreaterThanOrEqual(fixture.minimumScore);
    if (fixture.maximumScore !== undefined) expect(evaluation.totalScore).toBeLessThanOrEqual(fixture.maximumScore);
  });

  it('liefert für identische Eingaben identische Ergebnisse', () => {
    const fixture = trainingEvaluationFixtures.at(-1);
    if (!fixture) throw new Error('Evaluationsfixture fehlt.');
    const input = { scenario: getTrainingScenario(fixture.scenarioId), responses: fixture.responses };
    expect(evaluateTrainingResponse(input)).toEqual(evaluateTrainingResponse(input));
  });

  it('bewertet alle zehn geforderten Dimensionen', () => {
    const evaluation = evaluateTrainingResponse({
      scenario: getTrainingScenario('owner_first_contact'),
      responses: ['Guten Tag, mein Name ist Kevin. Passt es für zwei Fragen?'],
    });
    expect(evaluation.dimensions.map((dimension) => dimension.id)).toEqual([
      'opening',
      'questioning',
      'needs_discovery',
      'listening',
      'objection_handling',
      'benefit_argumentation',
      'trust_building',
      'goal_orientation',
      'next_step',
      'closing',
    ]);
  });

  it('erkennt vollständige und unvollständige Antworten', () => {
    const scenario = getTrainingScenario('appointment_booking');
    const empty = evaluateTrainingResponse({ scenario, responses: [] });
    const complete = evaluateTrainingResponse({
      scenario,
      responses: [
        'Guten Tag, passt es für zwei kurze Fragen?',
        'Was ist Ihnen bei dem Termin besonders wichtig?',
        'Verstehe. Wollen wir Donnerstag um 18 Uhr einen Termin vereinbaren?',
      ],
    });
    expect(empty.flags).toContain('empty_response');
    expect(empty.totalScore).toBe(0);
    expect(complete.totalScore).toBeGreaterThan(empty.totalScore);
    expect(complete.flags).not.toContain('unclear_next_action');
  });
});
