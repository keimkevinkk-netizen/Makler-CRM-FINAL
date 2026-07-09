# KEIM CRM PRO – MASTER PRODUCT REQUIREMENTS DOCUMENT
## Teil 4: Marktmonitor, Kartenplattform und externe Marktdaten

**Version:** 1.0  
**Stand:** 09. Juli 2026  
**Status:** Verbindliche Produkt-, GIS- und Datenplattform-Spezifikation für V31 und Folgeversionen  

## 0 Dokumentauftrag, Rangordnung und verbindlicher Geltungsbereich

Teil 4 definiert den Marktmonitor als eigenständige Produkt- und Datenplattform innerhalb von Keim CRM Pro. Das Dokument verbindet geografische Wahrheit, technische Kartenarchitektur, regionale Marktanalyse, externe Datenquellen, tägliche Aktualisierung, Offline-Fähigkeit, Datenschutz und konkrete Makler-Workflows. Es ist keine bloße Designbeschreibung einer Karte. Es legt fest, wie aus Geodaten und Marktdaten ein belastbares Arbeitsinstrument entsteht.

Die Spezifikation baut auf Teil 1 bis Teil 3 auf. Produktstrategie bestimmt den geschäftlichen Zweck, die UX Bible bestimmt die sichtbaren Arbeitsabläufe und Teil 3 bestimmt Datenverträge, Providergrenzen, Persistenz und Navigation. Teil 4 konkretisiert diese Leitplanken für Karte, Gebiete, Marktkennzahlen, Quellen, Aktualisierung und raumbezogene CRM-Informationen.

> **Verbindlicher Wahrheitsgrundsatz:** Kein Wert, keine Grenze, kein Trend und keine Prognose darf als aktuell, amtlich oder geografisch korrekt erscheinen, wenn Herkunft, Zeitraum, Qualität und räumliche Zuordnung nicht nachweisbar sind.

| Rang | Dokument | Bedeutung für Teil 4 |
| --- | --- | --- |
| 1 | Teil 1 – Produktstrategie | Bestimmt Marktmonitor-Zweck, regionale Positionierung und geschäftliche Priorität. |
| 2 | Teil 2 – UX & Design Bible | Bestimmt Kartenlayout, Detailpanel, Vergleich, Mobile-Verhalten und Zustände. |
| 3 | Teil 3 – Architektur & Datenmodell | Bestimmt Area-IDs, Provider, Cache, Services, Netlify-Grenze und Datenwahrheit. |
| 4 | Teil 4 – Marktmonitor & Kartenplattform | Bestimmt GIS-, Layer-, Quellen-, Aktualisierungs- und Abnahmeregeln. |
| 5 | ADRs / Provider-Dossiers | Dokumentieren konkrete Engine-, Anbieter- und Lizenzentscheidungen. |

- Gültig für den Main-Kinzig-Kreis und die priorisierten Kerngebiete; technisch erweiterbar auf weitere Regionen.
- Gültig für Desktop, iPhone, Tablet und den vorgesehenen Monitor-/TV-Modus.
- Gültig für lokale CRM-Layer sowie externe Geografie- und Marktdaten.
- Gültig für Online-, Stale-, Offline- und Provider-Fehlerzustände.
- Gültig für öffentlich gehostete Netlify-Auslieferung; Geheimnisse und privilegierte Abrufe bleiben serverseitig.

### 0.1 Dokumentensteuerung

| Feld | Festlegung |
| --- | --- |
| Produkt | Keim CRM Pro |
| Dokument | Master PRD – Teil 4: Marktmonitor, Kartenplattform und externe Marktdaten |
| Version | 1.0 |
| Status | Verbindliche Produkt-, GIS- und Datenplattform-Spezifikation für V31 und Folgeversionen |
| Primärer Nutzer | Kevin Keim |
| Primärregion | Main-Kinzig-Kreis mit priorisierten Teilmärkten |
| Aktueller Ausgangspunkt | Vorhandene MKK-Karte, Leaflet-/MapAdapter-Grundlagen und lokale Markt-Storage-Bereiche |
| Ziel | Echte geografische Analyseoberfläche mit nachvollziehbaren, aktualisierbaren Daten |
| Freigaberegel | Neue Quelle oder Kennzahl nur mit Source Registry, Lizenzprüfung, Schema und Qualitätsregeln |

Änderungen an Kartenengine, Gebietsschlüsseln, Geometriequelle, Marktkennzahlsemantik oder Provider-Vertrag gelten als wesentliche Architekturentscheidungen und benötigen ein ADR oder ein dokumentiertes Provider-Dossier.

### 0.2 Arbeitsanweisung an Claude Code

1. Das vollständige Dokument lesen und den vorhandenen Karten-, Markt- und Provider-Code inventarisieren.
2. Bestehende öffentliche Schnittstellen wie KK_MAP, MapAdapter, KK_DATA_CORE, Source Registry und Market Services zuerst prüfen und bevorzugt konsolidieren.
3. Vor einem Enginewechsel Baseline-Screenshots, Bedienungstests, Storage-Inventar und Datenparität sichern.
4. Keine zweite parallel sichtbare Kartenengine und keinen zweiten Markt-Store erzeugen.
5. Geometrie, Marktwerte, UI-Auswahl und CRM-Layer technisch trennen.
6. Keine Datenquelle produktiv anbinden, bevor Nutzungsrecht, Abrufgrenze, Aktualität und Attribution dokumentiert sind.
7. Keinen geheimen Schlüssel, keinen Provider-Token und keine private Adresse in öffentlich ausgelieferten Quellcode schreiben.
8. Jede Phase auf Desktop und 390-Pixel-Mobile testen; Karte muss nach Tabwechsel, Resize und Offline-Rückkehr stabil bleiben.
9. Bei fehlender Datenlizenz oder kostenpflichtiger Providerentscheidung anhalten und eine Entscheidungsvorlage erstellen.
10. Am Ende einen Quellen-, Lizenz-, Layer-, Qualitäts- und Betriebsbericht erstellen.

> **Keine Scheingenauigkeit:** „Täglich aktualisiert“ bedeutet nicht, dass jeder zugrunde liegende Marktwert täglich neu entsteht. Der tägliche technische Abruf darf nur den tatsächlich verfügbaren Veröffentlichungsstand spiegeln und muss Beobachtungszeitraum und Quellfrequenz sichtbar machen.

## 1 Executive Summary

Der Marktmonitor wird zur regionalen Intelligence-Schicht von Keim CRM Pro. Er verbindet echte Geografie mit Marktkennzahlen, eigenen CRM-Daten, Objekten, Pipeline, Follow-ups und Gebietsplänen. Sein Zweck ist nicht, eine optisch attraktive Karte zu zeigen, sondern räumliche Entscheidungen zu beschleunigen: Wo entstehen Chancen? Welche Gebiete sind unterbearbeitet? Wo häufen sich Kontakte, offene Nachfassaktionen, Objekte oder Pipeline-Werte? Welche Marktkennzahl ist aktuell, belastbar und für ein Kundengespräch verwendbar?

Die Zielplattform verwendet eine professionelle, austauschbare Kartenengine hinter KK_MAP beziehungsweise MapAdapter. Für die langfristige Vektor-, Layer- und Datenvisualisierungsfähigkeit wird MapLibre GL JS als Zielkandidat priorisiert; eine vorhandene Leaflet-Lösung kann als kontrollierter Übergang oder Fallback dienen. Die endgültige Entscheidung wird nach einem technischen Spike und einem ADR getroffen. Die Basiskarte, Geometrien und Marktdaten werden niemals als ein untrennbarer Block behandelt.

Die externe Datenarchitektur nutzt Netlify Functions als sichere Providergrenze. Ein täglicher Scheduler kann verfügbare Quellen abrufen, normalisieren, validieren und als versionierte Snapshots ablegen. Das Frontend liest nur normalisierte, gecachte Antworten. Bei Netz- oder Providerfehlern bleibt der letzte valide Stand sichtbar und wird als veraltet gekennzeichnet.

| Säule | Zielzustand |
| --- | --- |
| Echte Geografie | Reale Ortslagen, dokumentierte Gemeindegrenzen und stabile Gebietsschlüssel. |
| Operativer Nutzen | Jede Karteninteraktion führt zu Gebietsanalyse oder konkreter CRM-Arbeit. |
| Datenwahrheit | Quelle, Periode, Abrufzeitpunkt, Qualität und Einheit sind Bestandteil jedes Wertes. |
| Austauschbare Provider | Anbieter können ersetzt werden, ohne UI oder fachliche Modelle neu zu schreiben. |
| Lokaler Kern | Eigene CRM-, Objekt- und Pipeline-Layer funktionieren unabhängig von externen Marktprovidern. |
| Mobile Professionalität | Karte, Filter und Detaildaten sind auf dem iPhone als echte Arbeitsoberfläche bedienbar. |
| Rechtssicherheit | Lizenz, Quellenvermerk, Datenschutz und Abrufbedingungen werden technisch erzwungen. |

> *„Der Marktmonitor ist dann erfolgreich, wenn Kevin in einem Kundengespräch innerhalb weniger Sekunden einen nachvollziehbaren regionalen Wert zeigen und anschließend direkt in die passende Vertriebsaktion wechseln kann.“*

## 2 Produktrolle und geschäftlicher Zweck

Der Marktmonitor besitzt drei gleichberechtigte Rollen: Marktinformationssystem, Gebietssteuerung und räumlicher CRM-Kontext. Er darf nicht auf eine einzige Preis-Heatmap reduziert werden. Die Plattform muss zwischen externer Marktlage und eigener Vertriebsaktivität unterscheiden, beide Ebenen jedoch für Entscheidungen kombinierbar machen.

| Rolle | Kernfrage | Typische Handlung |
| --- | --- | --- |
| Marktinformationssystem | Wie entwickelt sich ein Gebiet und wie belastbar ist der Wert? | Kennzahl prüfen, Quelle öffnen, Gebiet vergleichen. |
| Gebietssteuerung | Wo investiere ich Akquise- und Netzwerkzeit? | Gebietsplan öffnen, Aktivitätslücke erkennen, Aktion anlegen. |
| CRM-Kontext | Welche Kontakte und Chancen liegen in diesem Raum? | Kontakte filtern, Follow-ups bearbeiten, Objekt oder Deal öffnen. |
| Kundengespräch | Welche aktuelle, erklärbare Einordnung kann ich zeigen? | Preisniveau, Trend und Quelle transparent präsentieren. |
| Management | Welche Gebiete liefern Aktivität, Pipeline und Ergebnisse? | Eigene KPIs nach Gebiet vergleichen und Maßnahmen ableiten. |

- Der Marktmonitor gibt keine verbindliche Verkehrswertermittlung ab.
- Er ersetzt weder Gutachten noch amtliche Auskünfte.
- Er darf Angebotspreise nicht als tatsächlich erzielte Kaufpreise bezeichnen.
- Er muss zwischen externen Daten, internen Beobachtungen und manuellen Einschätzungen unterscheiden.
- Er soll die regionale Kompetenz sichtbar machen, ohne Scheingenauigkeit zu erzeugen.

## 3 Primäre Nutzerentscheidungen und Kernaufgaben

| Situation | Benötigte Antwort | Produktreaktion |
| --- | --- | --- |
| Vor Eigentümertelefonat | Was ist in diesem Ort aktuell relevant? | Gebiet öffnen, aktuelle Kennzahlen, Quelle und Trend zeigen. |
| Tagesplanung | Welches Gebiet ist vertrieblich unterbearbeitet? | Eigene Kontakte, Follow-ups und Aktivität gegen Gebietsplan stellen. |
| Akquisewoche | Wo fehlen neue Eigentümerkontakte? | CRM-Dichte und letzte Aktivitäten als aggregierten Layer zeigen. |
| Pipeline-Steuerung | Wo konzentriert sich potenzieller Objektwert? | Pipeline-Layer mit aggregierter Summe und Dealstatus. |
| Kundentermin | Welche Vergleichsregion ist sinnvoll? | Zwei Gebiete mit identischen Kennzahlen und Perioden vergleichen. |
| Datenprüfung | Warum wirkt ein Wert unplausibel? | Quelle, Stichprobe, Zeitraum und Qualitätsflag öffnen. |
| Offline / unterwegs | Was kann ich noch sicher zeigen? | Letzten validen Snapshot und lokale CRM-Layer anzeigen. |

> **Aktionsorientierung:** Jede Gebietsdetailansicht benötigt mindestens eine fachliche Aktion: Kontakte anzeigen, Follow-ups öffnen, Objektpipeline filtern, Gebietsplan bearbeiten oder Quelle prüfen.

## 4 Umfang, Nicht-Ziele und Ausbaustufen

| V31 Kernumfang | Spätere Ausbaustufe |
| --- | --- |
| Echte Basiskarte und Gemeindeauswahl | Weitere Landkreise und bundesweite Expansion |
| Gemeindegrenzen und stabile Gebietsschlüssel | Gemarkungen, Ortsteile und mikrogeografische Raster |
| Marktkennzahl-Layer mit Quellenstatus | Mehrere kommerzielle Datenprovider und automatischer Vergleich |
| Eigene CRM-, Follow-up-, Objekt- und Pipeline-Layer | Team-Layer und Multi-User-Berechtigungen |
| Gebietsvergleich und Zeitreihendarstellung | Szenariorechnung und fortgeschrittene Prognosemodelle |
| Tägliche technische Aktualisierung verfügbarer Quellen | Echtzeit-Feeds, sofern fachlich und rechtlich sinnvoll |
| Offline-Snapshot für Daten und lokaler Kartenfallback | Vollständige Offline-Vektorkarten mit lizenzierter Tile-Quelle |

- Kein Ersatz für professionelle Bewertungssoftware oder zertifizierte Gutachten.
- Keine automatisierte Massenerfassung von Immobilienportalen gegen deren Nutzungsbedingungen.
- Keine unbegründete Prognose „auf Knopfdruck“.
- Keine öffentlichen exakten Privatadressen aus dem CRM.
- Keine vollständige GIS-Desktopsoftware mit Zeichen-, Vermessungs- und Katasterbearbeitung.
- Keine Abhängigkeit von einem einzigen ungesicherten Community-Tileserver als Produktionsgrundlage.

## 5 Zielbetriebsmodell der Karten- und Datenplattform

```
┌──────────────────────── KEIM CRM PRO FRONTEND ────────────────────────┐
│ Market UI · Layer Controls · Compare · Detail Sheet · Source Status    │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │ KK_MARKET / KK_MAP contracts
┌───────────────────────▼─────────────────────────────────────────────────┐
│ Application Services                                                    │
│ AreaService · LayerService · MarketService · CompareService             │
│ MapStateService · DataQualityService · SourceRegistry                   │
└──────────────┬──────────────────────────────┬────────────────────────────┘
               │                              │
┌──────────────▼─────────────┐  ┌────────────▼────────────────────────────┐
│ Local / versioned assets    │  │ Netlify Functions / Provider Gateway   │
│ GeoJSON · area registry     │  │ Fetch · Normalize · Validate · Cache   │
│ CRM data · snapshots        │  │ Scheduled refresh · secrets · logs     │
└──────────────┬─────────────┘  └────────────┬────────────────────────────┘
               │                              │
┌──────────────▼─────────────┐  ┌────────────▼────────────────────────────┐
│ Map engine adapter          │  │ External official/commercial sources   │
│ MapLibre / Leaflet fallback │  │ BKG · Hessen · statistics · providers   │
└────────────────────────────┘  └─────────────────────────────────────────┘
```

Die Karte ist eine Präsentations- und Interaktionsschicht. Sie besitzt keine eigene Wahrheit über Kontakte, Marktpreise oder Pipeline. Layer beziehen Daten über Services, die auf kanonische Stores und normalisierte Providerantworten zugreifen.

| Komponente | Verantwortung | Nicht verantwortlich für |
| --- | --- | --- |
| KK_MAP / MapAdapter | Engineunabhängige Kartenoperationen | Marktsemantik und Providerabrufe |
| AreaService | Gebiete, IDs, Namen, Zentren, Bounds, Hierarchie | Darstellung und Farblogik |
| LayerService | Layer registrieren, aktivieren, Daten zuführen | Datenbeschaffung externer Quellen |
| MarketService | Kennzahlen lesen, vergleichen, Qualität bewerten | DOM und Engine-spezifische Layer |
| SourceRegistry | Quelle, Lizenz, Frequenz, Kontakt, Status | Wertberechnung |
| Provider Gateway | Abruf, Authentifizierung, Normalisierung | CRM-Daten verändern |
| MapStateService | Viewport, Auswahl, aktive Layer, Vergleich | fachliche Entitäten speichern |

## 6 Kartenengine – Entscheidungsrahmen und Zielentscheidung

Die bestehende Anwendung enthält bereits Leaflet-orientierte Grundlagen. Leaflet ist eine bewährte, mobile Kartenbibliothek mit Raster-, GeoJSON-, Marker-, Popup- und Vektorunterstützung. Für einen langfristig datenreichen Marktmonitor mit Vektorkacheln, datengetriebenen Styles, Heatmaps, Clustering und später größeren Geometriemengen ist MapLibre GL JS der stärkere Zielkandidat. Die offizielle MapLibre-Dokumentation beschreibt eine WebGL-basierte Bibliothek für interaktive Karten aus Vektorkacheln und unterstützt unter anderem GeoJSON-, Raster- und Vector-Tile-Quellen sowie datengetriebene Layer.

| Kriterium | Leaflet | MapLibre GL JS |
| --- | --- | --- |
| Aktueller Integrationsaufwand | niedrig, vorhandener Unterbau | mittel, Adapter und CSP/Worker beachten |
| Rasterkarten | sehr direkt | unterstützt |
| GeoJSON kleiner/mittel | sehr gut | sehr gut |
| Vektorkacheln / Style Spec | nur über Plugins / Zusatzlogik | nativ |
| Datengetriebene Darstellung | möglich, mehr manuelle Logik | stark über Expressions und Layer |
| Heatmap / Cluster | Plugins oder Zusatzcode | integrierte Muster und Quellenoptionen |
| Große Layer-Zukunft | begrenzt je nach DOM/SVG/Canvas | besser für GPU-gerenderte Layer |
| Single-File-Einbindung | einfach | möglich, aber Worker/CSP sauber konfigurieren |
| Offline-Fallback | lokale GeoJSON- und Rasterlösung möglich | lokale Styles/Assets möglich; Tiles separat klären |

> **Vorgeschlagene Entscheidung:** MapLibre GL JS wird als strategische Zielengine vorgesehen. Leaflet bleibt während V31 als kontrollierter Übergang, technischer Vergleich oder Fallback erhalten, jedoch nicht als dauerhaft parallel sichtbare Produktkarte.

1. Ein technischer Spike implementiert denselben MKK-Prototyp in der vorhandenen Leaflet-Schicht und in MapLibre.
2. Gemessen werden Ladezeit, Mobile-Gesten, Gemeinde-Polygone, Datenlayer, Resize, CSP, Speicherverbrauch und Fehlerfallback.
3. Der MapAdapter-Vertrag wird vor dem Enginewechsel finalisiert.
4. Nach ADR-Freigabe wird genau eine primäre Engine aktiviert.
5. Legacy-Engine wird erst entfernt, wenn Layer- und Datenparität bestätigt sind.

### 6.1 Verbindlicher MapAdapter-Vertrag

```
KK_MAP.create({
  container: "market-map",
  center: [8.95, 50.20],
  zoom: 9.4,
  bounds: MKK_BOUNDS,
  styleId: "keim-light-v1"
});

KK_MAP.registerSource("mkk-areas", { type: "geojson", data: areaGeoJSON });
KK_MAP.registerLayer({ id: "market-price", source: "mkk-areas", kind: "choropleth" });
KK_MAP.setLayerVisibility("crm-density", true);
KK_MAP.fitArea("06435-...", { padding: 32 });
KK_MAP.selectFeature("area", areaId);
KK_MAP.destroy();
```

| Methode | Pflichtverhalten |
| --- | --- |
| create | idempotent; klare Fehlermeldung bei fehlender Engine oder Container. |
| resize | nach Tabaktivierung, Orientation Change und Paneländerung sicher ausführbar. |
| registerSource | Quelle versioniert registrieren oder deterministisch aktualisieren. |
| registerLayer | Layer mit ID, Reihenfolge, Legende und Interaktionsvertrag anlegen. |
| setLayerVisibility | Zustand aktualisieren und Map-State-Ereignis senden. |
| fitArea | Gebietsbounds mit Mobile-/Desktop-Padding berücksichtigen. |
| selectFeature | Auswahl visuell und im Detailpanel synchronisieren. |
| destroy | Listener, Worker und Engineinstanz sauber freigeben. |

## 7 Basiskarte, Tile-Provider und Produktionsbetrieb

OpenStreetMap ist eine zentrale offene Datenbasis, aber die öffentlichen Standard-Tileserver sind kein garantierter Produktionsdienst. Die offizielle Tile Usage Policy verlangt sichtbare Attribution, korrekte Identifikation, Caching nach HTTP-Vorgaben und verbietet Bulk-Download beziehungsweise Offline-Prefetching. Sie weist außerdem darauf hin, dass der Dienst best effort ohne SLA betrieben wird. Daraus folgt: `tile.openstreetmap.org` darf höchstens für normale interaktive Nutzung und frühe Entwicklung verwendet werden; die Architektur muss den Provider ohne Codeänderung austauschbar machen.

| Betriebsoption | Eignung | Regel |
| --- | --- | --- |
| OSM Standard Tiles | Entwicklung / geringe normale Nutzung | Policy strikt einhalten; kein Offline; kein SLA. |
| Kommerzieller OSM-Tileprovider | Produktiv, abhängig von Tarif und Lizenz | API-Key server-/konfigurationssicher; Kosten- und Rate-Limit-Monitoring. |
| Open-/Community-Provider mit klarer Policy | nur nach dokumentierter Prüfung | Nutzungsbedingungen und Kapazität beachten. |
| Eigene Vektor-/Rastertiles | maximale Kontrolle, höherer Betrieb | Lizenz, Storage, Updates und CDN selbst verantworten. |
| Lokaler vereinfachter Kartenfallback | Offline-Notbetrieb | keine unzulässige Vorabspiegelung fremder Tiles. |

- Tile-URL niemals tief im UI hardcodieren; über BasemapProvider konfigurieren.
- Attribution dauerhaft sichtbar, nicht hinter einem Menü verstecken.
- Providerwechsel muss ohne Änderung fachlicher Layer möglich sein.
- Offline-Modus verwendet eigene lokale Geometrien und neutrale Hintergrundfläche, nicht unerlaubt vorabgeladene OSM-Standardtiles.
- Basiskartenfehler dürfen CRM- und Gebietsarbeit nicht vollständig blockieren.

## 8 Geografische Wahrheit und Gebietshierarchie

Der Marktmonitor benötigt stabile fachliche Gebiete, die unabhängig von der Kartenengine existieren. Ein Gebiet ist nicht nur ein Polygon, sondern eine versionierte Entität mit amtlichem Schlüssel, Namen, Hierarchie, Mittelpunkt, Bounds, Datenverfügbarkeit, Zielgebietsklasse und Beziehungen zu CRM- und Marktdaten.

```
Area {
  id: "de-he-06435-020",
  ags: "06435020",
  type: "municipality",
  name: "Bruchköbel",
  parentId: "de-he-06435",
  state: "HE",
  district: "Main-Kinzig-Kreis",
  centroid: { lon: 8.92, lat: 50.18 },
  bounds: [west, south, east, north],
  geometryVersion: "bkg-vg250-2025-simplified-v1",
  tier: "core",
  aliases: [],
  active: true
}
```

| Ebene | Verwendung in V31 | ID-Regel |
| --- | --- | --- |
| Bundesland | Kontext und spätere Expansion | ISO-/amtlicher Schlüssel |
| Landkreis | MKK-Gesamtansicht und Bounds | amtlicher Kreisschlüssel |
| Gemeinde/Stadt | primäre Markt- und Vertriebsanalyse | AGS als externe Referenz, stabile interne Area-ID |
| Ortsteil | nur bei verifizierter Quelle und Bedarf | eigene stabile ID mit Elternbezug |
| Gebietscluster A/B/C | strategische Nutzerklassifikation | separates Planungsobjekt, kein amtliches Gebiet |
| Benutzerdefiniertes Gebiet | später, manuell definierter Fokus | UUID und klare Kennzeichnung |

> **Trennung amtlich versus strategisch:** „Kernfestung“, „Volumenmaschine“ oder A-/B-/C-Gebiet sind Vertriebslabels. Sie dürfen amtliche Verwaltungsgrenzen nicht ersetzen oder als geografische Verwaltungsebene ausgegeben werden.

## 9 Priorisierte Gebiete und Abnahmeumfang

| Gebiet | Strategische Rolle | V31 Pflichtprüfung |
| --- | --- | --- |
| Bruchköbel | Kernfestung | Grenze, Auswahl, Marktwert, CRM-Layer, Detailpanel |
| Hanau | Volumenmarkt | Stadtgrenze, große Datenmenge, Filter, Performance |
| Schöneck | Kernfestung | korrekte Lage und Gebietsauswahl |
| Nidderau | Kernfestung | Marktvergleich und Zeitreihe |
| Erlensee | Erweiterungsring | Quelle und Aktualitätsstatus |
| Langenselbold | Erweiterungsring | CRM-/Follow-up-Layer |
| Maintal | Hochpreis-/Volumenkomponente | Gebietsvergleich |
| Neuberg | selektiv | leere/externe Datenzustände |
| Hammersbach | selektiv | kleine Stichprobe und Qualitätsflag |
| Rodenbach | selektiv | Layer- und Tooltip-Prüfung |
| Freigericht | selektiv | Grenz- und Quellenprüfung |
| Gelnhausen | regionaler Knoten | Detailpanel und Pipeline-Layer |

Die Anwendung kann weitere MKK-Gemeinden anzeigen. Die genannten zwölf Gebiete bilden jedoch die verbindliche Abnahmematrix für V31, da sie Kevins operativen Fokus abdecken.

## 10 Gemeindegrenzen – Quelle, Lizenz und Datenpipeline

Für amtliche Verwaltungsgrenzen ist der Datensatz VG250 des Bundesamts für Kartographie und Geodäsie ein geeigneter Referenzkandidat. Er umfasst Verwaltungseinheiten bis zur Gemeindeebene, besitzt amtliche Schlüssel und wird jährlich fortgeführt. Die Daten werden nach der Datenlizenz Deutschland – Namensnennung 2.0 bereitgestellt; der vorgeschriebene Quellenvermerk und Veränderungshinweis müssen bei öffentlicher Nutzung sichtbar umgesetzt werden.

| Schritt | Pflicht |
| --- | --- |
| Beschaffung | Originalquelle, Stand, Downloadzeit und Lizenz dokumentieren. |
| Extraktion | Hessen, Main-Kinzig-Kreis und benötigte Gemeindeebene filtern. |
| Projektion | in WGS84 / EPSG:4326 für Web-GeoJSON transformieren. |
| Validierung | Geometriegültigkeit, AGS, Name, Parent und Bounds prüfen. |
| Vereinfachung | mehrere Detailstufen erzeugen; Topologie und Gebietserkennbarkeit erhalten. |
| Versionierung | Dateiname, Hash, Originalstand und Transformationsskript dokumentieren. |
| Attribution | BKG-/Lizenzhinweis im Marktmonitor und Quellenbereich anzeigen. |
| Regression | Flächenanzahl, IDs, Bounds und priorisierte Orte automatisiert testen. |

```
data/geography/
  original/
    vg250_2025_source-metadata.json
  processed/
    mkk-municipalities-low-v1.geojson
    mkk-municipalities-medium-v1.geojson
  registry/
    areas-v1.json
  scripts/
    build-mkk-boundaries.mjs
  LICENSES.md
```

> **Keine manuell nachgezeichneten Grenzen:** Manuell gezeichnete oder aus Screenshots abgeleitete Polygone dürfen nicht als Gemeindegrenzen produktiv verwendet werden. Ein vereinfachtes Polygon bleibt zulässig, wenn es deterministisch aus einer dokumentierten Originalgeometrie erzeugt und als vereinfacht gekennzeichnet wurde.

## 11 Koordinatenreferenzsysteme und Geometrieverarbeitung

| Thema | Vorgabe |
| --- | --- |
| Frontend-Koordinaten | Longitude/Latitude in EPSG:4326; Reihenfolge explizit dokumentieren. |
| Webkarte | Engineinterne Web-Mercator-Darstellung zulässig. |
| Originaldaten | Original-CRS und Transformationsweg in Metadaten erhalten. |
| Flächenberechnung | nicht aus unprojizierten Gradkoordinaten ableiten; geeignete Projektion/Geobibliothek nutzen. |
| Centroid | für konkave Flächen Point-on-Surface oder validierten Labelpunkt verwenden. |
| Bounds | aus finaler Geometrie berechnen und testen. |
| Simplification | zoom- beziehungsweise use-case-spezifisch; keine selbstüberschneidenden Polygone. |

- Alle Koordinatenfelder heißen eindeutig `lon` und `lat`; keine unkommentierten Arrays in Fachmodellen.
- Engineadapter darf Arrayformate übersetzen, aber Services arbeiten mit benannten Feldern.
- Geometrievalidierung ist Build-/Datenpipeline-Aufgabe und nicht erst Renderfehlerbehandlung.
- Gebietsvergleich und Datenaggregation verwenden stabile Area-IDs, nicht Punkt-in-Polygon bei jedem Render.

## 12 Source Registry und Provider-Governance

Jede externe Quelle erhält einen registrierten Lebenszyklus. Eine URL allein ist keine Providerintegration. Die Source Registry dokumentiert fachliche Bedeutung, Zugriffsweg, Lizenz, Aktualisierungsfrequenz, räumliche Abdeckung, Kosten, Rate Limits, Datenqualität, Ansprechpartner und Abschaltplan.

```
SourceDefinition {
  id: "bkg-vg250",
  name: "BKG Verwaltungsgebiete 1:250 000",
  category: "geometry",
  access: "download",
  license: "dl-de/by-2-0",
  attribution: "© BKG (Bezugsjahr) dl-de/by-2-0",
  updateCadence: "annual",
  spatialCoverage: "DE",
  requiresSecret: false,
  status: "approved",
  owner: "market-platform",
  lastReviewedAt: "2026-07-09"
}
```

| Status | Bedeutung |
| --- | --- |
| candidate | fachlich interessant, aber noch nicht technisch/rechtlich freigegeben |
| evaluating | Datenprobe, Lizenz und Kosten werden geprüft |
| approved | für definierte Nutzung freigegeben |
| active | produktiv angebunden und überwacht |
| degraded | Quelle verfügbar, aber Qualitäts-/Aktualitätsproblem |
| suspended | Abruf oder Nutzung vorübergehend gestoppt |
| retired | nicht mehr verwenden; Snapshot und Migrationsweg dokumentiert |

## 13 Datenkategorien des Marktmonitors

| Kategorie | Beispiele | Primäre Aussage |
| --- | --- | --- |
| Geografie | Grenzen, Zentren, Flächen, Ortsteile | Wo liegt das Gebiet? |
| Angebotsmarkt | Angebotspreis/m², Angebotsmiete, Bestand | Was wird aktuell angeboten? |
| Transaktionsmarkt | Kaufpreise, Vergleichsfaktoren, Marktberichte | Was wurde tatsächlich gehandelt? |
| Bodenwerte | Bodenrichtwertzonen, Stichtage | Welches Bodenwertniveau gilt amtlich? |
| Demografie | Bevölkerung, Haushalte, Altersstruktur | Welche regionale Struktur besteht? |
| Bautätigkeit | Genehmigungen, Fertigstellungen, Bestand | Wie entwickelt sich Angebot strukturell? |
| Finanzierungsumfeld | Zinsen, Kreditindikatoren | Welcher externe Druck wirkt auf Nachfrage? |
| Eigene Aktivität | Kontakte, Anrufe, Follow-ups, Termine | Wie stark wird das Gebiet bearbeitet? |
| Eigene Pipeline | Objekte, Bewertungen, Verkaufschancen | Welche konkrete Geschäftschance besteht? |
| Eigene Ergebnisse | Aufträge, Verkäufe, Provisionen – falls gewünscht | Welche Wirkung erzielt die Gebietsarbeit? |

Diese Kategorien besitzen unterschiedliche Aktualisierungszyklen. Eine tägliche technische Prüfung darf beispielsweise eine zweijährlich festgesetzte Bodenrichtwertquelle nicht als täglich neu berechneten Bodenwert darstellen.

## 14 Kennzahlentaxonomie und semantische Eindeutigkeit

| Kennzahl-ID | Bezeichnung | Einheit | Pflichtabgrenzung |
| --- | --- | --- | --- |
| asking_price_sale_sqm | Angebotspreis Verkauf | EUR/m² | Inseratspreise, nicht Kaufpreise |
| asking_rent_sqm | Angebotsmiete | EUR/m²/Monat | kalt/warm und Objektart definieren |
| transaction_price_sqm | Transaktionspreis | EUR/m² | Quelle und Segment exakt nennen |
| land_reference_value | Bodenrichtwert | EUR/m² Grundstück | Zone, Nutzungsart und Stichtag |
| listing_count | Angebotsbestand | Anzahl | Erfassungsquelle und Dublettenlogik |
| days_on_market | Angebotsdauer | Tage | Definition von Start/Ende |
| population | Bevölkerung | Personen | Stichtag und Gebietsstand |
| crm_contact_count | Eigene Kontakte | Anzahl | lokal, keine externe Marktkennzahl |
| overdue_followup_count | Überfällige Follow-ups | Anzahl | eigene operative Kennzahl |
| pipeline_value | Pipelinewert | EUR | interne Bewertungs-/Dealdefinition |

> **Einheitlicher Vergleich:** Gebiete dürfen nur dann direkt verglichen werden, wenn Kennzahl-ID, Segment, Einheit, Zeitraum, Quelle beziehungsweise harmonisierte Methodik und Qualitätsstatus kompatibel sind.

## 15 Marktwert-Datenmodell und Provenienz

```
MarketMetricObservation {
  id: "obs_01J...",
  areaId: "de-he-06435-020",
  metricId: "asking_price_sale_sqm",
  segment: { propertyType: "house", condition: "all" },
  value: 3820,
  unit: "EUR/m²",
  period: { type: "month", value: "2026-06" },
  observedAt: "2026-06-30T23:59:59Z",
  fetchedAt: "2026-07-09T00:05:10Z",
  sourceId: "provider-x",
  sourceDatasetId: "...",
  sampleSize: 47,
  quality: {
    status: "verified",
    confidence: 0.78,
    flags: []
  },
  methodologyVersion: "v1",
  lineage: { rawSnapshotId: "snap_...", transformId: "norm_v1" }
}
```

| Zeitfeld | Bedeutung |
| --- | --- |
| period | fachlicher Beobachtungszeitraum der Kennzahl |
| observedAt | Ende oder Stichtag der zugrunde liegenden Beobachtung |
| publishedAt | Veröffentlichungszeitpunkt, sofern bekannt |
| fetchedAt | Zeitpunkt des technischen Abrufs |
| validatedAt | Zeitpunkt der erfolgreichen Normalisierung/Prüfung |
| expiresAt | fachlicher oder technischer Stale-Grenzwert |

Der UI-Text „Stand heute“ ist nur zulässig, wenn er sich auf den technischen Abrufstatus bezieht und gleichzeitig der fachliche Datenstand sichtbar bleibt. Beispiel: „Heute abgerufen · Datenstand Juni 2026“.

## 16 Angebotsdaten versus Transaktionsdaten

| Eigenschaft | Angebotsdaten | Transaktions-/amtliche Marktdaten |
| --- | --- | --- |
| Bedeutung | Preisvorstellung im sichtbaren Angebot | tatsächlich beurkundete oder ausgewertete Markttransaktion |
| Aktualität | potenziell hoch | oft zeitverzögert |
| Verfügbarkeit | häufig kommerziell / portalabhängig | amtlich oder Gutachterausschuss, regional unterschiedlich |
| Verzerrung | Dubletten, Preisänderungen, nicht verkaufte Objekte | Segment-/Fallzahl- und Veröffentlichungsgrenzen |
| Nutzung | Marktstimmung und aktueller Angebotsvergleich | belastbarere Einordnung realer Abschlüsse |
| Darstellung | „Angebotspreis“ ausdrücklich nennen | „Kaufpreis/Transaktionswert“ nur bei entsprechender Quelle |

- Keine Mischkennzahl ohne dokumentierte Harmonisierung.
- Keine Portal- oder Scrapingdaten als amtlich bezeichnen.
- Kleine Stichproben sichtbar kennzeichnen.
- Median und Quantile bevorzugen, wenn Ausreißer relevant sind.
- Objektart, Baujahr, Zustand und Lagequalität nicht unkontrolliert zusammenfassen.

## 17 Bodenrichtwerte und BORIS Hessen

BORIS Hessen ermöglicht die gebührenfreie Online-Recherche hessischer Bodenrichtwerte und zeigt, in welcher Bodenrichtwertzone eine Adresse liegt. Nach den offiziellen Informationen werden Bodenrichtwerte in Hessen alle zwei Jahre zum Stichtag 01.01. neu festgesetzt. Daraus folgt eine klare Produktregel: Der Marktmonitor darf die technische Verfügbarkeit regelmäßig prüfen, aber Bodenrichtwerte nicht als täglich neu entstehende Kennzahl darstellen.

| V31 Integrationsstufe | Umsetzung |
| --- | --- |
| Stufe 1 – Verweis | Gebietsdaten zeigen BORIS als amtliche Recherchemöglichkeit mit Stichtagshinweis. |
| Stufe 2 – Metadaten | verfügbare offizielle Dienste/Downloads und Lizenz technisch prüfen. |
| Stufe 3 – Zone/Value | nur bei erlaubtem maschinenlesbarem Zugriff und dokumentierter Nutzung integrieren. |
| Stufe 4 – Objektkontext | Adresse datenschutzgerecht zur Zone zuordnen; keine öffentliche Veröffentlichung privater Suchdaten. |

> **Keine Screen-Scraping-Lösung:** Die sichtbare BORIS-Webanwendung wird nicht automatisiert ausgelesen, solange kein dafür freigegebener maschinenlesbarer Dienst beziehungsweise eine klare Nutzungsgrundlage vorliegt.

## 18 Amtliche Regional- und Strukturdaten

Die Regionaldatenbank Deutschland ist ein Kandidat für Gemeinde-, Bevölkerungs-, Wohnungs- und Wirtschaftskennzahlen. Der Webservice unterliegt aktuellen technischen Zugangsregeln; offizielle Hinweise nennen eine vorherige kostenlose Registrierung und die Nutzung von POST-Methoden der REST-Schnittstelle. Solche Quellen werden über einen serverseitigen Provideradapter angebunden, nicht direkt aus der Browseroberfläche.

| Datenfeld | Möglicher Nutzen | Aktualitätserwartung |
| --- | --- | --- |
| Bevölkerung | Größe und Entwicklung des Marktgebiets | jährlich / quellenabhängig |
| Haushalte | Nachfragekontext | quellenabhängig |
| Wohnungsbestand | Bestandsstruktur | jährlich oder seltener |
| Baugenehmigungen | künftiges Angebot / Aktivität | monatlich/jährlich je Tabelle |
| Fertigstellungen | realisierte Bautätigkeit | jährlich |
| Altersstruktur | Zielgruppen- und Eigentümerkontext | jährlich |
| Beschäftigung / Einkommen | regionaler Nachfragekontext | quellenabhängig |

Der Provider speichert Tabellen-/Merkmalscodes, Filterparameter und Transformationsversion, damit ein Wert später reproduziert werden kann.

## 19 Eigene CRM-, Aktivitäts- und Pipeline-Daten als Kartenlayer

Eigene Daten sind unabhängig von externen Marktdaten wertvoll und bilden den operativen Kern. Sie werden nicht als Einzelpersonenkarte für öffentliche Präsentationen konzipiert, sondern als kontrollierte aggregierte oder berechtigte Layer.

| Layer | Aggregation | Aktion |
| --- | --- | --- |
| CRM-Kontaktdichte | Anzahl pro Area-ID; optional Rolle/Status | gefilterte Kontaktliste öffnen |
| Anrufe letzte 30 Tage | Anzahl und Ergebnisquote pro Gebiet | Call-Log / Kontakte öffnen |
| Follow-ups fällig | Anzahl überfällig/heute pro Gebiet | Follow-up-Ansicht gefiltert öffnen |
| Eigentümerkontakte | aggregiert nach Gebiet | CRM mit Rolle Eigentümer öffnen |
| Objekte | Marker nur intern; Aggregation öffentlich | Objektliste oder Detail öffnen |
| Pipelinewert | Summe und Anzahl pro Gebiet | Pipeline gefiltert öffnen |
| Tippgeber | Anzahl aktiver Partner pro Gebiet | Tippgebermodul öffnen |
| Gebietsaktivität | gewichtete, transparente Aktivitätskennzahl | Gebietsplan bearbeiten |

> **Keine intransparente Personenbewertung:** Kartenlayer dürfen Aktivität, Fälligkeit oder Datenvollständigkeit darstellen, aber keine undokumentierten A/B/C-Personenscores oder manipulative Priorisierung erzeugen.

## 20 Provideradapter und serverseitige Grenze

```
interface MarketProvider {
  id: string;
  supports(metricId, areaLevel): boolean;
  fetch(request, context): Promise<RawProviderResponse>;
  normalize(raw, request): MarketMetricObservation[];
  validate(observations): ValidationResult;
  getAttribution(): Attribution;
  getFreshnessPolicy(metricId): FreshnessPolicy;
}
```

| Grenze | Frontend | Netlify Function / Server |
| --- | --- | --- |
| Secrets | nie speichern oder senden, außer an eigene Function | Environment Variables lesen |
| Providerauthentifizierung | nicht kennen | Token, Registrierung, Signatur |
| CORS | eigene Function aufrufen | Providerantwort serverseitig abrufen |
| Normalisierung | nur internes Schema lesen | Rohpayload in internes Schema übersetzen |
| Rate Limit | UI zeigt Status | Abrufe bündeln, cachen, begrenzen |
| Rohdaten | nicht dauerhaft im UI | Snapshot je Lizenz und Notwendigkeit |
| Fehlerdetails | nutzerfreundlicher Status | technisches Log ohne Secrets |

- Jeder Provider besitzt Timeout, Retry- und Circuit-Breaker-Regel.
- Providerantworten werden gegen erwartetes Schema validiert.
- Unbekannte Felder werden nicht ungeprüft in UI oder Store übernommen.
- Provideradapter dürfen keine CRM-Daten schreiben.
- Ein Providerausfall blockiert andere Quellen und lokale Layer nicht.

## 21 Tägliche technische Aktualisierung

Netlify Scheduled Functions können Funktionen in regelmäßigem Cron-Rhythmus ausführen. Die offizielle Dokumentation beschreibt die Ausführung nach UTC, die Konfiguration im Function-Code oder in `netlify.toml` und die Möglichkeit manueller Testausführung im Netlify-UI. Für Keim CRM Pro wird eine tägliche Orchestrierungsfunktion vorgesehen, die nur Quellen aktualisiert, deren Freshness Policy einen Abruf erfordert.

```
[functions."refresh-market-data"]
  schedule = "15 3 * * *"   # UTC; tatsächliche lokale Anzeige separat

refresh-market-data:
  1. load SourceRegistry
  2. determine due datasets
  3. acquire provider lock
  4. fetch with timeout
  5. normalize + validate
  6. write immutable snapshot
  7. update latest pointer
  8. record run log
  9. emit health summary
```

| Begriff | Regel |
| --- | --- |
| Schedulerfrequenz | täglich oder quellenbezogen; kein blindes Vollrefresh aller Quellen |
| Quellfrequenz | fachliche Veröffentlichungshäufigkeit bleibt separat sichtbar |
| Zeitzone | Cron in UTC; UI zeigt lokale Zeit korrekt an |
| Manueller Refresh | startet kontrollierten Function-Lauf oder prüft neuesten Snapshot |
| Idempotenz | derselbe Lauf erzeugt keine doppelten Beobachtungen |
| Lock | verhindert parallele Aktualisierung derselben Quelle |
| Teilfehler | eine Quelle darf den gesamten Lauf nicht verwerfen |
| Kostenkontrolle | Abrufmenge, Laufzeit und Providerkontingente protokollieren |

## 22 Cache-, Snapshot- und Versionierungsstrategie

```
SnapshotManifest {
  snapshotId: "snap_20260709_provider_metric_hash",
  sourceId: "provider-x",
  datasetId: "asking-price-house-mkk",
  schemaVersion: 1,
  contentHash: "sha256:...",
  fetchedAt: "...",
  observedPeriod: "2026-06",
  recordCount: 12,
  validationStatus: "passed",
  previousSnapshotId: "snap_...",
  expiresAt: "..."
}
```

| Speicherart | Zweck |
| --- | --- |
| Immutable Raw Snapshot | Audit und erneute Normalisierung, nur soweit Lizenz erlaubt. |
| Normalized Snapshot | frontendfähige, validierte Beobachtungen. |
| Latest Pointer | schneller Zugriff auf letzten validen Stand. |
| Client Cache | Offline-/Stale-Verfügbarkeit auf dem Gerät. |
| Geometry Asset | versionierte, selten geänderte lokale GeoJSON-Datei. |
| Run Log | technischer Laufstatus ohne personenbezogene Daten oder Secrets. |

- Ein fehlerhafter neuer Snapshot ersetzt niemals den letzten validen Stand.
- Clientcache speichert Quelle, Periode und Qualitätsstatus zusammen mit dem Wert.
- Cacheinvalidierung erfolgt nach Dataset und nicht pauschal für den ganzen Marktmonitor.
- Schemawechsel benötigen Migration oder parallele Leseunterstützung.
- Rohdatenaufbewahrung richtet sich nach Lizenz, Datenschutz, Kosten und Reproduzierbarkeit.

## 23 Freshness Policies und Statusmodell

| Status | Definition | UI |
| --- | --- | --- |
| fresh | innerhalb quellen-/kennzahlspezifischer Frist | „Aktuell“ plus Datenperiode |
| stale | valider Wert, aber Refresh- oder Publikationsfrist überschritten | Amber-Hinweis; weiter nutzbar |
| degraded | Quelle liefert Teilmenge oder Qualitätsproblem | Hinweis mit Ursache |
| missing | kein valider Wert für Gebiet/Segment | kein Ersatzwert erfinden |
| error | Abruf/Validierung fehlgeschlagen, kein nutzbarer Snapshot | Fehlerzustand und Alternative |
| offline | Netz nicht verfügbar; letzter lokaler Snapshot | Offline-Badge und Abrufzeit |
| estimated | methodisch geschätzt | klar von Beobachtung trennen |

| Datenart | Beispielhafte Freshness-Logik |
| --- | --- |
| Basiskarte | provider- und cacheabhängig |
| Gemeindegrenzen | jährliche Prüfung; Version sichtbar |
| Bodenrichtwert | Stichtag und amtlicher Festsetzungszyklus |
| Angebotsmarkt | täglich technisch prüfen; fachliche Periode providerabhängig |
| Regionalstatistik | nach veröffentlichtem Tabellenstand |
| Eigene CRM-Daten | sofort nach lokalem Schreibereignis |
| Prognose | veraltet, sobald Inputversion oder Modellversion überholt ist |

## 24 Fehlerbehandlung, Retry und Betriebszustände

| Fehlerklasse | Beispiel | Reaktion |
| --- | --- | --- |
| Netzwerk | Timeout / DNS | begrenzter Retry mit Backoff, Cache verwenden |
| Authentifizierung | Token ungültig | nicht wiederholt versuchen; Betreiberhinweis |
| Rate Limit | HTTP 429 | Retry-After beachten; Status „degraded“ |
| Schemaänderung | Feld fehlt / Typ geändert | Snapshot quarantänisieren, letzten validen behalten |
| Datenplausibilität | Preis außerhalb Regelbereich | Quality Flag; nicht still korrigieren |
| Geometrie | ungültiges Polygon | Build stoppen oder Fallbackgeometrie mit Diagnose |
| Engine | WebGL/CSP/Workerfehler | kontrollierter Kartenfallback |
| Tileprovider | Basemap nicht verfügbar | neutrale Fläche + Fachlayer/Details weiter nutzbar |

> **Nutzerkommunikation:** Technische Fehlermeldungen wie Stacktraces, Providerpayloads oder Tokenhinweise gehören nicht in die Nutzeroberfläche. Die UI erklärt Auswirkung, letzten validen Stand und nächste mögliche Aktion.

## 25 Sicherheit, Secrets und Missbrauchsschutz

- API-Keys ausschließlich als Netlify Environment Variables oder vergleichbar geschützte Secrets.
- Providerendpunkte nicht als beliebigen offenen Proxy implementieren.
- Erlaubte Metriken, Gebiete und Parameter serverseitig whitelisten.
- Antwortgrößen, Timeouts und Abrufhäufigkeit begrenzen.
- Logs von Adressen, Kontakten, Tokens und vollständigen Providerantworten bereinigen.
- Geocoder und Suchendpunkte gegen automatisierte Massenabfragen schützen.
- CSP an die gewählte Kartenengine anpassen; MapLibre-Workeranforderungen bewusst konfigurieren.
- Externe Styles, Glyphen und Sprites als eigene Supply-Chain-Abhängigkeiten behandeln.
- Bibliotheksversionen pinnen und kontrolliert aktualisieren.

Bei MapLibre muss die CSP-Konfiguration die Worker- und Bildanforderungen der gewählten Einbindungsform berücksichtigen. Eine strikte CSP-Variante mit separatem Worker ist zu prüfen, wenn die bestehende Sicherheitsrichtlinie keine Blob-Worker zulassen soll.

## 26 Lizenzierung, Attribution und Quellenvermerk

| Quelle/Asset | Pflicht |
| --- | --- |
| OpenStreetMap-Daten/Basemap | sichtbare OSM-Attribution nach Anbieter- und OSM-Regeln. |
| BKG VG250 | vorgeschriebener BKG-/dl-de/by-2-0-Quellenvermerk und Veränderungshinweis. |
| Hessen/BORIS | Nutzungsbedingungen des konkreten Dienstes/Datensatzes prüfen und anzeigen. |
| Kommerzielle Marktdaten | vertraglich zulässige Darstellung, Caching und Weitergabe. |
| Regionalstatistik | Quellenangabe und Nutzungs-/Webservicebedingungen beachten. |
| Eigene Daten | als interne Daten kennzeichnen; keine amtliche Anmutung. |

- Attribution ist Bestandteil der Karte und des Quellenpanels, nicht nur des Impressums.
- Bei mehreren aktiven Layern werden relevante Quellen gesammelt und dedupliziert angezeigt.
- Jede Bearbeitung amtlicher Geometrie erhält den geforderten Veränderungshinweis.
- Ein Source-Info-Dialog zeigt Lizenz, Stand, Methode und externe Referenz.
- Provider mit unklarer Weitergaberegel bleiben im Status `candidate`.

## 27 Layerarchitektur und Layerkatalog

```
LayerDefinition {
  id: "market-asking-price",
  group: "market",
  title: "Angebotspreis Verkauf",
  sourceId: "market-observations",
  geometry: "polygon",
  renderer: "choropleth",
  metricId: "asking_price_sale_sqm",
  defaultVisible: true,
  minZoom: 7,
  maxZoom: 16,
  legendId: "price-sale-v1",
  interaction: { selectable: true, hover: true, tap: true },
  privacy: "public-aggregate"
}
```

| Layergruppe | Beispiele |
| --- | --- |
| Basemap | hell, neutral, optional Satellit nur bei lizenzierter Quelle |
| Verwaltung | Landkreisgrenze, Gemeindegrenzen, Labels |
| Markt | Angebotspreis, Miete, Bodenrichtwert, Trend, Angebot |
| Struktur | Bevölkerung, Bautätigkeit, Bestand |
| CRM | Kontaktdichte, Eigentümer, fehlende Zuordnung |
| Aktivität | Anrufe, Follow-ups, Termine, letzte 30 Tage |
| Objekte/Pipeline | Objekte, Bewertungen, Pipelinewert, Dealphase |
| Netzwerk | Tippgeber, Partner, Kontakte nach Branche |
| Datenqualität | fehlende Werte, stale Daten, kleine Stichprobe |

Nur eine primäre Marktkennzahl wird gleichzeitig als vollflächige Choropleth dargestellt. Weitere Layer werden als Marker, Linien, Symbole, Umrisse oder Detailinformation kombiniert, damit die Karte lesbar bleibt.

## 28 Basemap-, Grenz- und Label-Layer

| Layer | Darstellung | Regeln |
| --- | --- | --- |
| Basemap | ruhige helle Karte | geringe visuelle Dominanz, klare Attribution |
| MKK-Grenze | kräftiger Außenumriss | immer erkennbar, nicht mit Gemeindeauswahl verwechseln |
| Gemeindegrenzen | feine Linien | abhängig von Zoom und Auswahl verstärken |
| Gemeindeflächen | transparent / metric fill | Farblogik nur bei aktivem Polygonlayer |
| Labels | Ortsname, optional Wert | keine Überlagerung; Mobile reduziert |
| Auswahl | Umriss + dezente Füllung | farbunabhängig zusätzlich durch Linie/State sichtbar |
| Hover | temporärer Umriss | nur auf Hover-Geräten; Tap auf Mobile |

- Gebietslabels verwenden offizielle Namen aus Area Registry.
- Grenzen liegen über der Basemap, aber unter interaktiven Markern.
- Bei fehlender Basemap bleiben Grenzen und Labels auf neutralem Hintergrund sichtbar.
- Gemeindeauswahl funktioniert auch über eine zugängliche Liste außerhalb der Karte.

## 29 Choroplethen und Marktkennzahl-Farblogik

| Regel | Vorgabe |
| --- | --- |
| Skalierung | für Vergleiche gleiche Skala und gleiche Schwellen verwenden |
| Klassifikation | Quantile, Equal Interval oder fachliche Schwellen dokumentieren |
| Missing | neutrales Muster/Grau, nicht niedrigster Wert |
| Stale | Wertfarbe plus klarer Stale-Indikator im Detail |
| Ausreißer | nicht unkontrolliert gesamte Skala verzerren |
| Legende | Einheit, Periode, Segment und Klassifikationsmethode zeigen |
| Farbblindheit | Unterschiede zusätzlich durch Text, Muster oder Werte verständlich |
| Vergleich | Gebiet A und B nicht mit unabhängig skalierten Farben täuschen |

> **Keine Ampelbewertung des Marktes:** Rot, Gelb und Grün werden nicht pauschal als „schlechter/guter Markt“ verwendet. Preisniveau, Dynamik und eigene Vertriebschance sind unterschiedliche Dimensionen.

## 30 Marker, Clustering und Punktdaten

| Punkttyp | Defaultdarstellung | Datenschutz |
| --- | --- | --- |
| Eigene Objekte | intern sichtbarer Marker oder Cluster | Adresse nur in geschützter Detailansicht |
| Kontakte | standardmäßig aggregiert pro Gebiet | keine Privatadresse auf öffentlicher Karte |
| Tippgeber/Partner | optional Unternehmensstandort | nur gespeicherte geschäftliche Daten |
| Termine | zeitbezogen, kurzfristig | nicht im öffentlichen Präsentationsmodus |
| Vergleichsobjekte | nur lizenzkonform und quellegebunden | keine unerlaubte Weitergabe |
| Datenqualitätsfälle | Gebiets- oder Listenhinweis | keine PII im Kartenlabel |

- Clustering ab datenabhängiger Schwelle aktivieren.
- Markerzahl und DOM-Nodes begrenzen; bevorzugt Engine-Layer statt tausender HTML-Marker.
- Clusterklick zoomt oder öffnet aggregierte Liste.
- Marker besitzen eindeutigen Typ, Status und zugängliche Alternativliste.
- Genaue Koordinaten werden nur gespeichert, wenn fachlich erforderlich und datenschutzrechtlich vertretbar.

## 31 Heatmaps und Dichteanalysen

Heatmaps eignen sich für räumliche Dichte, nicht zur Darstellung amtlicher Preisgrenzen. Sie werden für eigene Aktivitäten, Kontakte oder Angebotsdichte verwendet, wenn die Punktzahl groß genug und die Aggregation verständlich ist.

| Heatmap | Gewicht | Hinweis |
| --- | --- | --- |
| Kontaktaktivität | Anzahl oder dokumentierte Aktivitätsgewichtung | Gewichtung transparent machen |
| Follow-up-Druck | offene/überfällige Fälle | kein Personenranking |
| Pipelinepotenzial | aggregierter Wert mit Kappung | Ausreißer behandeln |
| Angebotsdichte | Anzahl lizenzierter Beobachtungen | Stichprobe und Zeitraum nennen |
| Netzwerkabdeckung | aktive Partnerpunkte | kleine Zahlen besser als Symbole zeigen |

- Heatmap besitzt immer Zeitraum und Legende.
- Heatmap wird bei kleinen Fallzahlen durch Punkte oder Gebietssummen ersetzt.
- Keine Rückschlüsse auf Einzelpersonen aus öffentlichen Darstellungen ermöglichen.
- Gewichtungsformel und Kappung werden im Quellen-/Methodenpanel dokumentiert.

## 32 Filter-, Layer- und Kennzahlsteuerung

| Steuerung | Desktop | Mobile |
| --- | --- | --- |
| Primäre Kennzahl | kompakte Segmentsteuerung oberhalb der Karte | horizontale Chips / Bottom Sheet |
| Layer | Layerpanel mit Gruppen | Sheet mit Schaltern und Legende |
| Zeitraum | Dropdown/Zeitleiste | kompakter Selector |
| Objektart | Filterchips | Sheet/Chips |
| Datenqualität | Toggle/Filter | im Quellenstatus erreichbar |
| Zurücksetzen | sichtbarer Button | im Sheet und Kartenheader |
| Aktive Filter | Chips neben Titel | kompakte Zeile, horizontal scrollbar |

Filter werden mit Detailpanel, Legende, Vergleich und Kartenlayern synchronisiert. Ein Filter darf nicht nur die Farbe ändern, während Detailwerte aus einer anderen Segmentdefinition stammen.

## 33 Gebietsauswahl und synchronisierte Navigation

Ein Gebiet kann über Polygon, Label, Suchfeld, Liste, Dashboard-Deep-Link oder CRM-Kontext ausgewählt werden. Alle Wege führen zum selben Selection State. Die Auswahl steuert Kartenfokus, Detailpanel, Kennzahlwerte und Aktionen.

```
KK_MARKET.selectArea({
  areaId: "de-he-06435-020",
  source: "map-polygon",
  metricId: "asking_price_sale_sqm",
  preserveViewport: false,
  openDetails: true
});

Events:
  market.area.selected
  market.metric.changed
  market.layers.changed
  market.compare.changed
```

| Auslöser | Erwartung |
| --- | --- |
| Dashboard Markt-KPI | Markttab öffnen, Gebiet/Kennzahl fokussieren |
| CRM Gebietschip | Marktmonitor mit Gebiet und CRM-Layer öffnen |
| Polygon Tap | Gebiet markieren und Bottom Sheet öffnen |
| Suchergebnis | fitArea und Detailpanel |
| Browser Zurück | vorherige Auswahl/Ansicht wiederherstellen |
| Vergleich hinzufügen | zweites Gebiet ohne Verlust des ersten Kontexts |

## 34 Gebietsdetailpanel

```
┌──────────────── Gebiet: Bruchköbel ────────────────┐
│ Kernfestung · Datenstatus: aktuell / teilweise       │
│                                                      │
│ Angebotspreis Haus                 3.820 EUR/m²       │
│ Datenstand: Juni 2026 · Abruf: heute · n=47          │
│ Trend 12 Monate: +2,4 % · Quelle: Provider X          │
│                                                      │
│ Eigene Arbeit                                        │
│ 34 Kontakte · 6 Follow-ups fällig · 2 Pipelinefälle  │
│                                                      │
│ [Kontakte] [Follow-ups] [Pipeline] [Gebietsplan]      │
│                                                      │
│ Quelle & Methode · Datenqualität · Verlauf            │
└──────────────────────────────────────────────────────┘
```

| Bereich | Pflichtinhalt |
| --- | --- |
| Gebietskopf | Name, strategische Rolle, Datenstatus |
| Primärkennzahl | Wert, Einheit, Segment, Zeitraum |
| Trend | Vergleichszeitraum und Methodik |
| Quelle | Name, Datenstand, Abruf, Qualität, Stichprobe |
| Eigene Aktivität | Kontakt-, Follow-up-, Objekt- und Pipelinezusammenfassung |
| Aktionen | direkte Deep Links in Arbeitsmodule |
| Methodik | Definition, Einschränkungen und Lizenz |
| Fehlende Daten | ehrlicher Leerzustand mit Alternativen |

## 35 Gebietsvergleich

Der Vergleichsmodus stellt zwei oder mehr Gebiete nur auf kompatibler Basis gegenüber. V31 priorisiert einen Zwei-Gebiete-Vergleich, da er auf Mobile und im Kundengespräch verständlich bleibt.

| Vergleichsdimension | Regel |
| --- | --- |
| Kennzahl | identische Metric-ID und Einheit |
| Segment | identische Objektart und Filter |
| Periode | gleicher Zeitraum oder klarer Hinweis auf Abweichung |
| Quelle | gleiche Quelle bevorzugt; sonst Methodikunterschied sichtbar |
| Qualität | Sample Size und Status nebeneinander |
| Eigene Aktivität | gleiche Berechnungslogik und Zeitraum |
| Karte | beide Gebiete hervorgehoben; keine irreführende getrennte Farbschala |

```
Vergleich Bruchköbel ↔ Nidderau

Kennzahl                 Bruchköbel      Nidderau
Angebotspreis Haus       3.820 EUR/m²    3.610 EUR/m²
Datenstand               Juni 2026       Juni 2026
Stichprobe                47              38
12-Monats-Trend           +2,4 %          +1,6 %
Eigene Kontakte           34              29
Fällige Follow-ups        6               3
Pipelinewert              ...             ...

Hinweis: Angebotspreise, keine beurkundeten Kaufpreise.
```

## 36 Zeitreihen und historische Versionen

| Funktion | Vorgabe |
| --- | --- |
| Zeitraum | 3, 6, 12, 24 Monate oder quellenabhängig |
| Granularität | nicht künstlich interpolieren; Originalfrequenz erhalten |
| Lücken | sichtbar lassen oder klar als geschätzt markieren |
| Methodenwechsel | Bruch in Zeitreihe markieren |
| Gebietsstandsänderung | Geometrie-/Gebietsrevision dokumentieren |
| Vergleich | Indexierung optional, Originalwerte weiterhin zugänglich |
| Tooltip | Wert, Periode, Quelle, Sample Size, Qualität |

Historische Beobachtungen werden unveränderlich gespeichert. Korrekturen erzeugen eine neue Version mit Korrekturhinweis, statt alte Werte still zu überschreiben.

## 37 Prognosen, Szenarien und Unsicherheit

Prognosen sind ein späterer, besonders sensibler Layer. Eine einfache Trendfortschreibung darf nicht als belastbare Immobilienpreisprognose dargestellt werden. Vor produktiver Aktivierung benötigt jede Prognose ein Modell-Dossier.

| Pflichtfeld | Beschreibung |
| --- | --- |
| Modell-ID und Version | eindeutige reproduzierbare Methode |
| Zielkennzahl | was genau wird prognostiziert |
| Horizont | z. B. 6 oder 12 Monate |
| Inputdaten | Quellen, Perioden und Transformationen |
| Trainings-/Kalibrierungszeitraum | historische Grundlage |
| Unsicherheitsintervall | Band statt Einzelpunkt |
| Validierung | Backtest und Fehlermaße |
| Ausschlüsse | kleine Stichprobe, Strukturbruch, fehlende Daten |
| Haftungstext | keine Garantie oder Verkehrswertermittlung |

> **V31 Regel:** V31 darf Prognoseplätze, Datenverträge und UX-Zustände vorbereiten. Eine echte Zahl wird erst gezeigt, wenn Methode, Daten und Unsicherheit geprüft sind.

## 38 Suche, Adresssuche und Geocoding

| Suchtyp | Umsetzung |
| --- | --- |
| Gebietssuche | lokal aus Area Registry, sofort und offline |
| Kontakt/Objekt | lokal aus CRM-/Objektdaten mit Berechtigungsregeln |
| Adresse | nur über freigegebenen Geocoder und datenschutzgerechten Prozess |
| Koordinate | nur interne Diagnose oder autorisierte Funktion |
| Quelle/Metric | Suche im Quellen- und Kennzahlenkatalog |

- Geocoder nicht bei jedem Tastendruck ohne Debounce und Mindestlänge aufrufen.
- Adressen nicht unnötig an Drittanbieter senden.
- Geocoding-Ergebnis mit Confidence und Quelle speichern.
- Manuelle Gebietszuordnung bleibt möglich und wird als manuell gekennzeichnet.
- Eine Adresse kann einem Gebiet zugeordnet werden, ohne ihre exakte Koordinate dauerhaft zu speichern.

## 39 Map State, Persistenz und Deep Links

```
MapState {
  schemaVersion: 1,
  viewport: { center: {lon, lat}, zoom, bearing, pitch },
  selectedAreaId: "...",
  compareAreaIds: ["..."],
  metricId: "asking_price_sale_sqm",
  filters: { propertyType: "house", period: "latest" },
  visibleLayerIds: ["area-boundaries", "market-price", "crm-density"],
  detailMode: "summary"
}
```

| Zustand | Speicherort |
| --- | --- |
| Teilbare Auswahl/Kennzahl | URL/Hash, sofern nicht sensibel |
| Aktive Layer und bevorzugte Basemap | Nutzereinstellungen / localStorage |
| Viewport | optional lokal; Deep Link kann überschreiben |
| Einmaliger Fokus | sessionStorage / transient |
| Kontakt-/Objekt-ID | nur wenn Zugriff und Datenschutz passen |
| Engineinstanz | nur Memory, niemals persistieren |

Ein veralteter gespeicherter Layer oder Metric-ID wird beim Start validiert und kontrolliert auf Defaults zurückgesetzt. Persistierte Zustände dürfen keinen Renderfehler auslösen.

## 40 Desktop-Interaktionsmodell

| Bereich | Verhalten |
| --- | --- |
| Kartenkopf | Titel, Aktualitätsstatus, Kennzahl, Filter, Refresh |
| Karte | dominante Fläche, klare Controls, keine überlagernden Kartenkarten |
| Linkes/oberes Filterpanel | kompakt, einklappbar, aktive Filter sichtbar |
| Rechtes Detailpanel | Gebietsdetails, Quelle und Aktionen |
| Vergleich | zweite Auswahl mit klarer Vergleichsleiste |
| Legende | immer passend zur aktiven Kennzahl |
| Quellenstatus | direkt erreichbar, nicht im Archiv versteckt |
| Tastatur | Gebietsliste und Controls vollständig bedienbar |

Der Nutzer soll auf großen Bildschirmen Karte und Detaildaten gleichzeitig sehen. Das Detailpanel verändert die effektive Kartenfläche; der MapAdapter muss anschließend `resize` und gegebenenfalls ein gepolstertes `fitArea` ausführen.

## 41 Mobile-Interaktionsmodell

```
┌──────────────── Marktmonitor ────────────────┐
│ [Kennzahl ▼] [Layer] [Aktuell ✓] [⋯]          │
│                                               │
│                                               │
│                  KARTE                        │
│                                               │
│                                     [⛶] [◎]  │
├───────────────────────────────────────────────┤
│ Bottom Sheet: Bruchköbel                      │
│ 3.820 EUR/m² · Juni 2026 · Quelle X            │
│ 6 Follow-ups · 2 Pipelinefälle                │
│ [Kontakte] [Follow-ups] [Mehr Details]        │
└───────────────────────────────────────────────┘
```

- Karte besitzt eine definierte Höhe und optional Fullscreen-Modus.
- Gebietsdetails erscheinen als gestuftes Bottom Sheet, nicht als winziger Popup.
- Layer und Filter öffnen in einem Sheet mit großen Touch-Zielen.
- Tap wählt; Hoverfunktionen besitzen Mobile-Alternative.
- Doppelte Gestenfallen zwischen Seiten-Scroll und Karten-Pan vermeiden.
- Wichtige Aktionen bleiben oberhalb der Safe Area erreichbar.
- Im Kundengespräch kann ein Präsentationsmodus sensible interne Layer ausblenden.

## 42 Präsentationsmodus und Datenschutzkontext

| Modus | Sichtbar | Ausgeblendet |
| --- | --- | --- |
| Arbeitsmodus | alle berechtigten internen und externen Layer | nur explizit deaktivierte Layer |
| Kundengespräch | Marktwerte, Quellen, Gebiet, aggregierte öffentliche Daten | Kontakt-/Follow-up-/Pipeline-Details und Privatadressen |
| Monitor/TV | Tages-/Gebietsüberblick, keine sensiblen Einzeldaten | PII, Telefonnummern, genaue Adressen |
| Export/Screenshot | nur freigegebene sichtbare Layer mit Attribution | verdeckte interne Metadaten |

> **Öffentliche Netlify-Auslieferung:** Solange keine belastbare Authentifizierung vorhanden ist, dürfen produktive personenbezogene Echtdaten nicht ungeschützt über eine öffentliche URL bereitgestellt werden. Kartenfunktionen ändern diese Grundregel nicht.

## 43 Datenqualitäts- und Methodenpanel

| Element | Inhalt |
| --- | --- |
| Wertdefinition | exakte fachliche Bedeutung |
| Quelle | Anbieter, Datensatz, externe Referenz |
| Zeitraum | Beobachtungsperiode und Stichtag |
| Abruf | letzter erfolgreicher technischer Abruf |
| Stichprobe | Anzahl und bekannte Einschränkungen |
| Methode | Median/Mittelwert, Filter, Aggregation, Transformation |
| Qualitätsflags | stale, small_sample, mixed_method, estimated, missing |
| Lizenz | Attribution und zulässige Nutzung |
| Verlauf | Snapshot-/Methodenversionen |
| Melden | Datenproblem in lokale Qualitätsqueue aufnehmen |

Qualitätsinformationen sind kein technischer Anhang, sondern Teil der Nutzervertrauenslogik. Sie müssen aus jedem Marktwert mit höchstens einer zusätzlichen Interaktion erreichbar sein.

## 44 Legenden, Quellen und visuelle Semantik

- Jeder Layer besitzt genau eine verantwortete Legende.
- Legende zeigt Einheit, Klassengrenzen, Missing-Zustand und Zeitraum.
- Quellen werden dynamisch aus sichtbaren Layern gesammelt.
- Attribution bleibt auch im Fullscreen und Mobile sichtbar.
- Interne Layer werden als „Eigene Daten“ gekennzeichnet.
- Schätzungen verwenden gestrichelte oder entsprechend markierte Darstellung.
- Amtliche Daten erhalten keine „Live“-Kennzeichnung, wenn der fachliche Stand älter ist.
- Farben aus der Design Bible werden semantisch und kontrastreich eingesetzt.

## 45 Performance- und Größenbudgets

| Bereich | Ziel / Regel |
| --- | --- |
| Erste Karteninteraktion | nach sichtbarer Tabaktivierung schnell möglich; schwere Quellen lazy laden |
| Gemeindegeometrie | MKK-Datei klein halten; Low-/Medium-Detailstufen |
| Marker | Clustering/Aggregation ab definierter Schwelle |
| GeoJSON Update | nur geänderte Quelle aktualisieren; keine komplette Engine-Neuerstellung |
| Charts/Trends | erst bei geöffnetem Detailbereich rendern |
| Providerantwort | nur benötigte Felder und Gebiete ausliefern |
| Clientcache | Quoten und Löschstrategie überwachen |
| Tabwechsel | Engine pausieren, nicht mehrfach initialisieren |
| Resize | debounced und idempotent |
| Mobile Speicher | große Rohsnapshots nicht vollständig in LocalStorage halten |

- Performance wird mit echten priorisierten Geometrien und realistischen Layerzahlen getestet.
- WebGL-Fallback beziehungsweise nicht unterstützte Geräte erhalten einen kontrollierten Modus.
- Keine Tausenden HTML-Marker, wenn ein Engine-Layer möglich ist.
- Für größere Geodaten später Vector Tiles oder PMTiles evaluieren; V31 bleibt auf MKK-Scope fokussiert.

## 46 Accessibility der Kartenplattform

| Problem | Pflichtlösung |
| --- | --- |
| Karte nicht vollständig screenreadergeeignet | parallele Gebietsliste und Datentabelle anbieten |
| Farbe als einziger Träger | Wert, Status und Muster/Text ergänzen |
| Hover-only Tooltip | Fokus- und Tap-Alternative |
| Keyboard-Auswahl | Liste/Controls und optional Feature-Navigation |
| Popup-Fokus | Bottom Sheet/Dialog mit Fokusmanagement |
| Dynamische Statusänderung | Live Region für Auswahl und Datenstatus |
| Zoom/Gesten | sichtbare Buttons und Hilfe |
| Legende | semantischer Text und ausreichender Kontrast |

Die zugängliche Alternativansicht ist kein nachträgliches Extra. Sie wird aus denselben Services gespeist und unterstützt dieselben Filter, Gebietsaktionen und Qualitätsinformationen.

## 47 Beobachtbarkeit und Betriebsmonitoring

| Signal | Beispiel |
| --- | --- |
| Refresh Run | Start, Ende, Dauer, Ergebnis je Quelle |
| Provider Health | letzter Erfolg, Fehlerquote, Rate-Limit-Status |
| Snapshot Health | Datensätze, Hash, Validation Status |
| Client Health | Engine geladen, Basemapstatus, Offline, Cachealter |
| Data Quality | Anzahl missing/stale/small_sample je Metric |
| Kosten | Abrufe, Function-Laufzeit, Providerkontingent |
| Nutzung | aktive Layer und Gebietsauswahl nur aggregiert, datenschutzgerecht |

- Keine personenbezogenen Karteninteraktionen in öffentliche technische Logs schreiben.
- Health Summary im Backup-/Diagnosebereich anzeigen.
- Providerfehler müssen ohne Codeänderung deaktivierbar sein.
- Ein Quellenstatusdashboard zeigt „active/degraded/suspended“ und letzten validen Snapshot.

## 48 Teststrategie – Geografie, Daten und Interaktion

| Testart | Pflichtfälle |
| --- | --- |
| Unit | Area-ID, Metric Schema, Freshness, Klassifikation, Provider Normalizer |
| Fixture | bekannte Providerantworten, Fehlerpayloads, Missing und Small Sample |
| Geometry | Featureanzahl, AGS, Bounds, Gültigkeit, priorisierte Gemeinden |
| Integration | Function → Snapshot → Frontend → Karte → Detailpanel |
| Interaction | Polygon, Suche, Deep Link, Vergleich, Filter, Browser Back |
| Mobile | Tap, Sheet, Fullscreen, Orientation, Safe Area |
| Offline | Basemapfehler, lokaler Snapshot, lokale CRM-Layer |
| Security | keine Secrets, Parameterwhitelist, CSP, XSS |
| License | Attribution sichtbar und quellenabhängig |
| Regression | alle zwölf priorisierten Gebiete und bestehende Markt-Storage-Daten |

Tests verwenden feste Fixtures und dürfen nicht ausschließlich von Live-Providern abhängen. Live-Smoke-Tests sind ergänzend und tolerieren kontrollierte Providerstörungen.

## 49 Verbindliche End-to-End-Abnahmefälle

1. Bruchköbel über Dashboard öffnen; Marktmonitor fokussiert Gebiet, zeigt Kennzahl, Quelle und aktive Filter.
2. Aktive Kennzahl von Angebotspreis auf CRM-Kontaktdichte wechseln; Legende und Detailpanel wechseln synchron.
3. „6 Follow-ups fällig“ im Gebiet anklicken; Follow-up-Modul öffnet gefiltert auf Bruchköbel.
4. Bruchköbel und Nidderau vergleichen; gleiche Kennzahl, Periode und Qualitätsangaben sind sichtbar.
5. Basemap künstlich blockieren; Gemeindegrenzen, Auswahl, Detailpanel und lokaler Snapshot bleiben nutzbar.
6. Provider liefert ungültiges Schema; letzter valider Snapshot bleibt sichtbar und Status wird `degraded`.
7. Bodenrichtwertbereich zeigt Stichtag/Festsetzungslogik und behauptet keine tägliche fachliche Aktualisierung.
8. Mobile 390 px: Gebiet per Tap auswählen, Sheet öffnen, Quelle ansehen und Kontakte öffnen.
9. Präsentationsmodus aktivieren; interne Kontakt-, Follow-up- und Pipelineinformationen verschwinden.
10. Browser-Zurück stellt vorherige Gebietsauswahl und Kennzahl wieder her.
11. Attribution bleibt in Normal-, Fullscreen- und Mobile-Modus sichtbar.
12. Backup/Import erhält Marktmonitor-Einstellungen, lokale Beobachtungen und Source Registry kompatibel.

## 50 Implementierungsphasen für Teil 4

| Phase | Inhalt | Gate |
| --- | --- | --- |
| M0 | Inventar vorhandener Karte, Storage, Provider und CSS/JS-Layer | Istzustand und Baseline reproduzierbar |
| M1 | Area Registry, stabile IDs, priorisierte Koordinaten und Bounds | Gebietsmodell getestet |
| M2 | BKG-/Geometriepipeline, Lizenz und lokale Assets | echte Gemeindegrenzen vorhanden |
| M3 | MapAdapter-Contract und Engine-Spike Leaflet/MapLibre | ADR-005 freigegeben |
| M4 | Primäre Engine, Basemapprovider, Grenz-/Auswahllayer | Karte Desktop/Mobile stabil |
| M5 | Layer Registry, CRM-/Follow-up-/Pipeline-Layer | operative Deep Links funktionieren |
| M6 | Market Metric Schema, Source Registry, Detail-/Qualitätspanel | Datenwahrheit sichtbar |
| M7 | Netlify Functions, erster Provider, Snapshot und Scheduler | erster ehrlicher automatischer Datenfluss |
| M8 | Vergleich, Zeitreihe, Offline-/Stale-Zustände | Kundengespräch-Workflow komplett |
| M9 | Performance, Accessibility, Security, License QA | Release Gates erfüllt |
| M10 | Legacy-Schema-Karte nur als Fallback oder entfernt | keine doppelte primäre Karte |

## 51 Architecture Decision Records und Provider-Dossiers

| Dokument | Pflichtentscheidung |
| --- | --- |
| ADR-005 | Kartenengine und Übergang von Leaflet zu MapLibre |
| ADR-009 | Basemap-/Tileprovider und OSM-Policy-Konformität |
| ADR-010 | BKG VG250 Geometriequelle, Vereinfachung und Attribution |
| ADR-011 | Snapshot-/Cache-Speicher auf Netlify |
| ADR-012 | Scheduled Refresh, UTC-Zeit und Run-Locking |
| ADR-013 | Adresssuche/Geocoder und Datenschutz |
| ADR-014 | Präsentationsmodus und Zugriffsschutz |
| Provider Dossier | je Markt-/Statistik-/Bodenwertquelle: Lizenz, Kosten, API, Frequenz, Qualität |

```
Provider Dossier – Kurzstruktur
1. Zweck und unterstützte Kennzahlen
2. Offizieller Anbieter und Vertragspartner
3. Zugriff / Authentifizierung / Rate Limits
4. Räumliche und zeitliche Abdeckung
5. Lizenz, Anzeige- und Cache-Rechte
6. Rohschema und Normalisierung
7. Qualitätsrisiken und Stichprobenlogik
8. Kosten und Abschaltgrenzen
9. Testfixtures und Monitoring
10. Exit-/Ersatzstrategie
```

## 52 Anti-Pattern-Katalog

| Anti-Pattern | Warum unzulässig | Zielmuster |
| --- | --- | --- |
| Statische Fantasiepreise als „aktuell“ | Vertrauens- und Beratungsrisiko | Source Registry + Observation Schema |
| SVG-Schemakarte als echte Geografie | falsche räumliche Aussage | amtliche Geometrie / klarer Fallback |
| Zweite Kartenengine parallel | doppelter Zustand und Bugs | ein MapAdapter, eine primäre Engine |
| OSM Standard Tiles als garantierter Dienst | kein SLA, Policyrisiko | austauschbarer Produktionsprovider |
| Offline-Download von OSM Standard Tiles | Policyverstoß | eigene/lizenzierte Offlinequelle oder Geometriefallback |
| API-Key im HTML | Secret-Leak | Netlify Function + Environment Variable |
| Providerpayload direkt im UI | Anbieterbindung und Schemafehler | Normalizer + internes Modell |
| Täglicher Browser-Interval | unzuverlässig | Scheduled Function + Cache |
| Abrufzeit als Datenstand | täuschende Aktualität | observed/fetched getrennt |
| Angebotspreis = Kaufpreis | fachlich falsch | klare Kennzahlentaxonomie |
| Independent Scales im Vergleich | visuell irreführend | gemeinsame Vergleichsskala |
| Privatadressen als öffentliche Marker | Datenschutzrisiko | Aggregation / geschützter Modus |
| Heatmap bei drei Punkten | Scheingenauigkeit | Punkte oder Gebietssumme |
| Grenzen aus Screenshot nachzeichnen | nicht amtlich/reproduzierbar | dokumentierte Geodatenpipeline |
| Fehler überschreibt validen Cache | Datenverlust | immutable snapshots + latest valid pointer |

## 53 Definition of Done – Marktmonitor und Kartenplattform

- Die primäre Karte verwendet echte geografische Positionen und dokumentierte Gemeindegrenzen.
- Alle priorisierten zwölf Gebiete besitzen stabile Area-IDs, Bounds, Zentren und geprüfte Auswahl.
- Es existiert genau eine primäre Kartenengine hinter einem dokumentierten MapAdapter.
- Basemapprovider, Tile-Policy und Attribution sind dokumentiert und konfigurierbar.
- Geometrie, Marktwerte, eigene Daten und UI-Zustand sind getrennte Schichten.
- Jeder Marktwert besitzt Quelle, Kennzahl-ID, Einheit, Segment, Zeitraum, Abruf, Qualität und Methodenversion.
- Angebots-, Transaktions-, Bodenwert- und interne Daten werden sprachlich und technisch getrennt.
- Providersecrets liegen serverseitig; das Frontend liest normalisierte Antworten.
- Ein täglicher Scheduler aktualisiert nur fällige Quellen und protokolliert den Lauf.
- Fehlerhafte neue Daten ersetzen niemals den letzten validen Snapshot.
- Fresh-, Stale-, Missing-, Degraded-, Estimated-, Error- und Offline-Zustände sind umgesetzt.
- CRM-, Follow-up-, Objekt- und Pipeline-Layer öffnen passende gefilterte Arbeitsansichten.
- Desktop, iPhone, Tablet und Präsentationsmodus sind getestet.
- Attribution und Quelleninformationen sind jederzeit erreichbar und lizenzkonform.
- Karte besitzt eine zugängliche Tabellen-/Listenalternative.
- Keine personenbezogenen Daten werden ungeschützt auf einer öffentlichen Karte ausgegeben.
- Performance-, Security-, Geometrie-, Provider- und End-to-End-Tests sind grün.
- ADRs, Source Registry, Provider-Dossiers und Betriebsbericht sind aktuell.

## 54 Offizielle Referenzen und Quellenbasis dieser Spezifikation

| Code | Quelle | Relevanz |
| --- | --- | --- |
| R1 | MapLibre GL JS Documentation – https://maplibre.org/maplibre-gl-js/docs/ | WebGL, Vector Tiles, GeoJSON-/Rasterquellen, Layer, CSP und Enginefähigkeit. |
| R2 | Leaflet API Reference – https://leafletjs.com/reference.html | bestehende Enginebasis, GeoJSON, Raster, Marker, Vektor und mobile Karte. |
| R3 | OpenStreetMap Foundation Tile Usage Policy – https://operations.osmfoundation.org/policies/tiles/ | Attribution, Identifikation, Cache, kein Bulk-/Offline-Prefetch, best effort. |
| R4 | Netlify Scheduled Functions – https://docs.netlify.com/build/functions/scheduled-functions/ | Cron-basierte regelmäßige Functions, UTC, Test- und Betriebsmodell. |
| R5 | BKG VG250 Produktbeschreibung – https://gdz.bkg.bund.de/.../vg250-01-01.html | amtliche Verwaltungsgebiete, jährlicher Stand, Gemeindeebene, Lizenz/Attribution. |
| R6 | HVBG BORIS Hessen – https://hvbg.hessen.de/immobilienwerte/boris-hessen | Bodenrichtwertrecherche, Geoportal und Festsetzungszyklus. |
| R7 | Geoportal Hessen – https://www.geoportal.hessen.de/ | Zugang zu GDI-Hessen und quellenbezogene Nutzungsbedingungen. |
| R8 | Regionaldatenbank Deutschland – https://www.regionalstatistik.de/genesis/online | regionale Statistikthemen und Webservicehinweise. |

Vor produktiver Implementierung werden URLs, Versionen, Tarife, Nutzungsbedingungen und technische Zugänge erneut geprüft. Diese Referenzliste ersetzt kein Provider-Dossier und keine rechtliche Vertragsprüfung.

## 55 Übergabe an Teil 5 – Claude Code Development Manual

Teil 4 beschreibt, was die Markt- und Kartenplattform fachlich, technisch und rechtlich leisten muss. Teil 5 definiert, wie Claude Code diese und die übrigen Produktspezifikationen in kontrollierten Entwicklungsphasen umsetzt.

- Branch-, Commit- und Releasekonventionen.
- Analyse-, Implementierungs- und QA-Arbeitsmodus.
- Regeln für autonome Fortsetzung und echte Blocker.
- Codeänderungsgrenzen in der großen Single-File-Anwendung.
- Pflichtberichte, Screenshots, Tests und ADR-Pflege.
- Umgang mit Providersecrets, externen Quellen und Netlify-Konfiguration.
- Rollback-, Backup- und Datenparitätsregeln.

## Change Log

- **1.0 – 09. Juli 2026:** Vollständige Neufassung von Teil 4: Marktmonitor, Kartenplattform und externe Marktdaten.

<!-- ENDE TEIL 4: Teil 4 – Marktmonitor & Kartenplattform -->
