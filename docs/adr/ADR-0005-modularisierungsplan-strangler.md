# ADR-0005: Modularisierungsplan für index.html (Strangler-Strategie)

## Status
Proposed

## Kontext

`index.html` ist 17.610 Zeilen / 2,2 MB, eine einzige Datei mit ~61 Inline-`<script>`-Blöcken. Kevins Auftrag (10-Phasen-Stabilisierungsphase, Phase 6) verlangt einen **risikoarmen** Modularisierungsplan — ausdrücklich **keine** Zerlegung der gesamten App in einem Schritt. Bindende Nebenbedingung: `kk_*`-localStorage-Keys, `window.KK_*`-APIs und alle Datenmigrationen dürfen nicht brechen (CLAUDE.md "Single-file safety", `.claude/rules/storage.md`).

Wichtiger Befund bei der Bestandsaufnahme: Die Datei ist **bereits logisch modular**, nur nicht physisch getrennt. Es existieren:
- **47 benannte `KK_BOOT.register(...)`-Module** mit fester Prioritätsreihenfolge (z. B. `crm-pro`, `followups`, `pipeline-kpi-cockpit`, `markt-tagesmonitor`, `p0-masterprompt-funktionen` … `p3-masterprompt-funktionen`, `official-gis`, `datasource-registry`, `app-shell`, `command-center`).
- **24 globale `window.KK_*`-APIs** als klare Modulgrenzen (`KK_STORE`, `KK_UTIL`, `KK_GEO`, `KK_GEOCODE`, `KK_BOOT`, `KK_CRM_PRO`, `KK_APP_SHELL`, `KK_NAV`, `KK_COMMAND_CENTER`, `KK_MAP`, `KK_REALMAP`, `KK_MARKET`, `KK_DATA_CORE`, `KK_OFFICIAL_GIS`, `KK_DATASOURCE_REGISTRY`, `KK_REPO`, `KK_MARKET_OBS`, `KK_MARKET_OBS_UI`, `KK_VALUATION`, `KK_MKK_MAP`/`_ZOOM`/`_PLAN`, `KK_UX`, `KK_CHART_FALLBACK_ACTIVE`).

Das ist die eigentliche gute Nachricht dieses Audits: Eine Zerlegung ist **kein Neubau**, sondern im Kern eine mechanische Verschiebung bereits sauber getrennter Module in eigene Dateien.

## Entscheidungstreiber
- Kein Funktionsverlust, keine Storage-/API-Brüche.
- Keine Downtime, jederzeit rollback-fähig (ein Commit = ein Modul).
- Verifizierbarkeit nach jedem Schritt (bestehende CI-Suite, Syntax-Check).
- Aufwand proportional zum Nutzen — nicht jedes der 47 Module muss isoliert werden, nur die, die eigenständige Wartungslast erzeugen.

## Betrachtete Optionen
1. **Big-Bang-Refactor** (gesamte Datei in einem Zug in ES-Module + Bundler zerlegen). Verworfen: hohes Risiko, widerspricht Kevins expliziter Vorgabe, in einer 17k-Zeilen-Datei ohne Tests pro Modul kaum sicher verifizierbar in einem Schritt.
2. **Keine Modularisierung, nur Dokumentation.** Verworfen: löst das Wartbarkeitsproblem nicht, Kevin verlangt explizit einen Plan mit Substanz.
3. **Strangler-Pattern: modulweise Auslagerung in eigene `<script src="module/*.js">`-Dateien, weiterhin ohne Bundler/Build-Schritt**, in Prioritätsreihenfolge nach Kopplungsgrad (lose gekoppelte Module zuerst). Gewählt.

## Entscheidung

Schrittweise Auslagerung, ein Modul pro Commit, in dieser Reihenfolge (lose gekoppelt/risikoarm → stark gekoppelt/risikoreich):

| Stufe | Modulgruppe | Beispiele (KK_BOOT-Namen) | Ziel-Datei(en) | Risiko |
|---|---|---|---|---|
| 0 (Vorstufe, bereits erledigt) | Core/Store/Utilities | `KK_STORE`, `KK_UTIL`, `KK_BOOT` selbst | bleibt vorerst inline (Bootstrap-Reihenfolge kritisch) | — |
| 1 | Reine Auswertungs-/Read-Only-Module ohne Schreibzugriff auf fremde Keys | `official-gis`, `datasource-registry`, `market-observations-ui` | `modules/gis/*.js` | niedrig |
| 2 | Netlify-Functions-Client-Layer | `KK_GEOCODE`, WMS-Aufrufe aus `official-gis` | `modules/services/*.js` | niedrig |
| 3 | Marktmonitor/GIS-Kern | `markt-tagesmonitor`, `marktanalyse`, `mkk-market-map`, `mkk-zoom-pan`, `mkk-area-plan`, `market-providers`, `realmap-v31` | `modules/market/*.js` | mittel (viele Interdependenzen zu `KK_MAP`) |
| 4 | CRM-Kern | `crm-pro`, `crm-kontakte`, `kontaktqualitaet` | `modules/crm/*.js` | mittel |
| 5 | Follow-ups | `followups` | `modules/followups/*.js` | niedrig-mittel |
| 6 | Pipeline | `pipeline-kpi-cockpit`, `reviews-und-pipeline-alerts`, `sales-machine`, `pipeline-intelligence-refresh` | `modules/pipeline/*.js` | mittel |
| 7 | Master-Prompt-Funktionsblöcke (P0-P3) | `p0-` bis `p3-masterprompt-funktionen` | `modules/funktionen/p{0-3}.js` | niedrig (bereits als generische, isolierte Karten-Engine gebaut) |
| 8 | App-Shell/Navigation | `app-shell`, `command-center`, `v30-designsystem-shell`, `v30-workspaces` | bleibt inline, zuletzt (höchste Kopplung, `KK_APP_SHELL.REGISTRY`/`KK_V30_SHELL.tabs`-Doppelliste zuerst durch KK_NAV konsolidieren, siehe CLAUDE.md) | hoch |

Pro Schritt: Code 1:1 in neue Datei verschieben (keine Umformulierung), per `<script defer src="modules/....js"></script>` **vor** dem verbleibenden Inline-Rest laden (gleiche Ausführungsreihenfolge wie bisher beibehalten, `KK_BOOT`-Prioritäten unverändert lassen), danach vollständige CI-Suite grün, danach erst nächstes Modul.

## Begründung

Die bestehende `KK_BOOT`-Registry mit expliziten Prioritäten macht Reihenfolge-Abhängigkeiten schon heute sichtbar und erzwingt sie zur Laufzeit — das ist exakt die Voraussetzung, die eine sichere Datei-Trennung braucht. Ohne Bundler zu arbeiten (reine zusätzliche `<script src>`-Tags) vermeidet ein neues Build-Toolchain-Risiko in einer Phase, die explizit Stabilität statt neuer Infrastruktur verlangt.

## Konsequenzen

**Positiv:** Kleinere, einzeln testbare Dateien; Diffs pro Feature-Änderung kleiner und nachvollziehbarer; CSP-`unsafe-inline` für `script-src` könnte langfristig durch dateibasierte Skripte + Hashes ersetzt werden (separates zukünftiges ADR).

**Negativ/Aufwand:** Jeder Schritt braucht vollen Regressionstest (bestehende CI deckt das ab, siehe Phase 7). Netlify-Deploy muss neue `modules/*.js`-Pfade mit ausliefern (kein Funktionsänderung an `netlify.toml` nötig, `publish="."` deckt neue Unterordner automatisch ab).

**Nicht Teil dieses ADRs:** Migration auf einen Bundler/TypeScript — das wäre ein eigenes, deutlich größeres ADR mit eigener Kosten-Nutzen-Abwägung, hier bewusst nicht empfohlen, solange die App ohne Build-Schritt direkt als `index.html` auf Netlify läuft.

## Verifikation
Nach jedem ausgelagerten Modul: `node --check` auf die neue Datei, vollständige `npm run test:functions` + alle 11 E2E-Dateien (Desktop 1440 + Mobile 390), manueller Kurztest der betroffenen Haupttabs mit befüllten synthetischen Daten (nicht nur Leerzustand, siehe `.claude/rules/tests.md`).

## Rollback / Superseding
Jeder Auslagerungsschritt ist ein einzelner, für sich revertierbarer Commit (`git revert`) — kein Big-Bang-Rollback nötig. Falls sich das Muster nach den ersten 1-2 Modulen als zu riskant erweist (z. B. Ladereihenfolge-Bugs, die die bestehende CI nicht fängt), kann die Strategie jederzeit gestoppt werden, ohne bereits ausgelagerte Module zurückzubauen — sie bleiben als eigenständige, funktionierende Dateien bestehen.
