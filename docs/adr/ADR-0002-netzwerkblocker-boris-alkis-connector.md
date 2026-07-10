# ADR-0002: Netzwerkblocker-Evidenz und Umsetzungsstrategie fuer BORIS/ALKIS-Connector

## Status
Accepted

## Kontext
Ein neues, sehr detailliertes Master-PRD ("KEIM CRM PRO MASTER PRD NEU") verlangt in Anhang D1/D2 ausdruecklich, dass ein Blocker fuer externe Datenquellen (insbesondere BORIS Hessen, ALKIS) nicht pauschal mit "kein Internetzugriff" erklaert werden darf, sondern mit reproduzierbarem Fehler, mehreren getesteten Alternativwegen und einer konkreten verbleibenden externen Entscheidung belegt werden muss (Anhang D1). Diese ADR dokumentiert genau diesen Nachweis fuer die aktuelle Entwicklungssitzung sowie die daraus abgeleitete, tatsaechlich umgesetzte Strategie.

## Entscheidungstreiber
- Master-PRD Anhang D2: "kein Internet ohne Connector/Proxy/Importpfad" ist explizit NICHT als Abschluss akzeptabel.
- Master-PRD 00_MASTER_EXECUTION_PROMPT §1: bei Scheitern eines Weges ist mindestens eine realistische Alternative zu pruefen und die Loesung umzubauen.
- CLAUDE.md: keine erfundenen API-Endpunkte/Layernamen/Werte.
- Nutzerentscheidung (in dieser Sitzung per Rueckfrage eingeholt): BORIS/ALKIS-Connector vollstaendig bauen und ueber eine Netlify-Preview live testen, sobald ein Deploy moeglich ist; kein Abschluss mit `configured_not_connected`, solange eine Preview genutzt werden kann.

## Durchgefuehrte Tests (Beleg fuer den Netzwerkblocker)
Drei unabhaengige technische Wege wurden geprueft, jeweils mit einem Kontrolltest gegen einen garantiert erreichbaren Host, um eine Hessen-server-spezifische Ursache auszuschliessen:

1. **Direkter `curl` durch den Sandbox-Proxy** (`HTTPS_PROXY=http://127.0.0.1:46671`):
   - `curl https://www.geoportal.hessen.de` -> `curl: (56) CONNECT tunnel failed, response 403`
   - Kontrolltest `curl https://example.com` -> identischer Fehler `403`
   - Kontrolltest `curl https://maklercrm.netlify.app` (die eigene, produktiv laufende Netlify-Seite) -> identischer Fehler `403`
   - Ergebnis: Der Sandbox-Proxy blockiert JEDEN ausgehenden Host, nicht nur Hessen-Server.

2. **`WebFetch`-Tool** (eigener, von der Anthropic-Infrastruktur bereitgestellter Netzwerkpfad, unabhaengig vom Sandbox-Proxy):
   - `WebFetch(https://www.gds-srv.hessen.de/...GetCapabilities)` -> `HTTP 403 Forbidden`
   - `WebFetch(https://opendata.hessen.de/dataset/boris-hessen)` (reine HTML-Seite, kein API-Endpunkt) -> `HTTP 403 Forbidden`
   - Kontrolltest `WebFetch(https://en.wikipedia.org/wiki/Hesse)` -> identischer Fehler `HTTP 403 Forbidden`
   - Ergebnis: Auch dieser zweite, unabhaengige Netzwerkpfad ist fuer JEDEN Host blockiert (Wikipedia als unstrittiger Kontrolltest).

3. **Playwright-Browser dieser Sitzung** (derselbe Chromium, der fuer alle UI-Tests dieses Projekts verwendet wird):
   - Laden von `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js` (Basis-Kartenbibliothek, kein Hessen-Bezug) -> `net::ERR_TUNNEL_CONNECTION_FAILED`
   - Folge: `window.L` bleibt undefined, der Leaflet-MapAdapter wird in dieser Sandbox nie `ready` - das betrifft nicht nur BORIS/ALKIS, sondern JEDEN Playwright-Test dieses Projekts, der die tatsaechliche Kartendarstellung pruefen wollte (bereits vorher implizit der Fall, hier erstmals explizit nachgewiesen).

4. **`WebSearch`-Tool** (einziger in dieser Sitzung funktionierender externer Informationskanal):
   - Liefert Suchergebnisse/Snippets (kein Live-Fetch), aber KEINE Moeglichkeit, GetCapabilities-XML, CORS-Header oder HTTP-Statuscodes tatsaechlich zu pruefen.
   - Ergebnis: nuetzlich fuer Endpunkt-Recherche, aber kein Ersatz fuer einen echten Verbindungstest.

**Schlussfolgerung:** Der Netzwerkblocker ist eine Eigenschaft dieser Entwicklungsumgebung (Sandbox-Netzwerk-Policy), nicht eine Eigenschaft der Hessen-Server. Er betrifft JEDEN externen Host gleichermassen. Das erfuellt die Beweispflicht aus Anhang D1 (reproduzierbarer Fehler, mehrere unabhaengig getestete Wege, Kontrolltest zur Ursachenisolierung).

## Betrachtete Alternativen
1. **Weiter versuchen, aus der Sandbox heraus live zu testen.** Verworfen: alle drei verfuegbaren Netzwerkpfade sind nachweislich blockiert, ein vierter Versuch wuerde keine neue Information liefern.
2. **BORIS/ALKIS als reinen Platzhalter/Dokumentation abschliessen.** Verworfen: explizit als "nicht akzeptabel" im Master-PRD (Anhang D2) ausgeschlossen.
3. **Connector vollstaendig bauen (Netlify Functions als Proxy, echte per WebSearch recherchierte Endpunkte, automatische Layer-Erkennung aus der echten GetCapabilities-Antwort statt geratener Layernamen) und ueber eine Netlify-Deploy-Preview live testen**, da Netlify-Server (anders als diese Sandbox) reguraeren Internetzugriff haben. Gewaehlt, da dies der einzige Weg ist, der sowohl "keine erfundenen Endpunkte/Layernamen" als auch "keine pauschale Blockererklaerung" gleichzeitig erfuellt.

## Entscheidung
Option 3. Umgesetzt in dieser Sitzung:
- `netlify/functions/wms-capabilities.js`: SSRF-sicherer (feste Host-Allowlist), abhaengigkeitsfreier Proxy, der die ECHTE GetCapabilities-Antwort der Hessen-WMS-Dienste ausliest und die dort tatsaechlich vorhandenen Layer (Name/Titel/queryable) zurueckgibt - kein hartcodierter Layername.
- `netlify/functions/wms-feature-info.js`: SSRF-sicherer GetFeatureInfo-Proxy mit mehreren INFO_FORMAT-Fallbacks (JSON/GML/Text).
- Client-seitig (`kk-official-gis-v1-js`): eigenstaendiges "Amtliche Layer"-Panel, GetMap-Kacheln direkt vom Client (kein Proxy noetig, da `<img>`-basiert), automatische Layer-Erkennung ueber die Capabilities-Function, Status immer sichtbar (`live`/`blocked`/`loading`/`off`), GetFeatureInfo-Popup zeigt ausschliesslich vom Dienst tatsaechlich gelieferte Attribute.
- `kk-datasource-registry-v1-js`: zentrale, sichtbare Quellenregistry mit den in Anhang A7 geforderten Pflichtfeldern.

**Verbleibender externer Schritt (nicht durch weiteren Code loesbar):** Ein echter Live-Test (sieht die App tatsaechlich Bodenrichtwertzonen, funktioniert GetFeatureInfo, ist der recherchierte Layername korrekt) kann erst nach einem Netlify-Deploy erfolgen, da die Netlify-Server internetfaehig sind, diese Sandbox aber nicht. Der Nutzer hat entschieden: Deploy auf eine Preview, danach Live-Test. Dieser Schritt ist Teil des unmittelbar folgenden Abschnitts dieser Sitzung (Deploy + Verifikationscheckliste).

## Begruendung
Ein vorgetaeuschter "live"-Status ohne echten Verbindungstest waere ein direkter Verstoss gegen CLAUDE.md ("Keine Fake-/Mock-Marktdaten als aktuelle Werte darstellen") und Anhang D2 ("erfundene Werte" als nicht akzeptabel). Der gewaehlte Weg (echte recherchierte Endpunkte, automatische Layer-Erkennung statt Raten, ehrlicher Status bis zum echten Test) ist der einzige Weg, der sowohl "vollstaendig implementieren" als auch "nichts vortaeuschen" gleichzeitig erfuellt.

## Konsequenzen
- Positiv: Der Connector-Code ist vollstaendig, SSRF-sicher, ohne erfundene Endpunkt-/Layerdaten, und wird beim ersten echten Deploy sofort funktionsfaehig sein (sofern die recherchierten Endpunkte tatsaechlich stimmen - das ist der einzige noch offene Punkt).
- Negativ: Ohne Deploy bleibt der Status `configured_not_connected` sichtbar; ein Playwright-Test dieser Funktion kann in dieser Sandbox nur mit gemockten Netzwerk-Antworten pruefen, dass die Client-Logik (Discovery, Statusanzeige, Popup-Rendering) korrekt ist - nicht, dass die echten Hessen-Endpunkte tatsaechlich wie erwartet antworten.
- Diese ADR ersetzt NICHT ADR-0001 (dort weiterhin: grundsaetzliche Backend-/Postgres-Entscheidung), sondern ergaenzt sie um den konkreten Nachweis und die konkrete Umsetzungsstrategie fuer den GIS-Connector-Teilbereich.

## Verifikation
- `node --check` fuer beide neuen Netlify Functions: fehlerfrei.
- Playwright-Test `test-official-gis.js` (20/20 Checks, Desktop+Mobile): Panel-Rendering, Discovery-Logik, Statusanzeige, GetFeatureInfo-Popup-Rendering - alles mit gemockten Netzwerkantworten getestet (siehe oben, warum das der maximal moegliche Testumfang in dieser Sandbox ist).
- Volle Regressionssuite (`verify.js`): grün.
- Echter Live-Test der tatsaechlichen Hessen-Endpunkte: aussteht, folgt nach Netlify-Deploy (siehe Abschlussbericht dieser Sitzung fuer das Ergebnis oder den naechsten konkreten Schritt).

## Rollback / Superseding
Falls sich nach dem Live-Test herausstellt, dass die recherchierten Endpunkte falsch/veraltet sind: nur `SERVICES`-Konfiguration in `wms-capabilities.js`/`wms-feature-info.js` und `kk-official-gis-v1-js` anpassen, keine strukturelle Aenderung noetig (Endpunkte sind bewusst zentral an einer Stelle je Function konfiguriert).
