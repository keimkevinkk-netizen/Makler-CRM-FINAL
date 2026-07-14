# VINCERE Mobile PWA und sichere Offline-Erfassung

## Ziel und Sicherheitsgrenze

Dieses Arbeitspaket bereitet VINCERE als installierbare mobile Progressive Web App vor. Es führt bewusst **keine produktive Offline-Datenbank**, **keine Hintergrundsynchronisation**, **keine Push-Nachrichten** und **keinen zweiten Schreibpfad** ein.

Temporäre Follow-up-, Gesprächs- und Notizentwürfe existieren ausschließlich im React-Arbeitsspeicher der laufenden Sitzung. Sie gelten weder als gespeichert noch als synchronisiert. Ein Neuladen, Abmelden oder Workspace-/Benutzerwechsel verwirft diese Entwürfe.

## Umgesetzte PWA-Grundlage

- Web-App-Manifest mit VINCERE-Metadaten, Standalone-Modus, Theme-Farbe und App-Shortcuts
- App-Icons als skalierbare, maskierbare VINCERE-Symbole
- iOS-/Android-Metadaten und Safe-Area-Unterstützung
- kontrollierte Service-Worker-Registrierung
- sichtbare Version `0.1.0-mobile-pwa.1`
- Update-Erkennung mit bewusstem Aktualisieren über `SKIP_WAITING`
- keine automatische Aktualisierung, solange lokale Entwürfe vorhanden sind

Vor einer produktiven Veröffentlichung sollten zusätzlich native PNG-Icons in 192 × 192, 512 × 512 und 180 × 180 Pixel erzeugt werden. Die aktuellen SVG-Dateien bilden die providerunabhängige Grundlage.

## Cache-Strategie

Der Service Worker speichert ausschließlich öffentliche, statische App-Shell-Ressourcen.

### Erlaubt

- HTML-App-Shell
- Manifest
- statische JavaScript- und CSS-Bundles
- öffentliche Icons, Bilder und Fonts derselben Origin

### Ausgeschlossen

- alle Nicht-GET-Anfragen
- Supabase Auth, REST, Realtime, Storage und Functions
- Netlify Functions
- `/api/`-Routen
- Requests mit `Authorization`, `apikey` oder `x-client-info`
- JSON-Antworten
- Antworten mit `private` oder `no-store`
- Cross-Origin-Requests

Der Service Worker besitzt keine Kenntnis von Tokens, Benutzern, Workspaces oder Fachdaten. Es existiert kein Background-Sync-Handler.

## Mobile Navigation

Die feste Bottom-Navigation enthält:

1. Heute
2. Kontakte
3. Anruf
4. Termine
5. Immobilien
6. Mehr

Die Navigation verwendet ausschließlich bereits vorhandene Routen. Die zentrale Routerdefinition wurde nicht verändert. Bis ein eigenständiger Terminbereich im Zielbranch integriert ist, öffnet „Termine“ den vorhandenen Heute-Bereich mit `?mobile=appointments`.

Der Bereich „Mehr“ verlinkt Übersicht, Pipeline, Bewertungen, Netzwerk, Kampagnen, Wissen, Konflikte, Team und Einstellungen.

## Mobile Schnellaktionen

- Kontakt suchen
- Kontakt direkt über `tel:` anrufen
- Follow-up temporär vorbereiten
- Gesprächsergebnis temporär vorbereiten
- nächstes Terminbriefing öffnen
- Immobilienbereich öffnen
- Notiz temporär vorbereiten
- nächste Aktion öffnen

Temporäre Erfassungen enthalten in der Warteschlange nur Metadaten. Die eigentlichen Texte verbleiben im Arbeitsspeicher und werden nicht in LocalStorage, IndexedDB, Cache Storage oder dem Service Worker abgelegt.

## Offline-Warteschlange

`src/features/offline/offlineQueue.ts` ist eine reine, deterministische Logik ohne I/O. Jeder Eintrag enthält:

- Aktionstyp
- Zeitpunkt
- Workspace- und Benutzerbezug
- Datensatz-ID
- erwartete Cloud-Version
- Wiederholungsanzahl
- Fehlerstatus
- Konfliktstatus
- Abbruchstatus

Die Warteschlange:

- sortiert stabil nach Zeitpunkt und ID
- verhindert doppelte aktive Aktionen
- trennt Benutzer und Workspaces
- erkennt mögliche Versionskonflikte
- führt keine Aktion selbst aus
- besitzt keine Persistenz
- mutiert die Cloud nicht automatisch

## Wahrheitsgemäße Zustände

Die mobile Statusanzeige unterscheidet:

- offline
- lokale Änderungen ausstehend
- Synchronisation pausiert
- Konflikt möglich
- Verbindung wiederhergestellt
- Update verfügbar
- letzter bestätigter Cloud-Stand

Ein lokaler Entwurf wird nie als „synchronisiert“ bezeichnet. Auch nach Wiederherstellung der Verbindung bleibt die Synchronisation pausiert, bis eine spätere Integrationsschicht den Entwurf bewusst geprüft und über den bestehenden Store gespeichert hat.

## Abmeldung und Workspace-Wechsel

Temporäre Zustände werden durch drei Schutzebenen entfernt:

1. React-Arbeitsspeicher verschwindet beim Unmount der authentifizierten App.
2. Wechsel von Workspace oder Benutzer wird anhand der Identität erkannt und leert Warteschlange sowie Entwürfe.
3. Ein späterer Auth-Adapter kann vor Abschluss der Abmeldung das Event `vincere:logout` senden. Der Mobile Runtime löscht dann sofort alle temporären Zustände und sendet `CLEAR_TEMPORARY_STATE` an den Service Worker.

Da der Service Worker keine Fachdaten cached, werden beim Logout keine statischen App-Ressourcen gelöscht. Temporäre Cache-Namensräume sind vorbereitet, werden aktuell aber nicht genutzt.

## Sperrbildschirm- und Gerätesicherheit

Eine installierte PWA ist kein Ersatz für Geräteschutz. Produktive Nutzung erfordert:

- PIN, biometrische Sperre und kurze automatische Displaysperre
- keine vertraulichen Daten in Push-Vorschauen
- keine dauerhaft sichtbaren sensiblen Notizen im App-Switcher
- erneute Authentifizierung für besonders sensible Aktionen
- serverseitige Session-Laufzeiten und Token-Widerruf
- Mobile-Device-Management bei verwalteten Firmengeräten

Dieses Arbeitspaket implementiert keine eigene App-PIN und keine biometrische WebAuthn-Sperre.

## Sichere Update-Strategie

- neue Service-Worker-Version wird zunächst installiert und wartet
- Update-Hinweis wird sichtbar
- Nutzer löst Aktualisierung bewusst aus
- `controllerchange` lädt die App genau einmal neu
- alte statische Cache-Versionen werden bei Aktivierung entfernt
- lokale Entwürfe blockieren den Update-Hinweis zugunsten des wichtigeren Sicherheitsstatus

Vor einem produktiven Rollout sind zusätzlich Rollback, Build-ID, Release Notes und Telemetrie für fehlgeschlagene Service-Worker-Aktivierungen erforderlich.

## Spätere Integrationen

Folgende Arbeiten sind ausdrücklich nicht Teil dieses PRs:

1. **Kanonische Übernahme temporärer Entwürfe**
   - Review-Dialog
   - Rollenprüfung
   - Speicherung ausschließlich über bestehende AppStore-Kommandos
   - erwartete Datensatzversion statt nur Workspace-Revision
   - explizite Konfliktentscheidung

2. **Produktive Offline-Persistenz**
   - verschlüsselte IndexedDB nur nach Security-Review
   - Workspace- und Benutzerpartitionierung
   - Schlüsselverwaltung außerhalb des Service Workers
   - Aufbewahrungs- und Löschfristen
   - Schutz vor Gerätebackup und gemeinsam genutzten Browserprofilen

3. **Terminmodus**
   - eigene bestehende Terminroute aus dem Appointment-/Field-Ops-Arbeitspaket verwenden
   - Query-Übergang entfernen, sobald diese Route im gemeinsamen Zielbranch vorhanden ist

4. **Abmeldeintegration**
   - AuthContext soll unmittelbar vor Session-Löschung `window.dispatchEvent(new Event('vincere:logout'))` auslösen
   - keine Änderung im aktuellen Auth-Arbeitspaket

5. **Push-Nachrichten**
   - serverseitige Subscription-Verwaltung
   - Einwilligung und granularer Opt-in
   - keine personenbezogenen Inhalte im Notification-Text
   - Mandantentrennung und Widerruf

6. **Installationshinweis**
   - optionales `beforeinstallprompt`-UI erst nach UX-Prüfung
   - iOS-Anleitung getrennt von Chromium

## Tests

Abgedeckt sind:

- Manifest und Installationsmetadaten
- Service-Worker-Cache-Ausschlüsse
- Updatevertrag
- Offline- und Reconnect-Zustände
- letzter bestätigter Cloud-Stand
- Warteschlangenreihenfolge
- doppelte Aktionen
- Wiederholung, Fehler, Konflikt und Abbruch
- Abmeldung
- Benutzer- und Workspace-Wechsel
- mobile Hauptnavigation
- kleine Viewports, Safe Areas und Touch-Ziele

Die Repository-CI führt im Ordner `apps/vincere` aus:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
