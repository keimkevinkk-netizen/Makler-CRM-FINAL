# ADR-0008: Sales Execution Core V1 — additive Orchestrierungs- und Sicherheitsarchitektur

## Status
Accepted — durch Abschlussreview vom 13.07.2026 präzisiert.

## Kontext
Der Sales Execution Core soll aus bestehenden CRM-, Follow-up-, Zusagen-, Kalender-, Objekt- und Pipeline-Daten nachvollziehbare nächste Handlungen ableiten und einen geführten Anrufworkflow bereitstellen. Die bestehende Single-File-App darf dabei weder ein zweites CRM noch parallele Pipeline-, Follow-up- oder Navigationslogik erhalten.

Die Bestandsdaten enthalten historisch gemischte Verknüpfungen: teils stabile IDs, teils Namen/Freitext. Ein automatisches Namens-Raten würde zu stillen Fehlverknüpfungen führen. Außerdem ist die dokumentierte Kontaktgrundlage nicht bei allen Bestandskontakten vorhanden.

## Entscheidung

### 1. Additives Namespace-Modul
`window.KK_SALES_CORE` bleibt ein über `KK_BOOT.register('sales-execution-core', init, {priority:50})` gestartetes, eingefrorenes Namespace-Modul innerhalb von `index.html`.

Es liest und schreibt ausschließlich bestehende kanonische Fachdaten:

- Kontakte: `kk_crm_contacts`
- Aktivitäten: `kk_crm_activities`
- Follow-ups: `kk_followups`
- Zusagen: `kk_commitments_v1`
- Verkaufschancen: `kk_sales_pipeline`
- Objekte: `kk_crm_objects`
- Termine: `kk12_calendar_events`

Die neuen Keys speichern nur Orchestrierungszustand, Entscheidungen, Verknüpfungsprobleme und Ereignisse. Sie ersetzen keine kanonische Quelle.

### 2. Stable-ID- und Verknüpfungspolitik
Vor Nutzung werden fehlende IDs additiv ergänzt. Bestehende `id`/`_id`-Werte bleiben unverändert. Vor dem ersten migrationsbedingten Schreibvorgang wird automatisch eine technische Sicherung angelegt.

Neue Aktivitäts-, Follow-up- und Zusage-Datensätze enthalten:

- eigene stabile `id`,
- `contactId`,
- `opportunityId`, soweit vorhanden,
- `propertyId`, nur wenn das Objekt per stabiler ID oder eindeutigem Objektmerkmal auflösbar ist,
- `sessionId` und `recommendationId` für Idempotenz und Nachvollziehbarkeit.

Uneindeutige oder verwaiste Kontakt-/Objektbezüge werden in `kk_entity_link_queue_v1` dokumentiert. Es gibt keine automatische Rateverknüpfung. Solche Quellen werden aus der automatischen Empfehlung ausgeschlossen oder ohne Objektverknüpfung mit sichtbarem Warnhinweis behandelt.

### 3. Sichere Kontaktpolitik
Die technische Produktentscheidung lautet:

- Sperrvermerk, Widerspruch, Opt-out, `phoneAllowed=false`, aktiver Sperrzeitraum oder dokumentierter Widerruf sind harte Ausschlüsse.
- Dokumentierte ausdrückliche Einwilligung, Rückrufwunsch/konkrete Anfrage oder nachvollziehbare bestehende Beziehung erlauben die Berücksichtigung.
- Die jeweilige Kontaktgrundlage wird in jeder Empfehlung sichtbar ausgewiesen.
- Eine unbekannte Kontaktgrundlage reicht nicht für die automatische Tagespriorisierung.
- Ein manueller Kontaktversuch bei unbekannter Grundlage erfordert einen eigenen Warn-Dialog, Auswahl einer Grundlage/Begründung, Freitextdokumentation und bewusste Checkbox-Bestätigung.
- Harte Ausschlüsse können auch manuell nicht umgangen werden.

Diese Regeln sind technische Sicherheitslogik, keine individuelle Rechtsberatung.

### 4. Deterministische Action Engine
Empfehlungen werden nicht persistiert, sondern reproduzierbar aus den kanonischen Quellen berechnet. Sie enthalten mindestens:

- Handlung,
- Begründung,
- Prioritätsstufe,
- Datenbasis und Quell-ID,
- Ziel,
- stabile Kontaktreferenz,
- Fälligkeit,
- Kontaktgrundlage,
- Warn- und Ausschlusshinweise.

Es gibt keinen Personen-Score und keine erfundete Wahrscheinlichkeit. Ausgeschlossene Quellen werden über ein Decision-Audit nachvollziehbar gemacht.

### 5. Idempotenter Anrufworkflow
Beim Start wird eine `CallSession` mit vorab vergebenen IDs für potenzielle Aktivität, Follow-up und Zusage gespeichert. Alle Writes erfolgen als Upsert nach diesen IDs. Zusätzlich verhindern `recommendationId`, `sessionId`, ein Save-Lock und idempotente Ereignisschlüssel Doppelverarbeitung bei:

- Doppelklick,
- wiederholtem Öffnen,
- Abbrechen/Zurückgehen,
- Reload,
- Unterbrechung zwischen einzelnen LocalStorage-Schritten.

Existiert nach einem Reload bereits die Aktivität, aber noch kein Feedback, wird der Abschluss rekonstruiert, ohne eine zweite Aktivität zu erzeugen. Pipeline-Änderungen bleiben an eine ausdrückliche Checkbox gebunden.

### 6. Begrenztes Ereignis-Log
`kk_sales_events_v1` bleibt innerhalb des aktiven Fensters append-only und nutzt `eventKey` zur Duplikatvermeidung. Ab mehr als 2.000 Ereignissen werden die ältesten Einträge automatisch bis auf 1.500 aktive Einträge verdichtet. Die Verdichtung wird in `kk_sales_event_archive_v1` als monatliches Aggregat je Ereignistyp gespeichert; maximal 24 Monatsaggregate werden gehalten.

Damit wächst LocalStorage nicht unbegrenzt. Die bewusste Einschränkung ist, dass archivierte Einzelereignisse nach der Verdichtung nur noch aggregiert vorliegen.

### 7. Backup, Restore und Migration
Alle fünf Sales-Core-Keys sind als aktive, backup-pflichtige Keys registriert:

- `kk_action_feedback_v1`
- `kk_call_session_v1`
- `kk_entity_link_queue_v1`
- `kk_sales_events_v1`
- `kk_sales_event_archive_v1`

Komplettbackup und Restore erfassen sie über die zentrale `KK_STORE`-Schicht. Vor Storage-/ID-Migrationen werden technische Snapshots unter ausgeschlossenen `kk_pre_import_*`-Keys angelegt. Migrationen verändern vorhandene IDs nicht und bleiben bei Wiederholung ohne weitere Änderungen.

## Konsequenzen

### Positiv
- Keine zweite Fachlogik oder Navigation.
- Keine stillen Kontakt-/Objektfehlverknüpfungen.
- Konservativer automatischer Kontaktfilter.
- Nachvollziehbare Empfehlungen und Ausschlüsse.
- Wiederhol- und Reload-sicherer Schreibworkflow.
- Begrenztes LocalStorage-Wachstum.

### Einschränkungen
- Historische, mehrdeutige Legacy-Verknüpfungen benötigen weiterhin manuelle Klärung.
- Das Ereignisarchiv bewahrt ältere Daten aggregiert, nicht als vollständige Einzelhistorie.
- Die Kontaktpolitik ersetzt keine rechtliche Einzelfallprüfung.
- Die App bleibt eine lokale Single-User-/LocalStorage-Anwendung ohne serverseitige Transaktion oder Mehrbenutzersperren.

## Rollback
1. PR-Commit(s) revertieren oder auf den Commit vor PR #11 zurücksetzen.
2. Die fünf neuen Sales-Core-Keys optional löschen; bestehende CRM-/Pipeline-/Follow-up-/Objektdaten bleiben dabei erhalten.
3. Bei Migrationsproblemen die technischen Snapshots `kk_pre_import_sales_core_v2` beziehungsweise `kk_pre_import_storage_migrations_v28` verwenden.
4. Kein Rollback darf durch Import im Modus „Ersetzen“ ohne vorheriges externes Komplettbackup erfolgen.
