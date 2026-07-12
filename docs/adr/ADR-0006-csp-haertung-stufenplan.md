# ADR-0006: CSP-Härtungs-Stufenplan (Entfernung von `unsafe-inline`)

## Status
Proposed

## Kontext

Die bestehende CSP (`index.html` Zeile 6) erlaubt `'unsafe-inline'` für `script-src` und `style-src`. Das schwächt die CSP als zweite Verteidigungslinie gegen XSS: Selbst wenn (entgegen dem Befund aus Phase 22, wonach alle 223 `innerHTML`-Stellen korrekt escapen) irgendwann eine Lücke entstehen sollte, würde die CSP eingeschleusten Inline-Code aktuell **nicht** blockieren. Eine sofortige, ungetestete globale Verschärfung würde die Anwendung mit hoher Wahrscheinlichkeit brechen (Inventar unten). Kevins Auftrag verlangt ausdrücklich **keine** unkontrollierte Komplettmigration, sondern einen konkreten, schrittweisen Plan mit Stufe-für-Stufe-Risikobewertung.

### Inventar (Stufe 1, in dieser Phase erhoben)

| Kategorie | Anzahl | Fundort |
|---|---|---|
| Inline-`<script>`-Blöcke | 61 | über die ganze Datei verteilt |
| Externe `<script src=...>` | 1 statisch (Chart.js) + 3 dynamisch (Leaflet, Leaflet.markercluster JS) | Zeile 38 bzw. `loadScriptOnce()` ~Zeile 14971 |
| `<style>`-Blöcke (Inline-CSS) | 33 | über die ganze Datei verteilt |
| Externe Stylesheets | Google Fonts (`@import`, 3× dupliziert), Leaflet-CSS (2 Dateien, dynamisch) | Zeile 72/10082/10733 bzw. `loadStyleOnce()` |
| `onclick=`-Attribute | 86 | HTML-Templates in JS-Renderfunktionen |
| `onsubmit=`-Attribute | 29 | Formulare |
| `onchange=`-Attribute | 10 | Formulare |
| Inline-`style=`-Attribute | 142 | HTML-Templates in JS-Renderfunktionen |
| Dynamische `innerHTML`-Zuweisungen | 223 (siehe Phase 22 — alle escapen korrekt) | über die ganze Datei verteilt |

Ein sofortiges Entfernen von `unsafe-inline` würde **alle 61 Inline-Scripts, alle 125 Inline-Eventhandler (`onclick`/`onsubmit`/`onchange`) und alle 33 `<style>`-Blöcke** funktionsunfähig machen, ohne dass vorher eine Alternative existiert (Nonces/Hashes pro Block, `addEventListener`-Migration). Das ist exakt das Risiko, das Kevin ausdrücklich vermeiden will.

## Entscheidungstreiber
- Kein Funktionsverlust in irgendeiner Stufe.
- Jede Stufe für sich testbar und rollback-fähig.
- CSP-Verschärfung erst nachdem die Voraussetzung (kein Inline-Code mehr an der betroffenen Stelle) tatsächlich erfüllt ist — nie „auf Verdacht".
- Nutzung des CSP-`report-only`-Modus, um Verstöße zu beobachten, bevor real blockiert wird.

## Betrachtete Optionen
1. **Sofortige globale Entfernung von `unsafe-inline`.** Verworfen — bricht die App vollständig (siehe Inventar oben).
2. **CSP dauerhaft unverändert lassen.** Verworfen — löst das strukturelle Risiko nicht, widerspricht Kevins Auftrag nach einem konkreten Fahrplan.
3. **Fünfstufiger Plan: Inventarisierung → risikoarme Auslagerung → modulare Trennung → CSP im Report-Only-Modus verschärfen → CSP real erzwingen.** Gewählt.

## Entscheidung — Die 5 Stufen

### Stufe 1 — Inventarisierung (in dieser Phase abgeschlossen)
- **Ziel:** Vollständiger, zahlenbasierter Überblick über alle Inline-Code-Stellen (siehe Tabelle oben).
- **Betroffene Dateien:** keine Code-Änderung, nur Analyse.
- **Risiko:** keins.
- **Aufwand:** ~1 Stunde (bereits erledigt).
- **Voraussetzungen:** keine.
- **Tests:** keine nötig.
- **Rollback:** entfällt.
- **Abnahmekriterium:** Diese Tabelle liegt vor. ✅ **Erledigt.**

### Stufe 2 — Risikoarme Auslagerung (statische Inline-Scripts, `addEventListener` statt `onclick=`)
- **Ziel:** Die 61 Inline-`<script>`-Blöcke bleiben inhaltlich unverändert, werden aber Modul für Modul in externe `<script src="modules/*.js" defer>`-Dateien verschoben (deckt sich mit ADR-0005-Stufen 1-7). Parallel: `onclick=`/`onsubmit=`/`onchange=`-Attribute in den am häufigsten geänderten Modulen schrittweise durch `addEventListener(...)`-Bindungen im jeweiligen Modul-Code ersetzen (nicht global, Modul für Modul, gemeinsam mit der ADR-0005-Auslagerung dieses Moduls).
- **Betroffene Dateien:** neue `modules/*.js`-Dateien (siehe ADR-0005), `index.html` (jeweils nur der ausgelagerte Bereich).
- **Risiko:** niedrig-mittel, sofern Modul für Modul vorgegangen wird (deckt sich mit ADR-0005-Reihenfolge: lose gekoppelte Module zuerst).
- **Aufwand:** groß in Summe, aber in kleine, unabhängige Schritte zerlegbar (ein Modul pro Commit).
- **Voraussetzungen:** ADR-0005 Stufe 1 muss begonnen haben (Auslagerung schafft die Dateigrenzen, in denen `addEventListener` sinnvoll ersetzt werden kann).
- **Tests:** volle E2E-Suite nach jedem Modul, gezielter Klick-/Formular-Test der betroffenen UI-Bereiche mit synthetischen Daten.
- **Rollback:** einzelner Commit-Revert pro Modul.
- **Abnahmekriterium:** Für das jeweils bearbeitete Modul: 0 verbleibende `onclick=`/`onsubmit=`/`onchange=`-Attribute in der ausgelagerten Datei, alle zugehörigen E2E-Tests weiterhin grün. **Noch nicht begonnen — abhängig von Kevins Freigabe für ADR-0005.**

### Stufe 3 — Modulare Trennung (deckt sich mit ADR-0005)
- **Ziel:** Sobald ausreichend Module ausgelagert sind (Stufe 2), auch die verbleibenden `<style>`-Blöcke modulweise in zugehörige `modules/*.css`-Dateien verschieben (inhaltlich unverändert).
- **Betroffene Dateien:** wie ADR-0005.
- **Risiko:** niedrig (reine Verschiebung, keine Stiländerung).
- **Aufwand:** mittel, an ADR-0005-Fortschritt gekoppelt.
- **Voraussetzungen:** ADR-0005 mehrheitlich fortgeschritten.
- **Tests:** visuelle Regression (8-Viewport-Matrix wie in früheren Phasen), volle E2E-Suite.
- **Rollback:** Commit-Revert pro Modul.
- **Abnahmekriterium:** Kein `<style>`-Block mehr in `index.html` für ein ausgelagertes Modul. **Spätere Phase.**

### Stufe 4 — CSP im Report-Only-Modus verschärfen
- **Ziel:** `Content-Security-Policy-Report-Only`-Header (zusätzlich zur bestehenden, weiterhin aktiven `Content-Security-Policy`) mit einer testweise verschärften Policy (ohne `unsafe-inline` für bereits ausgelagerte Bereiche, ggf. mit Nonces für die verbleibenden, noch nicht ausgelagerten Inline-Blöcke) ausliefern. Verstöße werden nur geloggt (Browser-Konsole bzw. optional `report-to`-Endpoint), **nichts wird blockiert**.
- **Betroffene Dateien:** `netlify.toml` (neuer Header) oder `index.html` (zweiter Meta-Tag).
- **Risiko:** sehr niedrig — Report-Only blockiert nichts, kann also nichts an der laufenden App brechen.
- **Aufwand:** klein, sobald Stufe 2-3 ausreichend fortgeschritten sind.
- **Voraussetzungen:** Stufe 2-3 für den überwiegenden Teil der Datei abgeschlossen.
- **Tests:** Konsole auf `report-only`-Verstöße prüfen (Desktop + Mobile, alle Haupttabs, mit synthetischen Daten befüllt), Liste verbleibender Verstöße dokumentieren.
- **Rollback:** Header einfach wieder entfernen, keine Auswirkung auf die echte (weiterhin aktive) CSP.
- **Abnahmekriterium:** Report-Only-Verstoßliste ist leer oder auf bewusst akzeptierte Restfälle reduziert. **Spätere Phase, nach Stufe 2-3.**

### Stufe 5 — Vollständige Absicherung (CSP real erzwingen)
- **Ziel:** `unsafe-inline` aus der echten, blockierenden CSP entfernen (Nonce- oder Hash-basiert für verbleibende, bewusst inline belassene Blöcke), `script-src`/`style-src` getrennt behandeln, SRI-Hashes (siehe Phase E / Blocker B3) für alle verbleibenden externen Skripte ergänzen.
- **Betroffene Dateien:** `index.html` (CSP-Meta-Tag), ggf. `netlify.toml`.
- **Risiko:** niedrig, **vorausgesetzt** Stufe 4 zeigt eine leere/akzeptierte Verstoßliste.
- **Aufwand:** klein (finale Umschaltung), aber nur sinnvoll nach vollständigem Stufe-4-Nachweis.
- **Voraussetzungen:** Stufe 4 erfolgreich abgeschlossen und über einen längeren Beobachtungszeitraum (empfohlen: mehrere reale Nutzungstage) verstoßfrei.
- **Tests:** volle E2E-Suite, volle 8-Viewport-Matrix, expliziter Live-Test aller Haupttabs mit synthetischen Daten, Konsole auf CSP-Blockierungen prüfen.
- **Rollback:** CSP-Meta-Tag auf die vorherige (mit `unsafe-inline`) zurücksetzen — ein einzeiliger Revert.
- **Abnahmekriterium:** `unsafe-inline` nicht mehr in der aktiven CSP, 0 CSP-Konsolenfehler bei vollem Regressionstest. **Langfristiges Ziel, nicht Teil dieser Phase.**

## Begründung

Jede Stufe hat eine eigene, unabhängig überprüfbare Abnahmebedingung und einen trivialen Rollback. Der Report-Only-Zwischenschritt (Stufe 4) stellt sicher, dass die finale Verschärfung (Stufe 5) nie „blind" erfolgt — es gibt immer erst eine Beobachtungsphase ohne Blockierungsrisiko.

## Konsequenzen

**Positiv:** Am Ende eine CSP, die tatsächlich als zweite XSS-Verteidigungslinie wirkt, nicht nur auf dem Papier steht. **Negativ:** Der komplette Weg bis Stufe 5 ist ein mehrphasiges, über Monate laufendes Vorhaben, gekoppelt an den Fortschritt von ADR-0005 — kein schnelles Ergebnis, aber genau die von Kevin geforderte Risikoarmut.

## Verifikation
Pro Stufe wie oben angegeben; keine Stufe gilt als abgeschlossen ohne vollen E2E-Testlauf (Desktop 1440 + Mobile 390, synthetische Daten, 0 Konsolenfehler).

## Rollback / Superseding
Jede Stufe ist einzeln und unabhängig zurückrollbar (siehe je Stufe oben). Der Plan kann nach jeder Stufe pausiert werden, ohne dass bereits erledigte Stufen zurückgebaut werden müssen — jede Stufe hinterlässt einen für sich funktionsfähigen Zwischenstand.
