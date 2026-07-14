# VINCERE Datenqualitäts-, Dubletten- und Integritätszentrale

## Ziel

Die Datenqualitätszentrale prüft aktive Workspace-Daten und normalisierte Legacy-Importpakete deterministisch, ohne Datensätze zu verändern. Alle Korrekturen, Verknüpfungen und Kontaktzusammenführungen bleiben reine Vorschauen.

## Architektur

- `src/domain/data-quality/types.ts` – fachliche Ergebnis-, Vorschau- und Reporttypen
- `src/domain/data-quality/security.ts` – Schutz vor Prototype Pollution, übergroßen und zu tiefen Strukturen
- `src/domain/data-quality/normalization.ts` – deterministische Normalisierung, Datumsprüfung und stabile IDs
- `src/domain/data-quality/duplicates.ts` – erklärbare, begrenzte Dublettenbewertung
- `src/domain/data-quality/mergePreview.ts` – konfliktbewusste Kontakt-Merge-Vorschau
- `src/domain/data-quality/engine.ts` – Kontakt-, Beziehungs-, Zeit- und Konsistenzprüfungen
- `src/domain/data-quality/report.ts` – vollständiger und anonymisierbarer Qualitätsreport
- `src/data/legacy/dataQualityAdapter.ts` – read-only Adapter für normalisierte Legacy-Importpakete
- `src/features/data-quality/DataQualityCenter.tsx` – Qualitätscockpit im Einstellungsbereich

## Sicherheitsgrenzen

Die Implementierung:

- ruft keine Store-Mutationsfunktion auf,
- schreibt nicht in das Cloud-Repository,
- löscht keine Datensätze,
- führt keine Kontaktzusammenführung aus,
- verändert keine aktiven Workspace-Daten,
- verwendet keine externen Dienste,
- erzeugt ausschließlich deterministische Befunde und Vorschaupläne,
- blockiert `__proto__`, `prototype` und `constructor` in analysierten Strukturen.

`DataQualityResult.mutatesData` und jede `ContactMergePreview.mutatesData` sind fest auf `false` typisiert.

## Qualitätsprüfungen

### Kontakte

Geprüft werden fehlende oder ungültige Namen, Telefonnummern, E-Mail-Adressen, Orte, Rollen, Quellen und nächste Aktionen. Zusätzlich werden hohes Potenzial ohne Follow-up, sehr alte Aktivitäten und widersprüchliche Pipeline-/Objektzustände erkannt.

### Dubletten

Die Bewertung verwendet:

- vorhandene IDs,
- normalisierte Telefonnummern,
- normalisierte E-Mail-Adressen,
- exakte und ähnliche Namen,
- Orte,
- verknüpfte Immobilienadressen,
- gemeinsame Immobilien-IDs,
- historische Quellen,
- widersprüchliche gültige Kontaktwege.

Jeder Faktor besitzt eine Punktwirkung und eine Erklärung. Die Klassen sind:

- `certain`
- `very_likely`
- `possible`
- `manual`
- `separate`

Die Kandidatenbildung arbeitet indexbasiert und begrenzt die Anzahl der Bewertungen. Große Datenbestände erzeugen daher keinen unkontrollierten quadratischen Paarvergleich.

### Beziehungsintegrität

Erkannt werden unter anderem:

- Follow-ups ohne Kontakt,
- Termine ohne oder mit ungültigem Kontakt,
- Immobilien ohne Eigentümer oder mit ungültiger Eigentümer-ID,
- Telefonereignisse ohne Kontakt,
- Eigentümerkontakte ohne Immobilie,
- verkaufte Immobilien mit unpassender Kontaktstufe.

### Zeitintegrität

Ungültige, extrem alte und unplausibel weit zukünftige Zeitwerte werden gekennzeichnet. Bereits protokollierte Telefonereignisse dürfen nicht in der Zukunft liegen.

## Korrekturvorschläge

Jeder Vorschlag enthält:

- betroffenen Datensatz,
- altes Feld beziehungsweise alten Wert,
- vorgeschlagenen Wert,
- Begründung,
- Sicherheit,
- mögliche Nebenwirkungen.

Unterstützte Vorschauaktionen sind Normalisierung, Leerzeichenbereinigung, sichere ID-Reparatur, Dublettengruppierung, Verwaist-Markierung, nächste Aktion und Entfernung einer ungültigen Beziehung. Keine dieser Aktionen wird automatisch ausgeführt.

## Merge-Vorschau

Die Merge-Vorschau zeigt:

- Hauptkontakt und mögliche Dublette,
- Vergleich aller relevanten Kontaktfelder,
- vorgeschlagenen Feldwert,
- Konflikte und Begründungen,
- zu übertragende Follow-ups, Termine, Telefonereignisse und Immobilien,
- möglicherweise verlorengehende Informationen,
- offene manuelle Entscheidungen.

Die Vorschau besitzt keine Anbindung an Store-Schreibfunktionen.

## Reports

Exportiert werden können:

1. vollständiger JSON-Qualitätsreport,
2. anonymisierter JSON-Qualitätsreport,
3. lesbarer Markdown-Prüfbericht.

Im anonymisierten Report werden Datensatz-IDs stabil pseudonymisiert und Kontaktwerte wie Telefonnummer, E-Mail, Name, Ort und Adresse entfernt.

## Tests

Die Tests decken ab:

- identische Telefonnummern in verschiedenen Formaten,
- gleiche E-Mail-Adressen,
- gleiche Namen bei nachweislich unterschiedlichen Personen,
- verwaiste Beziehungen,
- leere Datenbestände,
- 5.000 synthetische Kontakte,
- widersprüchliche Felder,
- stabile Qualitätswerte,
- Merge-Vorschauen und Beziehungstransfers,
- vollständige Nicht-Mutation,
- Prototype-Pollution-Schutz,
- anonymisierte Reports.
