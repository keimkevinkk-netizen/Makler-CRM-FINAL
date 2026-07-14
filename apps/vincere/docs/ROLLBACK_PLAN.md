# VINCERE – Kontrollierter Rollbackplan

## Ziel

Dieser Plan gilt für Preview und private Beta. Er beschreibt keinen automatischen Rollback und ersetzt keine geprüfte Datenbank-Wiederherstellungsanweisung. Produktion ist durch diesen Branch nicht freigegeben.

## Auslöser

Rollback oder sofortiger Beta-Stopp ist verpflichtend bei:

- fremdem Workspace-Zugriff
- erfolgreicher Viewer-Mutation
- Secret oder Service-Role-Key im Browser
- unbemerktem Datenverlust oder stiller Konfliktüberschreibung
- Vermischung von Demo- und Echtdaten
- nicht funktionierender Abmeldung
- personenbezogenen Daten in technischen Logs
- nicht wiederherstellbarem Backup
- kritischer Auth-, RLS- oder Migrationserosion
- unklarer Datenschutzlage

## Sofortmaßnahmen

1. Neue Anmeldungen und Testaktivitäten stoppen.
2. Netlify-Beta-Site deaktivieren oder auf den letzten geprüften Deploy zurücksetzen.
3. `VITE_ENABLE_PROVIDER_FUNCTIONS=false` setzen.
4. Experimentelle Flags deaktivieren.
5. Bei möglicher Datenkorruption Schreibzugriffe im Supabase-Beta-Projekt sperren.
6. Zeitpunkt, betroffene Release-SHA und Fehlerkategorie dokumentieren.
7. Keine personenbezogenen Inhalte in GitHub-Issues, Logs oder Screenshots kopieren.

## Frontend-Rollback

1. Letzten erfolgreichen, manuell freigegebenen Deploy identifizieren.
2. Prüfen, dass dessen Environment-Variablen weiterhin auf das Beta-Projekt und nicht auf Produktion zeigen.
3. Deploy wiederherstellen.
4. Anmeldung, Workspace-Isolation, Viewer-Schutz und Abmeldung erneut testen.
5. Erst danach den Beta-Zugang wieder öffnen.

## Datenbank-Rollback

Datenbankmigrationen werden nicht blind rückwärts ausgeführt. Schema- und Datenrollback erfolgt über eine isolierte Wiederherstellung:

1. Aktuelles Beta-Projekt unverändert sichern und für Analyse markieren.
2. Letztes verifiziertes Backup in ein neues isoliertes Supabase-Projekt wiederherstellen.
3. Migrationen und RLS-Policies gegen den erwarteten Stand prüfen.
4. Zwei-Workspace- und Rollen-Negativtests durchführen.
5. Datenanzahl und Stichproben für Kontakte, Follow-ups, Immobilien, Termine, Calls und Audit Events vergleichen.
6. Neue Projekt-URL und Publishable Key erst nach Freigabe in der Beta-Umgebung setzen.
7. Das beschädigte Projekt nicht wiederverwenden, bevor Ursache und Umfang geklärt sind.

## Umgang mit Migration `202607140003`

Die Rollen-Härtung entfernt direkte Browser-Schreibrechte auf `workspace_members`. Sie soll nicht durch Wiederherstellen der alten offenen Policy zurückgenommen werden. Falls die kontrollierte RPC fehlerhaft ist, bleibt Rollenverwaltung gesperrt und wird bis zur Korrektur manuell durch einen autorisierten Datenbankadministrator durchgeführt.

## Datenexporte

Workspace-JSON-Exporte sind kein vollständiger Ersatz für Datenbankbackups. Sie können für gezielte Wiederherstellung einzelner Workspaces verwendet werden, wenn:

- Schema und Workspace-ID validiert sind,
- die Identität aus dem Zielsystem erhalten bleibt,
- der Import zunächst in einer isolierten Umgebung getestet wird,
- anschließend RLS- und Integritätsprüfungen erfolgen.

## Kommunikationsweg

- Verantwortlicher für technischen Stopp: vor Beta benennen
- Verantwortlicher für Supabase-Wiederherstellung: vor Beta benennen
- Verantwortlicher für Datenschutzbewertung: vor Beta benennen
- Supportkanal für Testnutzer: vor Beta benennen

Testnutzer erhalten bei einem Stopp nur die notwendige Information, keine technischen Details mit personenbezogenen Inhalten.

## Wiederfreigabekriterien

Eine erneute Freigabe ist nur zulässig, wenn:

- Ursache reproduziert und behoben ist,
- Typecheck, Lint, Tests, Security-Tests, E2E-Verträge und Build erfolgreich sind,
- Backup/Wiederherstellung geprüft ist,
- Zwei-Workspace-Isolation erfolgreich ist,
- Owner- und Viewer-Smoke-Test erfolgreich sind,
- Abbruchkriterium nicht mehr zutrifft,
- der neue Commit und Deploy dokumentiert sind.

## Sicherheitsnetz

Das alte MaklerCRM bleibt unverändert. Während eines VINCERE-Rollbacks wird es weiterhin separat genutzt. Es findet kein automatischer Datenaustausch zwischen beiden Systemen statt.
