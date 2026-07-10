# ADR-0001: Zielarchitektur Backend/Datenbank/GIS — Umfang dieser Session vs. Folgephasen

## Status
Accepted

## Kontext
Ein umfassender Master-Prompt fordert die Weiterentwicklung von Keim CRM Pro zu einem "professionellen Immobilien-GIS, einer öffentlichen Immobilien-Marktdatenbank und einem skalierbaren Data-Warehouse-System" mit u. a.:
- einer produktionsfähigen serverseitigen Datenbank mit Geo-Unterstützung (PostgreSQL+PostGIS oder gleichwertig),
- Auth/RBAC, Audit-Log, Versionierung, automatisierten Jobs,
- ~35 benannten Modulen/Connectoren (DataSourceRegistry, BORISService, WMSAdapter/WFSAdapter/OGCFeaturesAdapter, OverpassConnector, GeocodingService, EntityResolutionService, ComparableSelectionEngine, ForecastingEngine, JobScheduler, ...),
- Live-Anbindung an amtliche Geodienste (BORIS Hessen, Geoportal Hessen, ALKIS/Flurstücke, Overpass/Nominatim), Statistik-/Infrastrukturquellen und (nur über offizielle/erlaubte APIs) Immobilienportale.

Die reale Ausgangslage dieser Session:
- Die Anwendung ist eine einzelne `index.html` (~15.000 Zeilen Vanilla JS), persistiert ausschließlich in LocalStorage; einzige serverseitige Komponente sind Netlify Functions (aktuell: Geocoding-Proxy).
- Diese Session läuft in einer Sandbox **ohne allgemeinen Internetzugriff** auf externe Hosts (wiederholt bestätigt über mehrere Sessions: ausgehende HTTPS-Verbindungen zu beliebigen externen Diensten werden von einem Policy-Proxy blockiert). Damit ist es technisch unmöglich, in dieser Session einen echten BORIS-/ALKIS-/Overpass-/Statistik-/Portal-Connector zu bauen oder auch nur zu testen.
- `CLAUDE.md` und `.claude/rules/netlify.md` verbieten ausdrücklich "keine kostenpflichtige Provider-Aktivierung ohne ausdrückliche Freigabe" und "Kein Push auf main, kein Produktions-Deploy ... ohne ausdrückliche Freigabe". Eine produktionsreife PostgreSQL+PostGIS-Instanz, Hosting, Auth-Provider etc. sind kostenpflichtige Infrastrukturentscheidungen, die Kevins ausdrückliche Freigabe (Anbieter, Budget, Datenschutz-Verantwortlichkeit) erfordern.
- `docs/prd/PHASENPLAN.md` dokumentiert bereits zwei strukturell identische, bislang ungelöste externe Blocker (M2: BKG-VG250-Geometrie, M7: erster echter Marktdaten-Provider) — aus denselben zwei Gründen: kein Internetzugriff in der Sandbox, keine Anbieter-/Kostenentscheidung getroffen.

## Entscheidungstreiber
- PRD-Grundsatz (Teil 1 §16, hier erneut vom Master-Prompt bekräftigt): keine erfundenen/simulierten Daten, keine vorgetäuschten Live-Verbindungen, ehrlicher Leerzustand statt Fake-Werten.
- CLAUDE.md: keine kostenpflichtige Provider-Aktivierung, kein Produktions-Deploy ohne Freigabe.
- Der Master-Prompt selbst verlangt in §4: "Treffe keine irreversible Anbieterentscheidung ohne technische Begründung" und in §19/§27: kein Big-Bang, keine Vortäuschung von Funktionalität, die nicht wirklich da ist.
- Realistische Umsetzbarkeit: ein produktionsreifes PostGIS-Backend mit Auth/RBAC/Job-Scheduler/~35 Connectoren ist ein Mehrmonats-Projekt mit mehreren Entscheidungspunkten (Hosting-Anbieter, Budget, Datenschutz-Verantwortlichkeit, Domänen-Migration bestehender `kk_*`-Daten), kein Ein-Session-Auftrag.

## Betrachtete Optionen
1. **Fake-Backend simulieren** (z. B. ein In-Browser-"Mock-Postgres" oder vorgetäuschte Connector-Antworten mit Beispieldaten), um die Anforderung optisch zu erfüllen. **Verworfen**: verstößt direkt gegen "Keine Fake-/Mock-Marktdaten als aktuelle Werte darstellen" (CLAUDE.md) und gegen den expliziten Master-Prompt-Grundsatz "Erfinde keine ... Werte".
2. **Alles ignorieren, nur Bugfixes liefern.** Verworfen: der Master-Prompt enthält auch konkret umsetzbare, sandbox-taugliche Anforderungen (strukturierte Adressen, Schätzwert-Engine auf Basis vorhandener eigener Daten, systemweite Verknüpfung), die ohne externes Backend leistbar sind und echten Produktwert liefern.
3. **Triage**: (a) sofort umsetzbare, verifizierbare Client-seitige Verbesserungen liefern (Bugfix, strukturierte Adressen, Schätzwert-Engine, systemweite Marktdaten-Verknüpfung — alles auf Basis der bereits vorhandenen `KK_MARKET_OBS`/`KK_GEO`-Fundamente), (b) die Backend-/Live-Connector-Anforderungen ehrlich als Zielarchitektur und Folgephase dokumentieren, mit expliziten Blockern statt stillschweigend übersprungen, (c) keine neue parallele Architektur, kein Fake-Layer.

## Entscheidung
Option 3. Diese Session liefert:
- Bugfix Phantommarker (`buildTownMarkers()` jetzt Teil der zentralen `activeLayers`-Filterlogik).
- Strukturierte Adresserweiterung für CRM-Objekte (Gemarkung/Flur/Flurstücksnummer/`parcelId` etc.) additiv zum bestehenden `KK_GEO`-Adressschema.
- Optionale strukturierte Adresse für Tippgeber/Netzwerkpartner (kkref20), additiv zum bestehenden `.addr`/`.geo`-Schema.
- Eine zentrale Schätzwert-Engine (`KK_VALUATION` o. ä.), die ausschließlich die bereits vorhandene eigene Marktdatenbank (`KK_MARKET_OBS`) nutzt — keine externen Quellen, keine erfundenen Werte, mit expliziter Kennzeichnung als unverbindliche Indikation.
- Systemweite Verdrahtung: Objekt-Detail/-Anlage zeigt die live berechnete Marktindikation; Marktbeobachtungen lösen Neuberechnung aus.

Diese Session liefert **nicht** (dokumentierter Blocker, siehe unten):
- Eine echte serverseitige Datenbank (PostgreSQL+PostGIS o. ä.).
- Echte Live-Connectoren zu BORIS Hessen, ALKIS/Flurstücken, Overpass/Nominatim (über den bereits bestehenden Geocoding-Proxy hinaus), amtlichen WMS/WFS-Diensten, Statistikquellen oder Portalen.
- Auth/RBAC/Audit-Log/produktiven Zugriffsschutz für die öffentliche Netlify-URL (bereits als offene Lücke in ADR-0000/PRD Teil 1 §16 dokumentiert).
- Die ~35 benannten Connector-/Service-Module als produktive, live angebundene Klassen — nur als hier dokumentierte Zielarchitektur.

## Begründung
Ein vorgetäuschtes Backend oder vorgetäuschte Live-Anbindungen wären ein Vertrauensbruch gegenüber dem expliziten Auftrag ("Baue keine oberflächliche Demo und keine reine Frontend-Simulation") — sie würden genau das Gegenteil erzeugen: eine Simulation, die echt aussieht. Ehrliche Dokumentation der Lücke plus Auslieferung des tatsächlich leistbaren Teils entspricht sowohl CLAUDE.md als auch dem Master-Prompt selbst (§4: "Treffe keine irreversible Anbieterentscheidung ohne technische Begründung"; §29: "BORIS integriert ODER konkret dokumentierter externer Blocker").

## Konsequenzen
- Positiv: Kein Datenrisiko, keine Fake-Daten, jede Änderung einzeln testbar und rückrollbar, echte Produktverbesserungen (Schätzwert-Engine, strukturierte Adressen) sofort nutzbar.
- Negativ: Die "GIS-Plattform für ganz Deutschland" bleibt vorerst eine Vision/Roadmap, kein produktiver Zustand. Externe Datenquellen (BORIS, ALKIS, Overpass, Portale) bleiben bis zu einer separaten Anbieter-/Budget-/Internetzugriffs-Entscheidung ungenutzt.
- Folgephasen (nicht in dieser Session): Backend-Auswahl (PostgreSQL+PostGIS auf einem Netlify-kompatiblen Hosting, z. B. Supabase/Neon/Render — Anbieterentscheidung liegt bei Kevin), Migrationsplan von LocalStorage zu Server-API, Auth/RBAC, dann schrittweise Connector-Anbindung — jeweils nur mit echtem Internetzugriff und expliziter Freigabe der jeweiligen Kosten/Lizenzen.

## Verifikation
Jede in dieser Session gelieferte Teilanforderung wird einzeln mit Playwright-Smoke-Tests (Desktop 1440 + Mobile 390) und der vollständigen Regressionssuite verifiziert, bevor sie committet wird. Diese ADR selbst wird nicht "verifiziert" im technischen Sinne, sondern dient als dokumentierte Entscheidungsgrundlage für Task #53 (Abschlussbericht).

## Rollback / Superseding
Diese ADR wird ersetzt, sobald Kevin eine konkrete Backend-/Hosting-Entscheidung trifft; ein neues ADR-000x dokumentiert dann die gewählte Option und den Migrationsplan von LocalStorage zu Server-API.
