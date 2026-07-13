# Phase 23/24 — Zugriffsschutz-Entscheidung, NOMINATIM_CONTACT, SRI-Strategie, Regressionsnachweis

Auftrag: "Stabilisierung, Zugriffsschutz, Netlify-Konfiguration und risikoarmer Sicherheitsfahrplan für maklercrm" (Kevin). Branch: `claude/stabilisierung-security-audit` (unverändert aktuell zu `main`, kein Rebase nötig — siehe Phase A.1). Baut auf `docs/releases/phase22-stabilisierung-bestandsaufnahme.md` und `docs/adr/ADR-0005-modularisierungsplan-strangler.md` auf; **eine wichtige Korrektur gegenüber Phase 22 ist enthalten (siehe B.1)**.

## Phase A — Bestandsaufnahme (aktualisiert)

**A.1 Branch-/PR-Status:** `claude/stabilisierung-security-audit` ist identisch mit `origin/claude/stabilisierung-security-audit`, `main` ist vollständig in der Historie enthalten (`git merge-base --is-ancestor origin/main HEAD` → wahr), kein Rebase nötig, kein Konflikt. Kein offener Pull Request im Repository (`list_pull_requests` → leer). Working Tree sauber vor dieser Phase.

**A.2 Netlify-Site-Konfiguration:** Site `maklercrm`, `siteId cfa55ac0-3b69-4c92-8328-4c4d96c4b3ef`, `publish="."`, `functions="netlify/functions"`, `node_bundler="esbuild"`, `NPM_FLAGS="--omit=dev"`. 3 Redirects (`/api/geocode`, `/api/wms-capabilities`, `/api/wms-feature-info` → jeweils auf die passende Netlify Function). 4 Security-Header (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) für `/*`. Aktueller Live-Deploy `6a53a7ff24fdb90008796c2a` = Commit `09e4fc6` = `main` HEAD zum Zeitpunkt der letzten Prüfung (Phase 22) — unverändert, da seither nichts nach `main` gemergt wurde.

**A.3 KORRIGIERTER Befund zum Netlify-Plan (wichtig, siehe B.1):** In Phase 22 wurde angenommen, der Plan `nf_team_dev` schließe Visitor Access Control automatisch ein. Das war **nicht ausreichend verifiziert**. Diese Phase hat den echten Team-/Account-Datensatz abgefragt (`get-team`): Team **„linkedin outreach"**, `type_name: "Free"`, 1 Mitglied, Rolle „Owner" = Kevin Keim. `nf_team_dev` ist offensichtlich nur eine interne Site-Kennung/Default-Tag (identisch bei allen 12 Sites dieses Accounts, unabhängig vom tatsächlichen Abrechnungsplan), **nicht** der echte Abrechnungsplan. Der echte Plan ist **Free**.

**A.4 Environment Variables:** Erneut `getAllEnvVars` abgefragt: `[]` — weiterhin keine einzige Variable sichtbar, auch nach einem erneuten `upsertEnvVar`-Versuch für `NOMINATIM_CONTACT` (siehe Phase C).

**A.5 Nominatim-Nutzung im Code (Detailprüfung, war in Phase 22 nur oberflächlich geprüft):**
- `netlify/functions/geocode.js`: `NOMINATIM_CONTACT` wird ausschließlich serverseitig über `process.env.NOMINATIM_CONTACT` gelesen, nie an den Client übertragen, korrekt in den `User-Agent`-Header eingebettet (`KeimCRMPro-Geocoder/1.0 (<contact>)`) — exakt das von Nominatims Nutzungsrichtlinie geforderte Format.
- Throttle: `throttleGuard()` erzwingt mindestens 1100ms zwischen Anfragen (Modul-State `lastRequestAt`). Einschränkung, die dokumentiert werden muss: Netlify Functions können bei echter Parallellast mehrere Instanzen gleichzeitig starten, dann gilt der In-Memory-Throttle nur pro Instanz, nicht global. Für den aktuellen Ein-Personen-Nutzungskontext (Kevin, keine parallele Nutzerlast) ist das praktisch unkritisch, für eine spätere Mehrbenutzer-Architektur aber ein bekannter Nachbesserungspunkt (siehe Phase G).
- Timeout: 8 Sekunden via `AbortController`, sauberer Fehler-Response (`upstream_timeout`) statt Hängenbleiben.
- Frontend-Caching (`index.html` `KK_GEOCODE`-Modul, Zeile ~2730-2853): `needsGeocoding()` verhindert wiederholte Anfragen für bereits erfolgreich geocodierte, manuell gesetzte oder unbestätigte-aber-vorhandene Datensätze; `failed`-Status wird nur mit explizitem `retry`-Flag erneut versucht, nie automatisch. Ein `inFlight`-Dictionary verhindert parallele Doppelanfragen für denselben Datensatz. Aufruf ausschließlich bei explizitem Speichern (`saveLead`, `saveObject`, Tippgeber-Formular) — **nie** bei jedem Rendern oder jeder Texteingabe. **Ergebnis: Kevins Sorge 7-9 aus Phase C ist bereits im bestehenden Code korrekt gelöst, keine Änderung nötig.**
- Fehlerbehandlung: Sauberer strukturierter Fehler-Response bei jedem Fehlerfall (`insufficient_address`, `upstream_error`, `upstream_unreachable`, `upstream_timeout`, `upstream_unexpected_shape`) sowie im Frontend ein bewusst nicht-blockierender `skipped`-Rückgabewert bei nicht erreichbarer Function (z. B. lokale `file://`-Vorschau) — verhindert falsches Dauer-„failed"-Flag.

## Phase B — Zugriffsschutz-Entscheidung

### B.1 Die 12 Prüffragen aus dem Auftrag

1. **Im aktuellen Plan enthalten?** **Nicht sicher feststellbar, mit Tendenz „nein".** Der Account läuft nachweislich auf dem Netlify-**Free**-Plan (siehe A.3). Netlify Visitor Access Control (Passwortschutz/SSO-Team-Login für eine Site) ist nach meinem Kenntnisstand seit Jahren durchgehend ein Merkmal der bezahlten Netlify-Stufen (Pro und höher), nicht des Free-Plans — das kann ich aus dieser Sandbox aber **nicht live verifizieren**, da sowohl direkte HTTP-Zugriffe als auch das WebFetch-Werkzeug für `netlify.com` in dieser Umgebung blockiert sind (403 auf Netzwerkebene, kein inhaltlicher Fehler). **Nach Kevins eigener bindender Regel** ("Führe keine kostenpflichtige Änderung aus, ohne vorher eindeutig festzustellen, dass sie im aktuellen Plan enthalten ist") **wird die Funktion in dieser Phase NICHT aktiviert.**
2. **Kosten?** Voraussichtlich ja (Upgrade auf einen bezahlten Netlify-Plan), aber die exakte aktuelle Preisstufe kann ich nicht live abrufen. **Bitte selbst prüfen:** im Netlify-Dashboard unter *Team „linkedin outreach" → Billing/Plans* nachsehen, ob „Visitor Access" / „Password Protection" für den aktuellen oder einen upgrade-baren Plan angezeigt wird, inkl. Preis.
3. **Authentifizierungsmethode?** Laut Projektkonfiguration (`projectAccessControls`) zwei mögliche Schalter: `requiresPassword` (ein gemeinsames Passwort für alle Besucher) und `requiresSSOTeamLogin` (nur eingeloggte Mitglieder des Netlify-Teams „linkedin outreach" — aktuell nur Kevin selbst). Beide sind Site-weite Schalter, keine granularen Einzelbenutzer-Logins.
4. **Eigener Zugriff?** Bei `requiresPassword`: Kevin bräuchte dasselbe Passwort wie jeder andere Besucher (kein bevorzugter Zugang). Bei `requiresSSOTeamLogin`: Zugriff automatisch über die bestehende Netlify-Anmeldung (`keim.kevin.kk@gmail.com`), kein separates Passwort nötig.
5. **Aussperrungsrisiko?** Bei `requiresPassword`: **echtes Risiko**, falls das Passwort verloren geht — Rücksetzung dann nur über das Netlify-Dashboard (nicht über die App selbst) möglich, dort aber jederzeit durch den Team-Owner (Kevin) änderbar/deaktivierbar. Bei `requiresSSOTeamLogin`: kein Aussperrungsrisiko für Kevin selbst (er ist ja bereits eingeloggter Team-Owner), aber niemand ohne Netlify-Teammitgliedschaft käme mehr rein (relevant, falls z. B. ein Kunde/Mitarbeiter ohne Netlify-Account mitschauen soll).
6. **Production, Deploy Previews oder beide?** Der Konfigurationsschalter (`appliesTo`) unterscheidet explizit `all-projects` vs. `non-production-projects` — das deckt sich mit Netlifys bekanntem Verhalten, dass der Schutz granular für Produktion allein oder für Previews/Branch-Deploys mit-aktivierbar ist.
7. **GitHub Actions/Netlify-Checks betroffen?** Nein — CI läuft gegen die lokale `file://index.html`-Kopie im Checkout (siehe `tests/e2e/*.js`: `fileUrl = 'file://' + path.resolve(...)`), nicht gegen die live ausgelieferte URL. Ein Passwortschutz auf der Netlify-Seite hat **keinen** Einfluss auf die bestehende CI-Suite.
8. **E2E-Tests nach Aktivierung weiter ausführbar?** Ja, aus demselben Grund (Punkt 7) — die Tests öffnen die Datei direkt, nicht die öffentliche URL.
9. **iPhone und Desktop?** Ein Netlify-Passwortschutz zeigt vor dem eigentlichen Seiteninhalt eine eigene, browserseitige HTTP-Basic-Auth-artige Eingabemaske — funktioniert plattformunabhängig in jedem Standardbrowser (Safari iOS eingeschlossen), keine bekannten mobilen Einschränkungen.
10. **CDN-Assets/API-Aufrufe betroffen?** Nein — der Zugriffsschutz sitzt vor der gesamten Site (allem, was von `maklercrm.netlify.app` ausgeliefert wird); externe CDN-Assets (cdnjs) werden vom Browser des bereits authentifizierten Besuchers wie gewohnt separat geladen, nicht über den Netlify-Zugriffsschutz geprüft.
11. **Ganze Site oder Einzelseite?** Site-weit (`siteId`-Ebene), keine granulare Pfad-/Seiten-Ebene in der hier verfügbaren API-Schnittstelle erkennbar.
12. **Für dauerhaften CRM-Betrieb geeignet?** Als **Übergangslösung** geeignet (verhindert zufälliges/automatisiertes Auffinden der öffentlichen URL mit echten Geschäftsdaten). Für echten produktiven Mehrbenutzerbetrieb mit individuellen Logins, Rollen und Audit-Trail ist es **nicht** die Zielarchitektur — das wäre Fall D (echte Authentifizierung), aber laut Kevins eigener Vorgabe jetzt bewusst nicht zu bauen.

### B.2 Entscheidungsregel-Ergebnis: **FALL C** (kostenpflichtig / nicht sicher kostenlos feststellbar)

Nach Kevins eigener Regel für Fall C:
- **Nichts kostenpflichtig aktiviert** — kein Aufruf von `update-visitor-access-controls` in dieser Phase.
- **Kostenlose/bereits enthaltene Alternative geprüft:** `requiresSSOTeamLogin` (SSO-Team-Login) nutzt exakt dieselbe API wie `requiresPassword` und ist daher aller Wahrscheinlichkeit nach an dieselbe Plan-Voraussetzung gebunden (kein Hinweis in der API auf eine kostenlose Sonderstellung für diese Variante) — keine sicher kostenlose Alternative über Netlify selbst gefunden.
- **Keine unsichere Behelfslösung implementiert:** Ausdrücklich **kein** client-seitiges JavaScript-Passwort-Gate gebaut — das wäre laut Kevins eigener Feststellung "kein echter Zugriffsschutz" (im Klartext im JS einsehbar, in Sekunden über Entwicklertools umgehbar) und würde eine falsche Sicherheit vortäuschen.

### B.3 Handlungsanleitung für Kevin (Schritt für Schritt, sobald Plan/Kosten geklärt sind)

1. Im Netlify-Dashboard einloggen (`https://app.netlify.com/teams/keim-kevin-kk`), unter *Billing* prüfen, ob „Visitor Access" / Passwortschutz im aktuellen Plan enthalten ist oder ein Upgrade nötig ist, und zu welchem monatlichen Preis.
2. **Nur falls kostenlos enthalten oder Kevin dem Upgrade ausdrücklich zustimmt:** im Projekt „maklercrm" → *Site configuration* → *Visitor access* → Passwortschutz aktivieren, ein Passwort setzen (nicht im Repository, nicht im Chat, nicht in Logs speichern), `appliesTo` bewusst wählen (empfohlen: `all-projects`, also auch Deploy Previews, da diese denselben echten Datenstand zeigen können).
3. Direkt danach: Zugriff auf `https://maklercrm.netlify.app` im normalen Browser UND im Privatmodus testen (Passwortabfrage muss erscheinen), danach mit korrektem Passwort erneut testen (Zugriff muss funktionieren), danach auf einem Mobilgerät testen.
4. Rollback jederzeit möglich: derselbe Schalter im Dashboard zurück auf „aus" — sofortige Wirkung, kein Deploy nötig, kein Datenverlust.
5. Mir (Claude) danach kurz Bescheid geben, dann verifiziere ich per Netlify-API (`get-project`), dass `requiresPassword:true` tatsächlich aktiv ist, und ergänze die Dokumentation.

**Kein Go von mir aus ohne Kevins Kostenprüfung — das ist eine bewusste, in Phase B.2 begründete Zurückhaltung, kein liegengebliebener Punkt.**

## Phase C — `NOMINATIM_CONTACT`

**Code-seitige Prüfung: vollständig durchgeführt, siehe A.5.** Zusammenfassung der Kevin-Fragen:
- Nicht geheimhaltungsbedürftig — es ist eine vorgeschriebene Kontaktangabe (wie ein Betreiber-Impressum-Kontakt für den Geocoding-Dienst), kein API-Key/Secret.
- Nicht im Browser sichtbar — ausschließlich serverseitig in der Netlify Function verwendet.
- Dient ausschließlich als Kontaktkennung im `User-Agent`-Header gegenüber Nominatim, exakt wie von deren Nutzungsrichtlinie gefordert.
- Für eine spätere professionelle Architektur wäre eine serverseitige Proxy-Funktion sinnvoller — **die gibt es bereits** (`netlify/functions/geocode.js` ist selbst genau dieser Proxy), keine weitere Architekturarbeit nötig.

**Setzversuch:** Erneut über `manage-env-vars`/`upsertEnvVar` versucht (Wert `keim.kevin.kk@gmail.com`, Scope `functions`, Context `all`). Ergebnis identisch zu Phase 22: Die API meldet „Environment variable upserted", ein unmittelbar folgender `getAllEnvVars`-Aufruf zeigt weiterhin `[]`. **Zwei unabhängige Versuche (Phase 22 und diese Phase) mit demselben Ergebnis — das ist kein einmaliger Ausrutscher, sondern ein reproduzierbarer Schreib-/Lese-Widerspruch dieser Werkzeuganbindung. Ich behaupte daher ausdrücklich NICHT, dass die Variable sicher gesetzt ist.**

**Exakte manuelle Anleitung für Kevin:**
1. Netlify-Dashboard → Projekt „maklercrm" → *Site configuration* → *Environment variables*.
2. Prüfen, ob ein Eintrag `NOMINATIM_CONTACT` existiert.
3. Falls nicht: „Add a variable" → Key `NOMINATIM_CONTACT`, Value `keim.kevin.kk@gmail.com` (oder eine andere gewünschte Kontakt-E-Mail/Projekt-URL), Scope mindestens „Functions" (Production reicht für den produktiven Betrieb; „Same value for all deploy contexts" ist am einfachsten).
4. **Nach dem Setzen ist ein neuer Deploy nötig** — Netlify-Functions lesen Environment Variables nur beim Kaltstart/Deploy neu ein, nicht live. Einfachster Weg: *Deploys* → *Trigger deploy* → *Clear cache and deploy site* (oder einfach den nächsten normalen Push nach `main` abwarten, der löst ohnehin einen neuen Deploy aus).
5. Erfolgsprüfung danach: In den Netlify-*Function-Logs* für `geocode` nachsehen, ob der `User-Agent`-Header nicht mehr den Platzhalter `bitte-NOMINATIM_CONTACT-env-var-setzen@example.invalid` enthält — oder einfach im CRM eine Testadresse speichern (z. B. „Musterstraße 1, 63456 Hanau") und prüfen, dass die Geocodierung weiterhin normal funktioniert (funktioniert so oder so, der Unterschied ist nur die Nominatim-Sperrrisiko-Reduktion bei höherem Anfragevolumen, nicht die Grundfunktion).

## Phase D — Regressionsnachweis

In dieser Phase wurden **keine Code-Änderungen an `index.html` oder `netlify.toml`** vorgenommen (nur ein — nicht verifizierbar erfolgreicher — Netlify-Environment-Variable-Schreibversuch, der die ausgelieferte Anwendung nicht verändert). Der volle Testnachweis aus Phase 22 (unmittelbar vor dieser Phase erstellt, auf demselben Commit) bleibt daher gültig: `npm run lint` (0 Fehler), `npm run check:functions` (grün), vollständiger `npm run test` (`test:functions` + alle 11 E2E-Dateien inkl. `verify.js` Desktop 1440 + Mobile 390, XSS-Regression) → **12/12 PASS, 0 FAIL**.

**Zugriffsschutz-spezifische Tests (Kevins Abschnitt D.A „Zugriff") sind aktuell nicht sinnvoll durchführbar,** da kein Zugriffsschutz aktiv ist (Fall C, siehe Phase B) — es gibt aktuell nur einen einzigen Zugriffszustand (vollständig offen). Sobald Kevin sich für eine Aktivierung entscheidet, wird genau dieser Testblock (berechtigter/unberechtigter Zugriff, Deep-Links, Reload, Privatmodus, Desktop/Mobile) live nachgeholt (siehe B.3 Schritt 3).

## Phase E — SRI-Strategie für Chart.js und Leaflet

**Untersuchte Fakten:** Chart.js `4.4.0`, Datei `chart.umd.min.js` (minifiziert), statischer `<script>`-Tag (Zeile 38), bereits mit `crossorigin="anonymous"` und `referrerpolicy="no-referrer"`. Leaflet `1.9.4` (`leaflet.js`, `leaflet.css`), Leaflet.markercluster `1.5.3` (`leaflet.markercluster.js`, `MarkerCluster.css`, `MarkerCluster.Default.css`), beide dynamisch über die hauseigenen `loadScriptOnce()`/`loadStyleOnce()`-Helfer geladen (~Zeile 14971), aktuell ohne `crossorigin`/`integrity`-Unterstützung in diesen Helfer-Funktionen.

**Strategie-Bewertung:**
- **Strategie 1 (korrekte SRI-Hashes):** Technisch die richtige Zielstrategie, aber in dieser Sandbox **nicht durchführbar** — kein Netzwerkzugriff auf `cdnjs.cloudflare.com` (403 auf Infrastrukturebene, sowohl direkter Download als auch WebFetch). Kein Hash wurde geraten (siehe Phase 22, unverändert gültig). **Bewertung: empfohlene Zielstrategie, aktuell blockiert (B3, siehe Blocker-Liste unten).**
- **Strategie 2 (lokale Vendor-Dateien):** Möglich, aber mit echten Trade-offs: (+) kein CDN-Ausfallrisiko, volle Kontrolle über SRI/Version; (−) Update-Prozess wird manuell (kein automatisches CDN-Patch bei Sicherheitslücken in Chart.js/Leaflet selbst), zusätzliche ~250-300 KB im Repository/Deploy, Lizenz beider Bibliotheken (Chart.js: MIT, Leaflet: BSD-2-Clause) unproblematisch für Vendoring. Netlify-Build bräuchte keine Änderung (`publish="."` liefert jede zusätzliche Datei im Repo automatisch mit aus). **Bewertung: sinnvolle Alternative, falls Strategie 1 dauerhaft nicht umsetzbar bleibt — aber kein Vorteil gegenüber Strategie 1, sobald Netzwerkzugriff besteht, da Strategie 1 einfacher ist und keine Update-Pflicht im eigenen Repo erzeugt.**
- **Strategie 3 (späteres Bundling):** Nur im Kontext einer viel größeren Vite-/Modul-Migration sinnvoll (siehe ADR-0005) — für den aktuellen Umfang der Aufgabe ("keine riskante Umstellung erzwingen") bewusst **nicht** jetzt verfolgt.

**Entscheidung für diese Phase:** Keine der drei Strategien wird jetzt umgesetzt (Strategie 1 blockiert, Strategie 2/3 unverhältnismäßig für den aktuellen Umfang). Dokumentiert als Blocker B3 mit konkretem nächsten Schritt (siehe unten) statt stillschweigend liegengelassen.

## Rollback-Anleitung (konsolidiert)

| Änderung | Rollback |
|---|---|
| `NOMINATIM_CONTACT` Environment Variable (falls von Kevin manuell gesetzt) | Netlify-Dashboard → Environment variables → Eintrag löschen oder leeren; Code fällt automatisch auf den harmlosen Platzhalter-Kontakt zurück (kein Funktionsbruch, nur höheres theoretisches Sperr-Risiko bei Nominatim) |
| Netlify Visitor Access Control (falls von Kevin aktiviert) | Site configuration → Visitor access → Passwortschutz/SSO-Login wieder deaktivieren; sofortige Wirkung, kein Deploy nötig |
| `alert()` → Toast-Umstellung (Phase 22, bereits gemerged auf diesem Branch) | `git revert 40caee3` (einzelner, in sich abgeschlossener Commit) |
| Dieser gesamte Branch | Solange nicht nach `main` gemergt: folgenlos, `main` bleibt unverändert; Branch kann jederzeit gelöscht/neu aufgesetzt werden |

## Blocker-Liste (aktualisiert, ersetzt die Liste aus Phase 22)

| # | Was blockiert? | Warum? | Entscheidung nötig? | Empfehlung | Nächster Schritt |
|---|---|---|---|---|---|
| B1 | Zugriffsschutz aktivieren | **Voraussichtlich kostenpflichtig** (Account läuft auf Netlify-Free-Plan, Visitor Access Control ist historisch eine bezahlte Funktion) — nicht live verifizierbar aus dieser Sandbox | Ja, echte Kevin-Entscheidung (Kosten) | Erst Preis im Dashboard prüfen, dann entscheiden; technisch vorbereitet (B.3) | Kevin prüft Netlify-Billing, gibt Go/No-Go |
| B2 | `NOMINATIM_CONTACT` verifiziert gesetzt | Netlify-API-Schreib-/Lesepfad widersprechen sich reproduzierbar (2 unabhängige Versuche) | Nein, reine manuelle Aktion | Manuell im Dashboard setzen (Anleitung Phase C) | Kevin trägt Wert ein, löst Deploy aus |
| B3 | SRI-Hashes für 3 CDN-Assets (6 Dateien) | Kein Netzwerkzugriff auf cdnjs.cloudflare.com aus dieser Sandbox | Nein, reines Werkzeugproblem | Strategie 1 (echte Hashes), sobald Netzwerkzugriff besteht | In Umgebung mit cdnjs-Zugriff nachholen (siehe Phase 22 für exakte Befehle) |
| B4 | CSP `unsafe-inline` entfernen | Braucht mehrstufige, risikoarme Migration (86 `onclick=`, 29 `onsubmit=`, 10 `onchange=`, 142 Inline-`style=`, 33 `<style>`-Blöcke, 61 `<script>`-Blöcke) | Ja, wann diese mehrstufige Migration begonnen werden soll | Stufenplan liegt vor (ADR-0006), Beginn erst nach Kevins Freigabe | Siehe ADR-0006 — Stufe 1 (reine Inventarisierung) ist mit diesem Dokument bereits erledigt |

## Phase G — Architekturbewertung (kurz, Details siehe ADR-0005/ADR-0006)

**Fünf größte technische Risiken (Reihenfolge = Dringlichkeit):**
1. Kein Zugriffsschutz bei künftig echten Personendaten (B1) — höchstes Risiko, weil es das einzige Risiko mit sofortiger Wirkung im laufenden Betrieb ist.
2. `unsafe-inline` in der CSP — reduziert die Wirksamkeit der CSP als zweite Verteidigungslinie gegen XSS erheblich (auch wenn der aktuelle `esc()`-Diszplin-Befund aus Phase 22 gut ist — CSP ist die Rückfallebene für den Tag, an dem doch einmal ein Fehler passiert).
3. Fehlende SRI auf CDN-Skripten (B3) — Supply-Chain-Risiko, geringe Eintrittswahrscheinlichkeit, aber hohe Wirkung (kompletter Code-Execution-Zugriff im Browser des Nutzers, falls cdnjs je kompromittiert würde).
4. 17.610-Zeilen-Single-File — kein akutes Sicherheitsrisiko, aber wachsendes Wartbarkeits-/Fehlerrisiko bei jeder künftigen Änderung.
5. In-Memory-Throttle im Geocoding-Proxy nicht global über parallele Function-Instanzen hinweg garantiert — aktuell unkritisch (Einzelnutzer), wird relevant bei künftigem Mehrbenutzerbetrieb.

**Fünf größte Hebel (was am meisten Sicherheit/Stabilität pro Aufwand bringt):**
1. Zugriffsschutz aktivieren (B1) — ein Konfigurationsschalter, größte Risikoreduktion.
2. SRI-Hashes ergänzen (B3) — rein additiv, kein Verhaltensrisiko, sobald Netzwerkzugriff besteht.
3. CSP-Stufenplan Stufe 1-2 (Inventarisierung + risikoarme Auslagerung, siehe ADR-0006) — schafft die Grundlage für Stufe 4 (CSP verschärfen), ohne selbst schon ein Risiko einzugehen.
4. ADR-0005-Modularisierung Stufe 1 (reine Read-Only-GIS-Module auslagern) — geringstes Risiko der Modularisierungsreihenfolge, sofortiger Wartbarkeitsgewinn.
5. `NOMINATIM_CONTACT` setzen (B2) — minimaler Aufwand, verhindert ein zukünftiges plötzliches Geocoding-Totalausfallrisiko durch Nominatim-Sperre.

**Bewusst NICHT jetzt verändern:** `esc()`-Escaping-Logik (bereits korrekt, Phase 22), `confirm()`-Gates (bereits korrekt, Phase 22), Datenmodell/Storage-Schema (stabil, keine Notwendigkeit), Kartenengine/GIS-Provider-Anbindung (funktioniert, siehe ADR-0002/ADR-0003), jede Form von Komplett-Rewrite oder Bundler-Einführung (unverhältnismäßiges Risiko für den aktuellen Auftrag).

## Nächste Schritte (Phase 23, historisch)

Siehe `docs/adr/ADR-0006-csp-haertung-stufenplan.md` für den vollständigen 5-Stufen-CSP-Plan (Phase F). Pull Request wurde im Anschluss als PR #9 gegen `main` erstellt, **nicht gemergt**.

---

## Phase 24 — NOMINATIM_CONTACT-Live-Verifikation (nach Kevins manuellem Dashboard-Setzen)

Kevin hat `NOMINATIM_CONTACT` manuell im Netlify-Dashboard angelegt (Scope: alle, gleicher Wert für alle Deploy-Kontexte) und am 12.07.2026 um 22:25 Uhr einen neuen Production-Deploy ausgelöst. Diese Phase verifiziert den Erfolg **so weit wie technisch aus dieser Sandbox möglich** — mit expliziter Offenlegung der Grenze dieser Verifikation.

### 1. Ist `NOMINATIM_CONTACT` in den Functions tatsächlich verfügbar? ✅ Verifiziert

Erneuter `manage-env-vars`/`getAllEnvVars`-Aufruf über die Netlify-API zeigt jetzt (im Unterschied zu allen vorherigen Versuchen in Phase 22/23):
```
key: NOMINATIM_CONTACT
scopes: ["builds","functions","post_processing","runtime"]
values: [{ value: "keim.kevin.kk@gmail.com", context: "all" }]
updated_by: Kevin Keim (keim.kevin.kk@gmail.com)
updated_at: 2026-07-12T19:33:46Z
```
Scope schließt `functions` explizit ein — die Function `geocode` kann den Wert zur Laufzeit lesen. **Auffällig und dokumentationswürdig:** Meine eigenen zwei Schreibversuche in Phase 22/23 über exakt dieselbe API meldeten ebenfalls „Environment variable upserted", blieben aber beim Auslesen dauerhaft unsichtbar. Kevins Aktion über das echte Netlify-Dashboard war erfolgreich und ist jetzt korrekt sichtbar — das bestätigt im Nachhinein, dass es sich um einen echten, reproduzierbaren Fehler auf der Schreib-Seite dieser spezifischen MCP-Werkzeuganbindung handelte (nicht um ein generelles API-Problem oder einen Fehler meinerseits bei der Bedienung), während der Lesepfad und das Dashboard selbst zuverlässig funktionieren.

### 2. Verwendet die Geocoding-Funktion den Wert korrekt? ✅ Code verifiziert, ⚠️ Laufzeitverhalten nicht direkt einsehbar

Codeprüfung (unverändert seit Phase 23, `netlify/functions/geocode.js` Zeile 24-27):
```js
function buildUserAgent() {
  var contact = process.env.NOMINATIM_CONTACT || 'bitte-NOMINATIM_CONTACT-env-var-setzen@example.invalid';
  return 'KeimCRMPro-Geocoder/1.0 (' + contact + ')';
}
```
Liest ausschließlich aus `process.env.NOMINATIM_CONTACT`, fällt nur beim Fehlen der Variable auf den Platzhalter zurück. Da die Variable jetzt mit Scope `functions` gesetzt ist, verwendet jeder **neue** Function-Kaltstart automatisch den echten Wert im `User-Agent`-Header gegenüber Nominatim. Ich kann diesen tatsächlichen Header-Inhalt zur Laufzeit nicht direkt einsehen (kein Log-Lesewerkzeug in dieser Session verfügbar, siehe Punkt 4) — die Aussage stützt sich auf Code-Logik + bestätigte Env-Var-Verfügbarkeit, nicht auf eine beobachtete Live-Anfrage.

### 3. Funktionieren Karten und Adresssuche auf der Production-Seite? ⚠️ Nicht live nachprüfbar aus dieser Sandbox — aber strukturell unverändert

**Wichtiger Fakt:** Der neue Deploy (`6a53f833e24f9ead5fecd7f6`, erstellt 2026-07-12T20:25:24Z = 22:25 Uhr MESZ, passt exakt zu Kevins Angabe) hat denselben `commit_ref` wie der vorherige Deploy: `09e4fc6f4607522f140a8bd8cf0c656a73215f67`. Netlify bestätigt selbst: „All files already uploaded by a previous deploy with the same commits" — **kein einziges ausgeliefertes Byte an `index.html`, CSS oder Client-JS hat sich geändert**, nur die drei Functions wurden mit der neuen Umgebungsvariable neu gebaut (Function-Digests identisch zum vorherigen Deploy: `geocode` weiterhin `669aaaa8...`, `wms-capabilities` weiterhin `d36ca3cb...`, `wms-feature-info` weiterhin `251286db...` — reiner Umgebungswechsel, kein Code-Drift).

Daraus folgt zwingend: Da genau dieser Commit (`09e4fc6`) bereits vor diesem Deploy lokal mit der vollen E2E-Suite getestet wurde (Phase 22/23, mehrfach 12/12 PASS, inkl. Kartenrendering, Chart.js-Laden, XSS-Regression, kein horizontaler Overflow), **kann sich an Karten/Chart.js/Leaflet/CSP durch diesen Deploy nichts verändert haben** — diese Bereiche sind rein clientseitig und vom Functions-Redeploy vollständig unberührt.

Direkter Live-Aufruf war nicht möglich: sowohl `curl` als auch das WebFetch-Werkzeug scheitern für `maklercrm.netlify.app` in dieser Sandbox mit HTTP 403 auf reiner Netzwerk-/Infrastrukturebene (derselbe Typ Blockade wie zuvor bei `cdnjs.cloudflare.com` und `netlify.com` — die Sandbox erlaubt offenbar nur eine enge Werkzeug-/API-Allowlist, keine freien Web-Aufrufe, auch nicht auf die eigene Produktions-URL). **Das ist eine ehrliche Grenze dieser Verifikation, kein angenommener Erfolg.**

**Konkrete Bitte an Kevin zur letzten Lücke:** Bitte einmal kurz selbst live auf `https://maklercrm.netlify.app` eine neue Adresse in CRM/Objekte speichern (z. B. Testadresse) und prüfen, dass auf der Karte ein Marker erscheint — das ist der einzige verbleibende Nachweis, den ich technisch nicht selbst erbringen kann.

### 4. Enthalten die Function-Logs neue Fehler? ❌ Nicht einsehbar aus dieser Sandbox

Es steht in dieser Session kein Werkzeug zum Lesen von Netlify-Function-Ausführungslogs zur Verfügung (nur Projekt-/Deploy-/Team-/User-/Extension-Metadaten, keine Log-Inhalte). Ich kann diesen Punkt **nicht** verifizieren und behaupte nicht, dass die Logs fehlerfrei sind. **Bitte selbst prüfen:** Netlify-Dashboard → „maklercrm" → *Logs → Functions → geocode*, dort nach Einträgen nach 20:25 Uhr (12.07.2026) mit `error`/`5xx` filtern.

### 5. Treten CORS-, Nominatim-, Leaflet- oder CSP-Probleme auf? ⚠️ Teilweise beantwortbar

- **CSP/Leaflet:** Siehe Punkt 3 — unverändertes `index.html`, bereits vollständig getestet, kann durch diesen reinen Functions-Redeploy nicht neu betroffen sein.
- **CORS:** Die Netlify Function `geocode.js` selbst setzt keine expliziten CORS-Header, ist aber auch nicht dafür ausgelegt, von einer fremden Origin aus aufgerufen zu werden — der Client (`index.html`, ausgeliefert von derselben Origin `maklercrm.netlify.app`) ruft `/.netlify/functions/geocode` als **Same-Origin**-Anfrage auf (kein `fetch` zu einer anderen Domain), CORS ist hier strukturell gar nicht relevant. Das war schon vor dieser Änderung so und bleibt unverändert.
- **Nominatim:** Ohne Log-Zugriff oder Live-Aufruf nicht direkt prüfbar, ob Nominatim mit dem neuen Kontakt tatsächlich erfolgreich antwortet. Indirektes Argument: Die Funktion war schon vorher (mit dem Platzhalter-Kontakt) funktionsfähig — Nominatim blockiert erst bei tatsächlichem Regelverstoß (Missbrauch/hohes Volumen), nicht per se wegen eines Platzhalter-Strings in der Kontaktangabe selbst. Der reale Effekt der Änderung ist daher eher präventiv (reduziertes Sperrrisiko bei künftig höherem Volumen) als eine sofort sichtbare Verhaltensänderung — ein „vorher kaputt, jetzt repariert"-Vergleich ist hier gar nicht zu erwarten.

### 6. Vollständige Test-Suite erneut ausgeführt

Da sich am ausgelieferten Code nichts geändert hat (siehe Punkt 3), wurde dennoch — wie von Kevin ausdrücklich verlangt — die komplette lokale Suite ein weiteres Mal ausgeführt (dritte unabhängige Ausführung in dieser Engagement-Phase): `npm run lint` (0 Fehler), `npm run check:functions` (grün), vollständiger `npm run test` (`test:functions` + alle 11 E2E-Dateien) → **12/12 PASS, 0 FAIL**, identisch zu den vorherigen zwei Durchläufen.

### Ergebnis B2

**Status: Umgesetzt, mit einer offenen, ehrlich benannten Lücke.** Die Environment Variable ist nachweislich korrekt gesetzt und für Functions verfügbar (API-verifiziert), der Code liest und verwendet sie korrekt (code-verifiziert), der Deploy ist strukturell sauber und ohne Code-Drift (deploy-metadata-verifiziert). Die tatsächliche Live-Ausführung (reale Nominatim-Antwort, Abwesenheit neuer Function-Fehler) konnte ich **nicht** direkt beobachten, da dieser Sandbox sowohl der Netzwerkzugriff auf die Produktions-URL als auch ein Log-Lesewerkzeug fehlen. B2 wird daher als **überwiegend gelöst mit einer kleinen, klar benannten manuellen Restprüfung für Kevin** geführt (siehe Punkt 3), nicht vollständig geschlossen ohne diesen letzten Schritt.
