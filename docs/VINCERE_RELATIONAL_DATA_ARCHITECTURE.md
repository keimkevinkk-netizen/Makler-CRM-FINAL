# VINCERE – Relationale Cloud-Datenarchitektur

## Ziel

VINCERE speichert operative Daten nicht länger als einen einzigen Workspace-JSON-Snapshot. Kontakte, Follow-ups, Immobilien, Termine, Telefonereignisse und Auditereignisse werden als getrennte Datensätze in eigenen PostgreSQL-Tabellen geführt.

Der lokale Browserzustand bleibt als Cache und Offline-Grundlage erhalten. Die Cloud ist bei konfiguriertem Backend die mandantengeschützte, gemeinsam nutzbare Datenquelle.

## Tabellen

| Tabelle | Inhalt | Kontaktbezug |
|---|---|---|
| `contacts` | Eigentümer, Käufer, Tippgeber und Netzwerkpartner | Primärdatensatz |
| `follow_ups` | nächste Aktionen und Wiedervorlagen | verpflichtend |
| `properties` | operative Immobilien | optionaler Eigentümerkontakt |
| `appointments` | Termine | optional |
| `call_events` | protokollierte Telefonergebnisse | verpflichtend |
| `audit_events` | Änderungsnachweise | kein direkter Kontakt-FK |
| `workspace_sync_revisions` | atomare Workspace-Synchronisationsrevision | – |

Jeder operative Datensatz besitzt:

- `workspace_id`
- stabile fachliche `id`
- versioniertes `payload`
- optionale beziehungsweise verpflichtende Kontaktverknüpfung
- Datensatzversion
- Änderungszeitpunkt
- ändernden Benutzer

## Mandantentrennung

Jede Tabelle besitzt Row Level Security. Lesen ist nur für Mitglieder des betreffenden Workspace möglich. Schreiben und Löschen ist auf die Rollen `owner`, `admin` und `agent` begrenzt. `viewer` bleibt lesend.

Kontakt-Fremdschlüssel bestehen aus `workspace_id` und `related_contact_id`. Dadurch kann ein Follow-up oder Telefonereignis niemals auf einen Kontakt eines anderen Workspace zeigen.

## Synchronisation

Der Client lädt die sechs Datensammlungen getrennt und baut daraus den lokalen `AppState` auf. Nach Änderungen wird nicht der gesamte Workspace blind überschrieben.

Der Sync-Adapter vergleicht:

1. zuletzt bestätigten Cloud-Stand,
2. aktuellen lokalen Stand,
3. bekannte Datensatzversionen.

Daraus entstehen ausschließlich notwendige Mutationen:

- neuer Datensatz → `expectedVersion = 0`
- geänderter Datensatz → bekannte aktuelle Version
- gelöschter Datensatz → bekannte aktuelle Version

Abhängige Datensätze werden vor Kontakten gelöscht. Neue oder geänderte Kontakte werden vor abhängigen Datensätzen geschrieben.

## Konfliktschutz

Die RPC `sync_vincere_records` sperrt zunächst die Workspace-Revision. Stimmen erwartete und aktuelle Revision nicht überein, wird die Transaktion abgebrochen.

Innerhalb der Transaktion wird zusätzlich jede einzelne Datensatzversion geprüft. Eine parallele Änderung an demselben Kontakt, Follow-up oder Objekt führt damit zu einem sichtbaren Konflikt statt zu stillem Datenverlust.

Alle Mutationen werden atomar ausgeführt. Schlägt eine Prüfung fehl, wird keine Teilmenge gespeichert.

## Bestehender Snapshot

Die Tabelle `workspace_snapshots` aus der vorherigen Foundation bleibt vorerst bestehen, wird durch den neuen Adapter aber nicht mehr als operative Hauptquelle verwendet. Da noch kein produktives Supabase-Projekt und keine Cloud-Nutzdaten existieren, ist keine automatische Produktivmigration erforderlich.

Vor einem späteren Echtstart gilt:

1. Migrationen in einer Testumgebung ausführen.
2. RLS mit mindestens zwei getrennten Test-Workspaces prüfen.
3. vorhandene Test-Snapshots kontrolliert transformieren oder verwerfen.
4. Erst danach produktive Benutzer und Daten zulassen.

## Bewusste Grenzen

Noch nicht enthalten:

- Live-Realtime-Abonnements
- visuelle Zusammenführung zweier Konfliktstände
- serverseitige Einladung neuer Teammitglieder
- produktive MaklerCRM-Datenmigration
- Lösch- und Aufbewahrungsregeln nach Datenschutzkonzept

Diese Punkte bleiben getrennte Arbeitspakete.
