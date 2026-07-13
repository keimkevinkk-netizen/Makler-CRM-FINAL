# VINCERE – Daten-, Workspace- und Identitätsarchitektur

## Status

Dieses Arbeitspaket schafft die technische Grenze zwischen Benutzeroberfläche und Datenhaltung. Es ist noch kein produktives Cloud-Backend und keine echte Anmeldung. Die neue Struktur verhindert jedoch, dass React-Komponenten dauerhaft direkt an LocalStorage gebunden bleiben.

## Kernprinzipien

1. Jede Installation arbeitet innerhalb eines eindeutigen `workspace.id`.
2. Jede schreibende Aktion wird einem `currentUser.id` und einer Rolle zugeordnet.
3. Operative Mutationen laufen zentral über den `AppStore` und nicht direkt über Komponenten.
4. Die Datenhaltung wird über `WorkspaceRepository` abstrahiert.
5. Der lokale Adapter kann später durch einen Cloud-Adapter ersetzt werden, ohne sämtliche Fachseiten neu zu schreiben.
6. Sicherungen sind versioniert und an einen Workspace gebunden.
7. Importierte Sicherungen dürfen die vertrauenswürdige lokale Identität und Rolle nicht überschreiben.
8. Beziehungen verwenden stabile IDs.
9. Änderungen werden in einem begrenzten Audit-Protokoll festgehalten.

## Aktueller Datenfluss

```text
React Feature
  → AppStore Command
  → Berechtigungsprüfung
  → Integritätsprüfung
  → Zustandsänderung
  → AuditEvent
  → WorkspaceRepository
  → LocalStorage Adapter
```

## Persistenzformat V2

Speicherschlüssel: `vincere_workspace_v2`

```text
WorkspaceSnapshot
├── format
├── schemaVersion
├── exportedAt
├── workspaceId
└── state
    ├── workspace
    ├── currentUser
    ├── contacts
    ├── followUps
    ├── properties
    ├── appointments
    ├── callEvents
    └── auditEvents
```

Der vorherige Schlüssel `vincere_state_v1` wird einmalig gelesen, versioniert migriert und anschließend als V2-Snapshot gespeichert. Der Altbestand wird nicht destruktiv umgeschrieben.

## Rollenmodell

| Rolle | Operative Schreibrechte | Workspace/Backup verwalten |
|---|---:|---:|
| Owner | Ja | Ja |
| Admin | Ja | Ja |
| Agent | Ja | Nein |
| Viewer | Nein | Nein |

Das Rollenmodell ist bereits als zentraler Vertrag vorhanden. Eine echte serverseitige Durchsetzung folgt erst mit Authentifizierung und Backend. Clientseitige Berechtigungen allein gelten nicht als vollständige Sicherheitsgrenze.

## Importregeln

- Pflichtsammlungen müssen vorhanden und Arrays sein.
- Fremde Workspace-IDs werden abgewiesen.
- Lokaler Workspace und lokale Benutzeridentität bleiben beim Import erhalten.
- Beschädigte Dateien werden nicht teilweise übernommen.
- Erfolgreiche Importe erzeugen einen Audit-Eintrag.

## Noch offen für das Cloud-Arbeitspaket

- Authentifizierungsanbieter und sichere Sessions
- serverseitige Rollenprüfung
- PostgreSQL-Schema und Migrationen
- Mandantenfilter auf jeder Abfrage
- Verschlüsselung und Secret-Management
- automatische externe Backups
- Synchronisation, Konfliktauflösung und Offline-Queue
- unveränderliches serverseitiges Audit-Log
- DSGVO-Lösch-, Export- und Aufbewahrungsregeln

## Migrationsstrategie zum Cloud-Backend

1. `WorkspaceRepository` um asynchrone Methoden erweitern.
2. Lokalen und Cloud-Adapter parallel betreiben.
3. Read-through-Migration pro Workspace testen.
4. Prüfsummen und Datensatzanzahlen abgleichen.
5. Schreibzugriffe kontrolliert auf Cloud umstellen.
6. LocalStorage nur noch als verschlüsselten Cache verwenden oder vollständig entfernen.
7. Erst danach produktive Bestandsdaten aus MaklerCRM migrieren.
