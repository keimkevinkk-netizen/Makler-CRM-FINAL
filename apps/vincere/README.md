# VINCERE – Real Estate Sales OS

VINCERE ist der modulare React-Neuaufbau des bestehenden MaklerCRM. Die Anwendung wird parallel zum Legacy-System entwickelt und ersetzt dieses erst nach kontrollierter Funktions- und Datenmigration.

## Enthaltene Foundation

- Premium Command Center im VINCERE-Design
- Next-Best-Action-Priorisierung
- Heute- und Follow-up-Zentrale
- Kontaktverwaltung mit lokaler Persistenz
- Vertriebspipeline
- geführter Telefon-Assistent mit Ergebnisprotokoll
- Immobilien- und Bewertungsübersicht
- Netzwerk, Kampagnen und Wissensbereich
- JSON-Backup
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

Diese Version ist eine **funktionale Frontend-Foundation mit LocalStorage**. Noch nicht enthalten sind zentrale Authentifizierung, Mandantentrennung, Cloud-Datenbank, produktive KI-Inferenz, echte Marktanbieter und die kontrollierte Migration der MaklerCRM-Bestandsdaten. Diese Bereiche werden in eigenen Arbeitspaketen ergänzt.
