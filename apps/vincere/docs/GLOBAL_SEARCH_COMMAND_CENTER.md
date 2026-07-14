# Globale Suche und Command Center

## Zweck

Das Modul stellt einen rein lokalen, deterministischen Suchindex und eine tastatur- sowie mobilbedienbare Command Palette für VINCERE bereit. Es verwendet ausschließlich den bereits geladenen Zustand des aktuellen Workspaces. Es gibt keine externe Such-API, keine Telemetrie und keine versteckten Hintergrundaktionen.

## Indexierte Datensätze

- Kontakte: Name, Telefonnummer, E-Mail, Ort, Rolle, Quelle und Pipeline-Stufe
- Netzwerkpartner: aus bestehenden Kontakten mit der Rolle `Netzwerk`
- Pipeline-Chancen: deterministisch aus den aktiven Stufen `qualified`, `appointment` und `mandate`
- Immobilien: Titel, Adresse, Ort, Typ, Status und sicher verknüpfter Eigentümer
- Bewertungen: aus Immobilien mit dem Status `Bewertung`
- Follow-ups: Titel, Kanal, Status, Fälligkeit und sicher verknüpfter Kontakt
- Termine: Titel, Untertitel, Status, Zeitpunkt und sicher verknüpfter Kontakt
- Telefonanrufe: Kontakt, Ergebnis und Zeitpunkt
- nächste Aktionen: vorhandenes `nextActionAt` eines Kontakts

Kontakt- und Anrufnotizen werden in der produktiven Palette standardmäßig nicht indexiert. `buildSearchIndex` besitzt nur für ausdrücklich kontrollierte Anwendungsfälle eine Opt-in-Option für Kontaktnotizen. Anrufnotizen werden grundsätzlich nicht aufgenommen.

## Suchlogik

Die Normalisierung berücksichtigt Groß-/Kleinschreibung, deutsche Umlaute, `ß`, Telefonnummern und E-Mail-Adressen. Treffer werden in fester Reihenfolge bewertet:

1. direkter Telefonnummern- oder E-Mail-Treffer
2. exakter Wert oder exakte Suchwörter
3. Wortanfänge
4. enthaltener Begriff
5. begrenzte Levenshtein-Toleranz: ein Fehler ab vier Zeichen, zwei Fehler ab acht Zeichen
6. deterministische Vertriebszuschläge für Überfälligkeit, aktive Pipeline, offene Aktion, Priorität und aktuelle Aktivität

Bei gleichem Score folgen feste Tie-Breaker: Überfälligkeit, Pipeline, offene Aktion, Aktivitätszeit, Datensatztyp, deutsche alphabetische Sortierung und technische ID.

## Workspace- und Berechtigungsschutz

- Der Indexaufbau bricht ab, wenn `currentUser.workspaceId` nicht dem aktuellen Workspace entspricht.
- Jede Indexzeile trägt die Workspace-ID; jede Suche filtert erneut darauf.
- Verwaiste Follow-ups, Termine oder Anrufe werden nicht einer Person zugeschrieben.
- Viewer sehen keine Befehle, die Daten schreiben oder einen aktiven Schreibprozess starten.
- Suchanfragen und Treffer werden nicht protokolliert oder übertragen.

## Befehle

Die Palette verwendet nur vorhandene VINCERE-Funktionen und Routen. Sie legt keine neue produktive Aktion im Hintergrund an. Jeder Befehl wird erst nach Klick oder Enter ausgeführt.

- neuen Kontakt anlegen
- Kontakt anrufen
- Follow-up anlegen
- Termin öffnen
- Immobilie öffnen
- Bewertung öffnen
- Pipeline anzeigen
- Tagesfokus starten
- Netzwerkfokus starten
- Kampagnen öffnen
- Einstellungen öffnen

## Bedienung

- `Ctrl+K` oder `Cmd+K`: öffnen oder schließen
- Pfeiltasten: Ergebnis auswählen
- Enter: ausgewähltes Ergebnis bewusst öffnen
- Escape: schließen und Fokus wiederherstellen
- Tab/Shift+Tab: Fokus bleibt im Dialog
- unter 820 Pixeln: Vollbilddarstellung
