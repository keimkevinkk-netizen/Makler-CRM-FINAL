import type { EvaluationFlag, TrainingScenarioId } from '../../domain/training/types';

export interface TrainingEvaluationFixture {
  id:
    | 'good_response'
    | 'weak_response'
    | 'aggressive_response'
    | 'invented_facts'
    | 'missing_closing_goal'
    | 'unlawful_promise'
    | 'manipulative_behavior'
    | 'legally_problematic_statement'
    | 'complete_good_conversation';
  label: string;
  scenarioId: TrainingScenarioId;
  responses: string[];
  expectedFlags: EvaluationFlag[];
  minimumScore?: number;
  maximumScore?: number;
}

export const trainingEvaluationFixtures: TrainingEvaluationFixture[] = [
  {
    id: 'good_response',
    label: 'Gute Antwort',
    scenarioId: 'owner_first_contact',
    responses: [
      'Guten Tag, mein Name ist Kevin. Passt es für zwei kurze Fragen?',
      'Was ist Ihnen bei einer möglichen späteren Bewertung besonders wichtig?',
      'Wenn ich Sie richtig verstehe, wünschen Sie sich zunächst eine verlässliche Orientierung ohne Verkaufsdruck.',
      'Damit Sie eine transparente Entscheidungsgrundlage haben, klären wir nur die Informationen, die Sie wirklich benötigen.',
      'Darf ich mich am Mittwoch um 17 Uhr noch einmal melden?',
    ],
    expectedFlags: [],
    minimumScore: 70,
  },
  {
    id: 'weak_response',
    label: 'Schwache Antwort',
    scenarioId: 'private_sale_attempt',
    responses: ['Ich bin Makler und kann Ihnen helfen.'],
    expectedFlags: ['missing_closing_goal', 'unclear_next_action', 'early_argumentation'],
    maximumScore: 45,
  },
  {
    id: 'aggressive_response',
    label: 'Aggressive Antwort',
    scenarioId: 'difficult_contact',
    responses: ['Sie müssen mir jetzt zuhören. Das ist Ihre letzte Chance.'],
    expectedFlags: ['aggressive_language', 'missing_closing_goal', 'unclear_next_action'],
    maximumScore: 25,
  },
  {
    id: 'invented_facts',
    label: 'Erfundene Fakten',
    scenarioId: 'nonbinding_valuation',
    responses: ['Ihre Immobilie ist sicher 650.000 Euro wert und Sie wollen im Herbst verkaufen.'],
    expectedFlags: ['invented_fact', 'missing_closing_goal', 'unclear_next_action'],
    maximumScore: 25,
  },
  {
    id: 'missing_closing_goal',
    label: 'Kein Abschlussziel',
    scenarioId: 'appointment_booking',
    responses: ['Guten Tag, ich erkläre Ihnen gern unseren Ablauf.', 'Damit erhalten Sie Transparenz und Sicherheit.'],
    expectedFlags: ['missing_closing_goal', 'unclear_next_action', 'early_argumentation'],
    maximumScore: 55,
  },
  {
    id: 'unlawful_promise',
    label: 'Unzulässiges Versprechen',
    scenarioId: 'commission_objection',
    responses: ['Ich garantiere Ihnen den Höchstpreis und einen sicheren Verkauf.'],
    expectedFlags: ['unlawful_promise', 'missing_closing_goal', 'unclear_next_action'],
    maximumScore: 20,
  },
  {
    id: 'manipulative_behavior',
    label: 'Manipulatives Verhalten',
    scenarioId: 'closing_question',
    responses: ['Wenn Sie klug sind, entscheiden Sie sofort. Sonst werden Sie es bereuen.'],
    expectedFlags: ['manipulative_language', 'missing_closing_goal', 'unclear_next_action'],
    maximumScore: 20,
  },
  {
    id: 'legally_problematic_statement',
    label: 'Rechtlich problematische Aussage',
    scenarioId: 'existing_agent',
    responses: ['Der Vertrag ist unwichtig. Mündlich reicht immer und einen Widerruf gibt es nicht.'],
    expectedFlags: ['legally_problematic_statement', 'missing_closing_goal', 'unclear_next_action'],
    maximumScore: 15,
  },
  {
    id: 'complete_good_conversation',
    label: 'Vollständiges gutes Gespräch',
    scenarioId: 'closing_question',
    responses: [
      'Guten Tag, mein Name ist Kevin. Passt es, wenn wir die offenen Punkte kurz gemeinsam strukturieren?',
      'Was ist Ihnen bei der Entscheidung besonders wichtig?',
      'Wenn ich Sie richtig verstehe, möchten Sie Sicherheit beim Ablauf und noch eine offene Kostenfrage klären.',
      'Welcher Teil der Vergütung ist für Sie noch nicht nachvollziehbar?',
      'Damit Sie eine belastbare Entscheidungsgrundlage haben, stelle ich Leistung, Ablauf und Verantwortlichkeiten transparent gegenüber.',
      'Was fehlt Ihnen danach noch für eine sichere Entscheidung?',
      'Wollen wir den nächsten Schritt am Donnerstag um 18 Uhr verbindlich festhalten?',
    ],
    expectedFlags: [],
    minimumScore: 82,
  },
];
