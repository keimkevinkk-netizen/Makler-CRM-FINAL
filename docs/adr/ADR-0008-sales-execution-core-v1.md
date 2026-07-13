# ADR-0008: Sales Execution Core V1 — Architektur

## Status
Accepted

## Kontext
Auftrag "Keim CRM Pro — Sales Operating System" (PDF, Stand 13.07.2026) verlangt eine erklärbare Next-Best-Action-Engine, einen geführten Telefonzyklus (Vorbereitung/Gespräch/Nachbereitung), einen Kontaktversprechen-Wächter im Live-Workflow und eine kanonische Verknüpfung von Kontakt/Objekt/Chance/Interaktion — ohne Framework-Wechsel, ohne Merge, ohne neuen Haupt-Tab, ohne zweites CRM-/Pipeline-/Follow-up-System.

Die Bestandsaufnahme (`docs/releases/phase27-sales-execution-core-v1-bestandsaufnahme-plan.md`) zeigt: **keine Entität im Repository ist aktuell ID-verknüpft** — Kontakte, Aktivitäten, Pipeline-Deals, Zusagen und zentrale Objekte referenzieren sich ausschließlich per Namens-String. Das ist die zentrale technische Ausgangslage für diese Entscheidung.

## Entscheidungstreiber
- Single-File-Architektur (`index.html`, jetzt >18.600 Zeilen) darf nicht unkontrolliert modularisiert werden (CLAUDE.md-Invariante).
- Bestehende `kk_*`-Keys sind geschützt — kein Rename, keine semantische Umdeutung ohne Adapter.
- PDF verlangt explizit: falls ES-Module wegen der Initialisierungsreihenfolge nicht sicher integrierbar sind, gekapselte Namespaces über `KK_BOOT` nutzen und die Entscheidung als ADR dokumentieren.
- Rückwärtskompatibilität: bestehende Anruf-/CRM-/Pipeline-Workflows dürfen durch die neue Schicht nicht blockiert werden.
- Rechtliche Grenzen (Telefonwerbung, DSGVO) sind Einzelfallentscheidungen und dürfen nicht durch eine stille technische Default-Entscheidung vorweggenommen werden.

## Betrachtete Optionen

**A. ES-Module mit `<script type="module">`, eigene Dateien unter `src/`**
Entspricht der in der PDF vorgeschlagenen Referenzstruktur wörtlich. Risiko: `index.html` lädt aktuell ausschließlich klassische, synchron/`DOMContentLoaded`-getriebene Inline-Scripts mit `KK_BOOT`-Reihenfolgesteuerung; ES-Module laden asynchron/deferred und würden eine zweite, parallele Initialisierungsreihenfolge neben `KK_BOOT` einführen — genau das Risiko, vor dem die PDF selbst warnt ("falls ES-Module... nicht sicher integrierbar sind").

**B. Vollständige ID-Migration aller Bestandsdaten (Kontakte/Aktivitäten/Pipeline) in einem Schritt**
Würde Hebel 4 der PDF ("kanonische Kontakt-Objekt-Chance-Struktur") vollständig lösen. Risiko: genau die "unkontrollierte Großmigration", die sowohl CLAUDE.md als auch die PDF selbst ausdrücklich verbieten ("keine unkontrollierte Großmigration", "keine Löschung bestehender Daten"). Zu hohes Risiko für Phase 1.

**C. Namespace-Modul `window.KK_SALES_CORE` über `KK_BOOT`, additive ID-Verknüpfung nur für neue Datensätze + Ambiguitäts-Queue für Bestandsdaten, deterministische Regel-Engine ohne Score**
Folgt demselben, bereits im Repository etablierten und bewährten Muster wie `KK_OBJECTS` (PR #10): ein Namespace-Objekt, `Object.freeze`, `KK_BOOT.register(name, init, {priority})`, additive Storage-Erweiterung statt Umbenennung.

## Entscheidung
**Option C.** Ein neues Namespace-Modul `window.KK_SALES_CORE`, eingebettet als weiterer `<script>`-Block in `index.html`, registriert über `KK_BOOT.register('sales-execution-core', init, {priority:50})`. Keine ES-Module, keine Build-Pipeline-Änderung. Intern klar in Funktionsgruppen gegliedert (`EntityLinks`, `ContactPolicy`, `ActionEngine`, `CallWorkflow`, `EventLog`) — entspricht fachlich der von der PDF vorgeschlagenen `src/`-Ordnerstruktur, aber als benannte interne Objekte statt echter Dateien, um die Single-File-Auslieferung nicht zu brechen.

**ID-Verknüpfung**: Neue Datensätze aus dem Sales Execution Core (CallSession-Ergebnisse, neue Aktivitäten) erhalten `contactId`, wo eindeutig auflösbar. Für Bestandsdaten wird **nicht geraten** — mehrdeutige oder nicht auflösbare Namens-Treffer landen in `kk_entity_link_queue_v1` und werden von automatischen Empfehlungen ausgeschlossen statt falsch verknüpft. Es findet **keine** rückwirkende Massenmigration bestehender `kk_crm_activities`/`kk_sales_pipeline`-Datensätze statt.

**Kontaktpolitik-Default**: `contactPolicy` ist additiv und optional. Für Bestandskontakte **ohne** gesetzte `contactPolicy` gilt in V1: automatische Empfehlungen bleiben möglich (Status quo, kein rückwirkendes Blockieren des bestehenden manuellen Anruf-Workflows), aber jede Empfehlungskarte zeigt sichtbar "Kontaktfreigabe nicht dokumentiert" als eigenen `reasonCode`. Ist `doNotContact=true` oder `noContactUntil` in der Zukunft oder `phoneAllowed=false` **explizit** gesetzt, wird der Kontakt **hart ausgeschlossen**. Diese Default-Entscheidung für unbekannte Kontaktlage ist bewusst konservativ-praktisch statt rechtlich abschließend geklärt — sie wird in §Rechtliche Grenze als offene Entscheidung an Kevin zurückgegeben, da es sich um eine "rechtliche Einzelfallentscheidung" handelt, die laut Auftrag ausdrücklich nicht autonom getroffen werden soll.

**Kein Score**: Die Action Engine ist eine feste, deterministische Prioritätsreihenfolge (7 Regelstufen laut PDF §Arbeitspaket 3). Jede Empfehlung trägt `ruleId`, `reasonCodes`, `sourceFacts`, `whyNow` — kein numerischer Gesamtscore, keine Wahrscheinlichkeit.

**Keine Persistenz von `ActionRecommendation`**: Empfehlungen werden bei jedem Aufruf deterministisch aus den kanonischen Quellen neu berechnet (`id = ruleId + ':' + contactId`), nicht gespeichert. Das erfüllt Akzeptanzkriterium 6/11 der PDF (reproduzierbare Reihenfolge, keine Duplikate) ohne zusätzlichen Synchronisationszustand. Nur `ActionFeedback` (Nutzerentscheidung: ausgeführt/zurückgestellt/abgelehnt) wird persistiert (`kk_action_feedback_v1`), referenziert per `recommendationId`.

## Begründung
Diese Lösung hält sich strikt an alle bindenden Sicherheitsvorgaben des Auftrags (kein neues Parallelsystem, keine Großmigration, additive Storage-Erweiterung, keine Löschung) und folgt einem im Repository bereits bewährten, getesteten Architekturmuster (`KK_OBJECTS`). Sie löst die eigentliche PDF-Diagnose ("fehlende Orchestrierung, nicht fehlende Funktionsmenge") durch eine dünne, deterministische Koordinationsschicht über bestehenden kanonischen Daten, statt eine weitere isolierte Funktion zu bauen.

## Konsequenzen
**Positiv**: Kein Regressionsrisiko für bestehende Initialisierungsreihenfolge; Ambiguitäts-Queue verhindert stille Fehlverknüpfung; Kontaktpolitik ist optional nachrüstbar, ohne bestehende Workflows zu blockieren; Empfehlungen sind jederzeit reproduzierbar und ohne zusätzlichen Speicher-Overhead.
**Negativ**: Die "kanonische Kontakt-Objekt-Chance-Struktur" (Hebel 4) ist mit V1 noch nicht vollständig gelöst — Bestandsdaten bleiben überwiegend namensverknüpft, bis eine spätere, bewusst geplante Migration erfolgt. Die konservative Kontaktpolitik-Default-Entscheidung ist eine Produktentscheidung, keine Rechtsberatung, und muss von Kevin fachlich/rechtlich bestätigt oder korrigiert werden.

## Verifikation
`tests/e2e/test-sales-execution-core.js`: Determinismus, Kontaktpolitik-Ausschluss (explizit gesperrt vs. unbekannt), Ambiguitäts-Queue-Idempotenz, vollständiger Telefonworkflow, Mobile 390px, keine Duplikate bei wiederholtem Lauf. Volle bestehende Regressionssuite bleibt grün.

## Rollback / Superseding
Das gesamte Modul ist additiv und in einem einzigen `<script>`-Block gekapselt — Entfernen des Blocks plus der drei neuen `kk_*`-Keys stellt den Vorzustand vollständig wieder her, ohne bestehende Kontakt-/Aktivitäts-/Pipeline-/Zusagen-Daten zu berühren. Eine spätere echte ID-Migration (Hebel 4 vollständig) würde diese ADR superseden und eigenständig dokumentiert.
