import type { UserRole } from '../../types/domain';
import { normalizeSearchText } from '../../domain/search/searchIndex';

export type CommandAction =
  | { kind: 'navigate'; path: string }
  | { kind: 'new-contact' };

export interface CommandDefinition {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  action: CommandAction;
  writesData: boolean;
}

const commands: CommandDefinition[] = [
  { id: 'new-contact', label: 'Neuen Kontakt anlegen', description: 'Öffnet die vorhandene Kontakterfassung.', keywords: ['kontakt', 'neu', 'anlegen', 'erfassen'], action: { kind: 'new-contact' }, writesData: true },
  { id: 'call-contact', label: 'Kontakt anrufen', description: 'Öffnet den vorhandenen Telefonbereich.', keywords: ['kontakt', 'telefon', 'anrufen', 'call'], action: { kind: 'navigate', path: '/phone' }, writesData: true },
  { id: 'create-followup', label: 'Follow-up anlegen', description: 'Öffnet Kontakte für die vorhandene Follow-up-Aktion.', keywords: ['followup', 'follow-up', 'wiedervorlage', 'aktion'], action: { kind: 'navigate', path: '/contacts' }, writesData: true },
  { id: 'open-appointment', label: 'Termin öffnen', description: 'Öffnet die heutige Termin- und Aktionsansicht.', keywords: ['termin', 'kalender', 'appointment'], action: { kind: 'navigate', path: '/today' }, writesData: false },
  { id: 'open-property', label: 'Immobilie öffnen', description: 'Öffnet den vorhandenen Immobilienbereich.', keywords: ['immobilie', 'objekt', 'property'], action: { kind: 'navigate', path: '/properties' }, writesData: false },
  { id: 'open-valuation', label: 'Bewertung öffnen', description: 'Öffnet den vorhandenen Bewertungsbereich.', keywords: ['bewertung', 'wertermittlung', 'valuation'], action: { kind: 'navigate', path: '/valuations' }, writesData: false },
  { id: 'open-pipeline', label: 'Pipeline anzeigen', description: 'Öffnet die vorhandene Vertriebspipeline.', keywords: ['pipeline', 'chance', 'mandat'], action: { kind: 'navigate', path: '/pipeline' }, writesData: false },
  { id: 'start-daily-focus', label: 'Tagesfokus starten', description: 'Öffnet die priorisierten Aufgaben für heute.', keywords: ['tag', 'tagesfokus', 'heute', 'fokus'], action: { kind: 'navigate', path: '/today' }, writesData: false },
  { id: 'start-network-focus', label: 'Netzwerkfokus starten', description: 'Öffnet den vorhandenen Netzwerkbereich.', keywords: ['netzwerk', 'partner', 'tippgeber', 'fokus'], action: { kind: 'navigate', path: '/network' }, writesData: false },
  { id: 'open-campaigns', label: 'Kampagnen öffnen', description: 'Öffnet den vorhandenen Kampagnenbereich.', keywords: ['kampagne', 'kampagnen', 'campaign'], action: { kind: 'navigate', path: '/campaigns' }, writesData: false },
  { id: 'open-settings', label: 'Einstellungen öffnen', description: 'Öffnet die vorhandenen Einstellungen.', keywords: ['einstellungen', 'settings', 'konfiguration'], action: { kind: 'navigate', path: '/settings' }, writesData: false },
];

export function getAvailableCommands(role: UserRole) {
  return commands.filter((command) => role !== 'viewer' || !command.writesData);
}

export function searchCommands(role: UserRole, query: string) {
  const normalized = normalizeSearchText(query);
  const available = getAvailableCommands(role);
  if (!normalized) return available;
  const tokens = normalized.split(' ').filter(Boolean);
  return available
    .map((command) => {
      const label = normalizeSearchText(command.label);
      const haystack = normalizeSearchText([command.label, command.description, ...command.keywords].join(' '));
      const exact = label === normalized;
      const prefix = tokens.every((token) => haystack.split(' ').some((candidate) => candidate.startsWith(token)));
      const contains = haystack.includes(normalized);
      return { command, score: exact ? 1_100 : prefix ? 780 : contains ? 640 : 0 };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.command.label.localeCompare(right.command.label, 'de-DE'))
    .map((match) => match.command);
}
