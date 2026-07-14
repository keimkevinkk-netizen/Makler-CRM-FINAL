# VINCERE Mandats- und Pipeline-Engine

## Zweck

Die Pipeline-Seite wird als Mandats- und Abschlusscockpit aufgebaut. Sie verdichtet vorhandene Kontakte, Follow-ups, Telefonereignisse, Termine und Immobilien zu einer rein abgeleiteten Sicht. Es entsteht keine zweite Speicherung und kein neues fachliches Wahrheitsmodell.

## Daten- und Änderungsgrenzen

Die Umsetzung verändert weder zentrale Domain-Typen noch `AppStore.tsx`, Cloud-Repository, Authentifizierung, Router oder SQL-Migrationen. Schreibaktionen verwenden ausschließlich bereits vorhandene Store-Kommandos:

- Follow-up anlegen
- Follow-up erledigen
- Pipeline-Stufe weiterführen
- bestehenden Telefonworkflow öffnen

Viewer erhalten keine verändernden Bedienelemente.

## Pipeline-Stufen

Die vorhandenen Domain-Stufen werden wie folgt dargestellt:

| Domain-Stufe | Anzeige |
|---|---|
| `lead` | Neu |
| `qualified` | Qualifiziert |
| `appointment` | Termin |
| `mandate` | Mandat |
| `sold` | Verkauft |

`Verloren / inaktiv` ist ausschließlich View-Logik. Ein Kontakt wird dort angezeigt, wenn das jüngste Telefonergebnis `not_interested` ist und keine zukünftige Kontaktaktion vorliegt. Der gespeicherte Kontaktstatus wird dabei nicht verändert.

## Deterministische Risikoregeln

Die Engine erkennt aus vorhandenen Feldern:

- **keine nächste Aktion:** weder offenes Follow-up noch zukünftiges `nextActionAt`
- **Termin ohne Vorbereitung:** Termin innerhalb von 72 Stunden ohne passendes offenes Vorbereitungs-Follow-up
- **Bewertung ohne Nachfassaktion:** Bewertungsobjekt oder Bewertungstermin ohne offenes Follow-up
- **Mandatschance ohne klare Entscheidung:** fortgeschrittene Terminphase, positives Gespräch und kein nächster Schritt
- **stagnierende Chance:** beobachtete Inaktivität oberhalb fester Schwellen
  - Neu: 21 Tage
  - Qualifiziert: 14 Tage
  - Termin: 7 Tage
  - Mandat: 10 Tage
- **unvollständige Daten:** fehlender Name, Kontaktweg, Ort, Situationsnotiz oder bei Eigentümern eine fehlende Immobilienverknüpfung
- **Abschlussphase ohne Follow-up:** Mandatsstufe ohne offene Folgeaktion
- **fehlerhafte Beziehungen:** Follow-ups, Telefonereignisse, Termine oder Immobilien verweisen auf fehlende Kontakte

Zukünftige Termine werden nicht als bereits erfolgte Aktivität gewertet.

## Handlungswert

Der Handlungswert dient nur der Reihenfolge der heutigen Bearbeitung. Er ist **keine Abschlusswahrscheinlichkeit** und keine Umsatzprognose.

Punkte entstehen ausschließlich durch sichtbare Faktoren, unter anderem:

- aktuelle Pipeline-Stufe
- Eigentümerrolle
- aktives Objekt
- bevorstehender Termin
- vorhandenes Potenzialfeld
- positiver Gesprächsverlauf
- mehrere positive Gespräche ohne Abschlussaktion
- Überfälligkeit
- fehlende nächste Aktion
- Termin ohne Vorbereitung
- Bewertung ohne Nachfassaktion
- Stagnation
- ungesicherte Abschlussphase

Jeder Faktor wird mit Bezeichnung, Begründung und Punktwert im View-Modell geführt. Sortiert wird anschließend stabil nach:

1. Handlungswert absteigend
2. Überfälligkeit
3. frühester nächster Aktion
4. vorhandenem Potenzialwert
5. fortgeschrittener Pipeline-Stufe
6. Name
7. Kontakt-ID

Damit bleibt die Reihenfolge bei identischen Daten und identischem Bewertungszeitpunkt reproduzierbar.

## Pipeline-Gesundheit

Berechnet werden:

- Anzahl je Stufe
- Summe vorhandener `estimatedValue`-Werte je Stufe
- beobachtete Inaktivität seit der letzten rekonstruierbaren Aktivität
- stagnierende Kontakte
- Chancen ohne nächste Aktion
- überfällige Chancen
- bevorstehende Termine
- Verhältnis früher Stufen (`Neu`, `Qualifiziert`) zu fortgeschrittenen Stufen (`Termin`, `Mandat`)
- mögliche Engpässe
- fehlerhafte Beziehungen

## Bewusste Methodengrenzen

Folgende Kennzahlen werden nicht erfunden:

- echte durchschnittliche Verweildauer je Pipeline-Stufe
- Übergangs- oder Verlustquote je Stufe
- Abschlusswahrscheinlichkeit
- erwarteter Provisionsumsatz
- historischer Funnel-Trend

Dafür fehlen aktuell versionierte Stufenwechsel mit Zeitpunkt, vorheriger und neuer Stufe sowie fachlich sichere Verlustgründe. Die Oberfläche weist diese Grenzen sichtbar aus.

## Spätere Datenfelder

Für eine belastbare Erweiterung sollten in einem getrennten Datenmodell-Arbeitspaket geprüft werden:

- `pipelineTransitionEvents` mit Kontakt-ID, alter/neuer Stufe, Zeitpunkt, Benutzer und Grund
- expliziter Verluststatus und Verlustgrund
- Mandatsentscheidung, Entscheidungstermin und Entscheider
- Bewertungsauftrag mit Ergebnis und Nachbereitungsstatus
- Einwände als strukturierte Entitäten statt Freitextableitung
- Abschlussziel und geplantes Mindest-/Idealziel je Termin
- Provisionsbasis nur mit fachlich bestätigtem Vertrags- und Courtagekontext

Diese Felder wurden in diesem Arbeitspaket bewusst nicht unkoordiniert in zentrale Typen oder SQL-Strukturen eingebaut.
