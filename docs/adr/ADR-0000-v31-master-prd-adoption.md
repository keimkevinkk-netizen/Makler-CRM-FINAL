# ADR-0000: Adoption des Master-PRD V31 auf der bestehenden Codebasis

## Status
Accepted

## Kontext
Ein fünfteiliges Master-PRD (Produktstrategie, UX & Design Bible, Architektur & Datenmodell, Marktmonitor & Kartenplattform, Claude Code Development Manual) wurde als verbindliche Spezifikation für Keim CRM Pro V31 vorgelegt. Die bestehende Codebasis ist eine ~13.000-Zeilen-Single-File-Anwendung, auf der bereits ein früherer, informeller "V31"-Rebuild (Phasen A–E) stattgefunden hat: Marktmonitor mit echter Leaflet-Karte hinter einem MapAdapter-Vertrag, ein Provider-/Cache-Fundament (`KK_DATA_CORE`, `KK_MARKET`), ein Dashboard-Command-Center mit klickbaren KPIs, eine Mobile-Native-Passage (Card-Tables, progressive Formular-Disclosure, Touch-Ziele) und eine erste CRM-Konsolidierung.

Das neue Master-PRD ist deutlich umfassender und formalisierter als der bisherige informelle Rebuild. Es fordert unter anderem eine zentrale `KK_NAV`-Navigationsschicht, eine Schema-Registry mit ID-Konventionen, eine Source-Registry für Marktdaten, amtliche Gemeindegeometrie (BKG VG250) statt Näherungskoordinaten, Netlify-Function-basierte Provider, ADRs für alle wesentlichen Entscheidungen und ein mehrstufiges Test-/Review-Protokoll.

## Entscheidungstreiber
- Bestehende produktive Daten und Storage-Keys dürfen nicht verloren gehen (PRD Teil 1 Rangordnung, Teil 3 §0.2).
- Die bereits geleistete Phase-A-E-Arbeit ist strukturell größtenteils PRD-konform (siehe `docs/prd/00-ist-zustand-inventar.md` §5) und soll nicht verworfen werden (Teil 5 §40: "Komplette index.html neu generieren" ist ein explizites Anti-Pattern).
- Das PRD selbst schreibt ein Strangler-Pattern und kontrollierte, phasenweise Migration vor (Teil 3 §41, Teil 5 §16), keinen Big-Bang-Rewrite.
- Das gesamte PRD (Teil 1–5, ~6.000 Zeilen) kann nicht in einer einzigen Implementierungsphase vollständig umgesetzt werden, ohne gegen die eigene Regel "kleine, atomare, rückrollbare Commits" (Teil 5 §28) zu verstoßen.

## Betrachtete Optionen
1. **Kompletter Neubau** auf Basis des PRD (neue Dateistruktur, neues Datenmodell, alles neu). Verworfen: widerspricht explizit Teil 3 §2 ("Migrationshaltung") und Teil 5 §40 (Anti-Pattern "Komplette index.html neu generieren").
2. **PRD nur als Referenzdokument behandeln, keine strukturellen Änderungen.** Verworfen: PRD ist laut Auftrag "ab sofort verbindliche Produktspezifikation", nicht optional.
3. **Phasenweise Adoption**: bestehende V31-A-E-Arbeit als Fundament behalten, PRD-Lücken (siehe Inventar §6) in benannten Phasen schließen, die sich an der Phasennummerierung des PRD orientieren (A0–A8 Architektur, M0–M10 Marktmonitor, D1–D8 Development-Manual-Einführung), aber an die reale Ausgangslage angepasst sind, da viele frühe Schritte bereits erledigt sind.

## Entscheidung
Option 3. Es wird **kein** neuer Branch-pro-Phase-Zoo im strengen PRD-Sinne (`claude/v31-<phase>-<slug>`) angelegt, sondern — konsistent mit der bereits etablierten und bewährten Praxis der Phasen A–E — ein Sammel-Branch `claude/v31-prd-implementation` mit einem atomaren Commit pro inhaltlicher Phase. Diese Abweichung von der wörtlichen Branch-Konvention in Teil 5 §14 wird hier bewusst dokumentiert: Sie reduziert Merge-Overhead für ein Einzelnutzer-Repository ohne parallele Reviewer und entspricht dem tatsächlich bereits erfolgreich genutzten Arbeitsmodus dieses Projekts.

Die konkrete Phasenfolge für die nächsten Implementierungsschritte wird in `docs/prd/PHASENPLAN.md` geführt und nach jeder abgeschlossenen Phase aktualisiert.

## Begründung
Ein Big-Bang-Rewrite würde das höchste PRD-Prinzip verletzen (Schutz produktiver Nutzerdaten und Businesslogik) und mehrwöchige Arbeit ohne Zwischenlieferung riskieren. Die phasenweise Fortsetzung des bereits laufenden Strangler-Patterns liefert nach jeder Phase einen deploybaren, getesteten Zustand — genau das vom PRD selbst geforderte Verhalten.

## Konsequenzen
- Positiv: Kontinuität mit bestehender Arbeit, kein Datenrisiko, jede Phase einzeln rückrollbar.
- Negativ: Die Codebasis bleibt vorerst eine Single-File-Anwendung; die in Teil 3 §40 skizzierte Modularisierung (`src/core/`, `src/domain/`, ...) wird nicht in Phase 0 umgesetzt, sondern erst wenn Datenverträge stabil sind (PRD-konform, siehe Teil 5 §16 Reihenfolge).
- Der PRD-Soll-Branchname (`claude/v31-<phase>-<slug>`) wird nicht wörtlich befolgt; diese Abweichung ist hiermit dokumentiert (Selbstverpflichtung aus Teil 5 §0: "Eine Abweichung muss ... dokumentiert werden").

## Verifikation
Jede Phase liefert: Playwright-Smoke-Test (Desktop+Mobile, alle Tabs), Screenshot-Vergleich gegen die Baseline in `docs/releases/`, sowie einen Phasenbericht nach dem Format aus Teil 5 §36.

## Rollback / Superseding
Der Branch `claude/project-analysis-audit-u1z1iu` (Stand vor diesem ADR) bleibt unverändert als Rückfallpunkt erhalten. Jeder Phasen-Commit auf `claude/v31-prd-implementation` ist einzeln revertierbar.
