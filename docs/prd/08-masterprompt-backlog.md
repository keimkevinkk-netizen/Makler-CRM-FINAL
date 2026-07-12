# Master-Prompt-Backlog: Zuordnung aller 64 Funktionen zu Phase 0–10

Quelle: "maklercrm – technische Integrationsanalyse und Claude-Code-Master-Prompt" (11.07.2026, 64 Funktionen aus "Keim CRM Pro – bahnbrechende Wettbewerbsvorteile", Teil B2/B3, Phasenplan Teil E). Von Kevin als verbindlicher Zielkatalog bestätigt.

**Zweck dieses Dokuments:** jede der 64 Funktionen bekommt einen ehrlichen Status. Nichts wird als erledigt geführt, was es nicht ist. Wo eine echte Voraussetzung fehlt (Datenbank, Auth, API-Key, externer Dienst, Netlify-Variable), steht das explizit dabei — keine Mocks, keine stillschweigenden Lücken.

## Status-Legende

- ✅ **Erledigt** — real gebaut, getestet, deploybar.
- 🟡 **Vorarbeit erledigt** — der ohne Blocker mögliche Teil ist gebaut (P0-Minimum, Datengrundlage, o. Ä.); die volle Funktion braucht weiterhin eine spätere Phase.
- ⬜ **Nicht begonnen, Voraussetzung fehlt** — mit exakter Voraussetzung.

---

## Phase 0 — Baseline, Branch- und PR7-Entscheidung
✅ **Erledigt.** PR #7 korrigiert (Overlay-/Query-Layer-Trennung, WMS-Version aus Capabilities, ServiceException-Erkennung) und nach `main` gemergt (Merge-Commit `023e7f1`). Von Kevin live auf der Preview verifiziert (BORIS/ALKIS "Live verbunden").

## Phase 1 — Reproduzierbarer Build, Tests, Security Gate
🟡 **Weitgehend erledigt.** npm/Lockfile/Node 24/CI/Playwright-Suite (Master-Prompt Phase 1, ADR-0003) + diese Session: Security-Header (`netlify.toml`), ESLint (`netlify/functions/` + `tests/`), `npm audit`-CI-Gate (ADR-0004).
**Bewusst nicht umgesetzt:** Vite-/TypeScript-Bundling, Vitest, Lint für `index.html` selbst. **Voraussetzung:** ein echtes neues Fachmodul, das eine Modulgrenze tatsächlich braucht — vorher würde die Umstellung nur Risiko ohne Gegenwert erzeugen (CLAUDE.md: `index.html` nicht komplett neu formatieren).

## Phase 2 — Auth, Datenbank und lokale Migration
⬜ **Nicht begonnen.** **Voraussetzung:** Kevins Entscheidung zu Netlify Identity + Netlify Database/PostgreSQL (kostenpflichtig bzw. architektonisch schwer rückgängig zu machen) — laut Kevins eigener Vorgabe explizit zurückgestellt, bis er Zeit hat. Ist die Grundlage für praktisch alle Phasen 3–10.

## Phase 3 — Kanonische Kernentitäten, Events und Qualitätsgrundlagen
Funktionen: 16, 17, 24, 36, 39, 51, 54, 55, 56, 59, 60

| # | Funktion | Status |
|---|---|---|
| 54 | Datenintegritäts-Sentinel | 🟡 **Vorarbeit erledigt.** Bestehende "Datenqualität"-Sektion um entitätsübergreifende Prüfungen erweitert (verwaiste Follow-up→Kontakt-Referenzen, Telefonnummer-Duplikate), rein lesend, keine Auto-Fixes. Volle Version (alle Entitäten, konfigurierbare Regeln) braucht kanonische Entitäten. |
| 24 | Datenherkunfts-Kompass | 🟡 **Vorarbeit erledigt.** Markt-/Bewertungswerte zeigen bereits Quelle+Zeitpunkt+Qualität (`KK_VALUATION`, DataSourceRegistry, Phase-4-Ehrlichkeitsaudit). Feldweite Provenance für ALLE Entitätsfelder (Kontakte, Notizen, …) braucht kanonische Entitäten. |
| 17 | Transaktionswahrheits-Ledger | 🟡 **Vorarbeit vorhanden.** `priceType`/`dealType` (Angebot vs. Kauf) existiert bereits in `KK_MARKET_OBS` (Grundregel: Angebotspreise nie als Kaufpreise bezeichnen, siehe `.claude/rules/market.md`). Eine echte `Transaction`-Entität mit Evidence/Source-Version fehlt. **Voraussetzung:** Phase 3 (DB). |
| 16 | Zusagen-Ledger | ⬜ **Bewusst nicht gebaut.** Geprüft: eine zusätzliche Ansicht wäre entweder redundant zum bestehenden Follow-up-Modul (Ergebnis + Aktivitätsspur bereits vorhanden, Phase 9) oder bräuchte eine neue kanonische Entität. **Voraussetzung:** Phase 3 (DB). |
| 51 | Kontaktversprechen-Wächter | ⬜ gleiche Begründung wie #16. **Voraussetzung:** Phase 3 (DB). |
| 36 | Besichtigungs-Intelligence-Capture | ⬜ Nicht begonnen. **Voraussetzung:** Phase 3 (Viewing-Entität). |
| 39 | Finanzierungs-Reibungsradar | ⬜ Nicht begonnen. **Voraussetzung:** Phase 3 (FinancingCase-Entität), optional Finanzierungs-API. |
| 55 | Qualitäts-Gatekeeper | ⬜ Nicht begonnen. **Voraussetzung:** Phase 3 (Workflow-Gate-Modell). |
| 56 | Feldsignal-Sofortfänger | ⬜ Nicht begonnen. **Voraussetzung:** Phase 3 (Inbox/Event-Modell, Offline-Outbox). |
| 59 | Einwand-Genom | ⬜ Nicht begonnen. **Voraussetzung:** Phase 3 (Objection-Entität). |
| 60 | Interventionsgedächtnis | ⬜ Nicht begonnen. **Voraussetzung:** Phase 3 (Recommendation/Outcome-Modell). |

## Phase 4 — Beziehungen, Netzwerk und Nachabschluss
Funktionen: 4, 8, 41–48, 62–64 — ⬜ **Keine begonnen.** **Voraussetzung:** Phase 3 (Relationship/Intro/Referral-Kanten als echte Entitäten; das bestehende `KK_REFERRAL_NETWORK_V1` ist eine gute Datenquelle, aber keine Kantenstruktur mit Consent/Sensitivität).

## Phase 5 — Käufer, Matching und Besichtigungssteuerung
Funktionen: 6, 15, 27, 28, 33–40 — ⬜ **Keine begonnen.** **Voraussetzung:** Phase 3 (BuyerProfile/Match-Entitäten).

## Phase 6 — Eigentümerakquise und Terminvorbereitung
Funktionen: 1, 2, 5, 9–14 — ⬜ **Keine begonnen**, außer #13 (Wettbewerber-Abwehrkarte), die auf bereits vorhandenen `Competition`/`lostReason`-Feldern aufbauen könnte (niedrigster Aufwand der Gruppe, KP/M). **Voraussetzung:** Phase 3.

## Phase 7 — Markt, Mikrolage, Bewertung und Preis
Funktionen: 3, 7, 18–23, 30

🟡 Bereits vorhandene, eigenständige Grundlage (aus früheren Phasen dieses Projekts, vor dem Master-Prompt): `window.KK_VALUATION` (Median/gewichtet/Ausreißer, Konfidenzstufen, Preisspannen), `KK_MARKET_OBS` (eigene Marktbeobachtungen, Ortsteil-Auswertung). Das deckt einen Teil von #12 (Preis-Erwartungs-Brücke) und #22 (Preisrealitäts-Stresstest) bereits ab. Vollständige Comparables-Graphen, MicroArea-Zeitreihen, Absorptions-/Stresstest-Simulationen fehlen. **Voraussetzung:** Phase 3 (kanonische Entitäten) für den Rest; #3 (Fremdvermarktungs-Watchtower) zusätzlich ein Marktdaten-Provider (kostenpflichtige Entscheidung).

## Phase 8 — Vermarktungssteuerung und Eigentümertransparenz
Funktionen: 25, 26, 29, 31, 32 (+27 in Marketingsicht) — ⬜ **Keine begonnen.** **Voraussetzung:** Phase 3 (MarketingCase-Entität); #26/#31 zusätzlich Portal-/Analytics-API.

## Phase 9 — Selbststeuerung, Lost-Deal und Lernen
Funktionen: 49, 50, 52, 53, 57, 58, 61 — ⬜ **Keine begonnen.** **Voraussetzung:** Phase 3 (Event-/Outcome-Historie); #58/#61 zusätzlich AI-/Privacy-Governance-Entscheidung.

## Phase 10 — Providerhärtung und Freigabe
⬜ **Keine begonnen.** Setzt Phasen 2–9 voraus. **Voraussetzung:** konkrete Provider-/Lizenz-/Budget-Entscheidungen (kostenpflichtig, nicht autonom zu treffen).

---

## Zusammenfassung

| Phase | Status |
|---|---|
| 0 | ✅ Erledigt |
| 1 | 🟡 Weitgehend erledigt (Vite/TS bewusst zurückgestellt) |
| 2 | ⬜ Blockiert auf Kevins Entscheidung (Auth/DB, kostenpflichtig) |
| 3 | 🟡 2 von 11 Funktionen mit echter Vorarbeit (#54, #24), 1 mit Teilgrundlage (#17), Rest blockiert auf Phase 2 |
| 4–6 | ⬜ Blockiert auf Phase 3 |
| 7 | 🟡 Teilgrundlage aus früheren Phasen vorhanden, Rest blockiert auf Phase 3 (+ #3 auf Provider-Entscheidung) |
| 8–9 | ⬜ Blockiert auf Phase 3 (+ teils externe APIs) |
| 10 | ⬜ Blockiert auf alles Vorherige + Provider-/Budget-Entscheidungen |

**Kernaussage:** Von den 64 Funktionen sind aktuell 0 vollständig "fertig" im Sinne des Master-Prompts (das Dokument selbst definiert: "Eine Funktion gilt nicht als fertig, wenn nur eine Schaltfläche, ein Mock oder ein statischer Text existiert" — konsequent angewendet auch auf die eigene Vorarbeit). 2 Funktionen haben echte, nicht-blockierte Vorarbeit erhalten (#54, #24), eine dritte eine Teilgrundlage aus früheren Projektphasen (#17). Der weit überwiegende Rest hängt strukturell an Phase 2 (Auth + Datenbank) — das ist keine Verzögerung dieser Session, sondern die vom Master-Prompt selbst vorgeschriebene Reihenfolge (Teil E0: jede Phase baut auf der vorherigen auf).
