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

## Finale Testabdeckung
Jede Teilphase: dedizierter Playwright-Test mit realen synthetischen Daten plus volle Regressionssuite (10 Haupttabs × Desktop 1440/Mobile 390, XSS-Regression, Console/Pageerror, horizontaler Overflow) — durchgehend grün.

## Daten und Migrationen
Keine bestehenden `kk_*`-Keys umbenannt, gelöscht oder umgedeutet. Neuer Key `kk_market_presentation_mode` (folgt der Backup-Konvention). Kein neuer `uid()`-Präfix nötig (keine neuen Entitäten).

## Verbleibend aus der Phase-15-Gap-Analyse
- **15.3 — Tippgeber-Modul-Konsolidierung** (Teil 2 §14): größere strukturelle Überarbeitung, noch offen.
- **15.4b — Barrierefreie Tabellenalternative zur Karte** (Teil 4 §46): noch offen.
- **15.6 — Monitor-/TV-Modus** (Teil 2 §31.2): niedrige Priorität, noch offen.

## Ergebnis Status
PASS für die fünf umgesetzten Punkte. Arbeit an den verbleibenden drei Punkten wird fortgesetzt.
