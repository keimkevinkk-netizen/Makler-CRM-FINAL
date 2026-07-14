import type {
  DimensionScore,
  EvaluationDimensionId,
  EvaluationFlag,
  TrainingEvaluation,
  TrainingScenario,
} from '../../domain/training/types';

const DIMENSION_LABELS: Record<EvaluationDimensionId, string> = {
  opening: 'Gesprächseröffnung',
  questioning: 'Fragetechnik',
  needs_discovery: 'Bedarfsermittlung',
  listening: 'Zuhören',
  objection_handling: 'Einwandbehandlung',
  benefit_argumentation: 'Nutzenargumentation',
  trust_building: 'Vertrauensaufbau',
  goal_orientation: 'Zielorientierung',
  next_step: 'Nächster Schritt',
  closing: 'Gesprächsabschluss',
};

const PATTERNS = {
  greeting: /\b(hallo|guten (tag|morgen|abend)|grüß(?:e|en)? sie|servus)\b/i,
  permission: /\b(passt es|haben sie (?:kurz|zwei minuten)|darf ich|ist es gerade passend|kurze frage)\b/i,
  introduction: /\b(mein name ist|ich bin|hier ist|ich melde mich)\b/i,
  openQuestion: /\b(was|wie|welche|welcher|woran|warum|wodurch|inwiefern|wann)\b[^?.!]*\?/gi,
  needs: /\b(was ist ihnen wichtig|welches ziel|warum ist|woran würden sie|wie sieht|was müsste|welche erfahrung|was hat sie)\b/i,
  listening: /\b(verstehe|wenn ich sie richtig verstehe|sie sagen|das heißt|habe ich richtig verstanden|ich höre|nachvollziehbar)\b/i,
  objection: /\b(was genau|welcher teil|woran liegt|darf ich nachfragen|was müsste|was stört sie|was wäre stattdessen)\b/i,
  benefit: /\b(damit sie|ihr vorteil|für sie bedeutet das|sicherheit|transparenz|nachvollziehbar|entlastung|entscheidungsgrundlage|helfen|unterstützen)\b/i,
  trust: /\b(ohne druck|unverbindlich|transparent|ehrlich|nur wenn es passt|respektiere|selbstverständlich|freiwillig)\b/i,
  goal: /\b(mein ziel|heute geht es|wir klären|entscheidungsgrundlage|termin|bewertung|rückruf|empfehlung|nächster schritt)\b/i,
  nextStep: /\b(am (montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)|um \d{1,2}(?::\d{2})? uhr|termin|rückruf|ich rufe sie|wir sprechen|nächster schritt|kalendereintrag)\b/i,
  closingQuestion: /\b(passt (?:das|ihnen)|wollen wir|vereinbaren wir|darf ich|welcher termin|wann treffen|wie wollen wir|soll ich)\b[^.!]*\?/i,
  aggressive: /\b(sie müssen|keine ausrede|letzte chance|verschwenden sie nicht|ich akzeptiere kein nein|unvernünftig|stellen sie sich nicht so an|sonst verlieren sie)\b/i,
  promise: /\b(ich garantiere|garantiert|sicher verkaufen|höchstpreis|100\s?prozent|risikofrei|auf jeden fall verkauft)\b/i,
  manipulative: /\b(nur heute|wenn sie klug sind|sie werden es bereuen|alle anderen machen das|andere kommen ihnen zuvor|entscheiden sie sofort)\b/i,
  legal: /\b(energieausweis brauchen sie nicht|provision ist gesetzlich immer|ich darf für sie unterschreiben|mündlich reicht immer|datenschutz ist egal|widerruf gibt es nicht)\b/i,
  unsupportedValue: /\b\d{3}(?:[.\s]\d{3})+(?:\s?(?:euro|€))?\b/i,
  unsupportedIntent: /\b(sie wollen|sie werden|sie müssen verkaufen|ich weiß, dass sie|sie haben bereits entschieden)\b/i,
};

interface EvaluationInput {
  scenario: TrainingScenario;
  responses: readonly string[];
}

function clamp(value: number, minimum = 0, maximum = 10): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function countMatches(text: string, expression: RegExp): number {
  const matches = text.match(expression);
  return matches?.length ?? 0;
}

function scoreDimension(
  id: EvaluationDimensionId,
  score: number,
  evidence: string[],
): DimensionScore {
  return { id, label: DIMENSION_LABELS[id], score: clamp(Math.round(score)), evidence };
}

function resultFromScore(score: number): TrainingEvaluation['result'] {
  if (score >= 82) return 'strong';
  if (score >= 68) return 'solid';
  if (score >= 45) return 'developing';
  return 'insufficient';
}

function findProblematicPhrases(responses: readonly string[]): string[] {
  return responses.filter((response) =>
    PATTERNS.aggressive.test(response)
    || PATTERNS.promise.test(response)
    || PATTERNS.manipulative.test(response)
    || PATTERNS.legal.test(response)
    || PATTERNS.unsupportedValue.test(response)
    || PATTERNS.unsupportedIntent.test(response),
  );
}

function buildMissedQuestions(text: string, scenario: TrainingScenario): string[] {
  const missed: string[] = [];
  if (!/\b(wichtig|priorität|ziel)\b/i.test(text)) missed.push('Was ist Ihnen bei diesem Thema besonders wichtig?');
  if (!/\b(zeit|wann|zeithorizont)\b/i.test(text)) missed.push('Welcher zeitliche Rahmen wäre für Sie realistisch?');
  if (!/\b(bedenken|hindert|fehlt|unsicher)\b/i.test(text)) missed.push('Was hält Sie aktuell noch vom nächsten Schritt ab?');
  if (scenario.objections.length > 0 && !PATTERNS.objection.test(text)) missed.push('Was genau ist der wichtigste Punkt hinter Ihrem Einwand?');
  return missed.slice(0, 4);
}

function betterExampleForScenario(scenario: TrainingScenario): string {
  return `„Ich möchte nichts unterstellen. ${scenario.quickReplies[0]} Danach können wir gemeinsam entscheiden, ob ${scenario.minimumGoal.toLowerCase()} sinnvoll ist.“`;
}

export function evaluateTrainingResponse({ scenario, responses }: EvaluationInput): TrainingEvaluation {
  const cleanedResponses = responses.map((response) => response.trim()).filter(Boolean);
  const text = cleanedResponses.join(' ');
  const firstResponse = cleanedResponses[0] ?? '';
  const lastResponse = cleanedResponses.at(-1) ?? '';
  const questionCount = countMatches(text, /\?/g);
  const openQuestionCount = countMatches(text, PATTERNS.openQuestion);
  const flags: EvaluationFlag[] = [];

  if (cleanedResponses.length === 0) flags.push('empty_response');

  const inventedFact = PATTERNS.unsupportedValue.test(text) || PATTERNS.unsupportedIntent.test(text);
  const aggressive = PATTERNS.aggressive.test(text);
  const unlawfulPromise = PATTERNS.promise.test(text);
  const manipulative = PATTERNS.manipulative.test(text);
  const legallyProblematic = PATTERNS.legal.test(text);
  const benefitIndex = cleanedResponses.findIndex((response) => PATTERNS.benefit.test(response));
  const questionIndex = cleanedResponses.findIndex((response) => response.includes('?'));
  const earlyArgumentation = benefitIndex >= 0
    && (questionIndex === -1 || benefitIndex < questionIndex)
    && !cleanedResponses.slice(0, benefitIndex + 1).some((response) => PATTERNS.listening.test(response));
  const unclearNextAction = !PATTERNS.nextStep.test(text);
  const missingClosingGoal = !PATTERNS.closingQuestion.test(lastResponse);

  if (inventedFact) flags.push('invented_fact');
  if (aggressive) flags.push('aggressive_language');
  if (unlawfulPromise) flags.push('unlawful_promise');
  if (manipulative) flags.push('manipulative_language');
  if (legallyProblematic) flags.push('legally_problematic_statement');
  if (earlyArgumentation) flags.push('early_argumentation');
  if (unclearNextAction) flags.push('unclear_next_action');
  if (missingClosingGoal) flags.push('missing_closing_goal');

  const dimensions: DimensionScore[] = [
    scoreDimension('opening',
      (PATTERNS.greeting.test(firstResponse) ? 3 : 0)
      + (PATTERNS.introduction.test(firstResponse) ? 3 : 0)
      + (PATTERNS.permission.test(firstResponse) ? 4 : 0),
      [
        PATTERNS.greeting.test(firstResponse) ? 'Respektvolle Begrüßung erkannt.' : 'Keine klare Begrüßung erkannt.',
        PATTERNS.permission.test(firstResponse) ? 'Erlaubnisorientierter Einstieg erkannt.' : 'Gesprächserlaubnis nicht geklärt.',
      ],
    ),
    scoreDimension('questioning', Math.min(10, questionCount * 1.5 + openQuestionCount * 2), [
      `${questionCount} Frage${questionCount === 1 ? '' : 'n'} erkannt.`,
      `${openQuestionCount} offene Frage${openQuestionCount === 1 ? '' : 'n'} erkannt.`,
    ]),
    scoreDimension('needs_discovery',
      (PATTERNS.needs.test(text) ? 6 : 0) + (openQuestionCount >= 2 ? 4 : openQuestionCount * 2),
      [PATTERNS.needs.test(text) ? 'Bedarf und Ziel wurden aktiv erkundet.' : 'Bedarfsermittlung bleibt zu oberflächlich.'],
    ),
    scoreDimension('listening',
      (PATTERNS.listening.test(text) ? 7 : 0) + (cleanedResponses.length >= 3 ? 3 : cleanedResponses.length),
      [PATTERNS.listening.test(text) ? 'Aktives Spiegeln oder Anerkennen erkannt.' : 'Kein sichtbares Spiegeln der Aussagen.'],
    ),
    scoreDimension('objection_handling',
      (PATTERNS.listening.test(text) ? 3 : 0)
      + (PATTERNS.objection.test(text) ? 5 : 0)
      + (!aggressive && !manipulative ? 2 : 0),
      [PATTERNS.objection.test(text) ? 'Einwand wurde mit einer Klärungsfrage vertieft.' : 'Einwand wurde nicht ausreichend präzisiert.'],
    ),
    scoreDimension('benefit_argumentation',
      (PATTERNS.benefit.test(text) ? 7 : 0)
      + (!earlyArgumentation && PATTERNS.benefit.test(text) ? 3 : 0),
      [
        PATTERNS.benefit.test(text) ? 'Nutzenbezug erkannt.' : 'Kein konkreter Nutzenbezug erkannt.',
        earlyArgumentation ? 'Nutzenargumentation kam vor der Bedarfsklärung.' : 'Argumentation folgt der Gesprächslogik.',
      ],
    ),
    scoreDimension('trust_building',
      (PATTERNS.trust.test(text) ? 7 : 0)
      + (!inventedFact && !unlawfulPromise && !legallyProblematic ? 3 : 0),
      [PATTERNS.trust.test(text) ? 'Freiwilligkeit oder Transparenz wurde betont.' : 'Vertrauenssignal fehlt.'],
    ),
    scoreDimension('goal_orientation',
      (PATTERNS.goal.test(text) ? 6 : 0)
      + (text.toLowerCase().includes(scenario.minimumGoal.split(' ')[0].toLowerCase()) ? 2 : 0)
      + (cleanedResponses.length >= 2 ? 2 : 0),
      [PATTERNS.goal.test(text) ? 'Gesprächsziel oder Zweck wurde sichtbar.' : 'Gesprächsziel bleibt unklar.'],
    ),
    scoreDimension('next_step', PATTERNS.nextStep.test(text) ? 10 : 0, [
      PATTERNS.nextStep.test(text) ? 'Konkreter nächster Schritt erkannt.' : 'Keine konkrete nächste Aktion erkannt.',
    ]),
    scoreDimension('closing',
      (PATTERNS.closingQuestion.test(lastResponse) ? 8 : 0)
      + (PATTERNS.nextStep.test(lastResponse) ? 2 : 0),
      [PATTERNS.closingQuestion.test(lastResponse) ? 'Klare Abschlussfrage erkannt.' : 'Gespräch endet ohne klare Abschlussfrage.'],
    ),
  ];

  let totalScore = dimensions.reduce((sum, dimension) => sum + dimension.score, 0);
  if (inventedFact) totalScore -= 15;
  if (aggressive) totalScore -= 20;
  if (unlawfulPromise) totalScore -= 20;
  if (manipulative) totalScore -= 20;
  if (legallyProblematic) totalScore -= 25;
  totalScore = Math.max(0, Math.min(100, totalScore));

  const strengths = dimensions
    .filter((dimension) => dimension.score >= 7)
    .slice(0, 4)
    .map((dimension) => `${dimension.label}: ${dimension.evidence[0]}`);
  const improvements = dimensions
    .filter((dimension) => dimension.score <= 5)
    .slice(0, 5)
    .map((dimension) => `${dimension.label}: ${dimension.evidence.at(-1) ?? 'Ausbauen.'}`);

  if (inventedFact) improvements.unshift('Nur bestätigte Fakten verwenden und unbekannte Informationen als Frage formulieren.');
  if (aggressive || manipulative) improvements.unshift('Druck herausnehmen und die Entscheidungshoheit beim Gesprächspartner lassen.');
  if (legallyProblematic || unlawfulPromise) improvements.unshift('Keine rechtlichen Pauschalaussagen oder Ergebnisgarantien verwenden.');

  const result = resultFromScore(totalScore);
  return {
    totalScore,
    result,
    dimensions,
    flags,
    strengths: strengths.length > 0 ? strengths : ['Die Antwort wurde vollständig und deterministisch ausgewertet.'],
    improvements: improvements.length > 0 ? improvements : ['Den guten Aufbau mit noch präziseren offenen Fragen weiter festigen.'],
    missedQuestions: buildMissedQuestions(text, scenario),
    earlyArgumentation,
    unclearNextAction,
    problematicPhrases: findProblematicPhrases(cleanedResponses),
    betterExample: betterExampleForScenario(scenario),
    repeatRecommendation: result === 'strong'
      ? 'Nächstes Szenario im Lernpfad bearbeiten.'
      : `Szenario „${scenario.title}“ wiederholen und mindestens ${Math.max(70, totalScore + 10)} Punkte anstreben.`,
  };
}
