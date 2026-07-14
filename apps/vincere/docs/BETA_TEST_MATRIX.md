# VINCERE Beta-Testmatrix

## Automatisierte Prüfungen

| Szenario | Testdatei | Abdeckung | Freigabebedeutung |
|---|---|---|---|
| Anmeldung | `tests/beta-e2e-contracts.test.tsx` | Tokenantwort, Session-Speicherung, Membership-Auflösung | Auth-Grundvertrag |
| Kontakt anlegen | `tests/beta-e2e-contracts.test.tsx` | Mutation, ID, Audit | Kernablauf |
| Follow-up anlegen | `tests/beta-e2e-contracts.test.tsx` | Kontaktbeziehung und Speicherung | Kernablauf |
| Gespräch protokollieren | `tests/beta-e2e-contracts.test.tsx` | Call Event und letzter Kontakt | Kernablauf |
| Termin anzeigen | `tests/beta-e2e-contracts.test.tsx` | Terminmodell und Bereitstellung | Eingeschränkter Ablauf |
| Immobilie anlegen | `tests/beta-e2e-contracts.test.tsx` | Eigentümerbeziehung | Kernablauf |
| Konflikt auslösen | `tests/beta-e2e-contracts.test.tsx`, `tests/cloud-repository.test.ts` | Workspace-/Datensatzrevision verhindert Überschreiben | Kritisch |
| Offline und Reconnect | `tests/beta-e2e-contracts.test.tsx` | Netzwerkereignisse und Observability | Eingeschränkt |
| Viewer-Schreibschutz | `tests/beta-e2e-contracts.test.tsx`, `tests/security-boundaries.test.ts` | Clientberechtigung verweigert Mutation | Kritisch |
| Datenexport | `tests/beta-e2e-contracts.test.tsx` | versioniertes Workspace-Envelope | Kritisch |
| Kontrollierter Import | `tests/beta-e2e-contracts.test.tsx`, `tests/repository.test.ts` | Schema, Workspace und Identität | Kritisch |
| Abmeldung | `tests/beta-e2e-contracts.test.tsx` | Sitzungstoken wird entfernt | Kritisch |
| Workspace-Isolation | `tests/beta-e2e-contracts.test.tsx`, `tests/security-boundaries.test.ts`, `tests/cloud-repository.test.ts` | getrennte Speicher und Load-before-save | Kritisch |
| Runtime-Konfiguration | `tests/runtime-config.test.ts` | Beta-Fail-closed, HTTPS, Secret-Abwehr | Kritisch |
| Feature Flags | `tests/feature-flags.test.ts` | konservative Defaults und Produktionssperren | Kritisch |
| Observability | `tests/observability.test.ts` | PII-/Token-Redaktion und Speicherlimit | Kritisch |
| RLS-Verträge | `tests/relational-schema.test.ts`, `tests/workspace-role-security.test.ts` | Tabellen, Policies, Revisionen und Owner-Schutz | Kritisch |

## Befehle

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:security
npm run test:e2e
npm run audit:beta
```

`npm test` führt alle Vitest-Dateien aus. Die separaten Sicherheits- und E2E-Befehle ermöglichen gezielte Wiederholungen und eindeutige Freigabenachweise.

## Manuelle Browser-Smoke-Tests

Automatisierte Verträge ersetzen nicht die Prüfung des ausgelieferten Browsersystems. Vor Beta-Freigabe sind mindestens folgende Tests erforderlich:

1. Anmeldung als Owner und Viewer im echten Supabase-Beta-Projekt.
2. Direkter URL-Aufruf jeder freigegebenen Route nach Login.
3. Browser-Neuladen während synchronisierter und während offline geänderter Zustände.
4. Zwei parallele Browserfenster zur Konflikterzeugung.
5. Zwei Benutzer und zwei Workspaces für negative RLS-Prüfungen.
6. Tastaturreise ohne Maus einschließlich Dialoge und Command Palette.
7. VoiceOver auf iPhone/Safari.
8. Responsive Prüfung bei 320, 375, 768 und 1440 Pixel Breite.
9. CSP-, Cache- und Sicherheitsheader im Network-Panel.
10. Prüfung, dass Browserbundle und Requests keine Service-Role- oder Secret-Schlüssel enthalten.
11. Exportdatei öffnen und erwarteten personenbezogenen Umfang prüfen.
12. Abmeldung und Prüfung von `sessionStorage`, Netzwerkcache und zurückbleibender UI.

## Noch nicht abgedeckt

- echter Browser-E2E-Runner wie Playwright
- produktive Realtime-Subscriptions
- dauerhafte Offline-Queue und Service Worker
- vollständige Konfliktauflösungsoberfläche
- Datei-Uploads
- produktive Kommunikationsprovider
- vollständiger Legacy-Importer
- Datenqualitäts- und Datenschutz-Zentrale
- Lasttests mit realistischen fünf- bis sechsstelligen Aktivitätsmengen

Diese Punkte sind keine stillen Lücken, sondern dokumentierte Blocker oder spätere Arbeitspakete.
