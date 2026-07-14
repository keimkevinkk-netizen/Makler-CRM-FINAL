import type { CallEvent } from '../../types/domain';
import { getConversationMode, objectionGuides } from './salesCoachKnowledge';
import type {
  ConversationDebrief,
  ConversationDebriefInput,
  ConversationPreparation,
  SalesCoachContext,
} from './salesCoachTypes';

export const UNKNOWN_VALUE = 'Unbekannt';

function formatDate(value?: string) {
  if (!value) return UNKNOWN_VALUE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return UNKNOWN_VALUE;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function mostRecentCall(callEvents: CallEvent[]) {
  return [...callEvents].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

function safeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_VALUE;
}

export function buildConversationPreparation(context: SalesCoachContext): ConversationPreparation {
  const mode = getConversationMode(context.modeId);
  const contact = context.contact;
  const openFollowUps = context.followUps
    .filter((item) => item.status === 'open' && (!contact || item.contactId === contact.id))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const relatedCalls = contact ? context.callEvents.filter((item) => item.contactId === contact.id) : [];
  const latestCall = mostRecentCall(relatedCalls);
  const lastContact = contact?.lastContactAt ?? latestCall?.createdAt;
  const name = contact ? `${contact.firstName} ${contact.lastName}`.trim() : UNKNOWN_VALUE;
  const knownInterests = contact?.notes?.trim()
    ? [`Dokumentierter Hinweis: ${contact.notes.trim()}`]
    : [UNKNOWN_VALUE];
  const evidence = [
    contact ? `Kontakt: ${name}` : undefined,
    contact?.role ? `Rolle: ${contact.role}` : undefined,
    contact?.city ? `Ort: ${contact.city}` : undefined,
    contact?.source ? `Quelle: ${contact.source}` : undefined,
    lastContact ? `Letzter Kontakt: ${formatDate(lastContact)}` : undefined,
    openFollowUps.length ? `${openFollowUps.length} offene Follow-up(s)` : 'Keine offenen Follow-ups dokumentiert',
  ].filter((item): item is string => Boolean(item));

  const unknownFields = [
    !contact && 'Kontakt',
    !contact?.role && 'Rolle',
    !lastContact && 'Letzter Kontakt',
    !contact?.notes?.trim() && 'Interessen und individuelle Motive',
    !contact?.email && 'E-Mail-Adresse',
  ].filter((item): item is string => Boolean(item));

  const roleSpecificQuestions = contact?.role === 'Eigentümer'
    ? ['Welche Entscheidung steht rund um die Immobilie tatsächlich an?', 'Wer ist an der Entscheidung beteiligt?']
    : contact?.role === 'Käufer'
      ? ['Welche Kriterien sind unverzichtbar?', 'Ist der finanzielle Rahmen bereits belastbar geklärt?']
      : ['Welche gemeinsamen Berührungspunkte oder Empfehlungen sind realistisch?', 'Welche Kontaktform ist ausdrücklich erwünscht?'];

  const likelyObjections = contact?.role === 'Eigentümer'
    ? ['Möglicherweise: kein Makler gewünscht', 'Möglicherweise: zunächst privater Versuch', 'Möglicherweise: Provision/Nutzen unklar']
    : contact?.role === 'Käufer'
      ? ['Möglicherweise: Finanzierung oder Zeitplan noch unklar', 'Möglicherweise: Suchkriterien noch nicht priorisiert']
      : ['Möglicherweise: aktuell kein konkreter Anlass', 'Möglicherweise: bestehende Ansprechpartner'];

  return {
    contactSummary: contact
      ? `${name} · ${contact.role} · ${contact.city || UNKNOWN_VALUE} · Phase ${contact.stage}`
      : UNKNOWN_VALUE,
    role: contact?.role ?? UNKNOWN_VALUE,
    lastContact: formatDate(lastContact),
    openFollowUps: openFollowUps.length
      ? openFollowUps.map((item) => `${item.title} · ${formatDate(item.dueAt)} · ${item.channel}`)
      : ['Keine offenen Follow-ups dokumentiert'],
    knownInterests,
    possibleGoals: [`Mögliches Ziel: ${mode.minimumGoal}`, `Ideales Ziel: ${mode.idealGoal}`],
    opening: mode.steps[0].prompt.replace('[Name]', contact?.lastName ?? 'Unbekannt'),
    openQuestions: [
      ...roleSpecificQuestions,
      'Welche Information fehlt noch, bevor ein nächster Schritt sinnvoll ist?',
      'Was wäre heute ein realistisches Mindestziel?',
    ],
    likelyObjections,
    minimumGoal: mode.minimumGoal,
    idealGoal: mode.idealGoal,
    unknownFields,
    evidence,
  };
}

function outcomeLabel(outcome: CallEvent['outcome']) {
  return {
    no_answer: 'Nicht erreicht',
    conversation: 'Gespräch geführt',
    appointment: 'Termin vereinbart',
    not_interested: 'Aktuell kein Interesse',
  }[outcome];
}

export function buildConversationDebrief(input: ConversationDebriefInput): ConversationDebrief {
  const nextStep = safeText(input.nextStep);
  const summary = safeText(input.summary);
  const motivation = safeText(input.motivation);
  const objections = input.objections?.filter((item) => item.trim()) ?? [];
  const missingInformation = input.missingInformation?.filter((item) => item.trim()) ?? [];
  const appointmentNeeded = input.outcome === 'appointment' || /termin|bewertung|besichtigung/i.test(input.nextStep ?? '');
  const hasNextStep = nextStep !== UNKNOWN_VALUE;
  const hasMotivation = motivation !== UNKNOWN_VALUE;
  const salesRisk = input.outcome === 'not_interested' || (!hasNextStep && !hasMotivation)
    ? 'high'
    : !hasNextStep || missingInformation.length > 1
      ? 'medium'
      : 'low';
  const contactName = input.contact?.firstName?.trim() || 'Guten Tag';
  const followUpSuggestion = input.followUpDate
    ? `Follow-up am ${formatDate(input.followUpDate)}`
    : input.outcome === 'no_answer'
      ? 'Neuen Kontaktversuch nur zu einem dokumentierten, angemessenen Zeitpunkt planen.'
      : hasNextStep
        ? `Nächsten Schritt terminieren: ${nextStep}`
        : 'Vor einem weiteren Kontakt einen konkreten Anlass und ein realistisches Ziel definieren.';

  return {
    result: outcomeLabel(input.outcome),
    conversationSummary: summary,
    detectedMotivation: motivation,
    detectedObjections: objections.length ? objections : [UNKNOWN_VALUE],
    nextStep,
    followUpSuggestion,
    appointmentNeeded,
    missingInformation: missingInformation.length ? missingInformation : [UNKNOWN_VALUE],
    recommendedMessage: hasNextStep
      ? `${contactName}, danke für das Gespräch. Wie besprochen ist der nächste Schritt: ${nextStep}. Sollten sich Ihre Rahmenbedingungen ändern, stimmen wir das Vorgehen transparent neu ab.`
      : `${contactName}, danke für das Gespräch. Ich halte fest, dass aktuell kein konkreter nächster Schritt vereinbart wurde.`,
    salesRisk,
    riskReason: salesRisk === 'high'
      ? 'Kein belastbarer nächster Schritt oder aktuell kein Interesse; Kontaktverlust ist möglich.'
      : salesRisk === 'medium'
        ? 'Der nächste Schritt oder wichtige Qualifikationsdaten sind noch nicht vollständig geklärt.'
        : 'Motivation, Ergebnis und nächster Schritt sind nachvollziehbar dokumentiert.',
  };
}

export function findObjectionGuide(id: string) {
  return objectionGuides.find((item) => item.id === id);
}
