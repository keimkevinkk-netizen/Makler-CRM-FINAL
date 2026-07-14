export const DOCUMENT_TYPE_DEFINITIONS = [
  { id: 'grundbuchauszug', label: 'Grundbuchauszug', description: 'Amtlicher Nachweis zu Eigentum, Belastungen und Rechten.' },
  { id: 'flurkarte', label: 'Flurkarte', description: 'Katasterdarstellung von Grundstück, Flurstück und Lage.' },
  { id: 'energieausweis', label: 'Energieausweis', description: 'Gesetzlich relevanter Nachweis zur energetischen Qualität.' },
  { id: 'grundrisse', label: 'Grundrisse', description: 'Aktuelle, lesbare Darstellung der Geschosse und Räume.' },
  { id: 'wohnflaechenberechnung', label: 'Wohnflächenberechnung', description: 'Nachvollziehbare Berechnung der anrechenbaren Wohnfläche.' },
  { id: 'baubeschreibung', label: 'Baubeschreibung', description: 'Beschreibung von Bauweise, Ausstattung und Ausführung.' },
  { id: 'gebaeudeversicherung', label: 'Gebäudeversicherung', description: 'Nachweis über den bestehenden Versicherungsschutz.' },
  { id: 'teilungserklaerung', label: 'Teilungserklärung', description: 'Rechtliche Aufteilung von Sonder- und Gemeinschaftseigentum.' },
  { id: 'protokolle', label: 'Protokolle', description: 'Relevante Beschluss-, Versammlungs- oder Objektprotokolle.' },
  { id: 'mietvertraege', label: 'Mietverträge', description: 'Bestehende Mietverhältnisse und ergänzende Vereinbarungen.' },
  { id: 'nebenkostenunterlagen', label: 'Nebenkostenunterlagen', description: 'Abrechnungen, Wirtschaftspläne und laufende Kosten.' },
  { id: 'modernisierungsnachweise', label: 'Modernisierungsnachweise', description: 'Belege und Dokumentation zu wertrelevanten Maßnahmen.' },
  { id: 'maklervertrag', label: 'Maklervertrag', description: 'Vereinbarung zu Auftrag, Leistung, Laufzeit und Vergütung.' },
  { id: 'kaufvertragsentwurf', label: 'Kaufvertragsentwurf', description: 'Notarieller Entwurf für die geplante Transaktion.' },
  { id: 'uebergabeprotokoll', label: 'Übergabeprotokoll', description: 'Dokumentation von Zustand, Zählern, Schlüsseln und Übergabe.' },
  { id: 'sonstige_unterlagen', label: 'Sonstige Unterlagen', description: 'Fachlich relevante Unterlagen ohne passenden Standardtyp.' },
] as const;

export type KnownDocumentType = typeof DOCUMENT_TYPE_DEFINITIONS[number]['id'];
export type DocumentType = KnownDocumentType | 'unknown';

export const DOCUMENT_STATUS_DEFINITIONS = [
  { id: 'vorhanden', label: 'Vorhanden', meaning: 'Die Unterlage liegt als Metadatensatz vor, wurde aber noch nicht zwingend fachlich geprüft.', tone: 'blue' },
  { id: 'angefordert', label: 'Angefordert', meaning: 'Die Unterlage wurde bei einer verantwortlichen Person angefordert und ist noch nicht eingegangen.', tone: 'gold' },
  { id: 'fehlt', label: 'Fehlt', meaning: 'Die Unterlage ist erforderlich, liegt nicht vor und wurde noch nicht belastbar beschafft.', tone: 'red' },
  { id: 'veraltet', label: 'Veraltet', meaning: 'Die vorhandene Fassung ist zeitlich oder fachlich nicht mehr ausreichend.', tone: 'red' },
  { id: 'unvollstaendig', label: 'Unvollständig', meaning: 'Die Unterlage liegt nur teilweise vor oder enthält erkennbare Lücken.', tone: 'gold' },
  { id: 'geprueft', label: 'Geprüft', meaning: 'Die Unterlage wurde fachlich geprüft und ist für den aktuellen Zweck verwendbar.', tone: 'green' },
  { id: 'pruefung_notwendig', label: 'Prüfung notwendig', meaning: 'Die Unterlage liegt vor, benötigt aber noch eine fachliche oder rechtliche Prüfung.', tone: 'gold' },
  { id: 'nicht_erforderlich', label: 'Nicht erforderlich', meaning: 'Die Unterlage ist für dieses konkrete Objekt oder diese Transaktion nachvollziehbar nicht notwendig.', tone: 'neutral' },
  { id: 'abgelehnt', label: 'Abgelehnt', meaning: 'Die Unterlage wurde bewusst nicht akzeptiert, etwa wegen falscher Zuordnung, Qualität oder Herkunft.', tone: 'red' },
] as const;

export type DocumentStatus = typeof DOCUMENT_STATUS_DEFINITIONS[number]['id'];
export type StatusTone = typeof DOCUMENT_STATUS_DEFINITIONS[number]['tone'];

export type TransactionPhase =
  | 'erstaufnahme'
  | 'bewertung'
  | 'maklerauftrag'
  | 'vermarktungsstart'
  | 'besichtigungsphase'
  | 'kaufvertragsvorbereitung'
  | 'uebergabe'
  | 'nachbetreuung';

export const TRANSACTION_PHASES: ReadonlyArray<{ id: TransactionPhase; label: string; objective: string }> = [
  { id: 'erstaufnahme', label: 'Erstaufnahme', objective: 'Objekt, Eigentümer, Anlass und Ausgangslage vollständig erfassen.' },
  { id: 'bewertung', label: 'Bewertung', objective: 'Datenreife herstellen und Bewertungsgrundlagen transparent prüfen.' },
  { id: 'maklerauftrag', label: 'Maklerauftrag', objective: 'Auftrag, Vollmachten, Ziele und Verantwortlichkeiten verbindlich klären.' },
  { id: 'vermarktungsstart', label: 'Vermarktungsstart', objective: 'Freigegebene Unterlagen, Exposé und Vermarktungsfähigkeit sicherstellen.' },
  { id: 'besichtigungsphase', label: 'Besichtigungsphase', objective: 'Interessentenprozess, Nachweise, Rückmeldungen und Risiken steuern.' },
  { id: 'kaufvertragsvorbereitung', label: 'Kaufvertragsvorbereitung', objective: 'Notarreife Unterlagen und abgestimmte Transaktionsdaten herstellen.' },
  { id: 'uebergabe', label: 'Übergabe', objective: 'Übergabe, Schlüssel, Zählerstände und Restpunkte nachvollziehbar dokumentieren.' },
  { id: 'nachbetreuung', label: 'Nachbetreuung', objective: 'Abschluss, Restaufgaben, Empfehlungen und Dokumentenfristen absichern.' },
];

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  propertyId: string;
  type: DocumentType;
  originalType?: string;
  title: string;
  status: DocumentStatus;
  version: number;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  issuedAt?: string;
  validUntil?: string;
  requestedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChecklistItemStatus = 'open' | 'complete' | 'blocked' | 'not_required';

export interface TransactionChecklistItem {
  id: string;
  phase: TransactionPhase;
  title: string;
  description: string;
  status: ChecklistItemStatus;
  responsible?: string;
  dueAt?: string;
  requiredDocumentType?: KnownDocumentType;
}

export interface TransactionTask {
  id: string;
  title: string;
  responsible: string;
  dueAt: string;
  status: 'open' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
}

export interface TransactionRisk {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  reason: string;
  documentId?: string;
  checklistItemId?: string;
}

export interface TransactionRoomViewModel {
  id: string;
  workspaceId: string;
  property: { id: string; title: string; address: string; city: string };
  owner: { id: string; name: string; email?: string; phone?: string };
  phase: TransactionPhase;
  documents: DocumentRecord[];
  checklist: TransactionChecklistItem[];
  tasks: TransactionTask[];
  responsible: string[];
  deadlines: string[];
  nextAction: string;
}

type ChecklistTemplateItem = Omit<TransactionChecklistItem, 'status'>;
const checklistItem = (
  id: string,
  phase: TransactionPhase,
  title: string,
  description: string,
  requiredDocumentType?: KnownDocumentType,
): ChecklistTemplateItem => ({ id, phase, title, description, requiredDocumentType });

const CHECKLIST_TEMPLATES: Record<TransactionPhase, ReadonlyArray<ChecklistTemplateItem>> = {
  erstaufnahme: [
    checklistItem('erstaufnahme-identitaet', 'erstaufnahme', 'Eigentümer und Vertretungsberechtigung klären', 'Eigentümer, Ansprechpartner und mögliche Vollmachten eindeutig erfassen.'),
    checklistItem('erstaufnahme-objektdaten', 'erstaufnahme', 'Objektstammdaten aufnehmen', 'Adresse, Objektart, Nutzung, Flächen und besondere Merkmale strukturiert aufnehmen.'),
    checklistItem('erstaufnahme-grundbuch', 'erstaufnahme', 'Grundbuchauszug anfordern', 'Aktuellen Grundbuchauszug beschaffen oder vorhandene Fassung prüfen.', 'grundbuchauszug'),
    checklistItem('erstaufnahme-flurkarte', 'erstaufnahme', 'Flurkarte prüfen', 'Flurstück und Grundstücksbezug nachvollziehen.', 'flurkarte'),
    checklistItem('erstaufnahme-ziel', 'erstaufnahme', 'Verkaufsziel und Zeitrahmen dokumentieren', 'Motivation, Zielbild, Zeitdruck und Entscheidungskriterien festhalten.'),
  ],
  bewertung: [
    checklistItem('bewertung-flaeche', 'bewertung', 'Flächenunterlagen validieren', 'Grundrisse und Wohnflächenberechnung auf Plausibilität prüfen.', 'wohnflaechenberechnung'),
    checklistItem('bewertung-grundrisse', 'bewertung', 'Grundrisse auf Aktualität prüfen', 'Abweichungen zwischen Bestand und Unterlagen kennzeichnen.', 'grundrisse'),
    checklistItem('bewertung-modernisierung', 'bewertung', 'Modernisierungen belegen', 'Wertrelevante Maßnahmen mit Datum, Umfang und Nachweis erfassen.', 'modernisierungsnachweise'),
    checklistItem('bewertung-energie', 'bewertung', 'Energieausweis bewerten', 'Gültigkeit, Art und Kennwerte prüfen.', 'energieausweis'),
    checklistItem('bewertung-datenluecken', 'bewertung', 'Datenlücken offen ausweisen', 'Unsichere oder fehlende Grundlagen nicht durch Annahmen ersetzen.'),
  ],
  maklerauftrag: [
    checklistItem('auftrag-vertragsdaten', 'maklerauftrag', 'Maklervertrag vollständig vorbereiten', 'Auftraggeber, Objekt, Laufzeit, Pflichten und Vergütung prüfen.', 'maklervertrag'),
    checklistItem('auftrag-legitimation', 'maklerauftrag', 'Auftraggeber legitimieren', 'Identität und Vertretungsbefugnis nachvollziehbar dokumentieren.'),
    checklistItem('auftrag-ziele', 'maklerauftrag', 'Preis- und Prozessziele abstimmen', 'Zielkorridor, Kommunikationsrhythmus und Freigaben festhalten.'),
    checklistItem('auftrag-verantwortung', 'maklerauftrag', 'Verantwortlichkeiten zuordnen', 'Interne und externe Zuständigkeiten für offene Unterlagen festlegen.'),
  ],
  vermarktungsstart: [
    checklistItem('vermarktung-energie', 'vermarktungsstart', 'Energieausweis freigeben', 'Gültigen Energieausweis vor Veröffentlichung sicherstellen.', 'energieausweis'),
    checklistItem('vermarktung-grundrisse', 'vermarktungsstart', 'Grundrisse freigeben', 'Lesbarkeit, Aktualität und sensible Angaben prüfen.', 'grundrisse'),
    checklistItem('vermarktung-beschreibung', 'vermarktungsstart', 'Baubeschreibung und Ausstattung prüfen', 'Objektmerkmale belegbar und widerspruchsfrei aufbereiten.', 'baubeschreibung'),
    checklistItem('vermarktung-freigabe', 'vermarktungsstart', 'Eigentümerfreigabe dokumentieren', 'Exposé, Preis, Bildmaterial und Veröffentlichung freigeben lassen.'),
    checklistItem('vermarktung-datenschutz', 'vermarktungsstart', 'Sensible Unterlagen begrenzen', 'Nur erforderliche Informationen für die jeweilige Zielgruppe bereitstellen.'),
  ],
  besichtigungsphase: [
    checklistItem('besichtigung-unterlagen', 'besichtigungsphase', 'Besichtigungsunterlagen vorbereiten', 'Freigegebene Objektinformationen und Rückfragenübersicht bereitstellen.'),
    checklistItem('besichtigung-rueckmeldung', 'besichtigungsphase', 'Rückmeldungen dokumentieren', 'Interesse, Einwände, offene Fragen und nächste Schritte erfassen.'),
    checklistItem('besichtigung-nachweise', 'besichtigungsphase', 'Nachweisdokumente steuern', 'Nur notwendige und freigegebene Nachweise zugänglich machen.'),
    checklistItem('besichtigung-risiken', 'besichtigungsphase', 'Widersprüche und Risiken eskalieren', 'Abweichungen zwischen Aussage, Unterlagen und Objekt nicht offenlassen.'),
  ],
  kaufvertragsvorbereitung: [
    checklistItem('kaufvertrag-entwurf', 'kaufvertragsvorbereitung', 'Kaufvertragsentwurf prüfen', 'Parteien, Objekt, Kaufpreis und Sondervereinbarungen abstimmen.', 'kaufvertragsentwurf'),
    checklistItem('kaufvertrag-grundbuch', 'kaufvertragsvorbereitung', 'Grundbuchstand aktualisieren', 'Aktualität und relevante Belastungen vor Notarreife prüfen.', 'grundbuchauszug'),
    checklistItem('kaufvertrag-mietvertraege', 'kaufvertragsvorbereitung', 'Mietverhältnisse vollständig offenlegen', 'Bestehende Verträge und Nachträge vollständig zuordnen.', 'mietvertraege'),
    checklistItem('kaufvertrag-fristen', 'kaufvertragsvorbereitung', 'Fristen und Bedingungen abstimmen', 'Finanzierung, Räumung, Besitzübergang und Unterlagenfristen dokumentieren.'),
    checklistItem('kaufvertrag-freigabe', 'kaufvertragsvorbereitung', 'Freigaben aller Parteien sichern', 'Offene Punkte vor dem Notartermin eindeutig zuordnen.'),
  ],
  uebergabe: [
    checklistItem('uebergabe-protokoll', 'uebergabe', 'Übergabeprotokoll vorbereiten', 'Zustand, Schlüssel, Zähler und offene Restpunkte erfassen.', 'uebergabeprotokoll'),
    checklistItem('uebergabe-schluessel', 'uebergabe', 'Schlüsselbestand dokumentieren', 'Anzahl, Art und Empfänger aller Schlüssel festhalten.'),
    checklistItem('uebergabe-zaehler', 'uebergabe', 'Zählerstände sichern', 'Zählerart, Nummer, Stand, Datum und Ableseperson dokumentieren.'),
    checklistItem('uebergabe-restpunkte', 'uebergabe', 'Restpunkte terminieren', 'Offene Leistungen, Verantwortliche und Fristen festhalten.'),
  ],
  nachbetreuung: [
    checklistItem('nachbetreuung-restpunkte', 'nachbetreuung', 'Restaufgaben abschließen', 'Alle noch offenen Transaktionsaufgaben kontrolliert schließen.'),
    checklistItem('nachbetreuung-loeschfristen', 'nachbetreuung', 'Lösch- und Aufbewahrungsfristen prüfen', 'Dokumente nach Zweck, Rechtsgrundlage und Frist einordnen.'),
    checklistItem('nachbetreuung-feedback', 'nachbetreuung', 'Feedback einholen', 'Erfahrung, offene Fragen und Verbesserungen dokumentieren.'),
    checklistItem('nachbetreuung-empfehlung', 'nachbetreuung', 'Empfehlungspotenzial prüfen', 'Nur bei positiver Erfahrung und passendem Zeitpunkt ansprechen.'),
    checklistItem('nachbetreuung-abschluss', 'nachbetreuung', 'Transaktionsraum abschließen', 'Vollständigkeit, Auditspur und verbleibende Zugriffe prüfen.'),
  ],
};

const DOCUMENT_TYPE_IDS = new Set<string>(DOCUMENT_TYPE_DEFINITIONS.map((item) => item.id));
const READY_STATUSES = new Set<DocumentStatus>(['vorhanden', 'geprueft']);
const RISK_STATUSES = new Set<DocumentStatus>(['fehlt', 'veraltet', 'unvollstaendig', 'pruefung_notwendig', 'abgelehnt']);

export function normalizeDocumentType(value: string): DocumentType {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[ä]/g, 'ae')
    .replace(/[ö]/g, 'oe')
    .replace(/[ü]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return DOCUMENT_TYPE_IDS.has(normalized) ? normalized as KnownDocumentType : 'unknown';
}

export function getDocumentTypeDefinition(type: DocumentType) {
  return DOCUMENT_TYPE_DEFINITIONS.find((item) => item.id === type) ?? {
    id: 'unknown' as const,
    label: 'Unbekannter Dokumenttyp',
    description: 'Der importierte oder erfasste Typ ist nicht sicher einem Standardtyp zugeordnet.',
  };
}

export function getDocumentStatusDefinition(status: DocumentStatus) {
  return DOCUMENT_STATUS_DEFINITIONS.find((item) => item.id === status)!;
}

export function createChecklist(phase: TransactionPhase): TransactionChecklistItem[] {
  return CHECKLIST_TEMPLATES[phase].map((item) => ({ ...item, status: 'open' }));
}

export function createCompleteChecklist(phase: TransactionPhase): TransactionChecklistItem[] {
  return createChecklist(phase).map((item) => ({ ...item, status: 'complete' }));
}

export function calculateChecklistProgress(items: ReadonlyArray<TransactionChecklistItem>) {
  const applicable = items.filter((item) => item.status !== 'not_required');
  const completed = applicable.filter((item) => item.status === 'complete').length;
  return { completed, total: applicable.length, percent: applicable.length === 0 ? 100 : Math.round((completed / applicable.length) * 100) };
}

export function calculateDocumentProgress(documents: ReadonlyArray<DocumentRecord>) {
  const applicable = documents.filter((document) => document.status !== 'nicht_erforderlich');
  const ready = applicable.filter((document) => READY_STATUSES.has(document.status)).length;
  return { ready, total: applicable.length, percent: applicable.length === 0 ? 100 : Math.round((ready / applicable.length) * 100) };
}

export function findDuplicateDocuments(documents: ReadonlyArray<DocumentRecord>) {
  const groups = new Map<string, DocumentRecord[]>();
  for (const document of documents) {
    if (document.status === 'abgelehnt') continue;
    const key = `${document.workspaceId}:${document.propertyId}:${document.type}`;
    groups.set(key, [...(groups.get(key) ?? []), document]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export function findWrongPropertyAssignments(propertyId: string, documents: ReadonlyArray<DocumentRecord>) {
  return documents.filter((document) => document.propertyId !== propertyId);
}

const riskWeight = (severity: TransactionRisk['severity']) => ({ critical: 4, high: 3, medium: 2, low: 1 })[severity];

export function deriveTransactionRisks(room: Pick<TransactionRoomViewModel, 'property' | 'documents' | 'checklist' | 'tasks'>): TransactionRisk[] {
  const risks: TransactionRisk[] = [];
  for (const document of room.documents) {
    if (!RISK_STATUSES.has(document.status)) continue;
    const status = getDocumentStatusDefinition(document.status);
    const type = getDocumentTypeDefinition(document.type);
    risks.push({
      id: `document:${document.id}:${document.status}`,
      severity: document.status === 'fehlt' || document.status === 'abgelehnt' ? 'high' : document.status === 'veraltet' ? 'medium' : 'low',
      title: `${type.label}: ${status.label}`,
      reason: status.meaning,
      documentId: document.id,
    });
  }
  for (const item of room.checklist) {
    if (item.status !== 'blocked') continue;
    risks.push({ id: `checklist:${item.id}`, severity: 'high', title: `Checkliste blockiert: ${item.title}`, reason: item.description, checklistItemId: item.id });
  }
  const currentTime = Date.now();
  for (const task of room.tasks) {
    if (task.status === 'open' && new Date(task.dueAt).getTime() < currentTime) {
      risks.push({
        id: `task:${task.id}`,
        severity: task.priority === 'high' ? 'critical' : 'medium',
        title: `Frist überfällig: ${task.title}`,
        reason: `${task.responsible} hätte die Aufgabe bis ${task.dueAt.slice(0, 10)} abschließen sollen.`,
      });
    }
  }
  return risks.sort((a, b) => riskWeight(b.severity) - riskWeight(a.severity) || a.id.localeCompare(b.id));
}

export function buildDemoTransactionRoom(): TransactionRoomViewModel {
  const documents: DocumentRecord[] = [
    { id: 'doc-1', workspaceId: 'workspace-demo', propertyId: 'property-berger', type: 'grundbuchauszug', title: 'Grundbuchauszug Berger', status: 'veraltet', version: 1, fileName: 'grundbuchauszug-demo.pdf', mimeType: 'application/pdf', sizeBytes: 420000, issuedAt: '2024-01-12', createdAt: '2026-07-10T09:00:00.000Z', updatedAt: '2026-07-10T09:00:00.000Z' },
    { id: 'doc-2', workspaceId: 'workspace-demo', propertyId: 'property-berger', type: 'flurkarte', title: 'Flurkarte', status: 'geprueft', version: 2, fileName: 'flurkarte-demo.pdf', mimeType: 'application/pdf', sizeBytes: 210000, reviewedAt: '2026-07-12T10:00:00.000Z', reviewedBy: 'Kevin Keim', createdAt: '2026-07-09T11:00:00.000Z', updatedAt: '2026-07-12T10:00:00.000Z' },
    { id: 'doc-3', workspaceId: 'workspace-demo', propertyId: 'property-berger', type: 'energieausweis', title: 'Energieausweis', status: 'fehlt', version: 0, requestedAt: '2026-07-11T08:00:00.000Z', createdAt: '2026-07-11T08:00:00.000Z', updatedAt: '2026-07-11T08:00:00.000Z' },
    { id: 'doc-4', workspaceId: 'workspace-demo', propertyId: 'property-berger', type: 'grundrisse', title: 'Grundrisse', status: 'pruefung_notwendig', version: 1, fileName: 'grundrisse-demo.pdf', mimeType: 'application/pdf', sizeBytes: 860000, createdAt: '2026-07-12T08:00:00.000Z', updatedAt: '2026-07-12T08:00:00.000Z' },
    { id: 'doc-5', workspaceId: 'workspace-demo', propertyId: 'property-berger', type: 'wohnflaechenberechnung', title: 'Wohnflächenberechnung', status: 'unvollstaendig', version: 1, fileName: 'wohnflaeche-demo.pdf', mimeType: 'application/pdf', sizeBytes: 190000, createdAt: '2026-07-12T09:00:00.000Z', updatedAt: '2026-07-12T09:00:00.000Z' },
    { id: 'doc-6', workspaceId: 'workspace-demo', propertyId: 'property-berger', type: 'maklervertrag', title: 'Maklervertrag', status: 'geprueft', version: 1, fileName: 'maklervertrag-demo.pdf', mimeType: 'application/pdf', sizeBytes: 330000, reviewedAt: '2026-07-13T12:00:00.000Z', reviewedBy: 'Kevin Keim', createdAt: '2026-07-13T11:00:00.000Z', updatedAt: '2026-07-13T12:00:00.000Z' },
  ];
  const checklist: TransactionChecklistItem[] = TRANSACTION_PHASES.flatMap(({ id }) => createChecklist(id)).map((item) => {
    if (item.phase === 'erstaufnahme') return { ...item, status: 'complete' };
    if (item.phase === 'bewertung' && item.id === 'bewertung-energie') return { ...item, status: 'blocked', responsible: 'Eigentümer', dueAt: '2026-07-15' };
    if (item.phase === 'bewertung' && ['bewertung-grundrisse', 'bewertung-datenluecken'].includes(item.id)) return { ...item, status: 'complete' };
    return item;
  });
  return {
    id: 'transaction-demo-1',
    workspaceId: 'workspace-demo',
    property: { id: 'property-berger', title: 'Einfamilienhaus Berger', address: 'Hauptstraße 12', city: 'Bruchköbel' },
    owner: { id: 'owner-berger', name: 'Thomas Berger', email: 'thomas.berger@example.de', phone: '+49 171 2345678' },
    phase: 'bewertung',
    documents,
    checklist,
    tasks: [
      { id: 'task-1', title: 'Aktuellen Grundbuchauszug anfordern', responsible: 'Kevin Keim', dueAt: '2026-07-13', status: 'open', priority: 'high' },
      { id: 'task-2', title: 'Energieausweis beim Eigentümer nachfassen', responsible: 'Kevin Keim', dueAt: '2026-07-15', status: 'open', priority: 'high' },
      { id: 'task-3', title: 'Grundrissabweichungen prüfen', responsible: 'Sachbearbeitung', dueAt: '2026-07-16', status: 'open', priority: 'medium' },
    ],
    responsible: ['Kevin Keim', 'Sachbearbeitung', 'Thomas Berger'],
    deadlines: ['2026-07-15 Energieausweis', '2026-07-16 Grundrissprüfung', '2026-07-18 Bewertungsfreigabe'],
    nextAction: 'Aktuellen Grundbuchauszug und Energieausweis nachfassen, bevor die Bewertung freigegeben wird.',
  };
}
