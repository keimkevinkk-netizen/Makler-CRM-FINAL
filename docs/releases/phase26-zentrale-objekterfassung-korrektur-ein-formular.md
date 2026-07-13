# Phase 26: Korrektur — Echter Ein-Formular-Objekteditor (PR #10)

Reaktion auf Kevins "VERBINDLICHER KORREKTUR- UND FERTIGSTELLUNGSAUFTRAG FÜR PR #10": der bisherige "Objekt erfassen"-Launcher routete zu drei weiterhin separaten Formularen (CRM-Pro-Objektmaske, Marktbeobachtungs-Schnellerfassung, Datensammlung-Schnellerfassung). Das erfüllte die Datenschicht-Anforderungen, aber nicht die verbindliche UX-Anforderung: **genau eine sichtbare, echte Objekt-Eingabemaske**. Dieser Bericht dokumentiert die Korrektur nach Kevins Abschnitt-20-Struktur (A–R).

## A. Welche drei (oder weiteren) Formulare vorher noch existierten

1. CRM-Pro-Objektformular (`#kkcrmproObjectForm`) — inline im CRM-Tab, Bestand
2. Marktbeobachtungs-Schnellerfassung (`#kkv8MarketEntryForm`) + Import-Variante (`#kkv8MarketImportForm`) — im Marktmonitor-Tab
3. Datensammlung-Schnellerfassung (`#kkv8ResearchEntryForm`) — im Marktmonitor-Tab (aus Phase 8 dieser Serie)
4. kk12-Legacy-Objektformular (`#kk12ObjectForm`) — im "Heute"-Legacy-Workspace

Alle vier schrieben zwar bereits über die zentrale API (`saveCentralObject`), aber jedes war ein eigenständiges, dauerhaft im DOM sichtbares `<form>`-Element mit eigenen Feldern.

## B. Welche davon aus der sichtbaren UI entfernt wurden

Alle vier. `#kkv8MarketEntryForm`, `#kkv8MarketImportForm` und `#kkv8ResearchEntryForm` wurden vollständig aus dem DOM entfernt (durch je einen Button ersetzt). `#kk12ObjectForm` wurde von einem `<form>` zu einem einzelnen Button reduziert (keine eigenen Eingabefelder mehr). `#kkcrmproObjectForm` wurde nicht gelöscht, sondern **physisch in den neuen zentralen Dialog verschoben und erweitert** — es ist jetzt selbst der eine verbleibende Objekteditor, nicht mehr eine von mehreren gleichrangigen Masken.

## C. Welche gemeinsame Editor-Komponente jetzt verwendet wird

`#kkCentralObjectEditorDialog` — ein natives `<dialog>`-Element (gleiches Muster wie das bereits bestehende `#kkcrmproContactDetailDialog`/`#kkImportPreviewDialog`), geöffnet über `.showModal()`. Liegt als echter direkter Kindknoten von `<main id="kk-app-shell">` (nicht innerhalb eines Tab-Panels), damit es unabhängig vom aktiven Tab angezeigt werden kann — ein `<dialog>` innerhalb eines `display:none`-Vorfahren lässt sich technisch nicht rendern, selbst wenn `.showModal()` erfolgreich aufgerufen wird.

## D. Welche gemeinsame Formular-ID existiert

`#kkcrmproObjectForm` — dasselbe `<form>`-Element wird für alle drei Typen (inventory/market/research), für Neuanlage, Bearbeitung, Duplikat und Typumwandlung verwendet. Einziger Speichern-Button: `#kkCentralSaveBtn`.

## E. Welche alten Formular-IDs nicht mehr aktiv sind

`#kkv8MarketEntryForm`, `#kkv8MarketImportForm`, `#kkv8ResearchEntryForm` existieren nicht mehr im DOM. `#kk12ObjectForm` als `<form>` existiert nicht mehr (nur noch `#kk12ObjectOpenCentralBtn`). Die alten Funktionen `addMarketEntry()`/`addResearchEntry()` (eigene Neuanlage-Pfade) wurden vollständig entfernt — `updateMarketEntry()` bleibt für die reine Statusumschaltung ("Erledigt/Reaktivieren") in der Liste bestehen, legt aber keine neuen Datensätze mehr an.

## F. Wie die dynamischen Sektionen funktionieren

Der Dialog beginnt mit Schritt 1 (`#kkCentralTypeStep`, 3 große Karten: "In meinem Bestand" / "Auf dem Markt" / "Nur Datensammlung") im Neuanlage-Modus ohne Vorauswahl. Nach Auswahl (oder bei direktem Aufruf mit `recordType`) blendet `selectCentralType(type)` Schritt 1 aus, zeigt `#kkCentralFormBody` und schaltet die drei `<details>`-Sektionen (`#kkCentralSectionInventory`/`#kkCentralSectionMarket`/`#kkCentralSectionResearch`) per `hidden`-Attribut **und** `open`-Property um (ein `<details>` ohne `open` bleibt sonst eingeklappt, selbst wenn `hidden` entfernt wird — echter Bug, der beim ersten Testlauf gefunden und behoben wurde). Ein kompakter Typ-Umschalter (`#kkCentralTypeSwitch`) bleibt im geöffneten Formular sichtbar, damit der Typ auch nachträglich gewechselt werden kann, ohne den Dialog zu verlassen.

## G. Wie Create und Edit denselben Editor nutzen

`openCentralEditor(options)` ist der einzige Öffnungsweg. `{recordType}` → Neuanlage mit vorausgewähltem Typ (Schritt 1 übersprungen). `{}` → Neuanlage mit Schritt 1 sichtbar. `{objectId, mode:'edit'}` → lädt den bestehenden Datensatz über `window.KK_OBJECTS.getObject()`, füllt **alle** Felder (auch die der aktuell nicht sichtbaren Typen, über `populateCentralObjectFields()`) und wählt automatisch die passende Sektion. `{objectId, mode:'duplicate'}` ist vorgesehen (kopiert Werte, leert `id`/`typeHistory`).

## H. Wie alle Einstiegspunkte umgeleitet wurden

- CRM-Tab-Launcher (`#kkCentralOpenBtn`) → `openCentralEditor({})`
- Marktmonitor "Marktbeobachtung erfassen" (`#kkv8MarketOpenCentralBtn`) → `openCentralObjectEditor({recordType:'market'})`
- Marktmonitor "Datensammlung erfassen" (`#kkv8ResearchOpenCentralBtn`) → `openCentralObjectEditor({recordType:'research'})`
- kk12-Legacy "Objekt erfassen" (`#kk12ObjectOpenCentralBtn`) → `openCentralObjectEditor({recordType:'inventory'})`
- "Bearbeiten" in der CRM-Objektliste/-Pipeline-Tabelle (`data-edit-object`) → `editObject(id)` → `openCentralEditor({objectId,mode:'edit'})`
- "Bearbeiten" in der Marktbeobachtungs-/Datensammlung-Liste (`data-kkv8-market-edit`/`data-kkv8-research-edit`, neu ergänzt) → `openCentralObjectEditor({objectId,mode:'edit'})`
- Kartenpopup "Datensatz öffnen" für die Ebene "Objekte" (`openRecordDetail`) → unverändert `editObject(id)` → derselbe Editor

Alle Einstiege öffnen exakt dasselbe DOM-Element, keiner öffnet mehr ein anderes Formular oder wechselt den Tab.

## I. Wie die zentrale Validierung arbeitet

`validateCentralObject(record)` — eine Funktion für alle drei Typen. Gemeinsame Pflicht: Adresse/Bezeichnung. Formatprüfung: Link muss mit `http(s)://` beginnen, falls angegeben. Bewusst **keine** erzwungenen Pflichtfelder für Plattform (market) oder Datenquelle (research) — Kevins eigene Vorgabe ("keine operativen Bestandspflichten erzwingen") und der ursprüngliche Kevin-Anwendungsfall ("nur Ort bekannt ist zulässig") verlangen eine leichtgewichtige Erfassung für diese beiden Typen. Fehler werden direkt am jeweiligen Feld angezeigt (`renderCentralErrors()` hängt `.kkcp-field-error`-Elemente an den betroffenen `.kkcp-field`-Container).

## J. Wie die zentrale Speicherung arbeitet

`saveObject(e)` (der einzige `onsubmit`-Handler von `#kkcrmproObjectForm`): `preventDefault()` → `readCentralObjectForm()` (liest alle Felder unabhängig vom sichtbaren Typ) → `validateCentralObject()` → bei Fehlern: Anzeige, kein Speichern → `findDuplicates()` → bei Treffer und nicht bestätigt: Warnung anzeigen, zweiter Klick auf Speichern speichert trotzdem → `window.KK_OBJECTS.saveCentralObject()` → Erfolg: `renderAll()`, `kk:central-editor-saved`-Event, Dialog schließen, ggf. Geocoding auslösen, Toast anzeigen. Kein Formular schreibt mehr direkt in `localStorage`.

## K. Wie Daten beim Typwechsel erhalten bleiben

`readCentralObjectForm()` liest **alle** Felder aus dem DOM, unabhängig davon, welche `<details>`-Sektion gerade sichtbar ist (verborgene Eingaben bleiben im DOM und werden mitgelesen). Ein Typwechsel während der Bearbeitung löscht daher keine bereits eingegebenen gemeinsamen ODER typspezifischen Werte — sie werden beim Speichern einfach mitgeschrieben, auch wenn die entsprechende Sektion gerade nicht sichtbar ist. Verifiziert in Test D (`test-central-object-editor-single-form.js`).

## L. Welche Tests die Ein-Formular-Anforderung beweisen

Neue Datei `tests/e2e/test-central-object-editor-single-form.js`, 33/33 Prüfungen, exakt nach Kevins Buchstaben-Testliste:
- **A** (6 Prüfungen): alte Formulare nicht mehr im DOM, genau ein `#kkcrmproObjectForm`
- **B** (6 Prüfungen): identischer Dialog/Formular/Speichern-Button für alle drei Typen, nur die passende Sektion sichtbar
- **C** (2 Prüfungen): Typwahl löst keinen Tab-Wechsel aus, kein anderer Dialog öffnet sich
- **D** (1 Prüfung): gemeinsames Feld bleibt bei Typwechsel erhalten
- **E** (3 Prüfungen): dynamische Sektionen je Typ korrekt
- **F** (4 Prüfungen): alle drei Typen laufen über `saveCentralObject()`, kein Legacy-Key wird neu beschrieben
- **G** (3 Prüfungen): Bearbeiten aller drei Typen nutzt denselben Editor mit korrekt geladenen Werten
- **H** (6 Prüfungen): 390px, kein horizontaler Overflow, Speichern-Button erreichbar, für alle drei Typen
- **I** (1 Prüfung): Regression der Kartenpolicy unverändert korrekt
- plus "no page errors"

Zusätzlich aktualisiert: `test-map-fixes.js` (15/15) und `test-market-geocode-order.js` (6/6) — beide nutzen jetzt `window.KK_CRM_PRO.openCentralObjectEditor()` statt der entfernten Einzelformulare.

## M. Ergebnisse Mobile

390×844: alle drei Typen geprüft (Test H) — kein horizontaler Overflow, Speichern-Button sichtbar/erreichbar. Dialog nutzt auf schmalen Viewports die volle Bildschirmfläche (`width:100vw;height:100vh;border-radius:0` unter 620px), Typ-Karten/Aktionsleiste stapeln sich, Aktionsleiste ist `position:sticky;bottom:0` mit `env(safe-area-inset-bottom)`-Padding.

## N. Ergebnisse Desktop

1440×1000: Dialog `min(760px,94vw)` breit, zweispaltige Feldgruppen (`.kkcp-row.two`/`.kkcp-row.four`), Typ-Karten nebeneinander, Speichern/Abbrechen immer erreichbar (sticky). Kein zweites Formular mehr im Hintergrund sichtbar.

## O. CI-Status

Neuer Schritt `test-central-object-editor-single-form.js` in `.github/workflows/ci.yml` ergänzt. Vollständige lokale Regression grün: `verify.js`, `test-map-fixes.js` (15/15), `test-market-geocode-order.js` (6/6), `test-central-objects-migration.js` (24/24), `test-central-object-editor-single-form.js` (33/33), `test-official-gis.js` (40/40), `test-repository-layer.js` (11/11), `test-a11y-focus-restore.js` (6/6), `test-datasource-registry.js` (7/7), `test-chart-canvas-reuse.js` (3/3), `test-data-quality-sentinel.js` (6/6), `test-masterprompt-p0..p3.js` (15/11/8/7), `npm run test:functions` (18/18), `npm run lint` (0 Fehler), `npm audit --audit-level=high` (0 Schwachstellen).

## P. Deploy-Preview-Link

Kein eigenständiger Netlify-Deploy-Preview-Zugriff aus dieser Sandbox verfügbar (bereits in früheren Phasen dokumentierte Einschränkung, siehe ADR-0002/Blocker-Liste). Verifikation erfolgte vollständig über die lokale Playwright-Testsuite (`file://`) und manuelle Klick-Simulationen für alle neuen Einstiegspunkte.

## Q. PR-Status

PR #10 aktualisiert (neue Commits auf demselben Branch `claude/zentrale-objekterfassung`), **nicht gemergt**.

## R. Verbleibende Einschränkungen

1. Zwei während der Umsetzung real gefundene und behobene Bugs sind hier dokumentiert, damit sie nicht als "nie passiert" erscheinen: (a) der Dialog lag zunächst versehentlich noch innerhalb eines Tab-Panels (`#kk-app-panel-backup`) statt als echter `<main>`-Kindknoten und war dadurch von anderen Tabs aus unsichtbar; (b) die CRM-Pro-interne `$()`-Hilfsfunktion war auf `#crm-pro-os` als Suchwurzel beschränkt und fand das verschobene Formular dadurch nicht mehr (Boot-Fehler beim Verdrahten von `onsubmit`). Beide sind behoben und durch die neue Testsuite abgedeckt.
2. `#salesForm`/`#valuationForm` (Verkaufschance/Bewertungstermin) bleiben unverändert eigenständige Pipeline-Formulare ohne Verbindung zum zentralen Objekteditor — das war nie Teil dieses Korrekturauftrags (Kevin Abschnitt 1 nennt explizit "die drei verbliebenen Formulare", nicht diese beiden Pipeline-Konzepte).
3. `kk_market_observations_v1`/`KK_MARKET_OBS` bleibt wie in Phase 25 begründet eine bewusst nicht angefasste, bereits regelkonforme Ausnahme.
4. Live-Valuation-Vorschau (`renderLiveValuation()`) funktioniert weiterhin nur im Bestand-Kontext (unverändert aus der ursprünglichen CRM-Pro-Maske übernommen) — für market/research nicht relevant, da diese keine Marktwertindikation benötigen.
