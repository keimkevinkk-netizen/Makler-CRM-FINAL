# Phasenbericht: V31 Phase 11 — Marktmonitor: Layer, Quellenstatus, Offline-Zustand

## Ziel und Ergebnis
Umsetzung von Punkt 15 der Korrekturanweisung ("Marktmonitor-UI, Layer-Steuerung, Quellenstatus und Offline-Zustände") gegen PRD Teil 4 §27–§32. Audit ergab: Layer-Steuerung (Metrik-Filter, Heatmap/Kontaktdichte-Toggle), Quellenstatus-Zeile und Offline-Erkennung existierten bereits vollständig funktionsfähig auf der echten Leaflet-Basiskarte (`KK_REALMAP`/`KK_MAP`) aus der informellen Phase-A-Vorarbeit. Der Audit deckte jedoch einen echten, gravierenden Verstoß gegen `.claude/rules/market.md` auf: zwei Kartenengines liefen gleichzeitig sichtbar im selben Tab.

## Befund: Zwei Kartenstacks gleichzeitig sichtbar — echter Verstoß, behoben
> Regel (`.claude/rules/market.md`): „Ein MapAdapter (`KK_MAP`), eine primäre Engine. Kein zweiter Kartenstack parallel sichtbar."

Der Marktmonitor-Tab zeigte bisher **zwei vollständige Kartenimplementierungen untereinander**, beide ungefiltert sichtbar:
1. `#mkk-market-map` — die ältere SVG-Formgrafik-Karte (schematische Ortsformen, kein echtes Geo-Rendering).
2. `#kk-realmap-v31` — die echte Leaflet-Basiskarte mit realen OSM-Kacheln und Ortskoordinaten (aus PRD-Phase-A, genau die Karte, die der Auftrag ausdrücklich als Grundlage vorschreibt: „Nutze für die Karte zunächst die bereits vorhandene echte Basiskarte").

Ein Nutzer, der den Marktmonitor öffnete, sah nacheinander zwei komplette, aber inhaltlich leicht unterschiedliche Kartendarstellungen mit eigenen Legenden, eigenen Auswahl-Interaktionen und eigenen Filterleisten — genau das vom PRD verbotene Muster.

### Fix
Die ältere SVG-Karte wurde nach demselben, bereits etablierten Muster aus Phase D (Legacy-Kontaktliste) konsolidiert: eingeklappt in ein `<details class="kk-mkk-legacy-wrap">` mit klarer Beschriftung „Alte Schema-Kartenansicht (Formgrafik, zur Referenz einklappbar)", standardmäßig geschlossen. **Nichts gelöscht** — Gebietsauswahl, Gebietsdetailpanel, Gebietsplan-Verwaltung und Datenqualitäts-Bulk-Tools der SVG-Karte funktionieren unverändert weiter, sobald der Nutzer die Sektion bewusst aufklappt. Die echte Leaflet-Basiskarte ist ab sofort die primär sichtbare, standardmäßig geöffnete Kartenengine im Tab.

Wiederverwendet wurde das bestehende, gemeinsame Styling für „Archiv/Alternative einklappen"-Bausteine (`:is(.kk-heute-legacy-wrap,.kk-crm-legacy-wrap,.kk-mkk-legacy-wrap)`), keine neue CSS-Komponente eingeführt.

### Begleitfund und Fix: Deep-Link zur (jetzt eingeklappten) Sektion
`KK_APP_SHELL.scrollToAnchor()` (zentrale, von allen Tabs geteilte Funktion) rief bisher nur `scrollIntoView()` auf, ohne zu prüfen, ob das Ziel innerhalb eines geschlossenen `<details>` liegt. Ein Deep-Link auf `#mkk-market-map` (z. B. vom Dashboard „Gebiet öffnen") hätte den Nutzer sonst zu einer sichtbar zusammengeklappten Sektion gescrollt, ohne dass die eigentliche Zielansicht zu sehen gewesen wäre. **Fix:** `scrollToAnchor()` öffnet jetzt automatisch ein geschlossenes `<details>`-Vorfahrenelement des Zielankers, bevor gescrollt wird — generisch für alle Tabs, nicht nur den Marktmonitor.

## Audit-Ergebnis zu Layer-Steuerung, Quellenstatus, Offline-Zustand (bereits vorhanden, verifiziert funktionsfähig)
- **Layer-Steuerung:** 9 Kennzahl-Filterchips (`#kkgeo-metric-filters`) plus zwei sich gegenseitig ausschließende Layer-Toggles „Heatmap" / „Kontaktdichte" (`aria-pressed`-Zustand korrekt synchron) — entspricht PRD §32.
- **Quellenstatus:** Zeitstempel-Zeile (`#kkgeo-updated`) zeigt `KK_DATA_CORE.lastUpdate.format('market')` — ehrlicher, datengetriebener Stand statt Fantasiedatum.
- **Offline-Zustand:** `adapter.on('tileError', …)` mit 1,2-Sekunden-Debounce erkennt fehlende Kartenkacheln und zeigt eine klare Banner-Meldung („Kartenkacheln nicht verfügbar. Vermutlich kein Internetzugriff — Orte, Marker und Daten bleiben trotzdem nutzbar."), verschwindet automatisch bei `tilesOk`. In dieser Sandbox-Umgebung (kein Netzwerkzugriff) wurde dieser Zustand real ausgelöst und verifiziert — keine simulierte Annahme.
- **Ehrlichkeitshinweis:** Quellen-/Näherungs-Hinweistext unterhalb der Karte weiterhin korrekt vorhanden (Ortskoordinaten als Näherungswerte gekennzeichnet, Kontaktdichte ohne echte Adressen/Namen) — unverändert aus Phase A, gegengeprüft.

## Geänderte Dateien
- `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html`:
  - `#mkk-market-map`-Sektion in `<details class="kk-mkk-legacy-wrap" id="kkmkk-legacy-wrap">` gewrappt (Zeilen um 3468–3643).
  - Gemeinsame Legacy-Collapse-CSS-Regel um `.kk-mkk-legacy-wrap` erweitert.
  - `scrollToAnchor()` (App-Shell, zentrale Navigationsfunktion): öffnet automatisch ein geschlossenes `<details>`-Vorfahrenelement vor dem Scrollen.
- Keine Storage-Keys, keine Datenmodelle, keine Provider-Verträge geändert. Reine Sichtbarkeits-/Navigationskorrektur.

## Bekannte Grenzen (bewusst nicht verändert)
- Die SVG-Karte bleibt technisch vollständig vorhanden (nicht entfernt), da sie zusätzliche, noch nicht auf die echte Karte migrierte Funktionalität trägt (Gebietsplan-Verwaltung, Datenqualitäts-Bulk-Werkzeuge, Gebietsdetailpanel). Eine vollständige Migration dieser Funktionen auf die Leaflet-Karte wäre ein eigener, größerer Architekturschritt (PRD §34 „Gebietsdetailpanel" vollständig auf `KK_REALMAP` heben) und wurde hier bewusst nicht vorgezogen, um keine funktionierende Arbeitsfläche im selben Schritt zu riskieren, in dem die reine Sichtbarkeitsdopplung behoben wird.
- Vergleichsmodus (PRD §35, Zwei-Gebiete-Vergleich), Zeitreihen-Zeitraumsteuerung (§36) und Prognosen (§37) sind laut PRD selbst nur mit einer echten Zeitreihen-/Providerbasis sinnvoll umsetzbar — bleiben zusammen mit dem dokumentierten Marktdatenprovider-Blocker (PRD M7) offen.

## Verifikation
- Neuer Playwright-Test (`test-phase11-market.js`): Legacy-Sektion standardmäßig geschlossen, öffnet sich per Klick auf die Zusammenfassung, SVG-Karte hat erst nach dem Öffnen sichtbare Render-Rects (vorher/nachher `getClientRects().length` 0 bzw. >0) — visuell zusätzlich per Screenshot bestätigt (Desktop 1440 und Mobile 390, kein horizontaler Overflow). Offline-Banner real ausgelöst (Sandbox ohne Netzwerkzugriff). Metrik-Filter wechseln den aktiven Zustand korrekt. Heat-/Dichte-Toggle bleiben gegenseitig exklusiv.
- Separater Deep-Link-Test (`test-phase11-anchor.js`): `KK_APP_SHELL.openAnchor('mkk-market-map')` öffnet die zuvor geschlossene Legacy-Sektion automatisch.
- Regressionsläufe: `test-phase7-remaining.js` weiterhin grün (Pipeline-Highlight, Follow-up-Deep-Link, Kalender, Aufgaben — durch die geänderte `scrollToAnchor()` nicht beeinträchtigt).
- Volle Regressionssuite (`verify.js`): alle 10 Haupttabs × Desktop 1440/Mobile 390, XSS, Console, Overflow — grün.

## Ergebnis Status
PASS.

## Nächster sinnvoller Schritt
Phase 12: Accessibility- und Performance-Pass (PRD Teil 5), danach Phase 13: abschließende visuelle Regressionstests und der finale Gesamtbericht.
