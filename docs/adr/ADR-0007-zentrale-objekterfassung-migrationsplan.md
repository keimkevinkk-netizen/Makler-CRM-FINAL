# ADR-0007: Zentrale Objekterfassung — Bestandsaufnahme und Migrationsplan (NICHT umgesetzt)

## Status
Proposed — **bewusst nicht in dieser Phase implementiert**, siehe Begründung unten.

## Kontext

Kevins EXTRA-ANHANG zum Fehlerbehebungsauftrag verlangt eine Vereinheitlichung aller objektbezogenen Eingabestellen zu einer einzigen zentralen Objektmaske mit einer einzigen führenden Datenquelle (`recordType`-Unterscheidung statt getrennter Storage-Keys). Dieses Dokument ist die von Kevin geforderte Bestandsaufnahme (Abschnitt 3/4) und ein Migrationsplan — **keine Umsetzung**.

### Warum in dieser Phase nicht umgesetzt

Der übergeordnete Auftrag, in dem dieser Anhang steckt, enthält selbst bindende Regeln, die einer Vollmigration in einem Schritt entgegenstehen: *"Kein kompletter Rewrite. Keine unkontrollierte Modularisierung."* und die Priorisierung *"Die produktive mobile Nutzung hat zwei reale Fehler gezeigt, die jetzt Vorrang haben."* Eine echte Konsolidierung von mindestens 6 aktiven, seit Jahren produktiv genutzten Formularen auf **6 verschiedene Storage-Keys mit unterschiedlichen Feldschemata** in einem einzigen PR wäre selbst nach vorsichtiger Schätzung ein Vorhaben von mehreren Tagen mit hohem Regressions- und Datenverlustrisiko — das genaue Gegenteil von "kleinste robuste Lösung" (Kevins eigene Formulierung im Hauptauftrag). Diese Bestandsaufnahme liefert die faktische Grundlage, auf der eine spätere, in sich abgeschlossene Migrations-Phase sicher aufsetzen kann.

## Bestandsaufnahme: gefundene parallele Objekt-Eingabestellen

| # | Formular | Tab | DOM-ID | Storage-Key | Gespeicherte Kernfelder | Tatsächlicher Zweck | Geo-Integration |
|---|---|---|---|---|---|---|---|
| 1 | Objektakte anlegen (CRM Pro) | CRM → Objekte | `#kkcrmproObjectForm` | `kk_crm_objects` | address, area, district, objectType, status, livingArea, plotArea, marketValue, wantedPrice, docs, notes | Vollständige, strukturierte Objektakte mit Bewertungsintegration (`window.KK_VALUATION`) | Ja — `addr`/`geo` über `window.KK_GEO`/`window.KK_GEOCODE` (in dieser Phase gehärtet, siehe Fehler 11) |
| 2 | Objektakte (Legacy-Dashboard) | "kk12"-Workspace | `#kk12ObjectId`/`kk12Obj*` | `kk12_objects` | owner, address, area, type, value, status, next | Funktional nahezu identisch zu #1, aber eigenständig, ohne Geo-Integration | Nein |
| 3 | Verkaufschance | Pipeline | `#salesForm` | `kk_sales_pipeline` | name, objectLabel, objectType, objectValue, commission, probability, stage | Vertriebschance mit EINGEBETTETEN Objekt-ähnlichen Feldern, kein Verweis auf `kk_crm_objects` | Teilweise — über verknüpften Kontakt (`saveLead()`), nicht direkt |
| 4 | Bewertungstermin | Pipeline | `#valuationForm` | `kk_valuation_pipeline` | name, address, objectType, value, motivation, timeframe | Bewertungstermin mit eigenen, wiederum EINGEBETTETEN Objektfeldern | Nein |
| 5 | Lead/Eigentümer erfassen | CRM Pro | (Lead-Formular, `saveLead()`) | `kk_crm_contacts` (+ bedingt `kk_crm_owner_pipeline`, `kk_crm_objects`) | Kontakt + optional Objektadresse | Einziges bestehendes Formular, das bereits HEUTE bedingt einen `kk_crm_objects`-Eintrag miterzeugt, wenn eine Adresse angegeben wird — ein bestehendes, funktionierendes Vorbild für "eine Aktion, mehrere verknüpfte Datensätze" | Ja, indirekt über den erzeugten `kk_crm_objects`-Eintrag |
| 6 | Marktbeobachtung erfassen | Marktmonitor | `#kkv8MarketEntryForm` | `kk_market_monitor_entries_v1` | town, platform, type, object (Freitext!), price, sqm, link, status | Fremde/beobachtete Angebote, bewusst KEIN eigenes Vermarktungsobjekt (Kevin Abschnitt 8) | Ja — in dieser Phase neu ergänzt (siehe Fehler B), inkl. neuer `adoptMarketObservation()`-Brücke zu `kk_crm_objects` |

**Zusätzlich gefundene, aber nicht aktiv beschriebene Keys** (nur in einer internen Schlüssel-/Modul-Registry referenziert, kein eigenes Formular gefunden): `kk_offer_monitor_entries_v1`, `kk_angebot_monitor_entries_v1` — vermutlich für eine frühere Planungsphase reservierte, nie aktiv genutzte Aliase. `kk_market_analysis_v1`, `kk_region_market_cockpit_v10` — Legacy-Quellen, die nur lesend in `kk_mkk_market_reference_v29_4` einfließen (Orts-Preisreferenzen, keine Einzelobjekte, fachlich ein anderes Datenmodell als die obige Tabelle).

## Entscheidungstreiber
- Keine Datensätze verlieren, keine stillen Dubletten.
- Bestehende, produktiv genutzte Storage-Keys (`kk_crm_objects` etc.) bleiben per CLAUDE.md/`.claude/rules/storage.md` ohne Adapter/Migration unantastbar.
- Migration muss idempotent sein (Kevins ausdrückliche Vorgabe).
- Jeder Konsolidierungsschritt muss für sich testbar und rückrollbar sein — kein Big-Bang.

## Vorgeschlagenes `recordType`-Design (Entwurf, nicht implementiert)

```
recordType: 'crm_object' | 'market_observation' | 'comparison_object' | 'potential_object' | 'legacy_unclassified'
sourceType: <ursprüngliches Formular, z.B. 'kkcrmpro_object_form' | 'kk12_object_form' | 'sales_pipeline_embedded' | 'valuation_pipeline_embedded'>
legacySourceKey: <ursprünglicher Storage-Key, z.B. 'kk12_objects'>
legacyId: <ursprüngliche ID im alten Key>
origin: 'manual' | 'migrated' | 'adopted_from_market_observation'
importedAt: ISO-Zeitstempel der Migration (nur bei origin:'migrated')
```

`kk_crm_objects` bleibt die **führende Quelle** (bereits die vollständigste Struktur inkl. Geo/Valuation-Integration, siehe Tabelle Zeile 1) — kein neuer Key.

## Vorgeschlagener Migrationsplan (Stufen, keine davon in dieser Phase ausgeführt)

1. **Stufe 1 (risikofrei):** `recordType:'crm_object'` additiv auf alle bestehenden `kk_crm_objects`-Einträge schreiben (reine Ergänzung, kein Feld entfernt/umbenannt) — Voraussetzung für alles Weitere, ohne selbst etwas sichtbar zu verändern.
2. **Stufe 2 (risikoarm, isoliert testbar):** `kk12_objects` → `kk_crm_objects` migrieren, da funktional nahezu deckungsgleich (Zeile 1 vs. 2 der Tabelle) mit dem geringsten Mapping-Aufwand. `kk12_objects` bleibt als Lese-Alias bestehen, bis Kevin die Migration im laufenden Betrieb bestätigt hat (keine sofortige Löschung des alten Formulars).
3. **Stufe 3 (mittleres Risiko):** Verkaufschance/Bewertungstermin (`kk_sales_pipeline`/`kk_valuation_pipeline`) NICHT vollständig auflösen (das sind eigenständige Pipeline-Konzepte, keine reinen Objektformulare — dort ein `objectId`-Referenzfeld ergänzen, das optional auf einen `kk_crm_objects`-Eintrag verweist, nach demselben Muster wie das bereits bestehende `saveLead()`-Vorbild (Zeile 5).
4. **Stufe 4 (UI-Konsolidierung, erst nach Stufe 1-3 abgeschlossen):** Ein gemeinsamer Objekt-Editor-Dialog, den alle Tabs (`CRM`, `kk12`-Workspace, `Pipeline`, `Marktmonitor`) für die Objekt-*Bearbeitung* gemeinsam nutzen — analog zum bereits bestehenden `openRecordDetail()`-Muster in `KK_REALMAP` (siehe Fehler-B-Fix in dieser Phase), das schon heute layer-übergreifend zum richtigen Editor navigiert.

## Begründung, warum dieser Plan (und keine sofortige Umsetzung) die richtige Antwort ist

Die Konsolidierung ist inhaltlich richtig und wird hier nicht in Frage gestellt — aber sie berührt 6 Storage-Keys, mehrere hundert Datensätze im produktiven Bestand, und mindestens 4 unabhängige UI-Bereiche. Kevins eigener Auftrag verlangt für genau solche Fälle: *"Wenn du unsicher bist, lieber dokumentieren und absichern als blind umbauen."* Diese Bestandsaufnahme ist genau das — der nächste technische Schritt ist Stufe 1 (rein additiv, keine Verhaltensänderung), sobald Kevin diesen Plan freigibt.

## Konsequenzen

**Positiv:** Keine der beiden akuten Produktionsfehler (A/B) wurde durch eine unfertige Großmigration gefährdet; die Bestandsaufnahme selbst ist bereits nützlich (z. B. deckt sie auf, dass `kk_offer_monitor_entries_v1`/`kk_angebot_monitor_entries_v1` wahrscheinlich totes Code-Erbe sind — wert, in einer separaten, risikofreien Aufräum-Phase geprüft zu werden). **Negativ:** Die eigentliche Vereinheitlichung ist noch nicht begonnen; bis dahin bleiben die in der Tabelle gelisteten Parallel-Formulare bestehen.

## Verifikation
Für jede Migrationsstufe: Export → Migration → Re-Import-Test (per `.claude/rules/storage.md`), volle E2E-Suite, manueller Test mit befüllten synthetischen Datensätzen je betroffenem Formular.

## Rollback / Superseding
Jede Stufe schreibt nur additiv oder in einen neuen Key, der alte Key bleibt bis zur expliziten Freigabe als Lese-Alias bestehen — jede Stufe ist für sich revertierbar, ohne vorherige Stufen zurückzubauen.
