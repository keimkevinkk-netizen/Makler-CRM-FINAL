# Phase 27 — Sales Execution Core V1: Bestandsaufnahme, Gap-Analyse, Plan

Auftragsgrundlage: PDF "Keim CRM Pro — Sales Operating System und Implementierungsauftrag" (Stand 13. Juli 2026), Teil I (strategische Analyse) + Teil II (technischer Implementierungsauftrag). Branch: `feat/sales-execution-core-v1` (Basis: `main` nach Merge von PR #10, Commit `2dbc668`).

Dieses Dokument liefert die in Teil II verlangten Vorab-Ergebnisse 1–10, bevor Code geschrieben wird.

---

## 1. Bestandsaufnahme (ehrlich, faktenbasiert)

Quelle: vollständige Code-Recherche (grep + Lesen der relevanten `index.html`-Abschnitte), nicht Namens-/Formularvermutung.

### 1.1 Kontakte
- Kanonisch: `kk_crm_contacts` (Array). **Kein einheitliches Schreib-API** — drei unabhängige Codepfade (`index.html:7656-7657`, `13776-13777`, `14083-14100`) schreiben denselben Key direkt über `KK_STORE`.
- Felder: `id, name, phone, email, category, status, source, area, microArea, contactType, awarenessSource, referralProbability, localVisibility, lastPersonalMeeting, nextLocalTouchpoint, lastContact, nextAction, followUpDate, notes, createdAt, updatedAt`.
- **Keine `contactPolicy`, kein `doNotContact`, kein Consent-/Opt-out-Feld vorhanden.** (Verifiziert per Grep — 0 Treffer.)

### 1.2 Aktivitäten
- Kanonisch: `kk_crm_activities`. Flacher Timeline-Log, **keine** strukturierte Interaction-Entität: `{id, date, contactId, contact, type, channel, result, nextStep, followUpDate, note, createdAt}`.
- `contactId` existiert als Feld, wird aber praktisch immer leer gelassen — Verknüpfung läuft über den Namen (`lookupLastActivityByName`, `index.html:3898`). Kein `opportunityId`/`propertyId`/`direction`.
- Kein einheitliches Schreib-API — jedes Modul baut das Objekt selbst (`logCallActivity` 3899, `logActivity` 7897-7901, Qualitäts-Gate-Override 13254).

### 1.3 Follow-ups
| Key | Status |
|---|---|
| `kk_followups` | **Kanonisch/live.** Schreib-API `saveFollowups()` (7852), Lese-API `loadFollowups()`. Eigener Tab "Follow-ups", 5-stufige Auto-Sequenz. Wird von Heute-Dashboard, CEO-Cockpit, Data-Quality-Scan gelesen. |
| `kkcrmpro_followups`, `kk_crm_followups`, `kk_fu_items`, `kk12_followups` | **Tot.** Nur in Scan-/Export-Key-Arrays referenziert, keine Schreibstelle gefunden. |

### 1.4 Pipeline
| Key | Status |
|---|---|
| `kk_sales_pipeline` | **Kanonisch/live** (Verkaufsauftrags-Pipeline). Schreib-API `handleSalesForm()` (13240). Enthält bereits eine Risiko-Regel-Engine (`deriveRisk()`/`riskCause()`, 13203-13214). |
| `kk_valuation_pipeline`, `kk_referral_pipeline` | Kanonisch, eigene Deal-Typen (Bewertung, Tippgeber). |
| `kk_pipeline_deals` | **Abgeleiteter Spiegel**, kein Primärziel — wird aus `kk_sales_pipeline` neu berechnet (`syncPipelineMirror()`). |
| `kk_crm_owner_pipeline`, `kk_pipeline_module` | **Tot.** Keine Schreibstelle. |
| Deal-Felder | `id, name, phone, email, area, objectLabel, objectType, stage, nextStep, followUpDate, deadline, risk, blocker, ...`. **Kein `contactId`/`propertyId`** — Verknüpfung über `name`/`objectLabel` als Freitext. |

### 1.5 Anruf/Telefonie
- `kk_call_queue`: kanonisch, aber **ausdrücklich rein manuell gepflegt**, keine Priorisierung (Code-Kommentar im Repo bestätigt das explizit).
- Kein eigener "Call-in-Progress"-Zustand — "Anruf starten" ist nur ein `tel:`-Link, Ergebnis wird nachträglich über ein Modal erfasst (`openCallResult()`/`submitCallResult()`, 3912-3960), das dann `kk_followups` + `kk_crm_activities` schreibt.
- `kk_daily_call_queue_*`, `kk_calls_log_v27` (nur manueller Tageszähler) — kein individueller Call-Log.

### 1.6 Bereits vorhandene P0-Funktionen (Master-Prompt-Batch, frühere Phase)
Alle im selben IIFE `index.html:12018-12317`, **alle nur unter dem Backup-Tab erreichbar** (Anker `p0funktionen`, `p0einwaende`, `p0transaktionen`, `p0besichtigung`, `p0finanzierung`, `p0schnellerfassung` sind im `backup`-Tab registriert):

- **Zusagen-Ledger** (`kk_commitments_v1`): `{id, contact (Freitext), text, due, status, fulfilledAt}`. Funktional vollständig, aber **nicht im Live-Workflow sichtbar**.
- **Einwand-Ausgang** (`kk_objection_outcomes_v1`): Wirksamkeits-Tracking pro Einwand, ebenfalls nur im Backup-Tab.
- Transaktions-Ledger (`kk_transactions_v1`, auto-abgeleitet aus `kk_sales_pipeline`), Besichtigungs-Debrief (`kk_viewing_debriefs_v1`), Finanzierungsstatus (`kk_financing_status_v1`), Qualitäts-Gate (kein eigener Key, `confirm()`-Gate in `handleSalesForm`), Schnellerfassung (`kk_quick_capture_inbox_v1`).
- **Befund der PDF wird damit bestätigt**: Diese Funktionen sind technisch vorhanden, aber **keine aktive Vertriebsführung**, weil sie nicht am Arbeitsmoment (Kontakt, vor/während/nach dem Gespräch, Tagesfokus) erscheinen, sondern in einem administrativen Bereich "geparkt" sind.

### 1.7 Navigation
`CLAUDE.md`s Warnung vor zwei parallelen Navigations-Registries ist **inzwischen überholt**: `KK_APP_SHELL.REGISTRY` (14172-14193) ist die alleinige Quelle; `KK_V30_SHELL` leitet seine Tabs bereits per `deriveTabs()` daraus ab (18289-18296) und behält nur Präsentations-Overrides (Label/Icon) lokal. Dieses Dokument korrigiert diesen veralteten Hinweis; `CLAUDE.md` wird in einem separaten kleinen Patch aktualisiert (siehe §9 unten).

Aktuelle Haupttabs: `heute, marktmonitor, crm, followups, pipeline, tippgeber, ki-prompts, kpis, backup, skripte, wissen` — **Sales Execution Core bekommt keinen neuen Tab**, sondern erweitert `heute` (Daily Command Center) und den bestehenden Anruf-Flow.

### 1.8 KK_BOOT
`window.KK_BOOT.register(name, initFn, {priority})`, aktuell 50 registrierte Module, Prioritätsbereich ca. 6–98, läuft automatisch bei `DOMContentLoaded`. Neues Modul: Priorität 50 (nach den CRM/Pipeline/Follow-up-Datenmodulen, vor den späten UX-Layern).

### 1.9 Zentrale Objektdatenbank (`KK_OBJECTS`, PR #10)
`getObjectPolicy(recordType).allowOwnerLink` ist bereits als Konzept vorgesehen, aber **`ownerName` ist nach wie vor nur Freitext** — kein `ownerContactId`. Bestätigt das systemische Muster (siehe 1.10).

### 1.10 Systemischer Befund (wichtigster Einzelbefund der Bestandsaufnahme)
**Keine einzige Entität im gesamten Repository verknüpft aktuell per ID.** Kontakte, Aktivitäten, Pipeline-Deals, Zusagen, Einwand-Outcomes und zentrale Objekte referenzieren sich alle ausschließlich über exakten Namens-String-Abgleich (`contact`/`name`/`ownerName`). Eine "kanonische Kontakt-Objekt-Chance-Struktur" (PDF Hebel 4) existiert fachlich noch nicht — nur der Objekt-Teil davon wurde mit PR #10 gelöst.

### 1.11 Tests
14 Playwright-E2E-Dateien (`tests/e2e/*.js`), 2 Function-Tests (`tests/functions/*.js`). `test-masterprompt-p0.js` deckt bereits Commitments/Transaktionen/Debrief/Financing/Quick-Capture/Einwände ab.

---

## 2. Gap-Analyse: PDF-Funktion vs. Code-Realität

| PDF-Anforderung | Zustand | Begründung |
|---|---|---|
| Verbindliche Datenwahrheit (Ebene A) | **Fehlend** | Kein ID-basiertes Linking irgendwo; mehrere tote Parallel-Keys pro Entität (siehe 1.3/1.4) |
| Explainable Next Best Action Engine | **Fehlend** | Keine Priorisierungslogik über Kontakte/Zusagen/Pipeline hinweg vorhanden |
| Geschlossener Telefonzyklus (Vorbereitung/Gespräch/Nachbereitung) | **Teilweise/oberflächlich** | Nachbereitung existiert (`submitCallResult`), aber ohne Vorbereitung, ohne Anrufmodus, ohne Verknüpfung zu einer priorisierten Empfehlung |
| Kontaktversprechen-Wächter (Zusagen-Ledger) | **Vorhanden, aber isoliert** | `kk_commitments_v1` funktional komplett, nur im Backup-Tab, keine Verbindung zu Tagesfokus |
| Kanonische Kontakt-Objekt-Chance-Struktur | **Teilweise** (nur Objektseite via PR #10) | Kontakt/Pipeline/Aktivität weiterhin Freitext-verknüpft |
| Kontaktpolitik / Kontaktrecht | **Fehlend** | Kein `contactPolicy`-Feld, kein Sperr-/Opt-out-Mechanismus |
| Eigentümer-Intent-Radar, Verkäufertermin-War-Room, Einwand-Genom, Lost-Deal-Blackbox, Regional-Dominance-Engine | **Nicht umgesetzt** (explizit Phase 2–5 der PDF-Roadmap, nicht Teil von Phase 1) | — |
| Vertriebsereignis-Log | **Fehlend** | Kein append-only Event-Log vorhanden |
| Kein neuer Haupt-Tab / kein zweites CRM-System | **Einhaltbar** | Bestehende Struktur erlaubt additive Erweiterung von `heute` |

**Fazit der PDF-eigenen Diagnose wird bestätigt**: Das Problem ist nicht fehlende Funktionsmenge, sondern fehlende Orchestrierung und fehlende ID-Verknüpfung. Phase 1 (dieser Auftrag) baut daher bewusst **keine weiteren isolierten Funktionen**, sondern (a) eine additive ID-Verknüpfungsschicht, (b) eine Regel-Engine über bestehende kanonische Quellen, (c) einen geführten Telefon-Workflow, (d) die Sichtbarmachung bereits vorhandener, aber im Backup-Tab "geparkter" Funktionen (Zusagen-Ledger) im Live-Workflow.

---

## 3. Betroffene Dateien/Module

| Datei | Änderungsart |
|---|---|
| `index.html` | Neuer Script-Block `sales-execution-core` (KK_BOOT-Modul, Priorität 50); additive Erweiterung `kk_crm_contacts` (contactPolicy), `kk_crm_activities` (optionale `opportunityId/propertyId/direction`-Felder), UI-Erweiterung im `heute`-Panel (Daily Command Center oberhalb bestehender Kacheln), kleine additive UI in `crm`-Panel (Kontaktfreigabe-Button pro Kontaktkarte) |
| `tests/e2e/test-sales-execution-core.js` | Neu — Engine-Determinismus, Kontaktpolitik-Ausschluss, Telefonworkflow, Mobile |
| `docs/prd/schema-registry.json` | Neue Keys ergänzt (siehe §4) |
| `docs/adr/ADR-0008-sales-execution-core-v1.md` | Neu — Architekturentscheidung |
| `docs/releases/phase27-sales-execution-core-v1-bestandsaufnahme-plan.md` | Dieses Dokument |
| `docs/releases/phase27-sales-execution-core-v1-abschlussbericht.md` | Abschlussbericht (nach Umsetzung) |
| `.github/workflows/ci.yml` | Neuer E2E-Step für die neue Testdatei |
| `CLAUDE.md` | Korrektur des veralteten Hinweises zu zwei parallelen Navigations-Registries (§1.7) |

---

## 4. Datenquellen-/LocalStorage-Matrix (Sales Execution Core V1)

| Datentyp | Kanonische Quelle | Zulässige Legacy-Quellen | Neue additive Felder | Schreibregel |
|---|---|---|---|---|
| Kontakte | `kk_crm_contacts` | — | `contactPolicy{phoneAllowed,emailAllowed,postalAllowed,basis,basisEvidence,consentRecordedAt,noContactUntil,doNotContact,restrictionReason}` (optional, additiv) | Nur über bestehende Kontakt-Speicherpfade + neuen `KK_SALES_CORE.setContactPolicy(id,policy)`-Helper, der denselben Array/Key liest-ändert-schreibt |
| Aktivitäten | `kk_crm_activities` | — | optionale `opportunityId`, `propertyId`, `direction` (nur gesetzt, wenn die Nachbereitung sie kennt; nichts wird rückwirkend migriert) | Neue Aktivitäten aus dem Call-Workflow über `KK_SALES_CORE.logCallInteraction()`, das intern denselben Key schreibt wie `logCallActivity()` |
| Follow-ups | `kk_followups` | `kk_crm_followups`, `kkcrmpro_followups`, `kk_fu_items`, `kk12_followups` (alle tot, werden nicht angefasst) | keine neuen Felder nötig | Nachbereitung erzeugt Follow-ups über denselben Mechanismus wie `submitCallResult()` |
| Pipeline | `kk_sales_pipeline` (+ `kk_valuation_pipeline`, `kk_referral_pipeline`) | `kk_crm_owner_pipeline`, `kk_pipeline_module`, `kk_pipeline_deals` (Spiegel, nicht primär) | keine | Pipeline wird durch Sales Execution Core **nie automatisch verändert** — nur nach expliziter Nutzerbestätigung im Nachbereitungs-Dialog |
| Zusagen | `kk_commitments_v1` | — | keine (bestehendes Schema ausreichend für V1; ID-Migration siehe ADR §Grenzen) | Aus Nachbereitung neu erzeugbar über bestehende Commitment-Schreiblogik |
| Kontakt-ID-Zuordnung | **neu:** `kk_entity_link_queue_v1` | — | `{id, sourceKey, sourceRecordId, freeTextName, candidateContactIds[], status:'ambiguous'|'resolved', resolvedContactId}` | Nur additiv, nie destruktiv; mehrdeutige Treffer landen hier statt geraten zu werden |
| Action Feedback | **neu:** `kk_action_feedback_v1` | — | `{recommendationId, decision, dismissReason, snoozedUntil, executedAt, resultInteractionId}` | append/upsert by `recommendationId` |
| Vertriebsereignisse | **neu:** `kk_sales_events_v1` | — | append-only Event-Log (siehe ADR) | nur `push`, nie `splice`/Löschung |
| CallSession (Zustand während geführtem Anruf) | **neu:** `kk_call_session_v1` (Singleton-Objekt, kein Array) | — | siehe ADR | wird bei Abschluss/Abbruch geleert, dient nur als Wiederherstellungspunkt bei Reload |

`ActionRecommendation` selbst wird **nicht persistiert** — sie wird deterministisch aus den obigen kanonischen Quellen berechnet, mit stabiler ID (`ruleId + ':' + contactId`), damit identische Daten reproduzierbar dieselbe Empfehlung erzeugen (Akzeptanzkriterium 6/11 der PDF).

Alle neuen Keys folgen der Backup-Erkennungs-Regex (`kk_`-Präfix) und werden in `docs/prd/schema-registry.json` nachgetragen.

---

## 5. Entscheidung zum offenen Pull Request der zentralen Objektdatenbank (PR #10)

**PR #10 wurde bereits vor diesem Auftrag fachlich geprüft, korrigiert (Ein-Formular-Editor statt 3-Formular-Router) und mit ausdrücklicher Freigabe des Auftraggebers gemergt** (Merge-Commit `2dbc668`, `main`, 13. Juli 2026). Die PDF verlangt in Phase 0 Arbeitspaket 1 exakt diese Prüfung — sie ist damit bereits erledigt, nicht Teil dieses Auftrags. `feat/sales-execution-core-v1` basiert auf diesem gemergten Stand, sodass `window.KK_OBJECTS`/`kk_crm_objects` als fertige Grundlage zur Verfügung steht. Es wird **keine zweite Objektarchitektur** aufgebaut.

---

## 6. Architekturkonzept

Siehe `docs/adr/ADR-0008-sales-execution-core-v1.md` für die vollständige Entscheidung (Namespace-Modul statt ES-Module, additive ID-Verknüpfung statt Migration, deterministische Regel-Engine statt Score).

Kurzfassung:
- **Ein neues Namespace-Modul `window.KK_SALES_CORE`**, eingebettet als zusätzlicher `<script>`-Block in `index.html`, registriert über `KK_BOOT.register('sales-execution-core', init, {priority:50})` — keine ES-Module (Single-File-Constraint, Initialisierungsreihenfolge nicht sicher migrierbar, siehe ADR).
- Intern in klar getrennte Funktionsgruppen gegliedert (entspricht der von der PDF vorgeschlagenen `src/`-Struktur, aber als benannte Objekte innerhalb einer IIFE statt echter Dateien): `EntityLinks`, `ContactPolicy`, `ActionEngine`, `CallWorkflow`, `EventLog`.
- UI-Integration additiv in bestehende Panels (`heute`, `crm`), kein neuer Tab, kein zweites Dialogsystem (nutzt das bereits etablierte `<dialog>`-Pattern aus dem zentralen Objekteditor).

---

## 7. Umsetzungsplan (Reihenfolge)

1. Arbeitspaket 1 — Entity-Links-Adapter (Namensauflösung, Ambiguitäts-Queue).
2. Arbeitspaket 2 — Kontaktpolitik (Datenmodell + minimal-invasive Editor-UI pro Kontaktkarte).
3. Arbeitspaket 3 — Action Engine (7-stufige Prioritätsregeln, reasonCodes, kein Score).
4. Arbeitspaket 4 — Daily Command Center im `heute`-Panel.
5. Arbeitspaket 5–7 — Geführte Anrufvorbereitung, Anrufmodus, Nachbereitung (ein zusammenhängender Dialog-Flow).
6. Arbeitspaket 8 — Empfehlungskontrolle (ausführen/zurückstellen/ablehnen).
7. Arbeitspaket 9 — Vertriebsereignis-Log.
8. Tests (Unit/Engine, E2E, Migration, Mobile, Regression).
9. Dokumentation (ADR, Abschlussbericht), `CLAUDE.md`-Korrektur.
10. Commit, Push, Draft-PR.

---

## 8. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Freitext-Namens-Matching erzeugt falsche Kontakt-Zuordnung (zwei Kontakte mit gleichem Namen) | Bei Mehrdeutigkeit **nicht raten** — Datensatz landet in `kk_entity_link_queue_v1`, Engine schließt ihn von automatischen Empfehlungen aus statt falsch zuzuordnen |
| Neue `contactPolicy`-Pflichtfelder blockieren bestehende, seit Jahren genutzte Anruf-Workflows für hunderte Bestandskontakte ohne dokumentierte Einwilligung | **Bewusst nicht automatisch rückwirkend blockierend** — siehe ADR §Rechtliche Grenze; als offene Entscheidung für Kevin dokumentiert (Phase 5 der PDF verlangt ausdrücklich Einzelfallentscheidungen für Rechtsfragen) |
| Single-File-Größe wächst weiter, Regressionsrisiko bei jeder Änderung steigt | Neues Modul strikt additiv am Dateiende-nahen Bereich, kein Umschreiben bestehender Module, volle Regressionssuite vor Commit |
| Performance bei vielen Datensätzen (PDF verlangt 1000+ Kontakte flüssig) | Engine arbeitet mit einmaligem Index-Aufbau pro Lauf (O(n) statt verschachtelter O(n²)-Suchen), kein Recompute bei jedem Tastendruck |
| Doppelte Aktivität/Follow-up bei Doppelklick im Nachbereitungs-Dialog | Speichern-Button wird nach erstem Klick deaktiviert, `CallSession`-Singleton verhindert Doppelabschluss |
| Blockierende `prompt()`/`confirm()`-Dialoge im neuen Kernworkflow (PDF-Verbot) | Neuer Workflow nutzt ausschließlich das bestehende `<dialog>`-Pattern, keine `window.prompt/confirm` |

---

## 9. Testplan

Siehe `tests/e2e/test-sales-execution-core.js` (neu): Engine-Determinismus (identische Daten → identische Reihenfolge), gesperrte Kontakte ausgeschlossen, überfällige Zusage vor unverbindlichem Neukontakt, ehrlicher Leerzustand, vollständiger Telefonworkflow (Vorbereitung → Ergebnis → genau eine Aktivität + höchstens ein Follow-up/Commitment), Mobile 390px ohne horizontalen Overflow, Migration/Ambiguitäts-Queue idempotent. Zusätzlich: volle bestehende Regressionssuite (14 E2E-Dateien + Funktionstests + Lint + Audit) muss grün bleiben.

---

## 10. Definition of Done

Deckt sich mit den 20 Akzeptanzkriterien aus der PDF (§8) — einzeln abgehakt im Abschlussbericht `docs/releases/phase27-sales-execution-core-v1-abschlussbericht.md` nach Umsetzung. Kernpunkte: Daily Command Center erzeugt priorisierte Liste aus echten Daten, jede Empfehlung mit sichtbarem Grund, keine erfundenen Scores, gesperrte Kontakte ausgeschlossen, Anruf startbar aus dem Command Center, genau eine Interaktion + höchstens ein Follow-up/Commitment pro Anruf, kein neuer Haupt-Tab, alle bestehenden Tests grün, Branch gepusht, Draft-PR mit „NICHT MERGEN"-Kennzeichnung erstellt.

**Ausdrücklich nicht Teil von Phase 1** (PDF-Roadmap Phase 2–6): Einwand-Genom-Lernschleife, Eigentümer-Intent-Radar, Verkäufertermin-War-Room, Lost-Deal-Blackbox, Regional-Dominance-Engine, Authentifizierung/Mehrbenutzerbetrieb. Diese werden im Abschlussbericht als bewusst verschoben dokumentiert, nicht stillschweigend weggelassen.
