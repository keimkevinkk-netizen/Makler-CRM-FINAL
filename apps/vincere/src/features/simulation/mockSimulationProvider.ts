import type { TrainingScenario } from '../../domain/training/types';

export type SimulationProviderState = 'ready' | 'offline';

export interface SimulationPrompt {
  scenario: TrainingScenario;
  traineeMessage: string;
  turn: number;
}

export interface SimulationReply {
  text: string;
  partnerState: 'open' | 'reserved' | 'defensive' | 'ready_for_next_step';
  source: 'deterministic_mock';
}

export interface SimulationProvider {
  id: string;
  state: SimulationProviderState;
  reply: (prompt: SimulationPrompt) => Promise<SimulationReply>;
}

export class SimulationProviderUnavailableError extends Error {
  constructor() {
    super('Der lokale Gesprächssimulator ist offline. Das Training bleibt lesbar, neue Antworten sind aktuell nicht möglich.');
    this.name = 'SimulationProviderUnavailableError';
  }
}

const aggressivePattern = /\b(müssen|letzte chance|sofort|keine ausrede|ich akzeptiere kein nein)\b/i;
const appointmentPattern = /\b(termin|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|\d{1,2}(?::\d{2})? uhr)\b/i;
const listeningPattern = /\b(verstehe|nachvollziehbar|wenn ich sie richtig verstehe|respektiere)\b/i;

export class MockSimulationProvider implements SimulationProvider {
  readonly id = 'vincere-deterministic-training-provider';
  state: SimulationProviderState;

  constructor(state: SimulationProviderState = 'ready') {
    this.state = state;
  }

  async reply({ scenario, traineeMessage, turn }: SimulationPrompt): Promise<SimulationReply> {
    if (this.state === 'offline') throw new SimulationProviderUnavailableError();

    const message = traineeMessage.trim();
    if (!message) {
      return {
        text: 'Ich habe noch keine konkrete Aussage oder Frage gehört. Was möchten Sie von mir wissen?',
        partnerState: 'reserved',
        source: 'deterministic_mock',
      };
    }

    if (aggressivePattern.test(message)) {
      return {
        text: 'So möchte ich das Gespräch nicht führen. Bitte erklären Sie sachlich, worum es Ihnen geht.',
        partnerState: 'defensive',
        source: 'deterministic_mock',
      };
    }

    if (appointmentPattern.test(message) && message.includes('?')) {
      const difficult = scenario.difficulty >= 4;
      return {
        text: difficult
          ? 'Bevor ich einen Termin zusage: Was genau soll danach für mich klarer sein?'
          : 'Das klingt grundsätzlich sinnvoll. Welche Dauer und welche Vorbereitung planen Sie?',
        partnerState: difficult ? 'reserved' : 'ready_for_next_step',
        source: 'deterministic_mock',
      };
    }

    if (message.includes('?')) {
      const objection = scenario.objections[turn % scenario.objections.length] ?? 'Ich bin noch nicht überzeugt.';
      return {
        text: listeningPattern.test(message)
          ? `${objection} Was wäre aus Ihrer Sicht jetzt ein sinnvoller nächster Schritt?`
          : objection,
        partnerState: listeningPattern.test(message) ? 'open' : 'reserved',
        source: 'deterministic_mock',
      };
    }

    return {
      text: 'Das klingt nach einer Erklärung. Welche Frage möchten Sie mir dazu stellen?',
      partnerState: 'reserved',
      source: 'deterministic_mock',
    };
  }
}

export function createMockSimulationProvider(state: SimulationProviderState = 'ready'): SimulationProvider {
  return new MockSimulationProvider(state);
}
