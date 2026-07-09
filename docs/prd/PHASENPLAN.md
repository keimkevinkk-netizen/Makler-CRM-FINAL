# V31 Umsetzungsplan (laufend aktualisiert)

Bildet die PRD-Phasennummerierung (Teil 3 §47 "A0–A8", Teil 4 §50 "M0–M10", Teil 5 §47 "D1–D8") auf konkrete Arbeit in dieser Codebasis ab. Ausgangspunkt ist **nicht** eine leere Anwendung, sondern der bereits existierende, informelle V31-Rebuild (Phasen A–E, Commits `ea11fc7`…`2863b36` auf `claude/project-analysis-audit-u1z1iu`) — siehe `docs/prd/00-ist-zustand-inventar.md` §5 für das, was davon bereits PRD-konform ist.

## Bereits vorhanden (nicht erneut bauen)
- MapAdapter-Vertrag (`KK_MAP`), Leaflet-Engine, Provider-/Cache-Fundament (`KK_DATA_CORE`, `KK_MARKET`).
- Dashboard-Command-Center mit klickbarem Call-Hero und 5 KPI-Drill-throughs.
- Mobile-Native-Pass: Card-Tables, progressive Formular-Disclosure, 44px-Touch-Ziele, Kanban-Scroll-Snap.
- Erste CRM-Konsolidierung (Legacy-Kontaktliste hinter `<details>` collapsed, nicht gelöscht).

## Phase 0 — Fundament (dieser Commit)
Branch, Baseline-Screenshots, Ist-Zustand-Inventar, PRD-Dokumente eingecheckt, CLAUDE.md, `.claude/rules/*`, ADR-0000.
**Gate:** Ist-Zustand reproduzierbar dokumentiert (PRD A0/D1–D3).

## Phase 1 — Navigationsvertrag konsolidieren (A1, entschärft)
Das PRD verlangt eine vollständige `KK_NAV`-Schicht (Tab+View+Filter+focusId+returnTo als ein Aufruf, Teil 3 §6). Der reale nächste sinnvolle Schritt ist kleiner: die zwei bestehenden parallelen Tab-Listen (`KK_APP_SHELL.REGISTRY` und `KK_V30_SHELL.tabs`) sind heute manuell synchron zu halten — ein bekanntes Fehlerrisiko. Phase 1 macht `KK_V30_SHELL.tabs` additiv aus `KK_APP_SHELL.REGISTRY` ableitbar (eine Quelle, kein Duplikat mehr), ohne die sichtbare Sidebar-Struktur zu verändern. Danach: dünner `KK_NAV.open({tab, filters, focusId})`-Wrapper um das bestehende `openTab`/`openAnchor`, additiv, damit zukünftige Deep-Links einen einzigen Einstiegspunkt haben.
**Gate:** Ein Tab-Eintrag ändern erfordert nur noch eine Codestelle; bestehende Deep-Links (Dashboard-KPI-Klicks) funktionieren unverändert; voller Tab-Smoke-Test grün.

## Phase 2 — Schema-Registry dokumentieren (A2, dokumentativ)
Bestehende `kk_*`-Keys und `uid()`-Präfixe als maschinenlesbares Register (`docs/prd/schema-registry.json` o. ä.) formalisieren, ohne Daten zu migrieren. Grundlage für spätere Backup-/Datenqualitäts-Automatisierung (Teil 3 §10).
**Gate:** Jeder produktive Key hat einen Eintrag mit Owner, Sensitivität, Backup-Pflicht.

## Phase 3 — Next-Step-Coverage / Pipeline-Transparenz-Audit (A3/A4)
Prüfen, ob aktive Kontakte/Pipeline-Chancen laut PRD-Definition (Teil 1 §17.1 "North Star: Next-Step Coverage") tatsächlich Fälligkeit + nächste Aktion sichtbar tragen, und ob Pipeline-Stagnation transparent begründet wird (Teil 2 §12.1). Audit + gezielte UI-Nachbesserung, kein neues Datenmodell.
**Gate:** North-Star-Kennzahl ist aus bestehenden Daten ableitbar und im Backup/KPI-Bereich sichtbar.

## Phase 4 — Marktdaten-Ehrlichkeitsaudit (M6, dokumentativ + UI)
Jede im Marktmonitor sichtbare Kennzahl gegen Teil 4 §15/§43 prüfen: Quelle, Zeitraum, Abrufzeitpunkt, Qualitätsstatus sichtbar? Angebots-/Kaufpreis-Sprache korrekt getrennt? Wo nicht vorhanden: UI ergänzen (keine neuen Fake-Werte).
**Gate:** Kein Marktwert ohne Quelle/Zeitraum/Qualitätsstatus im UI.

## Phase 5 — Zugriffsschutz-Entscheidung für öffentliche Netlify-URL (offener Punkt, Blocker-Kandidat)
Teil 1 §16 verlangt eine bewusste Entscheidung, bevor produktive personenbezogene Daten öffentlich ungeschützt bleiben. **Das ist eine Entscheidung, die Kevin treffen muss** (Netlify-Passwortschutz ist z. B. ein kostenpflichtiges Pro-Feature, Netlify Identity ein Architekturschritt) — wird als Entscheidungsvorlage dokumentiert, nicht autonom umgesetzt.

## Spätere Phasen mit externen Abhängigkeiten (nicht autonom auslösbar)
- **M2 — Amtliche Gemeindegeometrie (BKG VG250):** benötigt echten Internetzugang zum Download + Lizenzprüfung; im aktuellen Sandbox-Dev-Environment nicht durchführbar (siehe frühere Session-Historie: kein allgemeiner Internetzugriff). Bleibt dokumentierte Lücke, Näherungskoordinaten bleiben als solche gekennzeichnet.
- **M7 — Erster echter Marktdaten-Provider:** benötigt eine Provider-/Kosten-/Lizenzentscheidung (Teil 4 §12/§51) — echter Blocker im Sinne der Auftragsvorgabe ("notwendige kostenpflichtige Datenquelle").

## Nicht in diesem Umsetzungsplan
Vollständige Quellcode-Modularisierung (`src/core/...`, Teil 3 §40) — laut PRD selbst erst sinnvoll, wenn Datenverträge stabil sind; wird nicht vorgezogen.
