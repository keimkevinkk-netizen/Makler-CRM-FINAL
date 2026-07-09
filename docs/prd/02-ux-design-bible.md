# KEIM CRM PRO – MASTER PRODUCT REQUIREMENTS DOCUMENT
## Teil 2: UX, Design-System und Interaktionsspezifikation

**Version:** 1.0  
**Stand:** 09. Juli 2026  
**Status:** Verbindliche UX- und Designgrundlage für V31 und Folgeversionen  

---

## Inhaltsübersicht

- **0 Dokumentauftrag, Geltungsbereich und Rangordnung**
- **1 Executive Design Summary**
- **2 Erlebnisziel und emotionale Markenwirkung**
- **3 Verbindliche UX-Prinzipien**
- **4 Informationsarchitektur und globale Navigation**
- **5 Seitengerüst und visuelle Hierarchie**
- **6 Dashboard – Daily Command Center**
- **7 Telefonie-Command-Center**
- **8 Dringende Arbeitswarteschlange**
- **9 CRM / Kontakte – Listenansicht**
- **10 Kontakt-Detailansicht**
- **11 Follow-up-Arbeitsbereich**
- **12 Pipeline – Sales Command Board**
- **13 Marktmonitor – UX-Grundkonzept**
- **14 Tippgeber- und Netzwerkbereich**
- **15 KPIs, Reviews und Fortschritt**
- **16 Wissen, Skripte und KI-Prompts**
- **17 Backup, Datenqualität und Einstellungen**
- **18 Formulare und Datenerfassung**
- **19 Suche, Filter, Sortierung und Ansichten**
- **20 Tabellen, Listen und Boards**
- **21 Systemzustände und Feedback**
- **22 Design Tokens – Grundsystem**
- **23 Typografie**
- **24 Farb- und Statussystem**
- **25 Flächen, Cards, Linien und Elevation**
- **26 Buttons und Aktionshierarchie**
- **27 Form Controls, Chips und Badges**
- **28 Dialoge, Drawer, Side Panels und Bottom Sheets**
- **29 Icons und Bildsprache**
- **30 Diagramme und Datenvisualisierung**
- **31 Responsive System**
- **32 Accessibility und inklusive Bedienung**
- **33 Content Design und Microcopy**
- **34 Motion und Microinteractions**
- **35 Leere Zustände und Onboarding**
- **36 Komponentenverträge**
- **37 Textuelle Referenz-Wireframes**
- **38 UX-Abnahmekriterien nach Hauptmodul**
- **39 UX-QA und visuelle Regression**
- **40 Design-Governance und Änderungsprozess**
- **41 Anti-Pattern-Katalog**
- **42 Definition of Done – UX und Design**
- **43 Übergabe an Teil 3 – Architektur und Datenmodell**
- **A Anhang A – Komponenten-Inventar für V31**
- **B Anhang B – Design Review Checkliste**

## 0 Dokumentauftrag, Geltungsbereich und Rangordnung

Dieses Dokument übersetzt die in Teil 1 definierte Produktstrategie in verbindliche Regeln für Informationsarchitektur, Benutzerführung, visuelle Gestaltung, Interaktionsmuster, responsive Verhalten und Komponenten. Es ist die Design Bible von Keim CRM Pro. Sie gilt für V31 und alle Folgeversionen, solange sie nicht durch eine ausdrücklich freigegebene neue Fassung ersetzt wird.

Die Aufgabe dieses Dokuments besteht nicht darin, eine attraktive Oberfläche zu beschreiben. Es definiert, wie das Produkt den Nutzer zuverlässig von Information zu Entscheidung und von Entscheidung zu Handlung führt. Visuelle Qualität, Interaktionsqualität und fachliche Arbeitslogik werden deshalb nicht getrennt betrachtet. Ein schönes Element, das Arbeit verlangsamt oder falsche Prioritäten erzeugt, ist kein gutes Design.

> **Verbindlicher Gestaltungsgrundsatz:** Keim CRM Pro wird nicht als Sammlung unabhängig gestalteter Module weiterentwickelt. Jede Oberfläche folgt derselben Hierarchie, denselben Komponenten, denselben Statusregeln und denselben Interaktionsverträgen. Lokale Sonderlösungen sind nur zulässig, wenn der fachliche Bedarf dokumentiert ist und keine bestehende Komponente den Zweck erfüllen kann.

| Rang | Referenz | Bedeutung |
| --- | --- | --- |
| 1 | Teil 1 – Produktstrategie | Bestimmt Zweck, Prioritäten, Zielnutzer, Nicht-Ziele und strategische Erfolgskriterien. |
| 2 | Teil 2 – UX & Design Bible | Bestimmt Benutzerführung, visuelle Sprache, Interaktionen und Komponentenverhalten. |
| 3 | Teil 3 – Architektur & Datenmodell | Bestimmt technische Struktur, Datenverträge, Storage und Integrationen. |
| 4 | Modulspezifikationen und ADRs | Konkretisieren einzelne Lösungen, dürfen die übergeordneten Regeln nicht stillschweigend brechen. |
| 5 | Implementierungsdetails | Sind austauschbar, solange Produkt- und UX-Verträge erhalten bleiben. |

- Dieses Dokument gilt für Desktop, Tablet, iPhone, große Bürobildschirme und zukünftige installierbare App-Formen.
- Es gilt für alle bestehenden Hauptmodule sowie neue Module, die später hinzukommen.
- Es enthält Sollzustände. Vorhandene Abweichungen sind technische Schulden und keine Präzedenzfälle.
- Bestehende funktionierende Datenflüsse werden nicht allein aus Designgründen zerstört. Die Oberfläche darf vollständig neu strukturiert werden, die fachliche Substanz muss erhalten bleiben.

### 0.1 Dokumentensteuerung

| Feld | Festlegung |
| --- | --- |
| Produkt | Keim CRM Pro |
| Dokument | Master PRD – Teil 2: UX, Design-System und Interaktionsspezifikation |
| Version | 1.0 |
| Status | Verbindliche UX- und Designgrundlage für V31 und Folgeversionen |
| Primärer Nutzer | Kevin Keim |
| Primärer Gerätekontext | Desktop im Büro und iPhone unterwegs |
| Sekundäre Kontexte | Tablet, großer Monitor, TV-/Focus-Ansicht |
| Gestaltungsziel | Ruhiges, hochwertiges, leistungsorientiertes Makler-Operating-System |
| Freigaberegel | Grundlegende Design-System- oder Navigationsänderungen nur dokumentiert und bewusst freigegeben |

Die Pflege dieses Dokuments ist Teil der Produkt-Governance. Neue Komponenten, neue Statusfarben, neue Navigationsmuster oder neue Interaktionsparadigmen müssen hier beziehungsweise in einem zugehörigen Architecture/Design Decision Record dokumentiert werden.

### 0.2 Arbeitsanweisung an Claude Code

1. Das gesamte Dokument lesen, bevor die App-Shell, Navigation oder zentrale Komponenten verändert werden.
2. Zuerst vorhandene Komponenten, CSS-Schichten, IDs, öffentliche APIs und aktive Module inventarisieren.
3. Ein zentrales Design-System und eine eindeutige App-Shell etablieren, bevor einzelne Module kosmetisch verfeinert werden.
4. Keine zweite Navigation, kein zweites Dialogsystem und keine parallele Komponentenfamilie aufbauen.
5. Jede Kernansicht auf Desktop und Mobile als vollständigen Arbeitsfluss testen.
6. Nach jeder Phase visuelle Regression, Tastaturbedienung, Fokus, leere Zustände, Fehlerzustände und Responsive-Verhalten prüfen.
7. Bei Abweichungen zwischen ästhetischem Wunsch und fachlichem Nutzen den fachlichen Nutzen priorisieren und die Entscheidung dokumentieren.

> **Keine Scheinerfüllung:** „Dashboard interaktiv“ ist nicht erfüllt, wenn eine Card lediglich einen Tab öffnet. Die Zielansicht muss den erwarteten Filterzustand besitzen, die relevante Arbeit sichtbar machen, eine klare nächste Aktion anbieten und dem Nutzer verständlich zeigen, warum er dort gelandet ist.

## 1 Executive Design Summary

Keim CRM Pro soll sich wie ein bewusst entwickeltes Premium-Produkt anfühlen: ruhig, präzise, schnell und fachlich relevant. Die Oberfläche setzt nicht auf maximale visuelle Wirkung, sondern auf maximale Handlungsfähigkeit. Der Nutzer soll nach dem Öffnen nicht eine Vielzahl gleichwertiger Karten sehen, sondern eine eindeutige Reihenfolge: Was ist jetzt wichtig, welcher Kontakt ist als Nächstes dran, welche Verpflichtung ist überfällig und welche Chance bewegt sich nicht?

Die zentrale Designentscheidung lautet: Das Produkt wird von Arbeitswarteschlangen, nächsten Aktionen und Kontextbeziehungen her gedacht. Kennzahlen sind Einstiegspunkte. Listen sind Arbeitsflächen. Detailansichten sind Entscheidungsräume. Die Karte ist ein Analyseinstrument. Dialoge dienen klaren Abschlüssen. Kein Element existiert nur, um eine Seite „vollständig“ wirken zu lassen.

Telefonie steht auf dem Heute-Dashboard sichtbar über nachrangigen Analysen. Offene Leads, fällige Follow-ups, Termine, Aufgaben und Pipeline-Risiken sind anklickbar und führen in arbeitsbereite Ansichten. Das CRM zeigt Beziehungen und nächste Schritte statt nur Stammdaten. Die Pipeline verbindet Phase, Wert, Aktivität, Fälligkeit und Risiko. Der Marktmonitor verbindet echte Geografie mit nachvollziehbaren Datenquellen.

| Designsäule | Verbindliche Wirkung |
| --- | --- |
| Clarity first | Die wichtigste Information und Primäraktion sind innerhalb weniger Sekunden erkennbar. |
| Action over observation | Kennzahlen und Statusinformationen führen unmittelbar in konkrete Arbeit. |
| Calm authority | Die Oberfläche wirkt kompetent und hochwertig, nicht laut, verspielt oder aggressiv. |
| Context before detail | Der Nutzer sieht zuerst Bedeutung und nächsten Schritt, erst danach vollständige Details. |
| One system | Navigation, Komponenten, Abstände, Zustände und Sprache sind modulübergreifend konsistent. |
| Mobile intent | Mobile wird als eigenständiger Arbeitskontext gestaltet, nicht als zusammengestauchter Desktop. |
| Truthful UI | Aktualität, Fehler, Unsicherheit und Datenherkunft werden sichtbar statt kaschiert. |
| Progressive disclosure | Komplexität wird schrittweise angeboten; häufige Aufgaben bleiben schnell. |

> *„Die beste Oberfläche ist nicht die, die am meisten zeigt. Sie ist die, die im richtigen Moment genau genug zeigt, damit die nächste sinnvolle Handlung ohne Sucharbeit beginnen kann.“*

## 2 Erlebnisziel und emotionale Markenwirkung

Die visuelle und interaktive Wirkung von Keim CRM Pro soll vier Emotionen gleichzeitig erzeugen: Kontrolle, Fokus, Vertrauen und Vorwärtsbewegung. Kontrolle entsteht durch klare Zustände, nachvollziehbare Daten und sichere Speicherung. Fokus entsteht durch Priorisierung und reduzierte Konkurrenz zwischen Elementen. Vertrauen entsteht durch konsistente Gestaltung, Quellenangaben und ehrliche Fehlerzustände. Vorwärtsbewegung entsteht durch sichtbare nächste Aktionen und unmittelbares Feedback.

| Sollwirkung | Wie sie gestaltet wird | Was vermieden wird |
| --- | --- | --- |
| Kontrolle | Klare Navigation, stabile Layouts, erkennbare Filter, bestätigte Speicherung, Undo wo sinnvoll | Überraschende Ansichtswechsel, versteckte Filter, unklare Speicherung |
| Fokus | Eine dominante Primäraktion, priorisierte Queue, begrenzte Akzentfarbe | Zehn gleich starke Cards, zu viele rote Elemente, permanente Animation |
| Vertrauen | Quellen, Zeitstempel, Datenqualität, konsistente Formulare, sichere Fehlerbehandlung | Scheinpräzision, erfundene Live-Daten, leere Erfolgsmeldungen |
| Vorwärtsbewegung | Nächster Kontakt, nächste Aktion, Fortschritt, klare Abschlüsse | Gamification ohne Geschäftsbezug, dekorative Fortschrittsringe |
| Professionalität | Ruhige Typografie, hochwertige Dichte, präzise Abstände, saubere Zustände | Gaming-Look, Neonfarben, Glasflächen ohne funktionalen Zweck |
| Regionale Kompetenz | Echte Karte, Ortskontext, lokale Daten und Gebietsbezug | Symbolische Fantasiekarten oder pauschale Deutschland-Dashboards |

> **Markenformel:** Substanz statt Hochglanz: Die Oberfläche darf hochwertig und ambitioniert sein, aber sie beweist Qualität durch Präzision, Arbeitsnutzen und Verlässlichkeit – nicht durch Statusdekoration.

### 2.1 Tonalität der Oberfläche

- Klar und direkt: „3 Follow-ups überfällig“ statt „Es könnte sein, dass einige Kontakte Aufmerksamkeit benötigen“.
- Respektvoll: keine beschämenden oder aggressiven Fehlermeldungen.
- Handlungsorientiert: Hinweise enthalten, sofern möglich, eine nächste Aktion.
- Fachlich präzise: Marktkennzahlen nennen Einheit, Zeitraum und Quelle.
- Zurückhaltend motivierend: Fortschritt sichtbar machen, ohne kindliche Belohnungsmechanik.
- Keine Werbesprache im operativen Produkt. Überschriften beschreiben Arbeit, nicht Visionen.

## 3 Verbindliche UX-Prinzipien

| Nr. | Prinzip | Konsequenz |
| --- | --- | --- |
| 01 | Eine Seite – eine primäre Aufgabe | Jeder Hauptbereich besitzt eine klar erkennbare Hauptfunktion. |
| 02 | Nächste Aktion vor vollständigem Datensatz | Listen und Details zeigen zuerst, was als Nächstes zu tun ist. |
| 03 | Dringlichkeit aus Fakten | Überfälligkeit entsteht aus Datum und Status, nicht aus intransparentem Score. |
| 04 | Ein Klick muss Bedeutung haben | Klickbare KPIs öffnen einen konkreten, sichtbaren Arbeitszustand. |
| 05 | Kontext erhalten | Bei Navigation zwischen Kontakt, Follow-up, Objekt und Pipeline bleibt der fachliche Bezug sichtbar. |
| 06 | Komplexität schrittweise zeigen | Häufige Felder und Aktionen zuerst; erweiterte Details bei Bedarf. |
| 07 | Status sichtbar, aber nicht dominant | Farben und Badges helfen der Orientierung, ersetzen aber keinen Text. |
| 08 | Fehler ehrlich behandeln | Netz-, Daten- und Validierungsfehler werden erklärt und bieten Wiederholung oder Rückweg. |
| 09 | Mobile priorisiert | Auf kleinen Bildschirmen wird neu geordnet, nicht nur gestapelt. |
| 10 | Konsistenz vor lokaler Kreativität | Gleiche Aufgabe erhält in jedem Modul dieselbe Interaktion. |
| 11 | Datenänderungen bestätigen | Speichern, Löschen, Import und Abschluss erzeugen klares Feedback. |
| 12 | Keine Sackgassen | Jeder leere Zustand bietet einen sinnvollen nächsten Schritt. |
| 13 | Erreichbarkeit ist Produktqualität | Tastatur, Fokus, Kontrast und Touch-Ziele sind keine Nacharbeit. |
| 14 | Vertrauen braucht Herkunft | Marktdaten besitzen Quelle, Zeitraum, Stand und Qualitätsstatus. |
| 15 | Arbeitsfluss statt Seitenwechsel | Zusammengehörige Schritte werden in Panels, Sheets oder fokussierten Übergängen verbunden. |
| 16 | Reversibilität wo möglich | Filter, Ansichtswechsel und viele Bearbeitungen lassen sich zurücknehmen. |
| 17 | Keine versteckte Automatisierung | Automatische Vorschläge erklären Herkunft und überschreiben keine Nutzerdaten. |
| 18 | Performance ist UX | Schwere Module laden bedarfsgerecht und blockieren nicht den gesamten Start. |

## 4 Informationsarchitektur und globale Navigation

Die Informationsarchitektur muss die tatsächliche Arbeitsreihenfolge widerspiegeln. Sie darf nicht nach historisch entstandenen Modulen sortiert sein. Die primäre Navigation enthält nur Bereiche, die im täglichen operativen Ablauf regelmäßig benötigt werden. Sekundäre Hilfsmittel werden über „Mehr“ oder kontextbezogene Zugänge erreichbar gemacht.

| Primärer Bereich | Zweck | Primäre Frage |
| --- | --- | --- |
| Heute | Tagessteuerung und nächste Arbeit | Was muss ich jetzt tun? |
| Kontakte | Beziehungen, Eigentümer, Leads und Aktivitätskontext | Mit wem arbeite ich und was ist der nächste Schritt? |
| Follow-ups | Fällige und geplante Wiedervorlagen | Was darf heute nicht liegen bleiben? |
| Pipeline | Aktive Chancen und Prozessfortschritt | Welche Chance bewegt sich – oder stagniert? |
| Markt | Regionale Markt- und Gebietsintelligenz | Was passiert in meinem Gebiet und wie nutze ich es? |
| Tippgeber | Netzwerk- und Empfehlungsarbeit | Welche Partnerbeziehung muss gepflegt werden? |
| Mehr | Sekundäre Arbeits- und Wissensmodule | Welche unterstützende Funktion brauche ich? |

Unter „Mehr“ befinden sich abhängig vom endgültigen Umfang: KPIs und Reviews, Skripte, KI-Prompts, Wissen/Archiv, Backup, Datenqualität und Einstellungen. Ein sekundäres Modul darf über kontextbezogene Aktionen direkt erreichbar sein, ohne die Hauptnavigation zu überladen.

> **Navigationsregel:** Ein Modul wird nicht deshalb primär, weil es umfangreich ist. Es wird primär, wenn es häufig benötigt wird und direkt zum operativen Vertrieb beiträgt.

### 4.1 Desktop-App-Shell

- Ab etwa 1100 px: kompakte feste oder einklappbare Sidebar mit Icon und Label.
- Topbar: Seitentitel, kontextbezogene Suche, globale Schnellerfassung, Status beziehungsweise Sync/Offline und Profil/Einstellungen.
- Der Inhaltsbereich besitzt eine konsistente Maximalbreite oder eine modulabhängig dokumentierte Full-Width-Variante.
- Markt und breite Tabellen dürfen die verfügbare Breite nutzen; Text- und Formularansichten bleiben lesbar begrenzt.
- Die Sidebar zeigt keine langen beschreibenden Texte und keine ständig wechselnden Zähler außer wirklich handlungsrelevanten Badges.
- Der aktive Bereich ist durch Form, Kontrast und Text erkennbar – nicht nur durch Farbe.

```text
┌──────────────┬──────────────────────────────────────────────────────────┐
│ KEIM CRM PRO │ Topbar: Heute                 Suche   + Erfassen   Status │
│              ├──────────────────────────────────────────────────────────┤
│ ● Heute      │ Seitenkopf                                              │
│   Kontakte   │ Titel · kurze Orientierung · primäre Aktion             │
│   Follow-ups │──────────────────────────────────────────────────────────│
│   Pipeline   │ Hauptarbeitsfläche                                      │
│   Markt      │                                                          │
│   Tippgeber  │                                                          │
│   Mehr       │                                                          │
│              │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### 4.2 Mobile-App-Shell

- Feste Bottom Navigation mit maximal fünf direkten Zielen. Empfohlene Ziele: Heute, Kontakte, Follow-ups, Pipeline, Mehr.
- Markt ist je nach Nutzungsfrequenz direkt in „Mehr“ oder ersetzt zeitweise Pipeline; die Entscheidung wird anhand realer Nutzung validiert.
- Die Topbar enthält nur Seitentitel und höchstens zwei relevante Aktionen.
- „Mehr“ öffnet ein Bottom Sheet mit Markt, Tippgeber, KPIs, Skripten, Wissen, Backup und Einstellungen.
- Safe Areas, Browserleisten und Tastatur werden berücksichtigt.
- Es gibt genau eine mobile Hauptnavigation. Historische Sticky Bars werden entfernt oder integriert.

```text
┌──────────────────────────────┐
│ Heute                 +  ⋯   │
├──────────────────────────────┤
│ Inhalt                       │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│ Heute Kontakte Follow Pipeline Mehr │
└──────────────────────────────┘
```

### 4.3 Browser-Historie, Hashes und Deep Links

Navigation muss als nachvollziehbarer Zustandswechsel funktionieren. Browser-Zurück führt zum vorherigen Arbeitskontext, nicht willkürlich an den Seitenanfang. Bestehende Hashes werden über eine Kompatibilitätsschicht erhalten.

| Zustand | Beispiel | Verhalten |
| --- | --- | --- |
| Tab | `#crm` | Öffnet Kontakte in Standardansicht. |
| View | `#followups?view=due` | Öffnet Fälligkeitsansicht. |
| Filter | `status=open&due=overdue` | Setzt sichtbare Filterchips. |
| Datensatz | `contact=abc123` | Öffnet Kontaktpanel beziehungsweise Detailansicht. |
| Quelle | `source=dashboard` | Ermöglicht Rückkehrhinweis und Analyse, verändert aber keine Fachlogik. |

Die konkrete technische Syntax wird in Teil 3 festgelegt. UX-seitig ist verbindlich: Filterzustände sind sichtbar, entfernbar und dürfen den Nutzer nicht unbemerkt über mehrere Sitzungen verfolgen.

## 5 Seitengerüst und visuelle Hierarchie

Jede Hauptansicht folgt einem stabilen Seitenmuster. Wiederkehrende Struktur reduziert Suchaufwand und macht neue Module verständlich.

1. Seitenkopf: Titel, kurze Status- oder Kontextzeile, eine primäre Aktion.
2. Optionale Summary-Zeile: höchstens drei bis fünf relevante Kennzahlen oder Filter.
3. Arbeitsleiste: Suche, Ansichtswechsel, Filter, Sortierung und Sekundäraktionen.
4. Hauptarbeitsfläche: Liste, Board, Karte, Formular oder Detailkontext.
5. Kontextpanel: Details, nächste Aktion, Aktivität oder Quelle.
6. Feedbackschicht: Toasts, Inline-Fehler, Lade- und Offline-Zustände.

| Hierarchieebene | Typische Inhalte | Gestaltungsregel |
| --- | --- | --- |
| Primär | Nächster Anruf, fälliger Follow-up, Hauptaktion | Größter Kontrast und klarste Aktion; nur ein dominanter Fokus. |
| Sekundär | Kennzahlen, Filter, nächste Termine | Sichtbar, aber nicht konkurrierend. |
| Tertiär | Historie, Metadaten, seltene Optionen | Über Details, Panels oder „Mehr“ zugänglich. |
| System | Sync, Quelle, Fehler, Offline | Klar, ehrlich, kompakt; bei Relevanz deutlich. |

## 6 Dashboard – Daily Command Center

Das Heute-Dashboard ist die wichtigste Oberfläche des Produkts. Es ist keine Management-Zusammenfassung und kein dekorativer KPI-Screen. Es ist eine priorisierte Arbeitsumgebung für den aktuellen Tag.

Die ersten 15 Sekunden entscheiden, ob das Produkt Orientierung schafft. Deshalb beginnt die Ansicht mit Tagesstatus und Telefonie, nicht mit Begrüßungstexten, großen Zitaten oder nachrangigen Diagrammen.

| Reihenfolge Desktop | Bereich | Zweck |
| --- | --- | --- |
| 1 | Kompakter Tageskopf | Datum, Modus, wichtigste Warnung, primäre Schnellerfassung. |
| 2 | Telefonie-Command-Center | Nächster Anruf und Call-Queue als dominanter Umsatzhebel. |
| 3 | Jetzt erledigen | Überfällige und unmittelbar fällige Arbeit aus mehreren Modulen. |
| 4 | Klickbare Kernkennzahlen | Offene Leads, Follow-ups, Aufgaben, Termine, Pipeline-Risiken. |
| 5 | Nächste Termine und Follow-ups | Zeitlicher Kontext des Tages. |
| 6 | Pipeline- und Wochenstatus | Engpässe, Fortschritt und Review. |
| 7 | Sekundäre Hinweise | Marktupdate, Datenqualität, Backup- oder Systemstatus. |

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Mittwoch, 9. Juli   Fokus: Akquise      + Schnell erfassen           │
├──────────────────────────────────────────────────────────────────────┤
│ TELEFONIE                                                         8/20│
│ Nächster Kontakt: Max Mustermann · Eigentümer · Rückruf vereinbart   │
│ Grund: Bewertung besprechen      [Jetzt anrufen] [Später] [Öffnen]   │
│ Fortschritt ━━━━━━━━━━━ 40 %   2 überfällig · 10 verbleibend          │
├──────────────────────────────────────────────────────────────────────┤
│ JETZT ERLEDIGEN                                                     │
│ 09:30 Follow-up Frau X   │  Anruf Herr Y   │  Aufgabe Unterlagen      │
├─────────────┬─────────────┬─────────────┬─────────────┬───────────────┤
│ 12 Leads    │ 5 Follow   │ 3 Aufgaben  │ 2 Termine   │ 2 Risiken      │
│ offen  →    │ fällig →   │ offen →     │ heute →     │ Pipeline →     │
└─────────────┴─────────────┴─────────────┴─────────────┴───────────────┘
```

> **Dashboard-Abnahmekriterium:** Jede Zahl, die eine unerledigte Arbeit beschreibt, muss entweder direkt bearbeitbar sein oder in eine bereits gefilterte Arbeitsansicht führen. Eine nicht interaktive „offen“-Kennzahl gilt als unvollständig.

### 6.1 Tageskopf

- Datum und Tagesmodus sind sichtbar, aber kompakt.
- Ein Tagesfokus kann manuell gesetzt werden; er erzeugt keine automatische Priorisierung von Personen.
- Die primäre Aktion lautet „Schnell erfassen“ oder die aktuell wichtigste Tagesaktion.
- Systemhinweise wie Offline, fehlgeschlagene Aktualisierung oder kritisches Backup erscheinen nur, wenn relevant.
- Kein großflächiger Motivationsspruch im operativen Sichtbereich.

### 6.2 Kernkennzahlen als Arbeitszugänge

| Card | Primärwert | Sekundärtext | Klickziel |
| --- | --- | --- | --- |
| Offene Leads | Anzahl | davon ohne nächste Aktion | CRM mit Filter `lead=open`; fehlende nächste Aktion zuerst |
| Follow-ups fällig | Anzahl | überfällig / heute | Follow-ups mit `today_or_overdue` |
| Anrufe offen | Anzahl | Tagesziel und überfällig | Call-Queue Tagesansicht |
| Aufgaben offen | Anzahl | davon überfällig | Aufgabenliste `status=open` |
| Termine heute | Anzahl | nächster Termin | chronologische Tagesansicht |
| Pipeline-Risiken | Anzahl | Ursachentypen | Pipeline gefiltert auf stagnierend/überfällig |

Cards zeigen keine Mini-Charts, wenn diese keine Entscheidung ermöglichen. Der Wert, die Bedeutung und der Klickpfad müssen auf einen Blick verständlich sein. Hover- und Fokuszustand signalisieren Interaktivität; auf Mobile wird eine eindeutige Chevron- oder Aktionsdarstellung verwendet.

## 7 Telefonie-Command-Center

Telefonie ist ein vollständiger Arbeitsfluss. Die Komponente unterstützt Auswahl, Kontext, Anrufstart, Ergebnisaufnahme, Folgeschritt und konsistente Aktualisierung.

| Element | Pflichtinhalt | Interaktion |
| --- | --- | --- |
| Nächster Kontakt | Name, Rolle, Ort, Grund, letzte Aktivität | Kontakt öffnen oder direkt anrufen |
| Telefonaktion | Telefonnummer und klare Hauptaktion | Auf Mobile `tel:`; auf Desktop Kopieren oder unterstützte Telefonintegration |
| Fortschritt | Erledigt / Ziel / verbleibend | Klick öffnet Tages-Call-Queue |
| Überfälligkeitsstatus | Anzahl und ältester Fälligkeitspunkt | Filter auf überfällige Calls |
| Ergebnis | Erreicht, nicht erreicht, Nachricht, Termin, kein Interesse, eigener Text | öffnet Ergebnis-Sheet oder Dialog |
| Folgeschritt | neues Follow-up, Termin, Aufgabe, keine Aktion | wird in betroffenen Modulen synchron angelegt |
| Notiz | kurz, optional erweiterbar | wird als Aktivität am Kontakt gespeichert |

Ein Anruf gilt nicht als abgeschlossen, wenn lediglich ein Zähler erhöht wurde. Der Abschluss muss Ergebnis und gegebenenfalls nächsten Schritt erfassen. Ein schneller Modus darf Standardwerte anbieten, aber keine inhaltlichen Entscheidungen erfinden.

```text
┌──────────────────────────────────────────────┐
│ NÄCHSTER ANRUF                         8 / 20 │
│ Max Mustermann · Eigentümer · Bruchköbel     │
│ Rückruf wegen Marktpreiseinschätzung          │
│ Letzter Kontakt: 03.07. · Unterlagen gesendet │
│                                              │
│ [  Jetzt anrufen  ]   [Kontakt öffnen]        │
│                                              │
│ Nicht erreicht? [Wiedervorlage] [Ergebnis]    │
└──────────────────────────────────────────────┘
```

### 7.1 Ergebnisaufnahme

| Ergebnis | Standard-Folge | Nutzerkontrolle |
| --- | --- | --- |
| Erreicht – Gespräch geführt | Aktivität speichern; optional Follow-up oder Termin | Nutzer bestätigt nächsten Schritt |
| Nicht erreicht | Wiedervorlage vorschlagen | Datum und Uhrzeit frei wählbar |
| Nachricht hinterlassen | erneuter Kontakttermin | Vorschlag darf geändert werden |
| Termin vereinbart | Termin anlegen; Kontakt und Deal verknüpfen | Details vor Speichern sichtbar |
| Kein Interesse | Statusänderung anbieten, nicht erzwingen | Begründung optional |
| Falsche Nummer | Datenqualität markieren | Kontakt bleibt erhalten |

> **Keine stille Automatik:** Ein Ergebnis darf abhängige Datensätze nur nach sichtbarer Bestätigung anlegen oder ändern. Automatische Vorschläge sind zulässig, stille fachliche Entscheidungen nicht.

## 8 Dringende Arbeitswarteschlange

„Jetzt erledigen“ bündelt zeitkritische Arbeit aus mehreren Modulen. Die Queue ist keine KI-Priorisierung. Sie basiert auf transparenten Regeln: Fälligkeit, Überfälligkeit, Terminbeginn, fehlender nächster Schritt oder klar definierte Pipeline-Stagnation.

| Prioritätsregel | Beispiel | Darstellung |
| --- | --- | --- |
| Überfällig | Follow-up war gestern fällig | Roter Status + konkretes Datum; keine blinkende Animation |
| Unmittelbar fällig | Termin beginnt in 30 Minuten | Amber + Uhrzeit |
| Heute fällig | Aufgabe bis Tagesende | Neutral/Blau + Tageslabel |
| Fehlender nächster Schritt | Offener Lead ohne Aktion | Hinweis „Nächste Aktion fehlt“ |
| Stagnation | Pipeline ohne Aktivität seit Richtwert | Ursache und Zeitraum sichtbar |

Die Queue zeigt auf dem Dashboard höchstens fünf bis sieben Einträge. „Alle anzeigen“ öffnet die vollständige Arbeitsliste. Jeder Eintrag besitzt genau eine klar hervorgehobene Primäraktion und höchstens zwei Sekundäraktionen.

## 9 CRM / Kontakte – Listenansicht

Das CRM ist die zentrale Relationship-Oberfläche. Die Standardansicht unterstützt schnelles Scannen, Filtern, Kontaktieren und Öffnen des vollständigen Kontexts.

| Spalte / Information | Priorität Desktop | Mobile-Darstellung |
| --- | --- | --- |
| Name und Rolle | Immer sichtbar | Card-Kopf |
| Ort / Gebiet | Hoch | unter Name oder als kompakter Chip |
| Status | Hoch | Textbadge |
| Letzte Aktivität | Mittel | Sekundärzeile |
| Nächste Aktion | Sehr hoch | prominente Arbeitszeile |
| Fälligkeit | Sehr hoch | relativ + absolutes Datum bei Bedarf |
| Objekt-/Deal-Bezug | Mittel | einklappbar oder Detail |
| Schnellaktionen | Hoch | Anruf, Follow-up, Öffnen |
| Vollständige Metadaten | Niedrig | nur Detailansicht |

Die Liste darf auf Desktop dicht sein, aber nicht klein. Zeilen haben ausreichende Höhe für zwei Informationsebenen. Ein Kontakt ohne nächste Aktion wird nicht automatisch als „schlecht“ bewertet, aber als Daten-/Arbeitslücke sichtbar gemacht.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Kontakte         [Suche] [Status] [Ort] [Nächste Aktion]   + Kontakt     │
├──────────────────────────────────────────────────────────────────────────┤
│ Max Mustermann  Eigentümer  Bruchköbel │ Rückruf heute 14:00 │ ☎  Öffnen │
│ Letzte Aktivität: 03.07. Unterlagen gesendet    Pipeline: Bewertung       │
├──────────────────────────────────────────────────────────────────────────┤
│ Anna Beispiel   Tippgeber   Nidderau    │ Keine nächste Aktion │ + Aktion │
│ Letzte Aktivität: 21.06. Empfehlung erhalten                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 9.1 CRM-Filter und gespeicherte Ansichten

- Filter sind als sichtbare Chips dargestellt.
- Filterkombinationen zeigen Ergebnisanzahl und können einzeln entfernt werden.
- Dashboard-Deep-Links erzeugen temporäre Arbeitsansichten.
- Gespeicherte Ansichten sind erst sinnvoll, wenn wiederkehrende Nutzung bestätigt ist.
- Eine leere gefilterte Ansicht erklärt, welche Filter aktiv sind und bietet „Filter zurücksetzen“.
- Sortierung ist getrennt von Filterung und eindeutig beschriftet.

| Empfohlene Standardansicht | Definition |
| --- | --- |
| Offene Leads | Leadstatus offen; nicht abgeschlossen oder archiviert |
| Ohne nächste Aktion | Aktiver Kontakt ohne dokumentierte nächste Aktion |
| Heute kontaktieren | Nächste Aktion heute oder überfällig |
| Eigentümer Kerngebiet | Rolle Eigentümer + priorisierte Orte |
| Neue Kontakte | Erstellt innerhalb definierter Zeit; noch keine Aktivität |
| Datenqualität | Fehlende Telefonnummer, ungültige E-Mail oder ungeklärte Dublette |

## 10 Kontakt-Detailansicht

Die Kontaktansicht soll Beziehungskontext und Handlungsfähigkeit verbinden. Sie wird auf Desktop bevorzugt als breites Side Panel oder fokussierte Detailseite umgesetzt. Auf Mobile ist sie eine eigenständige Ansicht.

1. Header: Name, Rolle, Status, Ort, wichtigste Kontaktaktionen.
2. Nächste Aktion: klar hervorgehoben mit Fälligkeit und Bearbeitung.
3. Kurzüberblick: Telefon, E-Mail, Quelle, Objekt-/Pipeline-Bezug.
4. Aktivitätsverlauf: chronologisch, typisiert und gut scanbar.
5. Offene Follow-ups und Aufgaben.
6. Objekte, Deals, Empfehlungen und Termine als verknüpfte Bereiche.
7. Notizen und erweiterte Stammdaten.
8. Datenqualität und Datenschutzinformationen, soweit vorhanden.

```text
┌───────────────────────────────────────────────┐
│ Max Mustermann                  [☎] [✉] [⋯]    │
│ Eigentümer · Bruchköbel · Lead offen           │
├───────────────────────────────────────────────┤
│ NÄCHSTE AKTION                                  │
│ Rückruf zur Bewertung · heute 14:00 [Erledigen] │
├───────────────────────────────────────────────┤
│ Überblick │ Aktivitäten │ Objekte │ Pipeline    │
├───────────────────────────────────────────────┤
│ 03.07. Unterlagen per E-Mail gesendet          │
│ 01.07. Telefonat – Interesse bestätigt          │
│ 28.06. Kontakt angelegt                         │
└───────────────────────────────────────────────┘
```

Die Detailansicht darf keine separate Datenquelle besitzen. Änderungen müssen über die bestehenden zentralen CRM-Daten und öffentlichen APIs laufen.

## 11 Follow-up-Arbeitsbereich

Der Follow-up-Bereich ist eine zeitbasierte Arbeitsliste. Er zeigt nicht nur Termine, sondern erklärt den erforderlichen Kontakt und macht den Abschluss direkt möglich.

| Ansicht | Inhalt | Standardsortierung |
| --- | --- | --- |
| Überfällig | offen und Datum vor heute | älteste Überfälligkeit beziehungsweise Priorität zuerst |
| Heute | heutiges Datum | Uhrzeit, dann manuelle Priorität |
| Nächste 7 Tage | kommende sieben Tage | Datum aufsteigend |
| Alle offen | alle offenen Wiedervorlagen | Fälligkeit aufsteigend |
| Erledigt | abgeschlossene Historie | zuletzt erledigt zuerst |

| Eintragselement | Pflicht |
| --- | --- |
| Kontakt | Name und Rolle |
| Zweck | konkrete Formulierung des Follow-ups |
| Fälligkeit | relativ und bei Bedarf absolut |
| Kontext | letzte relevante Aktivität oder Dealbezug |
| Aktionen | Erledigen, Kontakt öffnen, Verschieben |
| Abschluss | Ergebnis und optional neuer Folgeschritt |

> **Follow-up-Regel:** „Erledigt“ darf nicht nur den Datensatz aus der Liste entfernen. Der Abschluss muss als Aktivität nachvollziehbar bleiben und alle abhängigen Kennzahlen aktualisieren.

## 12 Pipeline – Sales Command Board

Die Pipeline visualisiert Fortschritt, aber sie ist kein dekoratives Kanban. Jede Card muss genug Kontext enthalten, um Stagnation und nächste Aktion zu verstehen. Desktop bietet Board und Liste; Mobile priorisiert eine gestufte Liste oder horizontales Board nur, wenn Bedienbarkeit nachgewiesen ist.

| Card-Inhalt | Pflichtstatus |
| --- | --- |
| Kontakt / Eigentümer | Pflicht |
| Objekt / Gelegenheit | Pflicht, soweit vorhanden |
| Phase | Pflicht |
| Wert / relevante monetäre Kennzahl | soweit fachlich vorhanden |
| Letzte Aktivität | Pflicht |
| Nächste Aktion | Pflicht für aktive Chancen |
| Fälligkeit | wenn Aktion vorhanden |
| Risikohinweis | nur mit transparenter Ursache |
| Öffnen | klare Aktion |

| Risikotyp | Transparente Regel | Darstellung |
| --- | --- | --- |
| Keine nächste Aktion | aktive Chance ohne nächste Aktion | Hinweis + Aktion hinzufügen |
| Überfällig | nächste Aktion in Vergangenheit | roter Status + Datum |
| Keine Aktivität | keine Aktivität seit konfiguriertem Richtwert | Zeitraum und Richtwert nennen |
| Fehlende Grundlage | notwendige Information oder Dokument fehlt | konkret benennen |
| Manuelles Risiko | vom Nutzer gesetzt | als manuell kennzeichnen |

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Kontakt      │ Qualifiziert │ Bewertung    │ Auftrag      │
│              │              │              │              │
│ Max M.       │ Anna B.      │ Haus X       │ Wohnung Y    │
│ Rückruf heute│ Termin 12.07 │ Unterlagen ? │ Vermarktung  │
│ 450.000 €    │ 380.000 €    │ 620.000 €    │ 310.000 €    │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### 12.1 Pipeline-Detailpanel

- Phase mit Änderungsmöglichkeit und nachvollziehbarer Historie.
- Nächste Aktion und Fälligkeit prominent.
- Kontakt- und Objektkontext.
- Wert, Provision oder fachlich vorhandene Kennzahlen ohne Scheinpräzision.
- Aktivitätsverlauf.
- Checkliste oder fehlende Voraussetzungen pro Phase, sofern tatsächlich benötigt.
- Keine versteckte automatische Phasenänderung.

## 13 Marktmonitor – UX-Grundkonzept

Der Marktmonitor verbindet Karte, Gebietsprofil, Kennzahl, Quelle und eigene Aktivität. Die Karte ist die primäre räumliche Navigation. Das Detailpanel erklärt das ausgewählte Gebiet und bietet kontextbezogene Aktionen.

| Bereich | Desktop | Mobile |
| --- | --- | --- |
| Karte | dominante Fläche links oder vollbreit | klar begrenzte Höhe + Fullscreen |
| Gebietsdetails | rechtes Panel oder unterhalb | Bottom Sheet |
| Kennzahlfilter | horizontale Toolbar | Filterchips / Sheet |
| Layer | kompakte Layer-Auswahl | Touch-optimiertes Layer-Sheet |
| Legende | dauerhaft sichtbar und einklappbar | kompakt, aufrufbar |
| Quelle / Stand | im Detailpanel und Statusbereich | im Sheet sichtbar |
| Vergleich | zwei Gebiete nebeneinander oder Vergleichsmodus | separate fokussierte Ansicht |

```text
┌────────────────────────────────────────────┬─────────────────────────┐
│ Kennzahl: Angebotspreis  [Layer] [Zeitraum] │ Bruchköbel               │
├────────────────────────────────────────────┤ 4.180 €/m²               │
│                                            │ +3,2 % ggü. Vorjahr      │
│               ECHTE KARTE                  │ Stand: Juni 2026         │
│      Gemeindegrenzen · Marker · Layer      │ Quelle: …                │
│                                            │ Qualität: verifiziert    │
│                                            │                         │
│                                            │ [Kontakte im Gebiet]     │
│                                            │ [Pipeline anzeigen]      │
└────────────────────────────────────────────┴─────────────────────────┘
```

> **Wahrheitsregel:** Eine Karte oder Kennzahl darf nie professioneller wirken als ihre Datenbasis ist. Wenn Grenzen approximiert, Daten veraltet oder Werte geschätzt sind, muss dies sichtbar und verständlich gekennzeichnet sein.

### 13.1 Karteninteraktion

- Klick oder Tap auf ein Gebiet selektiert es und aktualisiert Detailpanel, Kennzahlen und passende Filter.
- Hover darf zusätzliche Hinweise zeigen, aber keine unverzichtbaren Informationen enthalten.
- Zoom und Pan bleiben flüssig; Scrollen der Seite und Zoomen der Karte geraten auf Mobile nicht in Konflikt.
- „Auf MKK zentrieren“ stellt einen definierten Ausgangszustand her.
- Layerzustände sind klar und werden nicht versehentlich über mehrere Sitzungen konserviert, sofern dies nicht gewünscht ist.
- Marker werden bei größeren Mengen geclustert.
- Personenbezogene Daten erscheinen nur datenschutzgerecht und abhängig vom Zugriffskontext.

### 13.2 Gebietsprofil

| Inhalt | Darstellung |
| --- | --- |
| Gebietsname und strategische Rolle | klarer Header; keine automatisch erfundene Klassifizierung |
| Aktuelle Kennzahl | Wert, Einheit, Zeitraum |
| Trend | Richtung, Vergleichszeitraum, Methode |
| Quelle und Aktualität | Source Badge + Zeitstempel |
| Datenqualität | verifiziert, geschätzt, veraltet, fehlend |
| Eigene Aktivität | Kontakte, Follow-ups, Pipeline, Objekte im Gebiet |
| Aktionen | CRM filtern, Pipeline filtern, Gebiet vergleichen, Notiz/Plan öffnen |

## 14 Tippgeber- und Netzwerkbereich

Der Tippgeber-Bereich unterstützt langfristige Beziehungsarbeit. Er darf nicht wie ein zweites CRM wirken, sondern nutzt dieselben Kontaktgrundlagen und ergänzt partnerspezifischen Kontext.

- Partnerstatus, letzter Kontakt, nächster Pflegeschritt und Empfehlungshistorie stehen im Vordergrund.
- Keine intransparenten A/B/C-Rankings oder automatischen Personenbewertungen.
- Wert oder Relevanz darf über nachvollziehbare Fakten beschrieben werden, etwa Empfehlungen und Aktivitäten.
- Listenansicht für operative Pflege; Detailansicht für Beziehungskontext.
- Skripte und Vorlagen sind kontextbezogen aufrufbar, aber nicht dauerhaft im Hauptlayout dominant.

| Standardansicht | Zweck |
| --- | --- |
| Pflege fällig | Partner mit fälligem oder überfälligem nächsten Kontakt |
| Neue Partner | neu angelegt, Onboarding unvollständig |
| Aktive Empfehlungen | Empfehlungen mit offenem Status |
| Letzte Kontakte | chronologische Beziehungshistorie |
| Netzwerk nach Ort/Branche | gezielte regionale Planung |

## 15 KPIs, Reviews und Fortschritt

Kennzahlen dienen der Steuerung und Reflexion. Sie dürfen keine künstliche Genauigkeit erzeugen und keine individuelle Leistung durch beliebige Scores vereinfachen.

| KPI-Typ | Beispiele | Darstellung |
| --- | --- | --- |
| Aktivität | Anrufe, Gespräche, Follow-ups, Termine | klarer Ist-/Ziel-Vergleich |
| Qualität | Anteil Kontakte mit nächster Aktion, überfällige Arbeit | Trend und Ursache |
| Pipeline | aktive Chancen, Phasenbewegung, Stagnation | zeitlicher Verlauf und Drill-down |
| Ergebnis | Bewertungstermine, Aufträge, Abschlüsse | nach Zeitraum und Quelle |
| Marktaktivität | Kontakte/Objekte pro Gebiet | Karte oder Vergleich |
| Datenqualität | fehlende Felder, Dubletten, ungültige Daten | Arbeitsliste statt abstrakter Score |

Dashboards für KPIs werden visuell nachrangig zum operativen Heute-Bereich behandelt. Wochen- und Monatsreviews verbinden Zahlen mit kurzen Reflexionsfragen und konkreten Anpassungen.

## 16 Wissen, Skripte und KI-Prompts

Wissensmodule sind unterstützende Werkzeuge. Sie müssen schnell auffindbar sein, dürfen aber die operative Hauptnavigation nicht dominieren.

- Suche über Titel, Thema, Situation und Schlagwort.
- Skripte nach Gesprächssituation strukturiert: Erstkontakt, Einwand, Eigentümertermin, Nachfassen, Tippgeber.
- KI-Prompts zeigen Zweck, benötigte Eingaben und erwartetes Ergebnis.
- Kopieren erzeugt klares Feedback.
- Wissensinhalte besitzen Änderungsdatum und gegebenenfalls Quelle.
- Keine Vermischung von operativen Kontaktdaten und allgemeinem Lernmaterial.

## 17 Backup, Datenqualität und Einstellungen

Backup und Datenqualität sind Vertrauensfunktionen. Sie sollen nicht versteckt sein, aber auch nicht den täglichen Arbeitsbereich überladen. Ein kompakter Systemstatus kann auf dem Dashboard erscheinen, wenn Handlungsbedarf besteht.

| Funktion | UX-Anforderung |
| --- | --- |
| Backup erstellen | klare Beschreibung, was enthalten ist; sichtbarer Abschluss und Dateiname |
| Import | Datei prüfen, Zusammenfassung zeigen, Konflikte erklären, erst dann bestätigen |
| Wiederherstellung | Warnung, Backup-Empfehlung und klare Auswirkung |
| Datenqualität | konkrete Probleme als Arbeitsliste; direkte Korrektur |
| Dubletten | Vergleich vor Zusammenführung; keine stille Löschung |
| Einstellungen | nach Themen gruppiert; seltene technische Optionen separat |
| Systemstatus | letztes Backup, lokale Speicherung, Offline/Online, Datenquellenstatus |

## 18 Formulare und Datenerfassung

Formulare minimieren kognitive Last. Häufig benötigte Felder stehen zuerst. Seltene oder technische Felder werden progressiv offengelegt. Die Oberfläche soll schnelle Erfassung erlauben, ohne Datenqualität zu opfern.

| Regel | Verbindliche Umsetzung |
| --- | --- |
| Feldreihenfolge | Identität/Kontext → Kontakt → Status → nächste Aktion → Details |
| Labels | dauerhaft sichtbar; Placeholder ersetzt kein Label |
| Pflichtfelder | sparsam und begründet |
| Validierung | inline nach sinnvoller Interaktion; nicht erst nach vollständigem Absenden |
| Fehlertext | konkret: Problem + Korrektur |
| Speichern | eindeutige Primäraktion; bei längeren Formularen sticky oder wiederholt |
| Abbrechen | verhindert Datenverlust; bei Änderungen Rückfrage |
| Autosave | nur mit sichtbarem Status und robustem Fehlerverhalten |
| Mobile Tastatur | passender Input-Type und Enter-Key |
| Datumswahl | lesbar, lokalisiert und per Tastatur bedienbar |

> **Schnellerfassung:** Quick Capture darf nur die für den häufigen Einstieg notwendigen Felder zeigen. Nach dem Speichern kann die vollständige Detailansicht angeboten werden. Die Schnellerfassung darf keinen unvollständigen Datensatz erzeugen, der später unauffindbar ist.

### 18.1 Dialog für neuen Kontakt

```text
Neuer Kontakt
────────────────────────────────────────
Name *                 Rolle / Typ
Telefon                E-Mail
Ort                     Quelle

Nächste Aktion          Fällig am
Notiz

[Abbrechen]                         [Kontakt anlegen]
```

Nach erfolgreichem Anlegen zeigt das System eine kurze Bestätigung mit den Optionen „Kontakt öffnen“ und „Weiteren anlegen“. Der neue Datensatz erscheint unmittelbar in allen relevanten Ansichten.

## 19 Suche, Filter, Sortierung und Ansichten

Suche und Filter sind modulübergreifend konsistent. Nutzer sollen nicht in jedem Bereich neue Bedienmuster lernen.

| Element | Standardverhalten |
| --- | --- |
| Suche | durchsucht sichtbare fachlich relevante Felder; debounce; Ergebnisanzahl |
| Filter | öffnet Popover/Sheet; aktive Filter als Chips sichtbar |
| Sortierung | ein klarer Sortierschlüssel plus Richtung |
| Ansicht | Liste/Board/Karte nur, wenn fachlich sinnvoll |
| Zurücksetzen | setzt alle temporären Filter und Sortierung auf dokumentierten Standard |
| Keine Treffer | aktive Filter erklären; Alternativen anbieten |
| Persistenz | nur bewusst gespeicherte Ansichten dauerhaft; Deep-Link-Filter temporär |

Filter sollen nicht aus zwanzig gleichwertigen Dropdowns bestehen. Häufige Filter sind direkt sichtbar, erweiterte Filter liegen in einem Panel. Mobile nutzt ein Bottom Sheet mit Ergebnisvorschau.

## 20 Tabellen, Listen und Boards

| Darstellung | Einsatz | Regeln |
| --- | --- | --- |
| Tabelle | vergleichbare strukturierte Datensätze auf Desktop | sticky Header; klare Spalten; responsive Alternative |
| Liste | zeit- oder aktionsorientierte Arbeit | zweizeilige Einträge; klare Primäraktion |
| Card Grid | überschaubare Objekt- oder Summary-Sets | nicht für große CRM-Listen |
| Kanban/Board | phasenbasierter Prozess | begrenzte Card-Dichte; zugängliche Alternative |
| Timeline | chronologische Aktivität | Typ, Datum, Autor/Quelle, Inhalt |
| Map Layer | räumliche Verteilung | Legende, Quelle und Datenschutz |

- Keine horizontale Gesamtseiten-Überbreite.
- Breite Tabellen dürfen innerhalb eines klar begrenzten Containers scrollen.
- Wichtige Zeilenaktionen bleiben erreichbar.
- Sticky Header dürfen Topbar und Filter nicht überlagern.
- Row Click öffnet Details; einzelne Buttons haben separate Klickziele.
- Hover-Zebra und Auswahlzustand sind voneinander unterscheidbar.

## 21 Systemzustände und Feedback

Jede produktive Komponente benötigt definierte Zustände. Ein Design ist unvollständig, wenn nur der ideale Datenzustand gestaltet ist.

| Zustand | Inhalt | Aktion |
| --- | --- | --- |
| Initial Loading | Skeleton oder kompakter Loader; Layout bleibt stabil | keine |
| Refreshing | bestehende Daten bleiben sichtbar; kleiner Status | Abbrechen nur bei Bedarf |
| Empty – neu | erklärt Nutzen und ersten Schritt | Erstellen / Importieren |
| Empty – gefiltert | nennt aktive Filter | Filter zurücksetzen |
| Error – lokal | konkreter Fehler, Daten bleiben soweit möglich | Wiederholen / Details |
| Error – Netzwerk | Offline/Timeout unterscheiden | Wiederholen / Cache nutzen |
| Stale | letzter valider Stand und Alter | Aktualisieren |
| Success | kurze Bestätigung, keine Unterbrechung | Undo sofern sinnvoll |
| Conflict | zeigt Unterschiede und Entscheidung | Übernehmen / Zusammenführen / Abbrechen |
| Permission/Auth | erklärt fehlenden Zugriff | Anmelden / Zurück |

Toasts eignen sich für reversible oder nicht kritische Bestätigungen. Kritische Fehler und Validierungsprobleme erscheinen inline. Modale Dialoge sind nicht als generische Fehlermeldungsbox zu verwenden.

## 22 Design Tokens – Grundsystem

Alle visuellen Werte werden über semantische Tokens gesteuert. Komponenten referenzieren keine zufälligen Hexwerte, Schatten oder Abstände.

| Token-Gruppe | Beispiele | Zweck |
| --- | --- | --- |
| Color | `--color-bg-app`, `--color-surface`, `--color-text-primary` | semantische Farbrollen |
| Spacing | `--space-1` bis `--space-12` | Abstände und Layout |
| Radius | `--radius-sm`, `md`, `lg`, `xl`, `pill` | Formensprache |
| Shadow | `--shadow-sm`, `md`, `overlay` | Elevation |
| Typography | `--text-xs` bis `--text-display` | Schriftgrößen und Zeilenhöhen |
| Motion | `--duration-fast`, `normal`, `slow` | Animationstiming |
| Layout | `--sidebar-width`, `--content-max`, `--topbar-height` | App-Shell |
| Z-Index | `--z-base`, `sticky`, `overlay`, `toast` | Schichtordnung |

### 22.1 Empfohlene Farbtokens

| Token | Richtwert | Verwendung |
| --- | --- | --- |
| `--color-bg-app` | #F4F3F1 | App-Hintergrund |
| `--color-surface` | #FFFFFF | Cards, Panels, Dialoge |
| `--color-surface-subtle` | #F7F7F5 | sekundäre Flächen |
| `--color-text-primary` | #17202D | Primärtext |
| `--color-text-secondary` | #667085 | Sekundärtext |
| `--color-border` | rgba(23,32,45,.14) | Standardlinien |
| `--color-primary` | #1E2A3A | Navigation, Primärbuttons |
| `--color-accent` | #B84535 oder final abgestimmtes Ziegelrot | gezielte Akzente |
| `--color-success` | #2E7D5B | Erfolg |
| `--color-warning` | #B7791F | Aufmerksamkeit |
| `--color-danger` | #B42318 | Fehler/überfällig |
| `--color-info` | #315E85 | Information/Auswahl |

Die endgültigen Kontrastwerte werden gegen WCAG geprüft. Richtwerte dürfen technisch angepasst werden, die semantische Rollenverteilung bleibt verbindlich.

### 22.2 Spacing, Radius und Schatten

| System | Werte | Regel |
| --- | --- | --- |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64 px | Sonderwerte nur begründet |
| Radius | 6, 10, 14, 18, 24 px; Pill für Chips | nicht jede Card maximal rund |
| Shadow small | subtil, fast unsichtbar | Cards nur bei Bedarf abheben |
| Shadow medium | Panels, schwebende Toolbar | nicht auf jeder Oberfläche |
| Shadow overlay | Dialoge, Drawer, Bottom Sheet | mit Backdrop und Fokusmanagement |

## 23 Typografie

Operative Software benötigt hohe Lesbarkeit und eine ruhige Hierarchie. Eine Serifenschrift kann für Markenmomente oder Deckseiten verwendet werden, nicht als dominante UI-Schrift in Tabellen und Arbeitsmodulen.

| Stufe | Richtwert Desktop | Verwendung |
| --- | --- | --- |
| Display | 32–40 px | seltene Landing-/Leerseiten; nicht Dashboard-KPIs |
| Page Title | 26–32 px | Hauptseitenkopf |
| Section Title | 18–22 px | Bereiche |
| Card Title | 14–16 px, semibold | Cards und Panels |
| Body | 14–16 px | Standardtext |
| Small | 12–13 px | Metadaten, Hilfetext |
| Label | 11–12 px, semibold | Formlabels, Status |
| Numeric KPI | 24–36 px | wichtige Zahlen; Tabular Nums |

- Zeilenlängen in Fließtext begrenzen.
- Keine langen operativen Texte in ausschließlich Großbuchstaben.
- Tabellarische Zahlen für vergleichbare Kennzahlen.
- Fettung sparsam; Hierarchie nicht nur über Weight erzeugen.
- Mobile Schriftgrößen nicht unter lesbare Mindestwerte reduzieren.

## 24 Farb- und Statussystem

Farben transportieren Bedeutung. Die Akzentfarbe der Marke ist nicht automatisch die Fehlerfarbe. Statusrollen müssen modulübergreifend gleich funktionieren.

| Status | Farbe | Textbeispiel |
| --- | --- | --- |
| Neutral | Grau/Navy | Offen, geplant, unbekannt |
| Info | Blau | Ausgewählt, Hinweis, synchronisiert |
| Erfolg | Grün | Erledigt, aktuell, erfolgreich |
| Warnung | Amber | heute fällig, unvollständig, Aufmerksamkeit |
| Gefahr | Rot | überfällig, fehlgeschlagen, kritisch |
| Inaktiv | helles Grau | archiviert, deaktiviert |

Status wird immer zusätzlich durch Text, Symbol oder Form kommuniziert. Rot wird nicht für normale Markenakzente in Bereichen verwendet, in denen gleichzeitig Fehler oder Überfälligkeit dargestellt werden.

## 25 Flächen, Cards, Linien und Elevation

- App-Hintergrund leicht warm und ruhig.
- Hauptoberflächen weiß oder sehr leicht abgesetzt.
- Cards besitzen dünne Linien; Schatten sind subtil und nicht zwingend.
- Interaktive Cards erhalten Hover/Fokus, statische Cards nicht unnötig.
- Nested Cards werden vermieden. Gruppierung erfolgt bevorzugt über Abstand und Überschrift.
- Eine Seite soll nicht wie ein Raster aus zwanzig identischen Kästen wirken.
- Elevation kommuniziert Schicht: Basis, sticky, popover, drawer, dialog, toast.

## 26 Buttons und Aktionshierarchie

| Typ | Verwendung | Beispiel |
| --- | --- | --- |
| Primary | eine Hauptaktion pro Kontext | Jetzt anrufen, Kontakt speichern |
| Secondary | wichtige Alternative | Kontakt öffnen, Filter anwenden |
| Ghost | niedrige Gewichtung | Mehr, Details, Schließen |
| Destructive | Löschen oder irreversible Aktion | Kontakt löschen |
| Icon Button | bekannte kompakte Aktion mit Label/Tooltip | Suche, Schließen |
| Link Action | Navigation oder leichte Aktion | Alle anzeigen |

- Primärbuttons nicht mehrfach nebeneinander wiederholen.
- Destructive Aktionen räumlich und visuell trennen.
- Disabled nur verwenden, wenn Grund erkennbar ist; sonst Aktion zulassen und validieren.
- Loading-Zustand verhindert Doppelklick und erhält Buttonbreite.
- Icon-only Buttons benötigen zugängliche Namen und ausreichend große Touchflächen.

## 27 Form Controls, Chips und Badges

| Komponente | Regel |
| --- | --- |
| Input | sichtbares Label, Fokus, Hilfetext und Fehlerzustand |
| Select | für begrenzte bekannte Optionen; kein versteckter Mega-Filter |
| Combobox | Suche + Auswahl bei großen Mengen |
| Date Picker | lokalisiert, Tastatur und Mobile geeignet |
| Checkbox | unabhängige Mehrfachoption |
| Radio / Segment | eine Auswahl aus wenigen Optionen |
| Filter Chip | aktiven Filter anzeigen und einzeln entfernen |
| Status Badge | Status textlich ausdrücken, nicht als alleinige Farbe |
| Tag | fachliche Klassifikation; sparsam |
| Progress | nur bei echtem Ziel/Prozess, nicht dekorativ |

## 28 Dialoge, Drawer, Side Panels und Bottom Sheets

| Muster | Einsatz | Nicht einsetzen für |
| --- | --- | --- |
| Dialog | fokussierte Entscheidung oder kurzer Abschluss | lange CRM-Detailansicht |
| Side Panel | Kontextdetails neben Liste/Board | komplexe Mobile-Formulare |
| Drawer | sekundäre Navigation oder Filter | permanente Hauptnavigation auf Desktop |
| Bottom Sheet | Mobile Aktionen, Filter, kurze Details | lange unstrukturierte Inhalte |
| Popover | kleine kontextbezogene Auswahl | kritische Bestätigung |
| Toast | kurze Bestätigung oder Undo | Validierungsfehler und kritische Probleme |

Overlays besitzen Fokusfalle, Escape/Schließen, verständlichen Titel und Rückgabe des Fokus. Hintergrundscroll wird kontrolliert. Gestapelte Dialoge sind zu vermeiden.

## 29 Icons und Bildsprache

- Eine konsistente Outline- oder leicht gefüllte Iconfamilie verwenden.
- Icons unterstützen Text; sie ersetzen seltene oder mehrdeutige Begriffe nicht.
- Keine Emoji als primäre Systemicons.
- Statusicons bleiben semantisch konstant.
- Illustrationen werden nur in Leerseiten oder Onboarding verwendet und bleiben sachlich.
- Fotos oder Immobilienbilder erscheinen objektbezogen, nicht als dekorative Stockbilder im Dashboard.

## 30 Diagramme und Datenvisualisierung

Diagramme werden nur eingesetzt, wenn eine Entwicklung, Verteilung oder ein Vergleich schneller erkennbar wird als in Text oder Tabelle.

| Diagramm | Geeignet für | Regeln |
| --- | --- | --- |
| Line | Zeitverlauf | klare Achsen, Zeitraum, Quelle |
| Bar | Vergleich von Gebieten oder Kategorien | sortierbar; Nullpunkt beachten |
| Stacked Bar | Zusammensetzung über wenige Kategorien | Legende klar |
| Donut | höchstens wenige Anteile | nicht für präzisen Vergleich |
| Sparkline | kompakter Trend neben Kennzahl | mit numerischem Wert |
| Heatmap Map | räumliche Intensität | Legende, Skala und Datenqualität |
| Table | präzise Werte | oft besser als komplexes Chart |

- Farben folgen Status-/Datenrollen und bleiben farbenblind-tauglich.
- Tooltips enthalten Wert, Einheit, Zeitraum und Quelle.
- Keine 3D-Charts.
- Keine Animation, die Werte verzögert oder verfälscht.
- Leere oder unvollständige Zeitreihen werden nicht verbunden, als wären Daten vorhanden.

## 31 Responsive System

| Bereich | Richtwert | Verhalten |
| --- | --- | --- |
| Mobile small | bis ca. 420 px | einspaltig, Bottom Navigation, Sheets |
| Mobile / large phone | 421–767 px | einspaltig, einzelne Zweier-KPI-Reihen möglich |
| Tablet | 768–1099 px | adaptive Navigation, zwei Spalten, Panels situationsabhängig |
| Desktop | 1100–1439 px | Sidebar, mehrspaltige Arbeitsflächen |
| Wide Desktop | ab 1440 px | breitere Karte/Boards; Lesebreiten bleiben begrenzt |

Breakpoints sind keine Geräteklassen, sondern Layoutpunkte. Komponenten reagieren auch containerbezogen, wenn möglich. Das Produkt wird mindestens auf 375, 390, 430, 768, 1024, 1280 und 1440 px geprüft.

### 31.1 Mobile Priorisierung

1. Nächste Aktion und Telefonie.
2. Fällige Arbeit.
3. Kontakt- oder Deal-Kontext.
4. Primäre Abschlussaktion.
5. Sekundäre Details.
6. Historie und seltene Metadaten.

Mobile darf Informationen einklappen, aber nicht die Bedeutung des Zustands verstecken. Wichtigste Aktionen liegen in der Daumenzone. Sticky Aktionen berücksichtigen Safe Area und Bildschirmtastatur.

### 31.2 Großer Monitor / TV-Modus

Ein optionaler Focus- oder Monitor-Modus ist eine reduzierte Anzeige für tägliche Ziele, nächste Termine, Anrufe und kritische Follow-ups. Er ist keine vollständige App-Navigation.

- Große lesbare Kennzahlen und aktuelle Arbeitsqueue.
- Keine personenbezogenen Details, wenn der Bildschirm öffentlich einsehbar ist.
- Automatische Aktualisierung ohne hektische Animation.
- Klare Uhrzeit und Datenstand.
- Einfacher Wechsel zurück zur normalen App.

## 32 Accessibility und inklusive Bedienung

| Bereich | Anforderung |
| --- | --- |
| Tastatur | alle Funktionen erreichbar; logische Tab-Reihenfolge |
| Fokus | sichtbar, kontrastreich, nicht von sticky Elementen verdeckt |
| Semantik | Buttons, Links, Listen, Tabellen und Überschriften korrekt |
| Dialoge | Fokusfalle, Titel, Escape, Rückfokus |
| Formulare | Labels, Fehlerzuordnung, Statusmeldung |
| Farbe | Information nie ausschließlich farblich |
| Kontrast | WCAG-orientierte Prüfung |
| Touch | komfortable Mindestziele und Abstand |
| Bewegung | `prefers-reduced-motion` respektieren |
| Karte | alternative Liste/Tabelle für räumliche Informationen |
| Live Updates | sparsame `aria-live`-Meldungen |
| Charts | Textzusammenfassung oder Datentabelle |

> **Barrierefreiheit als Qualitätsprüfung:** Accessibility ist kein Sondermodus. Viele Regeln verbessern auch die normale Bedienung: klare Labels, stabile Fokusführung, große Touchflächen, verständliche Fehler und nachvollziehbare Struktur.

## 33 Content Design und Microcopy

| Kontext | Gute Formulierung | Zu vermeiden |
| --- | --- | --- |
| Button | „Follow-up erledigen“ | „OK“ |
| Fehler | „Telefonnummer enthält ungültige Zeichen.“ | „Fehler 400“ |
| Leerzustand | „Noch keine offenen Follow-ups. Neues Follow-up anlegen.“ | „Keine Daten“ |
| Laden | „Marktdaten werden aktualisiert …“ | „Bitte warten“ |
| Veraltet | „Letzter erfolgreicher Stand: 7. Juli 2026“ | „Offline data“ |
| Löschen | „Kontakt endgültig löschen“ | „Entfernen“ ohne Wirkung |
| Filter | „Überfällig“ | „Status 3“ |

- Kurze aktive Sätze.
- Fachbegriffe konsistent verwenden.
- Datum, Uhrzeit, Währung und Einheiten deutsch lokalisieren.
- Keine übertriebene Begeisterung in Systemmeldungen.
- Bestätigungen beschreiben, was passiert ist.
- Warnungen beschreiben Konsequenz und sicheren nächsten Schritt.

## 34 Motion und Microinteractions

Bewegung unterstützt Orientierung. Sie darf weder Arbeit verzögern noch ein spielerisches Erscheinungsbild erzeugen.

| Interaktion | Richtwert |
| --- | --- |
| Hover/Fokus | 100–150 ms |
| Panel/Sheet | 180–240 ms |
| Seiten-/Tabwechsel | kurz oder ohne Animation |
| Toast | sanft ein/aus; ausreichend lesbar |
| Progress | nur reale Änderung; keine künstliche Zählanimation |
| Karte | flüssiges Fit/Pan; reduzierte Bewegung berücksichtigen |

- Keine Dauerpulse außer bei echter, zeitkritischer Systemaktivität.
- Keine Konfetti- oder Gamification-Effekte.
- Layoutänderungen nicht unnötig animieren.
- Bei `prefers-reduced-motion` Übergänge stark reduzieren oder entfernen.

## 35 Leere Zustände und Onboarding

| Leertyp | Beispiel | Inhalt |
| --- | --- | --- |
| Erster Start | keine Kontakte | Nutzen, Import/Anlegen, kurze Erklärung |
| Arbeitsleer | keine fälligen Follow-ups | Bestätigung + nächster sinnvoller Bereich |
| Filterleer | keine offenen Leads in Nidderau | aktive Filter + zurücksetzen |
| Datenquelle leer | keine Marktkennzahl verfügbar | Quelle/Grund + alternative Daten |
| Fehlerbedingt leer | Provider nicht erreichbar | letzten Stand zeigen oder Wiederholen |
| Berechtigung | Daten nicht zugänglich | Grund und Handlungsoption |

Onboarding erfolgt kontextbezogen und kurz. Keine lange Produkttour vor der ersten Nutzung. Kritische Konzepte wie Backup, lokale Speicherung und Marktdatenquellen werden gezielt erklärt.

## 36 Komponentenverträge

Komponentenverträge definieren Inhalt, Zustände und Ereignisse. Visuelle Varianten dürfen den Vertrag nicht verändern.

| Komponente | Erforderliche Props/Daten | Ereignisse | Pflichtzustände |
| --- | --- | --- | --- |
| KPI Card | Label, Value, Context, Target, Destination | open, focus | normal, hover, focus, empty, loading |
| Work Item | Type, Title, Due, Context, Action | complete, snooze, open | overdue, due, normal, completed |
| Contact Row | Contact, Status, LastActivity, NextAction | call, followup, open | normal, selected, dataIssue |
| Pipeline Card | Stage, Contact, Object, Value, NextAction, Risk | open, move, action | normal, overdue, stagnant |
| Source Badge | Source, Period, FetchedAt, Quality | details, refresh | current, stale, estimated, missing |
| Filter Chip | Label, Value | remove | active, focused |
| Toast | Message, Type, Undo | undo, dismiss | success, error, info |
| Empty State | Reason, Title, Guidance, Action | primaryAction | firstUse, filtered, unavailable |
| Map Area | AreaId, Geometry, Metric, Status | select, hover | default, selected, unavailable |
| Call Hero | Contact, Goal, Progress, Reason | call, result, skip, open | ready, empty, offline |

## 37 Textuelle Referenz-Wireframes

Die folgenden Wireframes beschreiben Informationshierarchie, nicht pixelgenaue Gestaltung. Die endgültige Oberfläche darf visuell verbessert werden, solange Reihenfolge und Arbeitslogik erhalten bleiben.

```text
MOBILE HEUTE
┌──────────────────────────────┐
│ Mittwoch, 9. Juli       +    │
│ Fokus: Akquise               │
├──────────────────────────────┤
│ Nächster Anruf         8/20  │
│ Max Mustermann               │
│ Rückruf zur Bewertung        │
│ [        Jetzt anrufen      ]│
│ Ergebnis · Kontakt öffnen    │
├──────────────────────────────┤
│ Jetzt erledigen              │
│ 1. Follow-up überfällig      │
│ 2. Termin in 40 Minuten      │
│ 3. Lead ohne nächste Aktion  │
├──────────────────────────────┤
│ 12 Leads │ 5 Follow-ups      │
│ 3 Tasks  │ 2 Risiken         │
└──────────────────────────────┘
```

```text
MOBILE KONTAKTDETAIL
┌──────────────────────────────┐
│ ‹ Kontakte           Bearb.  │
│ Max Mustermann               │
│ Eigentümer · Bruchköbel      │
│ [Anrufen] [E-Mail] [Mehr]    │
├──────────────────────────────┤
│ Nächste Aktion               │
│ Rückruf heute 14:00          │
│ [Erledigen] [Verschieben]    │
├──────────────────────────────┤
│ Aktivitäten                  │
│ 03.07 Unterlagen gesendet    │
│ 01.07 Telefonat              │
└──────────────────────────────┘
```

```text
MOBILE MARKT
┌──────────────────────────────┐
│ Markt        Angebotspreise  │
├──────────────────────────────┤
│                              │
│          ECHTE KARTE         │
│                              │
│ [Layer] [Filter] [Fullscreen]│
├──────────────────────────────┤
│ Bruchköbel                   │
│ 4.180 €/m² · +3,2 %          │
│ Stand Juni 2026 · Quelle …   │
│ [Kontakte] [Vergleichen]     │
└──────────────────────────────┘
```

## 38 UX-Abnahmekriterien nach Hauptmodul

| Modul | Muss-Kriterium |
| --- | --- |
| Heute | Nächster Anruf und dringende Arbeit sind ohne Scrollen oder mit minimalem Scrollen sichtbar. |
| Dashboard-KPIs | Jeder relevante Klick öffnet eine sichtbare gefilterte Zielansicht. |
| Kontakte | Nächste Aktion, Fälligkeit und letzte Aktivität sind in Liste und Detail verständlich. |
| Follow-ups | Überfällige und heutige Einträge sind direkt abarbeitbar. |
| Pipeline | Stagnation und nächste Aktion sind transparent; Board und Liste sind konsistent. |
| Markt | Echte Geografie, Quelle, Stand und Datenqualität sind erkennbar. |
| Tippgeber | Pflegebedarf und Empfehlungskontext sind sichtbar, ohne Personenranking. |
| KPIs | Kennzahlen führen zu zugrunde liegenden Daten und erzeugen keine Scheinbewertung. |
| Backup | Nutzer versteht Inhalt, Zeitpunkt und Ergebnis von Backup/Import. |
| Mobile | Keine Desktop-Tabelle wird unbedienbar verkleinert; Hauptaktionen sind touchgerecht. |

## 39 UX-QA und visuelle Regression

1. Baseline-Screenshots je Hauptansicht auf 1440, 1024, 430 und 390 px.
2. Prüfung von Standard-, Leer-, Lade-, Fehler- und Offline-Zuständen.
3. Tastaturdurchlauf: Navigation, Filter, Listen, Dialoge, Formulare.
4. Fokusprüfung bei Öffnen/Schließen von Panel, Dialog und Sheet.
5. Kontrastprüfung der Tokens und Statusfarben.
6. Prüfung auf horizontalen Body-Scroll.
7. Prüfung langer Namen, Texte, Ortsnamen und großer Zahlen.
8. Prüfung bei 200 % Zoom beziehungsweise vergrößerter Schrift.
9. Prüfung der Klickpfade vom Dashboard bis zur konkreten Arbeit.
10. Prüfung, dass keine historische Navigation oder alte Komponentenfamilie parallel sichtbar bleibt.

| Viewport | Pflichtprüfung |
| --- | --- |
| 375 × 812 | kleines iPhone; Navigation, Formulare, Karten-Sheet |
| 390 × 844 | primärer Mobile-Referenzwert |
| 430 × 932 | großes iPhone |
| 768 × 1024 | Tablet hochkant |
| 1024 × 768 | Tablet quer / kleines Notebook |
| 1280 × 800 | Standard Desktop |
| 1440 × 1000 | Designreferenz Desktop |

## 40 Design-Governance und Änderungsprozess

Das Design-System ist ein Produktvermögenswert. Änderungen werden nicht durch neue CSS-Overrides „gelöst“, sondern über Tokens, Komponenten und dokumentierte Varianten.

1. Problem und Nutzungskontext beschreiben.
2. Prüfen, ob bestehendes Muster den Bedarf erfüllt.
3. Wenn nicht: neue Variante oder Komponente spezifizieren.
4. Auswirkungen auf Mobile, Accessibility, Datenzustände und andere Module prüfen.
5. Implementieren und visuell testen.
6. Dokumentation und Change Log aktualisieren.
7. Alte konkurrierende Variante migrieren oder bewusst als Legacy kennzeichnen.

> **Keine CSS-Schichtenarchäologie als Dauerzustand:** V31 muss historische globale Overrides konsolidieren. Neue Qualität entsteht nicht durch eine weitere „finale“ Styleschicht über bereits widersprüchlichen Regeln, sondern durch kontrollierte Migration zu einer eindeutigen Komponenten- und Tokenbasis.

## 41 Anti-Pattern-Katalog

| Anti-Pattern | Warum problematisch | Zielmuster |
| --- | --- | --- |
| Dashboard aus gleich großen Cards | keine Priorität | dominanter Arbeitsfokus + sekundäre Kennzahlen |
| Klickbare Zahl ohne gefiltertes Ziel | Nutzer muss erneut suchen | Deep Link in arbeitsbereite Ansicht |
| Rot als Allzweck-Akzent | Statusbedeutung verwässert | Akzent und Gefahr semantisch trennen |
| Mobile Tabelle mit horizontalem Scroll als Standard | langsam und unübersichtlich | responsive Liste/Detail |
| Mehrere Bottom Bars | Navigation konkurriert | eine mobile App-Shell |
| Modal für lange Details | beengt und schwer navigierbar | Side Panel oder Seite |
| Fake-Live-Badge | Vertrauensverlust | Quelle und realer Stand |
| Automatisches Personen-Scoring | intransparent und potenziell unfair | faktenbasierte Status- und Fälligkeitslogik |
| Übermäßige Serifenschrift | Magazin statt Arbeitssoftware | Sans-Serif im operativen UI |
| Glassmorphism überall | Kontrast und Ruhe leiden | gezielte klare Oberflächen |
| Icon ohne Label bei unbekannter Aktion | missverständlich | Text oder Tooltip/Accessible Name |
| Toast für kritischen Fehler | wird übersehen | Inline- oder persistenter Fehlerzustand |
| Neue Funktion als neue Card | fragmentiert Produkt | in bestehenden Arbeitsfluss integrieren |
| Dauerhafte automatische Animation | Ablenkung | kurze funktionale Übergänge |

## 42 Definition of Done – UX und Design

Eine Oberfläche oder Komponente gilt erst als abgeschlossen, wenn alle folgenden Punkte geprüft sind:

- Primäre Aufgabe und Hauptaktion sind eindeutig.
- Informationshierarchie entspricht dem fachlichen Arbeitsfluss.
- Desktop, Tablet und Mobile sind bewusst gestaltet.
- Alle relevanten Zustände sind vorhanden.
- Tastatur, Fokus, Labels und Kontrast sind geprüft.
- Lange Inhalte und reale Datenmengen brechen das Layout nicht.
- Navigation und Deep Links verhalten sich nachvollziehbar.
- Datenänderungen erzeugen konsistentes Feedback.
- Keine parallele alte Komponente bleibt ohne dokumentierten Grund sichtbar.
- Die Oberfläche nutzt zentrale Tokens und Komponenten.
- Screenshots und Testergebnisse sind dokumentiert.
- Abweichungen von dieser Design Bible sind begründet und freigegeben.

## 43 Übergabe an Teil 3 – Architektur und Datenmodell

Teil 2 definiert die sichtbaren und interaktiven Verträge. Teil 3 muss diese Verträge technisch absichern. Insbesondere benötigt Teil 3 verbindliche Spezifikationen für:

- App-Shell, Router/Hash-Kompatibilität und Browser-Historie.
- `KK_NAV` oder gleichwertigen zentralen Navigationsvertrag.
- Komponenten- und Eventarchitektur.
- Zentrale Datenmodelle für Kontakte, Aktivitäten, Follow-ups, Calls, Aufgaben, Pipeline, Objekte, Tippgeber und Markt.
- Transiente Filterzustände, gespeicherte Ansichten und Deep Links.
- Provider-, Cache- und Source-Registry für Marktdaten.
- Netlify Functions, Secrets, Refresh und Offline-Fallback.
- Migration bestehender CSS-, Modul- und Storage-Strukturen.
- Testbarkeit und Telemetrie ohne Verletzung der Privatsphäre.

> **Verbindliche Schnittstelle zwischen Design und Technik:** Teil 3 darf die hier beschriebenen Nutzerverträge nicht aus technischer Bequemlichkeit reduzieren. Wenn ein Vertrag technisch nicht sinnvoll erfüllbar ist, muss der Zielkonflikt dokumentiert und gemeinsam entschieden werden.

## A Anhang A – Komponenten-Inventar für V31

| Kategorie | Komponenten |
| --- | --- |
| App-Shell | Sidebar, Topbar, Mobile Bottom Nav, More Sheet, Page Header, Breadcrumb/Back |
| Navigation | Tabs, Segmented Control, Deep-Link Banner, Back-to-Dashboard |
| Actions | Primary/Secondary/Ghost/Destructive Button, Icon Button, Split Action |
| Data Entry | Input, Textarea, Select, Combobox, Date/Time, Checkbox, Radio, Quick Capture |
| Filtering | Search, Filter Bar, Filter Chip, Sort Menu, Saved View |
| Data Display | KPI Card, Work Item, Contact Row, Pipeline Card, Timeline, Table, Responsive List |
| Feedback | Toast, Inline Alert, Banner, Empty State, Skeleton, Spinner, Offline State |
| Overlays | Dialog, Side Panel, Drawer, Popover, Bottom Sheet, Tooltip |
| Status | Badge, Pill, Source Badge, Freshness Badge, Progress, Risk Reason |
| Market | Map Shell, Area Layer, Marker, Cluster, Legend, Layer Control, Area Detail Sheet |
| Charts | Line, Bar, Sparkline, Data Table Alternative |
| System | Backup Status, Import Review, Data Quality Item, Conflict Resolver |

## B Anhang B – Design Review Checkliste

1. Ist die wichtigste Aufgabe innerhalb von fünf Sekunden erkennbar?
2. Ist genau eine Primäraktion dominant?
3. Führt jede offene Kennzahl in konkrete Arbeit?
4. Sind Filter und Ansichtsstatus sichtbar?
5. Ist der Kontext bei Navigation erhalten?
6. Funktioniert die Ansicht mit null, einem und vielen Datensätzen?
7. Funktioniert sie auf 390 px ohne Gesamtseiten-Scroll?
8. Sind Touch-Ziele, Fokus und Kontrast ausreichend?
9. Werden Quelle, Aktualität und Fehler ehrlich dargestellt?
10. Wird eine vorhandene zentrale Komponente verwendet?
11. Ist eine alte konkurrierende Lösung entfernt oder klar migriert?
12. Ist das Ergebnis mit Screenshots und Testnotizen dokumentiert?

---

## Change Log

| Version | Datum | Änderung |
| --- | --- | --- |
| 1.0 | 09. Juli 2026 | Vollständige Neufassung von Teil 2: UX, Design-System und Interaktionsspezifikation. |

<!-- ENDE TEIL 2: Teil 2 – UX & Design Bible -->
