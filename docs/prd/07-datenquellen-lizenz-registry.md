# 07 — Datenquellen- und Lizenz-Registry

Dieses Dokument ist die Registry aller Datenquellen, die Keim CRM Pro aktuell nutzt oder als Zielarchitektur vorsieht (Master-Prompt §6, §28). Spalte "Status" unterscheidet **aktiv** (im Code angebunden und produktiv genutzt), **geplant** (Zielarchitektur, siehe ADR-0001), und **blockiert** (konkreter Grund in Spalte "Blocker").

## Aktiv genutzte Quellen

| Quelle | Zweck | Zugriffsweg | Lizenz | Update-Rhythmus | Status |
|---|---|---|---|---|---|
| Eigene CRM-Eingaben (Kevin Keim) | Operative CRM-Daten (Objekte, Kontakte, Pipeline) | Manuelle Eingabe im UI | Eigentum Kevin Keim, keine Drittlizenz | Bei Eingabe | aktiv |
| Eigene Marktbeobachtungen (`KK_MARKET_OBS`) | Marktanalyse, Preiskalkulator | Manuelle Eingabe / CSV-Import | Eigentum Kevin Keim (Beobachtungen Dritter, keine Weiterverbreitung Dritter Inhalte) | Bei Eingabe | aktiv |
| Nominatim (OpenStreetMap) | Adress-Geocoding | Netlify Function `netlify/functions/geocode.js` (serverseitig, gecacht, mit User-Agent+Kontakt gemäß Nominatim-Nutzungsrichtlinie) | ODbL (OpenStreetMap-Mitwirkende) | Nur bei neuer/geänderter Adresse, serverseitig gecacht | aktiv |
| Ortsteil-Registry (`KK_GEO.ORTSTEILE`) | Klassifikation/Näherungskoordinaten Main-Kinzig-Kreis/Hanau | Statisch im Code gepflegt | Eigene Zusammenstellung auf Basis öffentlich bekannter Gemeinde-/Ortsteilnamen; Koordinaten sind Näherungswerte, keine amtliche Geometrie | Manuell bei Bedarf | aktiv (als Näherung gekennzeichnet) |
| BORIS Hessen (Bodenrichtwerte) | Bodenrichtwertzonen als Kartenlayer, Bodenrichtwert/Stichtag/Nutzungsart/Entwicklungszustand per Klick | WMS (`netlify/functions/wms-capabilities.js` + `wms-feature-info.js`, GetMap direkt `<img>`-basiert vom Client, GetFeatureInfo serverseitig geproxyt), automatische Layer-Erkennung statt hartcodierter Namen | Laut Geoportal Hessen "Datenlizenz Deutschland – Zero – Version 2.0" (laut Metadaten, vor Produktivnutzung am Dienst selbst zu bestätigen, siehe `kk-official-gis-v1-js`) | Bodenrichtwert-Stichtag jährlich | aktiv seit PR #7 (11.07.2026 von Kevin live auf Deploy-Preview bestätigt: Zonen sichtbar, GetFeatureInfo funktioniert) |
| ALKIS/Flurstücke Hessen (INSPIRE-WMS) | Flurstücksgrenzen, amtliche Fläche, Gemarkung/Flur/Flurstücksnummer per Klick (keine Eigentümerdaten) | WMS (dieselben zwei Functions wie BORIS), automatische Layer-Erkennung aus echter GetCapabilities-Antwort (namespace-tolerant, verschachtelte Capabilities-Bäume korrekt geparst) | Laut Fundstelle kostenfrei gemäß §24 HVGG (ungeprüft, vor Produktivnutzung zu bestätigen) | ungeprüft | in Arbeit (PR #7): Verbindung + Layer-Erkennung von Kevin live bestätigt; GetFeatureInfo-Feinschliff (Overlay-/Query-Layer-Trennung, WMS-Versions-Fallback) am 11.07.2026 gepusht, Live-Retest steht noch aus |
| Geoportal Hessen (Verwaltungsgrenzen, Luftbilder) | Basiskarten, Gemeinde-/Ortsteilgrenzen (ersetzt Näherungskoordinaten) | WMS/WMTS | Je nach Layer zu prüfen | Kein Internetzugriff |
| BKG VG250 | Amtliche Gemeindegeometrie deutschlandweit | Download + Import-Pipeline | Datenlizenz Deutschland – Zero – Version 2.0 (laut BKG-Angabe) | Kein Internetzugriff (bereits als Blocker M2 in PHASENPLAN.md dokumentiert) |
| Overpass API (OpenStreetMap) | POIs, Infrastruktur (Schulen, Ärzte, ÖPNV) | Server-seitiger Connector mit Caching, gemäß Overpass-Nutzungsrichtlinie | ODbL | Kein Internetzugriff; Nutzungsrichtlinie (Rate-Limits, kein Live-Rendering-Query) nie real getestet |
| Statistische Ämter (Zensus, Bevölkerung, Pendlerstatistik) | Lageanalyse, Marktkontext | Je nach Quelle offene Datensätze/API | Je nach Quelle zu prüfen | Kein Internetzugriff; konkrete Quelle noch nicht ausgewählt |
| Immobilienportale (ImmoScout24 u. a.) | Automatisierte Ergänzung von Marktbeobachtungen | **Nur** offizielle/erlaubte API — kein Scraping, kein Login-/Captcha-Umgehen | Portalspezifische Nutzungsbedingungen, i. d. R. kostenpflichtig/genehmigungspflichtig | Keine API-Zugangsdaten vorhanden; kostenpflichtige Aktivierung erfordert Kevins ausdrückliche Freigabe (CLAUDE.md) |

## Explizit ausgeschlossene Quellen/Methoden

Diese werden **nicht** angebunden, unabhängig von technischer Machbarkeit (Master-Prompt §3, §6):
- Scraping von passwort-/captcha-geschützten Datenbanken (Sprengnetter, on-geo, PriceHubble, Gutachterausschuss-Kaufpreissammlungen, MLS-Systeme).
- Umgehung technischer Schutzmaßnahmen (Rate-Limits, Logins, Captchas) jeglicher Quelle.
- Nicht-öffentliche/nicht-lizenzierte Kaufpreissammlungen.

## Änderungsprotokoll

Neue Quelle hinzufügen = neue Zeile + kurzer Commit-Hinweis. Vor Aktivierung einer "geplanten" Quelle: GetCapabilities/Lizenztext real abrufen und verifizieren (nicht aus diesem Dokument übernehmen — dieses Dokument enthält nur öffentlich bekannte, ungeprüfte Angaben als Ausgangspunkt), dann Zeile auf "aktiv" setzen und Datum/Commit ergänzen.
