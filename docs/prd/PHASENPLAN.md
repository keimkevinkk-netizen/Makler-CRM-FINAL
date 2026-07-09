# V31 Umsetzungsplan (laufend aktualisiert)

Bildet die PRD-Phasennummerierung (Teil 3 §47 "A0–A8", Teil 4 §50 "M0–M10", Teil 5 §47 "D1–D8") auf konkrete Arbeit in dieser Codebasis ab. Ausgangspunkt ist **nicht** eine leere Anwendung, sondern der bereits existierende, informelle V31-Rebuild (Phasen A–E, Commits `ea11fc7`…`2863b36` auf `claude/project-analysis-audit-u1z1iu`) — siehe `docs/prd/00-ist-zustand-inventar.md` §5 für das, was davon bereits PRD-konform ist.

## Bereits vorhanden (nicht erneut bauen)
- MapAdapter-Vertrag (`KK_MAP`), Leaflet-Engine, Provider-/Cache-Fundament (`KK_DATA_CORE`, `KK_MARKET`).
- Dashboard-Command-Center mit klickbarem Call-Hero und 5 KPI-Drill-throughs.
- Mobile-Native-Pass: Card-Tables, progressive Formular-Disclosure, 44px-Touch-Ziele, Kanban-Scroll-Snap.
- Erste CRM-Konsolidierung (Legacy-Kontaktliste hinter `<details>` collapsed, nicht gelöscht).

## Phase 0 — Fundament ✅ ABGESCHLOSSEN (Commit `d8827d2`)
Branch, Baseline-Screenshots, Ist-Zustand-Inventar, PRD-Dokumente eingecheckt, CLAUDE.md, `.claude/rules/*`, ADR-0000.
**Gate erfüllt:** Ist-Zustand reproduzierbar dokumentiert (PRD A0/D1–D3).

## Phase 1 — Navigationsvertrag konsolidieren ✅ ABGESCHLOSSEN (Commit `0525d93`)
`KK_V30_SHELL.tabs` und `mobilePrimary` leiten sich jetzt additiv aus `KK_APP_SHELL.registry` ab (eine Quelle, kein Duplikat mehr). Zusätzlich: dünner `KK_NAV.open({tab, filters, focusId})`-Wrapper, bewusst als Teilerfüllung dokumentiert (Filter-Event wird noch von keinem Modul konsumiert).
**Gate erfüllt:** Strukturelle Deep-Equality gegen die alte hartcodierte Liste bewiesen; voller Tab-Smoke-Test grün; Sidebar-Screenshot visuell identisch zur Baseline. Siehe `docs/releases/phase1-nav-consolidation.md`.

## Phase 2 — Schema-Registry dokumentieren ✅ ABGESCHLOSSEN (Commit `d8ff81e`)
Alle 70 `kk_*`-Keys als maschinenlesbares Register (`docs/prd/schema-registry.json`) formalisiert, inkl. ID-Präfix-Tabelle. Keine Datenmigration.
**Gate erfüllt:** Jeder Key hat Owner, Sensitivität, Backup-Einordnung (0 verbleibend unklar). Siehe `docs/prd/06-schema-registry.md`.

## Phase 3 — Next-Step-Coverage / Pipeline-Transparenz-Audit ✅ ABGESCHLOSSEN (Commit `323d165`)
Pipeline-Stagnationslogik bereits PRD-konform vorgefunden (kein Fix nötig). Next-Step Coverage (PRD-Nordstern-Kennzahl) war nicht sichtbar — jetzt als eigene Kennzahl im CRM-Pro-Datenqualitätsbereich sichtbar (`coveragePct`, null-sicher).
**Gate erfüllt:** Kennzahl aus bestehenden Daten abgeleitet und sichtbar; getestet mit synthetischen Daten (75 %-Fall) und Leerfall („–"). Siehe `docs/releases/phase3-next-step-coverage-audit.md`.

## Phase 4 — Marktdaten-Ehrlichkeitsaudit ✅ ABGESCHLOSSEN (Commit `f05874e`)
Zwei reale Befunde behoben: (1) Aktualisierungsdatum fehlte in der normalen Detailansicht (nur im Editor sichtbar), (2) echter Ehrlichkeits-Bug — fehlende Marktdaten wurden konfidenz-grün eingefärbt statt neutral.
**Gate erfüllt:** Kein Marktwert zeigt mehr eine Vertrauensfarbe ohne echten Wert; Quelle+Datum jetzt immer sichtbar. Siehe `docs/releases/phase4-market-data-honesty-audit.md`.

## Phase 5 — Zugriffsschutz-Entscheidung für öffentliche Netlify-URL — 🛑 BLOCKIERT, wartet auf Kevin
Teil 1 §16 verlangt eine bewusste Entscheidung, bevor produktive personenbezogene Daten öffentlich ungeschützt bleiben. **Das ist eine Entscheidung, die Kevin treffen muss** (Netlify-Passwortschutz ist z. B. ein kostenpflichtiges Pro-Feature, Netlify Identity ein Architekturschritt) — als Entscheidungsvorlage dokumentiert, nicht autonom umgesetzt. Siehe Abschlussbericht für die konkrete Fragestellung.

## Korrektur: Fortsetzung der nicht blockierten Anforderungen (Phasen 6–12) ✅ ABGESCHLOSSEN
Nach Rückmeldung, dass die Phasen 0–4 zwar sinnvolle Grundlagen, aber noch keine vollständige Umsetzung des Master-PRDs darstellen, wurden alle sichtbaren/funktionalen Produktanforderungen abgearbeitet, die nicht an einen der drei dokumentierten Blocker gebunden sind:

- **Phase 6 — Design-System-Konsolidierung** (Commit `f66ce3e`): zwei tote `:root{}`-Token-Blöcke entfernt, eine einzige Quelle für Basis-/App-Shell-Tokens. App-Shell-Audit gegen PRD Teil 2 §4 bestand ohne Codeänderung.
- **Phase 7 — Vollständiger Deep-Link-/Filter-Vertrag** (Commits `065650f`, `4699a27`): alle 5 Dashboard-KPIs führen jetzt in eine tatsächlich gefilterte Zielansicht statt nur grob in die richtige Richtung; Call-Hero-Kennzahlen anklickbar; echter Follow-ups-Filter-Bug gefunden und behoben.
- **Phase 8 — CRM-Kontakt-Detailansicht** (Commit `02aed67`): natives `<dialog>` statt neuem Dialogsystem, Übersicht/Aktivitäten/Follow-ups/Notizen an einem Ort.
- **Phase 9 — Follow-up-Modul-Überarbeitung** (Commit `fc9d4c0`): fünf statt vier eigenständige Ansichten (Überfällig war bisher fälschlich mit Heute vermischt), Rolle/Kontext/relative Fälligkeit ergänzt, "Kontakt öffnen"/"Verschieben" ergänzt, "Erledigt" erfasst jetzt Ergebnis + Aktivitätsspur (vorher stiller Statuswechsel ohne Nachvollziehbarkeit).
- **Phase 10 — Pipeline als Sales Command Board** (Commit `d36c5b5`): Risiko-Badge war praktisch eingefroren (Formular überschrieb die Live-Berechnung fast immer) — jetzt automatisch live berechnet, manuelles Risiko als bewusste Ausnahme markiert, Phasenwechsel-Historie ergänzt.
- **Phase 11 — Marktmonitor-Konsolidierung** (Commit `fd3554f`): zwei Kartenengines liefen gleichzeitig sichtbar (Regelverstoß gegen `.claude/rules/market.md`) — ältere SVG-Karte eingeklappt, echte Leaflet-Basiskarte ist jetzt primär sichtbar. Layer-Steuerung, Quellenstatus und Offline-Banner bereits vorhanden und verifiziert funktionsfähig.
- **Phase 12 — Accessibility- und Performance-Pass** (Commit `3d2d14e`): Toast-Live-Regionen und Dialog-Fokus-Rückgabe ergänzt; dabei einen echten Navigations-Bug gefunden (Offene-Leads-Deep-Link und Kontakt-öffnen zeigten das falsche, kontaktlose Panel) und behoben.

**Gate erfüllt:** Nach jeder Phase vollständige Regressionssuite (10 Tabs × Desktop 1440/Mobile 390, XSS, Console, Overflow) grün; zusätzlich phasenspezifische Playwright-Tests. Siehe `docs/releases/phase6-*` bis `phase12-*` für Details.

## Phase 14 — Design-System-Konsolidierung, neue App-Shell, Daily Command Center, Telefonie-Command-Center ✅ ABGESCHLOSSEN
Nach Freigabe der Phasen 6–12 kam die explizite Anweisung, ohne erneute Analyse direkt mit weiteren sichtbaren/funktionalen Produktänderungen fortzufahren. Vier Teilphasen, jede einzeln getestet und committet:

- **14.1 — Semantische Design-Token-Schicht** (Commit `597479b`): PRD-§22-Token-Vokabular (`--color-*`/`--space-*`/`--radius-*`/`--shadow-*`/`--text-*`/`--duration-*`/`--z-*`) additiv auf die bestehende Basis-Token-Quelle gemappt; Toast-Z-Index-Inkonsistenz (9999 vs. 99999) behoben.
- **14.2 — Neue Desktop-App-Shell mit "Mehr"-Menü** (Commit `f275fbb`): Sidebar zeigte bisher alle 10 Module gleichrangig (Regelverstoß gegen die PRD-Primärnavigations-Tabelle) — jetzt 6 primäre Ziele + Flyout-"Mehr"-Menü für die 4 sekundären Module.
- **14.3 — Dashboard-Reihenfolge korrigiert + "Jetzt erledigen"** (Commit `17f699b`): Telefonie-Command-Center von Position 3 auf Position 2 vorgezogen; neue modulübergreifende "Jetzt erledigen"-Karte (überfällige/heute fällige Aufgaben + Follow-ups) ergänzt.
- **14.4 — Vollständiges Telefonie-Command-Center** (Commit `ee79aaa`): echter PRD-Regelverstoß behoben ("Ein Anruf gilt nicht als abgeschlossen, wenn lediglich ein Zähler erhöht wurde") — `tel:`-Link, Kontaktkontext (Rolle/Ort/letzte Aktivität), vollständiger Ergebnis-Dialog mit allen 6 Ergebnistypen, automatischer Follow-up-/Termin-Folgeaktion.

**Gate erfüllt:** volle Regressionssuite + 6-Viewport-Matrix nach jeder Teilphase grün, phasenspezifische Playwright-Tests. Siehe `docs/releases/phase14-design-system-appshell-dashboard-callcenter.md`. Gemergt nach `main` via PR #2 (Merge-Commit `bfc5a69`), Netlify-Produktions-Deploy erfolgreich.

## Phase 15 — Gap-Analyse gegen Master-PRD Teil 2–4, verbleibende nicht blockierte Anforderungen (laufend)
Systematische Gap-Analyse (Read-only-Agent, alle 5 PRD-Teile gegen `index.html` geprüft) nach Merge von Phase 14 ergab sechs konkrete, nicht blockierte Lücken, priorisiert. Wird als Phase 15.1–15.x einzeln umgesetzt, getestet und committet. Siehe `docs/releases/phase15-import-preview-crm-views-market-deeplinks.md` für Details.

1. ✅ **15.1 — Import-Vorschau/Zusammenfassung** (Commit `1f81f26`, Teil 3 §29): natives Vorschau-`<dialog>` statt `window.confirm()`.
2. ✅ **15.2 — CRM-Filter-Chips + benannte Standardansichten** (Commit `8a65ccc`, Teil 2 §9.1/§19): sechs benannte, einzeln klickbare Ansichten.
3. ✅ **15.3 — Tippgeber-Modul-Konsolidierung** auf das neue Card-/Detail-Muster (Commit `3d630a1`, Teil 2 §14): 5 PRD-Standardansichten, Detaildialog, drei redundante Legacy-Module eingeklappt.
4. ✅ **15.4a — Marktmonitor-Präsentationsmodus** (Commit `5adf9b2`, Teil 4 §42). ✅ **15.4b — barrierefreie Tabellenalternative zur Karte** (Commit `31e8fce`, Teil 4 §46).
5. ✅ **15.5 — Pipeline-Deep-Link** aus dem Gebietsdetailpanel der Karte (Commit `7ea325d`). ✅ **15.5b — echter Folgefund**: Gebietsdetailpanel öffnete sich nicht mehr bei Kartenmarker-Klick auf der primären Karte, seit Phase 11 es in ein `<details>`-Element eingeklappt hatte (Commit `d953237`).
6. ⏳ **15.6 — Monitor-/TV-Modus** (Teil 2 §31.2, niedrige Priorität) — noch offen.

## Spätere Phasen mit externen Abhängigkeiten (nicht autonom auslösbar)
- **M2 — Amtliche Gemeindegeometrie (BKG VG250):** benötigt echten Internetzugang zum Download + Lizenzprüfung; im aktuellen Sandbox-Dev-Environment nicht durchführbar (siehe frühere Session-Historie: kein allgemeiner Internetzugriff). Bleibt dokumentierte Lücke, Näherungskoordinaten bleiben als solche gekennzeichnet.
- **M7 — Erster echter Marktdaten-Provider:** benötigt eine Provider-/Kosten-/Lizenzentscheidung (Teil 4 §12/§51) — echter Blocker im Sinne der Auftragsvorgabe ("notwendige kostenpflichtige Datenquelle").

## Nicht in diesem Umsetzungsplan
Vollständige Quellcode-Modularisierung (`src/core/...`, Teil 3 §40) — laut PRD selbst erst sinnvoll, wenn Datenverträge stabil sind; wird nicht vorgezogen.
