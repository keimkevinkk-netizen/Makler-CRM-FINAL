# PR #11 — Finaler Abschlussbericht: Sales Execution Core V1

**Branch:** `feat/sales-execution-core-v1`
**Status:** Draft / **NICHT MERGEN**
**Merge/Deployment:** nicht durchgeführt
**Review-Datum:** 13.07.2026

## 1. Gesamturteil

Der Sales Execution Core bleibt eine additive Orchestrierungsschicht über den bestehenden kanonischen CRM-, Follow-up-, Zusagen-, Objekt-, Kalender- und Pipeline-Daten. Im Abschlussreview wurden mehrere Freigabeblocker gefunden und korrigiert: unbekannte Kontaktgrundlagen waren zuvor automatisch priorisierbar, der mehrstufige Anrufabschluss war nicht vollständig reload-sicher, neue Storage-Keys waren nicht vollständig als aktive Backup-Bereiche registriert und der Ereignis-Log konnte unbegrenzt wachsen.

Die endgültige Merge-Empfehlung wird ausschließlich anhand des vollständigen CI-Laufs am finalen PR-Head abgegeben. Unabhängig davon bleibt der PR bis zur ausdrücklichen Freigabe als Draft und mit „NICHT MERGEN“ gekennzeichnet.

## 2. Geprüfte Risiken und Ergebnis

| Prüfbereich | Ergebnis nach Korrektur |
|---|---|
| Additive Architektur | `window.KK_SALES_CORE` nutzt bestehende Fach-Keys und `KK_BOOT`; kein neuer Haupt-Tab, kein zweites CRM, keine zweite Pipeline oder Follow-up-Datenquelle |
| Stabile Entitätsbezüge | Fehlende IDs werden additiv ergänzt; neue Aktivitäten, Follow-ups und Zusagen tragen stabile Kontakt-/Opportunity-/Objekt-/Session-/Empfehlungsreferenzen, soweit fachlich vorhanden |
| Ambiguitätsbehandlung | Mehrdeutige oder verwaiste Kontakt-/Objektbezüge werden in `kk_entity_link_queue_v1` dokumentiert; keine stille Rateverknüpfung |
| Anrufworkflow | Vorab vergebene IDs, Upsert, Save-Lock, Session-Recovery und idempotente Ereignisschlüssel verhindern Doppelwrites bei Doppelklick, Reload und Wiederöffnung |
| Action Engine | Erledigte Vorgänge, zukünftige Follow-ups, abgeschlossene Zusagen, harte Kontaktsperren, unbekannte Kontaktgrundlagen und nicht eindeutig verknüpfte Quellen werden ausgeschlossen |
| Nachvollziehbarkeit | Jede Empfehlung enthält Handlung, Begründung, Priorität, Datenbasis/Quell-ID, Ziel, Kontaktbezug, Fälligkeit, Kontaktgrundlage sowie Warn-/Ausschlusshinweise |
| Daily Command Center | Ehrlicher Leerzustand; begrenztes Rendering der ersten acht Karten; robuste Verarbeitung beschädigter Array-Einträge; mobile Dialoge und Karten |
| Storage/Backup | Fünf Sales-Core-Keys als aktive Backup-Bereiche registriert; zentrale Komplettbackup-/Restore-Schicht bleibt kanonisch |
| Migration | Automatische technische Sicherung vor neuen ID-/Storage-Migrationen; bestehende IDs werden nicht ersetzt; Wiederholung bleibt ohne zusätzliche Änderung |
| Ereigniswachstum | Aktives Log auf 2.000 begrenzt, Verdichtung auf 1.500 aktive Ereignisse; Monatsaggregate in separatem, auf 24 Monate begrenztem Archiv |

## 3. Vorgenommene Korrekturen

### Kontaktpolitik

- Harte Ausschlüsse für Sperrvermerk/Widerspruch, Opt-out, `phoneAllowed=false`, aktiven Sperrzeitraum und dokumentierten Widerruf.
- Zulässige Grundlagen: ausdrückliche Einwilligung, dokumentierter Rückrufwunsch/konkrete Anfrage, nachvollziehbare bestehende Beziehung.
- Kontakte ohne dokumentierte oder aus einem realen Vorgang ableitbare Grundlage werden nicht automatisch priorisiert.
- Die Kontaktgrundlage wird auf Empfehlungskarte und in der Anrufvorbereitung sichtbar.
- Manueller Kontaktversuch bei unbekannter Grundlage nur über Warn-Dialog mit Auswahl, konkreter Begründung und Checkbox.
- Harte Ausschlüsse können manuell nicht umgangen werden.
- Widersprüchliche Angaben werden hart ausgeschlossen und als Warnung ausgewiesen.
- Klarstellung in der UI: technische Sicherheitslogik, keine individuelle Rechtsberatung.

### Datenmodell und Verknüpfungen

- Stable-ID-Migration für Kontakte, Follow-ups, Aktivitäten, Objekte, Zusagen, Verkaufschancen, Kalenderereignisse, Feedback und Link-Queue.
- `kk_entity_link_queue_v1` unterstützt Kontakt- und Objektprobleme mit `entityType`, `candidateEntityIds`, `resolvedContactId` beziehungsweise `resolvedPropertyId`.
- Eindeutige Links erzeugen keinen unnötigen Queue-Eintrag; bestehende Queue-Einträge werden nur bei fachlicher Änderung aktualisiert. Empfehlungsermittlung bleibt damit schreibfrei, soweit kein neuer Datenqualitätsfall entsteht.
- Neue Aktivität, Follow-up und Zusage erhalten dieselben stabilen `contactId`, `opportunityId`, `propertyId`, `sessionId` und `recommendationId`.

### Idempotenz und Recovery

- Eine CallSession vergibt alle später benötigten IDs vor dem ersten Fachwrite.
- Aktivitäten, Follow-ups, Zusagen, Feedback und Pipeline werden per ID aktualisiert statt blind angehängt.
- Doppelklickschutz über synchrones Save-Lock und deaktivierten Button.
- Bereits erledigte Empfehlungen lassen sich nicht erneut starten.
- Nach Reload rekonstruiert eine vorhandene Aktivität den fehlenden Feedback-Abschluss, ohne einen zweiten Datensatz zu erzeugen.
- Pipeline-Änderung nur nach ausdrücklicher Bestätigung.
- Das Ergebnis „erreicht/nicht erreicht“ ist vor dem Speichern verpflichtend.

### Storage, Backup und Archivierung

Neue/aktive Keys:

| Key | Zweck | Backup |
|---|---|---|
| `kk_action_feedback_v1` | Entscheidung zu Empfehlungen, Upsert per `recommendationId` | erforderlich |
| `kk_call_session_v1` | laufender, wiederherstellbarer Anrufzustand | erforderlich |
| `kk_entity_link_queue_v1` | ungeklärte/mehrdeutige Entitätsbezüge | erforderlich |
| `kk_sales_events_v1` | aktives, idempotentes Ereignisfenster | erforderlich |
| `kk_sales_event_archive_v1` | monatliche Verdichtung älterer Ereignisse | erforderlich |

Alle Keys wurden in `ACTIVE_STORAGE_KEYS`, Modulklassifizierung, Importbezeichnungen und Schema Registry aufgenommen. Sie ersetzen keine bestehende kanonische Quelle.

Technische Migrationssicherungen:

- `kk_pre_import_storage_migrations_v28`
- `kk_pre_import_sales_core_v2`

Diese Keys sind bewusst technische Wiederherstellungspunkte und werden nicht in normale Backups verschachtelt.

## 4. Testabdeckung

`tests/e2e/test-sales-execution-core.js` prüft mindestens:

- unbekannte Kontaktgrundlage,
- dokumentierte Einwilligung,
- Rückrufwunsch,
- bestehende Beziehung,
- Opt-out,
- Sperrvermerk,
- widerrufene Einwilligung,
- widersprüchliche Kontaktinformationen,
- manuelle Warnbestätigung inklusive Pflichtfeldern,
- Ausschluss aus automatischer Tagespriorisierung,
- zukünftige Follow-ups und erledigte Zusagen,
- mehrdeutige Namensverknüpfung,
- vollständige Empfehlungsfelder,
- stabile Kontakt-/Opportunity-/Objektverknüpfung,
- Doppelklick, Wiederöffnung, Reload und unterbrochenen Speichervorgang,
- leere und beschädigte Legacy-Daten,
- 450 Kontakte/Follow-ups,
- mobilen 390-Pixel-Viewport,
- Migrationsbackup und Idempotenz,
- vollständiges Backup/Restore aller neuen Keys,
- Begrenzung und Archivierung des Ereignis-Logs.

### Lokale Prüfergebnisse

- `node --check` für den neuen Sales-Core-Scriptblock: **bestanden**
- `node --check tests/e2e/test-sales-execution-core.js`: **bestanden**
- `npm run check:functions`: **bestanden**
- `npm run lint`: **bestanden, 0 Fehler; 4 bereits bestehende Warnungen**
- `npm run test:functions`: **29/29 Checks bestanden**
- isolierter VM-Test der ContactPolicy/ActionEngine/Ambiguitäts-Queue: **bestanden**
- vollständige Playwright- und Regressionssuite: **wird am finalen PR-Head durch GitHub Actions dokumentiert**

## 5. Verbleibende Einschränkungen

1. Die Anwendung nutzt LocalStorage und besitzt keine serverseitige Transaktion. Der Workflow ist deshalb idempotent und recovery-fähig, aber nicht mit einer ACID-Datenbank gleichzusetzen.
2. Historische mehrdeutige Legacy-Bezüge müssen manuell geklärt werden; sie werden bewusst nicht automatisch repariert.
3. Ältere Ereignisse werden nach Erreichen der Grenze als Monatsaggregate aufbewahrt. Eine vollständige, unbegrenzte Einzelereignis-Historie ist wegen LocalStorage-Grenzen bewusst nicht vorgesehen.
4. Die Kontaktpolitik ist eine technische Sicherheitslogik und ersetzt keine rechtliche Einzelfallprüfung.
5. Das System bleibt Single-User. Gleichzeitige Bearbeitung aus mehreren Tabs/Geräten besitzt keine verteilte Sperre; stabile IDs und Upserts reduzieren das Risiko, ersetzen aber keine zentrale Synchronisation.

## 6. Migrationsverhalten

- Migrationen laufen additiv beim Modulstart.
- Vor dem ersten migrationsbedingten Write wird ein technischer Snapshot erstellt.
- Vorhandene `id`/`_id`-Werte bleiben unangetastet.
- Nur Datensätze ohne stabile ID erhalten eine neue ID.
- Ein zweiter oder späterer Lauf meldet keine weiteren Änderungen.
- Beschädigte oder primitive Legacy-Einträge werden nicht umgedeutet und von der Engine sicher ignoriert.

## 7. Rollback-Anleitung

1. Vor jedem Rollback ein externes Komplettbackup über die zentrale Backup-Funktion erstellen.
2. Die finalen PR-Commits revertieren oder den Branch auf den letzten Commit vor PR #11 zurücksetzen.
3. Bei einer fehlerhaften ID-/Storage-Migration die Daten aus `kk_pre_import_sales_core_v2` beziehungsweise `kk_pre_import_storage_migrations_v28` wiederherstellen.
4. Die fünf neuen Sales-Core-Keys können entfernt werden, ohne bestehende Kontakte, Aktivitäten, Follow-ups, Objekte oder Pipeline-Daten zu löschen.
5. Keine Wiederherstellung im Importmodus „Ersetzen“ durchführen, bevor das externe Backup geprüft wurde.
6. Kein Deployment eines Rollbacks ohne separate ausdrückliche Freigabe.

## 8. Merge-Empfehlung

**Bis zum erfolgreichen vollständigen CI-Lauf am finalen PR-Head: noch nicht freigabefähig.**

Nach grünem Abschluss aller bestehenden und neuen Checks kann die technische Empfehlung auf **freigabefähig** gesetzt werden. Dies ist keine Merge-Ausführung: Der PR bleibt unabhängig vom technischen Urteil als Draft beziehungsweise klar „NICHT MERGEN“, bis Kevin den Merge ausdrücklich freigibt.
