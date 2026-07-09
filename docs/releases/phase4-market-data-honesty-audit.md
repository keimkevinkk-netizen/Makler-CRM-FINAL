# Phasenbericht: V31 Phase 4 — Marktdaten-Ehrlichkeitsaudit

## Ziel und Ergebnis
Audit gegen PRD Teil 4 §15 ("Jeder Marktwert besitzt Quelle, Zeitraum, Abrufzeitpunkt, Qualität") und Teil 1 §15 ("Das Produkt darf bei fehlenden Daten nicht so tun, als wären Werte vorhanden"). Ergebnis: zwei reale Befunde, beide behoben. Die neue Kartenplattform aus Phase A (`KK_MARKET`, `KK_DATA_CORE`) war bereits strukturell konform (jede Provider-Zeile trägt `asOf`+`source`; leere Werte rendern als „–", nicht als erfundene Zahl).

## Audit-Befund 1: Quelle/Aktualität nur im Editor sichtbar, nicht in der normalen Detailansicht — behoben
`renderDetail()` in der MKK-Karte zeigte die Marktquelle (`d.marketSource`) bereits in der Kopfzeile, aber das Aktualisierungsdatum (`d.marketUpdatedAt`) nur im separaten Bearbeiten-Formular (`marketEditorHtml`), das die meisten Nutzer nie öffnen. Beim normalen Betrachten eines Gebiets war also unsichtbar, wie alt die manuell gepflegten Werte sind.
**Fix:** Kopfzeile zeigt jetzt zusätzlich `· Aktualisiert: <Datum oder "noch nicht gepflegt">`.

## Audit-Befund 2: Fehlende Marktdaten wurden konfidenz-grün eingefärbt — behoben (echter Ehrlichkeits-Bug)
In `metricsHtml()` waren die Kacheln „Ø Verkaufspreis" und „Markttrend" **unabhängig davon, ob ein Wert vorhanden war**, mit der Klasse `good` (Grün, `#16a34a`) versehen. Ein Gebiet ganz ohne gepflegte Marktdaten zeigte also einen leeren Wert („–" bzw. „Keine Daten") in derselben vertrauenerweckenden grünen Farbe wie ein Gebiet mit echten, aktuellen Zahlen — visuell nicht unterscheidbar. Das verletzt direkt die PRD-Leitlinie „Keine Scheingenauigkeit" (Teil 1 Anti-Ziele, Teil 4 §29 Anti-Pattern-Katalog "Statische Fantasiepreise als 'aktuell'").
**Fix:** Beide Kacheln erhalten die grüne/orange Statusfarbe nur noch, wenn tatsächlich ein Wert hinterlegt ist; ohne Daten bleibt die Kachel neutral (keine Farbklasse).

## Geänderte Dateien und Verträge
- `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html`:
  - `renderDetail()`: Subline um Aktualisierungsdatum ergänzt.
  - `metricsHtml()`: bedingte Statusklasse für „Ø Verkaufspreis" (`isNumber(d.avgPrice)`) und „Markttrend" (`d.trend!=='Keine Daten'`) statt fest verdrahteter `'good'`-Klasse.
- Keine Storage-Keys, keine Provider-Verträge, keine Datenmodelle geändert.

## Daten / Migrationen
Keine. Reine Anzeigekorrektur bestehender Felder (`d.marketSource`, `d.marketUpdatedAt`, `d.avgPrice`, `d.trend`).

## Verifikation
- `verify.js`: weiterhin grün (10 Tabs × Desktop/Mobile, XSS, Console, Overflow).
- Gezielter Test mit zwei Zuständen für dieselbe Gebietsauswahl:
  - **Ohne manuelle Marktdaten**: Ø Verkaufspreis „–" mit neutraler Klasse (`cls:""`), Markttrend „Keine Daten" mit neutraler Klasse.
  - **Mit manuellen Marktdaten** (4.200 €/m², Trend „steigend", Quelle „Eigene Marktbeobachtung", Stand 01.07.2026): Subline zeigt korrekt „Aktualisiert: 01.07.2026"; beide Kacheln zeigen jetzt korrekt die grüne `good`-Klasse.
- Screenshots Desktop und Mobile: Layout bricht durch die längere Subline nicht (zusätzlicher Zeilenumbruch, kein Overflow), auch im mobilen eingeklappten Zustand nicht.

## Ergebnis Status
PASS.

## Bekannte Grenzen und Risiken
- Es gibt weiterhin keinen expliziten vierstufigen Qualitätsstatus (verified/estimated/stale/veraltet) wie in PRD Teil 4 §23 beschrieben — alle manuell gepflegten Werte sind strukturell eine einzige Quellklasse „manuell". Eine automatische Alters-Warnung (z. B. „älter als 90 Tage") wäre eine sinnvolle Folgephase, wurde hier aber bewusst nicht erfunden, da das PRD keinen konkreten Schwellenwert für manuell gepflegte Referenzdaten vorgibt und ein erfundener Schwellenwert selbst eine Form von Scheingenauigkeit wäre.
- Der echte externe Marktdaten-Provider (PRD M7) bleibt ein dokumentierter Blocker (Kosten-/Lizenzentscheidung) — dieser Audit betraf ausschließlich die Ehrlichkeit der bereits vorhandenen, manuell gepflegten Anzeige.

## Nächster sinnvoller Schritt
Damit sind alle vom Auftrag als nicht-blockiert eingestuften PRD-Phasen (2, 3, 4) abgeschlossen. Verbleibend: die drei dokumentierten externen Blocker (Zugriffsschutz-Entscheidung, BKG-Geometrie, echter Marktdaten-Provider) — siehe Abschlussbericht.
