# VINCERE Kommunikations- und Integrationszentrale

## Status dieses Arbeitspakets

Dieses Arbeitspaket schafft ausschließlich eine providerunabhängige Architektur, synthetische Mock-Daten, View-Modelle, lokale Entwurfsvorschauen und Tests.

Nicht enthalten sind:

- produktive E-Mail-, Kalender-, Telefonie-, SMS-, WhatsApp- oder Messaging-Anbieter
- produktive OAuth-Verbindungen oder Zugriffstoken
- echte Webhook-Endpunkte
- echter Nachrichtenversand
- echte Kalenderänderungen
- personenbezogene Testdaten
- konkurrierende lokale oder cloudbasierte Persistenz
- Änderungen an `AppStore.tsx`, `cloudRepository.ts`, `domain.ts`, Authentifizierung, SQL-Migrationen oder zentraler Routerkonfiguration

## Architektur

### Providerverträge

`src/integrations/communications/contracts.ts` definiert getrennte Verträge für:

1. E-Mail lesen
2. E-Mail senden
3. Kalender lesen
4. Termin erstellen
5. Telefonereignisse empfangen
6. Nachricht senden
7. Webhook-Ereignisse verarbeiten

Alle Operationen verwenden strukturierte Request- und Response-Typen. Der gemeinsame Ausführungskontext enthält Request-ID, Zeitstempel, Timeout, `AbortSignal`, Laufzeitmodus und ausschließlich eine nicht geheime Verbindungsreferenz.

Jedes Ergebnis enthält:

- Provider-Metadaten
- Authentifizierungsstatus
- Rate-Limit-Zustand
- Sync-Cursor
- Dauer und Request-ID
- strukturierten Fehlerzustand

`ProviderMetadata.serverOnly` ist verbindlich `true`. Echte Provideradapter dürfen später nicht im Browser implementiert werden.

### Sicherer Mock-Provider

`src/integrations/communications/mockProvider.ts` implementiert alle Verträge ausschließlich mit anonymen synthetischen Daten unter reservierten `.invalid`-Adressen.

Abgedeckte Zustände:

- eingehende und ausgehende E-Mail
- eingehende Messaging-Nachricht
- bestätigter Kalendereintrag
- abgesagter Termin
- verpasster Anruf
- unbekannter Absender
- doppelt zugestelltes Webhook-Ereignis
- Rate Limit
- Offlinezustand
- abgelaufene Verbindung
- Timeout
- abgebrochene Anfrage
- fortlaufender Sync-Cursor

Der Mock simuliert nur Ergebnisse. Er baut keine externe Verbindung auf.

### Kontaktzuordnung

`src/services/communications/contactMatching.ts` normalisiert E-Mail-Adressen und Telefonnummern und bewertet ausschließlich vorhandene Identifikatoren.

Kategorien:

- `definite`: vorhandene Kontakt-ID, eindeutige providergebundene externe ID oder übereinstimmende E-Mail- und Telefonsignale
- `probable`: genau ein eindeutiges normalisiertes Signal; keine automatische Zuordnung
- `manual_review`: doppelte, widersprüchliche oder veraltete Signale
- `unknown`: kein Treffer

Nur `definite` ist technisch als `autoAssignable: true` markiert. Es findet keine automatische Kontaktzusammenführung statt.

### Idempotenz

`src/services/communications/idempotency.ts` stellt einen begrenzten In-Memory-Ledger und providergebundene Idempotenzschlüssel bereit.

Produktiv muss dieselbe Logik später serverseitig und transaktional in einer dauerhaften Infrastruktur umgesetzt werden. Der lokale Ledger ist nur eine deterministische Vertrags- und Testgrundlage und keine neue CRM-Persistenz.

### Gemeinsame Kommunikationshistorie

`src/services/communications/timeline.ts` vereinheitlicht:

- E-Mails
- Messaging-Ereignisse
- Telefonereignisse
- Termine
- CRM-Aktivitäten

Die Sortierung erfolgt deterministisch nach Zeitpunkt, Kanalrang und stabiler Ereignis-ID. Das View-Modell kann später im Kontaktcockpit verwendet werden, ohne die vorhandenen Domänentypen oder die bestehende Persistenz in diesem Arbeitspaket zu verändern.

### Kommunikationszentrale

`src/features/communications/CommunicationHubPage.tsx` zeigt:

- ungelesene Nachrichten
- verpasste Anrufe
- heutige Termine einschließlich Absagen
- Kontakte mit ausstehender Antwort
- nicht eindeutig zuordenbare Kommunikation
- fehlgeschlagene Synchronisationen
- zuletzt synchronisierte Provider
- Authentifizierungs-, Rate-Limit-, Cursor- und Verbindungsstatus
- die vereinheitlichte Kommunikationshistorie
- lokale Vorlagen und Entwurfsvorschauen

Die Seite enthält keine Versandaktion. Viewer können Vorlagen weder ändern noch eine Vorschau neu erzeugen.

## Vorlagen

Folgende lokale Vorlagen sind enthalten:

- Terminbestätigung
- Follow-up
- Rückrufbitte
- Bewertungsnachricht
- Nachfassnachricht
- Empfehlungsanfrage
- Absage
- Terminverschiebung

Jeder erzeugte Entwurf besitzt:

- `status: local_preview`
- `sendAllowed: false`
- `storage: memory_only`

## Datenschutz- und Sicherheitsgrenzen

### Browser

Im Browser zulässig:

- providerunabhängige Typen
- nicht geheime Verbindungs-IDs
- normalisierte View-Modelle
- lokale Entwurfsvorschauen
- sichtbare Verbindungs- und Fehlerzustände

Im Browser unzulässig:

- Providergeheimnisse
- produktive OAuth-Zugangsdaten
- Signaturschlüssel für Webhooks
- produktive Provider-SDKs mit privilegierten Rechten
- automatische Versand- oder Terminaktionen
- ungeprüfte automatische Kontaktzuordnung

### Server

Produktive Adapter müssen später serverseitig übernehmen:

- OAuth-Autorisierung und Tokenrotation
- verschlüsselte Speicherung von Verbindungsdaten
- Webhook-Signaturprüfung
- Provider-Timeouts und Retry-Strategien
- transaktionale Idempotenz
- Rate-Limit-Koordination
- Datenminimierung und Löschkonzepte
- Auditierung ausdrücklicher Benutzeraktionen
- Mandanten- und Workspace-Isolation

### Datenhaltung

Vor einer produktiven Integration sind festzulegen:

- welche Nachrichteninhalte gespeichert werden dürfen
- ob nur Metadaten oder vollständige Inhalte synchronisiert werden
- Aufbewahrungs- und Löschfristen
- Zweckbindung pro Kommunikationskanal
- Berechtigungen für Viewer, Makler, Administratoren und Owner
- Export-, Auskunfts- und Löschprozesse
- Rechtsgrundlage und Auftragsverarbeitung je Anbieter

## Dokumentierte spätere Integrationspunkte

Aufgrund der Dateigrenzen wurden diese Punkte absichtlich nicht umgesetzt:

1. `src/app/App.tsx`: Route `/communications` für `CommunicationHubPage` ergänzen.
2. `src/app/navigation.tsx`: Navigationseintrag für die Kommunikationszentrale ergänzen.
3. Kompositionsschicht außerhalb von `AppStore.tsx`: aktuelle Workspace-ID, Benutzerrolle und Providerstatus an das Feature übergeben.
4. Kontaktcockpit: `CommunicationTimelineItem[]` als reine Ansicht einbinden.
5. Bestehende Repository-Schicht: erst nach eigener Freigabe Adapter für vorhandene Kontakte, Termine, Telefonereignisse und CRM-Aktivitäten ergänzen.
6. Server-/Function-Schicht: produktive Provideradapter, OAuth-Callbacks und verifizierte Webhooks implementieren.
7. Persistenz: erst nach Datenmodellentscheidung Tabellen, RLS, Auditierung und Retention separat planen.

## Tests

Die Tests unter `apps/vincere/tests/` prüfen:

- Providerverträge und Browser-Geheimnisgrenze
- Mock-Daten und Mock-Provider
- Offline-, Rate-Limit-, Timeout- und Authentifizierungsfehler
- abgebrochene Requests
- Sync-Cursor
- doppelte Ereignisse und Idempotenz
- Normalisierung und Kontaktzuordnung
- unbekannte, wahrscheinliche und widersprüchliche Treffer
- deterministische Timeline
- Kommunikationszentrale
- Viewer ohne Versandaktion
- lokale, nicht versendbare Vorlagen

## Produktionsreife

Die Architektur ist als sichere Integrationsgrundlage gedacht, nicht als produktive Kommunikationslösung. Vor Aktivierung eines echten Providers sind Threat Modeling, Datenschutzprüfung, Provider-DPA/AVV, serverseitige Geheimnisverwaltung, Workspace-Isolation, Auditierung, Zustimmungs- und Löschprozesse sowie Last- und Fehlerfalltests erforderlich.
