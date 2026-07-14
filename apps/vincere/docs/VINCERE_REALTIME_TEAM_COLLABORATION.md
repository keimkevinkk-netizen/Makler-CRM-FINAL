# VINCERE Realtime-, Konflikt- und Teamarchitektur

## Ziel dieses Arbeitspakets

Dieses Arbeitspaket ergänzt die relationale VINCERE-Grundlage um echte Mehrbenutzer-Zusammenarbeit. Es verändert ausschließlich `apps/vincere/` und baut auf `feat/vincere-relational-data` auf.

Enthalten sind:

- workspaceisolierte Supabase-Realtime-Abonnements für Kontakte, Follow-ups, Immobilien, Termine und Telefonereignisse
- kontrollierter Reconnect sowie sichtbare Offline-, Reconnect- und Fehlerzustände
- explizite Konflikterkennung statt stiller Überschreibung
- eine visuelle Konfliktzentrale mit lokalem und Cloud-Stand
- Teamverwaltung für Owner, Administrator, Makler und Lesezugriff
- zeitlich begrenzte, tokenbasierte und workspacegebundene Einladungen
- serverseitiger Schutz des letzten aktiven Owners
- Audit-Ereignisse für Rollen-, Aktivierungs- und Einladungsänderungen

## Realtime-Schicht

`WorkspaceRealtimeManager` erzeugt pro authentifizierter Benutzer-/Workspace-Kombination genau einen Channel. In diesem Channel werden fünf `postgres_changes`-Handler registriert. Jeder Handler besitzt den Filter:

```text
workspace_id=eq.<aktueller-workspace>
```

Zusätzlich prüfen Client und PostgreSQL Row Level Security die Workspace-Zugehörigkeit. Beim Abmelden, Benutzerwechsel, Workspace-Wechsel oder erneuten Start werden bestehende Channels, Reconnect-Timer und Browser-Netzwerklistener entfernt.

Der Browser verwendet nur:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- das Access-Token des angemeldeten Benutzers

Ein Service-Role-Schlüssel ist weder erforderlich noch zulässig.

## Schutz lokaler Änderungen

Jede lokale Änderung an einem Realtime-Datensatz wird mit Datensatzart, ID und lokalem Änderungszeitpunkt markiert. Trifft vor einer bestätigten Speicherung ein fremdes Realtime-Ereignis für denselben Datensatz ein, wird es nicht auf den lokalen Zustand angewendet.

Stattdessen entsteht ein Konflikt mit:

- Datensatzart, Name und ID
- lokaler und Cloud-Version
- lokalem und Cloud-Zeitpunkt
- Cloud-Benutzer-ID, sofern vorhanden
- abweichenden Feldern
- vollständigem lokalem und Cloud-Payload für den manuellen Vergleich

Es findet keine automatische Feldzusammenführung statt. Dadurch wird vermieden, dass ein vermeintlich konfliktfreies Merge fachlich relevante Informationen verwirft.

### Konfliktaktionen

- **Cloud-Version übernehmen:** Der Cloud-Datensatz wird bewusst in Store, Repository-Baseline und Versionskarte übernommen.
- **Lokal erneut prüfen und speichern:** Der bekannte Cloud-Stand wird als neue Baseline gesetzt. Anschließend wird die lokale Fassung erneut mit Datensatz- und Workspace-Version geprüft.
- **Manuell vergleichen:** Abweichende Felder werden nebeneinander angezeigt; es erfolgt keine Mutation.
- **Zurückstellen:** Der Konflikt bleibt erhalten und blockiert weitere unkontrollierte Cloud-Speicherungen.

## Team- und Rollenmodell

| Rolle | Operative Schreibrechte | Teamverwaltung | Owner verwalten |
|---|---:|---:|---:|
| Owner | Ja | Ja | Ja |
| Administrator | Ja | Ja | Nein |
| Makler | Ja | Nein | Nein |
| Lesezugriff | Nein | Nein | Nein |

Direkte Client-Schreibzugriffe auf `workspace_members` werden entfernt. Änderungen laufen ausschließlich über geprüfte `security definer`-Funktionen. Die bestehende RLS für operative Tabellen erlaubt Schreibzugriffe nur aktiven Ownern, Administratoren und Maklern. Viewer bleiben auch bei manipulierten Browserrequests schreibgeschützt.

Der Trigger `protect_last_workspace_owner_trigger` verhindert unabhängig vom aufrufenden Client:

- das Löschen des letzten aktiven Owners
- die Herabstufung des letzten aktiven Owners
- die Deaktivierung des letzten aktiven Owners
- insbesondere das Entfernen der eigenen letzten Owner-Berechtigung

## Einladungsablauf

1. Owner oder Administrator erzeugt eine Einladung für E-Mail, Rolle und Ablaufzeit.
2. Nur ein kryptografisch zufälliges Klartexttoken wird einmalig an den aufrufenden Client zurückgegeben.
3. PostgreSQL speichert ausschließlich den SHA-256-Hash des Tokens.
4. VINCERE versendet keine E-Mail. Das Token muss über einen sicheren, getrennt konfigurierten Kanal übermittelt werden.
5. Die eingeladene Person meldet sich mit genau der eingeladenen E-Mail-Adresse an.
6. Die Annahmefunktion prüft Tokenhash, Workspace, E-Mail, Ablauf, Widerruf und bestehende aktive Fremd-Workspace-Mitgliedschaften.
7. Erst danach wird die Mitgliedschaft aktiviert und auditiert.

## Datenbankmigration

Dieses Paket enthält genau eine Migration:

```text
supabase/migrations/202607140003_realtime_team_collaboration.sql
```

Sie ergänzt ausschließlich die für Realtime und Teamzusammenarbeit benötigten Spalten, Einladungen, RLS-Anpassungen, Funktionen, Trigger, Indizes und Realtime-Publication-Einträge.

Für die fünf operativen Realtime-Tabellen wird `REPLICA IDENTITY FULL` aktiviert. Damit enthalten auch DELETE-Ereignisse genügend Informationen für Workspace- und Datensatzprüfung.

## Sicherheitsgrenzen

- Realtime ist ein Benachrichtigungsweg, keine Autorisierungsschicht. Autorisierung bleibt Aufgabe von Auth, RLS und RPCs.
- Ein Publishable Key ist öffentlich verwendbar; seine Sicherheit hängt zwingend von korrekter RLS ab.
- Tokens dürfen nicht in Logs, Analytics, URLs oder Support-Screenshots gelangen.
- Deaktivierte Mitglieder verlieren durch die überarbeiteten Membership-Helfer sofort den RLS-Zugriff.
- Die UI-Prüfung verbessert Bedienbarkeit, ersetzt aber nie serverseitige Regeln.
- Konflikte werden nicht automatisch auf Feldebene gemergt.

## Bekannte Einschränkungen

- Es ist kein produktives Supabase-Projekt konfiguriert.
- Es werden keine echten Benutzer oder Echtdaten angelegt.
- Es gibt noch keinen sicheren E-Mail-Versanddienst und daher keinen automatischen Einladungsversand.
- Die Konfliktzentrale zeigt die ausführende Benutzer-ID. Für Klarnamen ist später eine serverseitig freigegebene Profilauflösung sinnvoll.
- Offline-Änderungen verbleiben im lokalen Browsercache. Eine langlebige, verschlüsselte Offline-Queue mit geräteübergreifender Wiederaufnahme ist ein späteres Arbeitspaket.
- Realtime-Nachrichten ersetzen keine periodische Konsistenzprüfung nach sehr langen Offline-Zeiten.

## Notwendiger Produktionsaufwand

Vor Produktion sind mindestens erforderlich:

1. separates Supabase-Stagingprojekt und anschließend kontrolliertes Produktionsprojekt
2. Migrationstest gegen eine leere Datenbank und gegen einen realistischen anonymisierten Datenbestand
3. RLS-Integrationstests mit echten JWTs für alle vier Rollen und zwei getrennte Workspaces
4. Konfiguration von Realtime-Limits, Monitoring, Rate Limits und Alarmierung
5. sicherer serverseitiger E-Mail-Dienst mit Template, Domainauthentifizierung und Missbrauchsschutz
6. Token-Redaction in Logs und Fehlertracking
7. MFA oder Passkeys für Owner und Administratoren
8. Datenschutz-, Aufbewahrungs- und Löschkonzept
9. Backup- und Wiederherstellungstest
10. kontrollierte Migration der MaklerCRM-Echtdaten

Kein Bestandteil dieses Arbeitspakets führt Merge, Deployment oder produktive Datenänderungen aus.
