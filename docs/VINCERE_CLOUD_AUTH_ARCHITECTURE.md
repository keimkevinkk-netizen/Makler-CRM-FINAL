# VINCERE – Cloud-, Auth- und Mandantenarchitektur

## Ziel

VINCERE bleibt lokal arbeitsfähig, kann aber nach Konfiguration Daten authentifiziert in einem Supabase/PostgreSQL-Backend speichern. Die Mandantentrennung wird nicht nur in React simuliert, sondern in PostgreSQL durch Row Level Security erzwungen.

## Sicherheitsmodell

```text
Benutzeranmeldung
→ Supabase Auth Access Token
→ workspace_members
→ Workspace-Rolle
→ PostgreSQL Row Level Security
→ workspace_snapshots
```

Der Browser erhält ausschließlich den öffentlichen Publishable-/Anon-Key. Ein Service-Role-Key darf niemals in `VITE_*`-Variablen, im Browser-Bundle oder im Repository liegen.

## Datenfluss

```text
React Store
→ lokaler versionierter Cache
→ SupabaseWorkspaceCloudRepository
→ PostgREST/RPC
→ RLS-Prüfung über auth.uid()
→ optimistisch versionierter Workspace-Snapshot
```

Bei einer nicht passenden Snapshot-Version wird nicht überschrieben. Der Server meldet einen `version conflict`, den die Oberfläche als Konfliktstatus ausweist.

## Rollen

| Rolle | Lesen | Operativ schreiben | Mitglieder verwalten | Backups/Administration |
|---|---:|---:|---:|---:|
| owner | ja | ja | ja | ja |
| admin | ja | ja | ja | ja |
| agent | ja | ja | nein | eingeschränkt im Frontendvertrag |
| viewer | ja | nein | nein | nein |

Die Datenbankrichtlinien erlauben Snapshot-Schreibzugriffe nur für `owner`, `admin` und `agent`. `viewer` erhält nur Leserechte.

## Einrichtung einer nicht produktiven Umgebung

1. Separates Supabase-Projekt für VINCERE-Staging erstellen.
2. Migration `apps/vincere/supabase/migrations/202607140001_vincere_core.sql` ausführen.
3. Einen Benutzer über Supabase Auth anlegen.
4. Nach dessen Anmeldung einmalig `create_vincere_workspace(name, region)` aufrufen.
5. In Netlify ausschließlich setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Deploy-Preview prüfen, bevor irgendeine produktive Domain oder produktive Datenquelle verbunden wird.

## Lokaler Modus

Fehlen die beiden Umgebungsvariablen, startet VINCERE bewusst im lokalen Entwicklungsmodus. Es wird dann keine scheinbare Cloud-Sicherheit vorgetäuscht. Sobald beide Variablen gesetzt sind, wird die Anwendung durch die Anmeldemaske geschützt.

## Konflikt- und Offline-Verhalten

- Cloud nicht erreichbar: lokale Daten bleiben erhalten, Status wird `offline`.
- Parallele Änderung mit abweichender Version: Status wird `conflict`; kein stilles Überschreiben.
- Fremder Workspace im Payload: Laden wird abgebrochen.
- Benutzer ohne `workspace_members`-Eintrag: Anmeldung wird nicht für VINCERE freigeschaltet.
- Ungültige oder abgelaufene Sitzung: lokales Sitzungstoken wird entfernt.

## Noch nicht Bestandteil dieses Pakets

- produktives Supabase-Projekt
- produktive Benutzerkonten
- E-Mail-Einladungsworkflow
- Passwort-zurücksetzen-Oberfläche
- MFA/Passkeys
- fein granular normalisierte Tabellen für Kontakte, Aufgaben und Objekte
- Realtime-Zusammenarbeit mehrerer Benutzer
- Migration der produktiven MaklerCRM-Daten
- Merge oder Production-Deployment

## Nächste technische Ausbaustufe

Nach Freigabe dieser Grundlage werden die Workspace-Snapshots schrittweise in normalisierte Tabellen überführt. Kontakte, Follow-ups, Objekte und Aktivitäten erhalten dann eigene RLS-geschützte Tabellen, Transaktionen und Konfliktregeln.
