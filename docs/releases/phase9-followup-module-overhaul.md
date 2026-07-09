# Phasenbericht: V31 Phase 9 — Follow-up-Modul-Überarbeitung

## Ziel und Ergebnis
Umsetzung von Punkt 13 der Korrekturanweisung ("Überarbeitung des Follow-up-Moduls") gegen PRD Teil 2 §11 ("Follow-up-Arbeitsbereich"). Audit gegen die PRD-Tabelle der fünf geforderten Ansichten und der sechs Pflicht-Eintragselemente ergab mehrere echte Lücken im bestehenden Modul (`followup`-Tab, Formular "Auftrags-Follow-up-System"), die in dieser Phase behoben wurden.

## Befunde und Fixes

### 1. „Heute" zeigte fälschlich auch Überfällige mit an — behoben
Die bisherige Tab-Struktur hatte nur vier Ansichten (Heute fällig / Diese Woche / Alle offen / Erledigt). Der "Heute"-Filter nutzte `dueDate<=today`, wodurch Überfällige und tatsächlich heute fällige Einträge in derselben Liste ununterscheidbar vermischt waren — das PRD verlangt fünf **eigenständige** Ansichten (Überfällig, Heute, Nächste 7 Tage, Alle offen, Erledigt) mit je eigener Standardsortierung.
**Fix:** Fünfte, eigenständige Tab "Überfällig" ergänzt; "Heute" filtert jetzt strikt auf `dueDate===today`.

### 2. „Diese Woche" nutzte Kalenderwoche statt rollierender 7-Tage-Ansicht — behoben
Der bisherige Filter (`getWeekBounds()`) bezog sich auf Montag–Sonntag der aktuellen Kalenderwoche. Das PRD fordert "kommende sieben Tage" — eine rollierende Ansicht ab heute, unabhängig vom Wochentag. Bei einem Start z. B. an einem Mittwoch hätte die alte Logik einen Termin am kommenden Montag (8 Tage entfernt, aber nächste Kalenderwoche) fälschlich ausgeblendet und gleichzeitig bereits vergangene Wochentage (Montag/Dienstag) mit angezeigt.
**Fix:** "Nächste 7 Tage" filtert jetzt auf `dueDate>heute && dueDate<=heute+7 Tage`, unabhängig vom Kalenderwochenraster. Getestet: ein Termin in 10 Tagen erscheint korrekt **nicht** in dieser Ansicht, einer in 3 Tagen schon.

### 3. „Erledigt" ohne festgelegte Sortierung — behoben
PRD verlangt "zuletzt erledigt zuerst". Die alte Sortierung ordnete auch die Erledigt-Ansicht nach Fälligkeitsdatum. **Fix:** eigene Sortierung nach `completedAt` absteigend für die Erledigt-Ansicht.

### 4. Pflicht-Eintragselement „Kontakt: Name und Rolle" — Rolle fehlte komplett
**Fix:** `lookupRole(name)` sucht die Kategorie/Rolle live im CRM-Kontaktbestand (`kk_crm_contacts`) und zeigt sie neben dem Namen an (z. B. „Frank Faellig (Eigentümer)"). Kein neues Datenfeld nötig, funktioniert auch rückwirkend für bereits bestehende Follow-ups.

### 5. Pflicht-Eintragselement „Kontext: letzte relevante Aktivität" — fehlte komplett
**Fix:** `lookupLastActivity(name)` sucht den jüngsten Eintrag in `kk_crm_activities` für denselben Kontakt (dieselbe namensbasierte Zuordnung wie in Phase 8) und zeigt Typ, Datum und Ergebnis als neue Zeile „Letzte Aktivität" pro Eintrag.

### 6. Pflicht-Element „Fälligkeit: relativ und absolut" — nur absolut vorhanden
**Fix:** `relLabel()` liefert jetzt zusätzlich zur absoluten Fälligkeit (`Fällig: 07.07.2026`) eine präzise relative Formulierung („überfällig seit 2 Tagen", „heute fällig", „morgen fällig", „in 5 Tagen") statt nur einer groben Kategorie-Pille.

### 7. Pflicht-Aktion „Kontakt öffnen" — fehlte
**Fix:** Neuer Button „Kontakt öffnen" pro Eintrag. Nutzt eine neue, öffentliche API `window.KK_CRM_PRO.openContactByName(name)` (Bridge zur Phase-8-Kontakt-Detailansicht): wechselt in den CRM-Tab und öffnet dort direkt den passenden Kontakt im nativen `<dialog>` aus Phase 8. Ohne Treffer erscheint ein Toast „Kein passender CRM-Kontakt gefunden" statt eines stillen Fehlschlags.

### 8. Pflicht-Aktion „Verschieben" — fehlte
**Fix:** Neuer Button „Verschieben" fragt per Prompt ein neues Fälligkeitsdatum ab (Vorschlag: +3 Tage ab aktuellem Fälligkeitsdatum oder heute), validiert die Eingabe und aktualisiert den Eintrag ohne Statusänderung.

### 9. Boxed „Follow-up-Regel" verletzt: Abschluss ohne Ergebnis und ohne Aktivitätsspur — echter Ehrlichkeits-/Nachvollziehbarkeits-Bug, behoben
> PRD-Zitat: „‚Erledigt' darf nicht nur den Datensatz aus der Liste entfernen. Der Abschluss muss als Aktivität nachvollziehbar bleiben und alle abhängigen Kennzahlen aktualisieren."

Der bisherige „Erledigt"-Button setzte nur `status='erledigt'`, ohne Ergebnis abzufragen und ohne irgendeinen Eintrag in der Aktivitätshistorie zu hinterlassen. Ein erledigtes Follow-up verschwand faktisch spurlos aus der Arbeitsliste — die Kontakt-Detailansicht aus Phase 8 hätte für einen so abgeschlossenen Kontakt keinerlei Aktivität gezeigt.
**Fix:** „Erledigt" fragt jetzt per Prompt das Ergebnis ab (Abbruch möglich, dann bleibt der Status unverändert), speichert es am Follow-up-Datensatz (`result`-Feld, in der Erledigt-Ansicht sichtbar) und schreibt zusätzlich einen neuen Eintrag in `kk_crm_activities` (Typ „Follow-up ([Stufe])", Ergebnis, Kanal, Ziel als Notiz) — genau das Format, das Phase 8s Kontakt-Detaildialog bereits im Aktivitätsverlauf anzeigt. Der bereits vorhandene „Nächste Stufe vorschlagen"-Mechanismus deckt weiterhin den optionalen Folgeschritt ab.

## Deep-Link-Anpassung (Konsistenz zu Phase 7)
Die Dashboard-Kennzahl „Follow-ups fällig" zählt weiterhin Heute+Überfällig kombiniert (unverändert, `dueFollowups()`). Da die Zielansicht jetzt in zwei getrennte Tabs aufgeteilt ist, wählt der Klick-Handler jetzt gezielt: Sind überfällige offene Follow-ups vorhanden, öffnet der Klick den Tab „Überfällig" (dringlicher), sonst „Heute". Die Prüfung liest live aus dem Storage (`kk_followups`), nicht aus dem ggf. noch nicht neu gerenderten Anzeigezustand des Follow-up-Moduls — sonst hätte ein Klick direkt nach einer Datenänderung ohne vorherigen Tab-Besuch einen veralteten Anzeigewert genutzt (während der Implementierung als echter Bug aufgefallen und vor dem Commit behoben).

## Geänderte Dateien
- `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html`:
  - `followup`-Modul: Tab-Markup (5 statt 4 Tabs), `getFiltered()`, `relLabel()`/`relDays()`, neue Funktionen `logActivity()`, `completeWithResult()`, `rescheduleFollowup()`, `openRelatedContact()`, `lookupRole()`, `lookupLastActivity()`, `renderList()`-Item-Template (Rolle, Kontext, Ergebnis, neue Aktions-Buttons), Klick-Handler in `init()`.
  - `crm-pro-os`-Modul: neue öffentliche API `window.KK_CRM_PRO.openContactByName(name)` / `findContactIdByName(name)`.
  - `kk-heute-v30-3-js`: Deep-Link-Handler für `kkhSummaryFollowups` angepasst (Überfällig-vs-Heute-Auswahl anhand Live-Storage-Check).
- Keine neuen Storage-Keys. Neues Feld `result` auf bestehenden `kk_followups`-Einträgen (nur bei Abschluss gesetzt, keine Migration nötig — Feld ist optional und wird bei Fehlen als leer behandelt).

## Bekannte Grenzen (bewusst nicht verändert)
- Aktivitäts-/Rollen-Zuordnung bleibt namensbasiert (`lookupRole`, `lookupLastActivity`), konsistent mit dem bestehenden Muster aus Phase 8 und dem restlichen CRM-Pro-Modul — keine ID-Migration in dieser Phase.
- "Heute"-Sortierung nach Uhrzeit (PRD: "Uhrzeit, dann manuelle Priorität") ist nicht umsetzbar, da Follow-ups aktuell kein Uhrzeit- oder Prioritätsfeld besitzen (nur Datum). Sortierung bleibt daher alphabetisch nach Name; als Lücke dokumentiert statt stillschweigend ignoriert.
- Die Follow-up-Statistikkacheln (`#kkFuStat*`) sowie die komplette Listenansicht werden nur beim Öffnen des Follow-up-Tabs bzw. bei geänderten Tabs neu berechnet, nicht reaktiv bei jeder Storage-Änderung in anderen Tabs (bestehendes Architekturmuster der gesamten App, nicht in dieser Phase behoben — betrifft nicht den jetzt korrigierten Deep-Link, der bewusst direkt aus dem Storage liest statt aus dem gerenderten DOM).

## Verifikation
- Neuer Playwright-Test (`test-phase9-followups.js`): fünf getrennte Tab-Filter korrekt geprüft (Überfällig 2 Einträge älteste zuerst, Heute exakt 1, Nächste 7 Tage schließt 10-Tage-Eintrag korrekt aus, Alle offen 5, Erledigt nach `completedAt` absteigend sortiert), Rolle+Kontext-Anzeige, Ergebnis-Erfassung inkl. neuem Aktivitätseintrag in `kk_crm_activities`, Verschieben-Funktion, Kontakt-öffnen-Navigation in die Phase-8-Detailansicht (Dialog öffnet sich, `crm`-Tab aktiv) — alles grün, keine `pageerror`-Einträge.
- Separater Deep-Link-Test (`test-phase9-deeplink.js`): Dashboard-KPI-Klick mit 1 überfälligem Follow-up öffnet korrekt den Tab „Überfällig" (nach Bugfix des Live-Storage-Reads).
- Regressionslauf der bestehenden Phase-7-Tests (`test-phase7-remaining.js`): weiterhin grün, keine neuen Fehler durch die Tab-Umbenennung.
- Volle Regressionssuite (`verify.js`): alle 10 Haupttabs × Desktop 1440/Mobile 390, XSS, Console, Overflow — grün.
- Screenshots Desktop und Mobile: neue 5-Tab-Leiste und angereicherte Eintragskarte (Rolle, relative Fälligkeit, Kontext) ohne Umbruch- oder Overflow-Probleme.

## Ergebnis Status
PASS.

## Nächster sinnvoller Schritt
Phase 10: Pipeline als echtes Sales Command Board (PRD Teil 2 §12) — Audit der bestehenden Pipeline-Karten/Board-Ansicht gegen die PRD-Pflichtfelder (Kontakt, Objekt, Phase, Wert, letzte Aktivität, nächste Aktion, Fälligkeit, Risikohinweis, Öffnen) und den Risikotyp-Katalog.
