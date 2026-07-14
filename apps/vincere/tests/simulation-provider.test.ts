import { describe, expect, it } from 'vitest';
import { getTrainingScenario } from '../src/domain/training/scenarios';
import {
  MockSimulationProvider,
  SimulationProviderUnavailableError,
} from '../src/features/simulation/mockSimulationProvider';

describe('lokaler Mock-Simulationsprovider', () => {
  it('antwortet ohne externe KI deterministisch', async () => {
    const provider = new MockSimulationProvider();
    const prompt = {
      scenario: getTrainingScenario('commission_objection'),
      traineeMessage: 'Verstehe. Welcher Teil der Vergütung ist für Sie nicht nachvollziehbar?',
      turn: 1,
    };
    expect(await provider.reply(prompt)).toEqual(await provider.reply(prompt));
  });

  it('reagiert auf aggressive Formulierungen defensiv', async () => {
    const provider = new MockSimulationProvider();
    const reply = await provider.reply({
      scenario: getTrainingScenario('difficult_contact'),
      traineeMessage: 'Sie müssen jetzt zuhören. Das ist Ihre letzte Chance.',
      turn: 0,
    });
    expect(reply.partnerState).toBe('defensive');
  });

  it('meldet den Offlinezustand kontrolliert', async () => {
    const provider = new MockSimulationProvider('offline');
    await expect(provider.reply({
      scenario: getTrainingScenario('owner_first_contact'),
      traineeMessage: 'Guten Tag.',
      turn: 0,
    })).rejects.toBeInstanceOf(SimulationProviderUnavailableError);
  });
});
