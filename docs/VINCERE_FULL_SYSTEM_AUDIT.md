# VINCERE / MaklerCRM – vollständiger Systemaudit

**Audit-Datum:** 13. Juli 2026  
**Repository:** `keimkevinkk-netizen/Makler-CRM-FINAL`  
**Geprüfter Produktionsstand:** `main` bei Commit `2dbc668c461db96c93d9a73fb5bc79ac1d809b67`  
**Audit-Branch:** `audit/vincere-full-system-review`  
**Produktions-Deploy:** Netlify-Deploy `6a54d15e3de07900081bf50b`, Status `ready`, veröffentlicht am 13. Juli 2026  
**Namensregel:** Der zukünftige Markenname VINCERE wird in diesem Bericht verwendet. Es wurde keine pauschale Umbenennung im Code oder in der Benutzeroberfläche vorgenommen.

---

## 0. Prüfgrundlage, Umfang und Grenzen

Dieser Audit bewertet den tatsächlich auf `main` liegenden und auf Netlify veröffentlichten Stand. Offene Pull Requests werden als noch nicht produktiv behandelt. Das betrifft insbesondere:

- PR #11 `feat/sales-execution-core-v1`: technisch umfangreicher Next-Best-Action- und Anrufworkflow, CI erfolgreich, aber noch nicht Bestandteil von `main` oder Produktion.
- PR #12 `chore/gemini-cli-setup`: reine Arbeitsanweisung, noch nicht Bestandteil von `main`.

Geprüft wurden:

- Repository-Metadaten, Hauptdateien, PRDs, ADRs und Phasenberichte,
- `package.json`, CI-Workflow, zentrale Testdateien,
- Netlify-Konfiguration, aktueller Deploy, Functions und Environment-Variable-Metadaten,
- Dateninventar und Schema-Registry,
- dokumentierte Architektur- und Produktverträge,
- bekannte Grenzen der CRM-, Follow-up-, Pipeline-, Markt-, Karten-, KI-, Backup- und Navigationsbereiche,
- aktuelle Governance zwischen Branch, Merge und Production-Deployment.

### Nicht vollständig ausführbare Prüfungen

Ein normaler lokaler `git clone` war in der Audit-Umgebung wegen blockierter DNS-/Netzwerkauflösung nicht möglich. Deshalb konnten `npm ci`, lokale Playwright-Läufe und ein eigener Browserdurchlauf nicht unmittelbar in dieser Sitzung ausgeführt werden. Dieser Punkt wurde nicht übersprungen, sondern durch folgende Evidenz ersetzt:

- direkte Datei- und Commit-Prüfung über die GitHub-Schnittstelle,
- Prüfung vorhandener GitHub-Actions-Läufe,
- Prüfung des aktiven Netlify-Deploys und seiner Functions,
- Abgleich mit den im Repository dokumentierten Test- und Phasenberichten.

Für PR #11 liegt ein erfolgreicher CI-Lauf vor. Der CI-Lauf von PR #12 scheiterte bereits beim Herunterladen der GitHub Actions mit `Service Unavailable`; dies ist ein Infrastrukturfehler und kein bestätigter Codefehler. Für den aktuellen Produktionscommit war über die verfügbare Commit-Abfrage kein PR-bezogener Workflow-Lauf abrufbar.

---

# A. Executive Summary

## A.1 Gesamturteil

MaklerCRM ist kein leeres Mock-up. Es enthält erhebliche fachliche Substanz, echte lokale Datenhaltung, funktionierende CRM-, Follow-up-, Pipeline-, Markt-, Karten-, Backup- und Analysebausteine sowie eine ungewöhnlich umfangreiche Dokumentation.

Der aktuelle Stand ist jedoch noch **kein marktführendes, sicher skalierbares SaaS-Produkt**. Er ist ein leistungsfähiger persönlicher Prototyp mit produktiver Nutzung, dessen größte Risiken nicht in fehlenden Einzelfunktionen liegen, sondern in:

1. fehlenden technischen Schutzgeländern für Merge und Deployment,
2. einer sehr großen und nur teilweise statisch geprüften Single-File-Codebasis,
3. parallelen Daten- und Navigationsverträgen,
4. unzuverlässiger Test-Gate-Logik,
5. fehlender stabiler Identitätsverknüpfung zwischen Kontakten, Follow-ups, Aktivitäten und Pipeline,
6. fehlendem Zugriffsschutz und fehlender Mehrbenutzerarchitektur,
7. noch nicht produktiv integrierter Next-Best-Action- und Anrufsteuerung,
8. fehlender echter KI-Inferenz und fehlender lernender Vertriebsrückkopplung.

### Reifegrad

| Bewertungsdimension | Einschätzung | Begründung |
|---|---:|---|
| Persönliches Single-User-Arbeitssystem | **6/10** | Viele reale Module und lokale Arbeitsabläufe sind vorhanden. |
| Vertriebsbetriebssystem im aktuellen Produktionsstand | **4/10** | Gute Einzelworkflows, aber kein vollständig geschlossener Tages-, Anruf- und Lernkreislauf. |
| Technische Wartbarkeit | **3/10** | Rund 18.600 Zeilen in einer Hauptdatei, viele globale Verträge und historische Schichten. |
| Datenintegrität | **4/10** | Teilweise kanonische Stores, aber weiterhin Legacy-Keys und namensbasierte Beziehungen. |
| Sicherheit und Datenschutz | **3/10** | Gute Einzelmaßnahmen, aber öffentlich ohne Zugriffsschutz, CSP mit `unsafe-inline`, lokale personenbezogene Daten ohne Rollenmodell. |
| Skalierbarkeit für Teams/SaaS | **2/10** | LocalStorage, keine Benutzer-/Mandantentrennung, keine Synchronisation oder Konfliktlösung. |
| Strategisches Marktpotenzial | **8/10** | Die Verbindung aus Daily Execution, Telefonführung und lokaler Marktintelligenz kann ein echter Vorteil werden. |

## A.2 Größte Stärken

- Klare Produktthese: tägliche Ausführung, Telefonie, Follow-ups und Pipeline stehen vor dekorativem Reporting.
- Umfangreiche PRD-, ADR- und Phasendokumentation.
- Local-first-Kern mit Backup/Export und Offline-Fähigkeit.
- Bestehende Modulgrenzen durch `KK_BOOT` und `window.KK_*`-APIs.
- Mehrere echte Fehler wurden bereits durch synthetische Daten und Playwright entdeckt und behoben.
- Zentrale Objekt-API und Objekt-Policy wurden zuletzt verbessert.
- Markt- und GIS-Anbindung nutzt serverseitige Allowlist-Proxys statt beliebiger Ziel-URLs.
- PR #11 adressiert mehrere der wichtigsten Vertriebslücken bereits in einer technisch nachvollziehbaren Form.

## A.3 Gefährlichste Befunde

### P0 – Freigabe- und Deployment-Governance hat versagt

Der aktuelle Produktionscommit trägt selbst den Text **„NICHT MERGEN“**, liegt dennoch auf `main` und wurde automatisch als Production-Deploy veröffentlicht. Damit ist bewiesen, dass die gewünschte Regel „kein Merge und kein Deployment ohne ausdrückliche Freigabe“ technisch nicht erzwungen wird.

**Folge:** Ein zukünftiger fehlerhafter, destruktiver oder unfertiger Commit kann trotz textlicher Warnung produktiv gehen.

### P0 – Der zentrale Smoke-Test kann trotz Fehlern grün bleiben

`tests/e2e/verify.js` protokolliert XSS-Ausführung, rohe HTML-Injektion, horizontale Überläufe, Console-Errors und `pageerror`-Einträge lediglich. Es existierte keine abschließende Assertion, die den Prozess bei einem solchen Befund mit Exit-Code 1 beendet.

**Folge:** Berichte wie „XSS, Console und Overflow grün“ waren für diesen Test allein nicht belastbar. Ein Test, der nur loggt, ist ein Diagnosewerkzeug, aber kein CI-Gate.

### P1 – Der größte Codebereich wird nicht gelintet oder typgeprüft

Das ESLint-Skript prüft nur `netlify/functions`, `tests` und `eslint.config.js`. Die rund 18.600 Zeilen eingebettetes Frontend-JavaScript in `index.html` werden nicht durch ESLint erfasst. Ein Typecheck existiert nicht. Ein Build-Skript existiert ebenfalls nicht.

### P1 – Beziehungen werden teilweise über Namen statt IDs hergestellt

Follow-up-Rollen, letzte Aktivitäten und Kontaktöffnung werden im Produktionsstand namensbasiert aufgelöst. Doppelte Namen, Namensänderungen oder abweichende Schreibweisen können falsche Datensätze verbinden.

### P1 – Zugriffsschutz fehlt

Der aktive Netlify-Stand ist ohne Passwort und ohne SSO öffentlich erreichbar. Externe Besucher erhalten zwar nicht automatisch Kevins LocalStorage-Daten, aber jedes Gerät beziehungsweise Browserprofil mit gespeicherten Daten kann die Anwendung ohne zusätzliche Authentifizierung öffnen. Für ein System mit Telefonnummern, Adressen, Notizen und Vertriebsinformationen ist das kein tragfähiger Produktzustand.

---

# B. Systeminventur

## B.1 Laufzeit- und Architekturübersicht

| Bereich | Aktueller Stand |
|---|---|
| Frontend | Vanilla HTML/CSS/JavaScript, überwiegend in `index.html` |
| Größe Hauptdatei | ca. 18.600 Zeilen; vorher dokumentiert ca. 2,2 MB |
| Inline-Skripte | historisch ca. 61 Blöcke |
| Modul-Lifecycle | `KK_BOOT.register(...)`, zuletzt dokumentiert 47 benannte Module |
| Globale APIs | zuletzt dokumentiert 24 `window.KK_*`-Verträge; durch neuere Objektmodule inzwischen mehr |
| Persistenz | LocalStorage über `KK_STORE` plus direkte/Legacy-Zugriffe |
| Hosting | Netlify, statische Veröffentlichung aus Repository-Root |
| Serverlogik | drei Netlify Functions |
| CI | GitHub Actions, Node 24, ESLint, Parser-Tests und Playwright |
| Zielgruppe aktuell | primär ein Nutzer, ein Browserprofil, lokale Daten |

## B.2 Hauptnavigation

Die zentrale E2E-Liste enthält zehn Hauptbereiche:

1. Heute
2. Marktmonitor
3. CRM
4. Follow-ups
5. Pipeline
6. Tippgeber
7. KI-Prompts
8. KPIs
9. Backup
10. Wissen

Zusätzlich existieren zahlreiche Unteransichten, Dialoge, Formulare und historische Workspaces. Die Navigation wird noch über mindestens zwei parallele Tab-Listen gepflegt:

- `KK_APP_SHELL.REGISTRY`
- `KK_V30_SHELL.tabs`

Diese Doppelliste ist im Repository selbst als Übergangsschuld dokumentiert.

## B.3 Wesentliche Frontend-Plattformbausteine

Dokumentierte öffentliche Verträge umfassen unter anderem:

- `KK_STORE`
- `KK_UTIL`
- `KK_BOOT`
- `KK_APP_SHELL`
- `KK_NAV`
- `KK_COMMAND_CENTER`
- `KK_CRM_PRO`
- `KK_MAP`, `KK_REALMAP`
- `KK_MARKET`, `KK_DATA_CORE`
- `KK_GEO`, `KK_GEOCODE`
- `KK_OFFICIAL_GIS`
- `KK_DATASOURCE_REGISTRY`
- `KK_REPO`
- `KK_MARKET_OBS`, `KK_MARKET_OBS_UI`
- `KK_VALUATION`
- `KK_MKK_MAP`, `KK_MKK_ZOOM`, `KK_MKK_PLAN`
- `KK_OBJECTS`

## B.4 Datenbereiche

### Kanonisch beziehungsweise als Hauptquelle vorgesehen

- Kontakte: `kk_crm_contacts`
- Aktivitäten: `kk_crm_activities`
- Objekte: `kk_crm_objects`
- Follow-ups: `kk_followups`
- Verkaufspipeline: `kk_sales_pipeline`
- Empfehlungen/Tippgeber: `kk_crm_referrals`, ergänzende Referral-Stores
- Datenqualität: `kk_data_quality_queue`
- Marktanalyse/Referenzen: mehrere spezialisierte Markt-Stores

### Parallel- und Legacy-Strukturen

Die Schema-Registry und das Ist-Inventar enthalten weiterhin unter anderem:

- `kk_crm_followups`
- `kk_fu_items`
- `kk_eigentuemer`
- `kk_crmpro_leads`
- `kk_pipeline_deals`
- `kk_sales_pipeline_v15`
- `kk_pipeline_module`
- `kk_pipeline_production_stages_v1`
- `kk_crm_owner_pipeline`
- `kk_valuation_pipeline`
- `kk_market_monitor_entries_v1`
- `kk_market_observations_v1`
- `kk_angebot_monitor_entries_v1`
- `kk_offer_monitor_entries_v1`
- mehrere Referral-/Tippgeber-Stores

Die zentrale Objekterfassung reduziert einen wichtigen Teil dieser Fragmentierung, löst aber nicht die gesamte Datenlandschaft.

## B.5 Netlify Functions

| Function | Aufgabe | Hauptbefund |
|---|---|---|
| `geocode` | Nominatim-Proxy | Kontakt-Variable vorhanden; lokale In-Memory-Drosselung ist in Serverless nicht global garantiert. |
| `wms-capabilities` | BORIS/ALKIS GetCapabilities | Ziel-Hosts sind allowlisted; eigener XML-Extraktor bleibt wartungsintensiv. |
| `wms-feature-info` | BORIS/ALKIS GetFeatureInfo | Ziel-Hosts allowlisted; Layer- und Geometrieparameter benötigen strengere Größen-/Bereichsgrenzen. |

Der aktuelle Deploy nutzt Node.js 24. Die Functions laufen in einer US-Region, obwohl Nutzer und primäre Upstream-Dienste in Deutschland liegen.

## B.6 Environment Variables

`NOMINATIM_CONTACT` ist vorhanden und für Functions verfügbar. Der Wert ist nicht als Secret markiert, was für eine bewusst übertragene Nominatim-Kontaktadresse fachlich vertretbar ist. Die Variable ist jedoch breiter als nötig auf Builds, Functions, Post-Processing und Runtime scoped. Für das aktuelle System genügt grundsätzlich der Functions-Scope.

## B.7 Externe Ressourcen und Dienste

- Chart.js über cdnjs
- Leaflet beziehungsweise Kartenressourcen über externe CDNs/Dienste
- Google Fonts
- OpenStreetMap/Nominatim
- BORIS Hessen WMS
- ALKIS/Geoportal Hessen WMS

SRI-Hashes für externe Skripte sind als offener Punkt dokumentiert.

## B.8 Tests und Qualitätsprüfungen

Vorhanden sind:

- Syntaxprüfung der Netlify Functions
- ESLint für Functions und Tests
- WMS-Parser-Unit-Tests
- Playwright-Smoke-Test
- fokussierte E2E-Tests für Accessibility, Datenquellen, GIS, Repository-Layer, Charts, Datenqualität, Masterprompt-Phasen, Karten, Geocoding-Reihenfolge und Objektmigration

Nicht vorhanden beziehungsweise nicht ausreichend:

- Typecheck
- Linting des eingebetteten Frontend-JavaScripts
- Code-Coverage
- verlässliche Assertions im bisherigen zentralen `verify.js`
- Geocode-Function-Unit-Test
- automatischer Test aller neu hinzukommenden `test-*.js`-Dateien im CI-Workflow ohne manuelle Workflow-Erweiterung
- vollständiger Live-Integrationstest gegen den produktiven Netlify-Stand

---

# C. Fehlerregister

| ID | Priorität | Kategorie | Befund | Auswirkung | Empfohlene Lösung |
|---|---|---|---|---|---|
| AUD-P0-001 | P0 | Governance | Ein Commit mit „NICHT MERGEN“ liegt auf `main` und ist produktiv deployed. | Freigaberegeln sind nicht technisch erzwungen. | Main-Ruleset: PR-Pflicht, erforderliche CI-Checks, kein Direct Push, optional Code-Owner/Freigabe; Netlify nur aus geschütztem `main`. |
| AUD-P0-002 | P0 | Tests | `verify.js` protokolliert kritische Fehler ohne fehlerschlagende Assertion. | Falsche grüne CI- und Abschlussberichte möglich. | Test bei XSS, raw HTML, Overflow, Console- oder Page-Errors mit Exit 1 beenden. Im Audit-Branch umgesetzt. |
| AUD-P1-003 | P1 | Codequalität | ESLint prüft den größten Frontend-Code nicht. | Syntax-, Scope-, Promise- und Wartungsfehler bleiben unentdeckt. | Inline-Skripte zunächst extrahieren/validieren; danach modulweise ESLint. |
| AUD-P1-004 | P1 | Typ-/Datenqualität | Kein Typecheck; zahlreiche lose Objektformen und optionale Felder. | Fehler durch Feldnamen, falsche Typen und undefinierte Werte. | JSDoc-Datentypen + schrittweises `checkJs`, später TypeScript nur bei messbarem Nutzen. |
| AUD-P1-005 | P1 | Navigation | Zwei parallele Tab-Registries müssen manuell synchron bleiben. | Falsche Deep Links, unsichtbare Panels und inkonsistente Navigation. | `KK_NAV` als einzige Registry etablieren; Adapter für Legacy-Aufrufer. |
| AUD-P1-006 | P1 | Datenschutz | Öffentliche Anwendung ohne Passwort, SSO oder Nutzeranmeldung. | Jeder mit Zugriff auf das Browserprofil kann gespeicherte personenbezogene Daten öffnen. | Zugriffsschutz als eigenes Arbeitspaket entscheiden und umsetzen. |
| AUD-P1-007 | P1 | Datenbeziehungen | Kontakt-, Follow-up- und Aktivitätsbeziehungen teilweise namensbasiert. | Falsche Zuordnung bei Dubletten, Umbenennung oder Schreibvarianten. | stabile `contactId`-Referenzen, Ambiguitäts-Queue und kontrollierter Backfill. PR #11 enthält einen Ansatz. |
| AUD-P1-008 | P1 | Datenarchitektur | Mehrere parallele Stores für gleiche oder verwandte Entitäten. | Doppelte Wahrheit, inkonsistente KPI-Werte, schwierige Migrationen. | pro Entität kanonischen Store + Read-Adapter + deprecationsfähigen Migrationsplan. |
| AUD-P1-009 | P1 | Follow-up | Follow-ups besitzen im Produktionsstand kein einheitliches Uhrzeit-/Prioritätsmodell. | Tagesreihenfolge ist unpräzise; wichtige Rückrufe konkurrieren alphabetisch. | optionales `dueAt`, manuelle Priorität und klare Sortierregel ergänzen. |
| AUD-P1-010 | P1 | Reaktivität | Follow-up-Statistiken und Listen aktualisieren sich nicht zuverlässig bei Fremdmodul-Schreibvorgängen. | Nutzer sieht veraltete Zustände bis zum Tabwechsel. | kanonische `kk:entity-changed`-Events und gezieltes Re-Rendern. |
| AUD-P1-011 | P1 | CI | CI listet E2E-Dateien einzeln, statt den bereits vorhandenen vollständigen Test-Runner zu verwenden. | Neue Testdateien können unbeabsichtigt nicht laufen. | einen zentralen `npm test`-/Discovery-Schritt als Gate verwenden; Einzelschritte optional zusätzlich für Diagnose. |
| AUD-P1-012 | P1 | Geocoding | `lastRequestAt` ist nur pro warmer Function-Instanz gültig. | Mehrere Instanzen/gleichzeitige Aufrufe können Nominatims globale Rate überschreiten. | persistente Drosselung/Queue oder geeigneten Provider; zusätzlich Client- und Endpoint-Abuse-Limits. |
| AUD-P1-013 | P1 | API-Missbrauch | Öffentliche GET-Functions besitzen keine anwendungsweite Rate-/Abuse-Kontrolle. | Fremde können die App als Lastverstärker gegen amtliche Dienste/Nominatim nutzen. | Netlify Rate Limiting/Edge Gate oder serverseitiger Token-Bucket; Parametergrenzen und Monitoring. |
| AUD-P1-014 | P1 | KI | Keine produktive serverseitige LLM-Integration, kein AI-Provider, keine Evaluation. | „KI-Prompt-Assistent“ ist im Kern ein lokaler Prompt-/Textbausteinbereich, nicht der geforderte kontextuelle Verkaufsassistent. | erst Datenvertrag, Gesprächsworkflow und Eval-Suite; danach serverseitige AI-Integration. |
| AUD-P1-015 | P1 | Backup | LocalStorage-Backup ist nicht automatisch geräteextern. | Geräteverlust, Browserbereinigung oder Profildefekt kann Datenverlust verursachen. | verschlüsseltes Off-Device-Backup oder kontrollierte Cloud-Synchronisation. |
| AUD-P2-016 | P2 | Datenmodell | Kein verlässliches, einheitliches Aktiv-/Archiv-Flag für Kontakte. | Next-Step-Coverage und Priorisierung beziehen tote/inaktive Kontakte ein. | `lifecycleStatus` mit klarer Migration und Filterregeln. |
| AUD-P2-017 | P2 | Pipeline | Engpassübersicht hat keinen eigenständigen Typ „Deadline überfällig“. | Kritische Deals können nur auf Kartenebene, nicht in der zentralen Engpassliste auffallen. | Risikokatalog konsolidieren und aus einer Funktion ableiten. |
| AUD-P2-018 | P2 | Sicherheit | CSP erlaubt `unsafe-inline`; externe Skripte ohne SRI. | XSS- und Supply-Chain-Schutz ist schwächer als nötig. | ADR-0005 modularisieren, dann ADR-0006 CSP stufenweise härten und SRI ergänzen. |
| AUD-P2-019 | P2 | Sicherheit | CSP besitzt keinen engen `connect-src`; `default-src https:` ist breit. | Kompromittierter Inline-Code könnte zu beliebigen HTTPS-Zielen verbinden. | benötigte Ziele inventarisieren und `connect-src` minimieren. |
| AUD-P2-020 | P2 | Security Headers | HSTS und weitere moderne Header fehlen; CSP liegt nur als Meta-Tag vor. | Schutz gilt nicht vollständig auf Response-Ebene; schwächere Transport-/Isolationshärtung. | Header-Set nach Kompatibilitätsprüfung erweitern. |
| AUD-P2-021 | P2 | Performance | ca. 18.600 Zeilen/ca. 2,2 MB werden weitgehend als eine Datei geladen und geparst. | Langsamer Start, große Diffs, hohe Seiteneffektgefahr, besonders mobil. | ADR-0005 als kleine mechanische Strangler-Wellen umsetzen. |
| AUD-P2-022 | P2 | Skalierung | LocalStorage arbeitet synchron und speichert häufig komplette Arrays. | UI-Blockaden und steigende Fehleranfälligkeit bei vielen Tausend Aktivitäten. | Repository-Grenzen festigen; später IndexedDB/Server-Persistenz hinter denselben Verträgen. |
| AUD-P2-023 | P2 | Netlify | Functions laufen geografisch weit vom Nutzer und den Hessen-Upstreams entfernt. | zusätzliche Latenz für Karten-/Geodatenabfragen. | verfügbare EU-Region beziehungsweise passenden Hostingpfad prüfen. |
| AUD-P2-024 | P2 | UX | Mehrere Workflows verwenden native `prompt()`/`confirm()`-Dialoge. | Unstrukturierte Ergebnisse, schlechte mobile UX, eingeschränkte Validierung. | bestehende native `<dialog>`-Komponenten wiederverwenden. |
| AUD-P2-025 | P2 | Dokumentation | Inventare und Zeilenangaben sind nach mehreren Phasen veraltet. | Entwickler verlassen sich auf unvollständige Modul-/Key-Listen. | Inventar automatisiert aus Code erzeugen und im CI auf Drift prüfen. |
| AUD-P3-026 | P3 | WMS | eigener regex-/stackbasierter XML-/GML-Parser statt standardisiertem Parser. | seltene Namespaces, Entities, CDATA oder Sonderformen können fehlschlagen. | Contract-Fixtures erweitern; Parser nur bei nachgewiesenem Bedarf ersetzen. |
| AUD-P3-027 | P3 | WMS-Validierung | `layer`, `bbox`, Abmessungen und Koordinaten sind nur minimal validiert. | unnötig große oder fehlerhafte Upstream-Anfragen möglich. | Längen, Wertebereiche, erlaubte CRS und maximale Bilddimensionen begrenzen. |
| AUD-P3-028 | P3 | Env-Scopes | `NOMINATIM_CONTACT` ist breiter gescoped als für die Function nötig. | unnötige Verfügbarkeit in weiteren Netlify-Kontexten. | auf Functions-Scope reduzieren, sofern keine andere Nutzung nachgewiesen ist. |

---

# D. Unfertige oder nur teilweise fertige Funktionen

| Bereich | Status | Bewertung |
|---|---|---|
| Daily Command Center | grundsätzlich funktionsfähig, aber ausbaufähig | Deep Links und KPIs existieren; die echte deterministische Next-Best-Action-Engine ist nur in offenem PR #11. |
| Next-Best-Action | nicht produktiv | In V27 entfernt; Neuimplementierung liegt als offener PR vor. |
| Geführter Telefonzyklus | nicht produktiv | PR #11 enthält Vorbereitung, Gespräch und Nachbereitung; Produktion besitzt diesen geschlossenen Ablauf noch nicht. |
| Kontaktpolitik/Do-not-contact | nicht produktiv | additive Policy liegt in PR #11; Produktion hat keinen belastbaren zentralen Kontaktfreigabevertrag. |
| Follow-up-Modul | funktionsfähig, aber begrenzt | getrennte Ansichten und Ergebnisprotokoll vorhanden; ID-Verknüpfung, Uhrzeit, Priorität und reaktive Aktualisierung fehlen. |
| Pipeline-Risiko | grundsätzlich funktionsfähig | Live-Risiko und Historie vorhanden; Engpasskatalog noch nicht vollständig konsolidiert. |
| Zentrale Objekterfassung | weitgehend funktionsfähig | `KK_OBJECTS` und zentrale Policy vorhanden; Pipeline-Objektfelder und `kk_market_observations_v1` bleiben bewusste Ausnahmen. |
| KI-Prompt-Assistent | nur teilweise | Kein echter kontextbezogener AI-Backendpfad, keine Prompt-Evaluation, keine Halluzinations-/Kostenkontrolle. |
| Marktmonitor | funktionsfähig mit Grenzen | GIS-Basis und amtliche Dienste vorhanden; echter lizenzierter Marktdatenprovider weiterhin offen. |
| Zugriffsschutz | nicht implementiert | Netlify-Projekt ist öffentlich. |
| Modularisierung | nur geplant | ADR-0005 steht auf `Proposed`; Hauptdatei wächst weiter. |
| CSP-Härtung | nur geplant | `unsafe-inline` bleibt aktiv; SRI offen. |
| Mehrbenutzer-/Teamfähigkeit | nicht implementiert | kein Auth-, Rollen-, Mandanten- oder Sync-Modell. |
| Automatisches externes Backup | nicht implementiert | Export/Backup lokal, aber kein sicherer Off-Device-Pfad. |
| Datenaufbewahrung/Löschkonzept | teilweise dokumentiert | Registry nennt `user-controlled`, aber keine systematische Retention-/Löschautomation. |

---

# E. Entscheidende Funktionslücken für ein echtes Vertriebsbetriebssystem

## E.1 Geschlossener Vertriebszyklus

Der zentrale Produktzyklus muss vollständig und messbar sein:

`Priorisierte Aktion → Vorbereitung → Kontaktversuch → strukturiertes Ergebnis → Aktivität → nächster Schritt → Follow-up/Termin → Pipelinebewegung → Outcome → Lernsignal`

Im Produktionsstand sind diese Elemente vorhanden, aber nicht als ein einziger kontrollierter Ablauf verbunden. PR #11 ist hierfür die wichtigste aktuelle Vorarbeit.

## E.2 Stabile Kontaktidentität

Ohne stabile IDs können weder Automatisierung noch KI sicher arbeiten. Vor jeder weiteren intelligenten Funktion müssen folgende Beziehungen eindeutig sein:

- Follow-up → Kontakt
- Aktivität → Kontakt
- Pipelinechance → Kontakt
- Objekt → Eigentümer/Kontakt
- Termin → Kontakt/Objekt/Chance
- Empfehlung → Tippgeber/Kontakt

## E.3 Outcome- und Ursachenmodell

Es fehlt eine einheitliche Taxonomie für:

- erreicht/nicht erreicht,
- Gesprächsqualität,
- Motiv,
- Zeithorizont,
- Einwand,
- nächster Schritt,
- Termin gewonnen/verloren,
- Auftrag gewonnen/verloren,
- Verlustgrund,
- Quelle und Kampagne.

Ohne diese Struktur kann das System nicht lernen, welche Aktivitäten tatsächlich zu Terminen, Alleinaufträgen und Abschlüssen führen.

## E.4 Verlässliche Einwilligungs- und Kontaktpolitik

Für Telefonie, E-Mail, Empfehlungen und Reaktivierung muss pro Kontakt nachvollziehbar sein:

- erlaubter Kanal,
- Rechtsgrundlage beziehungsweise dokumentierte Freigabe,
- Sperre/Do-not-contact,
- Sperrfrist,
- Quelle und Datum,
- Bearbeiter/Änderungshistorie.

## E.5 Forecast-Kalibrierung

Wahrscheinlichkeiten und Forecasts dürfen nicht nur manuell geschätzt werden. Das System braucht später eine transparente Kalibrierung aus echten historischen Übergängen. Vorher sind komplexe Wahrscheinlichkeitsscores zurückzustellen.

## E.6 KI als Arbeitsassistent statt Textgenerator

Ein belastbarer KI-Assistent benötigt mindestens:

- strukturierten Kontaktkontext,
- Gesprächshistorie,
- Objekt-/Pipelinekontext,
- erlaubte Kontaktkanäle,
- konkrete Gesprächsphase und Ziel,
- zitierbare Faktenquellen,
- klare Trennung von Fakt, Annahme und Vorschlag,
- Eval-Datensatz mit realistischen Maklerfällen,
- Kosten-, Timeout- und Fallbacklogik.

---

# F. Quick Wins

## F.1 Sofort und risikoarm

1. `verify.js` zu einem echten fehlerschlagenden CI-Gate machen. **Im Audit-Branch umgesetzt.**
2. GitHub-Ruleset für `main`: PR-Pflicht, erforderlicher CI-Check, kein Direct Push.
3. CI auf einen zentralen Test-Discovery-Schritt umstellen, damit neue Tests nicht vergessen werden.
4. Geocode-Function mit Unit-Tests für Validierung, Timeout, Upstream-Fehler und Ergebnisnormalisierung abdecken.
5. Inventar/Schema-Registry mit den seit 11. Juli hinzugekommenen APIs, Keys und Modulen aktualisieren.
6. Netlify-Zugriffsschutz als bewusste Produktentscheidung abschließen.
7. Environment-Variable auf minimalen Scope reduzieren.
8. Pipeline-Engpasskatalog um „Deadline überfällig“ ergänzen.

## F.2 Schnell mit hoher Vertriebswirkung

1. PR #11 nicht blind mergen, sondern gezielt gegen die Audit-P0/P1-Punkte prüfen und danach als eigenes freigegebenes Arbeitspaket behandeln.
2. `contactId` für neue Follow-ups/Aktivitäten verpflichtend machen; Namensauflösung nur als Legacy-Fallback.
3. Kontakte ohne nächsten Schritt und ohne Aktivitätsdatum im Heute-Bereich sichtbar eskalieren.
4. Follow-up um optionale Uhrzeit und Priorität erweitern.
5. einheitliche Gesprächsergebnis-Auswahl statt Freitext-`prompt()`.

---

# G. Vereinfachungspotenziale

## G.1 Navigation

- Eine autoritative Tab-Registry.
- Deep Links über `KK_NAV`, keine direkten fremden DOM-Selektoren.
- Kein neuer Haupttab für neue Sales-Funktionen; vorhandenen Heute-/Kontakt-/Pipeline-Kontext verwenden.

## G.2 Daten

- Pro Entität genau ein Schreibweg.
- Legacy-Keys nur noch read-only über Adapter.
- Keine neuen Stores für Ansichten, die aus bestehenden Entitäten abgeleitet werden können.
- Gemeinsame Entity-Link- und Event-Infrastruktur statt individueller Namenssuche pro Modul.

## G.3 Oberfläche

- Native Browser-Prompts durch bestehende Dialogkomponente ersetzen.
- KPI-Karten nur anzeigen, wenn ein Klick eine konkrete Arbeitsansicht öffnet.
- historische Diagnose-/Archivbereiche aus der primären Navigation entfernen, ohne Daten zu löschen.
- gleiche Formulare nicht in verschiedenen Modulen duplizieren.

## G.4 Entwicklung

- ADR-0005 nicht als Großprojekt, sondern ein Modul pro Branch/PR umsetzen.
- zuerst read-only und Service-Module auslagern.
- keine Framework-Migration, solange der Nutzen gegenüber dem Risiko nicht belegt ist.

---

# H. Strategische Verbesserungen mit hohem langfristigem Nutzen

## H.1 Sales Execution Core

Die in PR #11 begonnene deterministische Action Engine ist ein echter Wettbewerbsvorteil, wenn sie:

- nur reale Daten verwendet,
- jede Empfehlung begründet,
- gesperrte Kontakte ausschließt,
- keine intransparenten Fantasie-Scores verwendet,
- Gesprächsergebnis und Folgeaktion atomar speichert,
- durch echte Outcomes kalibriert wird.

## H.2 Einheitliches Vertriebsereignis-Modell

Ein append-only Ereignisstrom für Anruf, Ergebnis, Follow-up, Termin, Phasenwechsel, Auftrag und Verlustgrund schafft:

- nachvollziehbare Historie,
- Conversion-Funnel,
- Ursache-Wirkungs-Analyse,
- KI-Kontext,
- Coaching und Forecast-Kalibrierung.

## H.3 Regionale Marktintelligenz

VINCERE kann sich abheben, wenn regionale Daten nicht nur angezeigt, sondern in konkrete Akquiseentscheidungen übersetzt werden:

- Gebiet mit hoher Eigentümeraktivität,
- fehlende Netzwerkabdeckung,
- Kontakte ohne Marktupdate,
- Objekte mit Preis-/Vermarktungsänderung,
- lokale Vergleichsfälle mit Quellen- und Aktualitätsnachweis.

## H.4 Persönliches Vertriebscoaching

Kein allgemeines Motivationssystem, sondern datenbasierte Hinweise wie:

- „Deine Terminquote sinkt nach Erstkontakt ohne zweiten Versuch.“
- „Follow-ups innerhalb von 48 Stunden führen häufiger zu Terminen.“
- „Einwand X tritt häufig auf, Antwortvariante Y erzielt bessere Folgeschritte.“

Dafür muss zuerst ein sauberes Outcome-Modell existieren.

## H.5 Sichere Skalierungsbasis

Vor Team- oder SaaS-Ausbau:

1. Authentifizierung,
2. Mandanten-/Nutzerzuordnung,
3. serverseitige Persistenz,
4. Rollen und Berechtigungen,
5. Änderungsprotokoll,
6. Konflikt- und Offline-Synchronisation,
7. DSGVO-Löschung und Export.

---

# I. Entfernen oder zurückstellen

## Zurückstellen

- Eigentümer-Wahrscheinlichkeitsmodelle ohne ausreichend gelabelte historische Daten.
- KI-generierte Abschlusswahrscheinlichkeiten ohne Kalibrierung.
- umfangreiche Gamification, Punkte, Badges oder künstliche Belohnungen.
- zusätzliche Dashboards ohne direkte Handlung.
- weitere Haupttabs.
- komplexe Teamrollen vor Authentifizierung und zentraler Persistenz.
- neue externe Marktdatenprovider ohne Lizenz-, Kosten- und Datenqualitätsprüfung.

## Entfernen beziehungsweise konsolidieren, sobald Migration abgesichert ist

- parallele Tab-Registries,
- tote/reservierte Storage-Keys ohne aktiven Reader/Writer,
- doppelte Schreibwege auf Legacy-Stores,
- redundante Objekt-/Kontaktformulare,
- UI-Bereiche, die ausschließlich bereits anderswo sichtbare Kennzahlen wiederholen.

Keine Daten oder Keys dürfen allein auf Basis ihres Namens gelöscht werden. Vor Entfernung sind Schreib-/Lesezugriffe, Export, Backup, Migration und Rollback nachzuweisen.

---

# J. Priorisierter Maßnahmenplan

Bewertung: 1 = gering, 5 = sehr hoch. Aufwand/Risiko: 1 = gering, 5 = hoch.

| Maßnahme | Prio | Vertriebswirkung | Zeitersparnis | Nutzerwirkung | Aufwand | Risiko | Wettbewerbsvorteil |
|---|---|---:|---:|---:|---:|---:|---:|
| Main-Branch technisch schützen | P0 | 2 | 2 | 5 | 1 | 1 | 2 |
| `verify.js` als echtes Gate | P0 | 2 | 2 | 5 | 1 | 1 | 2 |
| CI-Test-Discovery konsolidieren | P1 | 2 | 3 | 4 | 1 | 1 | 2 |
| Zugriffsschutz entscheiden/umsetzen | P1 | 1 | 1 | 5 | 2–4 | 2–4 | 2 |
| PR #11 gezielt reviewen und freigeben | P1 | 5 | 5 | 5 | 2 | 3 | 5 |
| Stabile `contactId`-Verknüpfung | P1 | 5 | 4 | 5 | 3 | 3 | 5 |
| Kontaktpolitik/Do-not-contact zentralisieren | P1 | 4 | 3 | 5 | 2 | 2 | 4 |
| Off-Device-Backup | P1 | 2 | 3 | 5 | 3 | 3 | 3 |
| Follow-up Uhrzeit/Priorität | P1 | 4 | 4 | 5 | 2 | 2 | 4 |
| Reaktive Entity-Change-Events | P1 | 3 | 4 | 4 | 3 | 3 | 3 |
| Frontend-JS lintbar machen | P1 | 2 | 3 | 4 | 3 | 2 | 2 |
| Inventar/Registry automatisieren | P2 | 1 | 3 | 3 | 2 | 1 | 2 |
| aktive/archivierte Kontakte modellieren | P2 | 4 | 3 | 4 | 2 | 2 | 4 |
| strukturierte Call-Outcome-Taxonomie | P2 | 5 | 4 | 5 | 3 | 3 | 5 |
| Lost-Deal-Ursachenanalyse | P2 | 4 | 3 | 4 | 3 | 2 | 5 |
| ADR-0005 Strangler-Welle 1–2 | P2 | 1 | 3 | 4 | 3 | 2 | 2 |
| CSP/SRI-Härtung | P2 | 1 | 1 | 4 | 3 | 3 | 2 |
| API Rate Limiting/Abuse-Schutz | P2 | 1 | 1 | 4 | 3 | 2 | 2 |
| echter AI-Sales-Assistent mit Evals | P2 | 5 | 4 | 5 | 4 | 4 | 5 |
| lokale Marktaktions-Engine | P2 | 5 | 4 | 5 | 4 | 3 | 5 |
| serverseitige Team-/SaaS-Persistenz | P3 | 4 | 4 | 5 | 5 | 5 | 4 |
| Gamification | P4 | 1 | 1 | 2 | 2 | 1 | 1 |
| Opaque Lead-/Eigentümerscores ohne Datenbasis | Entfernen/zurückstellen | 2 | 1 | 1 | 4 | 5 | 1 |

---

# K. Umsetzungswellen

## Welle 1 – Stabilität und Datenintegrität

Kleine getrennte Branches:

1. `fix/ci-smoke-assertions`
2. `chore/main-branch-protection` – Plattformkonfiguration, kein Code-Merge ohne Freigabe
3. `test/geocode-function-contracts`
4. `docs/refresh-runtime-inventory`
5. `feat/contact-id-link-adapter`
6. `feat/off-device-backup-foundation`

Abnahmekriterium: kein falsches grünes Gate, klare Hauptbranch-Kontrolle, stabile IDs für neue Datensätze, reproduzierbarer Export/Restore.

## Welle 2 – Kritische Vertriebsworkflows

1. PR #11 gegen diesen Audit reviewen.
2. geführten Anrufworkflow als ein kontrolliertes Arbeitspaket integrieren.
3. strukturierte Gesprächsergebnisse und nächste Schritte.
4. Kontakte ohne nächsten Schritt als harte Datenqualitätsverletzung.

Abnahmekriterium: Jeder ausgeführte Anruf erzeugt genau eine nachvollziehbare Aktivität und höchstens einen klaren Folgeauftrag.

## Welle 3 – Follow-up und Priorisierung

1. `dueAt` und Priorität,
2. dynamische Eskalation,
3. Kontaktpolitik,
4. Reaktivierungssequenzen,
5. Follow-up-Conversion-Auswertung.

Abnahmekriterium: Kein aktiver, wertvoller Kontakt bleibt ohne nächsten Schritt oder unbemerkt überfällig.

## Welle 4 – UX und Vereinfachung

1. eine Navigation,
2. native Dialoge statt `prompt()`,
3. schnellere Erfassung nach Telefonat,
4. historische/diagnostische Ansichten aus Primärfluss entfernen,
5. Mobile-Feldmodus mit 44px-Touch-Zielen und fokussierter Aktion.

Abnahmekriterium: zentrale Arbeitsfälle mit weniger Klicks und ohne Modulwissen ausführbar.

## Welle 5 – KI-Verkaufsassistent

1. Kontextvertrag,
2. Prompt-/Antwortschema,
3. sichere serverseitige Providerintegration,
4. Eval-Suite,
5. Fallback ohne KI,
6. Feedback-/Outcome-Lernschleife.

Abnahmekriterium: Antworten sind kontaktspezifisch, faktengebunden, handlungsorientiert und gegen realistische Fälle getestet.

## Welle 6 – Automatisierung und Marktintelligenz

1. regionale Datenqualität,
2. Quellen-/Aktualitätsstatus,
3. lokale Aktionen statt weiterer Charts,
4. Marktveränderungs-Trigger,
5. Netzwerk- und Tippgeberlücken.

Abnahmekriterium: Marktdaten führen zu konkreten, priorisierten Vertriebsaktionen.

## Welle 7 – Skalierung und Produktreife

1. Authentifizierung,
2. Mandantenmodell,
3. serverseitige Persistenz,
4. Rollen/Berechtigungen,
5. Audit Log,
6. Synchronisation und Konfliktlösung,
7. DSGVO-Export/Löschung/Retention,
8. Monitoring, Kosten- und Fehlerbudgets.

Abnahmekriterium: mehrere Makler können sicher und getrennt arbeiten, ohne lokale Datenwahrheiten zu erzeugen.

---

# L. Kontrollierte Sofortverbesserungen dieses Audit-Branches

## Umgesetzt

- Der zentrale E2E-Smoke-Test `tests/e2e/verify.js` wird so verschärft, dass XSS-Ausführung, rohe Payload-HTML-Tags, horizontale Überläufe, ungeklärte Console-Errors und `pageerror`-Einträge den Test tatsächlich fehlschlagen lassen.

## Bewusst nicht umgesetzt

- keine Umbenennung zu VINCERE,
- keine Änderung am Datenmodell,
- keine Migration,
- keine Änderung an produktiver Netlify-Konfiguration,
- kein Zugriffsschutz aktiviert,
- kein Merge,
- kein Deployment,
- keine Architekturzerlegung,
- keine Übernahme von PR #11.

---

# M. Offene Prüfungen und benötigte Zugänge

| Prüfung | Warum offen | Risiko | Späterer konkreter Schritt |
|---|---|---|---|
| Lokaler vollständiger Testlauf des Audit-Branches | Netzwerk/DNS verhinderte Repository-Clone in dieser Sitzung | Testfix könnte bisher verdeckte Fehler aufdecken | CI des Draft-PR auswerten; bei Fehler gezielt Job-Logs prüfen. |
| Browserbasierte visuelle Vollprüfung des Produktionsstands | kein interaktiver Browserzugriff auf den Live-Stand in dieser Audit-Umgebung | visuelle/Interaktionsfehler können verbleiben | Playwright gegen Deploy-Preview mit Viewport-Matrix und Screenshots. |
| GitHub-Branch-Protection-Status | nicht über verfügbare Repository-Schnittstelle abrufbar | Direct Push kann möglich sein | GitHub Settings → Rules → Rulesets prüfen; `main` schützen. |
| Vollständige Leser-/Schreiber-Matrix aller Legacy-Keys | `index.html` ist sehr groß und nicht lokal grep-bar gewesen | versteckte Parallelpfade möglich | Repository lokal klonen; pro Key `rg`-Matrix erzeugen und Registry aktualisieren. |
| Live-Last-/Rate-Limit-Test der Functions | würde amtliche Dienste/Nominatim belasten | Missbrauchsgrenze unbekannt | mit Mock-Upstream beziehungsweise Staging-Function testen, nicht gegen öffentliche Dienste. |
| Datenschutz-Fachprüfung | erfordert konkrete Rechtsgrundlagen und reale Nutzungspraxis | DSGVO-/UWG-Risiko | juristische Prüfung von Kontaktquellen, Telefonie, Löschung und Aufbewahrung. |

---

# N. Empfohlenes nächstes isoliertes Arbeitspaket

**Titel:** `Stabilitäts-Gate und Main-Schutz abschließen`

Umfang:

1. CI-Ergebnis dieses Audit-PR prüfen.
2. `verify.js`-Fix bei grünem Lauf übernehmen.
3. CI auf vollständige automatische Test-Discovery umstellen.
4. GitHub-`main` technisch gegen Direct Push und ungeprüfte Merges schützen.
5. dokumentieren, wer eine Produktionsfreigabe erteilen darf.

Nicht Teil dieses Pakets:

- PR #11 mergen,
- Datenmodell ändern,
- UI neu gestalten,
- VINCERE-Umbenennung,
- Netlify produktiv deployen.

---

# O. Schlussbewertung

Die entscheidende Erkenntnis lautet nicht, dass MaklerCRM zu wenig Funktionen besitzt. Das Gegenteil ist der Fall. Das System besitzt bereits mehr fachliche Bausteine als viele frühe CRM-Prototypen.

Der größte Hebel liegt jetzt in **Verlässlichkeit, Zusammenführung und Ausführung**:

- eine Wahrheit pro Entität,
- eine sichere Identität pro Kontakt,
- ein geschlossener Anruf- und Follow-up-Zyklus,
- ein echtes CI-Gate,
- ein technisch geschützter Produktionsweg,
- eine KI, die auf realen Daten und Ergebnissen arbeitet,
- Marktinformationen, die unmittelbar zu Handlungen führen.

VINCERE wird nicht dadurch außergewöhnlich, dass es mehr Kacheln oder Funktionen besitzt. Es wird außergewöhnlich, wenn es jeden Morgen eindeutig zeigt, welche Handlung jetzt den höchsten realistischen Vertriebswert besitzt, diese Handlung sicher unterstützt und aus dem Ergebnis nachweisbar besser wird.
