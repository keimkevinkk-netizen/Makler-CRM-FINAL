# VINCERE Termin-, Besichtigungs- und Außendienstzentrale

## Ziel

Dieses Arbeitspaket ergänzt VINCERE um eine additive, deterministische Arbeitsgrundlage für Eigentümertermine, Bewertungstermine, Besichtigungen, Netzwerktermine, Telefontermine sowie deren Vor- und Nachbereitung.

Die Umsetzung erzeugt keine Abschlusswahrscheinlichkeiten, keine Marktwerte, keine Fahrzeiten und keine nicht vorhandenen Kontaktdaten. Fehlende Informationen werden sichtbar als fehlend oder nicht prüfbar ausgewiesen.

## Dateigrenzen

Die Umsetzung liegt ausschließlich in:

- `src/domain/appointments/`
- `src/features/appointments/`
- `src/features/field-ops/`
- `tests/`
- `docs/`

Nicht verändert wurden:

- `AppStore.tsx`
- `cloudRepository.ts`
- `types/domain.ts`
- Authentifizierung und Rollenfoundation
- SQL-Migrationen
- zentrale Router- und Navigationskonfiguration
- Providerverträge des Kommunikations-Hubs
- die alte Root-`index.html`

## Bestehende Datengrundlage

Das aktuelle Terminmodell enthält nur:

- ID
- optionale Kontakt-ID
- Titel
- Untertitel
- Startzeit
- groben Status

Es enthält derzeit keine eigenen Felder für:

- Terminart
- Endzeit oder Dauer
- Objekt-ID
- Bestätigungsstatus
- Gesprächsziel, Mindestziel oder Idealziel
- Unterlagenstatus
- Ergebnis und Nachbereitung
- Vor-Ort-Notizen
- Route oder Fahrzeit

Die Zentrale arbeitet deshalb als lesende Ableitungs- und Arbeitsoberfläche über den vorhandenen Daten. Persistiert wird ausschließlich über bereits vorhandene Store-Kommandos und nur nach ausdrücklicher Nutzeraktion.

## Deterministische Terminarten

Terminarten werden konservativ aus Titel und Untertitel abgeleitet:

- `Bewertung`, `Marktwert`, `Wertermittlung` → Bewertungstermin
- `Besichtigung`, `Objektbegehung` → Besichtigung
- `Nachfass`, `Follow-up`, `Nachbereitung` → Nachfassgespräch
- `Netzwerk`, `Tippgeber`, `Kooperation`, `Partnertermin` → Netzwerktermin
- `Telefontermin`, `Telefonat`, `Rückruf`, `Call` → Telefontermin
- `Erstgespräch`, `Kennenlernen`, `Erstkontakt` → Erstgespräch
- `Beratung`, `Beratungsgespräch` → Beratung
- nur allgemeiner Begriff `Termin` → sonstiger Termin
- kein belastbarer Begriff → unklar

Die gefundene Regel und ihre Begründung werden sichtbar ausgegeben. Es gibt keine semantische Raterei.

## Explizite strukturierte Hinweise

Ziele und Ortsangaben werden nur aus ausdrücklich beschrifteten Einträgen gelesen:

- `Ziel:` oder `Gesprächsziel:`
- `Mindestziel:`
- `Idealziel:`
- `Frage:`, `Offene Frage:` oder `Offene Fragen:`
- `Ort:`, `Adresse:` oder `Treffpunkt:`

Einwände werden nur aus ausdrücklich als `Einwand:` beziehungsweise `Einwände:` gekennzeichneten Kontaktnotizen übernommen.

## Vorbereitung und Risiken

Die Engine prüft:

- fehlenden oder verwaisten Kontakt
- fehlende Telefonnummer
- fehlende Adresse oder fehlenden Treffpunkt
- fehlende oder mehrdeutige Objektverknüpfung
- fehlenden letzten Gesprächsstand
- fehlendes ausdrückliches Terminziel
- fehlende nächste Aktion nach dem Termin
- offene und überfällige Follow-ups
- fehlende Eigentümer-Objekt-Verknüpfung
- nicht dokumentierte Terminbestätigung
- ungültige Zeitangaben
- vergangene Termine
- Überschneidungen geschätzter Zeitblöcke
- nicht modellierten Unterlagenstatus

Objekte werden nur dann eindeutig zugeordnet, wenn genau eine Immobilie über `ownerContactId` mit dem Kontakt verbunden ist. Bei mehreren Treffern wird die Beziehung als mehrdeutig angezeigt; es wird kein Objekt ausgewählt.

## Terminbriefing

Für jeden Termin werden aus vorhandenen Daten zusammengestellt:

- Kontakt und Rolle
- Kontaktdaten
- Ort
- Objektbezug
- letzte Aktivität
- offene Follow-ups
- bekannte Einwände
- Gesprächsziel
- Mindestziel
- Idealziel
- offene Fragen
- Risiken
- empfohlene Vorbereitung
- mobile Checkliste

Unbekannte Angaben werden als nicht dokumentiert oder nicht prüfbar dargestellt.

## Tagesroute

Die Tagesroute ist rein lokal und nicht persistiert. Sie sortiert Termine stabil nach:

1. gültiger Startzeit
2. Titel
3. Termin-ID

Planungsannahmen:

- geschätzte Termindauer je abgeleiteter Terminart
- 15 Minuten Nachbereitungspuffer
- 30 Minuten Ortswechselpuffer bei unterschiedlichen bekannten Orten
- 15 Minuten Puffer bei unbekanntem Ort
- kein Puffer bei identischem Ort

Diese Werte sind keine Navigationsergebnisse. Es werden keine Karten-, Verkehrs- oder Routingdaten verwendet.

## Nachbereitung

Der Nachbereitungsbereich erfasst lokal:

- Termin stattgefunden
- Ergebnis
- Motivation
- Einwände
- nächste Aktion
- mögliche Objektstatus-Auswirkung
- mögliche Pipeline-Auswirkung
- Nachrichten- oder Rückrufentwurf

Diese Daten werden nicht automatisch gespeichert. Zulässige Schreibaktionen sind ausschließlich:

- Follow-up über `addFollowUp`
- bewusst bestätigte Pipeline-Änderung über `moveContactStage`

Es gibt keine konkurrierende Termin- oder Ergebnis-Persistenz.

## Mobiler Außendienstmodus

Der mobile Modus zeigt:

- großes Terminziel
- Kontakt
- Objekt
- Ort
- Checkliste
- offene Fragen
- lokale Notizen
- lokales Ergebnis
- nächste Aktion

Nur ein ausdrücklich ausgelöstes Follow-up verwendet ein vorhandenes Store-Kommando. Notizen und Ergebnis bleiben lokale Arbeitsentwürfe.

## Rollen und Offline-Zustand

Viewer erhalten keine Schreibaktionen. Die Berechtigungsentscheidung wird aus der vorhandenen Rolle abgeleitet.

Wenn der vorhandene Cloud-Status `offline` meldet, kennzeichnet die Oberfläche den Zustand als Offline-/Mock-Modus. Die Priorisierungs- und Sortierregeln bleiben identisch; es entsteht keine zweite Datenhaltung.

## Tests

Die Unit-Tests decken ab:

- Termin ohne Kontakt
- Termin ohne Objekt
- vergangenen Termin
- zukünftigen Termin
- ungültige Zeitangabe
- mehrere Termine gleichzeitig
- fehlende Vorbereitung
- leere Terminliste
- deterministische Reihenfolge
- Viewer ohne Schreibaktionen
- Offline-Mock-Zustand
- unklare Terminart

## Spätere Integrationspunkte

Die zentrale Router- und Navigationskonfiguration ist in diesem Arbeitspaket geschützt. Die neue Seite muss in einem späteren Integrationspaket bewusst in Router, Navigation und gegebenenfalls Command Palette eingebunden werden.

Für eine vollständige fachliche Persistenz sind später separat zu entscheiden:

1. versionierte Terminart und Endzeit beziehungsweise Dauer
2. direkte Objekt-ID am Termin
3. Bestätigungsstatus und Bestätigungszeitpunkt
4. strukturierte Ziele und offene Fragen
5. Unterlagen- und Checklistenstatus
6. versionierte Nachbereitung mit Ergebnis und Motivation
7. Konflikt- und Realtime-Verhalten für Terminedits
8. eigene Rollenberechtigung für Terminmutationen
9. serverseitig abgesicherte Kommunikationsaktionen
10. optionaler Routingprovider mit Datenschutz-, Kosten- und Ausfallkonzept

Bis dahin bleibt die Umsetzung bewusst additiv, transparent und ohne erfundene Daten.
