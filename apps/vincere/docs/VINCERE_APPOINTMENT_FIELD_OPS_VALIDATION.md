# Validierung der Termin- und Außendienstzentrale

Der Draft-PR wird als kombinierter Merge-Stand gegen den jeweils aktuellen Branch `feat/vincere-communication-hub` geprüft.

Verbindliche Qualitätskommandos:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Zusätzlich wurde die reine Termin-Engine vor dem Push in einer isolierten strikten TypeScript-Prüfung sowie mit einem direkten Runtime-Check für deterministische Sortierung, Konflikterkennung und Viewer-Schreibschutz validiert.

Die zentrale Routeranbindung bleibt bewusst einem späteren Integrationspaket vorbehalten, da die Routerkonfiguration in diesem Arbeitspaket nicht verändert werden darf.
