# Phase 17 — Abschlussbericht: BORIS/ALKIS-Connector, DataSourceRegistry, Repository-Layer, CI-Fundament

Status: **PASS** (CI grün seit Commit `87660e3`) · PR: [#7](https://github.com/keimkevinkk-netizen/Makler-CRM-FINAL/pull/7) `claude/project-analysis-audit-u1z1iu` → `main`, **offen, ungemerged**

Dieser Bericht fasst zusammen, was im Rahmen des Master-PRD-Auftrags (14 Bände/Anhänge) tatsächlich in PR #7 umgesetzt wurde und was bewusst nicht umgesetzt oder zurückgestellt wurde.

---

## 1. Was hinzugefügt wurde

### 1.1 BORIS/ALKIS Amtliche-Geodaten-Connector
- Zwei Netlify Functions als SSRF-sichere, allowlisted Proxies: `netlify/functions/wms-capabilities.js` (GetCapabilities) und `wms-feature-info.js` (GetFeatureInfo).
- Neues Client-Panel „Amtliche Layer" im Marktmonitor (`window.KK_OFFICIAL_GIS`, Modul `official-gis`).
- Layer werden **automatisch aus der echten GetCapabilities-Antwort erkannt** — keine hartcodierten Layernamen.
- Stack-basierter Parser für verschachtelte WMS-Layer-Bäume (behebt Kevins Live-Testbefund: ALKIS verband sich, fand aber keinen Layer).
- Scoring-basierte automatische Layer-Auswahl inkl. Jahres-Tie-Breaker (BORIS: 12 Jahr/Rollen-Kombinationen korrekt aufgelöst) und Ambiguitäts-Picker mit menschenlesbaren Titeln, wenn zwei Layer nahe beieinander liegen.
- Trennung Overlay-Layer vs. Query-Layer (behebt „LayerNotDefined"-Fehler aus dem externen Live-Test: die sichtbare „-Zonen"-Ebene ist nicht abfragbar, „-Info" schon).
- Freundliche Feldbeschriftungen im GetFeatureInfo-Popup (Gemarkung, Flur, Flurstücksnummer, amtliche Fläche, Bodenrichtwert €/m², Stichtag, Nutzungsart, Entwicklungszustand).
- Eigentümerdaten werden serverseitig/clientseitig nie anzeigt, selbst wenn ein Dienst sie liefern würde.

### 1.2 DataSourceRegistry
- `window.KK_DATASOURCE_REGISTRY` mit den in Anhang A7 geforderten Pflichtfeldern für alle 4 Quellen (Nominatim, OSM-Tiles, BORIS, ALKIS).
- Eigenes Panel zeigt ehrlich „live" vs. „konfiguriert, nicht verbunden" — keine vorgetäuschten Live-Werte.

### 1.3 Repository-Abstraktionsschicht
- `window.KK_REPO` (additiv) für Objekte, Kontakte, Tippgeber, Marktbeobachtungen, Bewertungen.
- Schreibt/liest nachweislich dieselbe Storage-Quelle wie der bestehende Code — kein zweiter Datenpfad, kein zweiter Wahrheitsspeicher.
- Bereitet die spätere Migration auf ein echtes Backend vor (Ziel laut ADR-0001: PostgreSQL/PostGIS via REST-API), ohne dass heute schon irgendetwas aktiviert oder umgestellt wurde.

### 1.4 Build-/Test-Fundament (Master-Prompt Phase 0+1)
- `package.json`, Lockfile, `.nvmrc` (Node 24).
- GitHub-Actions-CI-Workflow (`.github/workflows/ci.yml`) — Syntax-Check der Functions, Function-Level-Tests, 6 einzelne E2E-Schritte.
- Vollständige, eingecheckte Playwright-Testsuite unter `tests/e2e/` (vorher nur lose Scratchpad-Skripte).

### 1.5 Schema-Registry & Dokumentation
- `docs/prd/schema-registry.json` (v2, 74 Keys) — formales, maschinenlesbares Inventar aller `kk_*`-Storage-Keys.
- `docs/prd/06-schema-registry.md`, `docs/prd/07-datenquellen-lizenz-registry.md`.
- ADR-0002 (Beweis: diese Entwicklungs-Sandbox hat keinerlei ausgehenden Netzwerkzugriff — curl, WebFetch und sogar der Playwright-Testbrowser selbst wurden mit Kontrolltests gegen Wikipedia/example.com verifiziert).
- ADR-0003 (Build-/Testfundament).

### 1.6 Echte Produktivbugs gefunden und behoben
Diese wurden **nicht** durch Kevins manuellen Test gefunden, sondern durch die neu aufgebaute CI-Pipeline selbst aufgedeckt:
- **Chart.js „Canvas is already in use"-Fehler im Marktmonitor**: Zwei unabhängige Boot-Module rendern auf denselben Chart-Canvas mit getrennter, sich nicht kennender Buchhaltung. Das ältere Modul prüfte nur seine eigene Liste statt Chart.js' globaler Registry — behoben, mit eigenem Regressionstest (`test-chart-canvas-reuse.js`).
- ALKIS-Layer-Erkennung bei verschachtelten Capabilities (siehe 1.1).
- BORIS/ALKIS-GetFeatureInfo-Fixes aus externen Live-Testbefunden (siehe 1.1).

### 1.7 Testinfrastruktur & CI-Härtung
- 6 E2E-Testdateien laufen seit Commit `87660e3` vollständig und reproduzierbar in echtem GitHub-Actions-CI grün (vorher: nur lokal in dieser Sandbox verifizierbar).
- `::error::`-GitHub-Actions-Annotationen als Diagnosekanal etabliert (nötig, da direkter Zugriff auf rohe CI-Logs in dieser Session nicht möglich war).
- Test lädt bei netzwerkabhängigen Prüfungen jetzt über einen echten lokalen `http://`-Server statt `file://` (umgeht eine CSP-Grauzone, ohne die App-CSP selbst zu lockern).

---

## 2. Was NICHT hinzugefügt wurde

1. **Zugriffsschutz für die öffentliche URL (Phase 5)** — bewusst blockiert. Es existiert noch keine Entscheidung/Strategie von Kevin; bis dahin werden keine zusätzlichen personenbezogenen Echtdaten-Layer freigeschaltet (siehe ADR-0000, `.claude/rules/netlify.md`).
2. **Netlify Identity / echte Datenbank (Phase 2)** — bewusst zurückgestellt, wie von Kevin explizit angewiesen („kostenpflichtige bzw. schwer rückgängig zu machende Funktionen verschiebst du, bis ich Zeit habe"). Die Repository-Schicht (1.3) bereitet dies vor, aktiviert aber nichts.
3. **Echte Live-Verbindung der BORIS-/ALKIS-Endpunkte aus der Entwicklungs-Sandbox heraus** — technisch unmöglich (ADR-0002: kein ausgehender Netzwerkzugriff). Alle 36 Tests in `test-official-gis.js` laufen gegen gemockte Serverantworten, nicht gegen die echten Hessen-Dienste.
4. **Kevins eigene Live-Verifikation von BORIS/ALKIS auf der aktuellen Deploy-Preview** — steht noch aus. Seine letzten drei Screenshots zeigten die **Produktions-URL**, nicht `deploy-preview-7--maklercrm.netlify.app`; das ist also keine Bestätigung der in dieser PR enthaltenen Fixes.
5. **Absicherung von `mkChart`/`mk` (zwei weiteren Chart.js-Hilfsfunktionen ohne Canvas-Reuse-Schutz)** — bewusst nicht nachgerüstet. Geprüft: beide werden pro Canvas-ID genau einmal in einem Boot-once-Modul ohne Tab-Wechsel-Re-Render aufgerufen, es gibt also aktuell kein Kollisionsrisiko. Eine Absicherung „auf Vorrat" hätte gegen die Projektregel verstoßen, keine Fehlerbehandlung für nicht eintretende Szenarien einzubauen.
6. **Merge in `main` / Produktions-Deploy** — PR #7 bleibt offen. Kein Push auf `main`, kein Produktions-Deploy ohne ausdrückliche Freigabe (siehe `.claude/rules/netlify.md`).
7. **Aktivierung kostenpflichtiger Provider** — keine.

---

## 3. Offene Punkte (warten auf Kevin)

- Live-Retest von BORIS/ALKIS auf `https://deploy-preview-7--maklercrm.netlify.app` (Checkliste steht bereits in der PR-Beschreibung).
- Entscheidung Phase 5 (Zugriffsschutz öffentliche URL).
- Entscheidung Phase 2 (Identity/Datenbank), sobald Zeit dafür ist.

---

## 4. Testnachweis

- `verify.js` (10 Tabs × Desktop 1440 / Mobile 390, XSS, Overflow, Console) — grün
- `test-official-gis.js` — 36/36
- `test-datasource-registry.js` — 7/7
- `test-repository-layer.js` — 11/11
- `test-a11y-focus-restore.js` — 6/6
- `test-chart-canvas-reuse.js` — 3/3
- Alle 6 Dateien seit Commit `87660e3` zusätzlich in echtem GitHub-Actions-CI bestätigt (nicht nur lokal).
