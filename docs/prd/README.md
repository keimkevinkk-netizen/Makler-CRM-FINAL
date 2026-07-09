# Master-PRD V31 — Übersicht

Verbindliche Produktspezifikation für Keim CRM Pro V31 (Stand 09. Juli 2026), aufgeteilt gemäß der in Teil 5 §4 vorgeschriebenen Repository-Struktur.

| Datei | Inhalt |
| --- | --- |
| `00-ist-zustand-inventar.md` | Baseline-Inventar der bestehenden Codebasis (Storage-Keys, `window.KK_*`-APIs, Boot-Module, bekannte Lücken) — Phase-0-Artefakt, kein PRD-Original. |
| `01-product-strategy.md` | Teil 1: Produktstrategie, Vision, Governance. |
| `02-ux-design-bible.md` | Teil 2: UX, Design-System, Interaktionsspezifikation. |
| `03-architecture-data-model.md` | Teil 3: Informationsarchitektur, technische Architektur, Datenmodell. |
| `04-market-map-platform.md` | Teil 4: Marktmonitor, Kartenplattform, externe Marktdaten. |
| `05-claude-code-development-manual.md` | Teil 5: Claude Code Development Manual (Arbeitsweise, Git, Tests, Reviews). |
| `06-schema-registry.md` + `schema-registry.json` | Phase-2-Artefakt: maschinenlesbares Register aller 70 Storage-Keys (Owner, Sensitivität, Backup-Pflicht). |
| `PHASENPLAN.md` | Laufender Implementierungsplan, der die PRD-Phasen (A0–A8, M0–M10, D1–D8) auf konkrete Arbeit in dieser Codebasis abbildet. |

Rangordnung bei Widersprüchen: Teil 1 > Teil 2 > Teil 3 > Teil 4 > Teil 5 > ADRs > Implementierungsdetails (Teil 1 §0).
