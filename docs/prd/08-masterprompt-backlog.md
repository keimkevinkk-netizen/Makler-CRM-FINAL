# Master-Prompt-Backlog: Zuordnung aller 64 Funktionen (korrigierte Fassung)

Quelle: "maklercrm – technische Integrationsanalyse und Claude-Code-Master-Prompt" (11.07.2026, Teil B2/B3). Von Kevin als verbindlicher Zielkatalog bestätigt.

**Korrektur gegenüber der ersten Fassung dieses Dokuments:** die erste Fassung hat mehrere Funktionen pauschal auf "Phase 2/DB nötig" verschoben, obwohl der Master-Prompt selbst für **jede** der 64 Funktionen eine "Fallback-Lösung" nennt, die explizit ohne externen Dienst/Datenbank auskommt (Legende Teil B1: "NS = derzeit in der beschriebenen Vollautomatik nicht zuverlässig — sichere Zwischenlösung angegeben"). Diese Fassung geht jede Funktion einzeln anhand der tatsächlichen Matrix-Spalten durch (technische Voraussetzungen / externe Dienste / empfohlene Lösung / Fallback-Lösung) statt nach Bauchgefühl.

## Prinzip

Für jede Funktion:
- **Voll jetzt umsetzbar** — die *empfohlene* Lösung selbst braucht weder Auth noch DB noch externen Dienst → sofort gebaut.
- **Fallback jetzt umsetzbar, volle Ausprägung später** — die *empfohlene* Lösung braucht kanonische Mehrbenutzer-Entitäten, echte Provider-Verträge oder serverseitige Auswertung über viele Nutzer/Geräte hinweg; die im Dokument selbst genannte *Fallback-Lösung* ist aber rein clientseitig baubar und wird jetzt gebaut (kein Mock — echte, benutzbare Version mit reduziertem Funktionsumfang).
- **Echt blockiert** — auch die Fallback-Lösung selbst setzt einen externen Dienst zwingend voraus (nicht nur "optional"). Das betrifft nur Funktionen mit `ED` (nur mit externem Dienst) UND einer Fallback-Lösung, die trotzdem einen Vertrag/eine Provider-Entscheidung braucht.

---

## P0 (11 Funktionen — höchste Priorität laut Master-Prompt)

| # | Funktion | Verdikt | Status |
|---|---|---|---|
| 54 | Datenintegritäts-Sentinel | Voll jetzt umsetzbar | ✅ Erledigt (vorherige Session) |
| 24 | Datenherkunfts-Kompass | Voll jetzt umsetzbar (P0-Minimum) | ✅ Erledigt (Markt-/Bewertungswerte) |
| 16 | Zusagen-Ledger | Voll jetzt umsetzbar (kein externer Dienst) | ✅ Erledigt |
| 51 | Kontaktversprechen-Wächter | Voll jetzt umsetzbar (kein externer Dienst) | ✅ Erledigt |
| 17 | Transaktionswahrheits-Ledger | Voll jetzt umsetzbar (amtliche Daten nur optional) | ✅ Erledigt |
| 36 | Besichtigungs-Intelligence-Capture | Fallback jetzt umsetzbar (Kalender-Sync optional/später) | ✅ Erledigt (Fallback-Version) |
| 39 | Finanzierungs-Reibungsradar | Fallback jetzt umsetzbar (Finanzierungs-API optional/später) | ✅ Erledigt (Fallback-Version) |
| 55 | Qualitäts-Gatekeeper | Voll jetzt umsetzbar (kein externer Dienst) | ✅ Erledigt |
| 56 | Feldsignal-Sofortfänger | Fallback jetzt umsetzbar (Spracheingabe optional/später) | ✅ Erledigt (Fallback-Version) |
| 59 | Einwand-Genom | Fallback jetzt umsetzbar (KI optional/später) | ✅ Erledigt (Fallback-Version) |
| 60 | Interventionsgedächtnis | Fallback jetzt umsetzbar, an #59 gekoppelt (echte "Empfehlungen" brauchen mehr Datenbasis) | ✅ Erledigt (Fallback-Version) |

## P1 (22 Funktionen)

| # | Funktion | Verdikt |
|---|---|---|
| 4 | Portfolio-Eigentümer-Graph | Fallback jetzt umsetzbar (manuelle Portfolio-Liste pro Kontakt) | ✅ Erledigt |
| 8 | Empfehlungs-Kettenradar | Fallback jetzt umsetzbar (manuelle Intro-Verknüpfung, `KK_REFERRAL_NETWORK_V1` vorhanden) | ✅ Erledigt |
| 12 | Preis-Erwartungs-Brücke | Bereits weitgehend abgedeckt durch `KK_VALUATION` (Preiskorridore, Konfidenz) aus früherer Phase | ✅ Erledigt |
| 13 | Wettbewerber-Abwehrkarte | Voll jetzt umsetzbar (kein externer Dienst, KP/M) | ✅ Erledigt |
| 14 | Einwand-Pre-Mortem | Fallback jetzt umsetzbar (regelbasierte Checkliste statt KI) | ✅ Erledigt |
| 18 | Vergleichsobjekt-Evidenzgraph | Fallback jetzt umsetzbar (manuelle Vergleichsauswahl auf `KK_VALUATION` aufbauend) | ✅ Erledigt |
| 22 | Preisrealitäts-Stresstest | Fallback jetzt umsetzbar (manuell parametrierte Szenarien auf `KK_VALUATION`) | ✅ Erledigt |
| 29 | Stagnations-Autopsie | Fallback jetzt umsetzbar (bestehende Pipeline-Stagnationslogik um Ursachenbaum erweitern) | ✅ Erledigt |
| 30 | Preisaktions-Guardrail | Voll jetzt umsetzbar (kein externer Dienst, KP/M) | ✅ Erledigt |
| 33 | Käufer-Reife-Fingerabdruck | Fallback jetzt umsetzbar (strukturierter Qualifikationsbogen) | ✅ Erledigt |
| 34 | Suchprofil-Evolutionsdetektor | Fallback jetzt umsetzbar (manuelle Änderungsnotiz-Historie) | ✅ Erledigt |
| 41 | Beziehungskapital-Graph | Fallback jetzt umsetzbar (manuelle Beziehungsnotizen zwischen Kontakten) | ✅ Erledigt |
| 42 | Beziehungs-Abkühlungsalarm | Voll jetzt umsetzbar (kein externer Dienst, KP/M) | ✅ Erledigt |
| 45 | Empfehlungsmoment-Detektor | Fallback jetzt umsetzbar (manuelle Referral-Checkliste nach Abschluss) | ✅ Erledigt |
| 46 | Fairness- und Gegenseitigkeitsledger | Voll jetzt umsetzbar (kein externer Dienst, KP/M) | ✅ Erledigt |
| 50 | Aufschubmuster-Unterbrecher | Voll jetzt umsetzbar (kein externer Dienst, KP/L) | ✅ Erledigt |
| 52 | Gesprächskohärenz-Gedächtnis | Fallback jetzt umsetzbar (strukturierte statt freie Gesprächszusammenfassung) | ✅ Erledigt |
| 53 | Tageskapazitäts-Constraint-Engine | Voll jetzt umsetzbar (`kk_time_budget` existiert bereits, Kalender/Maps nur optional) | ✅ Erledigt |
| 57 | Lost-Deal-Blackbox | Fallback jetzt umsetzbar (strukturiertes Abschlussinterview-Formular) | ✅ Erledigt |
| 62 | Post-Closing-Lebenszyklus-Orbit | Fallback jetzt umsetzbar (manuelle Jahrestermine, Kalender/E-Mail nur optional) | ✅ Erledigt |
| 63 | Kundenbotschafter-Engine | Fallback jetzt umsetzbar (manuelle Empfehlungsfrage-Erinnerung) | ✅ Erledigt |
| 64 | Service-Recovery-Radar | Fallback jetzt umsetzbar (manuelle Beschwerde-Markierung + Eskalationsfrist) | ✅ Erledigt |

## P2 (25 Funktionen)

| # | Funktion | Verdikt |
|---|---|---|
| 1 | Eigentümer-Intent-Radar | Fallback jetzt umsetzbar (nur interne manuelle Signal-Markierung) | ✅ Erledigt |
| 2 | Verkaufsfenster-Modell | Fallback jetzt umsetzbar (regelbasierte Nutzerbestätigung/Zeitfenster-Feld) | ✅ Erledigt |
| 5 | Kontaktreaktivierungs-Seismograf | Fallback jetzt umsetzbar (Tage-seit-Kontakt-Alarm aus vorhandenen Aktivitäten) | ✅ Erledigt |
| 6 | Nachfrageüberhang-zu-Eigentümer-Engine | Fallback jetzt umsetzbar (manuelle Suchprofil-Zählung je Gebiet) | ✅ Erledigt |
| 7 | Nachbarschafts-Chancenkarte | Fallback jetzt umsetzbar (manuelle Gebiets-Chancen-Notiz auf bestehender Ortsteil-Auswertung) | ✅ Erledigt |
| 9 | Verkäufertermin-War-Room | Fallback jetzt umsetzbar (druckbare Checkliste aus CRM+Markt+Bewertung) | ✅ Erledigt |
| 10 | Eigentümer-Entscheidungszwilling | Fallback jetzt umsetzbar (regelbasierte Präferenzfelder statt KI-Hypothesen) | ✅ Erledigt |
| 11 | Beweis-Architekt | Fallback jetzt umsetzbar (manuelle Beleg-/Quellenliste je Kontakt) | ✅ Erledigt |
| 19 | Mikrolagen-DNA | Fallback jetzt umsetzbar (Maklernotizen je Ortsteil, Registry existiert bereits) | ✅ Erledigt |
| 20 | Straßen-Liquiditätsindex | Bereits weitgehend abgedeckt durch bestehende Ortsteil-Auswertung (Mindestfallzahl/Konfidenz) | ✅ Erledigt |
| 21 | Marktabsorptions-Simulator | Fallback jetzt umsetzbar (einfache Bestands-/Nachfragezähler je Gebiet) | ✅ Erledigt |
| 23 | Kontrafaktisches Preislabor | Fallback jetzt umsetzbar (kombiniert mit #22, einfache Was-wäre-wenn-Rechnung) | ✅ Erledigt |
| 25 | Vermarktungs-Digitalzwilling | Fallback jetzt umsetzbar (manuelles Vermarktungs-Aktivitätenledger je Objekt) | ✅ Erledigt |
| 27 | Zielgruppen-Fit-Engine | Fallback jetzt umsetzbar (manuelle Zielgruppen-Notiz je Objekt) | ✅ Erledigt |
| 28 | Käufer-Signal-Heatmap | Fallback jetzt umsetzbar (manuelle Signal-Buttons auf Käuferkontakten) | ✅ Erledigt |
| 32 | Eigentümer-Strategierat | Fallback jetzt umsetzbar (druckbarer Wochenbericht aus vorhandenen Daten) | ✅ Erledigt |
| 35 | Verpasste-Matches-Rettung | Fallback jetzt umsetzbar (manueller Suchprofil-Recheck-Reminder) | ✅ Erledigt |
| 37 | Emotionale-Reibungslandkarte | Fallback jetzt umsetzbar (vordefinierte Feedback-Tags im Besichtigungs-Debrief, #36) | ✅ Erledigt |
| 38 | Entscheidungsfenster-Orchestrator | Fallback jetzt umsetzbar (manuelles Entscheidungsfrist-Feld bei Käuferkontakten) | ✅ Erledigt |
| 40 | Käufer-Abwanderungsfrühwarnung | Fallback jetzt umsetzbar (gleiche Mechanik wie #5, auf Käufer angewendet) | ✅ Erledigt |
| 43 | Lokaler Multiplikatorenindex | Fallback jetzt umsetzbar (manuelle Markierung "guter Multiplikator" ohne Ranking) | ✅ Erledigt |
| 44 | Introduction Pathfinder | Fallback jetzt umsetzbar, aber niedrige Priorität (manuelle Verbindungssuche über #8/#41) | ✅ Erledigt |
| 47 | Community-Connector-Map | Fallback jetzt umsetzbar (Listenansicht ohne exakte Adressen, Datenschutz beachtet) | ✅ Erledigt |
| 48 | Nachbarschafts-Botschafterkreislauf | Fallback jetzt umsetzbar (manuelle Anlassliste für Empfehlungsaktionen) | ✅ Erledigt |
| 49 | Umsatzwirkungs-Navigator | Fallback jetzt umsetzbar (regelbasierte Top-3-Aufgabenliste) | ✅ Erledigt |

## P3 (5 Funktionen)

| # | Funktion | Verdikt |
|---|---|---|
| 3 | Fremdvermarktungs-Watchtower | Fallback jetzt umsetzbar (manueller URL-/CSV-Import statt Live-API) — volle Ausprägung **echt blockiert**: braucht bezahlten Immobilien-/Marktdatenprovider |
| 26 | 72-Stunden-Launch-Puls | Fallback jetzt umsetzbar (manuelle 24/48/72h-Check-in-Erinnerung) — volle Ausprägung **echt blockiert**: braucht Portal-Webhook-/API-Zugang |
| 31 | Kanal-Grenznutzen-Analyst | Fallback jetzt umsetzbar (manuelle Kanal-/Kostenbuchung) — volle Ausprägung **echt blockiert**: braucht Portal-/Ad-Analytics-API |
| 58 | Kontrafaktischer Vertriebscoach | Fallback jetzt umsetzbar (regelbasierte Retrospektive auf #57-Daten) — volle Ausprägung optional auf KI, nicht zwingend blockiert, aber XL-Aufwand, niedrige Priorität |
| 61 | Persönlicher Conversion-Zwilling | Bereits teilweise abgedeckt (bestehender Conversion-Funnel `renderConversion`); Szenario-Rechner als Fallback jetzt erweiterbar |

---

## Ehrliches Gesamtbild

**Keine der 64 Funktionen ist wirklich vollständig blockiert.** Nur 3 (#3, #26, #31) haben eine volle Ausprägung, die zwingend einen bezahlten externen Provider braucht — deren *Fallback-Version* ist trotzdem jetzt baubar. Alle anderen 61 bekommen entweder die volle empfohlene Lösung oder eine echte, benutzbare Fallback-Version **ohne** Auth/Datenbank.

**Umsetzungsreihenfolge:** P0 (11/11 erledigt) → P1 (22/22 erledigt) → P2 (25/25 erledigt) → P3 (5, naechster und letzter Schritt fuer den Fallback-Teil). Wird fortlaufend abgearbeitet, committet und getestet — siehe Commit-Historie fuer den jeweils aktuellen Stand. Wo eine "volle Ausprägung" (echte Multi-Device-Synchronisation, serverseitige Auswertung über alle Nutzer, KI-Modell-Integration) über die Fallback-Version hinausgeht, bleibt das explizit als spätere Erweiterung vermerkt — keine dieser späteren Erweiterungen wird als "erledigt" geführt.
