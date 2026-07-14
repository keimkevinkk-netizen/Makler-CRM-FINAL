# VINCERE Gebiets-, Akquise- und Kampagnenmaschine

## Zweck

Die Funktion ersetzt die bisherige statische Kampagnenansicht durch eine operative, datenbasierte Zentrale für Gebietspriorisierung, Kampagnenauswahl und Wochenplanung im Main-Kinzig-Kreis.

Sie beantwortet:

- welche Gebiete auf Basis vorhandener CRM-Daten aktuell bearbeitet werden sollten,
- wo Aufgaben überfällig oder Eigentümerkontakte ohne nächste Aktion vorhanden sind,
- welche Kampagnenvorlage zu den belegbaren Signalen eines Gebiets passt,
- welche aggregierten Maßnahmen für die Woche sinnvoll sind,
- welche Daten-, Versand- und Rechtsrisiken eine Ausführung blockieren.

## Grenzen

Die Funktion führt keine zentrale Persistenz ein und verändert weder `AppStore.tsx` noch `cloudRepository.ts`, `domain.ts`, Authentifizierung, SQL-Migrationen, Router oder Marktquellenregister.

Es gibt:

- keinen automatischen Versand,
- keine Massennachrichten,
- keine produktiven Empfängerlisten,
- keine externen APIs,
- keine erfundenen Marktindikatoren,
- keine automatische rechtliche Freigabe.

## Strategisches View-Modell

Die Segmentierung ist in `src/domain/territories/territoryConfig.ts` als konfigurierbares View-Modell hinterlegt:

- **Kernfestung:** Bruchköbel, Schöneck, Nidderau
- **Volumenmaschine:** Hanau
- **Hochpreis:** Maintal
- **Erweiterungsring:** Erlensee, Langenselbold
- **Selektive Bearbeitung:** Neuberg, Hammersbach, Rodenbach, Freigericht, Gelnhausen

Unbekannte Orte und Kontakte ohne Ort werden nicht verworfen. Sie erscheinen als nicht unterstützte Gebiete bzw. als `Nicht zugeordnet` und erhalten keinen strategischen Basiswert.

## Abgeleitete Gebietskennzahlen

Die Analyse verwendet ausschließlich vorhandene Daten aus dem AppStore:

- Kontakte und aktive Kontakte,
- Eigentümer-, Netzwerk- und abgeschlossene Kontakte,
- aktive Immobilien,
- dokumentierte Bewertungschancen,
- offene und überfällige Follow-ups,
- zukünftige Termine,
- Pipeline-Verteilung,
- letzte dokumentierte Aktivität,
- Kontakte und Eigentümer ohne nächste Aktion,
- operative Datenqualität.

Eine Bewertungschance wird nur aus bestehenden Eigentümerkontakten in den Stufen `qualified` oder `appointment` sowie Immobilien im Status `Bewertung` abgeleitet. Es wird keine externe Marktchance unterstellt.

## Transparenter Prioritätswert

Der interne Prioritätswert umfasst maximal 100 Punkte:

| Faktor | Maximalpunkte | Grundlage |
|---|---:|---|
| Strategische Gebietskategorie | 25 | Konfiguriertes View-Modell |
| Aktive Kontakte | 15 | Relativer vorhandener Gebietswert |
| Eigentümerpotenzial | 15 | Bereits gespeicherte Kontaktpotenziale |
| Unbearbeitete Chancen | 15 | Eigentümer ohne nächste Aktion und Bewertungschancen |
| Überfällige Aufgaben | 10 | Offene Follow-ups vor dem Auswertungszeitpunkt |
| Vorhandene Immobilien | 8 | Nicht verkaufte Immobilien |
| Fehlende Aktivität | 7 | Dokumentierte Aktivitätslücke, nur bei vorhandenen Bestandsdaten |
| Marktdatenqualität | 5 | Explizit übergebener Quellenstatus |

Fehlende Marktdaten erhalten **0 Punkte**. Sie werden nicht durch Annahmen oder Platzhalterwerte ersetzt.

Gleichstände werden deterministisch nach strategischem Basiswert und anschließend alphabetisch sortiert.

## Kampagnenvorlagen

Enthalten sind:

1. Eigentümeransprache
2. Empfehlungsaktion
3. Nachbarschaftskampagne
4. Bewertungsaktion
5. Reaktivierung
6. Netzwerkpflege
7. Lokale Marktinformation
8. Bestandskundenpflege

Jede Vorlage enthält Zielgruppe, Ziel, Kanal, Aufgaben, Dauer, Erfolgskriterien, Ausschlusskriterien, Risiken und rechtliche Hinweise.

Die Vorlagenpassung ist ein interner Arbeitswert. Sie basiert auf Segmentpassung, vorhandenen operativen Signalen und Datenqualität. Blocker reduzieren den Wert und werden sichtbar ausgewiesen.

## Workbench-Sicherheit

Die Workbench zeigt nur aggregierte Anzahlen. Kontakte werden intern nach Rolle, Status, Kanalverfügbarkeit und dokumentierten Widersprüchen geprüft. Namen, IDs oder produktive Empfängerlisten werden nicht ausgegeben.

Der Versandstatus ist fest auf `disabled` gesetzt. Jede Kampagne erfordert manuelle fachliche und rechtliche Prüfung.

Viewer erhalten `editable: false`; die Oberfläche bleibt schreibgeschützt.

## Wochenplan

Der Wochenplan ist ein nicht persistiertes View-Modell. Er verteilt:

- Daten- und Prioritätsprüfung,
- zwei begrenzte Einzelkontaktblöcke,
- Netzwerkpflege,
- Nachfassarbeit,
- Datenqualitätsarbeit,
- Wochenendreview.

Zielkontaktzahlen werden aus der tatsächlich aggregiert verfügbaren Zielgruppe abgeleitet und auf zehn Einzelkontakte pro Wochenplan begrenzt. Diese Begrenzung ist eine Arbeitsregel, keine Marktprognose.

## Tests

`tests/territory-campaign-engine.test.ts` deckt ab:

- unbekannte Gebiete,
- Kontakte ohne Ort,
- gleiche Gebietswerte,
- leere Gebiete,
- überfällige Aufgaben,
- fehlende Marktdaten,
- deterministische Priorisierung,
- Kampagnenfilter,
- Ausschlussregeln,
- deaktivierten Versand,
- Viewer ohne Änderungsrechte.
