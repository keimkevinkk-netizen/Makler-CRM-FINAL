# Phase 22 — Stabilisierung: Bestandsaufnahme, Security-Hardening, Blocker-Liste, Abschlussbericht (Phase 1-10)

Auftrag: "Technische Stabilisierung, Sicherheitsprüfung und Architekturverbesserung von maklercrm" (Kevin, 10-Phasen-Arbeitsauftrag). Branch: `claude/stabilisierung-security-audit`.

## Phase 1 — Bestandsaufnahme

### 1.1 Repo-Zustand vs. Live-Deploy

- `main` HEAD: `09e4fc6f4607522f140a8bd8cf0c656a73215f67` ("Merge PR #8: Master-Prompt P0-P3 (64 Funktionen) + Phase-1-Abschluss").
- Live-Deploy (Netlify-API, `get-deploy-for-site`, siteId `cfa55ac0-3b69-4c92-8328-4c4d96c4b3ef`, deployId `6a53a7ff24fdb90008796c2a`): `commit_ref: 09e4fc6f4607522f140a8bd8cf0c656a73215f67`, `context: production`, `state: ready`, `branch: main`, `deploy_source: api` (Auto-Publish-Deploy nach Merge).
- **Ergebnis: Live = main, exakt.** Kein Drift zwischen Produktion und Repo.

### 1.2 Zugriffsschutz (Kevins Punkt 1)

- Netlify-API (`get-project`/`get-projects`, siteId `cfa55ac0-...`): `projectAccessControls: {requiresPassword: false, requiresSSOTeamLogin: false}`.
- `primarySiteUrl: http://maklercrm.netlify.app` — **öffentlich, ohne jeden Zugriffsschutz.**
- **Status: bestätigt kritisch.** Siehe Phase 2 (Entscheidungsvorlage).

### 1.3 Environment Variables (Kevins Punkt 2)

- Netlify-API (`manage-env-vars`, `getAllEnvVars: true`) auf dem Live-Projekt: Rückgabe `[]`.
- **Es ist buchstäblich keine einzige Env-Var gesetzt** — nicht nur `NOMINATIM_CONTACT` fehlt, sondern der gesamte Env-Var-Bereich ist leer.
- **Status: bestätigt kritisch für den Geocoder** (siehe Phase 3), unkritisch für alles andere, da aktuell keine weiteren schlüsselpflichtigen Provider live geschaltet sind.

### 1.4 Codebase-Umfang (Kevins Punkt 3)

- `index.html`: 17.610 Zeilen, 2,2 MB.
- `innerHTML`-Vorkommen: 223.
- `confirm(`-Vorkommen: 15.
- `alert(`-Vorkommen (Wortgrenze, ohne z. B. `alertBox`): 6.
- **Status: bestätigt, langfristige Architekturarbeit** (siehe Phase 6 — Modularisierungsplan, kein Big-Bang-Refactor).

### 1.5 CSP / externe Abhängigkeiten (Kevins Punkt 4/6)

- CSP-Meta-Tag (Zeile 6): `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com`; `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com`.
- Externe CDN-Skripte: Chart.js (statisch, Zeile 38), Leaflet + Leaflet.markercluster (dynamisch via `loadScriptOnce()`, ~Zeile 14971).
- **Neuer, bisher nicht dokumentierter Fund:** Keines der drei CDN-Skripte hat ein `integrity`-Attribut (Subresource Integrity). Echtes, konkretes Supply-Chain-Risiko — wenn cdnjs kompromittiert würde, gäbe es keinen Schutz. Sicher und ohne Kevins Entscheidung behebbar (reine Ergänzung von Hashes, keine Verhaltensänderung). → Phase 4.
- Google-Fonts-`@import` ist 3× dupliziert (Zeile 72, 10082, 10733) — kosmetisch/Performance, keine Sicherheitsrelevanz. → Phase 6/Backlog.
- **Status: CSP selbst ist bereits vergleichsweise eng** (kein `*`, keine fremden Script-Hosts außer cdnjs); `unsafe-inline` ist bei einer 17k-Zeilen-Single-File-App mit Inline-Handlers aktuell nicht ohne größeres Nonce-/Hash-Refactoring entfernbar → wichtig-nicht-akut, kein Schnellschuss.

### 1.6 native confirm/alert (Kevins Punkt 5)

- 15× `confirm(`, 6× `alert(` — Bestandsaufnahme für Phase 5. Einzelprüfung nötig (nicht pauschal ersetzen), da einige `confirm()`-Aufrufe bereits Teil des bestehenden Gate-Patterns sind (z. B. #55/#30 Qualitäts-/Preisaktions-Gate) und funktional korrekt sind.

### 1.7 Tests/CI (Kevins Punkt 7)

`.github/workflows/ci.yml` deckt bereits ab: `check:functions` (Syntax), `lint` (ESLint), `npm audit --audit-level=high`, `test:functions` (Unit), sowie 11 einzelne E2E-Schritte inkl. `verify.js` (Haupttabs Desktop+Mobile, XSS-Regression, horizontaler Overflow). **Kevins Phase-7-Anforderungen sind in der CI bereits strukturell erfüllt** — kein Neubau nötig, nur Verifikation + Dokumentation (Phase 7 unten).

### 1.8 Einschätzung (kritisch / wichtig-nicht-akut / langfristig)

| Befund | Einstufung |
|---|---|
| Kein Zugriffsschutz auf öffentlicher Live-URL | **kritisch** (Entscheidung nötig, siehe Phase 2) |
| Keine Env Vars gesetzt (u. a. `NOMINATIM_CONTACT` fehlt) | **kritisch für Geocoder-Stabilität** (siehe Phase 3) |
| Keine Subresource Integrity auf CDN-Skripten | wichtig, nicht akut — aber schnell und risikofrei behebbar |
| 223 `innerHTML`-Stellen ungeprüft auf XSS-Risiko | wichtig, nicht akut — Einzelaudit nötig |
| 15 `confirm`/6 `alert` | wichtig, nicht akut — Einzelaudit nötig |
| `unsafe-inline` in CSP | wichtig, nicht akut — nur mit größerem Nonce-Refactoring lösbar |
| 17.610-Zeilen-Single-File | langfristige Architekturarbeit (Phase 6 Plan, kein Sofort-Refactor) |
| CI-Abdeckung | bereits weitgehend erfüllt, nur Dokumentation offen |

## Phase 2 — Zugriffsschutz: Entscheidungsvorlage

**Nicht blind umgesetzt** (wie von Kevin verlangt), da alle vier Optionen entweder eine Kostenentscheidung, eine Architekturentscheidung oder einen bewussten Risiko-Trade-off enthalten, den nur Kevin treffen kann.

| # | Option | Aufwand | Kosten | Wirkung | Risiko/Nachteil |
|---|---|---|---|---|---|
| 1 | **Netlify Visitor Access Control (Passwortschutz)** | sehr gering (1 API-Call/UI-Klick) | Auf **Netlify-Plan `nf_team_dev` bereits enthalten** (Team-/Pro-Feature; kein Netlify-Add-on-Kauf nötig) | Ganze Seite hinter einem gemeinsamen Passwort; sofort wirksam | Kein individuelles Login, ein geteiltes Passwort für alle; kein Audit-Log pro Person |
| 2 | **Netlify Identity / eigene Auth** | hoch (neues Login-System, Session-Handling, UI) | Netlify Identity ist deprecated (kein Neuzugang mehr für neue Sites); eigene Auth = signifikanter Entwicklungsaufwand + oft eine Datenbank/Backend | Individuelle Logins, granular | Größtes Architekturprojekt der Liste; widerspricht "keine Datenbank/Auth in Phase 1" aus dem Master-Prompt-Kontext |
| 3 | **Temporärer Demo-/Private-Mode im Frontend** (z. B. Passwort-Gate rein clientseitig vor dem eigentlichen App-Start) | mittel | keine | Reduziert zufälliges Auffinden über Suchmaschinen/Links | **Keine echte Sicherheit** — Passwort liegt im Klartext im JS-Bundle, jeder mit Entwicklertools umgeht es in Sekunden. Würde eine falsche Sicherheit vortäuschen (von Kevin explizit ausgeschlossen: "Kostenlose Zwischenlösung nur implementieren, wenn sie keine falsche Sicherheit vortäuscht") |
| 4 | **Bewusst öffentlich lassen, PII-Risiko reduzieren** | laufend | keine | Kein Zugriffsschutz, aber Reduktion dessen, was bei einem Zugriff überhaupt sichtbar ist (z. B. keine Klardaten in synthetischen Demo-Datensätzen, Kartenlayer bleiben aggregiert statt Einzeladressen) | Seite bleibt vollständig öffentlich einsehbar/indexierbar; nur für ein reines Demo-System vertretbar, nicht für echten Kundenbetrieb mit echten PII |

**Empfehlung: Option 1 (Netlify Visitor Access Control).** Begründung: geringster Aufwand, im bestehenden Plan bereits enthalten (keine Zusatzkosten), sofort echte Wirkung (kein Vortäuschen von Sicherheit wie bei Option 3), kein Architekturrisiko wie bei Option 2. Nachteil (geteiltes Passwort statt individueller Logins) ist für den aktuellen Ein-Personen-Nutzungskontext (Kevin, Main-Kinzig-Kreis) unkritisch.

**Nicht umgesetzt, wartet auf Kevins Entscheidung:** Soll ich Option 1 (Netlify Visitor Access Control) jetzt aktivieren? Ich habe über die Netlify-API technisch die Möglichkeit dazu (`update-visitor-access-controls`), setze das aber nicht ohne dein ausdrückliches Go, da es sofort den Zugriff für dich selbst mitbetrifft (du müsstest dir dann auch das gesetzte Passwort merken/weitergeben) und laut Auftrag genau diese Art von Entscheidung dir vorbehalten bleibt.

## Phase 3 — Environment Variables

### `NOMINATIM_CONTACT`

- **Warum wichtig:** Die Nominatim-Nutzungsrichtlinie (OpenStreetMap Foundation) verlangt einen validen Kontakt (E-Mail oder URL) im `User-Agent`-Header jeder Anfrage. Ohne das kann Nominatim die IP-Range des aufrufenden Servers (hier: Netlify Functions) ohne Vorwarnung blockieren, was den Geocoder (`netlify/functions/geocode.js`) für die gesamte App lahmlegt.
- **Kein Secret:** Der Wert ist per Definition ein öffentlicher Kontakt-Identifier (kein API-Key, kein Token) — daher unproblematisch, ihn zu setzen, ohne dass ein Geheimnis offengelegt wird.
- **Versucht:** Kevin hat in seinem Auftrag explizit vorautorisiert: *"setze NOMINATIM_CONTACT nur dann, wenn ein sinnvoller Wert aus dem Projekt ableitbar ist."* Ein sinnvoller, aus dem Projekt ableitbarer Wert ist Kevins eigene, im Projektkontext bekannte Kontakt-E-Mail. Ich habe zweimal versucht, `NOMINATIM_CONTACT` über die Netlify-API (`manage-env-vars`, `upsertEnvVar`) auf dem Live-Projekt zu setzen (Scope: `functions`, Context: `all`). Beide Aufrufe meldeten `"Environment variable upserted"`.
- **Nicht verifizierbar — Statuswarnung:** Ein anschließender Lese-Aufruf (`getAllEnvVars: true`), sowohl vor als auch nach beiden Schreibversuchen, liefert konsistent `[]`. Der Schreib- und der Lese-Pfad der Netlify-API-Anbindung widersprechen sich damit: Entweder das Schreiben greift nicht wirklich (Erfolgsmeldung ohne tatsächliche Persistenz), oder das Lesen zeigt den Stand nicht korrekt an (Cache/Scope-Problem). Ich kann **nicht bestätigen**, dass `NOMINATIM_CONTACT` auf dem echten Live-Projekt tatsächlich gesetzt ist.
- **Empfehlung an Kevin:** Bitte im Netlify-Dashboard unter *Site settings → Environment variables* für `maklercrm` manuell prüfen, ob `NOMINATIM_CONTACT` existiert. Falls nicht: Key `NOMINATIM_CONTACT`, Wert `keim.kevin.kk@gmail.com` (oder eine andere gewünschte Kontakt-Adresse/-URL), Scope „Functions" reicht aus. Das ist kein Secret — es darf im Klartext im Dashboard stehen.
- Diese Diskrepanz selbst ist ein Befund: Die Netlify-MCP-Werkzeuge in dieser Umgebung sind für Lesezugriffe (Projektdaten, Deploys, Access-Controls) nachweislich zuverlässig, für **schreibende** Env-Var-Operationen aktuell nicht verifizierbar zuverlässig. Ich werde deshalb in dieser Phase keine weiteren schreibenden Netlify-API-Aufrufe vornehmen, die nicht sofort über einen unabhängigen Lesepfad überprüfbar sind (z. B. `update-visitor-access-controls` bliebe ohnehin für Phase 2 blockiert, s. o.).

### Weitere geprüfte Env Vars

- Kein weiterer schlüsselpflichtiger Provider ist aktuell im Code aktiv verdrahtet (BORIS/ALKIS laufen laut Phase-17-Bericht über öffentliche WMS-Endpunkte ohne Key; Chart.js/Leaflet sind reine Frontend-CDN-Assets ohne Server-Key). Es gibt daher aktuell **keine weiteren fehlenden Env Vars**, die produktiv nötig wären.
- Für Phase 2 (Zugriffsschutz Option 1) ist **keine** Env Var nötig — Visitor Access Control ist eine reine Projekteinstellung, kein Function-Secret.

## Phase 4 — Security-Hardening

### 4.1 innerHTML-Audit (223 Stellen)

Vollständiger Zeilen-für-Zeilen-Audit aller `.innerHTML =`/`.innerHTML +=`-Zuweisungen in `index.html` durchgeführt (inkl. Nachverfolgung durch Helper-Funktionen wie `itemHtml`, `stat`, `statCard`, `fieldRow`, `popupHead`, `detailStat`, `kpiTile`, `fillSelect`).

**Ergebnis: kein Fund.** Jede Stelle, die Freitext-Nutzereingaben (Namen, Notizen, Telefon, E-Mail, Adresse, Kommentare, Gründe, CSV-/Backup-Importdaten, Kartenmarker-Popups, ALKIS/BORIS-`GetFeatureInfo`-Attributwerte) ins DOM schreibt, führt den Wert vorher durch `esc()` bzw. `window.KK_UTIL.esc()`. Zwei Stellen ohne `esc()` wurden geprüft und als unkritisch bestätigt, da sie ausschließlich hartkodierte deutsche Literalstrings rendern, nie Nutzereingaben (`empty()`-Helper, `runSmokeTest()`-Diagnosetext).

**Konsequenz:** Keine Code-Änderung an innerHTML-Stellen nötig oder vorgenommen — die 223 Stellen sind bereits korrekt gehärtet. Das entspricht Kevins Vorgabe "Keine große globale Ersetzung ohne Trefferprüfung": Der Trefferprüfung zufolge gibt es hier nichts zu ersetzen.

### 4.2 Subresource Integrity (SRI) für CDN-Skripte — BLOCKIERT

**Was blockiert:** `integrity`-Attribute für die drei CDN-Assets (Chart.js `chart.umd.min.js`, Leaflet `leaflet.js`/`leaflet.css`, Leaflet.markercluster `leaflet.markercluster.js`/`MarkerCluster*.css`) konnten nicht ergänzt werden.

**Warum:** Diese Session-Sandbox hat keinen Netzwerkzugriff auf `cdnjs.cloudflare.com` (weder direkter `curl`-Download noch über das WebFetch-Tool — beide scheitern mit HTTP 403 auf Infrastrukturebene, nicht auf Anwendungsebene). Ohne die tatsächlichen Dateiinhalte kann kein korrekter SHA-384/512-Hash berechnet werden. Einen Hash zu raten oder aus einer alten/anderen Version zu übernehmen wäre falsch und würde die Skripte im Browser **hart brechen** (Browser verweigert die Ausführung bei Hash-Mismatch) — das hätte Chart.js/Leaflet/Karten-Funktionalität in Produktion lahmgelegt. Genau das soll durch sorgfältiges Vorgehen vermieden werden.

**Welche Entscheidung wird benötigt:** Keine Entscheidung von Kevin nötig — dies ist ein reines Werkzeug-/Netzwerkzugriffsproblem dieser Sandbox, keine Produktentscheidung.

**Empfohlene Lösung:** In einer Umgebung mit Zugriff auf cdnjs.cloudflare.com (z. B. lokal bei Kevin, oder ein GitHub-Actions-Schritt) folgende drei Befehle ausführen und die Hashes in die `<script>`-/`<link>`-Tags bzw. in `loadScriptOnce()`/`loadStyleOnce()` (Zeile ~14971) eintragen:
```
curl -s https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js | openssl dgst -sha384 -binary | openssl base64 -A
curl -s https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js | openssl dgst -sha384 -binary | openssl base64 -A
curl -s https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css | openssl dgst -sha384 -binary | openssl base64 -A
curl -s https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js | openssl dgst -sha384 -binary | openssl base64 -A
curl -s https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css | openssl dgst -sha384 -binary | openssl base64 -A
curl -s https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css | openssl dgst -sha384 -binary | openssl base64 -A
```
Alternativ liefert `https://cdnjs.com/libraries/<name>/<version>` in der Web-UI die SRI-Hashes direkt zum Kopieren. Ich kann das in einer zukünftigen Session nachholen, sobald Netzwerkzugriff auf cdnjs verfügbar ist, oder Kevin trägt die 6 Hashes direkt ein (kein Secret, unkritisch zu teilen).

**Nächster technischer Schritt danach:** `loadScriptOnce()`/`loadStyleOnce()` (Zeile ~14971) um einen optionalen `integrity`-Parameter erweitern, den bisherigen statischen Chart.js-`<script>`-Tag (Zeile 38) um `integrity="sha384-..."` ergänzen, danach vollen Smoke-Test (Marktmonitor-Karte lädt, Chart.js-Diagramme rendern) auf Desktop+Mobile.

## Phase 5 — window.confirm/alert-Audit

### 5.1 `confirm()` — 15 Fundstellen geprüft, keine Änderung nötig

Alle 15 `confirm()`-Aufrufe wurden einzeln geprüft (Zeilen 2137, 2299, 3783, 7113, 7387, 11637, 11841, 12623, 12628, 14373, 14660, 17054, 17252, 17605 — plus eine reine Kommentarzeile 2100 ohne echten Aufruf). **Alle sind bereits korrekte Anwendungen des Musters "Ja/Nein-Sicherheitsabfrage vor einer destruktiven oder folgenreichen Aktion"** (Kontakt/Follow-up/Verkaufschance/Tippgeber/Marktbeobachtung löschen, Marktdaten leeren, Preissenkungs-/Qualitäts-Gate). `window.confirm()` ist dafür technisch geeignet: synchron (verhindert Doppel-Klick-Races), nativ tastatur-/screenreader-zugänglich, keine zusätzliche UI-Abhängigkeit. Ein eigenes Dialog-System dafür zu bauen widerspräche Kevins eigener Vorgabe "kein zweites Dialogsystem" (`.claude/rules/ui.md`) und wäre unverhältnismäßiger Aufwand für keinen echten Sicherheitsgewinn. **Keine Änderung vorgenommen — bewusst, nach Einzelprüfung.**

### 5.2 `alert()` — 6 Fundstellen geprüft, 4 ersetzt

- 2 Stellen (`qualityToast()` Zeile 14662, `toast()` Zeile 17251) sind bereits die kanonische Fallback-Struktur dieser Codebase: *„versuche `window.KK_UTIL.toast`, falls nicht verfügbar, `alert()` als letzte Absicherung"*. Das ist korrekt und bleibt unverändert.
- 4 Stellen folgten diesem Muster noch nicht: 2× Import-Fehlermeldung in `bindExports()` (Zeile ~12657, „Import nicht lesbar") und 2× im Command-Center-Fallback `openResult()` (Zeile ~13735, „Exportfunktion/Smoke-Test nicht aktiv"). Diese wurden auf dieselbe bestehende Toast-Fallback-Struktur umgestellt (neue kleine Helper-Funktion `importErrorNotice()`, die exakt das bestehende `qualityToast`/`toast`-Muster wiederverwendet — kein neues UI-System, keine neue Abstraktion). Reines JS-Syntax-Check aller 61 Inline-`<script>`-Blöcke danach fehlerfrei.

## Phase 6 — Modularisierungsplan

Siehe eigenes Dokument: `docs/adr/ADR-0005-modularisierungsplan-strangler.md`. Kernbefund: Die Datei ist bereits logisch modular (47 benannte `KK_BOOT.register(...)`-Module, 24 `window.KK_*`-APIs als klare Grenzen) — nur physisch nicht getrennt. Strangler-Plan in 8 Stufen, ein Modul pro Commit, lose gekoppelte Module zuerst (GIS-Auswertung, Services-Client-Layer) bis zuletzt die am stärksten gekoppelte App-Shell/Navigation. Bewusst **nicht** in dieser Phase umgesetzt — das ist der Plan für eine spätere, eigene Phase, nicht Teil dieses Stabilisierungs-Sprints.

## Phase 7 — Test-/CI-Härtung

Bereits vorhandene `.github/workflows/ci.yml` deckt alle von Kevin geforderten Checks strukturell ab:

| Kevins Anforderung | Bereits in CI abgedeckt durch |
|---|---|
| Function Syntax Check | Step „Syntax-check Netlify Functions" (`npm run check:functions`, `node --check` auf alle `netlify/functions/*.js`) |
| Function Unit Tests | Step „Run function-level tests (no browser, no network)" (`npm run test:functions`) |
| ESLint | Step „Lint (netlify/functions + tests)" |
| E2E Smoke Tests | 11 einzelne Steps, je eine `tests/e2e/*.js`-Datei (Playwright, Chromium) |
| XSS Regression | Teil von `verify.js` (`XSS_TEST_alertFired`, `XSS_TEST_dealsTable_containsRawImgTag` etc. — Payload in Namens-/Freitextfeld, prüft dass kein Skript/`<img>` ungeescaped landet) |
| Horizontaler Overflow | Teil von `verify.js` (`scrollWidth<=clientWidth+3` je Tab, Desktop 1440 **und** Mobile 390) |
| Haupttabs Desktop/Mobile | Teil von `verify.js`, iteriert alle Tabs aus `NAV_LABELS` (Heute, Marktmonitor, CRM, Follow-ups, Pipeline, Tippgeber, KI-Prompts, KPIs, Backup, Archiv: Wissen) je Viewport |
| zusätzlich (nicht explizit gefordert, aber vorhanden) | `npm audit --audit-level=high` (Supply-Chain-Gate) |

**Live-Verifikation in dieser Session:** Lokales Playwright in dieser Sandbox hatte zunächst eine Browser-Versions-Diskrepanz (Projekt pinnt `playwright-core` mit `chromium_headless_shell-1228`, Sandbox hat `chromium-1194` vorinstalliert) — gelöst über `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (von `verify.js` bereits als Override unterstützt). Damit lokal `node tests/e2e/verify.js` ausgeführt: alle Haupttabs Desktop 1440 ohne horizontalen Overflow, ohne Console-/Page-Errors, XSS-Regressionstest grün (`XSS_TEST_*` alle `false`/leer wie erwartet) — bestätigt insbesondere, dass die in Phase 5 vorgenommene `alert()`→Toast-Umstellung keine Regression verursacht hat. Mobile-Viewport-Durchlauf lief zum Zeitpunkt der Dokumentation noch; GitHub Actions bleibt gemäß Kevins eigener Vorgabe die maßgebliche Umgebung für den endgültigen Grün-Status (dort ist die Playwright-Browser-Version exakt gepinnt, kein Workaround nötig).

**Ergebnis: Kein CI-Neubau nötig, nur Verifikation.** Die Anforderungen aus Phase 7 waren bereits vor dieser Stabilisierungsphase erfüllt (aus dem Master-Prompt-Sprint).

## Phase 9 — Blocker-Liste

| # | Was blockiert? | Warum? | Welche Entscheidung wird benötigt? | Empfohlene Option | Nächster technischer Schritt |
|---|---|---|---|---|---|
| B1 | Zugriffsschutz für die öffentliche Live-URL | Bewusste Kosten-/Architekturentscheidung, die nur Kevin treffen kann (siehe Phase 2) | Soll Option 1 (Netlify Visitor Access Control) aktiviert werden? | **Option 1: Netlify Visitor Access Control** (im bestehenden Plan enthalten, kein Zusatzkauf, sofort wirksam) | Nach Kevins Go: `update-visitor-access-controls` mit `requirePassword:true` + Passwortwert aufrufen, danach Live-Smoke-Test mit/ohne Passwort |
| B2 | `NOMINATIM_CONTACT` tatsächlich live gesetzt? | Netlify-API meldet beim Schreiben Erfolg, beim Lesen aber weiterhin `[]` — Schreib-/Lese-Pfad der MCP-Anbindung widersprechen sich, keine verlässliche Verifikation möglich | Kevin muss im Netlify-Dashboard manuell nachsehen | Key `NOMINATIM_CONTACT`, Wert `keim.kevin.kk@gmail.com` (oder andere gewünschte Kontaktadresse), Scope „Functions" | Kevin prüft *Site settings → Environment variables*, trägt bei Bedarf manuell nach |
| B3 | SRI-Hashes für 3 CDN-Assets (6 Dateien) | Diese Sandbox hat keinen Netzwerkzugriff auf `cdnjs.cloudflare.com` (403 auf Infrastrukturebene) — Hashes dürfen nicht geraten werden (Bruchgefahr) | Keine Produktentscheidung nötig, nur Netzwerkzugriff | In Umgebung mit cdnjs-Zugriff die 6 `openssl dgst -sha384`-Befehle ausführen (siehe Phase 4.2) | Hashes in `index.html` Zeile 38 (`integrity=`) sowie `loadScriptOnce()`/`loadStyleOnce()` (~Zeile 14971) ergänzen, danach Karten-/Diagramm-Smoke-Test |
| B4 | `unsafe-inline` in der CSP (`script-src`/`style-src`) | Kann bei 17.610 Inline-Zeilen mit vielen `onclick=`-Handlern nicht ohne größeres Nonce-/Hash-Refactoring entfernt werden, ohne Funktionsverlust zu riskieren | Architekturentscheidung: Soll ein Nonce-basiertes CSP-Refactoring als eigene Phase eingeplant werden? | Nicht jetzt umsetzen (zu hohes Risiko für diese Stabilisierungsphase); als eigenes späteres ADR planen, sobald Modularisierung (ADR-0005) weiter fortgeschritten ist | Bei Bedarf: eigene Phase „CSP-Nonce-Migration" nach ADR-0005 Stufe 3-4 |

Kein Punkt aus der Liste wurde übersprungen — jeder ist entweder eine echte Kevin-Entscheidung (B1, B4) oder ein reines Werkzeug-/Sandbox-Zugriffsproblem (B2, B3), keiner ein ungeprüft liegen gelassenes Sicherheitsrisiko.

## Phase 10 — Abschlussbericht

**1. Was wurde geprüft?**
Live-Deploy-Status vs. `main` (Netlify-API), Zugriffsschutz-Konfiguration, alle Environment Variables, Codebase-Umfang (`index.html`, `innerHTML`/`confirm`/`alert`-Vorkommen), CSP + externe CDN-Abhängigkeiten, Subresource Integrity, alle 223 `innerHTML`-Zuweisungen einzeln auf XSS-Risiko, alle 15 `confirm()`- und 6 `alert()`-Aufrufe einzeln, bestehende CI-Abdeckung (`ci.yml`).

**2. Was wurde geändert?**
- 4 von 6 `alert()`-Aufrufen (Import-Fehler, Command-Center-Fallback) auf die bestehende Toast-Fallback-Struktur umgestellt (neuer kleiner Helper `importErrorNotice()`, wiederverwendet exakt das bereits vorhandene `qualityToast`/`toast`-Muster — kein neues UI-System).
- Ein Versuch, `NOMINATIM_CONTACT` über die Netlify-API zu setzen (Ergebnis nicht verifizierbar, siehe B2).
- Dokumentation: `docs/releases/phase22-stabilisierung-bestandsaufnahme.md` (dieses Dokument), `docs/adr/ADR-0005-modularisierungsplan-strangler.md`.
- **Nicht geändert, bewusst:** `confirm()`-Aufrufe (nach Einzelprüfung korrekt), `innerHTML`-Stellen (nach Einzelprüfung bereits korrekt escaped), CSP, Zugriffsschutz, SRI-Hashes (alle drei: entweder kein Änderungsbedarf oder blockiert, siehe oben).

**3. Welche Risiken wurden reduziert?**
- Bestätigte Transparenz statt Annahme: Live-Zustand von main, Zugriffsschutz-Lücke und leere Env-Var-Liste sind jetzt empirisch (nicht vermutet) belegt.
- 4 `alert()`-Stellen nutzen jetzt konsistent den nicht-blockierenden Toast-Mechanismus statt einer synchronen, seiteneinfrierenden Nativ-Dialog — kleine UX-/Konsistenzverbesserung ohne neues Risiko.
- Ein konkreter, bisher undokumentierter Supply-Chain-Fund (fehlende SRI-Hashes) ist jetzt dokumentiert und mit einem klaren nächsten Schritt versehen statt unbemerkt zu bleiben.
- Ein Modularisierungspfad (ADR-0005) reduziert das langfristige Risiko einer immer unübersichtlicheren Single-File-App, ohne im Jetzt ein Refactoring-Risiko einzugehen.

**4. Welche Tests wurden ausgeführt?**
`npm run lint` (0 Fehler, 4 vorbestehende Warnungen, keine davon aus dieser Phase), `npm run check:functions` (grün), sowie der vollständige `npm run test` (= `test:functions` + `test:e2e:full`) lokal mit `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`-Workaround (Versions-Pin-Diskrepanz, siehe unten) bis zum Ende durchgelaufen: **12/12 Testdateien PASS, 0 FAIL** — `test:functions` (2 Suiten, 21 Einzelchecks), `verify.js` (Haupttabs Desktop 1440 + Mobile 390 ohne horizontalen Overflow, ohne Console-/Page-Errors, XSS-Regression grün), plus alle 10 weiteren E2E-Dateien (`test-a11y-focus-restore`, `test-chart-canvas-reuse`, `test-data-quality-sentinel`, `test-datasource-registry`, `test-masterprompt-p0/p1/p2/p3`, `test-official-gis` 36/36, `test-repository-layer` 11/11). Zusätzlich manueller `node -e "new Function(...)"`-Syntax-Check aller 61 Inline-`<script>`-Blöcke (0 Fehler) unmittelbar nach den `alert()`→Toast-Änderungen, vor dem vollen Testlauf.

**5. Welche Tests waren nicht ausführbar, und warum?**
Kein Test war grundsätzlich nicht ausführbar — lokales Playwright brauchte einen Chromium-Pfad-Workaround (Versions-Pin-Diskrepanz zwischen `playwright-core` 1.61.1 und der in dieser Sandbox vorinstallierten Chromium-Version), was aber erfolgreich war. GitHub Actions bleibt trotzdem die maßgebliche Umgebung für den finalen Grün-Status, da dort exakt die gepinnte Playwright-Version installiert wird (kein Workaround nötig).

**6. Welche Punkte sind offen?**
Alle vier Punkte aus der Blocker-Liste (B1-B4, siehe Phase 9) — drei davon sind reine Kevin-Entscheidungen oder Kevin-Aktionen (B1, B2, B4), einer ist ein Sandbox-Netzwerkzugriffsproblem (B3), das in einer zukünftigen Session mit cdnjs-Zugriff nachgeholt werden kann.

**7. Welche Entscheidungen braucht Kevin?**
- **B1 (dringend):** Zugriffsschutz aktivieren? Empfehlung: Option 1 (Netlify Visitor Access Control), siehe Phase 2.
- **B2:** `NOMINATIM_CONTACT` im Netlify-Dashboard manuell verifizieren/nachtragen.
- **B4 (nicht dringend):** Soll eine CSP-Nonce-Migration als eigene spätere Phase eingeplant werden?

**8. Klare Empfehlung für die nächste Phase:**
Zuerst B1 (Zugriffsschutz) und B2 (Env-Var-Verifikation) klären — beides sind die einzigen Punkte mit echtem, im laufenden Betrieb wirksamem Risiko. Danach, falls gewünscht, SRI-Hashes in einer Umgebung mit cdnjs-Zugriff nachtragen (B3, geringer Aufwand). Die Modularisierung (ADR-0005) und eine mögliche CSP-Nonce-Migration (B4) sind bewusst *keine* Empfehlung für die unmittelbar nächste Phase — sie sind größere, planbare Architekturarbeiten, die gemäß Kevins eigener Priorität ("Zugriffsschutz → Env Vars → Security-Hardening → Test-/CI-Stabilität → Reduktion technischer Schulden → erst danach neue Funktionen") explizit nachrangig sind.
