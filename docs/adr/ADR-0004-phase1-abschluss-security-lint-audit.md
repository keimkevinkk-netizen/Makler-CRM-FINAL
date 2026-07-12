# ADR-0004: Phase-1-Abschluss (Security-Header, Lint, Audit-Gate) — Vite/TS weiterhin bewusst zurückgestellt

## Status
Accepted

## Kontext
Kevin hat den Master-Prompt ("technische Integrationsanalyse und Claude-Code-Master-Prompt", 64 Funktionen, Phasen 0–10) als verbindlichen Zielkatalog bestätigt und ausdrücklich verlangt: alles seriös ohne weitere Entscheidung Umsetzbare umsetzen, nichts als erledigt markieren was es nicht ist, keine Mocks. ADR-0003 hatte Phase 1 ("Reproduzierbarer Build, Tests, Security Gate") nur teilweise abgeschlossen: npm/Lockfile/Node 24/CI/Playwright-Suite standen, aber Vite-Build, Vitest, ESLint und Security-Header fehlten noch — im Master-Prompt-Dokument (Teil A5, D6) explizit als Lücke benannt.

## Entscheidungstreiber
- Master-Prompt Teil E, Phase 1: "npm + lockfile, Node 24 in `.nvmrc`, ... Vitest/Playwright/ESLint ... CI blockiert Parse-/Lint-/Testfehler", Teil D6: "Sicherheitsheader: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, Frame-Schutz".
- CLAUDE.md (übergeordnet, verbindlich): `index.html` bleibt Single-File-Shell, "nicht komplett neu formatieren, minifizieren oder als Ganzes neu generieren".
- .claude/rules/security.md: "CSP-Änderungen minimal halten ... keine pauschale Lockerung".

## Betrachtete Optionen
1. **Vollständige Vite-/TypeScript-Umstellung jetzt nachholen** (`build.command`, `publish = "dist"`, Skript-Extraktion aus `index.html`). Verworfen: würde zwangsläufig die 17.000-Zeilen-`index.html` mit 52 Inline-Skripten anfassen/umstrukturieren, bevor auch nur ein neues Fachmodul (Phase 3+) diesen Umbau tatsächlich braucht — genau das von CLAUDE.md verbotene "komplett neu formatieren" und ein hohes Regressionsrisiko ohne aktuellen Gegenwert. Diese Entscheidung war schon in ADR-0003 getroffen und bleibt unverändert richtig.
2. **Nur Security-Header, ESLint (für `netlify/functions/` + `tests/`, nicht `index.html`) und ein `npm audit`-CI-Gate ergänzen, den Rest explizit im Backlog dokumentieren.** Gewählt.
3. **Lücke stillschweigend als "Phase 1 fertig" führen.** Verworfen: verstößt direkt gegen Kevins Anforderung, nichts als erledigt zu markieren, was es nicht ist.

## Entscheidung
- `netlify.toml`: neuer `[[headers]]`-Block mit `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()` (alle fünf Berechtigungen laut Grep-Prüfung nirgends im Code verwendet, daher risikofrei deaktivierbar). Bestehende CSP-Meta in `index.html` bleibt unverändert.
- `eslint.config.js` (Flat Config, ESLint 9): deckt `netlify/functions/**/*.js` und `tests/**/*.js` ab, mit getrennten Globals-Sätzen für Node- und Browser-Kontext (Playwright-`page.evaluate()`-Closures laufen im Browser). `index.html` bewusst **nicht** gelintet (siehe Kontext).
- `package.json`: neues Skript `lint`; CI (`ci.yml`): neue Schritte `Lint` und `Dependency audit (fails on high/critical)` (`npm audit --audit-level=high`).
- Vite/TypeScript/Vitest bleiben explizit **nicht** umgesetzt und stehen im Backlog (`docs/prd/08-masterprompt-backlog.md`) mit der hier genannten Voraussetzung (erst wenn ein echtes neues Fachmodul eine Modulgrenze tatsächlich braucht).

## Begründung
Damit ist jede der vier in Phase 1 verlangten Eigenschaften ("Build reproduzierbar", "Tests automatisiert", "Lint blockiert", "Security-Header gesetzt") entweder erfüllt oder mit einer nachvollziehbaren, dokumentierten Begründung zurückgestellt — keine stille Lücke.

## Konsequenzen
- Positiv: `npm run lint` und `npm audit` laufen jetzt bei jedem Push/PR; drei Standard-Security-Header sind produktiv aktiv, ohne dass die App-CSP angefasst wurde.
- Negativ: `index.html` selbst bleibt ungelintet; das bleibt eine bekannte, im Backlog geführte Lücke statt eines verschwiegenen Zustands.
- `node_modules/eslint` wird nicht committet (`.gitignore` erfasst `node_modules/` bereits); `package-lock.json` aktualisiert.

## Verifikation
- `npm run check:functions`, `npm run lint` (0 Fehler, 4 harmlose Warnungen in leeren `catch(e)`-Blöcken), `npm audit --audit-level=high` (0 Schwachstellen) — lokal grün.
- Volle E2E-Regression (`npm run test:e2e:full`) nach dieser Änderung erneut grün (siehe Commit-Testnachweis).
- CI-Workflow-Erweiterung wird mit dem nächsten Push gegen echte GitHub-Actions-Infrastruktur verifiziert.

## Rollback / Superseding
`eslint.config.js`, das `lint`-npm-Skript und die beiden neuen CI-Schritte sind rein additiv und lassen sich ohne Datenauswirkung entfernen. Der `[[headers]]`-Block in `netlify.toml` ist ein einfacher Revert ohne Migrationsschritt. Sobald ein echtes neues Fachmodul eine Vite-/TS-Modulgrenze braucht, ersetzt eine neue ADR diese hier bezüglich Build-Tooling.
