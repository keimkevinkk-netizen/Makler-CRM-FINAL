# VINCERE – Verbindliche Private-Beta-Checkliste

Diese Checkliste muss für jede private Beta vollständig ausgefüllt und mit Datum, verantwortlicher Person und Nachweis dokumentiert werden. Nicht erfüllte Pflichtpunkte blockieren die Freigabe.

## 1. Freigabe und Umfang

- [ ] Beta ist ausschließlich für Kevin Keim und namentlich freigegebene Testnutzer bestimmt.
- [ ] Freigegebener Funktionsumfang ist schriftlich festgelegt.
- [ ] Deaktivierte und experimentelle Funktionen sind dokumentiert.
- [ ] Das alte MaklerCRM bleibt unverändert und operatives Sicherheitsnetz.
- [ ] Es gibt keinen automatischen Produktivimport und keinen automatischen Rückimport.

## 2. Supabase-Beta-Projekt

- [ ] Separates Projekt ausschließlich für VINCERE Beta erstellt.
- [ ] EU-Region anhand der Projekteinstellungen nachgewiesen.
- [ ] Projekt-URL dokumentiert, aber keine Secrets im Repository gespeichert.
- [ ] Im Browser wird nur ein Publishable-/Anon-Key verwendet.
- [ ] Service-Role- und Secret-Schlüssel sind ausschließlich serverseitig verwahrt.
- [ ] Auth-E-Mail-Einstellungen, erlaubte Redirects und Passwortregeln geprüft.
- [ ] Entscheidung zu MFA für Beta dokumentiert.
- [ ] Rate Limits und Missbrauchsschutz geprüft.

## 3. Migrationen und RLS

- [ ] `202607140001_vincere_core.sql` erfolgreich angewendet.
- [ ] `202607140002_relational_workspace_data.sql` erfolgreich angewendet.
- [ ] `202607140003_harden_workspace_roles.sql` erfolgreich angewendet.
- [ ] RLS ist auf allen Workspace- und Fachtabellen aktiviert.
- [ ] Anonymer Zugriff auf personenbezogene Tabellen ist nicht möglich.
- [ ] Viewer kann keine Insert-, Update-, Delete- oder Sync-RPC ausführen.
- [ ] Admin kann sich nicht selbst zum Owner machen.
- [ ] Nicht-Owner können keine Rollen verwalten.
- [ ] Owner kann Nicht-Owner-Rollen nur über die kontrollierte RPC verwalten.
- [ ] Zwei-Workspace-Negativtest wurde praktisch durchgeführt.

## 4. Erster Workspace und Benutzer

- [ ] Erster Beta-Benutzer in Supabase Auth angelegt.
- [ ] Erster Workspace über `create_vincere_workspace` angelegt.
- [ ] Kevin Keim besitzt die Rolle `owner`.
- [ ] Viewer-Testnutzer angelegt und über kontrollierte RPC hinzugefügt.
- [ ] Optionaler Agent-Testnutzer angelegt.
- [ ] Optionaler Admin-Testnutzer angelegt.
- [ ] Jeder Testnutzer sieht ausschließlich seinen freigegebenen Workspace.
- [ ] Abmeldung und erneute Anmeldung wurden je Rolle geprüft.

## 5. Umgebungsvariablen

- [ ] `VITE_APP_ENV=beta`
- [ ] `VITE_DATA_MODE=live`
- [ ] `VITE_ENABLE_MOCK_DATA=false`
- [ ] `VITE_ENABLE_PROVIDER_FUNCTIONS=false`, sofern kein Provider ausdrücklich freigegeben wurde.
- [ ] `VITE_ENABLE_DEVELOPER_TOOLS=false`
- [ ] `VITE_APP_VERSION` gesetzt.
- [ ] `VITE_RELEASE_SHA` auf den geprüften Commit gesetzt.
- [ ] `VITE_SUPABASE_URL` zeigt auf das Beta-Projekt.
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` enthält ausschließlich den öffentlichen Schlüssel.
- [ ] Keine Variable enthält Service-Role-, Secret-, SMTP- oder private Provider-Schlüssel.
- [ ] Oberfläche zeigt eindeutig `PRIVATE BETA`.
- [ ] Oberfläche zeigt keine Testdatenkennzeichnung im Live-Modus.

## 6. Feature Flags

- [ ] Kontakte aktiviert.
- [ ] Follow-ups aktiviert.
- [ ] Immobilien aktiviert.
- [ ] Termine nur bei dokumentierter experimenteller Freigabe aktiviert.
- [ ] Bewertungen nicht produktiv verwendet.
- [ ] Realtime deaktiviert.
- [ ] Kommunikation/Provider deaktiviert.
- [ ] Forecast deaktiviert.
- [ ] Legacy-Migration deaktiviert.
- [ ] Datenqualität deaktiviert.
- [ ] Datenschutz-Zentrale deaktiviert.
- [ ] KI-Mock-Modus deaktiviert, sofern kein klar gekennzeichneter Test geplant ist.

## 7. Testdaten und Echtdaten

- [ ] Beta beginnt mit einem leeren Live-Workspace oder ausdrücklich freigegebenen Testdaten.
- [ ] Keine Daten aus der lokalen Demo wurden in die Beta hochgeladen.
- [ ] Testdaten sind als Testdaten erkennbar und enthalten keine echten Kundendaten.
- [ ] Keine Echtdaten werden in Preview- oder lokale Umgebungen kopiert.
- [ ] Browser-Sitzungsspeicher wird nach Abmeldung geleert.
- [ ] Gemeinsame oder öffentliche Geräte sind für Beta ausgeschlossen.

## 8. Backup und Wiederherstellung

- [ ] Datenbank-Backup vor dem ersten Beta-Test erstellt.
- [ ] Backup-Aufbewahrungsort und Zugriffsberechtigte dokumentiert.
- [ ] Workspace-JSON-Export mit Testdaten durchgeführt.
- [ ] Wiederherstellung in einer isolierten Testinstanz durchgeführt.
- [ ] Wiederhergestellte Datensätze stichprobenartig geprüft.
- [ ] RPO und RTO für die Beta festgelegt.
- [ ] Verantwortliche Person für Wiederherstellung benannt.

## 9. Automatisierte Qualitätsprüfung

- [ ] `npm run typecheck` erfolgreich.
- [ ] `npm run lint` erfolgreich.
- [ ] `npm test` erfolgreich.
- [ ] `npm run build` erfolgreich.
- [ ] `npm run test:security` erfolgreich.
- [ ] `npm run test:e2e` erfolgreich.
- [ ] Sicherheitsmigrationstests erfolgreich.
- [ ] CI-Ergebnis gehört exakt zum freizugebenden Commit.
- [ ] Keine ignorierten oder übersprungenen kritischen Tests.

## 10. Smoke-Test

- [ ] Anmeldung als Owner.
- [ ] Anmeldung als Viewer.
- [ ] Kontakt anlegen.
- [ ] Kontakt ändern.
- [ ] Follow-up anlegen, verschieben und erledigen.
- [ ] Gespräch protokollieren.
- [ ] Termin anzeigen.
- [ ] Immobilie mit Eigentümerkontakt anlegen.
- [ ] Suche mit mindestens 100 Testkontakten prüfen.
- [ ] Datenexport erstellen.
- [ ] Gültigen Import durchführen.
- [ ] Fremden Workspace-Import ablehnen lassen.
- [ ] Konflikt erzeugen und stilles Überschreiben ausschließen.
- [ ] Offline gehen und sichtbaren Offlinezustand prüfen.
- [ ] Reconnect durchführen.
- [ ] Abmeldung entfernt Sitzung und lokale Echtdaten.

## 11. Mobile und Accessibility

- [ ] iPhone/Safari geprüft.
- [ ] Android/Chrome geprüft oder begründet ausgeschlossen.
- [ ] Navigation bei 320 px Breite geprüft.
- [ ] Hoch- und Querformat geprüft.
- [ ] Alle Kernabläufe vollständig per Tastatur bedienbar.
- [ ] Dialogfokus, Escape und Fokuswiederherstellung geprüft.
- [ ] VoiceOver oder vergleichbarer Screenreader geprüft.
- [ ] Zoom bei 200 Prozent geprüft.
- [ ] Reduzierte Bewegung geprüft.
- [ ] Kontrast aller kritischen Texte und Zustände gemessen.

## 12. Datenschutz und Sicherheit

- [ ] Verarbeitungszwecke der Beta dokumentiert.
- [ ] Testnutzer wurden über Beta, Datenumfang und Risiken informiert.
- [ ] Rechtsgrundlage für verwendete Echtdaten geprüft.
- [ ] Keine echten Kundendaten ohne ausdrückliche Freigabe importiert.
- [ ] Aufbewahrungs- und Löschregeln für Beta-Daten festgelegt.
- [ ] Auskunfts- und Exportweg festgelegt.
- [ ] Technische Logs enthalten keine personenbezogenen Inhalte.
- [ ] CSP und Sicherheitsheader im ausgelieferten Response geprüft.
- [ ] Browserbundle auf Secrets geprüft.
- [ ] Abhängigkeiten und bekannte Schwachstellen geprüft.
- [ ] Externe Datenschutzprüfung oder Freigabe dokumentiert.

## 13. Fehlerüberwachung

- [ ] Frontendfehler werden lokal kategorisiert.
- [ ] Netzwerkfehler werden erkannt.
- [ ] Authfehler werden erkannt.
- [ ] Syncfehler werden erkannt.
- [ ] Konflikte werden separat erkannt.
- [ ] Performanceprobleme werden messbar erfasst.
- [ ] Providerfehler besitzen eine definierte Kategorie.
- [ ] Kein externer Monitoringanbieter erhält Daten ohne ausdrückliche Konfiguration.
- [ ] Alarm- und Reaktionsweg für kritische Fehler festgelegt.

## 14. Supportweg

- [ ] Ein verantwortlicher Ansprechpartner ist benannt.
- [ ] Ein zentraler Supportkanal ist festgelegt.
- [ ] Testnutzer kennen Meldeweg und erwartete Angaben.
- [ ] Screenshots dürfen nur ohne unnötige personenbezogene Daten geteilt werden.
- [ ] Kritische Vorfälle besitzen eine sofortige Eskalationsregel.
- [ ] Feature-Wünsche und Fehler werden getrennt erfasst.

## 15. Rollback

- [ ] Letzter geprüfter Frontend-Deploy ist identifiziert.
- [ ] Netlify-Beta-Site kann kurzfristig deaktiviert werden.
- [ ] Alle experimentellen und Provider-Flags können ohne Codeänderung deaktiviert werden.
- [ ] Schreibzugriff auf das Beta-Projekt kann kontrolliert gesperrt werden.
- [ ] Datenbank-Wiederherstellung wurde praktisch getestet.
- [ ] Go-live-Abbruchkriterien sind allen Verantwortlichen bekannt.
- [ ] Nach Rollback wird das alte MaklerCRM weiterhin unverändert genutzt.

## Freigabeprotokoll

- Geprüfter Commit:
- Datum und Uhrzeit:
- Prüfer:
- Supabase-Projekt:
- Netlify-Deploy:
- Ergebnis automatisierte Tests:
- Ergebnis manuelle Tests:
- Bekannte akzeptierte Risiken:
- Beta freigegeben: Ja / Nein
- Unterschrift/Freigabevermerk:
