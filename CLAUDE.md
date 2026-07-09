# Keim CRM Pro — Project Instructions

Single-file Vanilla-JS Makler-CRM (`kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html`, ~13.000 Zeilen). Primärer Nutzer: Kevin Keim, Main-Kinzig-Kreis. Wird auf Netlify öffentlich ausgeliefert.

Das verbindliche Master-PRD steht in `docs/prd/01` bis `05` (Produktstrategie, UX/Design, Architektur/Datenmodell, Marktmonitor/Karte, Development Manual). Bei jedem größeren Auftrag zuerst den relevanten Teil lesen, nicht raten. `docs/prd/00-ist-zustand-inventar.md` enthält das Storage-/API-Inventar der Codebasis.

## Product invariants (nicht verhandelbar)

- Alle `kk_*`-Storage-Keys und öffentlichen `window.KK_*`-APIs bleiben erhalten. Kein Key wird umbenannt, gelöscht oder semantisch umgedeutet ohne Adapter/Migration (siehe `docs/prd/00-ist-zustand-inventar.md` §3).
- Neue Storage-Keys folgen der bestehenden Backup-Konvention: Präfix `kk_`, `kkbib`, `kk11`, `kk12`, `kkref`, `kk[A-Z]`, `kkcrm`, `kkops`, `kkdom`, `kkprod` oder `__kk` (sonst wird der Key vom automatischen Backup nicht erfasst).
- Keine Fake-/Mock-Marktdaten als aktuelle Werte darstellen. Fehlende Daten zeigen einen ehrlichen Leerzustand.
- Keine API-Secrets oder Provider-Tokens in `index.html`, committeten Dateien oder Logs. Externe schlüsselpflichtige Quellen ausschließlich über Netlify Functions + Environment Variables.
- Keine zweite parallele Kartenengine, kein zweiter Markt-Store, kein zweites primäres CRM-Modul. Bestehende `KK_MAP`/`KK_DATA_CORE`/`KK_MARKET`-Verträge erweitern statt duplizieren.
- Personenbezogene Daten (exakte Privatadressen, Telefonnummern) nicht ungeschützt auf öffentlich sichtbaren Kartenlayern anzeigen.

## Workflow

- Explore vor Edit: betroffene IDs, Storage-Keys, KK_BOOT-Module und Initialisierungsreihenfolge suchen, bevor Code geändert wird.
- Bei mehreren betroffenen Bereichen zuerst einen kurzen Plan schreiben (Sequenz, Schnittstellen, Tests, Rollback).
- Vor größeren Änderungen: `git status --short` dokumentieren, bei Bedarf Baseline-Screenshots (Desktop 1440, Mobile 390) erzeugen.
- Nach Auftragsfreigabe direkt weiterarbeiten; nur bei einem echten Blocker anhalten (fehlende Zugangsdaten, Lizenzfrage, irreversible Migration, echter PRD-Widerspruch).
- Vor jedem Commit die dokumentierten Smoke-Checks ausführen (siehe `.claude/rules/tests.md`).
- Kein Push auf `main`, kein Produktions-Deploy, keine kostenpflichtige Provider-Aktivierung ohne ausdrückliche Freigabe.

## Single-file safety (index.html)

- Datei nicht komplett neu formatieren, minifizieren oder als Ganzes neu generieren.
- Vor String-Ersetzung immer die Trefferanzahl zählen (`grep -c`); keine globale Ersetzung ohne Kollisionsprüfung.
- Nach jedem Änderungsblock den bearbeiteten Bereich erneut lesen und `git diff` prüfen.
- Spätere CSS-/Script-Schichten können frühere überschreiben (bekannt: ID-Selektor schlägt Klassen-Selektor auch bei `!important`). Bei unsichtbaren Änderungen zuerst per `getComputedStyle` prüfen, welche Regel tatsächlich gewinnt.
- `KK_APP_SHELL.REGISTRY` (~Zeile 11037) und `KK_V30_SHELL.tabs` (~Zeile 12706) sind zwei parallele Tab-Listen und müssen synchron gehalten werden, bis A1 (KK_NAV) sie konsolidiert.

## Tests

- Playwright-Smoke-Test deckt alle Haupttabs auf Desktop (1440) und Mobile (390) ab: keine Console-Errors, kein horizontaler Overflow, XSS-Regression grün. Skript-Vorlage siehe letzte Phasenberichte unter `docs/releases/` bzw. Session-Scratchpad.
- Änderungen an Karten-/Formular-/Tabellen-Komponenten immer mit echten (synthetischen) Datensätzen testen, nicht nur im Leerzustand — mehrere reale Bugs wurden erst mit befüllten Listen sichtbar.

## Documentation

- Architekturentscheidungen mit spürbarer Tragweite (Engine-Wechsel, neues Datenmodell, Provider-Integration) als ADR in `docs/adr/` dokumentieren (Vorlage: `docs/adr/ADR-TEMPLATE.md`).
- Jede abgeschlossene Phase bekommt einen Commit mit Testnachweis in der Commit-Message (siehe `docs/prd/05-claude-code-development-manual.md` §28/§36 für Format).
