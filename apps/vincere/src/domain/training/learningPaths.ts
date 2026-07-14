import type {
  LearningPath,
  LearningPathId,
  TrainingCatalogState,
  TrainingProgress,
  TrainingScenario,
  TrainingScenarioId,
} from './types';
import { trainingScenarios } from './scenarios';

export const learningPaths: LearningPath[] = [
  {
    id: 'beginner',
    label: 'Anfänger',
    description: 'Sicher eröffnen, gute Fragen stellen und einen klaren nächsten Schritt vereinbaren.',
    scenarioIds: ['owner_first_contact', 'later_callback', 'nonbinding_valuation'],
    recommendedMinimumScore: 60,
  },
  {
    id: 'owner_acquisition',
    label: 'Eigentümerakquise',
    description: 'Frühe Eigentümerkontakte respektvoll qualifizieren und langfristig entwickeln.',
    scenarioIds: ['owner_first_contact', 'private_sale_attempt', 'no_current_sale_intent'],
    recommendedMinimumScore: 68,
  },
  {
    id: 'objection_handling',
    label: 'Einwandbehandlung',
    description: 'Einwände präzisieren, statt sie wegzudiskutieren oder vorschnell zu argumentieren.',
    scenarioIds: ['commission_objection', 'existing_agent', 'difficult_contact'],
    recommendedMinimumScore: 72,
  },
  {
    id: 'appointment_closing',
    label: 'Terminabschluss',
    description: 'Aus Interesse einen klar vorbereiteten Termin oder Entscheidungszeitpunkt machen.',
    scenarioIds: ['later_callback', 'appointment_booking', 'closing_question'],
    recommendedMinimumScore: 72,
  },
  {
    id: 'network',
    label: 'Netzwerk',
    description: 'Empfehlungen und Kooperationen freiwillig, qualifiziert und beidseitig wertvoll gestalten.',
    scenarioIds: ['referral_request', 'network_partner'],
    recommendedMinimumScore: 70,
  },
  {
    id: 'mandate_winning',
    label: 'Mandatsgewinnung',
    description: 'Bewertung, Nutzenargumentation und Abschluss zu einem belastbaren Mandatsprozess verbinden.',
    scenarioIds: ['nonbinding_valuation', 'commission_objection', 'appointment_booking', 'closing_question'],
    recommendedMinimumScore: 76,
  },
  {
    id: 'advanced',
    label: 'Fortgeschritten',
    description: 'Komplexe Gesprächspartner, konkurrierende Optionen und sensible Abschlussmomente meistern.',
    scenarioIds: ['existing_agent', 'difficult_contact', 'closing_question', 'network_partner'],
    recommendedMinimumScore: 80,
  },
  {
    id: 'exam',
    label: 'Prüfung',
    description: 'Vollständige Gesprächsführung mit Faktenbindung, Einwandbehandlung und sauberem Abschluss.',
    scenarioIds: [
      'owner_first_contact',
      'private_sale_attempt',
      'commission_objection',
      'nonbinding_valuation',
      'appointment_booking',
      'closing_question',
      'referral_request',
      'network_partner',
    ],
    recommendedMinimumScore: 82,
  },
];

export function getLearningPath(id: LearningPathId): LearningPath {
  const path = learningPaths.find((item) => item.id === id);
  if (!path) throw new Error(`Unbekannter Lernpfad: ${id}`);
  return path;
}

export function buildTrainingProgress(
  pathId: LearningPathId,
  completedScenarioIds: readonly TrainingScenarioId[],
): TrainingProgress {
  const path = getLearningPath(pathId);
  const completedSet = new Set(completedScenarioIds);
  const completed = path.scenarioIds.filter((id) => completedSet.has(id)).length;
  const nextScenarioId = path.scenarioIds.find((id) => !completedSet.has(id));

  return {
    pathId,
    completed,
    total: path.scenarioIds.length,
    percent: path.scenarioIds.length === 0 ? 0 : Math.round((completed / path.scenarioIds.length) * 100),
    nextScenarioId,
  };
}

export function buildTrainingCatalogState(
  scenarios: readonly TrainingScenario[] = trainingScenarios,
  paths: readonly LearningPath[] = learningPaths,
): TrainingCatalogState {
  return {
    isEmpty: scenarios.length === 0 || paths.length === 0,
    scenarioCount: scenarios.length,
    pathCount: paths.length,
    orderedScenarioIds: [...scenarios]
      .sort((left, right) => left.order - right.order)
      .map((scenario) => scenario.id),
  };
}
