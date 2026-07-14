# VINCERE Immobilien- und Bewertungscockpit

## Ziel

Dieses Arbeitspaket ersetzt die bisherigen einfachen Objektkarten und die Platzhalter-Bewertungsübersicht durch ein vertriebsorientiertes Immobilien- und Bewertungscockpit.

Die Oberfläche beantwortet aus den bereits vorhandenen VINCERE-Daten:

- Welche Immobilie benötigt als Nächstes Aufmerksamkeit?
- Ist ein Eigentümer verknüpft und erreichbar?
- Gibt es ein offenes oder überfälliges Follow-up?
- Steht ein Termin bevor?
- Wie vollständig sind die im aktuellen Datenmodell verfügbaren Angaben?
- Welcher nächste Schritt ist anhand fester Regeln sinnvoll?

## Dateigrenzen

Das Paket verändert ausschließlich fachlich zugehörige Bereiche:

- `apps/vincere/src/features/properties/`
- `apps/vincere/src/features/valuations/`
- `apps/vincere/tests/property-intelligence.test.ts`
- diese Dokumentation

Nicht verändert werden:

- `AppStore.tsx`
- `main.tsx`
- `cloudRepository.ts`
- Authentifizierung
- zentrale Domain-Typen
- Router
- SQL-Migrationen
- das alte MaklerCRM

## Handlungswert

Der Handlungswert ist eine deterministische Priorisierungskennzahl von 0 bis 100. Er ist ausdrücklich keine Verkaufs- oder Abschlusswahrscheinlichkeit.

Berücksichtigt werden:

- Objektphase
- Kontaktpriorität
- vorhandenes Eigentümerpotenzial
- bestätigte Eigentümerrolle
- überfällige beziehungsweise geplante Follow-ups
- fehlende nächste Aktion
- bevorstehende Termine
- internes Objektvolumen
- fehlende oder fehlerhafte Eigentümerverknüpfungen

Jeder Punktefaktor wird in der Oberfläche offengelegt.

## Bewertungsreife

Die Bewertungsreife prüft nur Informationen, die das aktuelle VINCERE-Datenmodell bereits besitzt:

- Bezeichnung
- Adresse
- Ort
- Objektart
- interner Arbeitswert
- Eigentümerverknüpfung
- Telefonnummer des Eigentümers

Sie bewertet nicht die fachliche Qualität eines Verkehrswertgutachtens.

## Interner Orientierungsrahmen

Der angezeigte Korridor wird aus dem manuell hinterlegten Arbeitswert abgeleitet:

- Datenreife ab 85 Prozent: ±7 Prozent
- Datenreife ab 65 Prozent: ±10 Prozent
- darunter: ±15 Prozent

Dieser Korridor ist ausschließlich eine interne Arbeitsdarstellung. Er verwendet noch keine Lage-, Vergleichs-, Angebots-, Transaktions-, Bodenrichtwert-, Zustands-, Energie- oder Marktdynamikdaten. Er darf deshalb nicht als Marktwert, Verkehrswert oder Gutachten ausgegeben werden.

## Benutzerrechte

- Owner, Administrator und Makler können Immobilien erfassen und Follow-ups anlegen.
- Lesezugriff sieht Cockpit und Bewertungsreife, erhält aber keine schreibenden Aktionen.
- Alle Mutationen verwenden ausschließlich die vorhandenen Store-Kommandos und deren Berechtigungsprüfung.

## Spätere Integrationspunkte

Ein produktives Bewertungsmodul benötigt getrennte, kontrollierte Arbeitspakete für:

1. erweitertes Objekt- und Ausstattungsdatenmodell
2. Adressvalidierung und Geocodierung
3. Bodenrichtwerte und amtliche Geodaten
4. Vergleichs- und Angebotsdaten mit Quellen- und Aktualitätsnachweis
5. serverseitige Bewertungslogik
6. Unsicherheitsmodell und nachvollziehbare Quellenbeiträge
7. PDF-Bericht und Freigabestatus
8. Datenschutz, Löschfristen und Protokollierung

## Qualität

Die reine Berechnungslogik ist unabhängig von React testbar. Tests decken Priorisierung, Faktoren, fehlerhafte Beziehungen, Datenreife, interne Korridore, Filterung, Sortierung und Portfoliozusammenfassung ab.
