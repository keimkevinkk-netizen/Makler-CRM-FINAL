# VINCERE Beta-Readiness-Bericht

Stand: 14. Juli 2026  
Ausgangsbranch: `feat/vincere-beta-integration`  
Arbeitsbranch: `feat/vincere-beta-readiness`  
Zielgruppe: Kevin Keim und ausdrücklich freigegebene private Testnutzer

## Gesamtentscheidung

**Status: eingeschränkt beta-fähig. Kein Produktions-Go-live.**

Die im Integrationsbranch vorhandenen Kernfunktionen können nach erfolgreicher technischer und manueller Abnahme in einer geschützten privaten Beta getestet werden. Der vollständige, im Arbeitsauftrag beschriebene Funktionsumfang ist noch nicht integriert. Fehlende Fachmodule wurden deshalb nicht simuliert, sondern deaktiviert und als Blocker dokumentiert.

Eine Beta-Freigabe ist nur zulässig, wenn:

1. ein separates Supabase-Beta-Projekt in einer EU-Region bereitsteht,
2. alle drei VINCERE-Migrationen erfolgreich angewendet und die RLS-Verträge praktisch getestet wurden,
3. `VITE_APP_ENV=beta`, `VITE_DATA_MODE=live` und `VITE_ENABLE_MOCK_DATA=false` gesetzt sind,
4. ausschließlich Publishable-/Anon-Schlüssel im Browser verwendet werden,
5. mindestens Owner- und Viewer-Smoke-Tests erfolgreich abgeschlossen wurden,
6. Backup, Wiederherstellung, Supportweg und Rollback praktisch geprüft wurden.

## Was durch diesen Branch gehärtet wurde

- explizite Umgebungen `local`, `preview`, `beta`, `production`
- getrennte Datenmodi `demo` und `live`
- sichtbare Umgebungs- und Testdatenkennzeichnung
- konservative Feature-Flag-Registry
- Fail-closed-Verhalten für unkonfigurierte Beta- und Produktionsumgebungen
- Prüfung auf Service-Role- und Secret-Schlüssel im Browser
- Session- statt dauerhafter Speicherung von Auth-Tokens
- sitzungsgebundene Browser-Persistenz für Echtdaten
- getrennte Speicherbereiche für Demo-, Preview-, Beta- und Produktionsdaten
- zusätzlicher Schutz bei Workspace-Wechseln
- serverseitig gehärtete Rollenänderungen
- providerunabhängige und personenbezogen bereinigte Observability-Schnittstelle
- globale Frontend-, Netzwerk-, Auth-, Sync-, Konflikt- und Performance-Erfassung
- React Error Boundary
- seitenweises Laden großer relationaler Tabellen
- Lazy Loading und definierte Bundle-Grenzen
- Sicherheits- und Cache-Header für Netlify
- Tastaturkürzel, Fokusfalle, Fokuswiederherstellung und Escape-Verhalten für Dialoge
- sichtbare Fokuszustände und Unterstützung reduzierter Bewegung
- Größen- und Typprüfung für JSON-Importe
- ausführbare Sicherheits- und Beta-Ablaufverträge

## Gesamtaudit

| Bereich | Einstufung | Ergebnis und Grenze |
|---|---|---|
| Authentifizierung | Eingeschränkt beta-fähig | Supabase-Passwortanmeldung, Session-Restore, Logout und Membership-Auflösung vorhanden. Beta fällt ohne Cloud-Konfiguration geschlossen aus. Produktive Zugangsdaten und Rate-Limit-/MFA-Entscheidung fehlen noch. |
| Workspace-Isolation | Beta-fähige Grundlage | RLS nach `workspace_id`, relationale Fremdschlüssel und Client-Prüfungen vorhanden. Ein Workspace-Wechsel erzwingt ein erneutes Laden, bevor gespeichert werden darf. Praktischer Zwei-Workspace-Negativtest im Beta-Projekt bleibt Pflicht. |
| Rollen und Rechte | Eingeschränkt beta-fähig | Owner, Admin, Agent und Viewer vorhanden. Viewer-Schreibschutz ist getestet. Direkte Membership-DML wurde gesperrt; nur Owner kann Nicht-Owner-Rollen über eine kontrollierte RPC verwalten. Eine Eigentumsübertragung ist bewusst nicht implementiert. |
| Realtime | Blockiert | Keine produktive Subscription- oder Presence-Implementierung im Integrationsbranch. Flag bleibt deaktiviert. |
| Konfliktauflösung | Eingeschränkt beta-fähig | Workspace- und Datensatzrevisionen erkennen Konflikte und verhindern stilles Überschreiben. Eine interaktive Zusammenführung oder Wiederholungsoberfläche fehlt. |
| Kontakte | Beta-fähige Kernfunktion | Anlegen, Aktualisieren, Rollenprüfung, Audit und Cloud-Synchronisation vorhanden. Große Listen benötigen später Virtualisierung und serverseitige Suche. |
| Follow-ups | Beta-fähige Kernfunktion | Anlegen, erledigen und verschieben mit Kontaktkonsistenz und Audit vorhanden. Vollständige Daily-Execution-Integration fehlt im Integrationsbranch. |
| Immobilien | Beta-fähige Kernfunktion | Anlegen und Eigentümerkonsistenz vorhanden. Dokumente, Transaktionsraum und vollständige Objektprozesse fehlen. |
| Bewertungen | Blockiert für produktive Nutzung | Nur eine Grundseite ist vorhanden. Keine freigegebene Bewertungslogik, Quellenprüfung oder belastbare Marktdatenintegration. Experimentell/deaktiviert behandeln. |
| Termine | Eingeschränkt beta-fähig | Termine können angezeigt werden. Vollständige Anlage, Bearbeitung, Außendienst- und Vorbereitungsvorgänge fehlen. |
| Kommunikation | Blockiert | Keine freigegebene produktive E-Mail-, SMS-, Telefon- oder Provideranbindung. Providerfunktionen bleiben standardmäßig aus. |
| KI-Mock-Modus | Blockiert/Intern | Nur als ausdrücklich aktivierbares internes Flag vorbereitet. Keine produktive KI-Verbindung und kein freigegebener vollständiger Mock-Workflow. |
| Migration | Blockiert | Nur die interne V1-zu-V2-Workspace-Migration ist vorhanden. Der kontrollierte MaklerCRM-Importer ist nicht in den Integrationsbranch übernommen. |
| Datenqualität | Blockiert | Keine integrierte Datenqualitäts-, Dubletten- oder Integritätszentrale. |
| Netzwerk | Blockiert | Grundseite vorhanden, aber keine vollständige Netzwerkpartnerdomäne oder belastbare Workflows. |
| Forecast | Blockiert | Das Forecast-Arbeitspaket ist nicht in den Integrationsbranch übernommen. Keine erfundenen Wahrscheinlichkeiten wurden ergänzt. |
| Mobile Nutzung | Eingeschränkt beta-fähig | Responsive Shell und mobile Navigation sind vorhanden. Reale iPhone-/Android-Prüfung, Touch-Ziele, lange Formulare und Außendienstabläufe müssen manuell getestet werden. |
| Datenschutz | Blockiert für breitere Beta | Technische Datenminimierung, bereinigte Logs und Exportwarnung wurden verbessert. Die fachliche Einwilligungs-, Lösch-, Auskunfts- und Zugriffszentrale ist nicht integriert. Eine Datenschutzprüfung bleibt erforderlich. |
| Fehlerzustände | Beta-fähige Grundlage | Error Boundary, globale Fehlererfassung sowie Auth-, Netzwerk-, Sync-, Konflikt- und Providerkategorien vorhanden. Kein externer Monitoringanbieter ist ohne Konfiguration angebunden. |
| Leere Zustände | Eingeschränkt beta-fähig | Live-Workspaces starten leer statt mit Demodaten. Nicht jede Fachseite besitzt bereits einen vollständig handlungsorientierten Leerzustand. |
| Offlinezustände | Eingeschränkt beta-fähig | Offline/Online wird erkannt, Sync-Status wechselt sichtbar und Reconnect stößt erneutes Laden an. Es gibt keine dauerhafte Offline-Queue, keinen Service Worker und keine garantierte konfliktfreie Nachsynchronisation. |

## Feature-Flag-Entscheidung

### Stabil aktiviert

- Kontakte
- Follow-ups
- Immobilien

### Experimentell und nur kontrolliert freizugeben

- Termine
- Bewertungen
- Netzwerk
- Konfliktauflösung

### Deaktiviert

- Kommunikation
- Forecast
- Realtime
- Offline-Erfassung
- Legacy-Migration
- Datenqualität
- Datenschutz-Zentrale
- produktive Providerfunktionen

### Intern

- KI-Mock-Modus
- Mock-Daten
- Entwicklerfunktionen

In Produktion werden alle nicht stabilen Funktionen unabhängig von generischen Overrides deaktiviert. Produktive Providerfunktionen lassen sich ausschließlich über die eigene explizite Runtime-Konfiguration freigeben.

## Sicherheitsprüfung

### Verbessert

- keine unsichere HTML-Ausgabe oder `dangerouslySetInnerHTML` im geprüften Kern
- CSP blockiert fremde Skripte, Frames, Objekte und nicht freigegebene Verbindungen
- keine offenen Weiterleitungsparameter im geprüften Router
- Service-Role-/Secret-Schlüssel werden in der Browserkonfiguration abgelehnt
- Tokens liegen nur in `sessionStorage`
- Live-Arbeitsdaten liegen nur sitzungsgebunden im Browser und werden bei Abmeldung entfernt
- `index.html` wird mit `no-store` ausgeliefert; gehashte Assets dürfen unveränderlich gecacht werden
- Workspace-Wechsel blockiert Schreiben bis zum Laden des neuen Workspaces
- Import prüft Schema, Workspace, Dateityp und 10-MB-Limit
- Rollen- und Identitätsdaten werden durch Import nicht überschrieben
- Logs redigieren Tokens, E-Mail-Adressen, Telefonnummern, Adressen, Notizen und weitere personenbezogene Felder
- relationale Daten besitzen workspacegebundene Fremdschlüssel
- Viewer-Schreibzugriffe werden clientseitig und über RLS-Rollenverträge eingeschränkt

### Verbleibende Risiken

- Browser- und RLS-Tests ersetzen keinen externen Penetrationstest.
- Ein kompromittiertes Gerät oder Browserprofil kann während einer aktiven Sitzung weiterhin auf angezeigte Daten zugreifen.
- Es gibt noch keine MFA-Entscheidung, kein Session-Management-Dashboard und keine zentrale Sperrung kompromittierter Geräte.
- RLS muss im echten Beta-Projekt mit mindestens zwei Benutzern und zwei Workspaces negativ getestet werden.
- Dateiuploads sind noch nicht produktiv vorbereitet; vor Einführung sind MIME-Prüfung, Größenlimits, Malware-Prüfung, private Buckets und signierte URLs erforderlich.
- Datenexporte sind unverschlüsselte JSON-Dateien und müssen organisatorisch geschützt werden.

## Performanceprüfung

### Umgesetzt

- Feature-Routen werden lazy geladen.
- React-/Router- und Icon-Abhängigkeiten erhalten getrennte Chunks.
- Große Cloud-Tabellen werden in Seiten zu 500 Datensätzen geladen.
- Die globale Suche nutzt einen memoisierten Suchindex und `useDeferredValue`.
- Observability-Puffer ist begrenzt, um unbegrenzten Speicherverbrauch zu verhindern.
- Externe Google-Font-Abfragen wurden entfernt.
- Bootstrap-, Initial-Load- und Save-Dauern werden lokal messbar erfasst.

### Noch offen

- echte Bundlegrößen und Web-Vitals aus Preview/Beta erfassen
- serverseitige Suche bei großen Kontaktbeständen
- Listenvirtualisierung für mehrere Tausend Kontakte/Aktivitäten
- Pagination oder Archivierung sehr großer Audit- und Aktivitätshistorien
- Lasttest der Sync-RPC mit realistischen Datenmengen
- Prüfung wiederholter Renderings mit React Profiler
- Realtime-Subscription-Budget erst nach Integration festlegen

## Accessibilityprüfung

### Umgesetzt

- sichtbare `focus-visible`-Konturen
- Fokusfalle, Escape, Fokuswiederherstellung und beschriftete Dialoge
- `aria-live` für Lade-, Such- und Statusmeldungen
- beschriftete Hauptnavigation und Suchfelder
- deaktivierte Schreibaktionen für Viewer statt erst nach Klick zu scheitern
- Unterstützung von `prefers-reduced-motion`
- Tastaturbefehl `Ctrl/Cmd + K`

### Manuell zu prüfen

- vollständige Tastaturreise jeder Seite
- VoiceOver auf iPhone und Safari
- NVDA/Chrome oder vergleichbarer Desktop-Screenreader
- Kontrastmessung aller Zustände und Badge-Varianten
- Zoom auf 200 und 400 Prozent
- mobile Navigation bei 320 px Breite
- verständliche Feldfehler in allen noch zu integrierenden Formularen

## End-to-End- und Sicherheitsverträge

Ausführbar vorbereitet sind:

- Anmeldung
- Kontakt anlegen
- Follow-up anlegen
- Gespräch protokollieren
- Termin anzeigen
- Immobilie anlegen
- Konflikt auslösen
- Offline und Reconnect
- Viewer-Schreibschutz
- Datenexport
- kontrollierter Import
- Abmeldung
- Workspace-Isolation

Die Tests sind derzeit Vitest-basierte Integrations- und Ablaufverträge. Ein echter Browser-E2E-Lauf mit Playwright oder vergleichbarer Technologie ist noch nicht im Integrationsbranch vorhanden und bleibt vor einer breiteren Beta ein Blocker.

## Fehlende Zugangsdaten und Infrastruktur

- Supabase-Beta-Projekt-URL
- öffentlicher Publishable-/Anon-Key des Beta-Projekts
- Bestätigung der EU-Region
- Owner-Testkonto
- Viewer-Testkonto
- optional Agent- und Admin-Testkonten
- zweiter Test-Workspace für negative Isolationstests
- freigegebener Supportkanal
- freigegebener Backup-Aufbewahrungsort
- Monitoringanbieter nur bei späterer ausdrücklicher Entscheidung

Service-Role-Schlüssel gehören nicht in Netlify-Browser-Variablen und werden für diesen Client nicht benötigt.

## Manuelle Schritte vor privater Beta

1. Separates Supabase-Beta-Projekt in der EU erstellen.
2. Migrationen `202607140001`, `202607140002` und `202607140003` in Reihenfolge anwenden.
3. Owner-Benutzer anlegen und ersten Workspace über die kontrollierte Funktion erzeugen.
4. Viewer-Testnutzer anlegen und über die Owner-RPC hinzufügen.
5. Netlify-Preview/Beta-Umgebung mit den freigegebenen Variablen konfigurieren.
6. Prüfen, dass die Oberfläche eindeutig `PRIVATE BETA` und keine Testdatenkennzeichnung zeigt.
7. RLS-Negativtests mit zwei Workspaces durchführen.
8. Backup exportieren, Daten verändern und Wiederherstellung praktisch testen.
9. Mobile, Accessibility- und Browser-Smoke-Tests durchführen.
10. Supportweg und Rückmeldeformat an alle Testnutzer kommunizieren.

## Go-live-Abbruchkriterien

Beta oder Go-live sofort abbrechen, wenn mindestens eines zutrifft:

- ein Benutzer kann Daten eines fremden Workspaces lesen oder verändern
- Viewer kann irgendeine Mutation ausführen
- Service-Role-/Secret-Schlüssel erscheinen im Browserbundle oder in Logs
- Demo- und Echtdaten werden vermischt
- Abmeldung entfernt Sitzung oder lokale Echtdaten nicht zuverlässig
- Backup oder Wiederherstellung ist nicht nachweislich funktionsfähig
- Migrationen sind nicht vollständig oder RLS ist nicht aktiviert
- Konflikte überschreiben Daten stillschweigend
- kritische Frontendfehler verhindern Anmeldung, Kontaktarbeit oder Abmeldung
- personenbezogene Daten gelangen in technische Logs
- Support- oder Rollbackverantwortung ist nicht geklärt
- Datenschutzprüfung untersagt die vorgesehene Verarbeitung

## Rollback-Kurzplan

1. Beta-Zugang sperren oder Netlify-Beta-Site deaktivieren.
2. Produktive Provider- und experimentelle Feature Flags deaktivieren.
3. Letzten geprüften Frontend-Deploy wiederherstellen.
4. Schreibzugriffe im Supabase-Beta-Projekt temporär sperren, falls Datenintegrität unklar ist.
5. Datenbank aus dem letzten verifizierten Backup in eine neue isolierte Instanz wiederherstellen.
6. Ursache und betroffene Workspaces ohne personenbezogene Inhalte im technischen Incident-Protokoll erfassen.
7. Erst nach RLS-, Smoke-, Backup- und Isolationstest erneut freigeben.

Das alte MaklerCRM bleibt unverändert und ist weiterhin das operative Sicherheitsnetz. Es findet kein automatischer Rückimport aus VINCERE statt.
