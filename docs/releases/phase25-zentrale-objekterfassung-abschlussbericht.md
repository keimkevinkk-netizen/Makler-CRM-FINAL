# Phase 25: Zentrale Objekterfassung — Abschlussbericht

Branch: `claude/zentrale-objekterfassung` (Basis: `main` nach Merge-Commit `938637b`, PR #9).
Auftrag: "VERBINDLICHER MASTER-IMPLEMENTIERUNGSAUFTRAG — ZENTRALE OBJEKTERFASSUNG, EINHEITLICHE OBJEKTDATENBANK UND KLARE SYSTEMLOGIK". Struktur dieses Berichts folgt Kevins Abschnitt 29 (A–V).

## A. Gefundene Formulare/Eingabestellen (Phase 1 Bestandsaufnahme)

Vollständige Matrix, aufbauend auf `docs/adr/ADR-0007-zentrale-objekterfassung-migrationsplan.md` §Bestandsaufnahme und um die dort als "nicht aktiv beschrieben" markierten Keys sowie einen bei der erneuten Prüfung zusätzlich gefundenen Fall (`kk_market_observations_v1`) ergänzt:

| # | Formular/Modul | Tab | Storage-Key | Datensatztyp | schreibend/lesend | Ergebnis dieser Phase |
|---|---|---|---|---|---|---|
| 1 | `#kkcrmproObjectForm` (CRM Pro) | CRM → Objekte | `kk_crm_objects` | Bestandsobjekt | schreibend+lesend | **behalten, umgeleitet** auf `KK_OBJECTS.saveCentralObject()` (recordType inventory) |
| 2 | kk12-Legacy-Formular (`#kk12ObjectForm`) | "Heute"-Legacy-Workspace (Pipeline-Anker) | `kk12_objects` | Bestandsobjekt | schreibend+lesend | **umgeleitet**: schreibt nicht mehr eigenständig, sondern über `saveCentralObject()` (sourceForm:'kk12_legacy'); Liste liest gefiltert aus der zentralen DB |
| 3 | `#salesForm` (Verkaufschance) | Pipeline | `kk_sales_pipeline` | Pipeline-Konzept mit eingebetteten Objektfeldern | schreibend+lesend | **unverändert belassen** (kein primärer Objektspeicher, ADR-0007 Stufe 3 – siehe L) |
| 4 | `#valuationForm` (Bewertungstermin) | Pipeline | `kk_valuation_pipeline` | Pipeline-Konzept mit eingebetteten Objektfeldern | schreibend+lesend | **unverändert belassen** (wie #3) |
| 5 | Lead-Formular / `saveLead()` | CRM Pro | `kk_crm_contacts` (+bedingt `kk_crm_owner_pipeline`, `kk_crm_objects`) | Kontakt + optional Objekt | schreibend+lesend | **unverändert belassen** (erzeugt weiterhin bedingt einen `kk_crm_objects`-Eintrag; dieser läuft jetzt implizit durch die Policy als inventory) |
| 6 | `#kkv8MarketEntryForm`/`#kkv8MarketImportForm` (Marktbeobachtung) | Marktmonitor | war `kk_market_monitor_entries_v1` | Marktbeobachtung | schreibend+lesend | **umgeleitet** auf `saveCentralObject()` (recordType market); Legacy-Key wird nicht mehr beschrieben, bleibt als eingefrorener historischer Stand |
| 7 | **neu: `#kkv8ResearchEntryForm`** (Datensammlung) | Marktmonitor | — | Vergleichs-/Recherchedaten | schreibend+lesend | **neu gebaut**, schreibt direkt zentral (recordType research) |
| 8 | **neu: "Objekt erfassen"-Launcher** (3 Typ-Karten) | CRM → Objekte | — | Router, kein eigener Speicher | — | **neu gebaut**, öffnet/fokussiert #1, #6 oder #7 |
| 9 | `kk_market_observations_v1` / `KK_MARKET_OBS` ("Marktbeobachtungen"-Analysemodul, Phasen 43–45 einer früheren Session) | Marktmonitor (`#kk-market-observations`) | `kk_market_observations_v1` | Fremdangebote/Vergleichsobjekte mit Kategorie (foreign_listing/historic_listing/known_sale/transaction_price/manual_comparison/other) | schreibend+lesend | **bewusst nicht angefasst** – siehe L für Begründung |
| 10 | `kk_offer_monitor_entries_v1` / `kk_angebot_monitor_entries_v1` | — | — | kein aktives Formular gefunden | nur Registry-/Präfix-Listen | **bestätigt: totes/reserviertes Erbe**, nicht migriert |
| 11 | `kk_market_analysis_v1`, `kk_region_market_cockpit_v10`, `kk_mkk_market_reference_v29_4` | Marktmonitor (Orts-Cockpit) | dieselben | aggregierte Ortsdaten, keine Einzelobjekte | lesend (teils schreibend über `saveMarketReference`) | **nicht migriert** (kein Objektschema) |

Diese Tabelle ist die geforderte "Bestandsaufnahme vor Implementierung" – sie wurde nicht als eigenständiges Zwischendokument abgeliefert (Kevins ausdrückliche Vorgabe: "Liefere nicht erneut nur ein Konzept"), sondern direkt als Grundlage für B–V verwendet.

## B. Entfernte Formulare

Keines der 6 real aktiven Formulare wurde vollständig entfernt (Datenverlustrisiko, gegen CLAUDE.md "keine Löschung bestehender Daten"). Stattdessen wurden Formular #1, #2 und #6 **umgeleitet** (schreiben nicht mehr eigenständig) und Formular #8 (Launcher) neu als gemeinsamer Einstieg ergänzt.

## C. Umgeleitete Buttons/Formulare

- `#kkcrmproObjectForm` → `KK_OBJECTS.saveCentralObject()` (Phase 5)
- `#kk12ObjectForm` → `KK_OBJECTS.saveCentralObject()` (Phase 5)
- `#kkv8MarketEntryForm`/`#kkv8MarketImportForm` → `KK_OBJECTS.saveCentralObject()` (Phase 7)
- Neue "Objekt erfassen"-Karten → routen zu #1/#6/#7 mit Tab-Wechsel + Fokus (Phase 4)
- Marktbeobachtungs-Popup "Übernehmen" → `KK_OBJECTS.changeRecordType()` statt Kopie in `kk_crm_objects` (Phase 7)

## D. Zentrale Datenquelle

`kk_crm_objects` (bestehender Key, additiv erweitert – **kein neuer Storage-Key eingeführt**, wie von Kevin bevorzugt). Zugriff ausschließlich über `window.KK_OBJECTS`.

## E. Zentrales Datenmodell

Additive Erweiterung um `recordType` (`inventory`/`market`/`research`), `schemaVersion`, `typeHistory[]`, `migration{legacySourceKey,legacyId,migratedAt,migrationVersion}`. Bestehende flache Felder (`address`, `ownerName`, `objectType`, `marketValue`, `status`, `nextStep`, `geo`, `addr` …) bleiben unverändert erhalten – keine der ~15 bestehenden Renderer/Reader-Stellen musste ihr Feldschema ändern. Die von Kevin vorgeschlagenen tief verschachtelten Namensräume (`inventory.*`, `market.*`, `research.*`) wurden **nicht** 1:1 übernommen, um keine Doppelpflege von Daten zu erzeugen, die in bestehenden flachen Feldern bereits vorhanden sind – stattdessen tragen bestehende flache Felder die Bedeutung, `recordType`/`typeHistory`/`migration` sind die neuen strukturierten Zusätze.

## F. recordType-Regeln (Policy)

`window.KK_OBJECTS.getObjectPolicy(recordType)` – einzige Implementierung, exakt wie von Kevin spezifiziert (`showOnMap`, `showInPipeline`, `allowTasks`, `allowFollowUps`, `countAsActiveObject`, `allowOwnerLink`, `useForMarketAnalytics`, `useForComparison`). Fehlender `recordType` → `inventory` (Altbestand); expliziter unbekannter Wert → abgelehnt (kein stiller Fallback). Von Karte, Pipeline-Objektliste, Marktmonitor, Datensammlung, KPI-Dashboard und Datenqualitäts-Sentinel gemeinsam genutzt.

## G. Kartenpolicy

`window.KK_OBJECTS.mayAppearOnMap(record)` – harte Regel, kategorisch für market/research, unabhängig von vorhandenen Koordinaten. Die in PR #9 hinzugefügte Ebene `market_observations` wurde **vollständig aus `LAYER_DEFS` entfernt** (kein Toggle, kein versteckter Layer). Die Ebene "Objekte" filtert jetzt über die Policy. Verifiziert in `test-map-fixes.js` und `test-central-objects-migration.js` (Test F: 3 Datensätze mit gültigen Koordinaten, exakt 1 Marker).

## H. Pipelinepolicy

`window.KK_OBJECTS.mayAppearInPipeline(record)`. CRM Pro `renderObjects()` (die operative Objektliste) filtert jetzt über `showInPipeline`. `renderKpis()` und der Datenqualitäts-Sentinel zählen nur `countAsActiveObject`-Datensätze als aktives Objekt.

## I. Marktmonitor-Umstellung

`marketEntries()`/`addMarketEntry()`/`updateMarketEntry()` lesen/schreiben seit Phase 7 die zentrale Quelle gefiltert `recordType=market`. Feldform (town/platform/type/price/sqm/link/status/object/addr/geo) unverändert, daher blieben alle bestehenden Render-Funktionen (Buckets nach Arbeitslogik) unverändert kompatibel.

## J. Research-Umstellung

Neue, schlanke "Datensammlung"-Sektion im Marktmonitor-Tab (`#kkv8ResearchEntryForm`/`#kkv8ResearchList`), liest/schreibt ausschließlich `recordType=research` aus der zentralen Quelle. Kein eigener Speicher.

## K. Migrierte Keys

- `kk_crm_objects` (Altbestand ohne `recordType`) → explizit `inventory` getaggt
- `kk12_objects` → `inventory` (Original bleibt erhalten, `migratedToCentral`+`centralObjectId` verhindert Doppelzählung)
- `kk_market_monitor_entries_v1` → `market` (Original bleibt als eingefrorener historischer Stand)

Migration ist idempotent (Dedup über `migration.legacySourceKey`+`legacyId`), läuft automatisch beim Laden (`KK_BOOT` priority 7, wie das bestehende `geo-migration-v1`-Vorbild), Backup wird vor jedem Lauf geschrieben (`kk_object_migration_v1_backup`, `kk_`-Präfix → vom bestehenden automatischen Backup miterfasst).

## L. Nicht migrierte Keys (mit Begründung)

- `kk_market_analysis_v1`, `kk_region_market_cockpit_v10`, `kk_mkk_market_reference_v29_4` – aggregierte Ortsdaten (Preisreferenz je Ort), kein Einzelobjekt-Schema. Migration als Einzelobjekte wäre fachlich falsch (Kevin Abschnitt 18 verlangt explizit diese Unterscheidung).
- `kk_offer_monitor_entries_v1`, `kk_angebot_monitor_entries_v1` – kein aktives Formular gefunden (nur Registry-Referenzen), vermutlich totes/reserviertes Erbe aus einer früheren Planungsphase.
- `kk_sales_pipeline`, `kk_crm_owner_pipeline`, `kk_valuation_pipeline` – eigenständige Pipeline-Konzepte (Verkaufschance/Bewertungstermin/Eigentümer-Pipeline) mit eingebetteten, aber nicht eigenständigen Objektfeldern. Eine Vollauflösung in eigene Objektdatensätze hätte das Pipeline-Datenmodell selbst verändert (nicht Auftragsgegenstand) und war in der ADR-0007-Bestandsaufnahme bereits als "Stufe 3, optionales `objectId`-Referenzfeld statt Vollauflösung" vorgesehen – dieser optionale Schritt wurde in dieser Phase nicht zusätzlich umgesetzt, da er kein hartes Kevin-Kriterium berührt (keiner dieser drei Keys erscheint auf der Karte oder wird als "primäre Objektdatenbank" behandelt).
- `kk_market_observations_v1` (`KK_MARKET_OBS`) – ein in einer früheren Session gebautes, aktiv genutztes Analysemodul für Vergleichsobjekte/Fremdangebote mit eigenem Kategorie-Feld, das bereits **alle harten Regeln erfüllt**: kein Kartenlayer (per Code-Kommentar im Quelltext explizit dokumentiert), keine Pipeline-Zugehörigkeit, nur Hintergrundanalyse (speist die Marktwertindikations-Engine, Zeile ~17700). Eine Vollmigration dieses Moduls in `kk_crm_objects` hätte die produktiv genutzte `computeStats()`-Preisberechnung (Median/gewichtet/Ausreißer-Bereinigung) und ihre Integration in Dashboard/Objekt-Detail/Marktanalyse (Phase 51/52 einer früheren Session) angefasst – ein hohes Regressionsrisiko für vergleichsweise geringen Nutzen, da das Modul bereits konform ist. Bewusst als dokumentierte Ausnahme belassen statt in dieser Phase risikoreich verschmolzen.

## M. Dublettenlogik

`window.KK_OBJECTS.findDuplicates(record)` prüft Adresse/URL/externe ID/`legacySourceKey`+`legacyId`. In der CRM-Pro-Objektmaske (`saveObject()`) vor dem Speichern aufgerufen; bei Treffer sichtbare, nicht blockierende Warnung. Kein automatisches Löschen/Zusammenführen.

## N. Typumwandlung

`window.KK_OBJECTS.changeRecordType(id, newType, reason)` protokolliert `typeHistory.push({from,to,changedAt,reason})`. UI-Anbindung: `adoptMarketObservation()` (Karten-Popup "Übernehmen") nutzt dies für market/research → inventory. Weitere Richtungen (inventory→research etc.) sind über die API funktional vollständig (in `test-central-objects-migration.js` Test A/F indirekt mitgeprüft), haben aber noch keine dedizierte UI-Schaltfläche außerhalb des Marktbeobachtungs-Popups – siehe V.

## O. Backup

`kk_object_migration_v1_backup` wird vor jeder Migration geschrieben (`kk_`-Präfix, vom bestehenden automatischen Backup-Mechanismus erfasst). Kein manueller Klick nötig.

## P. Rollback

`window.KK_OBJECTS.rollbackMigration()` stellt die drei betroffenen Keys aus dem Backup wieder her und setzt das Completed-Flag zurück (Migration läuft beim nächsten Laden erneut). Reiner Notfallpfad, keine dauerhafte Parallelarchitektur (Kevin Abschnitt 23).

## Q. Tests

Neu: `tests/e2e/test-central-objects-migration.js` (24/24 – Kevins Testmatrix A/F/H). Aktualisiert: `test-map-fixes.js` (15/15), `test-market-geocode-order.js` (6/6). Vollständige Regression grün: `verify.js`, `test-official-gis.js` (40/40), `test-repository-layer.js` (11/11), `test-a11y-focus-restore.js` (6/6), `test-datasource-registry.js` (7/7), `test-chart-canvas-reuse.js` (3/3), `test-data-quality-sentinel.js` (6/6), `test-masterprompt-p0..p3.js` (15/11/8/7), `npm run test:functions` (18/18).

## R. CI

`test-central-objects-migration.js` als neuer Schritt in `.github/workflows/ci.yml` ergänzt. `npm run lint` (0 Fehler, 4 vorbestehende Warnungen) und `npm audit --audit-level=high` (0 Schwachstellen) lokal verifiziert.

## S. Mobile

390px-Sichtprüfung des neuen "Objekt erfassen"-Launchers: kein horizontaler Overflow, 3 Karten gestapelt, Touch-Ziel-Höhe >107px (deutlich über dem 44px-Minimum). Bestehende Mobile-Regression (`verify.js`, alle Haupttabs 375–390px) grün.

## T. Desktop

1440px-Sichtprüfung: 3 Karten nebeneinander. Bestehende Desktop-Regression (`verify.js`, 1440px) grün.

## U. PR-Link

Wird nach dem Push dieser Branch erstellt (siehe Abschlussmeldung) – **nicht gemergt**, wie von Kevin ausdrücklich verlangt.

## V. Verbleibende manuelle Prüfung / bewusste Scope-Grenzen

1. **Kein einzelnes Mega-Formular**: die 3 Objekttypen werden über 3 weiterhin separate, aber alle auf die zentrale API umgestellte Formulare erfasst (geroutet über den neuen Launcher), nicht über eine einzige, dynamisch umschaltende Formularlogik mit allen in Kevins Abschnitt 10 gelisteten Feldern je Typ. Begründung: drei production-gehärtete Formulare in einem Schritt zu verschmelzen hätte ein hohes Regressions-/Datenverlustrisiko bedeutet (ADR-0007-Präzedenzfall). Die Kernanforderungen (eine Datenbank, eine Policy, ein Speicherpfad, ein sichtbarer Einstieg) sind erfüllt; die Formular-*UI*-Vereinheitlichung ist die größte verbleibende Lücke zum wörtlichen Wortlaut von Abschnitt 9–10.
2. **`#salesForm`/`#valuationForm`** haben noch kein optionales `objectId`-Referenzfeld zu `kk_crm_objects` (ADR-0007 Stufe 3, nicht in dieser Phase umgesetzt, da kein hartes Kevin-Kriterium betroffen ist).
3. **`kk_market_observations_v1`/`KK_MARKET_OBS`** bleibt bewusst als dokumentierte Ausnahme bestehen (siehe L) – eine spätere, eigenständig getestete Konsolidierungsphase wäre nötig, falls Kevin eine physische Zusammenführung wünscht.
4. **Typumwandlung** hat UI-Anbindung nur für market/research→inventory (Marktbeobachtungs-Popup); die übrigen in Kevin Abschnitt 17 gelisteten Richtungen sind API-seitig fertig, aber ohne eigene Schaltfläche.
5. Migration wurde mit synthetischen Testdaten (Playwright, `addInitScript`) verifiziert, nicht mit einem Export/Re-Import-Test der echten Produktionsdaten Kevins (kein Zugriff auf reale Nutzerdaten in dieser Umgebung) – vor einem echten Produktions-Deploy empfiehlt sich ein manueller Export→Migration→Re-Import-Test mit einem echten Backup.
