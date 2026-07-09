# Phasenbericht: Phase 15.1–15.5b — Import-Vorschau, CRM-Standardansichten, Markt-Deep-Links

## Auftragskontext
Nach Merge von Phase 14 (PR #2, Merge-Commit `bfc5a69`) wurde eine vollständige, read-only Gap-Analyse aller fünf Master-PRD-Teile gegen den aktuellen `index.html`-Stand durchgeführt (per Agent, siehe `docs/prd/PHASENPLAN.md` Phase 15). Ergebnis: sechs konkrete, nicht blockierte Lücken. Dieser Bericht dokumentiert die ersten fünf umgesetzten Punkte plus einen während der Umsetzung gefundenen echten Folgebug.

## Phase 15.1 — Import-Vorschau statt bloßem `window.confirm()` (Commit `1f81f26`, PRD Teil 3 §29)
Import zeigte bisher nur einen nativen `window.confirm()` mit reiner Datenpunktanzahl. Neuer Vorschau-Dialog (natives `<dialog>`) zeigt Aufschlüsselung nach Datenbereich + Datensatzanzahl, sichtbaren Modus (Zusammenführen/Ersetzen, mit Warnhinweis bei Ersetzen), ignorierte/nicht erlaubte Bereiche namentlich, Fokus-Rückgabe nach Schließen. Zentral in `importBackupFileCentral()` verdrahtet — gilt automatisch für alle sechs bestehenden Import-Einstiegspunkte.

## Phase 15.2 — Benannte CRM-Standardansichten als Filter-Chips (Commit `8a65ccc`, PRD Teil 2 §9.1/§19)
Kontaktliste filterte bisher nur über zwei generische Dropdowns plus einen einzelnen versteckten Dashboard-Drilldown-Zustand. Sechs benannte, einzeln klickbare Chips ergänzt: Offene Leads, Ohne nächste Aktion, Heute kontaktieren, Eigentümer Kerngebiet, Neue Kontakte, Datenqualität — jede nutzt bestehende Erkennungslogik (keine neue Datenquelle). Externer Dashboard-Deep-Link (Phase 7) bleibt kompatibel.

## Phase 15.5 — Pipeline-Deep-Link aus dem Gebietsdetailpanel (Commit `7ea325d`, PRD Teil 4 §34/§43)
Gebietsdetailpanel verlinkte bereits Kontakte/Follow-ups, aber keine Pipeline-Aktion. Neuer Button "Pipeline im Gebiet öffnen" nutzt die bestehende `openCrmWorkspace()`-Brücke.

## Phase 15.5b — Gebietsdetailpanel öffnet sich wieder bei Kartenmarker-Klick (Commit `d953237`, echter Folgefund)
Während der Verifikation von Phase 15.5 aufgefallen: Seit Phase 11 liegt das komplette Gebietsdetailpanel (inkl. aller operativen Aktionen) innerhalb eines `<details>`-Elements, das beim Konsolidieren der zwei Kartenengines eingeklappt wurde. `chooseTown()` — ausgelöst sowohl vom Dropdown als auch von jedem Marker-Klick auf der jetzt primären Leaflet-Karte — aktualisierte die Daten, öffnete aber nie den umschließenden `<details>`-Container. Ein Klick auf einen Kartenmarker auf der tatsächlich sichtbaren primären Karte änderte das Panel unsichtbar; für den Nutzer passierte scheinbar nichts, und die neue Pipeline-Aktion war darüber praktisch unerreichbar. Fix: `chooseTown()` öffnet das `<details>`-Element jetzt automatisch bei jeder Gebietsauswahl, unabhängig vom Auslöser.

## Phase 15.4a — Marktmonitor-Präsentationsmodus für Kundengespräche (Commit `5adf9b2`, PRD Teil 4 §42)
Neuer Umschalter blendet Kontakt-/Follow-up-/Pipeline-Aktionen und die Schnellanlage-Zeile aus, schließt eine bereits offene Kontakt-/Follow-up-Liste sofort, zeigt einen sichtbaren Statusbanner, Zustand persistiert über `kk_market_presentation_mode`. Marktwerte, Metriken und aggregierte (namenlose) Gebietssignale bleiben sichtbar.

## Phase 15.4b — Barrierefreie Tabellenalternative zur Karte (Commit `31e8fce`, PRD Teil 4 §46)
Die primäre Leaflet-Karte (`kk-realmap-v31`) bot bisher keine non-visuelle Entsprechung — nur ein `role="img"` auf dem Kartencontainer. Neue Tabelle (`#kkgeo-table`) direkt unterhalb der Karte, immer im DOM vorhanden (kein Toggle, kein `<details>`, kein `[hidden]`), listet alle 12 Gebiete mit Name, aktuell gewählter Kennzahl (synchron zu den bestehenden Kennzahl-Filtern) und Status. Ortsname ist ein Button, der dieselbe `selectTown()`-Brücke wie ein Kartenmarker-Klick nutzt — inklusive des Phase-15.5b-Fixes. Rendert unabhängig vom Ladezustand der Kartenkacheln (funktioniert auch offline).

## Finale Testabdeckung
Jede Teilphase: dedizierter Playwright-Test mit realen synthetischen Daten plus volle Regressionssuite (10 Haupttabs × Desktop 1440/Mobile 390, XSS-Regression, Console/Pageerror, horizontaler Overflow) — durchgehend grün.

## Daten und Migrationen
Keine bestehenden `kk_*`-Keys umbenannt, gelöscht oder umgedeutet. Neuer Key `kk_market_presentation_mode` (folgt der Backup-Konvention). Kein neuer `uid()`-Präfix nötig (keine neuen Entitäten).

## Phase 15.3 — Tippgeber-Modul-Konsolidierung (Commit `3d630a1`, PRD Teil 2 §14)
Echter Befund (vorab per Read-only-Agent recherchiert): Der Tippgeber-Tab zeigte vier separate, gleichzeitig sichtbare Module übereinander — eine Ops-Pipeline-Zusammenfassung, die "Empfehlungsmaschine V20", ein ~2000 Zeilen langes statisches Branchen-Skript-Kapitel und ein bereits im eigenen Quellcode-Kommentar als "legacy" bezeichnetes altes Tippgeber-Betriebssystem, mit drei separaten Formularen und Listen. Direkter Verstoß gegen PRD §14 ("darf nicht wie ein zweites CRM wirken", Skripte "nicht dauerhaft dominant").

Die "Empfehlungsmaschine V20" (bereits ohne Personen-Scoring, bereits ein Migrations-Layer über alle anderen Speicher) zur primären Ansicht ausgebaut: fünf PRD-benannte Standardansichten (Pflege fällig, Neue Partner, Aktive Empfehlungen, Letzte Kontakte, Netzwerk nach Ort/Branche) plus die bestehende "Vernachlässigte Kontakte" als Zusatzansicht; neuer Partner-Detaildialog (natives `<dialog>`, Phase-8-Muster) mit Partnerstatus/letztem/nächstem Kontakt/nächstem Pflegeschritt/Empfehlungshistorie/Notizen. Die drei redundanten Module in zwei `<details class="kk-tippgeber-legacy-wrap">` eingeklappt (Phase-D/11-Muster) — nichts entfernt, Legacy-Daten fließen weiterhin über die bestehende Migration ein.

Echter Bug gefunden und behoben: "Heute kontaktiert" im Detaildialog löst einen Neu-Render der Liste aus, der das ursprüngliche Fokus-Rückgabe-Ziel aus dem DOM entfernt — Fallback-Kette ergänzt (analog Phase 14.4).

## Phase 15.6 — Monitor-/TV-Modus (Commit `6e35053`, PRD Teil 2 §31.2)
Der bestehende "Fokusmodus" (`kk11-focus-mode`) war bereits als reines Seiten-Ausblend-Feature identifiziert, kein echter Kiosk-Monitor. Neuer "Monitor-Modus"-Button im Heute-Dashboard öffnet ein natives, vollflächiges `<dialog>` mit fünf großformatigen Kacheln (Anrufe heute + Tagesziel, Follow-ups fällig, überfällige Anrufe, offene Aufgaben, Termine heute + nur Uhrzeit des nächsten Termins). Alle Werte reine Zählwerte aus bereits vorhandenen Aggregationsfunktionen — bewusst keine Namen/Telefonnummern/Objektadressen, auch nicht für den nächsten Termin. Aktualisiert alle 45 Sekunden per stillem Text-Update.

## Ergebnis Status
PASS für alle acht in der Phase-15-Gap-Analyse identifizierten, nicht blockierten Punkte (15.1, 15.2, 15.3, 15.4a, 15.4b, 15.5, 15.5b, 15.6). Jede Teilphase einzeln getestet (dedizierter Playwright-Test mit realen synthetischen Daten) und gegen die volle Regressionssuite plus 6-Viewport-Matrix verifiziert. Die drei dokumentierten externen Blocker (Zugriffsschutz, amtliche Gemeindegeometrie, echter Marktdatenprovider) bleiben unverändert offen und erfordern eine Entscheidung bzw. einen Zugang außerhalb dieser Sitzung.
