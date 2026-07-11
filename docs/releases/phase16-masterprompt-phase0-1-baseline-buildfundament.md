# Phase 16 (Master-Prompt Phase 0+1): Baseline & Build-/Test-Fundament

**Datum:** 11.07.2026
**Auftrag:** Externes Dokument "technische Integrationsanalyse und Claude-Code-Master-Prompt" (64 Funktionen, 10 Phasen). Kevin: "dann a umsetzen" - vollständige Umsetzung wie im Dokument beschrieben, beginnend mit der dort vorgeschriebenen Reihenfolge (Phase 0 Baseline → Phase 1 Build/Test → Phase 2 Auth/DB → ...).

## Master-Prompt Phase 0: Baseline

| Prüfpunkt | Befund (11.07.2026, diese Sitzung) |
|---|---|
| Branch | `claude/project-analysis-audit-u1z1iu`, sauber, keine uncommitteten Änderungen vor Sitzungsbeginn |
| Letzter Commit vor dieser Phase | `d9e195d` (Fix 3: BORIS/ALKIS GetFeatureInfo nach externem Live-Testbefund) |
| PR #7 | weiterhin offen, `main` unverändert, Deploy Preview ready (`https://deploy-preview-7--maklercrm.netlify.app`), noch keine Rückmeldung von Kevin zum dritten Fix-Commit |
| Screenshots von Kevin (IMG_2399-2401) | zeigen `maklercrm.netlify.app` = **Produktion**, nicht die PR-#7-Preview. Zeigen das bestehende "Datensatz-Ebenen"-Panel (Objekte/Eigentümer/Käufer/Leads/Tippgeber/Verkaufschancen/Verkäufe) - erwartungsgemäß ohne das neue "Amtliche Layer"-Panel, da PR #7 dort noch nicht gemergt ist. Bestätigen NICHT den BORIS/ALKIS-Fix; das steht weiterhin aus. |
| Netlify-Produktion | unverändert, kein Deploy in dieser Phase |
| Sandbox-Netzwerk | `npm install` gegen die öffentliche npm-Registry funktioniert (anders als der in ADR-0002 belegte Block gegen Hessen-WMS-Hosts) - kein Widerspruch, andere Zieladresse |

**Entscheidung:** PR #7 bleibt offen und unverändert bis Kevins Live-Bestätigung; kein blindes Merge. Master-Prompt-Arbeit läuft auf demselben Branch weiter (kein zusätzlicher Branch-Wechsel, da PR #7 ohnehin der aktuelle Arbeitsstand ist und keine widersprüchliche Historie hat).

## Master-Prompt Phase 1: Reproduzierbarer Build, Tests, Security Gate (Teilumsetzung)

Vollständiger Kontext und Alternativenabwägung: `docs/adr/ADR-0003-build-test-fundament-master-prompt-phase1.md`.

### Neu

- `package.json`, `package-lock.json`, `.nvmrc` (Node 24), `.gitignore`.
- `.github/workflows/ci.yml`: läuft bei jedem Push/PR - `npm ci` → Funktions-Syntaxcheck → Playwright-Chromium-Install → Node-Level-Tests → E2E-Smoke-Suite.
- `tests/functions/test-wms-capabilities-parser.js`, `tests/functions/test-wms-feature-info.js` (Node-Level, kein Netzwerk).
- `tests/e2e/verify.js`, `tests/e2e/test-official-gis.js`, `tests/e2e/test-datasource-registry.js`, `tests/e2e/test-repository-layer.js` (Playwright gegen `file://index.html`, Netzwerk gemockt) - erstmals aus dem Session-Scratchpad ins Repository übernommen und von hartcodierten Sandbox-Pfaden auf portable `__dirname`-Pfade umgestellt.

### Bewusst NICHT in dieser Phase

- Keine Umstellung von `netlify.toml` (`publish = "."` bleibt) - kein Vite-Build, um die Produktionsauslieferung nicht zu gefährden, bevor ein echter Nutzen (neue Module) entsteht. Siehe ADR-0003, Option 1 (verworfen).
- Kein ESLint/Vitest - folgt in einer der nächsten Phasen, um diesen Commit fokussiert zu halten.
- ~55 ältere Scratchpad-Testdateien wurden NICHT übernommen - ein Stichprobenlauf zeigte, dass ein erheblicher Teil heute fehlschlägt oder in Timeout läuft (vermutlich veralteter UI-Stand). Siehe Folgeaufgabe (Task-Tracking #63).

### Tests

- `npm ci`: erfolgreich, 0 vulnerabilities.
- `npm run check:functions`: beide Netlify Functions syntaktisch valide.
- `npm test` (= `test:functions` + `test:e2e`): `wms-capabilities-parser` 11/11, `wms-feature-info` 10/10, `verify.js` (10 Tabs × Desktop 1440/Mobile 390, kein horizontaler Overflow, keine Console-/Page-Errors, XSS-Regression grün).
- Einzeln erneut verifiziert nach der Pfad-Migration: `test-official-gis.js` 36/36, `test-datasource-registry.js` 7/7, `test-repository-layer.js` 11/11.
- CI-Workflow selbst: Verifikation erfolgt erst mit dem nächsten Push gegen echte GitHub-Actions-Infrastruktur (lokal in dieser Sandbox nicht ausführbar).

### Status

PASS WITH NOTES - Kernfundament steht und ist grün; historische Testabdeckung ist eine offene, dokumentierte Folgeaufgabe statt einer verschwiegenen Lücke.

### Nächster Schritt

Master-Prompt Phase 2 (Auth + Datenbank) - der nächste laut vorgeschriebener Reihenfolge. Das ist die erste Phase mit echtem, irreversiblem Charakter (Netlify Identity/Datenbank-Aktivierung, ggf. kostenpflichtig) und wird vor jeder Aktivierung mit Kevin abgestimmt (CLAUDE.md: "keine kostenpflichtige Provider-Aktivierung ohne ausdrückliche Freigabe").
