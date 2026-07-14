import { LEGACY_SOURCE_CATALOG } from '../../data/legacy/sourceCatalog';
import type { DetectedLegacySource, VincereImportPackage } from './types';

const statusLabels = {
  canonical: 'kanonisch',
  parallel: 'parallel',
  legacy: 'veraltet / Legacy',
  reference: 'nur Referenz',
} as const;

function countRecords(importPackage: VincereImportPackage) {
  return {
    Kontakte: importPackage.records.contacts.length,
    'Follow-ups': importPackage.records.followUps.length,
    Immobilien: importPackage.records.properties.length,
    Termine: importPackage.records.appointments.length,
    Telefonereignisse: importPackage.records.callEvents.length,
    Aktivitäten: importPackage.extensions.activities.length,
    'Pipeline-Einträge': importPackage.extensions.pipelineEntries.length,
    Bewertungschancen: importPackage.extensions.valuationOpportunities.length,
    Marktbeobachtungen: importPackage.extensions.marketObservations.length,
  };
}

function markdownTable(rows: string[][]) {
  if (rows.length === 0) return '_Keine Einträge._';
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column]?.length ?? 0)));
  const format = (row: string[]) => `| ${row.map((cell, column) => cell.padEnd(widths[column])).join(' | ')} |`;
  return [format(rows[0]), `| ${widths.map((width) => '-'.repeat(Math.max(3, width))).join(' | ')} |`, ...rows.slice(1).map(format)].join('\n');
}

export function buildMigrationReport(fileName: string, sources: DetectedLegacySource[], importPackage: VincereImportPackage) {
  const issues = importPackage.migration.issues;
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const errors = issues.filter((issue) => issue.severity === 'error');
  const duplicateCounts = Object.fromEntries(['certain', 'probable', 'manual', 'separate'].map((category) => [category, importPackage.migration.duplicates.filter((item) => item.category === category).length]));
  const counts = countRecords(importPackage);

  const sourceRows = [
    ['LocalStorage-Key', 'Status', 'Bereich', 'Datensätze', 'Erkannte Form'],
    ...sources.map((source) => [source.key, statusLabels[source.status], source.entity, String(source.count), source.shape]),
  ];
  const mappingRows = [
    ['VINCERE-Bereich', 'Anzahl'],
    ...Object.entries(counts).map(([label, count]) => [label, String(count)]),
  ];
  const issueRows = [
    ['Stufe', 'Code', 'Quelle', 'Hinweis'],
    ...issues.map((issue) => [issue.severity, issue.code, issue.sourceKey ?? 'paketweit', issue.message.replaceAll('|', '\\|')]),
  ];
  const duplicateRows = [
    ['Entität', 'Kategorie', 'Datensätze', 'Automatisch zusammengeführt'],
    ...importPackage.migration.duplicates.map((item) => [item.entity, item.category, String(item.recordIds.length), item.autoMergedInto ?? 'nein']),
  ];
  const unresolvedRows = [
    ['Quelle', 'Index', 'Beziehung', 'Referenz', 'Kandidaten', 'Grund'],
    ...importPackage.migration.unresolvedRelationships.map((item) => [item.sourceKey, String(item.sourceIndex), item.relationship, item.legacyReference ?? '—', String(item.candidateContactIds.length), item.reason.replaceAll('|', '\\|')]),
  ];

  return `# VINCERE Migrationsbericht\n\n` +
    `## Ausführung\n\n` +
    `- Importdatei: \`${fileName}\`\n` +
    `- Quell-Fingerprint: \`${importPackage.sourceFingerprint}\`\n` +
    `- Format: \`${importPackage.format}\` Version ${importPackage.formatVersion}\n` +
    `- Deterministisch: **ja**\n` +
    `- Cloud-Schreiben erlaubt: **nein**\n` +
    `- Produktive Daten migriert: **nein**\n\n` +
    `## Erkannte Datenquellen\n\n${markdownTable(sourceRows)}\n\n` +
    `## Zielpaket\n\n${markdownTable(mappingRows)}\n\n` +
    `## Datenquellen-Bewertung\n\n` +
    `Die Quellpriorität folgt der statischen Bestandsanalyse des alten MaklerCRM. Kanonische Strukturen werden bei Feldkonflikten bevorzugt. Parallele und historische Strukturen werden nicht verworfen, sondern normalisiert, auf Dubletten geprüft und mit ihrer Herkunft im Importpaket erhalten.\n\n` +
    markdownTable([
      ['Status', 'Katalogeinträge'],
      ...(['canonical', 'parallel', 'legacy', 'reference'] as const).map((status) => [statusLabels[status], String(LEGACY_SOURCE_CATALOG.filter((source) => source.status === status).length)]),
    ]) + '\n\n' +
    `## Dublettenprüfung\n\n` +
    `- sicher identisch: ${duplicateCounts.certain ?? 0}\n` +
    `- wahrscheinlich identisch: ${duplicateCounts.probable ?? 0}\n` +
    `- manuelle Prüfung notwendig: ${duplicateCounts.manual ?? 0}\n` +
    `- eindeutig getrennt: ${duplicateCounts.separate ?? 0}\n\n` +
    `${markdownTable(duplicateRows)}\n\n` +
    `Nur Gruppen mit einer starken Identität werden automatisch zusammengeführt. Wahrscheinliche und rein namensbasierte Treffer bleiben getrennt.\n\n` +
    `## Nicht auflösbare Beziehungen\n\n${markdownTable(unresolvedRows)}\n\n` +
    `## Fehler und Warnungen\n\n` +
    `- Fehler: ${errors.length}\n` +
    `- Warnungen: ${warnings.length}\n\n` +
    `${markdownTable(issueRows)}\n\n` +
    `## Sicherheits- und Integritätsgrenzen\n\n` +
    `- Die Datei wird ausschließlich im Browser verarbeitet.\n` +
    `- Es findet kein Netzwerkaufruf und keine Cloud-Speicherung statt.\n` +
    `- Gefährliche JSON-Schlüssel wie \`__proto__\`, \`prototype\` und \`constructor\` werden abgewiesen.\n` +
    `- Das alte LocalStorage wird weder gelesen noch verändert; verarbeitet wird nur die ausgewählte Exportdatei.\n` +
    `- Marktbeobachtungen und allgemeine Aktivitäten bleiben als Erweiterungsdaten erhalten, bis ein fachlich passendes relationales Zielmodell freigegeben ist.\n` +
    `- Workspace-ID und ausführender Benutzer werden erst in einem späteren, ausdrücklich freizugebenden Integrationsschritt zugewiesen.\n\n` +
    `## Spätere Integrationspunkte\n\n` +
    `1. Berechtigungsgeprüfte Übernahme des geprüften Importpakets in den App-Store.\n` +
    `2. Zuweisung der aktiven Workspace- und Benutzer-IDs.\n` +
    `3. Serverseitige Transaktion mit Konfliktprüfung und trockenem Probelauf.\n` +
    `4. Separates Mapping für Pipeline-, Bewertungs- und Markt-Erweiterungsdaten, sobald die Zieltabellen fachlich freigegeben sind.\n\n` +
    `Dieser Bericht bestätigt keine produktive Migration. Er dokumentiert ausschließlich die lokale Analyse und die Erzeugung eines überprüfbaren Importpakets.\n`;
}
