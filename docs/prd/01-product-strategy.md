# KEIM CRM PRO – MASTER PRODUCT REQUIREMENTS DOCUMENT
## Teil 1: Produktstrategie, Vision und Produkt-Governance

**Version:** 1.0  
**Stand:** 09. Juli 2026  
**Status:** Verbindliche strategische Arbeitsgrundlage für V31 und die Folgeversionen  
**Primärer Nutzer und Auftraggeber:** Kevin Keim  
**Primärer regionaler Fokus:** Main-Kinzig-Kreis  

---

## Inhaltsübersicht
- 0. Dokumentauftrag, Geltungsbereich und Rangordnung
- 1. Executive Summary
- 2. Ausgangslage und strategischer Kontext
- 3. Problemdefinition und Marktchance
- 4. Produktthese
- 5. Mission, Vision und Ambitionsniveau
- 6. Zielnutzer und Nutzungskontext
- 7. Jobs-to-be-Done
- 8. Wertversprechen und Differenzierung
- 9. Produktprinzipien
- 10. Strategische Hierarchie der Arbeit
- 11. Strategische Kernabläufe
- 12. Produktumfang und Nicht-Ziele
- 13. Strategische Modulrollen
- 14. Regionale Produktstrategie: Main-Kinzig-Kreis
- 15. Datenvertrauen als Produktstrategie
- 16. Sicherheit und Datenschutz als strategische Produktanforderung
- 17. Erfolgsmodell und Messsystem
- 18. Ziele für V31
- 19. Strategische Annahmen und Validierungsplan
- 20. Strategische Risiken und Gegenmaßnahmen
- 21. Produkt-Governance
- 22. Roadmap-Horizont V31 bis V40
- 23. Strategische Release-Gates für V31
- 24. Entscheidungsrahmen für neue Anforderungen
- 25. Strategische Definition of Done
- 26. Anti-Pattern-Katalog
- 27. Glossar
- 28. Einseitige Produktzusammenfassung
- 29. Strategische Abnahme-Checkliste
- 30. Abschlussauftrag für die folgenden Dokumentteile

---

## 0 Dokumentauftrag, Geltungsbereich und Rangordnung

Dieses Dokument definiert die strategische Identität von Keim CRM Pro. Es beschreibt, welches Problem das Produkt löst, für wen es gebaut wird, welche Geschäftsergebnisse es unterstützen soll, welche Prinzipien bei Zielkonflikten gelten und anhand welcher Kriterien zukünftige Funktionen bewertet werden. Es ist keine unverbindliche Ideensammlung. Es ist die oberste produktstrategische Referenz für V31 und alle darauf aufbauenden Versionen.

Keim CRM Pro ist aus einer umfangreichen, historisch gewachsenen Single-File-Anwendung hervorgegangen. Die vorhandene Anwendung besitzt bereits produktive Daten, Arbeitsabläufe, Module, lokale Speicherstrukturen, Backup-Funktionen und erste V31-Grundlagen. Die Weiterentwicklung darf diese Substanz nicht entwerten. Das Ziel ist eine kontrollierte Transformation: vorhandene fachliche Logik und Nutzerdaten werden geschützt, während Produktstruktur, Benutzerführung, Designqualität, Kartenfunktion und Datenanbindung auf ein professionelles Niveau gehoben werden.

> **Verbindliche Rangordnung**  
> Bei Widersprüchen gilt folgende Priorität: 1. Schutz von Nutzerdaten und produktiver Businesslogik. 2. Dieses strategische Master-PRD. 3. Spätere UX-, Architektur-, Daten- und QA-Spezifikationen. 4. Einzelne Implementierungsaufträge. 5. kurzfristige Designwünsche. Eine niedrigere Ebene darf die höhere Ebene konkretisieren, aber nicht stillschweigend aushebeln.

- Dieses Dokument entscheidet über Produktzweck, Prioritäten, Nicht-Ziele, Erfolgsmessung und Governance.
- Die spätere UX & Design Bible entscheidet über visuelle Sprache, Interaktionsmuster und Komponenten.
- Die spätere Architektur- und Datenspezifikation entscheidet über technische Struktur, Schnittstellen und Migrationen.
- Das Claude-Code-Entwicklungshandbuch regelt Arbeitsweise, Branches, Commits, Tests und Dokumentation.
- Das QA- und Release-Handbuch definiert Prüfungen, Abnahme, Rollback und Produktionsfreigabe.

Claude Code oder jeder andere ausführende Entwickler muss dieses Dokument vollständig lesen, bevor größere Umbauten begonnen werden. Eine technische Lösung gilt nicht als gut, nur weil sie funktioniert. Sie gilt als gut, wenn sie den hier beschriebenen Produktzweck erfüllt, die strategischen Leitplanken respektiert und zukünftige Entwicklung nicht unnötig erschwert.

### 0.1 Dokumentensteuerung

| Feld | Festlegung |
| --- | --- |
| Produktname | Keim CRM Pro |
| Dokument | Master PRD – Teil 1: Produktstrategie, Vision und Produkt-Governance |
| Version | 1.0 |
| Status | Verbindliche strategische Arbeitsgrundlage für V31 und die Folgeversionen |
| Primärer Auftraggeber und Nutzer | Kevin Keim |
| Primärer regionaler Fokus | Main-Kinzig-Kreis und angrenzende Kerngebiete |
| Aktuelle Produktform | Single-User Makler-Operating-System; aktuell überwiegend browserbasiert und lokal datenhaltend |
| Technischer Betrieb | GitHub als Quellverwaltung; Netlify als Hosting- und perspektivische Serverless-Plattform |
| Freigaberegel | Strategische Änderungen nur bewusst, dokumentiert und mit Auswirkungsanalyse |
| Nächste Dokumentteile | UX & Design Bible; Informationsarchitektur & Datenmodell; Marktmonitor & Datenplattform; Development Manual; QA & Release Manual |

Änderungen an Mission, Vision, Zielgruppe, North Star, Nicht-Zielen oder Produktprinzipien sind strategische Änderungen. Sie dürfen nicht beiläufig in einem Implementierungscommit erfolgen. Sie benötigen eine dokumentierte Begründung, eine Auswirkungsanalyse und eine explizite Freigabe durch den Auftraggeber.

### 0.2 Leseanleitung für Claude Code und zukünftige Entwickler

1. Zuerst die Executive Summary und die Produktthese lesen.
2. Danach Zielnutzer, Jobs-to-be-Done und strategische Arbeitsabläufe verstehen.
3. Vor jeder größeren Änderung prüfen, welche Produktprinzipien betroffen sind.
4. Bei Zielkonflikten den Entscheidungsrahmen in Kapitel 24 anwenden.
5. Neue Ideen gegen Ziele, Nicht-Ziele, Messgrößen und Risiken bewerten.
6. Erst danach technische oder visuelle Lösungsvorschläge erstellen.

> **Keine Scheinerfüllung**  
> Eine Anforderung ist nicht erfüllt, wenn lediglich ein sichtbares Element ergänzt wurde. Beispiel: „Telefonie priorisieren“ bedeutet nicht, eine größere Anruf-Kachel zu bauen. Es bedeutet, den gesamten Arbeitsfluss vom nächsten Anruf über Ergebnisaufnahme und Follow-up bis zur konsistenten Aktualisierung aller betroffenen Module zu optimieren.

## 1 Executive Summary

Keim CRM Pro soll sich von einer umfangreichen persönlichen HTML-Anwendung zu einem professionellen, fokussierten Makler-Operating-System entwickeln. Das Produkt wird nicht daran gemessen, wie viele Module es besitzt, sondern daran, ob es Kevin Keim jeden Tag schneller und zuverlässiger zu den richtigen vertrieblichen Handlungen führt.

Der geschäftliche Kern ist einfach: Immobilienvertrieb entsteht nicht durch passives Reporting. Er entsteht durch konsequente Kontaktarbeit, qualifizierte Gespräche, präzise Wiedervorlagen, regionale Marktkenntnis und eine aktiv gesteuerte Pipeline. Das Produkt muss diese Aktivitäten verbinden. Telefonie, Follow-ups und nächste Schritte stehen deshalb über dekorativen Analysen, allgemeinen Motivationselementen oder isolierten Wissenssammlungen.

Das Heute-Dashboard wird zum Daily Command Center. Es zeigt nicht nur Zahlen, sondern macht die nächste sinnvolle Aktion unmittelbar ausführbar. Ein Klick auf „Offene Leads“, „Follow-ups fällig“, „Anrufe offen“ oder „Pipeline-Risiken“ führt in eine bereits gefilterte Arbeitsansicht. Der Nutzer soll nicht erst navigieren, sortieren und suchen müssen, bevor Arbeit beginnen kann.

Der Marktmonitor wird zur zweiten strategischen Säule. Er soll echte Geografie, nachvollziehbare Quellen, Aktualitätsstatus, regionale Vergleichbarkeit und später täglich aktualisierte Marktinformationen zusammenführen. Er darf keine Scheinpräzision erzeugen. Jede Kennzahl muss hinsichtlich Quelle, Zeitraum, Datenqualität und Aktualität transparent sein. Die Karte dient als Analyse- und Aktionsoberfläche, nicht als dekoratives Bild.

V31 ist eine Konsolidierungs- und Fundamentversion. Sie soll keine unkontrollierte Feature-Explosion auslösen. Sie vereinheitlicht Produktstruktur, Arbeitslogik und visuelle Sprache; schützt bestehende Daten; etabliert klare Navigations- und Datenverträge; schafft eine echte Kartenbasis; bereitet sichere Internetanbindungen vor und definiert messbare Qualitätsstandards.

> **Strategischer Leitsatz**  
> Keim CRM Pro zeigt nicht möglichst viel. Es zeigt das Richtige, macht die nächste Handlung eindeutig und sorgt dafür, dass kein wertvoller Kontakt ohne dokumentierten nächsten Schritt bleibt.

| Strategische Säule | Bedeutung für das Produkt |
| --- | --- |
| Daily Execution | Der Arbeitstag beginnt mit einer priorisierten, ausführbaren Queue statt einer passiven Übersicht. |
| Call-First Sales | Telefonie und persönliche Kontaktarbeit werden als zentraler Umsatzhebel sichtbar und operativ unterstützt. |
| Follow-up Reliability | Fällige und überfällige Wiedervorlagen sind unübersehbar und direkt bearbeitbar. |
| Pipeline Control | Aktive Chancen besitzen Phase, letzte Aktivität, nächste Aktion, Fälligkeit und nachvollziehbaren Risikostatus. |
| Regional Intelligence | Der Marktmonitor verbindet echte Geografie, aktuelle Daten und regionale Handlungsoptionen. |
| One Product | Alle Module wirken wie ein System, nicht wie addierte Einzellösungen. |
| Trust by Design | Datenquelle, Aktualität, Datenschutz, Backup und Fehlerzustände sind Teil der Produktqualität. |
| Controlled Evolution | Bestehende Daten und funktionierende Logik werden geschützt; neue Architektur entsteht schrittweise und reversibel. |

## 2 Ausgangslage und strategischer Kontext

Die vorhandene Anwendung ist funktional reich. Sie umfasst bereits Dashboard-, CRM-, Follow-up-, Pipeline-, Tippgeber-, Markt-, KPI-, Wissens-, Skript-, Backup- und weitere Arbeitsbereiche. Sie besitzt zahlreiche lokale Speicherbereiche, eigene öffentliche Schnittstellen, Sicherheitsmaßnahmen, responsive Ansätze und mehrere Generationen von Design- und Funktionsschichten.

Diese Breite ist gleichzeitig Stärke und Risiko. Die Stärke besteht darin, dass wertvolle Fachlogik, Inhalte und reale Arbeitsideen bereits vorhanden sind. Das Risiko besteht darin, dass historisch gewachsene Oberflächen, redundante Komponenten, unterschiedliche Stile und parallele Modulansätze den Eindruck einer Sammlung statt eines Produktes erzeugen. Ein weiterer additiver Ausbau würde diese Komplexität verstärken.

Die strategische Aufgabe von V31 lautet deshalb nicht: „Noch mehr Funktionen“. Sie lautet: „Die vorhandene Substanz in ein fokussiertes, konsistentes und belastbares System überführen.“ Das Produkt soll danach schneller verständlich, leichter bedienbar, sicherer erweiterbar und glaubwürdiger im Umgang mit Markt- und Kontaktdaten sein.

| Beobachtung im Ist-Zustand | Strategische Konsequenz |
| --- | --- |
| Viele Module und historische Schichten | Priorisierung, Konsolidierung und klare Informationsarchitektur vor neuen Features. |
| Single-File-App mit produktiven lokalen Daten | Keine riskante Big-Bang-Neuentwicklung; schrittweise Kapselung und Kompatibilität. |
| Telefonie bereits vorhanden, aber nicht dominant genug | Call-First-Arbeitsfluss zum Zentrum des Dashboards machen. |
| Dashboard-Kennzahlen teilweise passiv | Kennzahlen als Deep Links in arbeitsbereite Zielzustände definieren. |
| Marktmonitor mit ersten Karten- und Providergrundlagen | Bestehenden Unterbau prüfen, konsolidieren und zu echter Geografie und Datenwahrheit ausbauen. |
| Öffentliches Netlify-Hosting vorgesehen | Secrets, personenbezogene Daten und Internetprovider von Beginn an sicher konzipieren. |
| Mobile Nutzung auf dem iPhone wichtig | Mobile als eigenständigen Feldarbeitsmodus behandeln, nicht als verkleinerten Desktop. |

Das Produkt befindet sich an einem Übergangspunkt: Es ist zu wertvoll und zu umfangreich für rein kosmetische Anpassungen, aber noch kompakt genug, um eine klare Produktidentität zu etablieren. V31 nutzt dieses Fenster, bevor weitere Funktionen die historische Komplexität erhöhen.

### 2.1 Geschäftlicher Kontext des Nutzers

Der primäre Nutzer ist ein ambitionierter Immobilienmakler beziehungsweise Quereinsteiger, der seinen regionalen Markt systematisch aufbauen will. Sein Erfolg hängt nicht von gelegentlichen Einzelaktionen ab, sondern von wiederholbaren Vertriebsroutinen: Kontakte erfassen, telefonieren, Eigentümerbedarfe erkennen, Wiedervorlagen einhalten, Termine vorbereiten, Chancen in der Pipeline bewegen und regionale Beziehungen pflegen.

Die Software muss daher auf reale Nutzung unter Zeitdruck ausgelegt sein. Sie wird morgens zur Tagessteuerung, unterwegs auf dem Smartphone, nach Telefonaten zur Ergebnisaufnahme, vor Kundengesprächen zur Vorbereitung und im Marktgespräch zur regionalen Einordnung verwendet. Lange Konfigurationswege, abstrakte Analysen und überladene Masken erzeugen in diesem Kontext direkten Produktivitätsverlust.

Der regionale Fokus auf den Main-Kinzig-Kreis ist kein kosmetisches Branding. Er ist ein strategischer Vorteil. Regionale Tiefe kann gegenüber generischen CRM-Systemen einen echten Mehrwert schaffen: Gebietskenntnis, lokale Preisunterschiede, Netzwerke, eigene Aktivität, Tippgeber, Markttrends und Pipeline können in einer gemeinsamen räumlichen Logik verbunden werden.

### 2.2 Technischer Kontext als strategische Rahmenbedingung

Die aktuelle Architektur basiert überwiegend auf einer großen browserseitigen Anwendung mit lokaler Speicherung. Das ermöglicht Offline-Nutzung, schnelle Iteration und unmittelbare Datenkontrolle, begrenzt jedoch sichere externe Datenanbindungen, geräteübergreifende Synchronisierung und Mehrbenutzerfähigkeit.

Diese Einschränkung ist kein Grund für eine sofortige Komplettmigration. Stattdessen wird eine abgestufte Strategie verfolgt: Der operative Kern bleibt zunächst lokal und robust. Externe Marktdaten werden über eine sichere serverseitige Schicht angebunden. Neue Datenmodelle werden versioniert. Spätere Cloud-Synchronisierung oder Authentifizierung werden vorbereitet, aber nicht in V31 erzwungen, wenn sie die Stabilität gefährden.

> **Strategische Architekturhaltung**  
> Nicht die modernste theoretische Architektur gewinnt, sondern die Lösung, die heute sicher funktioniert, bestehende Daten schützt und den nächsten sinnvollen Entwicklungsschritt offenhält.

## 3 Problemdefinition und Marktchance

Immobilienmakler arbeiten typischerweise über viele getrennte Informationsquellen: Kontakte, Notizen, Telefonlisten, Kalender, Wiedervorlagen, Objektinformationen, Marktberichte, Karten, Tabellen und Wissensdokumente. Selbst wenn jedes Einzelwerkzeug funktioniert, entsteht Reibung an den Übergängen. Ein Kontakt wird erfasst, aber ohne nächste Aktion. Ein Telefonat wird geführt, aber nicht sauber nachbereitet. Eine Marktkennzahl ist vorhanden, aber ohne Quellenkontext. Eine Pipeline-Phase wird geändert, aber ohne Fälligkeit.

Das Kernproblem ist deshalb nicht Informationsmangel. Es ist fehlende operative Verbindung. Informationen werden wertvoll, wenn sie in konkrete, terminierte und nachverfolgbare Handlungen übersetzt werden. Keim CRM Pro adressiert genau diese Lücke: Es verbindet Beziehung, Aktivität, Zeitpunkt, Markt und nächste Aktion in einer persönlichen Arbeitsoberfläche.

Generische CRMs sind häufig team- und verwaltungsorientiert. Sie bieten viele Felder, Dashboards und Automationen, bilden aber die spezifische Arbeitsrealität eines regional aufbauenden Immobilienmaklers nur indirekt ab. Spezialisierte Maklersoftware konzentriert sich dagegen oft auf Objekte, Exposés, Portalschnittstellen und Transaktionsabwicklung. Zwischen diesen Welten liegt eine Chance für ein persönliches Makler-Operating-System, das Akquise, Tagessteuerung, regionale Marktintelligenz und Beziehungsarbeit konsequent zusammenführt.

| Problem | Auswirkung | Produktantwort |
| --- | --- | --- |
| Zu viele getrennte Werkzeuge | Suchen, Doppelerfassung, verlorener Kontext | Ein gemeinsames operatives System mit verknüpften Modulen. |
| Passive Dashboards | Zahlen werden betrachtet, aber Arbeit beginnt nicht | Jede relevante KPI wird zum Einstieg in eine konkrete Arbeitsansicht. |
| Unzuverlässige Wiedervorlage | Kontakte kühlen ab, Chancen gehen verloren | Fälligkeit, Überfälligkeit und nächste Aktion stehen im Zentrum. |
| Anrufe ohne saubere Nachbereitung | Aktivitäten sind nicht nachvollziehbar | Ergebnisaufnahme aktualisiert Kontakt, Aktivität und Folgeaktion konsistent. |
| Marktdaten ohne Herkunft | Scheinwissen und Vertrauensrisiko | Quelle, Zeitraum, Qualität und Aktualität werden immer sichtbar. |
| Generische Karten | Keine regionale Handlungsfähigkeit | Echte Geografie plus CRM-, Pipeline- und Markt-Layer. |
| Historisch gewachsene Oberfläche | Erhöhte kognitive Last und Inkonsistenz | Einheitliche Produktstruktur und Design-Sprache. |

### 3.1 Strategische Chance

Die Chance besteht nicht darin, alle Funktionen großer CRM-, GIS- und Maklersysteme nachzubauen. Die Chance besteht darin, die entscheidenden 20 Prozent der Funktionen so zu verbinden, dass sie einen überproportionalen Anteil des täglichen Nutzens liefern.

Der Vorteil von Keim CRM Pro kann aus vier Faktoren entstehen: konsequente persönliche Ausrichtung, tiefe regionale Logik, operative Vertriebspriorisierung und vollständige Nachvollziehbarkeit der Daten. Ein generisches System kann einzelne dieser Faktoren abbilden; die Kombination ist jedoch spezifisch und wertvoll.

> *Das Produkt gewinnt nicht durch maximale Breite, sondern durch bessere Verbindung der wenigen Tätigkeiten, die tatsächlich Aufträge erzeugen.*

## 4 Produktthese

Wenn ein Immobilienmakler morgens eine priorisierte, direkt ausführbare Arbeitsansicht erhält, in der Anrufe, Follow-ups, Termine, Pipeline-Risiken und regionale Chancen aus denselben Datenquellen zusammengeführt werden, dann steigt die Wahrscheinlichkeit, dass wichtige Kontakte rechtzeitig bearbeitet, Chancen konsequent weitergeführt und regionale Marktgespräche fundierter geführt werden.

Diese These beruht auf fünf Annahmen:

1. Konsequente Ausführung ist im persönlichen Maklervertrieb wichtiger als zusätzliche Berichtstiefe.
2. Die Qualität der nächsten Aktion ist wichtiger als die Menge gespeicherter Kontaktdaten.
3. Sichtbare Fälligkeit und Überfälligkeit reduzieren verlorene Chancen.
4. Regionale Marktkenntnis erhöht Gesprächsqualität und Positionierung, wenn Daten nachvollziehbar und aktuell sind.
5. Ein konsistentes System wird häufiger und zuverlässiger genutzt als eine Sammlung einzelner Module.

V31 soll diese These nicht nur visuell behaupten, sondern im Produktverhalten operationalisieren. Die wichtigste Messfrage lautet daher nicht: „Sieht das Dashboard moderner aus?“ Die wichtigere Frage lautet: „Kann Kevin nach dem Öffnen schneller mit der richtigen Tätigkeit beginnen und diese vollständig dokumentiert abschließen?“

### 4.1 Strategische Produktformel

> **Produktformel**  
> Relevanter Kontext + klare Priorität + ausführbare nächste Aktion + verlässliche Nachbereitung + regionale Datenwahrheit = höherer operativer Maklernutzen.

Jedes neue Modul und jede größere Komponente muss mindestens einen Teil dieser Formel verbessern. Funktionen, die keinen klaren Beitrag leisten, werden nicht automatisch entfernt, aber in ihrer Priorität herabgestuft, zusammengeführt oder in eine sekundäre Ebene verschoben.

## 5 Mission, Vision und Ambitionsniveau

Mission, Vision und Ambition erfüllen unterschiedliche Rollen. Die Mission beschreibt den heutigen Zweck. Die Vision beschreibt den angestrebten zukünftigen Zustand. Das Ambitionsniveau definiert, wie hoch die Qualitätsmesslatte liegt.

| Ebene | Verbindliche Formulierung |
| --- | --- |
| Mission | Keim CRM Pro macht die wichtigsten Tätigkeiten eines Immobilienmaklers sichtbar, ausführbar und nachverfolgbar – von der Kontaktaufnahme über die Wiedervorlage bis zur Pipeline- und Marktsteuerung. |
| Vision | Keim CRM Pro wird zur zentralen persönlichen Arbeitsoberfläche für regionalen Immobilienvertrieb: ein ruhiges, vertrauenswürdiges und datenbewusstes Operating System, das jeden Arbeitstag strukturiert und keine wertvolle Chance ohne nächsten Schritt lässt. |
| Ambition | Das Produkt soll sich in Klarheit, Konsistenz, Interaktionsqualität und Vertrauenswürdigkeit mit professioneller SaaS-Software messen können, ohne deren unnötige Komplexität zu übernehmen. |
| Versprechen | Nach dem Öffnen weiß der Nutzer, was wichtig ist, warum es wichtig ist und wie er die Arbeit unmittelbar beginnen kann. |

Die Vision bedeutet ausdrücklich nicht, dass Keim CRM Pro kurzfristig ein vollständiges Makler-ERP, Portalsystem, Buchhaltungssystem oder allgemeines Unternehmens-CRM werden soll. Die Vision ist auf den persönlichen operativen Kern ausgerichtet. Spätere Erweiterungen sind nur sinnvoll, wenn sie diesen Kern stärken oder sauber angrenzen.

### 5.1 Drei-Jahres-Zielbild

Innerhalb der nächsten Entwicklungsstufen soll Keim CRM Pro folgende Produktreife erreichen:

- Der Nutzer startet und beendet seinen Arbeitstag im System.
- Jeder aktive Lead, Eigentümerkontakt und Deal besitzt einen nachvollziehbaren nächsten Schritt.
- Anrufe und Follow-ups werden nicht nur gezählt, sondern als vollständiger Arbeitsfluss unterstützt.
- Der Marktmonitor verbindet regionale Marktkennzahlen mit echter Geografie und eigener Aktivität.
- Datenquellen, Aktualität und Unsicherheit sind transparent.
- Die App funktioniert auf Desktop und iPhone als bewusst gestaltetes Produkt.
- Backup, Import, Export und später Synchronisierung schaffen Vertrauen in die Datenhaltung.
- Neue Module können über dokumentierte Schnittstellen ergänzt werden, ohne das Gesamtsystem zu fragmentieren.

Dieses Zielbild ist absichtlich ergebnisorientiert. Es schreibt nicht vor, welche Bibliothek, welches Framework oder welche Cloud im Endzustand verwendet wird. Technische Entscheidungen können sich ändern; der Produktnutzen und die Vertrauensanforderungen bleiben stabil.

## 6 Zielnutzer und Nutzungskontext

Der primäre Zielnutzer von V31 ist Kevin Keim als einzelner, leistungsorientierter Immobilienmakler im regionalen Aufbau. Das Produkt wird zunächst nicht für einen abstrakten Massenmarkt optimiert. Diese Fokussierung ist strategisch: Ein präzise gelöstes reales Arbeitsproblem ist wertvoller als eine generische Lösung für hypothetische Nutzer.

| Dimension | Primärer Nutzerkontext |
| --- | --- |
| Rolle | Immobilienmakler beziehungsweise Makler im Aufbau mit starkem Fokus auf Akquise, Eigentümerkontakte und regionale Präsenz |
| Region | Main-Kinzig-Kreis mit priorisierten Kerngebieten und späterer Erweiterbarkeit |
| Arbeitsstil | Hohe Eigenverantwortung, viele direkte Kontakte, mobile Nutzung, wechselnde Tagesstruktur |
| Erfolgshebel | Telefonie, Follow-ups, Netzwerk, Eigentümergespräche, regionale Marktkenntnis, Pipeline-Disziplin |
| Geräte | iPhone unterwegs; Desktop oder großer Bildschirm im Büro; perspektivisch TV-/Monitoransicht |
| Datenanforderung | Schnelle Erfassung, lokale Robustheit, verlässliches Backup, nachvollziehbare Marktquellen |
| UX-Anforderung | Sofortige Orientierung, klare Priorität, wenige unnötige Schritte, hochwertige und motivierende Darstellung |
| Risikoprofil | Datenverlust, verpasste Wiedervorlagen, öffentliche personenbezogene Daten, falsche Marktangaben, überladene Oberfläche |

Sekundäre Nutzerrollen dürfen konzeptionell berücksichtigt werden, bestimmen V31 jedoch nicht. Dazu zählen spätere Assistenz, Teamkollegen, Führungskräfte oder externe Partner. Ihre Bedürfnisse werden nur dann umgesetzt, wenn der primäre Einzelnutzerfluss dadurch nicht verschlechtert wird.

### 6.1 Nutzungssituationen

| Situation | Nutzerfrage | Erwartete Produktantwort |
| --- | --- | --- |
| Morgendlicher Start | Was muss ich heute zuerst tun? | Kompakter Tagesstatus, nächster Anruf, dringende Queue und klare Priorität. |
| Telefonblock | Wen rufe ich jetzt an und warum? | Arbeitsbereite Call-Queue mit Kontext, Nummer, Grund und Ergebnisaufnahme. |
| Nach einem Gespräch | Was muss dokumentiert und nachverfolgt werden? | Schnelle Aktivitätserfassung, Ergebnis, Notiz und neue Fälligkeit. |
| Vor Eigentümertermin | Was weiß ich über Person, Objekt und Region? | Kontakt-, Objekt-, Aktivitäts- und Marktüberblick in einem nachvollziehbaren Kontext. |
| Pipeline-Review | Wo stehen Chancen und was stagniert? | Phasen, letzte Aktivität, nächste Aktion, Fälligkeit und transparente Risikogründe. |
| Marktgespräch | Wie entwickelt sich ein Ort und wie aktuell sind die Daten? | Gebietskennzahl, Trend, Quelle, Zeitraum, Datenqualität und Karte. |
| Unterwegs | Was ist die nächste sinnvolle Aktion? | Mobile priorisierte Ansicht mit großen Touch-Aktionen und wenig Eingabeaufwand. |
| Tagesabschluss | Was wurde erledigt und was bleibt offen? | Kurzer Review, offene nächste Schritte, sichere Speicherung und Übergang zum nächsten Tag. |

### 6.2 Persona ohne künstliche Vereinfachung

Die Zielpersona darf nicht zu einer oberflächlichen Marketingfigur reduziert werden. Der Nutzer ist gleichzeitig Verkäufer, Beziehungspfleger, Marktbeobachter, Organisator und Unternehmer. Er benötigt sowohl Geschwindigkeit als auch Vertrauen. Er will motiviert werden, aber keine spielerische Oberfläche. Er will aktuelle Zahlen, aber keine erfundene Genauigkeit. Er will eine leistungsorientierte App, aber keine unkontrollierbare Automatisierung.

Daraus folgt eine zentrale Designspannung: Das Produkt muss energisch genug sein, um Handlungen auszulösen, und ruhig genug, um professionell und vertrauenswürdig zu wirken. Diese Spannung wird nicht durch mehr Farben oder Animationen gelöst, sondern durch klare Reihenfolge, starke Typografie, präzise Zustände und unmittelbare Handlungsoptionen.

## 7 Jobs-to-be-Done

Jobs-to-be-Done beschreiben nicht einzelne Features, sondern Fortschritte, die der Nutzer in einem konkreten Kontext erreichen will. Sie dienen als Prüfstein für Roadmap und Priorisierung.

| Job | Erfolgskriterium | Typische Produktunterstützung |
| --- | --- | --- |
| Meinen Tag fokussiert beginnen | Innerhalb von 15 Sekunden ist die wichtigste nächste Aktion klar | Heute-Dashboard, Call-Hero, dringende Queue |
| Einen Telefonblock ohne Suchaufwand durchführen | Kontakte, Kontext und Ergebnisaufnahme sind direkt verfügbar | Call-Queue, Kontaktkontext, Telefonaktion, Ergebnisdialog |
| Keinen relevanten Kontakt verlieren | Jeder aktive Kontakt besitzt nächsten Schritt und Fälligkeit | Follow-ups, Next-Step-Coverage, Überfälligkeit |
| Eine Chance aktiv durch die Pipeline bewegen | Phase, Risiko und nächste Aktion sind nachvollziehbar | Pipeline-Board, Detailpanel, Stagnationsregeln |
| Ein Eigentümergespräch fundiert vorbereiten | Kontakt-, Objekt- und Marktinformationen sind gebündelt | CRM-Detail, Objektbezug, Marktmonitor-Deep-Link |
| Eine Region strategisch bearbeiten | Marktdaten und eigene Aktivität sind räumlich sichtbar | Karte, Gebietsprofile, CRM-/Pipeline-Layer |
| Marktzahlen vertrauenswürdig verwenden | Quelle, Zeitraum und Qualität sind erkennbar | Source Badge, Last Updated, Datenqualitätsstatus |
| Daten sicher behalten | Backup, Export und Wiederherstellung sind verständlich | Backup-Center, Importvalidierung, Statusanzeigen |
| Unterwegs schnell erfassen | Wenige Felder, passende Tastatur, klare Speicherung | Mobile Quick Capture, Bottom Sheets |
| Meine Arbeitsweise verbessern | Fortschritt und Engpässe werden sichtbar, ohne falsche Scores | KPIs, Reviews, transparente Kennzahlen |

Jede neue Funktion muss mindestens einen Job messbar besser machen. „Mehr Informationen anzeigen“ ist kein eigenständiger Job. Informationen sind nur dann gerechtfertigt, wenn sie eine Entscheidung, Handlung, Risikobewertung oder Lernschleife unterstützen.

### 7.1 Primärer Job: Nächste Aktion sicherstellen

Der wichtigste übergreifende Job lautet: „Wenn ich einen aktiven Kontakt, ein Follow-up oder eine Chance öffne, möchte ich sofort wissen, was als Nächstes zu tun ist und bis wann, damit keine Gelegenheit durch Unklarheit oder Vergessen verloren geht.“

Dieser Job verbindet Dashboard, CRM, Follow-ups, Anrufliste und Pipeline. Er rechtfertigt ein gemeinsames Next-Action-Modell, sichtbare Fälligkeiten, Deep Links und eine konsistente Ergebnisaufnahme. Er rechtfertigt keine intransparente automatische Priorisierung. Das System darf Empfehlungen aus nachvollziehbaren Regeln ableiten, muss aber Ursache und Nutzerkontrolle erhalten.

## 8 Wertversprechen und Differenzierung

Keim CRM Pro verspricht nicht, den Maklerberuf zu automatisieren. Es verspricht, die operative Arbeit zu strukturieren und den Kontext für bessere Entscheidungen bereitzustellen. Die Differenzierung entsteht aus der Kombination von persönlicher Tagessteuerung, regionaler Marktintelligenz und konsequenter Nachverfolgung.

| Wertdimension | Konkretes Versprechen |
| --- | --- |
| Klarheit | Der Nutzer erkennt sofort, was heute wichtig ist. |
| Geschwindigkeit | Ein Klick führt von einer Kennzahl in eine arbeitsbereite Ansicht. |
| Verlässlichkeit | Fällige und überfällige Aktionen bleiben sichtbar, bis sie sauber bearbeitet sind. |
| Kontext | Kontakt, Aktivität, Objekt, Deal und Region werden verbunden. |
| Regionalität | Der Main-Kinzig-Kreis wird nicht als Liste, sondern als echte räumliche Arbeitslogik abgebildet. |
| Vertrauen | Marktdaten zeigen Quelle, Zeitraum, Qualität und Aktualität. |
| Kontrolle | Automationen unterstützen, übernehmen aber keine intransparenten Entscheidungen. |
| Robustheit | Bestehende Daten, Backups und Offline-Nutzung werden respektiert. |
| Qualität | Die Oberfläche wirkt wie ein zusammenhängendes professionelles Produkt. |

Die Differenzierung gegenüber generischen Systemen liegt nicht in einer einzelnen Funktion. Ein generisches CRM kann Kontakte verwalten; eine Kartenanwendung kann Orte anzeigen; ein Dashboard kann KPIs visualisieren. Keim CRM Pro verbindet diese Elemente entlang des tatsächlichen persönlichen Makler-Workflows.

### 8.1 Produktversprechen in einem Satz

> *Keim CRM Pro sorgt dafür, dass Kevin jeden Tag die richtigen Menschen zur richtigen Zeit mit dem richtigen regionalen Kontext bearbeitet – und dass aus jedem relevanten Kontakt ein nachvollziehbarer nächster Schritt entsteht.*

Dieser Satz ist ein Priorisierungsinstrument. Features, die dieses Versprechen stärken, erhalten Vorrang. Features, die davon ablenken, werden zurückgestellt oder in sekundäre Ebenen verschoben.

## 9 Produktprinzipien

Produktprinzipien sind Entscheidungsregeln für Situationen, in denen mehrere Lösungen möglich sind. Sie sind verbindlicher als Geschmack und dauerhafter als einzelne Features.

### 9.1 Nächste Aktion vor passivem Reporting

Eine Kennzahl ohne Handlungsmöglichkeit ist sekundär. Relevante Zahlen führen direkt in den Arbeitskontext, aus dem sie entstanden sind. Dashboards dürfen informieren, müssen aber vor allem Arbeit beginnen lassen.

### 9.2 Telefonie als primärer Umsatzhebel sichtbar machen

Anrufe sind nicht eine KPI unter vielen. Das Produkt behandelt Telefonie als operativen Hauptfluss: auswählen, anrufen, Ergebnis erfassen, Folgeaktion setzen und Fortschritt aktualisieren.

### 9.3 Wahrheit vor Wirkung

Keine erfundenen Marktdaten, keine fingierten Trends, keine geografischen Näherungen ohne Kennzeichnung und keine Scheingenauigkeit. Eine ehrliche Lücke ist besser als eine überzeugend dargestellte falsche Zahl.

### 9.4 Eine Quelle der Wahrheit

Derselbe Kontakt, dieselbe Aktivität und derselbe Deal dürfen nicht in parallelen Modulen voneinander abweichen. Oberflächen können verschieden sein; die fachliche Quelle bleibt eindeutig.

### 9.5 Progressive Offenlegung

Die wichtigste Information steht zuerst. Details erscheinen bei Bedarf. Das System vermeidet sowohl überladene Vollformulare als auch versteckte Kerninformationen.

### 9.6 Kontext bleibt bei der Aktion

Ein Nutzer soll nach Navigation nicht rekonstruieren müssen, warum er dort ist. Dashboard-Deep-Links übertragen Filter, Quelle und gegebenenfalls Zielobjekt in die Zielansicht.

### 9.7 Fälligkeit ist ein Produktzustand

Überfälligkeit ist nicht nur eine rote Farbe. Sie beeinflusst Sortierung, Queue, Status und nächste Aktion. Der Nutzer kann Ursache und Konsequenz erkennen.

### 9.8 Mobile ist ein Feldarbeitsmodus

Mobile wird nicht als kleiner Desktop behandelt. Es priorisiert schnelle Auswahl, Telefonie, Erfassung und Nachbereitung. Komplexe Analyse bleibt zugänglich, aber nicht auf Kosten der Kernarbeit.

### 9.9 Regionalität ist funktional

Orte, Gebiete und Karten sind nicht nur Labels. Sie verbinden Markt, Kontakte, Pipeline, Tippgeber und Aktivität. Geografische Daten müssen echt, austauschbar und quellendokumentiert sein.

### 9.10 Automatisierung bleibt erklärbar

Das System darf erinnern, filtern, berechnen und vorschlagen. Es darf keine unverständlichen Scores, Prioritäten oder Kontaktentscheidungen erzeugen. Regeln und Auslöser müssen nachvollziehbar sein.

### 9.11 Bestehende Daten sind Produktkapital

Refactoring rechtfertigt keinen Datenverlust. Migrationen sind versioniert, testbar, reversibel oder zumindest durch verifizierte Backups abgesichert.

### 9.12 Fehlerzustände sind Teil des Produktes

Offline, leere Daten, ungültige Imports, fehlende Quellen und Providerfehler werden bewusst gestaltet. Ein System wirkt professionell, wenn es Probleme ehrlich und handlungsorientiert kommuniziert.

### 9.13 Qualität vor Featuremenge

Eine vollständig gestaltete, getestete Kernfunktion ist wertvoller als mehrere halb integrierte Module. Neue Features beginnen erst, wenn die strategisch wichtigeren Flüsse ihre Abnahmekriterien erfüllen.

### 9.14 Sicherheit und Datenschutz sind sichtbar

Schutzmechanismen dürfen nicht nur im Code existieren. Der Nutzer muss verstehen, wo Daten gespeichert werden, wann sie synchronisiert werden, wie Backups funktionieren und welche Daten extern verarbeitet werden.

### 9.15 Kontrollierte Evolution statt Big Bang

Die Anwendung wird schrittweise konsolidiert. Neue Schnittstellen werden additiv eingeführt, Datenparität geprüft und alte Oberflächen erst nach gesicherter Ablösung aus dem aktiven Produkt entfernt.

### 9.16 Motivation durch Fortschritt, nicht durch Spielerei

Fortschritt, Tagesziel und erledigte Arbeit dürfen motivieren. Die App vermeidet künstliche Abzeichen, übertriebene Animationen, Ranglisten oder Gaming-Ästhetik, die Professionalität und Vertrauen schwächen.

### 9.17 Komplexität muss ihren Nutzen beweisen

Jede zusätzliche Einstellung, Ansicht oder Kennzahl erzeugt Wartungs- und Lernkosten. Komplexität ist nur zulässig, wenn der operative Mehrwert klar und wiederkehrend ist.

### 9.18 Konfigurierbar statt hart verdrahtet, aber nicht beliebig

Regionen, Ziele und Datenprovider sollen austauschbar sein. Die Kernlogik bleibt jedoch bewusst fokussiert. Konfigurierbarkeit darf nicht zu einer generischen, unklaren Oberfläche führen.

## 10 Strategische Hierarchie der Arbeit

Nicht alle Tätigkeiten haben denselben unmittelbaren Wert. Das Produkt benötigt eine bewusste Hierarchie, damit wichtige Umsatzaktivitäten nicht zwischen Analyse, Administration und Wissensinhalten verschwinden.

| Priorität | Arbeitsklasse | Beispiele | Produktkonsequenz |
| --- | --- | --- | --- |
| P1 | Unmittelbar umsatzrelevant | Anrufe, Eigentümergespräche, Follow-ups, Abschluss- und Terminaktionen | Im Heute-Dashboard prominent; direkt ausführbar; fällige Zustände sichtbar. |
| P2 | Pipeline-sichernd | Nächste Aktion setzen, Unterlagen nachhalten, Deal bewegen, Risiko klären | In Pipeline und dringender Queue; transparente Stagnation. |
| P3 | Beziehungsaufbau | Tippgeberpflege, Netzwerk, regionale Kontakte, langfristige Touchpoints | Geplant und wiederkehrend, aber nicht vor fälligen P1-Aktionen. |
| P4 | Marktintelligenz | Gebietsvergleich, Preisentwicklung, Angebotsbeobachtung, Quellenprüfung | Kontext für Gespräche und Gebietsfokus; keine Ablenkung vom Tagesgeschäft. |
| P5 | Administration und Systempflege | Datenqualität, Backup, Import, Einstellungen, Dokumentation | Sicher erreichbar, aber aus der Hauptnavigation heraus priorisiert. |
| P6 | Wissen und Training | Skripte, Einwände, Playbooks, Lerninhalte | Kontextuell verlinkt oder in sekundärer Ebene; nicht als operative Startseite. |

Diese Hierarchie ist keine Bewertung der langfristigen Bedeutung. Marktintelligenz und Wissen können strategisch wichtig sein. Im Tagesablauf dürfen sie jedoch fällige Kontakte und konkrete Chancen nicht verdrängen.

### 10.1 Priorisierung ohne Black-Box-Score

Das Produkt soll relevante Arbeit sortieren, aber keine intransparente Personenbewertung oder automatische A/B/C-Klassifizierung wieder einführen. Priorität wird aus überprüfbaren Zuständen abgeleitet, zum Beispiel Fälligkeit, Überfälligkeit, manuell gesetzte Priorität, Terminbezug, fehlender nächster Schritt oder definierte Pipeline-Stagnation.

- Fälligkeitsbasierte Sortierung ist erlaubt und erwünscht.
- Manuelle Prioritäten bleiben sichtbar und änderbar.
- Empfehlungen müssen ihren Grund anzeigen.
- Ein Nutzer kann Filter und Reihenfolge korrigieren.
- Personenbezogene Qualitätsscores ohne klare Rechts- und Fachgrundlage sind kein Bestandteil der Produktstrategie.

## 11 Strategische Kernabläufe

Keim CRM Pro wird um wenige End-to-End-Abläufe organisiert. Module sind nur Teilansichten dieser Abläufe. Die Produktqualität wird daran gemessen, ob Daten und nächste Schritte entlang der gesamten Kette konsistent bleiben.

### 11.1 Lead-to-Appointment

1. Lead oder Kontakt erfassen.
2. Quelle, Rolle, Gebiet und Anlass dokumentieren.
3. Erste Kontaktaktion planen oder direkt ausführen.
4. Gesprächsergebnis erfassen.
5. Nächsten Schritt mit Datum und Kanal setzen.
6. Bei Qualifizierung einen Termin oder Pipeline-Eintrag erzeugen.
7. Dashboard und Follow-up-Queue automatisch konsistent aktualisieren.

Erfolg bedeutet nicht nur, dass ein Datensatz gespeichert wurde. Erfolg bedeutet, dass der Kontakt nach der Erfassung eine eindeutige operative Zukunft besitzt.

### 11.2 Call-to-Follow-up

1. Nächsten Anruf aus der Call-Queue auswählen.
2. Kontaktkontext und Grund des Anrufs prüfen.
3. Anruf über Smartphone oder manuell starten.
4. Ergebnis mit möglichst wenig Reibung erfassen.
5. Bei „nicht erreicht“ oder „später“ eine Wiedervorlage setzen.
6. Bei Interesse Aktivität, Termin oder Pipeline-Status aktualisieren.
7. Queue, Fortschritt und Kontaktverlauf synchron neu rendern.

> **Vollständigkeitsregel**  
> Ein Anruf gilt nicht als sauber abgeschlossen, wenn nur der Zähler erhöht wurde. Mindestens Ergebnis und nächster Zustand müssen feststehen.

### 11.3 Follow-up-to-Progress

Fällige Follow-ups werden nach Überfälligkeit, Datum und manueller Priorität sortiert. Der Nutzer kann die Aktion direkt ausführen, den Ausgang dokumentieren und einen neuen nächsten Schritt setzen. Ein Follow-up darf nicht in einem isolierten Modul enden; es aktualisiert die Beziehungshistorie und gegebenenfalls die Pipeline.

### 11.4 Contact-to-Pipeline

Ein qualifizierter Kontakt kann ohne Doppelerfassung in die Eigentümer-, Bewertungs- oder Verkaufspipeline übernommen werden. Kontaktidentität, Quelle, Gebiet und Aktivitätsverlauf bleiben erhalten. Die Pipeline ergänzt phasenspezifische Informationen, ersetzt aber nicht den Kontakt.

### 11.5 Market-to-Action

1. Gebiet oder Kennzahl im Marktmonitor auswählen.
2. Aktualität, Quelle und Datenqualität prüfen.
3. Gebiet mit Vergleichsgebiet oder Referenz vergleichen.
4. Eigene CRM-, Follow-up- oder Pipeline-Aktivität als Layer einblenden.
5. Handlungsoption auswählen, zum Beispiel Kontakte im Gebiet öffnen oder Gebietsaktion planen.
6. Die Zielansicht übernimmt Gebiet und relevanten Filter.

Der Marktmonitor ist dann erfolgreich, wenn Marktwissen zu einer besseren Entscheidung oder Handlung führt. Eine schöne Karte ohne operative Verbindung erfüllt diesen Zweck nicht.

### 11.6 Referral-to-Opportunity

Ein Hinweis oder Tippgeberkontakt wird mit Quelle, Einwilligung, Status und nächstem Touchpoint erfasst. Aus einem qualifizierten Hinweis kann ein Kontakt und später eine Pipeline-Chance entstehen. Der Tippgeber bleibt als Herkunft verbunden, ohne vertrauliche Transaktionsdetails unnötig offenzulegen.

## 12 Produktumfang und Nicht-Ziele

Klare Nicht-Ziele schützen Fokus und Qualität. Sie verhindern, dass V31 durch attraktive, aber strategisch nachrangige Ideen überladen wird.

| Bereich | V31 im Umfang | Nicht-Ziel von V31 |
| --- | --- | --- |
| Tagessteuerung | Heute-Dashboard, Call-First, dringende Queue, Deep Links | Komplexe persönliche Produktivitätsmethodik oder Gamification-Plattform |
| CRM | Ein primäres CRM, Kontaktkontext, Aktivitäten, nächste Aktion | Vollständiges unternehmensweites Multi-Team-CRM |
| Follow-ups | Fälligkeit, Überfälligkeit, Abschluss und Folgeaktion | Autonome Kontaktaufnahme ohne Nutzerfreigabe |
| Pipeline | Phasen, nächste Aktion, Stagnation, Detailkontext | Komplette Transaktions-, Notar- oder Buchhaltungsabwicklung |
| Marktmonitor | Echte Karte, geprüfte Geodaten, Provider-Architektur, erste reale Daten | Rechtlich fragwürdiges Portal-Scraping oder vollautomatische Verkehrswertermittlung |
| Mobile | Arbeitsfähige iPhone-Erfahrung | Native iOS-App mit App-Store-Vertrieb |
| Daten | Versionierte lokale Modelle, sichere externe Provider, Backup | Vollständige Cloud-Migration aller Daten in V31 |
| KI | Vorbereitete, kontrollierte Assistenz und Prompt-Bereich | Autonome Entscheidungen oder unkontrollierte Kundenkommunikation |
| Administration | Backup, Import, Export, Datenqualität | Buchhaltung, Lohn, vollständiges Dokumentenmanagement |
| Öffentlichkeit | Professionell gehostete persönliche App | Öffentliches Kundenportal mit sensiblen Echtdaten ohne Authentifizierung |

Ein Nicht-Ziel ist keine endgültige Ablehnung. Es bedeutet, dass die Funktion nicht Teil der strategischen V31-Abnahme ist. Spätere Aufnahme erfordert einen nachgewiesenen Nutzen, eine saubere Einordnung und gegebenenfalls neue Sicherheits- oder Architekturgrundlagen.

### 12.1 Explizite Anti-Ziele

- Keine Featuremenge als Qualitätsbeweis.
- Keine künstliche „Enterprise“-Optik durch Überladung, Glas-Effekte oder unnötige Animationen.
- Keine Kartenform, die geografische Genauigkeit nur imitiert.
- Keine Marktkennzahl ohne Herkunft und Zeitraum.
- Keine neue Speicherung derselben Entität nur für eine neue Oberfläche.
- Keine automatische Priorisierung, die der Nutzer nicht erklären kann.
- Keine öffentliche Bereitstellung sensibler Kontaktdaten ohne Zugriffsschutz.
- Keine Komplettmigration, nur weil ein neues Framework attraktiver wirkt.
- Keine versteckten Filter, die über Sitzungen hinweg unerwartet aktiv bleiben.
- Keine Erfolgsmeldung, wenn nur die UI reagiert, aber abhängige Daten nicht konsistent aktualisiert wurden.

## 13 Strategische Modulrollen

Jeder Hauptbereich besitzt eine eindeutige Rolle. Diese Rollen verhindern Überschneidungen und helfen, neue Anforderungen an der richtigen Stelle einzuordnen.

| Modul | Strategische Rolle | Primäre Nutzerfrage |
| --- | --- | --- |
| Heute | Operative Tagessteuerung | Was muss ich jetzt tun? |
| Kontakte / CRM | Beziehungs- und Kontextquelle | Wer ist die Person, was ist passiert und was folgt? |
| Follow-ups | Zeitgebundene Arbeitsliste | Was ist wann fällig oder überfällig? |
| Pipeline | Chancen- und Fortschrittssteuerung | Wo steht die Chance und was bewegt sie weiter? |
| Markt | Regionale Analyse- und Aktionsoberfläche | Was passiert in welchem Gebiet und was bedeutet es für meine Arbeit? |
| Tippgeber | Netzwerk- und Herkunftsmanagement | Wer kann relevante Hinweise geben und wann ist der nächste Touchpoint? |
| KPIs / Reviews | Lern- und Steuerungsebene | Welche Aktivitäten und Engpässe verändern sich? |
| Wissen / Skripte / KI-Prompts | Kontextuelle Unterstützung | Welche Formulierung oder Information hilft in dieser Situation? |
| Backup / Datenqualität / Einstellungen | Vertrauens- und Administrationsschicht | Sind meine Daten sicher, vollständig und kontrollierbar? |

Die Hauptnavigation darf diese Rollen gruppieren, aber nicht vermischen. Wissen und Backup bleiben wichtig, gehören jedoch nicht auf dieselbe visuelle Prioritätsstufe wie Anrufe, Follow-ups und aktive Chancen.

### 13.1 Heute als Orchestrator, nicht als Datenkopie

Das Heute-Dashboard besitzt möglichst wenig eigene Businessdaten. Es liest bestehende Quellen, aggregiert Zustände und leitet in die Ursprungsmodule weiter. Dadurch bleiben Kontakt, Follow-up, Anruf und Pipeline fachlich eindeutig. Das Dashboard darf temporären Navigationszustand halten, aber keine zweite Wahrheit erzeugen.

### 13.2 Markt als Kontextschicht

Der Marktmonitor soll fachlich zwischen externer Marktinformation und eigener Geschäftstätigkeit unterscheiden. Externe Kennzahlen, Geo-Daten, CRM-Kontakte, Pipeline-Objekte und eigene Verkäufe werden als getrennte Layer modelliert. Die Oberfläche darf sie gemeinsam zeigen, aber Quelle und Bedeutung müssen erhalten bleiben.

## 14 Regionale Produktstrategie: Main-Kinzig-Kreis

Der Main-Kinzig-Kreis ist der primäre räumliche Fokus. Die Anwendung soll regionale Tiefe entwickeln, ohne technisch auf eine einzige Region fest verdrahtet zu sein. Das strategische Muster lautet: lokal präzise, strukturell erweiterbar.

Die im Produkt wiederkehrenden Kerngebiete umfassen insbesondere Hanau, Bruchköbel, Schöneck, Nidderau, Erlensee, Langenselbold, Maintal, Gelnhausen, Freigericht, Rodenbach, Hammersbach und Neuberg. Diese Gebiete unterscheiden sich hinsichtlich Volumen, Preisniveau, Siedlungsstruktur, Eigentümerprofil und strategischer Bedeutung. Der Marktmonitor muss Unterschiede sichtbar machen, ohne aus unvollständigen Daten scheinbar exakte Ranglisten abzuleiten.

| Strategisches Gebietsmuster | Produktunterstützung |
| --- | --- |
| Kernfestung | Hohe Kontakt- und Netzwerkdichte, regelmäßige Aktivität, tiefe Gebietsprofile |
| Volumengebiet | Mehr Kontakte und Objekte, stärkere Filterung nach Stadtteilen und Segmenten |
| Hochpreisgebiet | Preis- und Objektsegment differenziert, Marktquelle und Vergleichbarkeit besonders transparent |
| Erweiterungsring | Gezielte Aktivierung, Marktbeobachtung und Tippgeberaufbau |
| Selektives Gebiet | Nur bei konkreter Chance oder sinnvoller Netzwerkanbindung priorisieren |

Diese Kategorien sind strategische Arbeitsmodelle, keine dauerhaften Werturteile über Orte. Sie sollen konfigurierbar, nachvollziehbar und an reale Aktivität beziehungsweise Marktbedingungen anpassbar sein.

### 14.1 Räumliche Datenwahrheit

- Orte werden über stabile IDs, echte Koordinaten und geprüfte Verwaltungsgeometrien abgebildet.
- Geometrie, Gebietsmetadaten und Marktkennzahlen werden getrennt gespeichert.
- Quellen, Stand und Lizenz von Grenzdaten werden dokumentiert.
- Vereinfachte Geometrien sind zulässig, wenn die Vereinfachung technisch begründet und visuell nicht irreführend ist.
- Private Kontaktadressen werden nicht ungeschützt als öffentliche Kartenmarker dargestellt.
- Gebietsvergleiche zeigen Datenlücken und unterschiedliche Zeiträume deutlich.

### 14.2 Regionale Handlung statt Kartendekoration

Jede zentrale Kartenansicht soll mindestens eine operative Fortsetzung anbieten: Kontakte im Gebiet öffnen, fällige Follow-ups anzeigen, Pipeline-Objekte filtern, Gebietsnotiz aktualisieren oder Marktkennzahl vergleichen. Eine Karte, die nur betrachtet werden kann, erfüllt die regionale Produktstrategie nur teilweise.

## 15 Datenvertrauen als Produktstrategie

Keim CRM Pro verarbeitet zwei grundsätzlich verschiedene Datenklassen: eigene operative Daten und externe Markt- beziehungsweise Geodaten. Vertrauen entsteht, wenn Herkunft, Aktualität, Verantwortlichkeit und Fehlerverhalten beider Klassen klar sind.

| Datenklasse | Beispiele | Vertrauensanforderung |
| --- | --- | --- |
| Eigene operative Daten | Kontakte, Aktivitäten, Follow-ups, Pipeline, Tippgeber | Keine stillen Verluste; eindeutige IDs; Backup; Migration; nachvollziehbare Änderungen. |
| Externe Marktdaten | Angebotspreise, Mieten, Trends, statistische Kennzahlen | Quelle, Zeitraum, Abrufzeit, Lizenz, Qualität und mögliche Unsicherheit. |
| Geodaten | Koordinaten, Gemeindegrenzen, Layer | Geografische Quelle, Stand, Lizenz und stabile Gebietsschlüssel. |
| Abgeleitete Kennzahlen | Stagnation, Conversion, Zielerreichung | Berechnungsregel transparent; keine Black Box; Eingabedaten nachvollziehbar. |
| Prognosen | Preistrend oder Marktprojektion | Methode, Unsicherheit, Zeitraum und klare Trennung von Ist-Daten. |

Das Produkt darf bei fehlenden Daten nicht so tun, als wären Werte vorhanden. Zulässige Zustände sind zum Beispiel „nicht verfügbar“, „veraltet“, „geschätzt“, „Quelle nicht verbunden“ oder „letzter valider Stand“. Solche Zustände sind keine Schwäche, sondern Ausdruck professioneller Datenkommunikation.

### 15.1 Aktualität ist je Datenart unterschiedlich

„Täglich aktuell“ darf nur für Daten behauptet werden, die tatsächlich täglich neu vorliegen oder geprüft werden können. Geodaten ändern sich selten, Angebotsdaten häufiger, amtliche Statistiken oft monatlich, quartalsweise oder jährlich. Das Produkt zeigt daher nicht nur „zuletzt synchronisiert“, sondern unterscheidet zwischen Abrufzeitpunkt und fachlichem Beobachtungszeitraum.

> **Beispiel**  
> Eine Kennzahl kann heute abgerufen worden sein und trotzdem den Zeitraum des Vorquartals beschreiben. Beide Informationen müssen sichtbar sein, damit Aktualität nicht missverstanden wird.

### 15.2 Datenqualitätsstufen

| Status | Bedeutung | Darstellung |
| --- | --- | --- |
| Verifiziert | Quelle und Transformation geprüft; Zeitraum und Gebiet eindeutig | Normaler Status mit Quellenhinweis |
| Geschätzt | Wert basiert auf nachvollziehbarer Schätzung oder unvollständiger Stichprobe | Deutlich als Schätzung gekennzeichnet |
| Veraltet | TTL oder fachlicher Aktualitätsrahmen überschritten | Warnstatus; letzter valider Wert bleibt sichtbar |
| Fehlend | Kein belastbarer Wert vorhanden | Kein Ersatzwert erfinden; nächste mögliche Aktion anbieten |
| Fehlerhaft | Validierung oder Providerabruf gescheitert | Fehler verständlich erklären; Retry beziehungsweise Fallback |
| Unvergleichbar | Gebiete, Zeiträume oder Definitionen unterscheiden sich zu stark | Vergleich blockieren oder mit klarer Einschränkung anzeigen |

## 16 Sicherheit und Datenschutz als strategische Produktanforderung

Eine Makleranwendung enthält personenbezogene und geschäftlich sensible Informationen. Sicherheit ist deshalb kein nachträglicher technischer Check, sondern Teil des Produktversprechens. Die öffentlich erreichbare Netlify-URL erhöht die Bedeutung klarer Zugriffsschutz- und Datenhaltungsentscheidungen.

- API-Schlüssel und private Provider-Tokens werden niemals im Browsercode oder öffentlichen Repository gespeichert.
- Externe schlüsselpflichtige Dienste werden über eine kontrollierte serverseitige Schicht angebunden.
- Personenbezogene Daten werden nicht ohne Authentifizierung oder explizite Entscheidung öffentlich verfügbar gemacht.
- Exakte Privatadressen werden auf öffentlich sichtbaren Karten vermieden oder geschützt.
- Importe werden validiert; Backups werden als sensible Dateien behandelt.
- Nutzereingaben werden sicher gerendert; Self-XSS und ungefilterte HTML-Ausgabe bleiben ausgeschlossen.
- Fehlerlogs enthalten keine Tokens, vollständigen Telefonnummern oder unnötige personenbezogene Inhalte.
- Der Nutzer kann nachvollziehen, welche Daten lokal, extern oder in einem Cache gespeichert werden.

Strategisch ist zu entscheiden, ob die produktive App dauerhaft nur privat genutzt, mit Netlify-Zugriffsschutz versehen oder später über eine echte Authentifizierung betrieben wird. Bis diese Entscheidung umgesetzt ist, darf eine öffentlich erreichbare Instanz nicht bedenkenlos mit sensiblen Echtdaten befüllt werden.

### 16.1 Privacy by Default

Neue Funktionen verwenden standardmäßig die datensparsamste sinnvolle Darstellung. Eine Karte zeigt beispielsweise Gebietsaggregation statt exakter Privatadressen. Ein Abschlussbericht nennt Datensatz-IDs nur, wenn dies notwendig ist. Export und Synchronisierung erfolgen bewusst und nachvollziehbar, nicht unbemerkt im Hintergrund.

## 17 Erfolgsmodell und Messsystem

Das Produkt darf nicht allein nach Nutzungshäufigkeit oder Anzahl gespeicherter Datensätze bewertet werden. Viele Einträge können auch schlechte Datenqualität oder administrative Last bedeuten. Erfolg wird über eine Kombination aus operativer Ausführung, Prozessgesundheit, Geschäftsergebnissen und Qualitäts-Grenzwerten gemessen.

Die Messung dient der Verbesserung, nicht der Bewertung von Personen. Kennzahlen müssen verständlich, manipulationsresistent und fachlich sinnvoll sein.

### 17.1 North Star Metric

> **North Star: Next-Step Coverage**  
> Anteil aktiver vertriebsrelevanter Kontakte und Pipeline-Chancen, die einen klaren, dokumentierten und noch gültigen nächsten Schritt mit Verantwortlichkeit und Datum besitzen.

Diese Kennzahl ist näher am Produktnutzen als reine Anrufzahl oder Umsatz. Sie misst, ob das System Beziehungen und Chancen operativ unter Kontrolle hält. Umsatz bleibt ein wichtiges Ergebnis, wird jedoch von Markt, Provision, Objektwert und externen Faktoren beeinflusst. Next-Step Coverage ist direkter durch die Produktnutzung beeinflussbar.

Die Kennzahl darf nur auf klar definierten aktiven Entitäten beruhen. Erledigte, archivierte oder bewusst pausierte Kontakte werden nicht künstlich als Lücke gezählt. Die Berechnungsregel muss sichtbar und versioniert sein.

### 17.2 Leading Indicators

| Kennzahl | Definition | Warum sie wichtig ist |
| --- | --- | --- |
| Call Target Attainment | Erledigte qualifizierte Anrufaktivitäten im Verhältnis zum gesetzten Tages- oder Wochenziel | Misst Ausführung des wichtigsten Aktivitätshebels. |
| Follow-up Reliability | Anteil fristgerecht abgeschlossener Follow-ups | Zeigt Prozessdisziplin und Risiko verlorener Kontakte. |
| Overdue Backlog | Anzahl und Alter überfälliger Anrufe, Follow-ups und nächster Aktionen | Macht operative Schulden sichtbar. |
| Next-Step Coverage | Anteil aktiver Kontakte und Chancen mit gültigem nächsten Schritt | North Star für Prozesskontrolle. |
| Lead Response Time | Zeit von Erfassung bis erster dokumentierter Aktion | Relevant für Geschwindigkeit und Chance auf Kontakt. |
| Conversation-to-Appointment | Qualifizierte Gespräche, die zu Terminen führen | Verbindet Aktivität mit Fortschritt. |
| Pipeline Movement | Anteil aktiver Chancen mit sinnvoller Bewegung im definierten Zeitraum | Zeigt, ob Pipeline nicht nur wächst, sondern arbeitet. |
| Data Completeness | Anteil aktiver Datensätze mit den für den jeweiligen Status erforderlichen Kernfeldern | Schützt Arbeitsfähigkeit und Analysequalität. |
| Market Data Freshness | Anteil genutzter Kennzahlen innerhalb ihrer fachlichen Aktualitätsgrenze | Schützt Vertrauen im Marktmonitor. |

### 17.3 Lagging Indicators

| Kennzahl | Interpretation |
| --- | --- |
| Bewertungstermine | Konkreter Fortschritt aus Akquise und Follow-up |
| Makleraufträge | Zentrales Geschäftsergebnis, aber zeitverzögert |
| Verkäufe / Abschlüsse | Endergebnis der Pipeline |
| Provisionsumsatz | Wirtschaftliches Ergebnis; stark von Objektwerten und Split abhängig |
| Empfehlungsquote | Qualität von Beziehung und Service |
| Wiederkehrende Tippgeber | Stabilität des regionalen Netzwerks |
| Gebietsabdeckung | Aktive Kontakte und Chancen in priorisierten Regionen |

### 17.4 Guardrail Metrics

Guardrails verhindern, dass eine Zielkennzahl auf Kosten der Produktqualität optimiert wird.

- Keine Erhöhung der Anrufzahl durch bedeutungslose oder doppelte Logeinträge.
- Keine Verbesserung der Next-Step Coverage durch massenhaft unqualifizierte Standardtermine.
- Keine schnellere Erfassung auf Kosten unlesbarer oder unvollständiger Kontaktdaten.
- Keine höhere Marktdatenabdeckung durch unlizenzierte oder unklare Quellen.
- Keine visuelle Verdichtung auf Kosten von Accessibility und Mobile-Bedienbarkeit.
- Keine neue Automatisierung auf Kosten von Transparenz und Nutzerkontrolle.
- Keine Performanceverbesserung durch Entfernen notwendiger Sicherheits- oder Backupfunktionen.

### 17.5 Produktqualitätskennzahlen

| Qualitätsbereich | Zielrichtung |
| --- | --- |
| Time to First Action | Vom App-Start bis zur ersten sinnvollen Aktion so kurz wie möglich |
| Task Completion | Kernabläufe ohne Abbruch und ohne unnötige Rücknavigation abschließbar |
| Navigation Success | Dashboard-Deep-Links öffnen den erwarteten Filterzustand zuverlässig |
| Mobile Integrity | Keine kritischen Layout-, Touch- oder Tastaturprobleme auf 390 px |
| Data Integrity | Keine verlorenen oder duplizierten Datensätze durch Release oder Migration |
| Console Health | Keine ungeklärten Fehler im normalen Betrieb |
| Provider Transparency | Jede externe Kennzahl besitzt Quelle und Aktualitätsstatus |
| Recovery Confidence | Backup, Import und Rollback werden getestet und dokumentiert |

## 18 Ziele für V31

V31 ist die erste Produktreife-Version des neuen Systems. Sie soll nicht alle Zukunftsfunktionen liefern. Sie muss jedoch die strategischen Grundlagen so vollständig schaffen, dass spätere Daten-, Cloud- und KI-Erweiterungen nicht erneut eine grundlegende Neustrukturierung verlangen.

| V31-Ziel | Erwartetes Ergebnis |
| --- | --- |
| Ein Produkt statt Modulsammlung | Einheitliche App-Shell, visuelle Sprache, Navigation und Zustände |
| Call-First-Dashboard | Anrufe im oberen Bereich; nächster Kontakt und Ergebnisfluss direkt ausführbar |
| Interaktive Kennzahlen | Offene Leads, Follow-ups, Aufgaben, Anrufe und Risiken öffnen gefilterte Arbeitsansichten |
| CRM-Konsolidierung | Eine sichtbare primäre Kontaktoberfläche; keine konkurrierenden Wahrheiten |
| Follow-up-Arbeitsliste | Überfällig, heute, nächste Tage, Ergebnis und Folgeaktion |
| Kontrollierte Pipeline | Phase, letzte Aktivität, nächste Aktion, Fälligkeit und Stagnationsgrund |
| Echte Kartenbasis | Basiskarte, reale Koordinaten, dokumentierte Grenzen, Layer und Mobile-Bedienung |
| Datenprovider-Fundament | Sichere serverseitige Anbindung, Cache, Quelle, Last Updated und Fallback |
| Mobile Produktreife | Eigene Priorisierung, Bottom Navigation, responsive Listen und touchgerechte Karte |
| Vertrauensschicht | Backup, Import, Datenqualität, Fehler- und Offlinezustände nachvollziehbar |

V31 ist strategisch abgeschlossen, wenn diese Ergebnisse als zusammenhängende Erfahrung funktionieren. Eine teilweise implementierte Funktion mit sichtbarem Placeholder ist kein ausreichender Abschluss, sofern sie als produktiv dargestellt wird.

### 18.1 V31 Outcome Statements

- Wenn Kevin die App öffnet, sieht er Anrufe und fällige Arbeit vor nachrangigen Analysen.
- Wenn Kevin eine Dashboard-Kennzahl anklickt, landet er in der erwarteten, sichtbaren Filteransicht.
- Wenn Kevin einen Anruf abschließt, sind Aktivität, Queue, Kontakt und Folgeaktion konsistent.
- Wenn Kevin einen aktiven Kontakt öffnet, erkennt er die nächste Aktion und Fälligkeit.
- Wenn Kevin eine Pipeline-Chance betrachtet, versteht er Phase, Fortschritt und Stagnationsgrund.
- Wenn Kevin eine Marktkennzahl verwendet, erkennt er Quelle, Zeitraum, Aktualität und Datenqualität.
- Wenn keine Internetverbindung besteht, bleibt der operative Kern nutzbar und der Marktmonitor zeigt den letzten validen Stand transparent.
- Wenn V31 ausgerollt wird, bleiben bestehende Daten, Backups und produktive Keys erhalten.

## 19 Strategische Annahmen und Validierungsplan

Das Dokument enthält bewusste Annahmen. Sie werden nicht als ewige Wahrheit behandelt, sondern durch Nutzung und Messung überprüft.

| Annahme | Validierung | Entscheidungssignal |
| --- | --- | --- |
| Telefonie ist der wichtigste tägliche Umsatzhebel | Nutzung des Call-Hero, abgeschlossene Anrufabläufe, qualitative Rückmeldung | Bleibt dominant, wenn es tatsächlich tägliche Arbeit startet; sonst Gewichtung anpassen. |
| Deep Links reduzieren Reibung | Zeit und Klicks von Dashboard bis erster Bearbeitung vergleichen | Filtervertrag beibehalten und ausbauen, wenn Navigation messbar schneller wird. |
| Eine primäre CRM-Oberfläche verbessert Klarheit | Fehler, Suchzeit und Datenparität vor/nach Konsolidierung prüfen | Legacy weiter zurücknehmen, wenn keine Funktionslücke entsteht. |
| Marktkarte erzeugt operativen Nutzen | Nutzung von Gebietsauswahl, Layern und Folgeaktionen beobachten | Layer und Aktionen priorisieren; dekorative Elemente reduzieren. |
| Lokale Offline-Robustheit bleibt wichtig | Nutzung ohne Netz und Wiederherstellungsfälle beobachten | Lokalen Kern erhalten oder später kontrolliert synchronisieren. |
| Aktualitäts- und Quellenstatus erhöht Vertrauen | Nutzerfeedback und Fehlerfälle prüfen | Transparenz standardisieren, auch wenn UI dadurch etwas dichter wird. |
| Mobile wird primär für Aktion, nicht Analyse genutzt | Mobile Flüsse und Verweildauer qualitativ prüfen | Mobile auf Call, Capture, Follow-up und Detailzugriff fokussieren. |

Validierung bedeutet nicht zwingend komplexe Analytics. Bei einem Single-User-Produkt sind strukturierte Nutzungstests, Zeitmessung, Fehlerprotokolle, Screenshots und regelmäßige Reviews ausreichend, solange Erkenntnisse dokumentiert und Entscheidungen nachvollziehbar sind.

### 19.1 Entdeckungsfragen für jede größere Funktion

- Welches konkrete Nutzerproblem wird gelöst?
- In welcher realen Situation tritt es auf?
- Wie wird das Problem heute umgangen?
- Welche Datenquelle ist fachlich verantwortlich?
- Welche nächste Aktion soll möglich werden?
- Was ist der einfachste vollständige Arbeitsfluss?
- Wie sieht der Fehler-, Leer- und Offlinezustand aus?
- Welche bestehende Funktion könnte dadurch redundant werden?
- Wie messen wir, ob die Änderung tatsächlich hilft?
- Welche neue Wartungs- oder Sicherheitslast entsteht?

## 20 Strategische Risiken und Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
| --- | --- | --- |
| Feature Creep | V31 wird zu groß und nie konsistent fertig | Outcome-basierte Phasen, Nicht-Ziele, Release-Gates. |
| Big-Bang-Refactoring | Datenverlust, Regression, lange Blockade | Additive Schnittstellen, Backup, Paritätstests, phasenweise Ablösung. |
| Design über Funktion | Schöne, aber langsame oder unklare Oberfläche | Task-Completion und nächste Aktion als Abnahmekriterium. |
| Parallele Datenmodelle | Inkonsistente Kontakte und Pipeline | Eine Quelle der Wahrheit; neue Ansichten lesen bestehende Modelle. |
| Unklare Marktdatenrechte | Rechtliches und reputatives Risiko | Source Registry, Lizenzprüfung, keine ungeklärten Produktivquellen. |
| Öffentliche Echtdaten | Datenschutzverletzung | Zugriffsschutz, Privacy by Default, keine ungeschützten Privatmarker. |
| Zu viele externe Abhängigkeiten | Ausfälle und langsamer Start | Caching, Fallback, Lazy Loading, Providerabstraktion. |
| Mobile Nachrangigkeit | App unterwegs unbrauchbar | Eigene Mobile-Gates pro Phase und 390-px-Test. |
| Intransparente Automatisierung | Vertrauensverlust und falsche Priorität | Erklärbare Regeln, Nutzerkontrolle, keine Black-Box-Scores. |
| Dokument veraltet | Entwicklung weicht stillschweigend ab | Versionierung, Change Log, ADRs und Release-Review. |
| Zu ambitionierte Dokumentation ohne Umsetzung | Plan ersetzt Produktfortschritt | Jedes Dokumentkapitel an konkrete V31-Gates und Commits koppeln. |

### 20.1 Bewusste Kompromisse

Ein strategisch gutes Produkt akzeptiert bewusste Grenzen. V31 kann beispielsweise weiterhin eine Single-File-Frontendbasis verwenden, wenn sie stabil bleibt, während serverseitige Netlify Functions separat ergänzt werden. Ebenso kann eine statische Offline-Kartenansicht vorübergehend als Fallback bestehen bleiben, solange die primäre Onlineansicht echte Geografie nutzt und der Fallback klar gekennzeichnet ist.

Kompromisse werden problematisch, wenn sie unsichtbar oder dauerhaft werden. Jeder bewusste Kompromiss erhält deshalb eine dokumentierte Begründung, Auswirkung, Review-Frist und gegebenenfalls eine spätere Exit-Strategie.

## 21 Produkt-Governance

Produkt-Governance verhindert, dass das System durch einzelne spontane Wünsche, technische Vorlieben oder kurzfristige Tool-Möglichkeiten seine Identität verliert. Governance bedeutet nicht Bürokratie. Sie schafft einen einfachen, wiederholbaren Entscheidungsprozess.

| Entscheidungstyp | Entscheider | Dokumentation |
| --- | --- | --- |
| Mission, Vision, Kernzielgruppe, North Star | Auftraggeber | Änderung im Master-PRD mit Begründung |
| Produktprinzipien und Nicht-Ziele | Auftraggeber nach Vorschlag und Analyse | PRD Change Log |
| UX- und Designsystem | Auftraggeber plus Product/UX Lead | Design Bible und visuelle Abnahme |
| Architektur, Datenmodell, Provider | Technischer Lead innerhalb der strategischen Leitplanken | ADR und technische Tests |
| Kleine Implementierungsdetails | Ausführender Entwickler | Commit und Code Review |
| Releasefreigabe | Auftraggeber nach QA-Bericht | Releasebericht und bekannte Grenzen |

Claude Code darf eigenständig innerhalb freigegebener Leitplanken entscheiden. Es darf jedoch keine strategische Annahme stillschweigend ändern, nur weil eine andere Lösung schneller zu implementieren ist.

### 21.1 Änderungsprozess

1. Änderungsbedarf und auslösendes Problem beschreiben.
2. Betroffene Nutzerjobs, Ziele, Prinzipien und Risiken benennen.
3. Mindestens zwei realistische Optionen prüfen, sofern die Änderung erheblich ist.
4. Empfehlung und Konsequenzen dokumentieren.
5. Explizite Freigabe einholen, wenn Mission, Scope, Daten oder Sicherheit wesentlich betroffen sind.
6. Dokumentversion und Change Log aktualisieren.
7. Umsetzung mit Tests und Rückfalloption verbinden.

### 21.2 Definition strategischer Blocker

Ein ausführender Entwickler hält nur bei echten Blockern an. Dazu zählen fehlende Zugangsdaten, ungeklärte Lizenzrechte, irreversible Datenmigrationen, Sicherheitsentscheidungen mit erheblicher Auswirkung, widersprüchliche Anforderungen oder notwendige kostenpflichtige Providerentscheidungen. Geschmack, kleine Layoutfragen oder normale technische Detailentscheidungen sind keine Blocker und werden innerhalb der Leitplanken eigenständig gelöst.

## 22 Roadmap-Horizont V31 bis V40

Die Roadmap ist richtungsweisend, nicht als starres Versprechen zu verstehen. Sie verhindert, dass spätere Themen voreilig in V31 gedrückt werden, und stellt sicher, dass heutige Architekturentscheidungen zukünftige Optionen nicht unnötig blockieren.

| Version / Horizont | Strategischer Schwerpunkt | Ergebnis |
| --- | --- | --- |
| V31 | Produktkonsolidierung und Fundament | Einheitliche App, Call-First-Dashboard, Deep Links, CRM/Pipeline-Klarheit, echte Kartenbasis, Providerfundament. |
| V32 | Reale Marktdaten und Datenqualität | Erste produktive Provider, geplante Aktualisierung, Source Registry, Datenvalidierung, bessere Gebietsvergleiche. |
| V33 | Arbeitsfluss-Intelligenz | Erklärbare Vorschläge, kontextuelle Prompts, bessere Review- und Lernschleifen ohne Black Box. |
| V34 | Sichere Synchronisierung | Optionale Cloud-Sicherung, Gerätewechsel, Authentifizierung und Konfliktstrategie. |
| V35 | Objekt- und Eigentümerarbeitsraum | Vertiefter Objektkontext, Unterlagenstatus, Termin- und Bewertungsworkflow. |
| V36 | Kommunikationsintegration | Kontrollierte E-Mail-/Kalender-/Telefonintegration, sofern Datenschutz und Nutzen geklärt sind. |
| V37 | Regionale Intelligence | Mehr Datenlayer, Segmentierung, eigene Marktbeobachtung, belastbare Forecasts mit Unsicherheit. |
| V38 | Teamfähigkeit optional | Rollen, Freigaben und Zusammenarbeit, ohne den persönlichen Kern zu verlieren. |
| V39 | Automatisierung mit Kontrolle | Wiederkehrende Aufgaben, Benachrichtigungen und Providerprozesse mit Auditierbarkeit. |
| V40 | Produktplattform | Modulare, dokumentierte Plattform mit stabilen APIs und klarer Erweiterbarkeit. |

Die Nummern dienen der strategischen Reihenfolge. Eine Funktion kann früher oder später umgesetzt werden, wenn Abhängigkeiten und Nutzen dies rechtfertigen. Die Grundlogik bleibt: erst ein konsistenter operativer Kern, dann Daten- und Cloud-Tiefe, anschließend intelligente Automatisierung und mögliche Teamfähigkeit.

### 22.1 Was V31 für spätere Versionen vorbereiten muss

- Stabile IDs und versionierte Datenmodelle.
- Zentrale Navigation und Deep-Link-Vertrag.
- Provider- und Adaptergrenzen für Markt- und Geodaten.
- Klare Trennung zwischen eigener Aktivität und externem Markt.
- Einheitliche Design-Tokens und Komponenten.
- Erklärbare Status- und Fälligkeitslogik.
- Dokumentierte Backup- und Migrationsprozesse.
- Sichere serverseitige Schnittstelle für schlüsselpflichtige Dienste.
- Klare Datenschutzentscheidung für öffentliches Hosting.
- QA-Gates, die bei späteren Versionen wiederholbar sind.

## 23 Strategische Release-Gates für V31

Ein Release darf nicht allein aufgrund eines abgeschlossenen Codes oder eines erfolgreichen Deployments als V31 bezeichnet werden. Die folgenden Gates müssen erfüllt sein.

| Gate | Abnahmekriterium |
| --- | --- |
| G1 – Datenintegrität | Bestehende produktive Daten bleiben erhalten; Backup, Export und Import wurden getestet. |
| G2 – Ein System | Navigation, Design und Kernkomponenten wirken konsistent; keine konkurrierenden Hauptoberflächen. |
| G3 – Call-First | Telefonie ist im oberen Dashboard sichtbar und als vollständiger Ablauf nutzbar. |
| G4 – Actionable Dashboard | Definierte Kennzahlen öffnen die richtige gefilterte Zielansicht. |
| G5 – Next-Step Control | Aktive Kontakte und Chancen zeigen nächste Aktion und Fälligkeit oder einen klaren Lückenzustand. |
| G6 – Pipeline Clarity | Phase, letzte Aktivität, nächste Aktion, Fälligkeit und Stagnationsgrund sind nachvollziehbar. |
| G7 – Geographic Truth | Primäre Karte nutzt echte Geografie; Quellen und Grenzen sind dokumentiert. |
| G8 – Market Trust | Marktkennzahlen zeigen Quelle, Zeitraum, Qualität und Aktualitätsstatus. |
| G9 – Mobile Integrity | Kernabläufe funktionieren auf 390 px ohne horizontalen Body-Scroll. |
| G10 – Security | Keine Secrets im Frontend; sensible öffentliche Daten sind geschützt oder nicht enthalten. |
| G11 – Error Readiness | Leer-, Fehler-, Lade- und Offlinezustände sind für Kernmodule gestaltet. |
| G12 – Documentation | ADRs, Testbericht, bekannte Grenzen und Rollback-Hinweise sind vorhanden. |

Ein Gate kann mit dokumentierter Ausnahme freigegeben werden, wenn die Ausnahme keinen Kernnutzen oder Sicherheitsbereich betrifft und eine konkrete Nacharbeit mit Termin besteht. Datenintegrität, Sicherheit und geografische beziehungsweise marktbezogene Wahrheit sind nicht durch kosmetische Ausnahmen ersetzbar.

## 24 Entscheidungsrahmen für neue Anforderungen

Jede neue Idee wird anhand eines einheitlichen Rahmens bewertet. Dadurch wird vermieden, dass die lauteste oder neueste Idee automatisch Priorität erhält.

| Kriterium | Prüffrage | Gewichtung |
| --- | --- | --- |
| Nutzerwert | Verbessert die Idee einen realen, häufigen Job-to-be-Done? | Sehr hoch |
| Umsatznähe | Unterstützt sie Anrufe, Follow-ups, Termine, Pipeline oder Marktgespräche? | Hoch |
| Dringlichkeit | Verhindert sie Datenverlust, verpasste Chancen oder Sicherheitsrisiken? | Sehr hoch |
| Strategische Passung | Stärkt sie Mission, Vision und Produktprinzipien? | Sehr hoch |
| Integrationsqualität | Passt sie in bestehende Daten- und Navigationsverträge? | Hoch |
| Vertrauen | Verbessert oder gefährdet sie Datenwahrheit, Datenschutz und Erklärbarkeit? | Sehr hoch |
| Aufwand | Wie hoch sind Implementierung, Test und Wartung? | Mittel |
| Reversibilität | Kann die Änderung sicher zurückgenommen oder angepasst werden? | Mittel |
| Zukunftswert | Öffnet sie sinnvolle spätere Optionen, ohne heute zu überbauen? | Mittel |
| Ablenkungsrisiko | Verdrängt sie wichtigere Kernarbeit oder erhöht sie Komplexität? | Negativ |

Eine Idee mit hohem visuellen Reiz, aber geringem Nutzerwert und hohem Wartungsaufwand erhält keine Priorität. Eine unscheinbare Verbesserung, die Follow-up-Verluste reduziert oder Datenintegrität schützt, kann dagegen höchste Priorität besitzen.

### 24.1 Pre-Mortem-Fragen

- Wie könnte diese Funktion den Nutzer langsamer machen?
- Welche bestehende Wahrheit könnte sie duplizieren?
- Welche Daten könnten verloren oder falsch interpretiert werden?
- Was passiert ohne Internet, ohne Provider oder mit ungültigen Daten?
- Wie sieht die Funktion auf 390 px aus?
- Welche personenbezogenen Daten werden sichtbar oder übertragen?
- Wie kann die Funktion wieder entfernt oder ersetzt werden?
- Welche Wartung entsteht in sechs Monaten?
- Was würde ein professioneller Nutzer als unglaubwürdig empfinden?
- Ist die Funktion nach einem Klick wirklich arbeitsfähig oder nur sichtbar?

## 25 Strategische Definition of Done

Eine Produktinitiative ist strategisch abgeschlossen, wenn nicht nur die Oberfläche existiert, sondern der beabsichtigte Nutzerfortschritt nachweisbar möglich ist.

- Der adressierte Job-to-be-Done ist klar benannt.
- Die primäre Nutzerhandlung kann ohne unnötige Zwischenschritte abgeschlossen werden.
- Abhängige Module und Datenquellen bleiben konsistent.
- Der nächste Zustand nach Erfolg, Abbruch und Fehler ist definiert.
- Mobile und Desktop unterstützen denselben fachlichen Zweck angemessen.
- Datenquelle, Aktualität und Unsicherheit sind sichtbar, wenn externe Daten verwendet werden.
- Keine neue doppelte Wahrheit oder unkontrollierte Speicherung wurde eingeführt.
- Erfolg und Guardrails können überprüft werden.
- Bekannte Grenzen und spätere Erweiterungen sind dokumentiert.
- Die Funktion stärkt das Gesamtprodukt und wirkt nicht wie ein angehängtes Modul.

## 26 Anti-Pattern-Katalog

Die folgenden Muster haben in der bisherigen Entwicklung oder bei großen Einzeldateien ein erhöhtes Risiko. Sie sind aktiv zu vermeiden.

| Anti-Pattern | Warum problematisch | Bessere Alternative |
| --- | --- | --- |
| Noch eine CSS-Schicht oben drauf | Inkonsistenz und unvorhersehbare Überschreibungen | Tokens und Komponenten konsolidieren; Legacy gezielt zurückbauen. |
| Neue UI mit eigener Speicherung | Doppelte Wahrheit und Migrationsrisiko | Vorhandene öffentliche APIs und Keys verwenden. |
| KPI-Card ohne Zielzustand | Sieht interaktiv aus, spart aber keine Arbeit | Deep-Link-Vertrag mit sichtbarem Filter. |
| Anrufzähler ohne Ergebnis | Aktivität wird aufgebläht, Kontext fehlt | Ergebnis und nächste Aktion als Abschluss. |
| Heatmap ohne Datenqualität | Starke visuelle Wirkung trotz schwacher Daten | Legende, Quelle, Qualität und fehlende Werte zeigen. |
| Fake-Loading und Demo-Daten | Verschleiert fehlende Integration | Echten Leer- oder Providerzustand anzeigen. |
| Überfälligkeit nur rot färben | Keine operative Konsequenz | Sortieren, Queue bilden und Aktion anbieten. |
| Mobile Tabelle verkleinern | Unlesbar und schwer bedienbar | Responsive Cards oder fokussierte Zeilen. |
| Autonomer Score | Intransparent und potenziell unfair | Erklärbare Regeln und manuelle Kontrolle. |
| Komplett-Neubau ohne Parität | Verlust wertvoller Funktionen und Daten | Phasenweise Ablösung mit Vergleichstest. |
| Öffentliche App mit Echtdaten | Datenschutz- und Vertrauensrisiko | Zugriffsschutz oder anonymisierte Demo-Daten. |
| „Enterprise“ durch Dekoration | Mehr visuelle Last ohne mehr Nutzen | Klare Hierarchie, präzise Zustände, ruhige Qualität. |

## 27 Glossar

| Begriff | Definition |
| --- | --- |
| Aktiver Kontakt | Kontakt mit aktuellem vertrieblichem oder beziehungsbezogenem Bearbeitungsbedarf. |
| Nächste Aktion | Konkrete, ausführbare Handlung mit sinnvoller Verantwortlichkeit und möglichst Datum. |
| Next-Step Coverage | Anteil aktiver Kontakte und Chancen mit gültigem nächsten Schritt. |
| Call-First | Produktprinzip, das Telefonie als primären täglichen Umsatzhebel sichtbar und ausführbar macht. |
| Deep Link | Navigation, die nicht nur einen Tab, sondern einen konkreten Filter- und Fokuszustand öffnet. |
| Stagnation | Nachvollziehbarer Zustand einer Chance ohne Aktivität, gültigen nächsten Schritt oder phasengerechten Fortschritt. |
| Provider | Austauschbare Quelle für externe Daten. |
| Adapter | Schicht, die unterschiedliche Quellen in ein einheitliches internes Format überführt. |
| Snapshot | Letzter validierter Datenstand, der für Cache oder Offline-Fallback gespeichert wird. |
| Source Registry | Dokumentierte Übersicht über Datenquelle, Lizenz, Aktualität, Abdeckung und Transformation. |
| Guardrail | Kennzahl oder Regel, die schädliche Optimierung einer Zielmetrik verhindert. |
| ADR | Architecture Decision Record: kurze dokumentierte Architekturentscheidung mit Alternativen und Konsequenzen. |
| Produkt-Gate | Verbindliches Abnahmekriterium, das vor Release erfüllt oder explizit ausgenommen werden muss. |
| Legacy | Bestehende ältere Implementierung, die noch kompatibel gehalten oder kontrolliert abgelöst wird. |
| Operativer Kern | Heute, Kontakte, Anrufe, Follow-ups und Pipeline als tägliche Arbeitsfunktionen. |

## 28 Einseitige Produktzusammenfassung

> **Produkt**  
> Keim CRM Pro ist das persönliche Operating System für regionalen Immobilienvertrieb.

| Frage | Antwort |
| --- | --- |
| Für wen? | Primär für Kevin Keim als leistungsorientierten Immobilienmakler im Main-Kinzig-Kreis. |
| Welches Problem? | Zu viele getrennte Informationen, unklare nächste Schritte, verlorene Follow-ups und wenig verbundene Marktkenntnis. |
| Welcher Nutzen? | Schneller zur richtigen Aktion, bessere Nachverfolgung, aktive Pipeline und vertrauenswürdiger Markt-Kontext. |
| Was steht zuerst? | Anrufe, fällige Follow-ups, Termine und aktive Chancen. |
| Was unterscheidet das Produkt? | Call-First-Tagessteuerung plus regionale Marktintelligenz und konsequente Next-Step-Logik. |
| Was ist V31? | Konsolidierungs- und Fundamentrelease für ein zusammenhängendes professionelles Produkt. |
| Was ist nicht V31? | Vollständiges ERP, öffentliche Kundenplattform, autonome KI oder unkontrollierte Cloud-Migration. |
| Wie wird Erfolg gemessen? | Next-Step Coverage, fristgerechte Follow-ups, Call-Ausführung, Pipeline-Bewegung und Qualitäts-Guardrails. |
| Welche Haltung gilt für Daten? | Keine Fake-Daten; Quelle, Zeitraum, Qualität und Aktualität transparent. |
| Welche Haltung gilt für Technik? | Bestehende Daten schützen, schrittweise konsolidieren, sichere Provider und dokumentierte Entscheidungen. |

> *Das Produkt zeigt das Richtige, macht die nächste Handlung eindeutig und lässt keine wertvolle Chance ohne nachvollziehbaren nächsten Schritt.*

## 29 Strategische Abnahme-Checkliste

- Ist der primäre Nutzer und Nutzungskontext weiterhin klar?
- Beginnt der Arbeitstag sichtbar mit umsatzrelevanten Aktionen?
- Ist Telefonie ein vollständiger Ablauf und nicht nur eine Kennzahl?
- Führen Dashboard-Kennzahlen in arbeitsbereite Zielansichten?
- Besitzen aktive Kontakte und Chancen einen nachvollziehbaren nächsten Schritt?
- Gibt es genau eine fachliche Wahrheit pro Entität?
- Ist die Pipeline transparent statt nur optisch modern?
- Ist die Karte geografisch echt und operativ verbunden?
- Zeigen Marktdaten Quelle, Zeitraum, Qualität und Aktualität?
- Bleibt der operative Kern bei Providerfehlern oder Offline-Zustand nutzbar?
- Sind Mobile und Desktop jeweils bewusst gestaltet?
- Sind personenbezogene Daten und Secrets angemessen geschützt?
- Bleiben bestehende Storage-Keys, Daten und Backups funktionsfähig?
- Wurden Risiken, Kompromisse und spätere Aufgaben dokumentiert?
- Wirkt die Änderung als Teil eines Produktes statt als neues Einzelmodul?

## 30 Abschlussauftrag für die folgenden Dokumentteile

Die nächsten Bände müssen dieses Strategiedokument konkretisieren, nicht wiederholen. Die UX & Design Bible übersetzt Mission und Prinzipien in Informationshierarchie, Komponenten und Interaktionsmuster. Die Architektur- und Datenspezifikation übersetzt „eine Quelle der Wahrheit“, Datenvertrauen und kontrollierte Evolution in konkrete Modelle und Schnittstellen. Der Marktmonitor-Band konkretisiert Geodaten, Provider, Quellen und Aktualisierung. Das Development Manual übersetzt Governance in Arbeitsabläufe für Claude Code. Das QA-Handbuch macht Gates und Definition of Done prüfbar.

Jeder folgende Band muss auf die hier definierten Nutzerjobs, Produktprinzipien, Ziele, Nicht-Ziele und Erfolgskriterien verweisen. Er darf keine neue strategische Richtung einführen, ohne dieses Dokument bewusst zu aktualisieren.

> **Verbindlicher Abschluss**  
> Keim CRM Pro wird nicht als Sammlung möglichst vieler Funktionen weiterentwickelt. Es wird als fokussiertes, regional intelligentes und vertrauenswürdiges Makler-Operating-System gebaut. Jede Entscheidung muss diesen Anspruch sichtbar unterstützen.

---

## Change Log

| Version | Datum | Änderung |
| --- | --- | --- |
| 1.0 | 09. Juli 2026 | Vollständige Neufassung von Teil 1: Produktstrategie, Vision und Produkt-Governance. |

<!-- ENDE TEIL 1: Teil 1 – Produktstrategie -->
