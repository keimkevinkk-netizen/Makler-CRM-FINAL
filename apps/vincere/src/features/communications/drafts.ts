export type CommunicationDraftTemplateId =
  | 'appointment_confirmation'
  | 'follow_up'
  | 'callback_request'
  | 'valuation_message'
  | 'check_in'
  | 'referral_request'
  | 'cancellation'
  | 'reschedule';

export type CommunicationDraftChannel = 'email' | 'message';

export interface CommunicationDraftContext {
  contactName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  propertyAddress?: string;
  senderName?: string;
  callbackNumber?: string;
  reason?: string;
}

export interface CommunicationDraftTemplate {
  id: CommunicationDraftTemplateId;
  label: string;
  channel: CommunicationDraftChannel;
  subject?: string;
  body: string;
  purpose: string;
}

export interface LocalCommunicationDraft {
  id: string;
  templateId: CommunicationDraftTemplateId;
  label: string;
  channel: CommunicationDraftChannel;
  subject?: string;
  body: string;
  status: 'local_preview';
  sendAllowed: false;
  storage: 'memory_only';
  createdAt: string;
}

export const COMMUNICATION_DRAFT_TEMPLATES: CommunicationDraftTemplate[] = [
  {
    id: 'appointment_confirmation',
    label: 'Terminbestätigung',
    channel: 'email',
    subject: 'Bestätigung unseres Termins am {{appointmentDate}}',
    body: 'Guten Tag {{contactName}},\n\nwie besprochen bestätige ich unseren Termin am {{appointmentDate}} um {{appointmentTime}} Uhr. Treffpunkt: {{propertyAddress}}.\n\nSollte sich kurzfristig etwas ändern, geben Sie mir bitte kurz Bescheid.\n\nViele Grüße\n{{senderName}}',
    purpose: 'Bestätigt einen bereits vereinbarten Termin ohne neue Zusagen zu erzeugen.',
  },
  {
    id: 'follow_up',
    label: 'Follow-up',
    channel: 'email',
    subject: 'Kurze Rückmeldung zu unserem Gespräch',
    body: 'Guten Tag {{contactName}},\n\nich wollte mich kurz zu unserem letzten Gespräch melden. Gibt es noch offene Fragen oder Informationen, die ich Ihnen für die nächsten Schritte zusammenstellen kann?\n\nViele Grüße\n{{senderName}}',
    purpose: 'Greift ein bestehendes Gespräch sachlich wieder auf.',
  },
  {
    id: 'callback_request',
    label: 'Rückrufbitte',
    channel: 'message',
    body: 'Guten Tag {{contactName}}, ich habe Sie gerade nicht erreicht. Rufen Sie mich gern unter {{callbackNumber}} zurück oder nennen Sie mir ein passendes Zeitfenster. Viele Grüße, {{senderName}}',
    purpose: 'Bittet nach einem verpassten Kontaktversuch um Rückmeldung.',
  },
  {
    id: 'valuation_message',
    label: 'Bewertungsnachricht',
    channel: 'email',
    subject: 'Nächste Schritte für die unverbindliche Bewertung',
    body: 'Guten Tag {{contactName}},\n\nfür eine erste, unverbindliche Einschätzung der Immobilie in {{propertyAddress}} würde ich die wichtigsten Eckdaten und vorhandenen Unterlagen strukturiert aufnehmen. Anschließend kann ich die Bewertungsgrundlage transparent mit Ihnen besprechen.\n\nViele Grüße\n{{senderName}}',
    purpose: 'Erklärt den Bewertungsprozess ohne einen belastbaren Marktwert vorzutäuschen.',
  },
  {
    id: 'check_in',
    label: 'Nachfassnachricht',
    channel: 'message',
    body: 'Guten Tag {{contactName}}, ich wollte kurz nachfragen, ob das Thema rund um {{propertyAddress}} für Sie noch aktuell ist. Eine kurze Rückmeldung genügt. Viele Grüße, {{senderName}}',
    purpose: 'Klären, ob ein Thema weiterhin aktuell ist.',
  },
  {
    id: 'referral_request',
    label: 'Empfehlungsanfrage',
    channel: 'email',
    subject: 'Eine kurze persönliche Frage',
    body: 'Guten Tag {{contactName}},\n\nvielen Dank für den bisherigen Austausch. Falls Sie jemanden kennen, der aktuell über Verkauf, Vermietung oder Bewertung einer Immobilie nachdenkt, freue ich mich über eine persönliche Empfehlung. Selbstverständlich behandle ich jede Anfrage vertraulich und unverbindlich.\n\nViele Grüße\n{{senderName}}',
    purpose: 'Bittet transparent und ohne Druck um eine Empfehlung.',
  },
  {
    id: 'cancellation',
    label: 'Absage',
    channel: 'email',
    subject: 'Absage unseres Termins am {{appointmentDate}}',
    body: 'Guten Tag {{contactName}},\n\nleider muss ich unseren Termin am {{appointmentDate}} um {{appointmentTime}} Uhr absagen. Grund: {{reason}}. Ich entschuldige mich für die Umstände und melde mich gern mit einem neuen Vorschlag.\n\nViele Grüße\n{{senderName}}',
    purpose: 'Sagt einen Termin nachvollziehbar und respektvoll ab.',
  },
  {
    id: 'reschedule',
    label: 'Terminverschiebung',
    channel: 'message',
    body: 'Guten Tag {{contactName}}, wäre es möglich, unseren Termin am {{appointmentDate}} auf eine andere Uhrzeit zu verschieben? Nennen Sie mir gern zwei passende Zeitfenster. Viele Grüße, {{senderName}}',
    purpose: 'Bereitet eine Terminverschiebung vor, ohne den Termin automatisch zu ändern.',
  },
];

const templateById = new Map(COMMUNICATION_DRAFT_TEMPLATES.map((template) => [template.id, template]));

const defaultContext: Required<CommunicationDraftContext> = {
  contactName: '[Kontaktname]',
  appointmentDate: '[Datum]',
  appointmentTime: '[Uhrzeit]',
  propertyAddress: '[Immobilienadresse]',
  senderName: '[Absendername]',
  callbackNumber: '[Rufnummer]',
  reason: '[Grund]',
};

const render = (value: string, context: Required<CommunicationDraftContext>) =>
  value.replace(/{{(\w+)}}/g, (_match, key: keyof CommunicationDraftContext) => context[key] ?? `[${String(key)}]`);

export function createLocalCommunicationDraft(
  templateId: CommunicationDraftTemplateId,
  context: CommunicationDraftContext = {},
  now = new Date(),
): LocalCommunicationDraft {
  const template = templateById.get(templateId);
  if (!template) throw new Error(`Unbekannte Kommunikationsvorlage: ${templateId}`);
  const resolved = { ...defaultContext, ...context };

  return {
    id: `local-draft-${templateId}-${now.getTime()}`,
    templateId,
    label: template.label,
    channel: template.channel,
    subject: template.subject ? render(template.subject, resolved) : undefined,
    body: render(template.body, resolved),
    status: 'local_preview',
    sendAllowed: false,
    storage: 'memory_only',
    createdAt: now.toISOString(),
  };
}
