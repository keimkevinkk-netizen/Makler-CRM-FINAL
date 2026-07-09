# Phasenbericht: V31 Phase 12 — Accessibility- und Performance-Pass

## Ziel und Ergebnis
Umsetzung von Punkt 17 der Korrekturanweisung ("Accessibility- und Performance-Pass") gegen PRD Teil 5 §25–§26. Audit fokussiert auf die in dieser Session neu gebauten Oberflächen (Phase 8 Kontakt-Detaildialog, Phase 9 Follow-up-Aktionen, Phase 10 Pipeline-Karten) sowie bestehende Toast-/Statusmeldungen app-weit. Dabei wurde neben zwei echten Accessibility-Lücken auch ein bis dahin unentdeckter, funktional relevanter Navigations-Bug gefunden und behoben.

## Befund 1: Toast-Meldungen ohne Live-Region — echte Lücke, behoben
PRD §25 verlangt: „Toast/Fehler: Angemessene Live-Region, nicht nur visuell." Alle 5 Toast-Elemente der App (`kkhToast`, `kk12Toast`, `kkcrmproToast`, `kkCrmToast`, `kkFuToast`) hatten weder `role="status"` noch `aria-live` — Bestätigungen wie „Gespeichert", „Wiedervorlage verschoben", „Kontakt gespeichert" wurden Screenreader-Nutzern nie angekündigt. Als Vorbild diente `#kkgeo-offline` (Marktmonitor-Offline-Banner), das bereits korrekt `role="status"` trägt.
**Fix:** Alle 5 Toast-Elemente erhalten `role="status" aria-live="polite"`.

## Befund 2: Fokus kehrte nach Dialog-Schließen nicht zum Auslöser zurück — echte Lücke, behoben
PRD §25 verlangt für Dialoge: „Fokus setzen, Fokus halten, Escape, **Fokus zurückgeben**." Für den neuen Kontakt-Detaildialog (Phase 8) wurde angenommen, natives `<dialog>` würde dies automatisch erledigen — ein direkter Test widerlegte das: Nach Escape landete der Fokus auf `<body>`, nicht auf dem „Details"-Button, der den Dialog geöffnet hatte.
**Fix:** Das zuletzt fokussierte Element wird beim Öffnen gemerkt (`lastDetailTrigger`) und beim nativen `close`-Event (deckt Escape, Schließen-Button und Backdrop-Klick einheitlich ab) per `setTimeout(…,0)` wiederhergestellt — verzögert, weil der Browser unmittelbar nach dem `close`-Event selbst noch einen eigenen (unerwünschten) Fokuswechsel auf `<body>` vornimmt, der sonst die Wiederherstellung überschreiben würde (per Vergleichstest bestätigt).

## Begleitfund: „Offene Leads" und „Kontakt öffnen" zeigten das falsche Panel — echter Funktionsbug, behoben
Beim Testen der Fokus-Wiederherstellung mit einem **echten** Playwright-Klick (statt eines synthetischen JS-`.click()`) schlug die Sichtbarkeitsprüfung fehl: der „Details"-Button war laut Playwright „not visible". Ursache: `showOpenLeads()` (Phase 7) und `openContactByName()` (Phase 9) riefen `showTab('cockpit')` auf — das ist jedoch das unabhängige „Heute"-Überblickspanel, **nicht** das Panel mit der eigentlichen Kontaktliste. Die Kontakttabelle (`#kkcrmproContactRows`) liegt tatsächlich im Panel `data-kkcrmpro-panel="capture"` ("Kontakt / Lead").

**Konkrete Auswirkung:** Ein Klick auf die Dashboard-Kennzahl „Offene Leads" oder auf „Kontakt öffnen" aus den Follow-ups aktivierte bisher das falsche Panel — die gefilterte Kontaktliste blieb unsichtbar. Die Daten waren korrekt (deshalb fiel es den bisherigen, nur DOM-Inhalt-prüfenden Tests nicht auf), aber sichtbar war sie nicht. Ein direkter, aber folgenreicher Bug, der bisher unbemerkt blieb, weil kein Test die tatsächliche Sichtbarkeit statt nur den DOM-Inhalt geprüft hatte.
**Fix:** Beide Aufrufe zeigen jetzt korrekt `showTab('capture')`.

## Verifizierte, bereits vorhandene Accessibility-/Performance-Eigenschaften (kein Fix nötig)
- Dashboard-KPI-Karten (Phase 7) haben bereits korrekte `role="button"`, `tabindex="0"` und einen `keydown`-Handler für Enter/Leertaste — vollständig tastaturbedienbar.
- Globale `@media (prefers-reduced-motion: reduce)`-Regel deaktiviert bereits alle Animationen/Übergänge/`scroll-behavior` app-weit.
- `KK_MAP.create()` (Leaflet-Engine) ist bereits idempotent: über 4 Besuche des Marktmonitor-Tabs mit Zwischenstopps auf anderen Tabs hinweg wurde die Karte nachweislich nur **einmal** initialisiert (kein mehrfacher Map-Aufbau bei Tabwechsel, PRD §26).
- Große Listen sind bereits begrenzt (`CRM Pro`-Kontaktliste `.slice(0,80)`, Follow-up-Liste `.slice(…)`, Pipeline-Board pro Stufe `.slice(0,5)`).

## Geänderte Dateien
- `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html`:
  - 5 Toast-Elemente: `role="status" aria-live="polite"` ergänzt.
  - `crm-pro-os`-Modul: `lastDetailTrigger`-Tracking + `close`-Event-Listener für Fokus-Rückgabe am Kontakt-Detaildialog.
  - `showOpenLeads()` und `openContactByName()`: `showTab('cockpit')` → `showTab('capture')` korrigiert.
- Keine Storage-Keys, keine Datenmodelle geändert.

## Verifikation
- Neue Playwright-Tests (`test-phase12-a11y-real.js`, mit **echten** `locator.click()`-Interaktionen statt synthetischer DOM-Aufrufe, um reale Sichtbarkeits-/Fokusregeln zu erzwingen): Fokus wandert beim Öffnen in den Dialog, Escape schließt ihn und stellt den Fokus korrekt auf dem „Details"-Button wieder her; `showOpenLeads()` zeigt die Kontakttabelle jetzt tatsächlich sichtbar (`offsetParent` vorhanden).
- `test-phase12-perf.js`: Map-Engine-Initialisierung über mehrere Tabwechsel hinweg nachweislich einmalig.
- Regressionsläufe: `test-phase9-followups.js` (Kontakt-öffnen-Pfad) weiterhin grün nach der Panel-Korrektur.
- Volle Regressionssuite (`verify.js`): alle 10 Haupttabs × Desktop 1440/Mobile 390, XSS, Console, Overflow — grün.

## Bekannte Grenzen
- Kein automatisiertes axe-core-artiges Vollaudit (Kontrastverhältnisse, vollständige ARIA-Baumprüfung) durchgeführt — der Fokus lag auf den in dieser Session neu gebauten Interaktionsmustern (Dialog, Toasts, Deep-Links) sowie einer gezielten Stichprobe der bestehenden Performance-Grundsätze. Ein vollständiger WCAG-Kontrastaudit wäre ein sinnvoller, aber eigenständiger nächster Schritt außerhalb des aktuellen Auftragsrahmens.

## Ergebnis Status
PASS.

## Nächster sinnvoller Schritt
Phase 13: abschließende visuelle Regressionstests über alle Phasen hinweg und der finale, umfassende Abschlussbericht — laut Auftrag erst zulässig, wenn alle nicht blockierten Anforderungen tatsächlich umgesetzt sind.
