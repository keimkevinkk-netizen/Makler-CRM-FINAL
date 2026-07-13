# GEMINI.md

## Projekt

Dieses Repository enthält **Keim CRM Pro**, ein Makler-Betriebssystem für den Immobilienvertrieb. Die Anwendung besteht im Kern aus einer Single-File-App (`index.html`) sowie Netlify Functions.

Das Ziel ist nicht, möglichst viele Funktionen einzubauen, sondern ein stabiles, einfach bedienbares und vertriebswirksames Betriebssystem zu entwickeln, das Maklern konkret Arbeit abnimmt, Entscheidungen verbessert und den Verkaufserfolg erhöht.

## Verbindlicher Arbeitsmodus

1. Bearbeite pro Auftrag ausschließlich **ein klar abgegrenztes, zusammenhängendes Arbeitspaket**.
2. Analysiere vor Änderungen die betroffenen Dateien und die bestehende Architektur.
3. Nutze vorhandene Strukturen, Benennungen, Datenmodelle und Designmuster.
4. Verändere keine nicht betroffenen Bereiche ohne zwingenden technischen Grund.
5. Vermeide großflächige Refactorings, neue Abhängigkeiten und Architekturwechsel, sofern sie nicht ausdrücklich verlangt werden.
6. Erhalte bestehende Funktionen und gespeicherte Nutzerdaten.
7. Implementiere keine Attrappen, Platzhalter oder nur optisch funktionierenden Features.
8. Weise klar auf Annahmen, technische Grenzen, Risiken und nicht umsetzbare Punkte hin.

## Git- und Deployment-Regeln

- Niemals direkt auf `main` arbeiten oder pushen.
- Für jedes Arbeitspaket einen eigenen, verständlich benannten Branch verwenden.
- Änderungen in kleinen, nachvollziehbaren Commits strukturieren.
- Am Ende einen **Draft Pull Request** erstellen.
- Niemals selbstständig mergen.
- Niemals selbstständig deployen oder Produktionskonfigurationen verändern.
- Kein Force-Push und keine destruktiven Git-Aktionen ohne ausdrückliche Freigabe.
- Keine Geheimnisse, Tokens, API-Keys oder Zugangsdaten committen.

## Qualitätsprüfung

Führe nach Codeänderungen – soweit für den betroffenen Bereich relevant – mindestens folgende Prüfungen aus:

```bash
npm install
npm run check:functions
npm run lint
npm test
```

Beachte:

- Das Repository besitzt aktuell keinen eigenen `build`- oder `typecheck`-Befehl.
- Führe nur vorhandene Befehle aus; erfinde keine erfolgreichen Prüfungen.
- Wenn ein Test wegen fehlender Umgebung, Browser, Zugangsdaten oder externer Dienste nicht ausgeführt werden kann, dokumentiere das exakt.
- Behebe keine fachfremden Altfehler außerhalb des Arbeitspakets, sondern dokumentiere sie getrennt.

## Schutz bestehender Daten und Funktionen

- Bestehende Local-Storage-Keys, Datenstrukturen und Migrationen dürfen nicht unbemerkt verändert werden.
- Datenänderungen müssen rückwärtskompatibel sein oder eine sichere Migration enthalten.
- Keine Daten löschen, zurücksetzen oder überschreiben.
- Netlify Functions müssen Eingaben validieren und Fehler kontrolliert behandeln.
- Externe APIs dürfen nicht unnötig häufiger aufgerufen werden.
- Datenschutz und Datenminimierung sind bei Kontakten, Eigentümern, Interessenten und Objektdaten zu berücksichtigen.

## UX- und Produktregeln

- Mobile Nutzbarkeit ist Pflicht.
- Bestehende Navigation und Kernabläufe nicht ohne Auftrag verändern.
- Neue Funktionen müssen einen konkreten Nutzen für Vertrieb, Produktivität, Entscheidungsqualität oder Automatisierung haben.
- Zusätzliche Komplexität ohne klaren praktischen Nutzen vermeiden.
- Bedienung muss verständlich, schnell und fehlertolerant sein.
- Kritische Aktionen benötigen klare Rückmeldung und gegebenenfalls eine Bestätigung.

## Vorgehen bei jedem Auftrag

1. Auftrag und Akzeptanzkriterien kurz zusammenfassen.
2. Betroffene Dateien und Abhängigkeiten identifizieren.
3. Risiken und Sonderfälle nennen.
4. Einen kleinen Umsetzungsplan erstellen.
5. Änderungen ausschließlich im vereinbarten Umfang umsetzen.
6. Relevante Prüfungen ausführen.
7. Ergebnisse, geänderte Dateien, Tests und verbleibende Risiken dokumentieren.
8. Draft-PR erstellen; kein Merge und kein Deployment.

## Abschlussbericht

Der Abschlussbericht muss enthalten:

- Was wurde umgesetzt?
- Welche Dateien wurden geändert?
- Welche Tests und Prüfungen wurden tatsächlich ausgeführt?
- Welche Ergebnisse hatten sie?
- Welche Punkte konnten nicht geprüft oder umgesetzt werden?
- Welche Risiken oder Folgearbeiten bestehen?
- Name des Branches und Link zum Draft-PR.
