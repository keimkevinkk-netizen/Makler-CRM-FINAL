# Phase 27 — Sales Execution Core V1: Abschlussbericht

Auftrag: PDF "Keim CRM Pro — Sales Operating System und Implementierungsauftrag" (Teil II, technischer Implementierungsauftrag). Branch: `feat/sales-execution-core-v1` (Basis: `main` nach Merge von PR #10). Vorab-Dokumente: `docs/releases/phase27-sales-execution-core-v1-bestandsaufnahme-plan.md`, `docs/adr/ADR-0008-sales-execution-core-v1.md`.

## 1. Was gebaut wurde

- **`window.KK_SALES_CORE`**: neues Namespace-Modul (`KK_BOOT.register('sales-execution-core', init, {priority:50})`), additiv, kein zweites CRM-/Pipeline-/Follow-up-System.
- **EntityLinks**: Namensauflösung `kk_crm_contacts` → `contactId` mit Ambiguitäts-Queue (`kk_entity_link_queue_v1`) statt Rateverknüpfung.
- **ContactPolicy**: additive `contactPolicy{}` auf `kk_crm_contacts`-Datensätzen, Editor-Dialog `#kkSalesCorePolicyDialog`, erreichbar über neuen "Kontaktfreigabe"-Button auf jeder Kontaktkarte im CRM-Tab.
- **ActionEngine**: deterministische 7-Stufen-Priorisierung über echte Bestandsdaten (`kk_commitments_v1`, `kk_followups`, `kk12_calendar_events`, `kk_sales_pipeline`, `kk_crm_contacts`) — keine Scores, jede Empfehlung mit `whyNow`/`reasonCodes`/`sourceFacts`.
- **Daily Command Center**: neuer Abschnitt `#kkSalesCoreCC` direkt im bestehenden `heute`-Panel (kein neuer Tab), "Heute zählt"-Kacheln + priorisierte Aktionskarten + "Anrufserie starten".
- **Geführter Anrufworkflow**: `#kkSalesCoreCallDialog` mit drei Phasen (Vorbereitung → Gespräch → Nachbereitung), schreibt beim Speichern genau eine neue Aktivität in `kk_crm_activities`, höchstens ein Follow-up (`kk_followups`) und/oder eine neue Zusage (`kk_commitments_v1`), aktualisiert Pipeline nur bei ausdrücklicher Bestätigung.
- **Empfehlungskontrolle**: Ausführen/Zurückstellen/Unpassend, gespeichert getrennt von CRM-Fachdaten in `kk_action_feedback_v1`.
- **Vertriebsereignis-Log**: append-only `kk_sales_events_v1`.

## 2. Datenquellen und kanonische Verantwortlichkeiten

Siehe Bestandsaufnahme-Dokument §4 (Datenquellen-/LocalStorage-Matrix). Kurzfassung: Sales Execution Core liest ausschließlich aus bereits kanonischen Quellen (`kk_crm_contacts`, `kk_followups`, `kk_commitments_v1`, `kk_sales_pipeline`, `kk12_calendar_events`) und schreibt neue Datensätze über dieselben, bereits etablierten Schreibpfade (`KK_UTIL.readJSON`/`writeJSON` auf denselben Keys — verifiziert kollisionsfrei mit dem direkten `KK_STORE.getRaw`/`setRaw`-Zugriff anderer Module, da beide letztlich auf `localStorage` ohne Zwischen-Cache operieren).

## 3. Regeln und Ausschlüsse

Prioritätsreihenfolge V1 (`ActionEngine.compute()`): 1. überfällige Zusage, 2. vereinbarter Rückruf, 3. Termin <24h ohne Vorbereitung, 4. aktive Chance ohne nächsten Schritt, 5. drohende Abkühlung, 6. überfälliger nächster Schritt in der Pipeline, 7. Beziehungspflege. Harter Ausschluss: `contactPolicy.doNotContact=true`, `noContactUntil` in der Zukunft, `phoneAllowed=false` — diese Kontakte erscheinen in **keiner** Empfehlung (verifiziert in Test D).

## 4. Migration

Es findet **keine** rückwirkende Massenmigration bestehender Aktivitäten/Pipeline-Datensätze auf ID-Referenzen statt (bewusste Entscheidung, siehe ADR-0008). Die Ambiguitäts-Queue (`EntityLinks.scan()`) läuft idempotent bei jedem Boot und dedupliziert über `sourceKey+sourceRecordId+freeTextName` — mehrfacher Lauf erzeugt keine Duplikate.

## 5. Rollback

Der gesamte Sales Execution Core ist in einem einzigen `<script id="kk-sales-execution-core-js">`-Block plus den zugehörigen HTML-Blöcken (`#kkSalesCoreCC`, `#kkSalesCoreCallDialog`, `#kkSalesCorePolicyDialog`, "Kontaktfreigabe"-Button) gekapselt. Entfernen dieser Blöcke plus der vier neuen `kk_*`-Keys stellt den Vorzustand vollständig wieder her, ohne bestehende Kontakt-/Aktivitäts-/Pipeline-/Zusagen-Daten zu berühren.

## 6. Bekannte Grenzen (bewusst nicht gelöst in V1)

- **Regeln 3, 5, 7 sind Näherungen**, nicht exakt aus der PDF übernommene Signale (kein strukturiertes "dokumentiertes Verkaufsinteresse mit Zeithorizont"-Feld existiert im Bestand) — sie nutzen die nächstbeste vorhandene Datenlage (Status/Kategorie/Zeitabstand) und sind im Code mit Kommentar zur Herkunft versehen.
- **Kontaktpolitik-Default für Bestandskontakte ohne dokumentierte Freigabe**: bewusst NICHT hart blockierend (sonst würde der bestehende, seit Jahren genutzte manuelle Anruf-Workflow für alle Bestandskontakte sofort funktionsunfähig). Stattdessen sichtbarer Hinweis "Kontaktfreigabe nicht dokumentiert" pro Empfehlung/vor dem Anruf. **Dies ist eine Produktentscheidung, keine Rechtsberatung** — Kevin sollte diese Default-Entscheidung fachlich/rechtlich bestätigen oder korrigieren (siehe Phase 5 des Auftrags: rechtliche Einzelfallentscheidungen wurden bewusst nicht autonom getroffen).
- **"Unpassend"-Ablehnung** speichert aktuell eine feste Standardbegründung statt einer frei eingegebenen Nutzerbegründung (um `prompt()`/`confirm()` im Kernworkflow zu vermeiden, wie ausdrücklich verlangt) — eine kleine Freitext-UI dafür ist ein sinnvoller Folgeschritt, aber kein Blocker für V1.
- **Einwand-Genom, Eigentümer-Intent-Radar, Verkäufertermin-War-Room, Lost-Deal-Blackbox, Regional-Dominance-Engine**: bewusst nicht Teil von Phase 1, siehe PDF-Roadmap Phase 2–5.
- **Performance bei 1.000+ Kontakten**: nicht mit synthetischen Großdatensätzen lastgetestet (kein Blocker, da Engine bereits mit einmaligem Index-Aufbau statt verschachtelter Suchen arbeitet; echter Lasttest wäre ein sinnvoller Folgeschritt).

## 7. Tests

- **Neu**: `tests/e2e/test-sales-execution-core.js` — 32/32 Checks grün. Deckt ab: Determinismus, Regel-Priorisierung, Kontaktpolitik-Ausschluss, ID-Referenzierung, ehrlicher Leerzustand, Command-Center-Integration ohne neuen Tab, vollständiger Telefonworkflow (genau eine Aktivität + höchstens ein Follow-up, Zusage wird aktualisiert statt dupliziert, Empfehlung verschwindet aus der Queue), Zurückstellen mit neuem Datum, Vertriebsereignis-Log, Mobile 390px ohne Overflow, Touch-Ziel ≥44px, Kontaktfreigabe-Dialog additiv und sofort wirksam.
- **Regression**: alle 15 bestehenden E2E-Dateien erneut ausgeführt — 100% grün (`verify.js`, `test-a11y-focus-restore.js` 6/6, `test-datasource-registry.js` 7/7, `test-official-gis.js` 40/40, `test-repository-layer.js` 11/11, `test-chart-canvas-reuse.js` 3/3, `test-data-quality-sentinel.js` 6/6, `test-masterprompt-p0..p3.js` 15/11/8/7, `test-map-fixes.js` 15/15, `test-market-geocode-order.js` 6/6, `test-central-objects-migration.js` 24/24, `test-central-object-editor-single-form.js` 33/33).
- `npm run check:functions` — grün. `npm run lint` — 0 Fehler (4 vorbestehende Warnungen, unverändert). `npm audit --audit-level=high` — 0 Schwachstellen. `npm run test:functions` — 18/18.
- CI-Workflow (`.github/workflows/ci.yml`) um den neuen E2E-Schritt ergänzt.

## 8. Akzeptanzkriterien (PDF §8) — einzeln geprüft

1. Daily Command Center erzeugt aus echten Daten eine priorisierte Aktionsliste — ✅ (Test A/B).
2. Jede Empfehlung zeigt mindestens einen nachvollziehbaren Grund — ✅ (`whyNow`, Test B).
3. Keine Empfehlung basiert auf einem erfundenen/nicht erklärbaren Score — ✅ (kein Score-Feld, Test B).
4. Gesperrte Kontakte/unzulässige Kanäle werden nicht empfohlen — ✅ (Test D).
5. Überfällige Zusagen stehen vor unverbindlichen Neukontakten — ✅ (Regel 1 vor Regel 7, Test B).
6. Empfehlung verweist über IDs auf bestehende Kontakte/Chancen — ✅ soweit auflösbar (Test E); bei Mehrdeutigkeit bewusst kein Rateverweis (siehe §6).
7. Anruf startbar direkt aus dem Daily Command Center — ✅ ("Anrufserie starten"/"Anruf starten" pro Karte).
8. Vor dem Anruf werden Ziel/Grund/Einstieg/minimaler nächster Schritt angezeigt — ✅ (Test H).
9. Nach dem Anruf entsteht genau eine neue Interaktion — ✅ (Test I).
10. Bei vereinbartem nächsten Schritt entsteht genau ein Follow-up/Commitment — ✅ (Test I).
11. Wiederholtes Speichern erzeugt keine Duplikate — ✅ (deterministische Empfehlungs-ID, Feedback-Upsert statt Duplikat).
12. Pipeline wird nur bei expliziter Bestätigung verändert — ✅ (`kksecPipelineConfirmCheck`).
13. Zurückgestellte Empfehlungen benötigen eine Begründung/ein neues Datum — ✅ neues Datum (Test K); Freitext-Begründung ist ein bekannter, dokumentierter Folgeschritt (§6).
14. Erledigte Empfehlungen verschwinden aus der aktiven Queue — ✅ (Test J).
15. Nicht erreichte Person mit zwei Klicks neu terminierbar — ✅ ("Nicht erreicht" + Follow-up-Datum im selben Nachbereitungsschritt).
16. Vollständiger Ablauf funktioniert auf 390px — ✅ (Test M).
17. Alle bestehenden Daten bleiben lesbar/exportierbar — ✅ (rein additive Storage-Erweiterung, keine Migration bestehender Datensätze).
18. Bestehende Backups weiterhin wiederherstellbar — ✅ (keine Backup-/Restore-Mechanik verändert; neue Keys folgen der `kk_`-Backup-Konvention).
19. Kein neuer Haupt-Tab — ✅ (Test G, Tab-Anzahl unverändert bei 11).
20. Alle bisherigen E2E-Tests bleiben grün — ✅ (§7).

## 9. Status

Branch `feat/sales-execution-core-v1` gepusht. **Kein Merge, kein Produktions-Deployment** — wie ausdrücklich verlangt. Draft-PR wird mit diesem Bericht verlinkt.
