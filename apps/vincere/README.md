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
- Repository-Schnittstelle für den späteren Cloud-Adapter
- responsive Desktop- und Mobile-Oberfläche
- TypeScript, ESLint, Vitest und Vite

## Lokal starten

```bash
npm install
npm run dev
```

## Qualität

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Architekturstatus

Diese Version besitzt eine **versionierte lokale Daten- und Identitätsfoundation**. Die React-Oberfläche greift nicht mehr unmittelbar auf einzelne LocalStorage-Schlüssel zu, sondern arbeitet über zentrale Store-Kommandos und ein `WorkspaceRepository`.

Noch nicht enthalten sind eine echte Authentifizierung, serverseitige Rollenprüfung, Cloud-Datenbank, produktive KI-Inferenz, echte Marktanbieter und die kontrollierte Migration der MaklerCRM-Bestandsdaten. Diese Bereiche werden in getrennten, prüfbaren Arbeitspaketen ergänzt.

Die Details stehen in `docs/VINCERE_DATA_ARCHITECTURE.md`.
