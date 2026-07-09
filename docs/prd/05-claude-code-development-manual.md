# KEIM CRM PRO - MASTER PRODUCT REQUIREMENTS DOCUMENT
## Teil 5: Claude Code Development Manual

**Version:** 1.0  
**Stand:** 09. Juli 2026  
**Status:** Verbindliches Entwicklungs-, Automations- und Betriebsmanual fuer V31 und Folgeversionen  

## 0 Dokumentauftrag, Rangordnung und Geltungsbereich

Teil 5 definiert den verbindlichen Arbeitsmodus, mit dem Claude Code und jeder spaetere Entwickler die Produktspezifikationen von Keim CRM Pro in sicheren, pruefbaren und rueckrollbaren Aenderungen umsetzt. Das Dokument ist kein allgemeiner Prompt-Leitfaden. Es ist ein projektspezifisches Engineering-Manual fuer eine historisch gewachsene, grosse Vanilla-JavaScript-Anwendung, deren produktive Daten, IDs, Storage-Keys, Navigationsvertraege und Marktmodule geschuetzt werden muessen.

Claude Code kann Quellcode lesen, Dateien bearbeiten, Befehle ausfuehren, Git-Arbeitsschritte ausloesen und externe Werkzeuge integrieren. Diese Faehigkeit wird in diesem Projekt nur innerhalb klarer Grenzen eingesetzt. Autonomie bedeutet, dass Claude innerhalb eines freigegebenen Auftrags selbststaendig analysiert, implementiert, prueft und dokumentiert. Autonomie bedeutet nicht, dass Sicherheitsgrenzen, Datenvertraege, externe Kosten, Lizenzen oder produktive Deployments eigenmaechtig veraendert werden duerfen.

> **Leitsatz:** Kein Commit gilt als erfolgreich, weil Claude Code ihn als erfolgreich bezeichnet. Erfolg wird durch reproduzierbare Evidenz belegt: Tests, Screenshots, Konsolenprotokolle, Datenparitaet, Diff-Pruefung und einen klaren Rueckweg.

| Rang | Dokument | Bedeutung fuer die Entwicklung |
| --- | --- | --- |
| 1 | Teil 1 - Produktstrategie | Bestimmt Nutzen, Prioritaeten, Nicht-Ziele und Geschaeftslogik. |
| 2 | Teil 2 - UX & Design Bible | Bestimmt sichtbare Hierarchie, Komponenten, Zustaende und Responsive-Verhalten. |
| 3 | Teil 3 - Architektur & Datenmodell | Bestimmt APIs, Stores, IDs, Ereignisse, Migrationen und Modulgrenzen. |
| 4 | Teil 4 - Marktmonitor & Kartenplattform | Bestimmt GIS, Quellen, Layer, Provider, Aktualitaet und Datenwahrheit. |
| 5 | Teil 5 - Development Manual | Bestimmt Analyse, Aenderung, Verifikation, Git, Automation und Uebergabe. |
| 6 | ADRs und Provider-Dossiers | Dokumentieren konkrete technische und rechtliche Entscheidungen. |

- Gilt fuer Claude Code im Web, in der App, im Terminal oder in einer IDE, soweit die jeweilige Oberflaeche die benoetigten Werkzeuge bereitstellt.
- Gilt fuer die aktuelle index.html sowie fuer spaetere Moduldateien, Netlify Functions, Geodaten, Tests und Dokumentation.
- Gilt fuer Bugfixes, Designaenderungen, Features, Refactorings, Datenmigrationen, Providerintegrationen und Releases.
- Gilt fuer autonome und interaktive Sitzungen.
- Gilt auch dann, wenn ein Auftrag nur einen kleinen Ausschnitt nennt; Schutzregeln und Abnahmekriterien bleiben wirksam.

### 0.1 Dokumentensteuerung

| Feld | Festlegung |
| --- | --- |
| Produkt | Keim CRM Pro |
| Dokument | Master PRD - Teil 5: Claude Code Development Manual |
| Version | 1.0 |
| Status | Verbindliches Entwicklungs-, Automations- und Betriebsmanual fuer V31 und Folgeversionen |
| Primaerer Auftraggeber | Kevin Keim |
| Primaerer Codebestand | Vanilla-JavaScript-Single-File-App mit GitHub- und Netlify-Betrieb |
| Ziel | Wiederholbare, sichere und evidenzbasierte Entwicklung ohne Daten- oder Funktionsverlust |
| Aenderungsregel | Workflow-, Branch-, Hook-, Permission- oder Releaseaenderungen werden versioniert und begruendet |

Die Regeln dieses Dokuments duerfen nicht durch einen kurzfristigen Chat-Prompt stillschweigend aufgehoben werden. Eine Abweichung muss im Auftrag ausdruecklich benannt, fachlich begruendet und im Abschlussbericht dokumentiert werden.

### 0.2 Normative Begriffe

| Begriff | Bedeutung |
| --- | --- |
| MUSS | Verbindliche Voraussetzung. Ohne Erfuellung kein Abschluss. |
| DARF NICHT | Verbotene Handlung oder Architektur. |
| SOLL | Regelfall; Abweichung nur mit dokumentierter Begruendung. |
| KANN | Option, wenn Nutzen und Risiko positiv bewertet wurden. |
| Evidenz | Nachpruefbarer Beleg wie Testoutput, Screenshot, Diff oder Log. |
| Blocker | Hindernis, das ohne Nutzerentscheidung, Geheimnis, Vertrag oder irreversible Aktion nicht sicher loesbar ist. |
| Phase | Abgegrenzter Entwicklungsabschnitt mit eigenem Ziel, Test und Commit. |
| Baseline | Gesicherter Ausgangszustand mit Commit, Screenshots und Dateninventar. |

## 1 Executive Summary

Das Entwicklungsmodell von Keim CRM Pro folgt einem kontrollierten Agentic-Engineering-Zyklus: verstehen, planen, sichern, implementieren, verifizieren, reviewen, dokumentieren und erst danach integrieren. Claude Code soll nicht als Textgenerator behandelt werden, sondern als ausfuehrender Engineering-Agent, der innerhalb klarer Vertrauensgrenzen arbeitet. Jeder Auftrag benoetigt einen messbaren Zielzustand und einen Verifikationsweg.

Die wichtigste technische Besonderheit ist die aktuelle grosse Single-File-Anwendung. Viele historische CSS-, HTML- und JavaScript-Schichten liegen in derselben index.html. Dadurch koennen scheinbar kleine Aenderungen unerwartete Seiteneffekte auf Initialisierung, IDs, Event Listener, CSS-Spezifitaet, CSP, Storage und Mobile-Navigation haben. Das Manual schreibt deshalb chirurgische Aenderungen, eindeutige Anker, Vorkommenszaehlung, Baseline-Screenshots und vollstaendige Smoke-Tests vor.

Langfristig wird die Anwendung kontrolliert modularisiert. Die Modularisierung ist jedoch kein Selbstzweck und kein Big-Bang-Rewrite. Zuerst werden Datenvertraege und oeffentliche Schnittstellen stabilisiert. Danach koennen klar abgegrenzte Komponenten, Services, Tests, Netlify Functions und Assets aus der index.html herausgeloest werden. Zu jedem Zeitpunkt muss die produktive Anwendung lauffaehig und rueckrollbar bleiben.

| Saeule | Verbindlicher Zielzustand |
| --- | --- |
| Kontext | Kurze stabile Projektregeln; lange Spezifikationen nur aufgabenbezogen laden. |
| Sicherheit | Secrets, Nutzerdaten, main, Deployments und Migrationen besitzen klare Freigabegrenzen. |
| Aenderbarkeit | Kleine, nachvollziehbare Diffs statt unkontrollierter Komplettumschreibungen. |
| Verifikation | Tests und Screenshots bilden einen geschlossenen Feedback-Loop. |
| Git | Jede Phase hat Branch, atomare Commits, sauberen Status und Rueckrollweg. |
| Qualitaet | Funktion, UX, Mobile, Accessibility, Performance und Datenparitaet werden gemeinsam bewertet. |
| Dokumentation | ADRs, Change Log, Testevidenz und bekannte Grenzen bleiben im Repository nachvollziehbar. |

> *„Claude Code soll so viel Arbeit wie moeglich autonom erledigen, aber niemals mehr Risiko uebernehmen, als durch Tests, Git, Berechtigungen und klare Systemgrenzen kontrolliert werden kann.“*

## 2 Zielbetriebsmodell fuer Claude Code

```
NUTZER / MASTER PRD
        |
        v
TASK CONTRACT -> EXPLORE -> PLAN -> BASELINE -> IMPLEMENT
        |                                      |
        |                                      v
        |                               LOCAL VERIFICATION
        |                                      |
        v                                      v
  TRUE BLOCKER? <------ REVIEW / ADVERSARIAL CHECK
        |                                      |
      yes                                      no
        |                                      |
        v                                      v
 DECISION REQUEST                    COMMIT -> PUSH -> REPORT
```

Jeder Arbeitslauf beginnt mit einem Task Contract. Der Contract beschreibt Ziel, Scope, geschuetzte Bereiche, Abnahmekriterien, Verifikationsbefehle und erlaubte Git-Aktionen. Claude Code darf fehlende Details aus den verbindlichen PRD-Teilen und dem vorhandenen Code ableiten. Es darf jedoch keine fachliche Wahrheit erfinden, die in Spezifikation oder Datenmodell nicht definiert ist.

| Arbeitsstufe | Pflichtoutput |
| --- | --- |
| Explore | Betroffene Dateien, Datenfluesse, IDs, Keys, Risiken und bestehende Muster. |
| Plan | Aenderungsfolge, Schnittstellen, Tests, Rollback und offene Entscheidungen. |
| Baseline | Sauberer Git-Status, Sicherung, Screenshots, relevante Daten-/Schemawerte. |
| Implement | Kleine Diffs in definierter Reihenfolge; keine unverbundenen Nebenarbeiten. |
| Verify | Befehle, Ergebnisse, Screenshots, Konsole, Datenparitaet und Responsive-Test. |
| Review | Selbstreview plus unabhaengiger Review-Schritt bei mittlerem/hohem Risiko. |
| Commit | Atomarer Commit mit Scope, Zweck und Testnachweis. |
| Report | Was geaendert wurde, Evidenz, Risiken, offene Punkte, Branch und Commit. |

## 3 Vertrauensgrenzen und Autonomie

Claude Code arbeitet innerhalb eines abgestuften Vertrauensmodells. Lesezugriffe, lokale Analysen und reversible Codeaenderungen besitzen ein niedrigeres Risiko als Pushes, Deployments, Geheimnisverwaltung oder Datenmigrationen. Die Berechtigungen sollen so konfiguriert werden, dass haeufige sichere Aktionen nicht staendig bestaetigt werden muessen, waehrend kritische Aktionen bewusst sichtbar bleiben.

| Risikostufe | Beispiele | Autonomieregel |
| --- | --- | --- |
| R0 - Lesen | Dateien lesen, grep, git diff, Tests inventarisieren | Autonom erlaubt. |
| R1 - Reversibel lokal | CSS/JS bearbeiten, neue Tests, Dokumentation | Autonom nach Baseline und Plan. |
| R2 - Struktur | Moduldateien erzeugen, Adapter aendern, Build-/Netlify-Konfiguration | Autonom nur mit erweiterten Tests und ADR. |
| R3 - Daten/Integration | Migrationen, Provider, GeoJSON-Wechsel, Storage-Semantik | Implementierung vorbereitet; Aktivierung nur nach Freigabe oder klarer Spezifikation. |
| R4 - Produktiv/extern | Push auf main, Produktionsdeploy, Secret setzen, Kosten ausloesen | Nur nach ausdruecklichem Auftrag. |
| R5 - Irreversibel | History Rewrite, Datenloeschung, Force Push, Vertragsabschluss | Nicht autonom. Entscheidung und Backup zwingend. |

> **Berechtigungen sind kein Ersatz fuer Architektur:** Ein erlaubter Befehl ist nicht automatisch fachlich sinnvoll. Claude muss weiterhin Scope, Datenvertrag, Test und Rueckrollweg pruefen.

- Sichere, wiederholte Test- und Analysebefehle koennen allowlisted werden.
- Befehle wie rm -rf, git reset --hard, git push --force, Secret-Ausgabe und produktive Deploy-Befehle bleiben genehmigungspflichtig.
- Netzwerkzugriff auf unbekannte Domains, Downloads und Installationsskripte wird nicht pauschal freigegeben.
- Provider-Tokens und personenbezogene Testdaten duerfen nicht in Logs oder Chatantworten erscheinen.
- Checkpoints koennen helfen, ersetzen aber Git, Backups und Datenexports nicht.

## 4 Repository- und Dokumentationsstruktur

Die Repository-Struktur soll Claude Code eine klare, maschinenlesbare Orientierung bieten, ohne die gesamte Produktspezifikation bei jedem Start in den Kontext zu laden. Die langen PRD-Teile bleiben unter docs. Die kurze root CLAUDE.md enthaelt nur dauerhaft notwendige Regeln, Befehle und Warnungen.

```
/
├── index.html
├── CLAUDE.md
├── README.md
├── netlify.toml
├── docs/
│   ├── prd/
│   │   ├── 01-product-strategy.md
│   │   ├── 02-ux-design-bible.md
│   │   ├── 03-architecture-data-model.md
│   │   ├── 04-market-map-platform.md
│   │   └── 05-claude-code-development-manual.md
│   ├── adr/
│   ├── runbooks/
│   └── releases/
├── .claude/
│   ├── rules/
│   ├── skills/
│   ├── agents/
│   └── settings.json
├── tests/
├── scripts/
├── data/
└── netlify/functions/
```

| Pfad | Verantwortung |
| --- | --- |
| CLAUDE.md | Kurze universelle Projektregeln, Befehle, Invarianten und Workflow. |
| docs/prd | Ausfuehrliche normative Anforderungen; aufgabenbezogen referenzieren. |
| docs/adr | Konkrete Architekturentscheidungen mit Alternativen und Folgen. |
| docs/runbooks | Wiederholbare Betriebs-, Release-, Rollback- und Datenprozesse. |
| .claude/rules | Themenspezifische oder pfadbezogene Regeln. |
| .claude/skills | Wiederholbare Workflows wie UI-QA, Storage-Migration oder Release. |
| .claude/agents | Spezialisierte Review- und Investigationsagenten. |
| scripts | Deterministische Pruef- und Wartungsskripte. |
| tests | Automatisierte Smoke-, Integrations- und Datenvertragstests. |

## 5 CLAUDE.md-Strategie

CLAUDE.md ist der stabile Einstiegspunkt, nicht das vollstaendige Handbuch. Die Datei soll kurz, konkret und pruefbar bleiben. Lange Erklaerungen, historische Chroniken und komplette PRD-Inhalte gehoeren nicht hinein. Ein ueberladener Einstieg verbraucht Kontext und schwächt die Befolgung wichtiger Regeln.

| In CLAUDE.md aufnehmen | Nicht in CLAUDE.md aufnehmen |
| --- | --- |
| Start-, Test- und Renderbefehle | Vollstaendige API- oder Produktdokumentation |
| Geschuetzte Storage-Keys und Kern-IDs | Jede einzelne Datei und Funktion beschreiben |
| Branch-, Commit- und Pushregeln | Haeufig wechselnde Statusberichte |
| Keine Secrets / keine Fake-Marktdaten | Lange Tutorials und Begruendungen |
| Single-File-Sicherheitsregeln | Komplette 100-Seiten-PRDs importieren |
| Pflicht fuer Desktop-/Mobile-QA | Selbstverstaendlichkeiten ohne Projektbezug |

> **Zielgroesse:** Die root CLAUDE.md soll im Regelfall deutlich unter 200 Zeilen bleiben. Lange Spezialregeln werden in .claude/rules oder Skills ausgelagert und nur bei Bedarf geladen.

```
# Keim CRM Pro - Project Instructions

## Product invariants
- Preserve all productive kk_* storage keys and public module APIs.
- Never present mock values as live market data.
- Never put API secrets into index.html or committed files.

## Workflow
- Explore before editing. For multi-area changes, write a plan.
- Before large edits, record git status and create baseline screenshots.
- Run the documented smoke checks before every commit.
- Do not push to main or deploy production without explicit approval.

## Single-file safety
- Do not reformat or rewrite the complete index.html.
- Count target occurrences before scripted replacement.
- Re-read the edited region and inspect git diff after every batch.

## Documentation
- Read the relevant file under docs/prd/ for the task.
- Record architecture decisions in docs/adr/.
```

## 6 .claude/rules und kontextbezogene Regeln

Themen- und pfadbezogene Regeln verhindern, dass jede Sitzung mit allen Details belastet wird. Regeln werden nach stabilen Verantwortungsbereichen getrennt. Sie duerfen sich nicht widersprechen und muessen regelmaessig auf veraltete Dateipfade, Befehle oder Architekturannahmen geprueft werden.

| Regeldatei | Inhalt |
| --- | --- |
| .claude/rules/ui.md | Design Tokens, Komponentenvertraege, Responsive- und Screenshotpflichten. |
| .claude/rules/storage.md | Keys, Migrationen, Backup, Datenparitaet und Import/Export. |
| .claude/rules/market.md | Geodaten, Provider, Quellen, Aktualitaet, Datenschutz. |
| .claude/rules/security.md | XSS, CSP, Secrets, Netzwerk, personenbezogene Daten. |
| .claude/rules/netlify.md | Functions, Environment Variables, Previews, Deploy- und Rollbackregeln. |
| .claude/rules/tests.md | Testmatrix, Befehle, Evidenz und Stop-Gates. |

- Regeln enthalten konkrete Handlungen und Verbote statt allgemeiner Werte.
- Ein Pfadfilter wird nur verwendet, wenn die Regel wirklich auf bestimmte Dateien begrenzt ist.
- Doppelte Regeln werden zentralisiert; Abweichungen werden mit Vorrang dokumentiert.
- Nach groesseren Strukturveraenderungen wird die gesamte Regelhierarchie geprueft.
- Regeln duerfen keine Secrets, persoenlichen Notizen oder temporaeren Tokens enthalten.

## 7 Skills als wiederholbare Projektworkflows

Skills kapseln wiederholbare, mehrstufige Arbeitsablaeufe. Sie sind geeigneter als ein riesiges CLAUDE.md, wenn ein Prozess nur in bestimmten Situationen benoetigt wird. Skills sollen einen klaren Ausloeser, benoetigte Eingaben, Schritte, Stop-Bedingungen und Ausgaben definieren.

| Vorgesehener Skill | Zweck |
| --- | --- |
| /keim-ui-change | Baseline, Umsetzung, Desktop/Mobile-Screenshots und visuelles Review. |
| /keim-bugfix | Fehler reproduzieren, Root Cause, Regressionstest, Fix, Evidenz. |
| /keim-storage-migration | Schema-Inventar, Backup, idempotente Migration, Rollback und Importtest. |
| /keim-market-provider | Provider-Dossier, Servergrenze, Normalisierung, Cache, Lizenz und Fehlerzustaende. |
| /keim-release | Clean Tree, Testmatrix, Changelog, Preview, Freigabe und Tag. |
| /keim-audit | Code-, UX-, Security- oder Datenqualitaetsaudit ohne sofortige Grossaenderung. |

```
---
name: keim-bugfix
description: Reproduzierbarer Bugfix-Workflow fuer Keim CRM Pro
disable-model-invocation: true
---

1. Beschreibe Symptom, betroffenen Bereich und erwartetes Verhalten.
2. Reproduziere den Fehler und sichere Evidenz.
3. Ermittle Root Cause; keine Symptombekaempfung.
4. Erstelle einen fehlenden Regressionstest oder einen reproduzierbaren Smoke-Check.
5. Implementiere den kleinsten tragfaehigen Fix.
6. Fuehre Bereichstest und Gesamt-Smoke-Test aus.
7. Pruefe git diff, Console, Mobile und Datenparitaet.
8. Committe mit Typ fix und liefere Testevidenz.
```

## 8 Hooks als deterministische Schutzschicht

Anweisungen in Markdown sind kontextuelle Leitlinien. Aktionen, die ohne Ausnahme erfolgen oder blockiert werden muessen, werden als deterministische Hooks oder Repository-Skripte umgesetzt. Hooks werden sparsam eingesetzt, weil ein fehlerhafter Hook den gesamten Workflow blockieren oder unnoetig verlangsamen kann.

| Hook-Zeitpunkt | Geeignete Aufgabe | Nicht geeignet |
| --- | --- | --- |
| PreToolUse | Gefaehrliche Befehle, Secret-Dateien oder main-Push blockieren | Komplexe fachliche Codebewertung |
| PostToolUse | Nach Datei-Edit Format-/Syntaxcheck fuer betroffene Datei | Vollstaendige Browsermatrix nach jedem Zeichen |
| Stop | Pflicht-Smoke-Test vor Abschluss einer autonomen Phase | Endlose unklare Qualitaetsbewertung |
| SessionStart | Umgebung, Branch und benoetigte Tools anzeigen | Grosse PRD-Dateien vollstaendig laden |
| PreCommit-Skript | Storage-Invarianten, Syntax, verbotene Secrets, Teststatus | Produktfreigabe ersetzen |

> **Hook-Regel:** Ein Hook muss schnell, deterministisch, dokumentiert, lokal testbar und mit einer klaren Fehlermeldung ausgestattet sein.

- Jeder neue Hook erhaelt einen Testfall fuer Erfolg und Blockierung.
- Hook-Ausgaben nennen konkrete Abhilfe statt nur Exit 1.
- Netzwerkabhaengige Checks werden nicht als einziger Stop-Gate verwendet.
- Ein Notfall-Runbook beschreibt, wie ein defekter Hook sicher deaktiviert wird.
- Hook-Konfiguration wird wie Produktionscode reviewed und versioniert.

## 9 Subagents und unabhaengige Reviews

Subagents werden eingesetzt, um umfangreiche Recherche, spezialisierte Reviews oder gegnerische Verifikation aus dem Hauptkontext auszulagern. In der aktuellen Single-File-App sollen mehrere Agents nicht gleichzeitig dieselbe index.html beschreiben. Parallelitaet eignet sich zunaechst fuer Lesen, Inventarisieren, Testen und Reviewen; die finale Schreibverantwortung bleibt bei einem Agenten.

| Agent | Aufgabe | Werkzeuggrenze |
| --- | --- | --- |
| codebase-investigator | Findet relevante Module, IDs, Keys und Initialisierungsreihenfolge | Read, Grep, Glob; keine Writes. |
| ux-reviewer | Vergleicht Umsetzung mit Teil 2 und Screenshots | Read, Browser/Screenshot; keine Git-Aktionen. |
| security-reviewer | Prueft XSS, CSP, Secrets, Providergrenze und Datenlecks | Read, Grep, Tests; keine Deployments. |
| storage-reviewer | Prueft Keys, Migration, Backup, Import/Export und Referenzen | Read, Testdaten; keine produktiven Daten. |
| market-data-reviewer | Prueft Quelle, Periode, Lizenz, Qualitaet und Kennzeichnung | Read, erlaubte offizielle Quellen. |
| release-verifier | Fuehrt finale Checkliste aus und versucht Befunde zu widerlegen | Read, Test, Browser; keine Codeaenderung ausser explizit. |

- Ein Subagent bekommt eine enge Frage, klare Dateien und ein strukturiertes Ergebnisformat.
- Findings enthalten Beleg, Schweregrad, betroffene Stelle und empfohlene Aktion.
- Der Hauptagent uebernimmt Findings nicht blind, sondern verifiziert sie.
- Bei widerspruechlichen Reviews entscheidet die Produktspezifikation und eine dokumentierte technische Bewertung.
- Agenten mit Schreibzugriff erhalten getrennte Worktrees und nicht ueberlappende Dateiverantwortung.

## 10 Session- und Kontextmanagement

Kontext ist eine begrenzte Engineering-Ressource. Eine lange Sitzung mit wiederholten Fehlversuchen, grossen Logs und mehreren Themen fuehrt zu sinkender Praezision. Jede V31-Phase soll eine klar benannte Sitzung oder einen klaren Workstream besitzen. Unverbundene Aufgaben werden nicht in derselben Sitzung vermischt.

| Situation | Vorgehen |
| --- | --- |
| Neue Phase | Neue oder bereinigte Sitzung; relevante PRD-Teile gezielt referenzieren. |
| Umfangreiche Recherche | Subagent nutzen und nur kompaktes Ergebnis in Hauptkontext uebernehmen. |
| Zwei Korrekturschleifen ohne Fortschritt | Stoppen, Root Cause und Prompt neu formulieren; frische Sitzung erwägen. |
| Kontext nahe Grenze | Kompaktieren mit expliziter Erhaltung von Dateien, Tests, Entscheidungen und offenen Risiken. |
| Unverbundene Kurzfrage | Ausserhalb des Hauptworkstreams klaeren; Kontext nicht unnoetig aufblasen. |
| Mehrtaegige Arbeit | Sitzung benennen; zusaetzlich Statusdatei und Git-Commits pflegen. |

> **Status ist im Repository:** Wichtige Entscheidungen, offene Fehler und Testbefehle duerfen nicht nur in einer Chat-Sitzung existieren. Sie werden in Commit, ADR, Runbook oder Phasenbericht festgehalten.

## 11 Task Contract und Definition of Ready

Vor Beginn einer mittleren oder grossen Aenderung wird ein Task Contract erstellt. Er kann aus dem Nutzerauftrag und den PRD-Teilen abgeleitet werden. Wenn der Contract fachlich eindeutig ist, soll Claude Code nicht mit unnoetigen Rueckfragen blockieren. Rueckfragen sind auf echte Entscheidungsunsicherheit begrenzt.

| Feld | Pflichtinhalt |
| --- | --- |
| Ziel | Beobachtbarer Endzustand in Nutzersprache. |
| Scope | Module, Dateien, Daten und Oberflaechen, die geaendert werden duerfen. |
| Out of Scope | Bewusst nicht zu loesende Themen. |
| Invarianten | Keys, APIs, Daten, IDs, CSP, Lizenzen und UX-Regeln, die erhalten bleiben. |
| Akzeptanz | Konkrete Funktions-, UX-, Mobile- und Datenkriterien. |
| Verifikation | Befehle, Browserfaelle, Screenshots und Vergleichsdaten. |
| Git-Aktion | Branch, Commit, Push, PR oder nur lokaler Vorschlag. |
| Blocker | Welche Entscheidungen Claude nicht selbst treffen darf. |

- Der betroffene Bereich ist im aktuellen Code auffindbar.
- Die relevante Produktspezifikation wurde identifiziert.
- Ein Test- oder Beobachtungsweg existiert.
- Geschuetzte Daten und Schnittstellen sind bekannt.
- Bei externen Quellen sind Zugriff und Lizenz zumindest als offene Entscheidung markiert.
- Die Aenderung kann in eine begrenzte Phase zerlegt werden.

## 12 Explore - verbindliche Bestandsaufnahme

Claude Code darf bei groesseren Aufgaben nicht direkt aus der Zielbeschreibung in den Code springen. Die Explore-Phase stellt fest, wie der aktuelle Zustand tatsaechlich funktioniert. Besonders in der index.html koennen Namen und Kommentare einen veralteten Zustand beschreiben, waehrend spaetere CSS- oder Script-Schichten das reale Verhalten bestimmen.

1. Git-Status, aktueller Branch, letzter Commit und uncommitted Aenderungen pruefen.
2. Relevante IDs, Funktionen, Storage-Keys, Events, Styles und Bootstrap-Aufrufe suchen.
3. Alle Vorkommen potenziell zu ersetzender Anker zaehlen.
4. Initialisierungsreihenfolge und spaetere Ueberschreibungen nachvollziehen.
5. Bestehende oeffentliche APIs und Adapter identifizieren.
6. Abhaengige Module, Backup, Import/Export, Command Center und Navigation pruefen.
7. Bestehende Tests, Screenshots und bekannte Fehler inventarisieren.
8. Risiken und unbekannte Annahmen mit Evidenz dokumentieren.

| Explore-Output | Beispiel |
| --- | --- |
| Change Map | Dashboard KPI -> KK_NAV -> CRM filter -> contact renderer. |
| Protected List | kk_crm_contacts, kk_followups, #heute, #crm, KK_BOOT.start. |
| Overwrite Map | Basis-CSS wird durch v31-final-Schicht am Dateiende ueberschrieben. |
| Test Map | Dashboard click, filtered target, back navigation, mobile 390 px. |
| Risk Map | Doppelte Listener, alter Renderer, Storage-Fallback, CSP-Asset. |

## 13 Plan - technische und fachliche Umsetzungsplanung

Der Plan beschreibt nicht nur, welche Dateien editiert werden, sondern in welcher Reihenfolge Risiken reduziert werden. Zuerst werden Vertraege, Tests und Adapter stabilisiert; sichtbare Umstellung folgt erst danach. Ein Plan mit dem Satz „Dashboard neu bauen“ ist nicht ausreichend.

| Planbestandteil | Erwartung |
| --- | --- |
| Sequenz | Kleine Schritte, deren Zwischenzustaende lauffaehig sind. |
| Schnittstellen | Welche APIs erweitert, nicht dupliziert oder deprecated werden. |
| Daten | Reads, Writes, Migrationen, Defaults und Rollback. |
| UI | Zustaende, Responsive-Verhalten, Fokus und Deep Links. |
| Tests | Welche Checks vor und nach jedem Schritt laufen. |
| Risiko | Fehlermodi und konkrete Gegenmassnahmen. |
| Commitgrenzen | Welche Schritte atomar und separat rueckrollbar sind. |

> **Plan versus Umsetzung:** Ein Plan ist ein Werkzeug zur Risikoreduktion. Bei kleinen eindeutigen Fixes kann die Planphase kurz sein; Schutz- und Verifikationsregeln entfallen trotzdem nicht.

## 14 Baseline, Sicherung und Arbeitsbranch

Vor jeder strukturellen Aenderung wird ein reproduzierbarer Ausgangspunkt geschaffen. Der Arbeitsbaum muss verstanden werden. Fremde uncommitted Aenderungen werden nicht ueberschrieben oder stillschweigend in den eigenen Commit aufgenommen.

1. git status --short und git branch --show-current dokumentieren.
2. Uncommitted Aenderungen zuordnen; bei Unsicherheit stoppen statt verwerfen.
3. Letzten bekannten funktionierenden Commit notieren.
4. Fuer grosse Phasen einen klar benannten Branch erstellen.
5. Baseline-Screenshots und relevante Datenexports speichern.
6. Bei Datenmigration einen anonymisierten Testexport und einen Rollbackpfad erzeugen.
7. Erst danach Dateien bearbeiten.

| Branchart | Konvention | Regel |
| --- | --- | --- |
| V31 Phase | claude/v31-<phase>-<slug> | Eine fachlich zusammenhaengende Phase. |
| Bugfix | claude/fix-<kurzbeschreibung> | Reproduzierbarer Fehler und Regressionstest. |
| Spike | claude/spike-<thema> | Nicht direkt produktiv mergen; Ergebnis in ADR. |
| Dokumentation | docs/<thema> | Keine Produktlogik mischen. |
| Hotfix | hotfix/<thema> | Nur ausdruecklich freigegeben; minimaler Scope. |

- Kein Force Push auf main.
- Kein git reset --hard gegen unbekannte Aenderungen.
- Kein Loeschen von Branches vor bestaetigter Integration.
- Ein Claude-Checkpoint ist zusaetzlich, nicht anstelle eines Git-Commits.
- Der Branch startet vom vereinbarten Integrationsstand, nicht von einem zufaelligen alten Feature-Branch.

## 15 Single-File-Sicherheitsprotokoll fuer index.html

Die index.html ist aktuell eine grosse, geschichtete Produktionsdatei. Komplettes Neuformatieren, Minifizieren oder automatisches Umschreiben erzeugt unpruefbare Diffs und ist verboten. Aenderungen erfolgen mit stabilen Ankern und in kleinen Batches.

1. Zielbereich mit eindeutigen Kommentaren, IDs oder Funktionsnamen lokalisieren.
2. Vor Ersetzung die Anzahl der Treffer pruefen und erwartete Anzahl dokumentieren.
3. Den exakten Bereich vor und nach der Aenderung lesen.
4. Keine globale String-Ersetzung ohne Kollisionsanalyse.
5. Nach jedem Batch git diff --check und einen fokussierten Diff lesen.
6. HTML-, CSS- und Script-Reihenfolge beachten; spaetere Overrides identifizieren.
7. IDs, data-Attribute, globale Namen und Storage-Keys nicht spontan umbenennen.
8. Browser laden und Console sofort pruefen, bevor weitere Batches folgen.

> **Verbotene Schnellloesung:** Eine komplette 1,8-MB-Datei durch einen neu generierten Textblock zu ersetzen, nur weil die neue Datei visuell aehnlich aussieht, ist kein akzeptables Refactoring.

| Risiko | Pflichtkontrolle |
| --- | --- |
| Doppelte Funktion | Alle Definitionen und tatsaechlichen Call Sites suchen. |
| CSS-Spezifitaet | Berechneten Style und spaetere Regeln pruefen. |
| Doppelte ID | DOM-Audit und querySelector-Verhalten pruefen. |
| Listener mehrfach registriert | Bootstrap-Idempotenz und Event-Abmeldung pruefen. |
| CSP blockiert Asset | Browserkonsole und Network-Fehler pruefen. |
| Script parse error | Seite und alle nachfolgenden Module pruefen. |
| Storage-Schreibfehler | Export vorher/nachher und Reload pruefen. |

## 16 Kontrollierte Modularisierung

Die Aufteilung der Single-File-App ist ein langfristiges Architekturziel, aber kein pauschaler Rewrite. Zuerst werden stabile Grenzen geschaffen. Ein Modul darf erst extrahiert werden, wenn sein Datenvertrag, seine Initialisierung, seine oeffentliche API und seine Tests bekannt sind.

| Reihenfolge | Massnahme |
| --- | --- |
| 1 | Pure Hilfsfunktionen und Konstanten mit Tests isolieren. |
| 2 | Storage-, Navigations- und Event-Gateways stabilisieren. |
| 3 | Netlify Functions und Geodaten als separate Dateien verwalten. |
| 4 | Abgegrenzte UI-Komponenten hinter bestehender API extrahieren. |
| 5 | Legacy-Renderer nach Daten- und Funktionsparitaet deaktivieren. |
| 6 | Build- oder Bundling-Schritt nur mit dokumentiertem Nutzen einfuehren. |

- Jede Extraktion besitzt einen vorher/nachher Smoke-Test.
- Die App bleibt nach jedem Commit deploybar.
- Keine gleichzeitige Aenderung von Dateistruktur, Datenmodell und Design ohne zwingenden Grund.
- Globale APIs werden nicht entfernt, bevor alle Verbraucher migriert sind.
- Fallback und Rollback bleiben mindestens bis zur bestaetigten Releaseparitaet erhalten.

## 17 Implementierungsregeln fuer UI und Design

UI-Aenderungen werden gegen Teil 2 und konkrete Baseline-Screenshots umgesetzt. „Sieht besser aus“ ist kein Abnahmekriterium. Die Implementierung muss Hierarchie, Zustaende, Interaktion, Mobile, Tastatur und Datenrealitaet abdecken.

1. Ist-Screenshot und Zielbeschreibung sichern.
2. Vorhandene Design Tokens und Komponenten suchen.
3. Komponente in Normal-, Leer-, Lade-, Fehler- und Offlinezustand definieren.
4. Desktop und 390-Pixel-Mobile gleichzeitig planen.
5. Interaktive Elemente mit Fokus, Tastatur und Touch testen.
6. Datenbindung und Deep-Link-Verhalten pruefen.
7. Nach Umsetzung neue Screenshots erzeugen und sichtbar vergleichen.
8. Abweichungen nicht nur beschreiben, sondern korrigieren.

| UI-Aenderung | Zusatzpruefung |
| --- | --- |
| Dashboard KPI | Klickziel, Filterchip, Browser-Zurueck, leerer Zielzustand. |
| Call Hero | Telefonlink, Abschluss, Aktivitaetslog, naechster Anruf. |
| Tabelle | Responsive Card/Row, Sortierung, Keyboard und lange Inhalte. |
| Dialog/Drawer | Fokusfang, Escape, Hintergrund, Mobile Bottom Sheet. |
| Karte | Resize, Gesten, Auswahl, Legende, Offline und Datenschutz. |
| Navigation | Aktiver Zustand, Hash, Deep Link, Back/Forward und Mobile Safe Area. |

## 18 Implementierungsregeln fuer Businesslogik

Businesslogik wird nicht in Event Handlern, Renderfunktionen oder verstreuten Inline-Skripten dupliziert. Neue Regeln werden als pure oder klar gekapselte Funktionen implementiert und ueber bestehende Services oder Gateways aufgerufen.

- Ein fachlicher Status besitzt eine kanonische Definition.
- Ableitungen werden nicht mehrfach persistent gespeichert, wenn sie sicher berechnet werden koennen.
- Datumslogik verwendet eine einheitliche lokale Zeitzonenregel.
- Ueberfaelligkeit, Stagnation und Dringlichkeit werden transparent berechnet.
- Automatische Priorisierung darf keine erfundenen Scores erzeugen.
- Ein Write aktualisiert alle benoetigten abhaengigen Ansichten ueber definierte Events oder Refresh-Vertraege.
- Fehler in einer Nebenansicht duerfen den zentralen Speichervorgang nicht stillschweigend halb ausfuehren.

| Fachoperation | Erwartete Konsistenz |
| --- | --- |
| Anruf erledigen | Call Log, Kontaktaktivitaet, Queue und Dashboard aktualisieren. |
| Follow-up erledigen | Status, Aktivitaet, optionaler Nachfolger und KPI aktualisieren. |
| Kontakt bearbeiten | CRM, Suche, Karte, Pipeline-Referenzen und Backup bleiben konsistent. |
| Deal verschieben | Phase, Zeitstempel, Stagnation, KPI und Aktivitaet aktualisieren. |
| Gebiet zuweisen | Kontakt/Objekt, Marktfilter und Kartenlayer synchronisieren. |

## 19 Datenmigration und Storage-Schutz

Migrationen sind Hochrisikoaenderungen. Sie muessen idempotent, versioniert, testbar und rueckrollbar sein. Ein Fallback-Read fuer alte Datensaetze ist vorzuziehen, bevor produktive Daten massenhaft umgeschrieben werden.

1. Betroffene Keys und reale Schemaformen inventarisieren.
2. Backup-/Exportfunktion vor Migration testen.
3. Kanonisches Zielschema und Defaultregeln dokumentieren.
4. Migration an anonymisierten Varianten testen: leer, minimal, voll, fehlerhaft, Legacy.
5. Migration mit Versionsmarker und Idempotenz implementieren.
6. Bei Fehler keine teilweise Loeschung; urspruengliche Daten erhalten.
7. Import eines alten Backups in die neue Version testen.
8. Rollback oder kompatiblen Reader dokumentieren.

> **Keine stille Datenbereinigung:** Unbekannte Felder werden nicht geloescht, nur weil die neue UI sie nicht verwendet. Deprecation und spaetere Entfernung benoetigen eine eigene Entscheidung.

| Migrationsgate | Beleg |
| --- | --- |
| Kein Datenverlust | Vorher-/Nachher-Feldzaehlung und Stichprobe. |
| Idempotent | Zweimalige Ausfuehrung liefert denselben Zustand. |
| Legacy-Import | Altes Backup wird korrekt geladen. |
| Neues Backup | Export nach Migration ist vollstaendig und erneut importierbar. |
| Fehlerfall | Defekter Datensatz blockiert nicht alle gueltigen Datensaetze. |

## 20 Externe Provider, Secrets und Netlify Functions

Externe Markt-, Karten- oder Statistikprovider werden hinter einer serverseitigen Grenze integriert. Claude Code darf Adapter, Functions, Tests und Konfigurationsvorlagen erstellen. Echte Secrets werden weder erfunden noch in Repository, Screenshot oder Log geschrieben.

1. Provider-Dossier mit Zweck, Quelle, Lizenz, Kosten, Limits und Datenfrequenz erstellen.
2. Frontendvertrag und normalisiertes Schema definieren.
3. Netlify Function mit Eingabevalidierung, Timeout und Fehlerbehandlung implementieren.
4. Secret nur als Environment-Variable referenzieren.
5. Antwort normalisieren und Quellmetadaten erhalten.
6. Cache und letzten validen Snapshot implementieren.
7. Fehler-, Stale- und Offlinezustand im Frontend testen.
8. Produktive Aktivierung erst nach Zugangsdaten- und Lizenzfreigabe.

| DARF | DARF NICHT |
| --- | --- |
| Beispiel-.env mit Platzhaltern dokumentieren | Echten API-Key committen oder im HTML einbetten |
| Mock-Provider klar als Test markieren | Mockwerte als aktuelle Marktdaten anzeigen |
| Serverantwort gegen Schema validieren | Providerantwort ungeprueft rendern |
| Request-Limits und Cache beachten | Portal-Scraping gegen Nutzungsbedingungen |
| Deploy Preview mit Testumgebung nutzen | Kostenpflichtigen Plan eigenmaechtig aktivieren |

## 21 Karten- und Geodatenentwicklung

Aenderungen am Marktmonitor folgen zusaetzlich Teil 4. Geometrie, Basiskarte, Marktkennzahlen und CRM-Layer bleiben getrennte Datenquellen. Claude Code darf keine approximierten Polygone als amtliche Grenzen deklarieren und keine personenbezogenen exakten Marker in einer oeffentlichen App freigeben.

| Aenderung | Pflichtpruefung |
| --- | --- |
| Engine/Adapter | ADR, Mobile-Gesten, CSP, Resize, Fallback und Performance. |
| GeoJSON | Quelle, Lizenz, Gebietsschluessel, Geometrievaliditaet und Dateigroesse. |
| Kennzahl-Layer | Einheit, Periode, Quelle, Missing-Werte, Legende und Farbskala. |
| CRM-Layer | Aggregation, Datenschutz, Filterparitaet und leere Gebiete. |
| Tooltip/Sheet | Tap, Keyboard-Alternative, Quelle und konkrete Aktion. |
| Refresh | Snapshot, Stale-Kennzeichnung, Teilfehler und Offline-Rueckkehr. |

> **Keine optische Wahrheit:** Eine schoene Heatmap ist fachlich falsch, wenn Klassengrenzen, fehlende Werte oder Perioden nicht transparent sind.

## 22 Teststrategie und Verifikationspyramide

Claude Code erhaelt fuer jeden Auftrag eine Verifikation, die es selbst ausfuehren kann. Die Teststrategie kombiniert schnelle deterministische Checks mit Browser-Smoke-Tests und visueller Pruefung. Manuelle Behauptungen ersetzen keine Testevidenz.

| Ebene | Beispiele | Frequenz |
| --- | --- | --- |
| L0 Static | git diff --check, Secret-Scan, verbotene Keys, Dateisyntax | Nach jedem Aenderungsbatch. |
| L1 Pure Logic | Datum, Filter, Migration, Normalizer, Klassifizierung | Bei jeder Logikaenderung. |
| L2 Integration | Storage + Service + Renderer, Deep Link, Import/Export | Vor Commit der Phase. |
| L3 Browser Smoke | Alle Haupttabs, Console, zentrale Aktionen, Reload | Vor jedem Phase-Commit. |
| L4 Visual | Desktop 1440, Mobile 390, relevante Zustaende | Bei jeder UI-Phase. |
| L5 Release | Gesamtmatrix, Preview, Backup-Restore, Offline, Performance | Vor Integration/Release. |

- Ein fehlender Test wird nicht durch die Aussage „manuell geprueft“ verdeckt.
- Bei fehlendem Testframework wird ein minimaler reproduzierbarer Script- oder Browsercheck erstellt.
- Tests verwenden anonymisierte Fixtures und veraendern keine echten Nutzerdaten.
- Flaky Tests werden nicht ignoriert; Ursache oder klare Quarantaene dokumentieren.
- Ein Test darf nicht nur den neuen Code pruefen, sondern muss den Nutzerworkflow abdecken.

## 23 Browser-Smoke-Test fuer die aktuelle App

Der Standard-Smoke-Test wird auf einer HTTP-/Netlify-Umgebung ausgefuehrt, nicht ausschliesslich ueber file://. Er prueft die App-Shell, alle primaeren Tabs, Console, zentrale Speicheroperationen und Responsive-Verhalten.

1. Seite laden; keine ungeklärten Console Errors oder blockierten Pflichtressourcen.
2. Heute oeffnen; Call Hero, Queue und KPI-Zahlen rendern.
3. KPI Offene Leads anklicken; CRM mit sichtbarem Filter oeffnet.
4. Follow-ups faellig anklicken; faellige/ueberfaellige Liste sortiert.
5. Pipeline oeffnen; Board/Liste und Detailaktion funktionieren.
6. Marktmonitor oeffnen; Karte resized, Layer und Gebietsauswahl funktionieren.
7. Tippgeber, KPIs, Wissen/Archiv und Backup erreichen.
8. Kontakt oder Testdatensatz anlegen/bearbeiten und nach Reload wiederfinden.
9. Export erzeugen; Import in Testkontext pruefen.
10. Mobile 390 px: keine Body-Ueberbreite, Navigation, Dialoge und Karte bedienbar.

| Resultat | Bedeutung |
| --- | --- |
| PASS | Alle Pflichtfaelle erfuellt; keine kritischen Befunde. |
| PASS WITH NOTES | Keine Regression, aber dokumentierte nichtkritische Einschraenkung. |
| FAIL | Funktion, Daten, Console, Mobile oder Sicherheit verletzt; kein Commit als fertig. |
| BLOCKED | Umgebung oder Zugang fehlt; Blocker und lokaler Ersatztest dokumentiert. |

## 24 Visuelle Regression und Screenshotprotokoll

Sichtbare Aenderungen benoetigen reproduzierbare Vorher-/Nachher-Screenshots. Claude Code soll nicht nur ein Bild erzeugen, sondern die Abweichungen gegen die Spezifikation analysieren. Screenshots werden mit gleicher Viewportgroesse, gleichem Datenzustand und gleicher Scrollposition erstellt.

| Viewport | Pflicht |
| --- | --- |
| 1440 x 1000 | Desktop-Hierarchie, Sidebar/Topbar, Tabellen, Karte. |
| 1280 x 800 | Typischer Laptop, Dichte und Umbruch. |
| 768 x 1024 | Tablet/Intermediate Layout. |
| 430 x 932 | Grosses iPhone. |
| 390 x 844 | Primaerer Mobile-Abnahmewert. |
| 375 x 812 | Enger Mobile-Fall. |

- Kritische Zustaende separat aufnehmen: leer, ueberfaellig, Fehler, Offline, Dialog offen.
- Keine echten persoenlichen Daten in Screenshots fuer Dokumentation oder PR.
- Visuelle Differenzen nach Prioritaet bewerten: Blocker, major, minor, bewusst.
- Nicht durch CSS-Tricks einzelne Screenshots reparieren und andere Viewports brechen.
- Nach finaler Korrektur neue Screenshots erzeugen; alte Zwischenbilder gelten nicht als Evidenz.

## 25 Accessibility-Verifikation

Accessibility ist Bestandteil der technischen Abnahme. Claude Code prueft nicht nur Farbkontrast, sondern Fokusfluss, semantische Struktur, Tastaturbedienung, Labels, Dialoge, Statusmeldungen und Alternativen fuer visuelle Karteninformationen.

| Bereich | Pflichtcheck |
| --- | --- |
| Navigation | Tab-Reihenfolge, aktiver Zustand, Skip-/Landmark-Struktur. |
| Formular | Label, Fehlerbezug, Pflichtstatus, Eingabetyp und Speichern. |
| Dialog/Drawer | Fokus setzen, Fokus halten, Escape, Fokus zurueckgeben. |
| KPI Card | Als Link/Button semantisch bedienbar; Zweck im Namen. |
| Statusfarbe | Text/Symbol zusaetzlich zur Farbe. |
| Toast/Fehler | Angemessene Live-Region, nicht nur visuell. |
| Karte | Gebietsliste oder andere nichtkartografische Alternative. |
| Animation | prefers-reduced-motion respektieren. |

> **Keine spaete Nachruestung:** Eine Komponente, deren Interaktionsmodell nur mit der Maus funktioniert, ist nicht fertig und wird nicht erst in einer spaeteren QA-Runde „barrierefrei gemacht“.

## 26 Performance- und Stabilitaetsregeln

Die Anwendung muss trotz wachsender Funktionen schnell starten und auf dem iPhone fluessig bleiben. Claude Code soll Performanceprobleme messen, nicht durch subjektive Wahrnehmung bewerten.

- Keine mehrfachen Bootstrap- oder Renderaufrufe ohne Idempotenz.
- Karte, Charts und schwere Module erst initialisieren, wenn ihr Tab sichtbar ist.
- Resize- und Scroll-Handler drosseln und bei Modulabbau entfernen.
- Grosse Listen paginieren, virtualisieren oder begrenzen, wenn reale Datenmenge es erfordert.
- GeoJSON vereinfachen und Marker clustern, ohne fachliche Grenzen unzulässig zu verfälschen.
- Externe Libraries nicht mehrfach laden.
- Keine langen synchronen Schleifen im Startpfad.
- Fehlerfallback darf nicht gleichzeitig mit der regulaeren Library rendern.

| Messpunkt | Mindestnachweis |
| --- | --- |
| Start | Keine langen blockierenden Fehler; Hauptshell zeitnah sichtbar. |
| Tabwechsel | Kein mehrfacher Listener-/Chart-/Map-Aufbau. |
| Mobile Scroll | Keine ruckelnden Sticky-Schichten oder Layoutschleifen. |
| Speicher | Wiederholter Tabwechsel erzeugt keinen offensichtlichen Ressourcenanstieg. |
| Netzfehler | Timeout und Fallback; UI bleibt bedienbar. |
| Datenmenge | Test mit groesserer anonymisierter Fixture. |

## 27 Security-Engineering-Workflow

Jede Phase mit Nutzereingaben, externen Daten, Functions oder HTML-Rendering erhaelt einen Security-Review. Das aktuelle Projekt hat bereits Self-XSS-Haertung; neue Renderer duerfen diese nicht umgehen.

1. Alle neuen Eingabepfade und externen Datenquellen identifizieren.
2. HTML-Sinks wie innerHTML, insertAdjacentHTML und Template-Strings pruefen.
3. Zentrale Escape-/DOM-Builder verwenden.
4. URL-, Telefonnummer-, E-Mail- und Dateifelder typgerecht validieren.
5. CSP-Aenderungen minimal halten und begruenden.
6. Keine Secrets, Tokens oder private Daten in Clientcode, Logs oder Screenshots.
7. Netlify Functions gegen ungueltige Parameter und Providerfehler absichern.
8. Security-Subagent oder unabhaengiges Review bei mittlerem/hohem Risiko ausfuehren.

| Befund | Releasewirkung |
| --- | --- |
| Secret im Repo | Sofort blockieren; Secret rotieren und Historie fachgerecht bereinigen. |
| Unescaped HTML aus Nutzerwert | Blocker. |
| CSP komplett gelockert | Blocker ohne explizites Security-ADR. |
| Private Adresse in oeffentlichem Layer | Blocker. |
| Fehlende Eingabevalidierung in Function | Major; vor Aktivierung beheben. |
| Nichtkritische Header-/Hardening-Luecke | Dokumentiert priorisieren; je nach Exposure Gate. |

## 28 Git-Commit-Standard

Commits sind technische Rueckroll- und Revieweinheiten. Ein Commit soll genau eine nachvollziehbare Absicht enthalten und einen lauffaehigen Zustand hinterlassen. Generische Nachrichten wie „updates“ oder „final“ sind verboten.

```
<type>(<scope>): <praezise Aenderung>

Warum:
- fachlicher oder technischer Grund

Geaendert:
- wichtigste Vertraege / Oberflaechen

Verifiziert:
- konkrete Tests und Viewports

Risiko / Migration:
- falls relevant
```

| Typ | Verwendung |
| --- | --- |
| feat | Neue nutzbare Funktion. |
| fix | Reproduzierbarer Fehler behoben. |
| refactor | Struktur ohne beabsichtigte Funktionsaenderung. |
| style | Reine visuelle/formatierende Aenderung ohne Logik. |
| test | Tests oder Fixtures. |
| docs | Dokumentation und ADR. |
| chore | Werkzeuge, Konfiguration, nichtproduktive Wartung. |
| perf | Messbare Performanceverbesserung. |
| security | Gezielte Sicherheitskorrektur. |

- Keine fremden uncommitted Aenderungen in den Commit aufnehmen.
- Vor Commit git diff --staged vollstaendig pruefen.
- Commitnachricht nennt nicht „von Claude“ als Ersatz fuer Inhalt.
- Breaking Changes werden klar markiert und benoetigen Migration/Releaseentscheidung.
- Testnachweis gehoert in Commitbody oder Phasenbericht.

## 29 Push-, Pull-Request- und Integrationsregeln

Ein Push auf einen Arbeitsbranch ist erlaubt, wenn der Nutzer dies im Auftrag vorgesehen hat und alle Phasengates bestanden sind. Ein Push auf main, Merge oder Produktionsdeploy benoetigt eine ausdrueckliche Freigabe. Pull Requests werden erstellt, wenn Review, Deploy Preview oder nachvollziehbare Integration gewuenscht ist.

| Aktion | Standardregel |
| --- | --- |
| Push Arbeitsbranch | Nach sauberem Commit und bestandenen Tests. |
| PR oeffnen | Nur wenn beauftragt oder als festgelegter Integrationsweg. |
| Direkt auf main | Nicht fuer V31-Featurearbeit; nur ausdruecklicher kleiner Ausnahmeauftrag. |
| Merge | Nach Review, Preview und Release-Gate. |
| Force Push | Auf main verboten; auf persoenlichem Branch nur nach klarer Begruendung. |
| Branch loeschen | Erst nach bestaetigter Integration und Rueckrollsicherung. |

- Vor Push Remote-Branch und Ziel pruefen.
- Nach Push Commit-ID und Remote-Status melden.
- PR-Beschreibung enthaelt Zweck, Screenshots, Tests, Migrationen, Risiken und Rollback.
- Automatischer Deploy Preview wird als Testumgebung verwendet, nicht als Produktionsfreigabe.
- Konflikte werden inhaltlich geloest; keine blinde „ours/theirs“-Uebernahme.

## 30 Netlify-Deploy-Workflow

Netlify bildet die Auslieferungs- und serverseitige Integrationsplattform. Der Produktionsbranch und das Publish-Verzeichnis muessen eindeutig dokumentiert sein. Branch- oder Pull-Request-Previews dienen zur visuellen und funktionalen Abnahme vor Produktion.

1. Build-/Publish-Konfiguration und Produktionsbranch pruefen.
2. Branch pushen und Deploy-Status beobachten.
3. Preview-URL mit Testdaten oeffnen.
4. Console, Network, Functions, CSP und zentrale Workflows pruefen.
5. Keine Environment-Variable oder Secret-Werte in Logs kopieren.
6. Bei Function-Aenderungen Fehler-, Timeout- und Stale-Fall testen.
7. Erst nach Freigabe in Produktionsbranch integrieren.
8. Nach Produktion Smoke-Test und Rollbackbereitschaft bestaetigen.

| Deployzustand | Aktion |
| --- | --- |
| Build failed | Log analysieren, Root Cause lokal reproduzieren, Fix auf Branch. |
| Published, 404 | Publish directory, index.html und Branchkonfiguration pruefen. |
| CSP/Asset blocked | Quelle und Policy minimal korrigieren; keine pauschale Oeffnung. |
| Function 5xx | Provider/Validation/Secret/Timeout getrennt diagnostizieren. |
| UI Regression | Deploy nicht promoten; Branch fixen oder vorherigen Deploy wiederherstellen. |
| Datenprovider down | Letzten validen Snapshot und sichtbaren Status pruefen. |

## 31 Reviewprotokoll vor Phasenabschluss

Der Agent, der implementiert hat, fuehrt zuerst ein strukturiertes Selbstreview durch. Bei mittlerem oder hohem Risiko folgt ein frischer Subagent oder eine separate Sitzung als gegnerischer Reviewer. Review bedeutet, aktiv nach Gruenden zu suchen, warum die Aenderung falsch oder unvollstaendig sein koennte.

| Reviewfrage | Evidenz |
| --- | --- |
| Loest der Diff das richtige Problem? | Task Contract gegen tatsaechlichen Diff. |
| Wurde bestehende Architektur genutzt? | Keine Parallel-APIs/Stores/Renderer. |
| Sind Daten sicher? | Key-/Migration-/Backup-Test. |
| Ist UI vollstaendig? | Zustaende, Screenshots, Mobile, Fokus. |
| Sind Fehler sichtbar und recoverable? | Fehler- und Offline-Test. |
| Ist Code wartbar? | Klare Verantwortung, Kommentare nur wo noetig, keine toten Pfade. |
| Ist Release rueckrollbar? | Atomarer Commit, keine irreversible Nebenwirkung. |

- Kritische Findings werden vor Commit behoben.
- Bewusst akzeptierte Abweichungen werden mit Owner und Folgeaktion dokumentiert.
- Review darf nicht nur eine Zusammenfassung des eigenen Plans sein.
- Grosse Diffs werden abschnittsweise gelesen.
- Ein gruener Test ersetzt nicht das visuelle und fachliche Review.

## 32 Fehlerbehebung und Root-Cause-Workflow

Bugfixes beginnen mit einer reproduzierbaren Beschreibung. Claude Code soll den Fehler nicht durch Verbergen einer Meldung, Deaktivieren einer Validierung oder pauschales try/catch „reparieren“. Die Ursache wird auf Daten-, Lifecycle-, Rendering-, Netzwerk- oder Architekturlevel eingegrenzt.

1. Symptom, Umgebung, Schritte und erwartetes Verhalten erfassen.
2. Fehler reproduzieren und Console/Log/Screenshot sichern.
3. Letzten bekannten funktionierenden Zustand oder relevanten Commit suchen.
4. Hypothesen bilden und einzeln testen.
5. Fehlenden Regressionstest erstellen.
6. Kleinsten nachhaltigen Fix implementieren.
7. Nahegelegene Edge Cases testen.
8. Gesamt-Smoke-Test ausfuehren und Root Cause dokumentieren.

| Anti-Fix | Warum verboten |
| --- | --- |
| Fehler schlucken | UI erscheint ruhig, Daten oder Logik bleiben falsch. |
| Timeout nur erhoehen | Verbirgt Provider-/Lifecycleproblem. |
| CSS !important stapeln | Erhoeht historische Spezifitaetslast. |
| Doppelte Funktion neu anhaengen | Alte Aufrufer und Reihenfolge bleiben unklar. |
| Storage leeren | Zerstoert Nutzerdaten statt Migration zu loesen. |
| Test deaktivieren | Entfernt Evidenz statt Fehler. |

## 33 Refactoring-Workflow

Refactoring aendert Struktur bei beabsichtigter Funktionsgleichheit. Vor dem Refactoring wird das aktuelle Verhalten durch Tests oder Characterization Checks festgehalten. Design- oder Featureaenderungen werden nicht unkontrolliert im selben Commit versteckt.

- Verhalten vorab dokumentieren und wenn moeglich automatisieren.
- Kleine Extraktionen statt kompletter Neuschreibung.
- Oeffentliche APIs und Storage-Vertraege beibehalten oder adaptergestuetzt migrieren.
- Nach jedem Schritt lauffaehigen Zustand bewahren.
- Toten Code erst entfernen, wenn keine Call Sites, Datenpfade oder Legacy-Imports mehr existieren.
- Performance und Dateigroesse vor/nachher messen, wenn dies Refactoringmotiv ist.
- Refactor-Commit nicht mit umfangreichem Redesign vermischen.

> **Refactoring-Gate:** Wenn nicht sicher nachweisbar ist, dass das Verhalten erhalten blieb, ist die Aenderung fachlich ein Feature oder eine Migration und benoetigt entsprechend strengere Abnahme.

## 34 Incident-, Rollback- und Wiederherstellungsprozess

Bei Produktionsregression, Datenverlustgefahr oder Sicherheitsbefund gilt Stabilisierung vor Weiterentwicklung. Claude Code sammelt Evidenz, reduziert weitere Aenderungen und stellt einen sicheren bekannten Zustand her.

1. Incident-Zeitpunkt, betroffene Version und Symptome dokumentieren.
2. Weitere automatische Deployments oder Schreiboperationen stoppen.
3. Betroffenen Commit/Deploy und Datenpfad identifizieren.
4. Wenn moeglich letzten funktionierenden Deploy wiederherstellen.
5. Daten nicht ueberschreiben; Backups und Browserzustand sichern.
6. Root Cause in separatem Branch untersuchen.
7. Hotfix minimal halten und vollstaendig testen.
8. Postmortem mit Ursache, Wirkung, Entdeckung und Praevention erstellen.

| Incidenttyp | Erste Massnahme |
| --- | --- |
| 404/Deployment | Letzten funktionierenden Deploy pruefen; Publish-/Branchkonfiguration. |
| JavaScript-Parsefehler | Rollback; fehlerhaften Script-Bereich isolieren. |
| Storage-Korruption | Schreibpfad stoppen; Export sichern; Migration analysieren. |
| Secret-Leak | Secret rotieren; Exposure und Historie bereinigen. |
| Falsche Marktdaten | Layer deaktivieren/kennzeichnen; Quelle und Snapshot sperren. |
| Mobile unbedienbar | Vorherigen Deploy nutzen oder gezielten CSS-Hotfix. |

## 35 Release-Management und Versionierung

Ein Release ist mehr als ein Push. Es ist ein benannter, getesteter und dokumentierter Produktzustand. V31 kann aus mehreren internen Phasen bestehen; ein oeffentliches Release wird erst nach Gesamtintegration und End-to-End-Abnahme erstellt.

| Artefakt | Pflichtinhalt |
| --- | --- |
| Release Notes | Nutzerrelevante Aenderungen, keine reine Commitliste. |
| Technical Notes | Migrationen, neue Keys, Functions, Konfiguration, ADRs. |
| Test Report | Matrix, Viewports, Browser, bekannte Ausnahmen. |
| Screenshots | Wichtige Vorher-/Nachher- und Zielzustaende. |
| Rollback | Vorheriger Commit/Deploy und Datenhinweise. |
| Known Issues | Offene, bewertete Grenzen mit Folgeversion. |
| Version Marker | App-Metadaten und Dokumentation konsistent. |

- Releasekandidat aus sauberem Integrationsstand erstellen.
- Keine neuen Features waehrend finaler Release-QA.
- Produktionsdaten nicht als Testfixture verwenden.
- Nach Deploy einen kurzen Produktions-Smoke-Test ausfuehren.
- Release erst als fertig melden, wenn URL, Commit und Teststatus benannt sind.

## 36 Abschluss- und Uebergabebericht

Jede groessere Phase endet mit einem standardisierten Bericht. Der Bericht muss auch fuer eine spaetere Sitzung ohne Chatverlauf verstaendlich sein.

```
# Phasenbericht

## Ziel und Ergebnis
- ...

## Geaenderte Dateien und Vertraege
- ...

## Daten / Migrationen
- neue Keys: ...
- geaenderte Schemas: ...
- Backup-/Importtest: ...

## Verifikation
- Befehle: ...
- Browserfaelle: ...
- Viewports: ...
- Screenshots: ...

## Git / Deployment
- Branch: ...
- Commit: ...
- Preview: ...

## Bekannte Grenzen und Risiken
- ...

## Naechster sinnvoller Schritt
- ...
```

> **Keine Erfolgspoesie:** Formulierungen wie „alles perfekt“, „vollstaendig enterprise-ready“ oder „ohne Fehler“ sind nur zulaessig, wenn der definierte Umfang und die Evidenz dies konkret tragen. Bekannte Grenzen werden offen genannt.

## 37 Projektweite Pflichtartefakte

| Artefakt | Zeitpunkt | Owner |
| --- | --- | --- |
| CLAUDE.md | Vor erster grosser V31-Phase; danach gepflegt | Engineering |
| Storage Registry | Vor Daten-/CRM-Refactoring | Architecture/Data |
| Navigation Contract | Vor Dashboard-Deep-Links | Frontend Architecture |
| Design Tokens | Vor globalem Redesign | UX/Frontend |
| Map Engine ADR | Vor Enginewechsel | GIS/Architecture |
| Provider Dossier | Vor externer Datenquelle | Data/Legal/Product |
| Smoke Test Script | Frueh in V31 | QA/Engineering |
| Release Runbook | Vor erstem V31-Release | Engineering/Operations |
| Rollback Runbook | Vor Datenmigration oder Provideraktivierung | Engineering/Operations |
| Known-Issues-Register | Kontinuierlich | Product/QA |

## 38 Vorgeschlagene .claude-Konfiguration fuer Keim CRM Pro

Die folgende Konfiguration ist ein Zielbild und wird schrittweise eingefuehrt. Sie wird nicht ungeprueft kopiert. Jeder Hook und jede Permission wird lokal getestet und an die tatsaechlich verfuegbaren Befehle angepasst.

```
.claude/
├── settings.json
├── rules/
│   ├── ui.md
│   ├── storage.md
│   ├── market.md
│   ├── security.md
│   ├── tests.md
│   └── netlify.md
├── skills/
│   ├── keim-ui-change/SKILL.md
│   ├── keim-bugfix/SKILL.md
│   ├── keim-storage-migration/SKILL.md
│   ├── keim-market-provider/SKILL.md
│   └── keim-release/SKILL.md
└── agents/
    ├── codebase-investigator.md
    ├── ux-reviewer.md
    ├── security-reviewer.md
    ├── storage-reviewer.md
    └── release-verifier.md
```

- Keine automatische Agentenvermehrung fuer kleine Aufgaben.
- Keine parallelen Writes an index.html.
- Skills mit Seiteneffekten werden manuell ausgeloest.
- Review-Agenten erhalten standardmaessig keinen Schreib- oder Deployzugriff.
- Die Konfiguration wird in einem eigenen chore-Commit eingefuehrt.

## 39 Startprompt fuer eine V31-Phase

```
Arbeite im aktuell verbundenen Keim-CRM-Repository.

Lies zuerst:
- CLAUDE.md
- die fuer den Auftrag relevanten Teile unter docs/prd/
- bestehende ADRs fuer den betroffenen Bereich

Auftrag: [konkretes Ziel]

Verbindliche Arbeitsweise:
1. Inventarisiere den Ist-Zustand und die geschuetzten Vertraege.
2. Erstelle einen kurzen Task Contract und einen phasenweisen Plan.
3. Sichere Git-Status, Baseline-Screenshots und relevante Datenfixtures.
4. Implementiere direkt weiter; halte nur bei einem echten Blocker an.
5. Erzeuge keine parallelen Stores, Renderer oder Kartenengines.
6. Bewahre alle produktiven kk_* Keys und bestehenden Nutzerdaten.
7. Fuehre die im Manual vorgeschriebenen Tests und Screenshots aus.
8. Nutze bei mittlerem/hohem Risiko einen unabhaengigen Review-Agenten.
9. Committe atomar auf einen eigenen Branch. Kein Push auf main und kein Produktionsdeploy ohne ausdrueckliche Freigabe.
10. Liefere den standardisierten Phasenbericht mit Evidenz.

Akzeptanzkriterien:
- [Kriterium 1]
- [Kriterium 2]
- [Mobile/Accessibility]
- [Daten/Backup]

Beginne jetzt mit Explore und arbeite anschliessend autonom bis zum bestandenen Phasengate.
```

Der Startprompt ergaenzt dieses Manual, ersetzt es aber nicht. Fuer konkrete Aufgaben werden Dateien, Akzeptanzkriterien und Verifikationswege praezisiert.

## 40 Anti-Pattern-Katalog fuer Claude-Code-Arbeit

| Anti-Pattern | Verbindliche Gegenregel |
| --- | --- |
| Nach Analyse stoppen, obwohl Umsetzung beauftragt | Nach internem Plan direkt weiterarbeiten, sofern kein echter Blocker. |
| „Alles getestet“ ohne Output | Befehle, Resultate und Screenshots nennen. |
| Komplette index.html neu generieren | Chirurgische Diffs und kontrollierte Modularisierung. |
| Neue Parallelarchitektur anhaengen | Bestehende APIs und Stores konsolidieren. |
| Mock als Live-Daten darstellen | Testdaten sichtbar kennzeichnen; Produktionslayer deaktiviert. |
| Storage-Key umbenennen fuer „Sauberkeit“ | Kompatibilitaetsschicht und Migration. |
| CSS mit immer mehr !important | Ursache, Reihenfolge und Designsystem konsolidieren. |
| Fehler durch try/catch verschweigen | Root Cause und Nutzerzustand behandeln. |
| Ungepruefter Push auf main | Arbeitsbranch, Tests, Review und Freigabe. |
| Langer Prompt als einzige Dokumentation | Repository-Dokumente, ADRs, Skills und Reports. |
| Mehrere Agents schreiben dieselbe Datei | Ein Writer; parallele Agenten fuer Analyse/Review. |
| Secret in Client oder Chat kopieren | Serverseitige Environment-Variable und Redaction. |
| Feature und Refactor in Mega-Commit | Atomare, rueckrollbare Commits. |
| Mobile am Ende „kurz pruefen“ | Mobile vom Plan bis Screenshot als gleichwertiger Scope. |

## 41 Definition of Done fuer eine Entwicklungsphase

| Kategorie | Done-Kriterium |
| --- | --- |
| Scope | Task Contract erfuellt; keine unbegruendeten Nebenarbeiten. |
| Funktion | Akzeptanzfaelle reproduzierbar bestanden. |
| Daten | Keys, Migration, Backup und Reload geprueft. |
| UX | Normal-, Leer-, Lade-, Fehler- und relevante Offlinezustaende vorhanden. |
| Mobile | 390 px und weitere definierte Viewports geprueft. |
| Accessibility | Keyboard, Fokus, Labels, Status und Kontrastbasis geprueft. |
| Security | Keine neuen kritischen Sinks, Secrets oder Datenlecks. |
| Performance | Keine erkennbare Initialisierungs- oder Lifecycle-Regression. |
| Code | Diff gelesen; keine Doppelarchitektur oder toter Legacy-Pfad ohne Plan. |
| Tests | Static, Logic/Integration, Browser Smoke und visuelle Evidenz. |
| Git | Sauberer atomarer Commit auf korrektem Branch. |
| Dokumentation | ADR/Change Log/Phasenbericht aktualisiert. |
| Rollback | Rueckweg benannt und keine unkontrollierte irreversible Wirkung. |

> **Abschlussregel:** Wenn ein Pflichtkriterium nicht geprueft werden konnte, lautet der Status nicht „fertig“, sondern „blocked“ oder „pass with documented limitation“.

## 42 Release-Gate fuer V31

1. Alle Phasencommits auf dem vorgesehenen Integrationsbranch vorhanden.
2. Keine offenen kritischen oder major Daten-/Security-/Navigation-Regressions.
3. Dashboard-Deep-Links und Telefonie-End-to-End bestanden.
4. CRM, Follow-ups und Pipeline mit bestehenden Daten und Backups getestet.
5. Marktmonitor zeigt echte Geografie oder klaren freigegebenen Fallback; Quellenstatus korrekt.
6. Desktop-, Tablet- und Mobile-Matrix bestanden.
7. Accessibility-Baseline und Security-Review abgeschlossen.
8. Netlify Deploy Preview vollstaendig getestet.
9. Migration/Import/Export und Rollback dokumentiert.
10. Release Notes, bekannte Grenzen, Screenshots und Commit/Deploy-Referenz fertig.
11. Explizite Freigabe fuer Produktionsintegration liegt vor.
12. Nach Produktion kurzer Smoke-Test ohne kritischen Befund.

> *„V31 wird nicht durch die Anzahl geaenderter Zeilen abgeschlossen, sondern durch die nachweisbare Qualitaet des gesamten Makler-Workflows.“*

## 43 Architecture Decision Record - Vorlage

```
# ADR-XXXX: [Titel]

## Status
Proposed | Accepted | Superseded | Rejected

## Kontext
Welches Problem und welche bindenden Anforderungen bestehen?

## Entscheidungstreiber
- ...

## Betrachtete Optionen
1. ...
2. ...
3. ...

## Entscheidung
Welche Option wird gewaehlt?

## Begruendung
Warum ist sie fuer Keim CRM Pro langfristig besser?

## Konsequenzen
Positiv, negativ, Betriebs- und Migrationsfolgen.

## Verifikation
Spike, Tests, Metriken und Abnahmekriterien.

## Rollback / Superseding
Wie kann die Entscheidung spaeter sicher ersetzt werden?
```

## 44 Runbook - Release und Rollback

| Release-Schritt | Nachweis |
| --- | --- |
| Clean Tree | git status und korrekter Branch. |
| Sync | Zielbranch aktuell; Konflikte geloest. |
| Tests | Release-Matrix mit Zeitstempel. |
| Preview | URL und gepruefte Workflows. |
| Backup | Export/Restore und vorheriger Deploy. |
| Approval | Explizite Produktionsfreigabe. |
| Deploy | Commit und Deploy-ID/URL. |
| Smoke | Heute, CRM, Follow-ups, Pipeline, Markt, Backup. |
| Close | Release Notes und Known Issues. |

| Rollback-Schritt | Regel |
| --- | --- |
| Stop | Weitere Deploys und riskante Writes stoppen. |
| Assess | Code-, Konfigurations- oder Datenfehler unterscheiden. |
| Restore | Letzten validen Deploy/Commit wiederherstellen. |
| Protect Data | Keine vorschnelle Storage-Loeschung. |
| Verify | Kern-Smoke-Test nach Rollback. |
| Investigate | Fix in separatem Branch. |
| Document | Incident und Praevention festhalten. |

## 45 Messgroessen fuer den Entwicklungsprozess

Der Prozess wird nicht nach Geschwindigkeit allein optimiert. Metriken sollen Wiederholungsfehler, Regressionen und fehlende Evidenz sichtbar machen, ohne unproduktive Berichtsarbeit zu erzeugen.

| Metrik | Zweck |
| --- | --- |
| Regressionen pro Phase | Zeigt Qualitaet von Explore, Tests und Review. |
| Rollback-Faehigkeit | Anteil Phasen mit eindeutigem Rueckweg. |
| Testabdeckung der Kernworkflows | Nicht Zeilenquote, sondern reale Arbeitsablaeufe. |
| Ungeplante Parallelarchitekturen | Soll gegen null gehen. |
| Mobile-Nachbesserungen nach Desktop-Freigabe | Zeigt zu spaete Mobile-Beruecksichtigung. |
| Wiederholte Claude-Korrekturen | Signal fuer schlechte Regeln, Prompt oder Kontext. |
| Dauer bis reproduzierbarer Bug | Qualitaet von Diagnose und Observability. |
| Offene major Findings zum Release | Muss null sein oder explizit blockieren. |

- Metriken werden nicht als Leistungsdruck fuer den Nutzer verwendet.
- Eine kleine Phase mit guter Evidenz ist besser als ein grosser schneller Diff.
- Wiederholte Fehlmuster fuehren zu CLAUDE.md-, Skill-, Hook- oder Testverbesserungen.
- Die Metrik selbst darf den Entwicklungsfluss nicht unverhaeltnismaessig belasten.

## 46 Externe normative Referenzen

Die folgenden offiziellen Dokumentationen wurden fuer die Entwicklung dieses Manuals herangezogen. Da Werkzeuge und Plattformen weiterentwickelt werden, werden konkrete Befehle, Oberflaechen und Optionen vor ihrer produktiven Einfuehrung erneut gegen die aktuelle Dokumentation geprueft.

| ID | Quelle | Relevanz |
| --- | --- | --- |
| R1 | Claude Code Overview - https://code.claude.com/docs/en/overview | Agentisches Arbeiten, Dateien, Befehle, Git und Integrationen. |
| R2 | Claude Code Memory / CLAUDE.md - https://code.claude.com/docs/en/memory | Projektinstruktionen, Regeln, Imports, Kontext und Auto Memory. |
| R3 | Claude Code Best Practices - https://code.claude.com/docs/en/best-practices | Explore-Plan-Code, Verifikation, Kontext, Skills, Hooks, Subagents und Worktrees. |
| R4 | Claude Code Hooks - https://code.claude.com/docs/en/hooks | Deterministische Ereignisse und Schutzmechanismen. |
| R5 | Claude Code Skills - https://code.claude.com/docs/en/skills | Wiederverwendbare projektbezogene Workflows. |
| R6 | Claude Code Subagents - https://code.claude.com/docs/en/sub-agents | Spezialisierte Agenten und isolierte Kontexte. |
| R7 | Claude Code Permission Modes - https://code.claude.com/docs/en/permission-modes | Berechtigungs- und Sicherheitsgrenzen. |
| R8 | Netlify Deploy Previews - https://docs.netlify.com/deploy/deploy-types/deploy-previews/ | Abnahme von Branch- und Pull-Request-Staenden. |
| R9 | GitHub Pull Requests - https://docs.github.com/en/pull-requests | Review- und Integrationsworkflow. |

Diese Referenzliste ersetzt keine erneute Pruefung bei sicherheitskritischen, kostenpflichtigen oder produktiven Aenderungen.

## 47 Umsetzungsplan fuer dieses Manual im Repository

| Phase | Ergebnis |
| --- | --- |
| D1 | docs/prd/05-claude-code-development-manual.md einchecken. |
| D2 | Kurze root CLAUDE.md auf Basis der Invarianten erstellen. |
| D3 | .claude/rules fuer UI, Storage, Markt, Security, Tests und Netlify. |
| D4 | Erste Skills: Bugfix, UI Change, Release. |
| D5 | Read-only Review-Agenten einfuehren. |
| D6 | Deterministische Scripts fuer Smoke, Secret-Scan und Storage-Invarianten. |
| D7 | Hooks nach lokalem Test schrittweise aktivieren. |
| D8 | Branch-/Commit-/Release-Runbooks anwenden und nach erster V31-Phase nachschaerfen. |

> **Schrittweise Einfuehrung:** Das Manual wird nicht dadurch umgesetzt, dass alle .claude-Dateien auf einmal generiert werden. Jede Automationsschicht wird mit einem realen Workflow getestet, bevor sie verbindlich wird.

## 48 Uebergabe an Teil 6 - QA, Testing und Release Manual

Teil 5 definiert den Entwicklungsprozess und die Agenten-Governance. Teil 6 vertieft die Qualitaetssicherung: detaillierte Testfaelle, Browser- und Geraetematrix, visuelle Regression, Accessibility-Audit, Performance-Budgets, Security-Checks, Releaseabnahme und Incident-Qualitaet.

- Vollstaendige End-to-End-Testkataloge fuer jeden Hauptbereich.
- Konkrete Playwright-/Browser-Teststruktur.
- Visuelle Baselines und Diff-Toleranzen.
- Accessibility-Pruefplan und Schweregrade.
- Performance- und Netzwerkbudgets.
- Security- und Datenschutz-Release-Gates.
- Release-Candidate-, Produktions- und Rollback-Checklisten.
- QA-Berichtsformat und Defect-Triage.

## Change Log

- **1.0 - 09. Juli 2026:** Vollstaendige Neufassung von Teil 5: Claude Code Development Manual.
