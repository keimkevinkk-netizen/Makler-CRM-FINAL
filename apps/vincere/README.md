# VINCERE – Real Estate Sales OS

VINCERE ist der modulare React-Neuaufbau des bestehenden MaklerCRM. Die Anwendung wird parallel zum Legacy-System entwickelt und ersetzt dieses erst nach kontrollierter Funktions- und Datenmigration.

## Enthaltene Foundation

- Premium Command Center im VINCERE-Design
- Next-Best-Action-Priorisierung
- Heute- und Follow-up-Zentrale
- Kontaktverwaltung mit stabilen IDs
- Vertriebspipeline
- geführter Telefon-Assistent mit Ergebnisprotokoll
- Immobilien- und Bewertungsübersicht
- Netzwerk, Kampagnen und Wissensbereich
- versionierte Workspace-Sicherungen
- lokale V1→V2-Datenmigration
- Workspace-, Benutzer- und Rollenverträge
- zentrale Berechtigungsprüfungen für Mutationen
- lokales Audit-Protokoll
- Supabase-Auth-Integration ohne Service-Role-Key im Browser
- PostgreSQL Row Level Security für echte Workspace-Trennung
- eigene relationale Tabellen für Kontakte, Follow-ups, Immobilien, Termine, Telefon- und Auditereignisse
- Datensatz- und Workspace-Versionierung gegen stilles Überschreiben
- lokaler Cache und Offline-Fallback
- responsive Desktop- und Mobile-Oberfläche
- TypeScript, ESLint, Vitest und Vite

## Lokal starten

```bash
npm install
npm run dev
```

Ohne Cloud-Umgebungsvariablen startet VINCERE bewusst im lokalen Entwicklungsmodus.

Für eine Cloud-Testumgebung:

```bash
cp .env.example .env.local
```

Danach ausschließlich `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` setzen. Niemals einen Supabase-Service-Role-Key in einer `VITE_*`-Variable verwenden.

## Qualität

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Architekturstatus

Die React-Oberfläche arbeitet über zentrale Store-Kommandos, ein lokales `WorkspaceRepository` und einen optionalen, authentifizierten Cloud-Adapter. Sobald die Supabase-Konfiguration vorhanden ist, schützt eine Anmeldemaske die Anwendung. Die Workspace-Zugehörigkeit wird aus `workspace_members` geladen und Datenzugriffe werden zusätzlich durch PostgreSQL Row Level Security abgesichert.

Operative Cloud-Daten werden nach der zweiten Migration nicht mehr als ein großer Workspace-Snapshot gespeichert. Der relationale Adapter synchronisiert nur neue, geänderte oder gelöschte Fachdatensätze und prüft dabei sowohl die Workspace-Revision als auch die jeweilige Datensatzversion.

Noch nicht enthalten sind ein produktives Supabase-Projekt, produktive Benutzerkonten, MFA/Passkeys, Realtime-Abonnements, eine visuelle Konfliktzusammenführung, produktive KI-Inferenz, echte Marktanbieter und die kontrollierte Migration der MaklerCRM-Bestandsdaten.

Weitere Dokumentation:

- `docs/VINCERE_DATA_ARCHITECTURE.md`
- `docs/VINCERE_CLOUD_AUTH_ARCHITECTURE.md`
- `docs/VINCERE_RELATIONAL_DATA_ARCHITECTURE.md`
- `supabase/migrations/202607140001_vincere_core.sql`
- `supabase/migrations/202607140002_relational_workspace_data.sql`
