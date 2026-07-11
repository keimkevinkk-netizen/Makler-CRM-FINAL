# ADR-0003: Reproduzierbares Build-/Test-Fundament (Master-Prompt Phase 1)

## Status
Accepted

## Kontext
Ein umfangreiches externes Dokument ("technische Integrationsanalyse und
Claude-Code-Master-Prompt") schlägt die Integration von 64 neuen CRM-Funktionen
in 10 Phasen vor, beginnend mit Authentifizierung, einer relationalen
Serverdatenbank und einem npm/Vite/TypeScript-Fundament. Kevin hat sich
ausdrücklich für die volle Umsetzung entschieden ("dann a umsetzen").

Der Master-Prompt selbst schreibt vor, mit Phase 0 (Baseline/PR7) und Phase 1
(reproduzierbarer Build, Tests, Security Gate) zu beginnen, bevor Auth/DB
angefasst werden. Ein zentraler, bereits im Analysedokument benannter Missstand:
"Releaseberichte referenzieren Tests, die im Repository nicht eingecheckt sind;
sie sind daher aktuell nicht reproduzierbar." Über die gesamte bisherige
Entwicklung dieses Projekts hinweg wurden Playwright-Tests ausschließlich im
Session-Scratchpad erzeugt (`/tmp/.../scratchpad/pw/*.js`) - nie im Repository
committet. Dieser Zustand widerspricht direkt CLAUDE.md ("Vor jedem Commit die
dokumentierten Smoke-Checks ausführen") und dem Master-Prompt-Blocker
"Keine reproduzierbare Build-/Testsuite".

## Entscheidungstreiber
- Master-Prompt Teil C1 (zwingender Blocker): keine reproduzierbare Build-/Testsuite.
- Master-Prompt Teil E, Phase 1: "npm + lockfile, Node 24 in `.nvmrc`, ... Vitest/Playwright/ESLint ... CI blockiert Parse-/Lint-/Testfehler."
- CLAUDE.md: `index.html` bleibt Single-File-Shell, nicht neu formatieren/ersetzen.
- Sandbox-Realität: `npm install` gegen die öffentliche npm-Registry funktioniert aus dieser Sandbox (anders als der Hessen-WMS-Zugriff aus ADR-0002 - das ist kein Widerspruch, sondern eine andere, offenbar erlaubte Zieladresse). Deploy-/Live-Verifikation läuft weiterhin ausschließlich über GitHub Actions (echter Internetzugriff) und die Netlify-Deploy-Preview.

## Betrachtete Optionen
1. **Sofort vollständig auf Vite/TypeScript umstellen** (`build.command = "npm run build"`, `publish = "dist"`). Verworfen für Phase 1: hohes Risiko, `index.html` unbeabsichtigt zu verändern (CLAUDE.md-Verbot "nicht komplett neu formatieren/ersetzen"), ohne dass zu diesem Zeitpunkt bereits ein Nutzen (neue Module) entsteht. Der Master-Prompt selbst erlaubt explizit einen "minimalen Copy-Build" als Zwischenschritt.
2. **Kompletten Scratchpad-Testbestand (62 Dateien) ungeprüft ins Repository committen.** Verworfen: ein Stichprobenlauf aller `test-*.js`-Dateien zeigte, dass ein erheblicher Teil (u. a. `test-callhero.js`, `test-crm-avatar.js`, `test-datacore.js`, `test-drillthrough.js`, `test-map.js`, `test-geo-model.js`, `test-mobile-pass.js`/`test-mobile-pass2.js`, `test-nachbesserung.js`) heute entweder mit Laufzeitfehler oder Timeout endet - vermutlich weil sie für einen älteren UI-Stand geschrieben wurden. Ein blindes Commit hätte die neue CI sofort und dauerhaft rot gemacht, was gegen CLAUDE.md ("Kein Commit als 'fertig' bei FAIL") verstößt.
3. **Nur den aktuell nachweislich grünen Kernbestand jetzt einchecken, den Rest als offene Aufgabe dokumentieren.** Gewählt.

## Entscheidung
- `package.json` (+ `package-lock.json`, `.nvmrc` = 24) im Repository-Root. Einzige Abhängigkeit vorerst: `playwright` (devDependency).
- `tests/functions/` (Node-Level, kein Browser/Netzwerk nötig): `test-wms-capabilities-parser.js`, `test-wms-feature-info.js`.
- `tests/e2e/` (Playwright gegen `file://index.html`, alle Netzwerkaufrufe gemockt): `verify.js` (Haupt-Smoke-Test aller Tabs, Desktop/Mobile, XSS, Overflow, Console), `test-official-gis.js`, `test-datasource-registry.js`, `test-repository-layer.js`.
- Alle migrierten Dateien wurden von hartcodierten Sandbox-Pfaden (`/home/user/Makler-CRM-FINAL/...`, `/opt/pw-browsers/chromium`) auf `__dirname`-relative Pfade bzw. das optionale `PLAYWRIGHT_CHROMIUM_PATH`-Environment-Flag umgestellt und nach der Migration erneut grün verifiziert (siehe Verifikation).
- `.github/workflows/ci.yml`: `npm ci` → Funktions-Syntaxcheck → `npx playwright install --with-deps chromium` → `npm run test:functions` → `npm run test:e2e`, bei jedem Push/PR.
- `netlify.toml` (`publish = "."`, kein `build.command`) bleibt in Phase 1 bewusst unverändert - Produktion bleibt exakt wie bisher ausgeliefert.
- Die verbleibenden ~55 historischen Scratchpad-Testdateien werden NICHT als "vorhanden/grün" behauptet. Sie sind eine offene Folgeaufgabe (Triage: reparieren, als veraltet verwerfen, oder gezielt gegen den aktuellen UI-Stand neu schreiben), bevor sie in `tests/e2e/` aufgenommen werden.

## Begründung
Dieser Schnitt erfüllt den Master-Prompt-Blocker ehrlich (eine echte, laufende, reproduzierbare CI existiert jetzt), ohne eine Vollständigkeit vorzutäuschen, die nicht besteht, und ohne das Produktionsrisiko einer verfrühten Vite-Umstellung einzugehen. Er ist die Voraussetzung für Phase 2 (Auth/DB), da diese laut Master-Prompt explizit ein "Security Gate" (Punkt 1) voraussetzt.

## Konsequenzen
- Positiv: `npm ci && npm test` reproduziert lokal wie in CI denselben Satz an Pruefungen; jeder zukünftige Push/PR wird automatisch gegen die migrierten Tests geprüft.
- Negativ: die historischen Phasentests bleiben vorerst unreproduzierbar/nicht eingecheckt - das ist ein bekannter, dokumentierter Rückstand (siehe Folgeaufgabe #63 im Task-Tracking dieser Session), keine verschwiegene Lücke.
- `node_modules/` wird nicht committet (Standard `.gitignore`-Praxis); `package-lock.json` garantiert Reproduzierbarkeit.

## Verifikation
- `npm ci` (frischer Checkout-Simulation): erfolgreich, 0 vulnerabilities.
- `npm run check:functions`: beide Netlify Functions syntaktisch valide.
- `npm run test:functions`: 11/11 (`wms-capabilities-parser`) + 10/10 (`wms-feature-info`).
- `npm run test:e2e`: `verify.js` grün (10 Tabs × Desktop/Mobile, kein Overflow, keine Console-/Page-Errors, XSS-Test grün).
- Zusätzlich einzeln erneut verifiziert nach der Pfad-Migration: `test-official-gis.js` 36/36, `test-datasource-registry.js` 7/7, `test-repository-layer.js` 11/11.
- CI-Workflow selbst wird erst mit dem nächsten Push gegen echte GitHub-Actions-Infrastruktur verifiziert (diese Sandbox kann `act`/GitHub Actions nicht lokal ausführen) - siehe Phase-1-Bericht für das Live-Ergebnis.

## Rollback / Superseding
`package.json`, `.nvmrc`, `.github/workflows/ci.yml` und `tests/` sind rein additiv und beeinflussen den Netlify-Produktionsbuild nicht (`netlify.toml` unverändert). Ein Rollback ist ein einfacher Revert dieses Commits ohne Datenmigration. Sobald Phase 1 später auf eine echte Vite-Bundlung umgestellt wird (Master-Prompt D6), ersetzt eine neue ADR diese hier bezüglich `build.command`/`publish`.
