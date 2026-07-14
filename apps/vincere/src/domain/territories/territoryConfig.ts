import type { TerritoryDefinition, TerritorySegment } from './territoryTypes';

export const territoryDefinitions: readonly TerritoryDefinition[] = [
  {
    name: 'Bruchköbel',
    segment: 'Kernfestung',
    strategicWeight: 25,
    rationale: 'Primäres Beziehungsgebiet mit hoher gewünschter Bearbeitungstiefe.',
    operatingFocus: 'Eigentümerbeziehungen, Empfehlungen und sichtbare lokale Präsenz.',
  },
  {
    name: 'Hanau',
    segment: 'Volumenmaschine',
    strategicWeight: 22,
    rationale: 'Großes operatives Gebiet, das konsequente Segmentierung und Taktung benötigt.',
    operatingFocus: 'Klare Teilgebiete, hohe Aktivitätsfrequenz und strukturierte Nachverfolgung.',
  },
  {
    name: 'Schöneck',
    segment: 'Kernfestung',
    strategicWeight: 25,
    rationale: 'Kerngebiet für wiederkehrende lokale Kontaktpunkte und Empfehlungsaufbau.',
    operatingFocus: 'Netzwerkdichte, Eigentümerkontakte und lokale Sichtbarkeit.',
  },
  {
    name: 'Nidderau',
    segment: 'Kernfestung',
    strategicWeight: 25,
    rationale: 'Strategisches Kerngebiet für nachhaltige Eigentümer- und Netzwerkbearbeitung.',
    operatingFocus: 'Bewertungschancen, Nachbarschaftsansprache und Empfehlungsquellen.',
  },
  {
    name: 'Erlensee',
    segment: 'Erweiterungsring',
    strategicWeight: 16,
    rationale: 'Angrenzendes Ausbaugebiet, das kontrolliert aus bestehenden Beziehungen entwickelt wird.',
    operatingFocus: 'Reaktivierung, Empfehlungen und selektive lokale Kampagnen.',
  },
  {
    name: 'Langenselbold',
    segment: 'Erweiterungsring',
    strategicWeight: 16,
    rationale: 'Erweiterungsgebiet mit Fokus auf vorhandene Kontakte und belastbare Anlässe.',
    operatingFocus: 'Netzwerkpflege und anlassbezogene Eigentümeransprache.',
  },
  {
    name: 'Maintal',
    segment: 'Hochpreis',
    strategicWeight: 20,
    rationale: 'Strategisches Qualitätsgebiet, in dem Kontaktqualität vor Reichweite steht.',
    operatingFocus: 'Qualifizierte Eigentümergespräche, Bewertungen und hochwertige Empfehlungen.',
  },
  {
    name: 'Neuberg',
    segment: 'selektive Bearbeitung',
    strategicWeight: 10,
    rationale: 'Selektives Gebiet, das nur bei vorhandenen Beziehungen oder konkretem Anlass aktiviert wird.',
    operatingFocus: 'Bestandskontakte und klar begründete Einzelmaßnahmen.',
  },
  {
    name: 'Hammersbach',
    segment: 'selektive Bearbeitung',
    strategicWeight: 10,
    rationale: 'Selektive Bearbeitung ohne pauschale Marktannahmen.',
    operatingFocus: 'Empfehlungen, Netzwerk und konkrete Eigentümeranlässe.',
  },
  {
    name: 'Rodenbach',
    segment: 'selektive Bearbeitung',
    strategicWeight: 10,
    rationale: 'Selektives Gebiet mit daten- und beziehungsbasierter Aktivierung.',
    operatingFocus: 'Reaktivierung vorhandener Kontakte und lokale Multiplikatoren.',
  },
  {
    name: 'Freigericht',
    segment: 'selektive Bearbeitung',
    strategicWeight: 10,
    rationale: 'Selektive Bearbeitung bei konkretem Bestand oder belastbarer Empfehlung.',
    operatingFocus: 'Netzwerkpflege und qualifizierte Eigentümerkontakte.',
  },
  {
    name: 'Gelnhausen',
    segment: 'selektive Bearbeitung',
    strategicWeight: 10,
    rationale: 'Selektives Ergänzungsgebiet, das nicht ohne operative Signale priorisiert wird.',
    operatingFocus: 'Konkrete Chancen, Bestandskunden und Netzwerkpartner.',
  },
];

export const fallbackTerritorySegment: TerritorySegment = 'selektive Bearbeitung';

export function getTerritoryDefinition(name: string): TerritoryDefinition | undefined {
  return territoryDefinitions.find((territory) => territory.name === name);
}
