# Phasenbericht: V31 Phase 8 — CRM-Konsolidierung: Kontakt-Detailansicht

## Ziel und Ergebnis
Umsetzung von Punkt 12 der Korrekturanweisung ("Überarbeitung der Kontaktliste und Kontakt-Detailansicht") sowie Beitrag zu Punkt 11 ("Konsolidierung auf genau eine primäre CRM-Oberfläche", PRD Teil 2 §9–§10). Die bestehende Kontaktliste (`kkcrmproContactRows`, CRM Pro Cockpit) hatte bisher keine fokussierte Einzelansicht — nur die Formulare "Bearbeiten" (Editier-Formular) und "WV" (Follow-up anlegen). Es gab keinen Ort, an dem ein Nutzer auf einen Blick Kontaktdaten, nächste Aktion, Aktivitätsverlauf, offene Follow-ups und Notizen zusammen sieht, ohne in den Bearbeiten-Modus zu wechseln.

**Ergebnis:** Neue Kontakt-Detailansicht als natives `<dialog>`-Element, aufrufbar über einen neuen "Details"-Button pro Kontaktzeile. Zeigt: Name + Status-Pills, Direktaktionen (Anrufen/E-Mail als `tel:`/`mailto:`-Links), hervorgehobene nächste Aktion, Übersichtsraster (Telefon, E-Mail, Quelle, letzter Kontakt, Ortsteil, Beziehung), Aktivitätsverlauf (bis 15 Einträge), offene Follow-ups (sortiert nach Fälligkeit) und Notizen.

## Geänderte Dateien und Verträge
- `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html` (`crm-pro-os`-Modul):
  - Neues `<dialog id="kkcrmproContactDetailDialog">` mit Kopf-, Aktions-, Nächste-Aktion-, Übersichts-, Aktivitäts-, Follow-up- und Notizen-Bereich.
  - `openContactDetail(cid)` befüllt den Dialog aus `KEYS.contacts`/`KEYS.activities`/`KEYS.followups` und öffnet ihn über `dlg.showModal()`.
  - `detailFmtDate(v)`-Hilfsfunktion für deutsches Datumsformat (TT.MM.JJJJ).
  - Neuer "Details"-Button (`data-contact-detail`) pro Kontaktzeile in `renderContacts()`, vor "Bearbeiten"/"WV".
  - `bindMiniActions()` bindet `[data-contact-detail]` auf `openContactDetail`.
  - `bind()` verdrahtet Schließen-Button (`#kkcrmproDetailClose` → `dlg.close()`) sowie Klick auf das native `::backdrop` (Klick auf das `<dialog>`-Element selbst, nicht auf Inhaltselemente, schließt ebenfalls).
  - CSS: `.kkcp-detail-dialog` und Unterklassen, inkl. mobiler 1-spaltiger Fallback für das Übersichtsraster (`≤620px`).
- Keine neuen Storage-Keys, keine Datenmodelländerung. Alle angezeigten Felder existierten bereits auf dem Kontakt-Objekt bzw. in `kk_crm_activities`/`kk_followups`.

## Architekturentscheidung: natives `<dialog>` statt neues Komponentensystem
PRD Teil 2 §0.2 verbietet ein zweites paralleles Dialogsystem. Die Detailansicht nutzt daher bewusst das native HTML `<dialog>`-Element (Fokus-Trap, Backdrop, Escape-Taste sind Browser-eingebaut) statt eine neue JS-Modal-Komponente zu bauen — es handelt sich nicht um ein zweites System, sondern um die einzige native Plattform-Primitive, hier zum ersten Mal im Produkt eingesetzt.

## Bekannte Grenzen (bewusst nicht verändert)
- Aktivitäten und Follow-ups werden weiterhin über den **Namen** (`norm(a.contact) === norm(c.name)`), nicht über eine ID-Referenz, dem Kontakt zugeordnet. Das ist ein bestehendes Muster im gesamten Modul (Aktivitäts-Formularfeld `kkcrmproActContact` ist Freitext) und wurde in dieser Phase nur gelesen, nicht repariert — eine Umstellung auf ID-Referenzen wäre eine eigene, größere Migration mit Auswirkung auf mehrere Formulare.
- Der separate ältere Follow-up-Automatik-Generator (`followup`-Tab, Zeile ~5782) legt bei fehlender Kadenz automatisch eine 5-stufige Follow-up-Serie pro Kontakt an. Das ist bestehendes, unverändertes Verhalten und wurde beim Testen sichtbar (Testkontakt erhielt automatisch generierte Follow-ups) — kein Fehler dieser Phase.

## Verifikation
- Neuer Playwright-Test (`test-phase8-detail.js`), Desktop 1440×900 und Mobile 390×844:
  - Vollständiger Testkontakt: Dialog öffnet (`dlg.open===true`), Name/Meta/Aktionen (`tel:`/`mailto:`)/nächste Aktion/Übersicht/Aktivitäten/Follow-ups/Notizen korrekt befüllt.
  - Leerer Testkontakt (kein Telefon, keine E-Mail, keine Aktivitäten, keine Follow-ups, keine Notizen): korrekte „—"/Leerzustands-Texte statt leerer oder kaputter Anzeige ("Keine Telefonnummer", "Noch keine Aktivitäten für diesen Kontakt.", "Keine offenen Follow-ups.", "Keine Notizen hinterlegt.").
  - Schließen-Button schließt den Dialog (`open` wechselt zu `false`).
  - Klick auf Backdrop (Klick-Ziel = `<dialog>`-Element selbst) schließt den Dialog ebenfalls.
  - XSS-Kontrolle: Notiz mit eingebettetem `<b>`-Tag wird über `textContent` gesetzt, kein `innerHTML`-Durchbruch (`notesHtmlHasTag: false`).
  - Kein horizontaler Overflow bei geöffnetem Dialog, weder Desktop noch Mobile.
  - Keine `pageerror`-Einträge.
- Volle Regressionssuite (`verify.js`): alle 10 Haupttabs × Desktop 1440/Mobile 390, XSS-Regression, Console/Overflow-Checks — grün.
- Screenshots Desktop und Mobile geprüft: Dialog zentriert, Übersichtsraster fällt auf Mobile korrekt auf eine Spalte zurück, kein Overflow, Aktions-Buttons touch-tauglich groß.

## Ergebnis Status
PASS.

## Nächster sinnvoller Schritt
Phase 9: Follow-up-Modul-Überarbeitung (PRD Teil 2 §11) — insbesondere Verzahnung mit der neuen Kontakt-Detailansicht (z. B. Follow-up direkt aus dem Dialog heraus erledigen können) als mögliche Folgeverbesserung, aber kein Blocker für die jetzt abgeschlossene Detailansicht.
