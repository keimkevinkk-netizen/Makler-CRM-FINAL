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

## Spätere Phasen mit externen Abhängigkeiten (nicht autonom auslösbar)
- **M2 — Amtliche Gemeindegeometrie (BKG VG250):** benötigt echten Internetzugang zum Download + Lizenzprüfung; im aktuellen Sandbox-Dev-Environment nicht durchführbar (siehe frühere Session-Historie: kein allgemeiner Internetzugriff). Bleibt dokumentierte Lücke, Näherungskoordinaten bleiben als solche gekennzeichnet.
- **M7 — Erster echter Marktdaten-Provider:** benötigt eine Provider-/Kosten-/Lizenzentscheidung (Teil 4 §12/§51) — echter Blocker im Sinne der Auftragsvorgabe ("notwendige kostenpflichtige Datenquelle").

## Nicht in diesem Umsetzungsplan
Vollständige Quellcode-Modularisierung (`src/core/...`, Teil 3 §40) — laut PRD selbst erst sinnvoll, wenn Datenverträge stabil sind; wird nicht vorgezogen.
