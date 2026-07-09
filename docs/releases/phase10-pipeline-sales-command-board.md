# Phasenbericht: V31 Phase 10 — Pipeline als Sales Command Board

## Ziel und Ergebnis
Audit von Punkt 14 der Korrekturanweisung ("Pipeline als echtes Sales Command Board") gegen PRD Teil 2 §12. Das bestehende Kanban-Board (`#verkaufsauftrags-pipeline`, `kk-pi-board`/`kk-pi-card`) war strukturell bereits vorhanden und deckte die meisten Pflichtfelder ab (Kontakt, Objekt, Phase-Spalte, Wert, Wahrscheinlichkeit, nächste Aktion, Deadline, letzte Aktivität, „Bearbeiten" als Öffnen-Aktion). Der Audit gegen die PRD-Risikotyp-Tabelle (§12) deckte jedoch einen echten, folgenreichen Bug im Risiko-System auf, der behoben wurde.

## Befund: Risiko-Badge war praktisch eingefroren statt live — echter Bug, behoben
Das Bearbeiten-Formular setzte beim Speichern **immer** einen konkreten Risikowert (`#salesRisk`-Select mit Default „niedrig", ohne leere Option). Dadurch griff die eigentliche Live-Berechnung `deriveRisk()` in der Praxis fast nie: `item.risk=item.risk||deriveRisk(item)` fand `item.risk` durch das Formular-Default immer bereits gesetzt vor, und beim Lesen (`normalizedSale()`) griff derselbe Fallback-Mechanismus erneut nur auf den gespeicherten (eingefrorenen) Wert zu.

**Konkrete Auswirkung:** Ein Deal, dessen Deadline längst überschritten war oder der wochenlang ohne Aktivität stagnierte, blieb auf der Karte dauerhaft „niedrig" (grün) — bis jemand von Hand nachbesserte. Das widerspricht der PRD-Risikotyp-Tabelle direkt: „Überfällig → roter Status + Datum" und „Keine Aktivität → Zeitraum und Richtwert nennen" setzen eine **live** neu berechnete Einstufung voraus, keine statische Momentaufnahme vom letzten Bearbeiten-Zeitpunkt.

**Zusätzlich gefunden:** Zwei unterschiedliche Richtwerte für „keine Aktivität" im selben Modul — `deriveRisk()` nutzte 21 Tage, die Engpass-Erkennung (`buildPipelineIssues`) nutzte 14 Tage. Ein Deal konnte dadurch gleichzeitig im Engpass-Bericht als „länger 14 Tage unbewegt" auftauchen und auf der Karte trotzdem grün („niedrig") erscheinen.

### Fix
1. **Automatisch ist jetzt der Normalfall.** `#salesRisk` hat eine neue Option „Automatisch (empfohlen)" (Wert `""`) als Default. Ohne explizite Auswahl bleibt `manualRisk=false`, und `normalizedSale()` berechnet das Risiko bei **jedem Rendern** frisch über `deriveRisk(x)` — reagiert also sofort auf verstrichene Fristen oder ausbleibende Aktivität, ohne dass jemand den Datensatz erneut speichern muss.
2. **Manuelles Risiko ist jetzt die bewusste Ausnahme** und wird als PRD-Risikotyp „Manuelles Risiko" sichtbar markiert: Badge zeigt zusätzlich „· manuell", Tooltip „Manuell gesetztes Risiko."
3. **Einheitlicher Richtwert:** `STALE_ACTIVITY_DAYS=14` als einzige Quelle, in `deriveRisk()` und der bestehenden Engpass-Erkennung konsistent verwendet.
4. **Transparente Ursache sichtbar statt nur Farbe** (PRD: „Risikohinweis: nur mit transparenter Ursache"): neue Funktion `riskCause(x)` liefert einen lesbaren Grund („Nächste Aktion überfällig seit 5 Tagen.", „Keine Aktivität seit 20 Tagen (Richtwert 14).", …), angezeigt als Tooltip auf dem Risiko-Badge und als zusätzliche Zeile auf der Karte.
5. **Bearbeiten-Formular respektiert den Modus beim erneuten Öffnen:** Wird ein automatisch eingestufter Deal zum Bearbeiten geöffnet, zeigt das Risiko-Feld weiterhin „Automatisch" (nicht den zuletzt berechneten Wert) — sonst hätte allein das Öffnen des Formulars den Datensatz unbeabsichtigt dauerhaft auf „manuell" umgestellt.

## Zusatzbefund: PRD 12.1 „Phase mit … nachvollziehbarer Historie" fehlte — ergänzt
Phasenwechsel wurden bisher nirgends protokolliert. Neues Feld `stageHistory` (max. 20 Einträge, `{from, to, date}`) wird beim Speichern automatisch ergänzt, wenn sich die Pipeline-Stufe ändert. Der letzte Wechsel erscheint als zusätzliche Zeile auf der Karte („Phasenwechsel: Kontakt erkannt → Bedarf geklärt am 09.07.2026"). Keine automatische, versteckte Phasenänderung — die Historie entsteht ausschließlich durch eine bewusste Nutzeraktion im Formular (PRD: „Keine versteckte automatische Phasenänderung").

## Geänderte Dateien
- `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html`:
  - `deriveRisk()`: einheitlicher `STALE_ACTIVITY_DAYS`-Richtwert (14 statt 21).
  - Neue Funktion `riskCause(x)` (transparente Ursache, spiegelt dieselben Bedingungen wie `deriveRisk()`).
  - `normalizedSale()`: Risiko wird jetzt bei jedem Lesen live neu berechnet, außer bei explizitem `manualRisk`.
  - `handleSalesForm()`: `manualRisk`-Flag, `stageHistory`-Fortschreibung bei Stufenwechsel, Formular-Reset auf „Automatisch".
  - `bindSalesActions()`: Risiko-Select beim Bearbeiten-Öffnen korrekt auf „Automatisch" bzw. den manuellen Wert gesetzt.
  - `pipelineCard()` und die Tabellenzeile in `renderSales()`: manueller Marker, Risiko-Tooltip mit Ursache, Phasenwechsel-Zeile.
  - `#salesRisk`-Select: neue Option „Automatisch (empfohlen)".
- Keine neuen Storage-Keys. Neue optionale Felder `manualRisk` und `stageHistory` auf bestehenden `kk_sales_pipeline`-Einträgen — bestehende Datensätze ohne diese Felder werden beim nächsten Rendern automatisch mit einem frisch berechneten Risiko versehen (kein Datenverlust, keine Migration nötig).

## Bekannte Grenzen (bewusst nicht verändert)
- Die separate Pipeline-Engpass-Übersicht (`buildPipelineIssues`, bestehende Funktion aus früherer Phase) kennt weiterhin keine eigene Problemkategorie „überfällige Deadline" — dieser Risikotyp ist auf Kartenebene jetzt korrekt und live sichtbar (verifiziert), taucht aber nicht zusätzlich als eigener Eintrag im Engpass-Textblock auf, wenn kein anderer Grund (kein nächster Schritt, keine Deadline, 14+ Tage unbewegt) gleichzeitig zutrifft. Als Folgeverbesserung dokumentiert, kein Blocker für die jetzt korrekte Kartenanzeige.
- Kein separates Pipeline-Detailpanel (Slide-over/Dialog) gebaut — das bestehende Bearbeiten-Formular übernimmt weiterhin diese Rolle, konsistent mit dem Muster im restlichen Modul (Bewertungen, Tippgeber) und um kein zweites Dialogsystem einzuführen (PRD Teil 2 §0.2).

## Verifikation
- Neuer Playwright-Test (`test-phase10-pipeline.js`): überfälliger Deal ohne manuelles Risiko → automatisch „kritisch" mit korrekter Ursache; stagnierender Deal (20 Tage, Richtwert 14) → automatisch „hoch" mit Richtwert-Text; manuell gesetzter Deal → „kritisch · manuell"-Badge, Formular zeigt beim erneuten Öffnen korrekt „kritisch" (nicht „Automatisch"); Stufenwechsel erzeugt sichtbaren Historieneintrag; neuer Deal ohne Risiko-Auswahl bleibt `manualRisk:false` mit leerem gespeicherten Risikofeld (wird beim Lesen live berechnet) — alles bestätigt, keine `pageerror`-Einträge.
- Regressionslauf `test-phase7-remaining.js`: weiterhin grün (inkl. Pipeline-Engpass-Highlight-Deep-Link).
- Volle Regressionssuite (`verify.js`): alle 10 Haupttabs × Desktop 1440/Mobile 390, XSS, Console, Overflow — grün.
- Screenshots Desktop und Mobile: „manuell"-Badge und Risiko-Tooltip sichtbar, kein Umbruch-/Overflow-Problem im Board oder in der Kartenansicht.

## Ergebnis Status
PASS.

## Nächster sinnvoller Schritt
Phase 11: Marktmonitor-UI — Layer-Steuerung, Quellenstatus und Offline-Zustände (PRD Teil 4).
