# VINCERE Dokumenten-, Checklisten- und Transaktionsraum

## Zweck und Grenze dieses Arbeitspakets

Dieses Modul schafft eine providerunabhängige, testbare Grundlage für Objektunterlagen und Transaktionschecklisten. Es speichert keine echten Kundendokumente, bindet keinen Cloudspeicher an und verändert weder die zentrale VINCERE-Persistenz noch Authentifizierung, Realtime, Router oder SQL-Migrationen.

Die Oberfläche unter `src/features/transactions/DocumentTransactionRoom.tsx` arbeitet ausschließlich mit synthetischen Demo-Metadaten. Schreibaktionen verändern nur lokalen React-State. Es existiert bewusst kein Datei-Upload-Feld.

## Fachliches Modell

### Dokumenttypen

Der Katalog enthält:

- Grundbuchauszug
- Flurkarte
- Energieausweis
- Grundrisse
- Wohnflächenberechnung
- Baubeschreibung
- Gebäudeversicherung
- Teilungserklärung
- Protokolle
- Mietverträge
- Nebenkostenunterlagen
- Modernisierungsnachweise
- Maklervertrag
- Kaufvertragsentwurf
- Übergabeprotokoll
- sonstige Unterlagen

Nicht sicher zuordenbare Werte werden als `unknown` behandelt. Sie werden nicht automatisch einem fachlichen Standardtyp zugewiesen.

### Dokumentstatus

| Status | Operative Bedeutung |
|---|---|
| vorhanden | Metadaten liegen vor; fachliche Prüfung ist nicht automatisch erfolgt. |
| angefordert | Unterlage wurde angefordert und ist noch nicht eingegangen. |
| fehlt | Erforderliche Unterlage liegt nicht belastbar vor. |
| veraltet | Fassung ist zeitlich oder fachlich nicht mehr ausreichend. |
| unvollständig | Unterlage enthält erkennbare Lücken. |
| geprüft | Unterlage wurde fachlich geprüft und ist für den aktuellen Zweck verwendbar. |
| Prüfung notwendig | Unterlage liegt vor, benötigt aber noch Prüfung. |
| nicht erforderlich | Unterlage ist für Objekt und Phase nachvollziehbar nicht notwendig. |
| abgelehnt | Unterlage wurde wegen Zuordnung, Qualität oder Herkunft nicht akzeptiert. |

## Checklisten und Fortschritt

Für folgende Phasen existieren feste Vorlagen:

1. Erstaufnahme
2. Bewertung
3. Maklerauftrag
4. Vermarktungsstart
5. Besichtigungsphase
6. Kaufvertragsvorbereitung
7. Übergabe
8. Nachbetreuung

Die Fortschrittsberechnung ist deterministisch:

- `not_required` wird aus dem Nenner ausgeschlossen.
- nur `complete` zählt als erledigt.
- bei null anwendbaren Punkten beträgt der Fortschritt 100 Prozent.
- Reihenfolge der Einträge beeinflusst das Ergebnis nicht.

Der Dokumentenfortschritt zählt `vorhanden` und `geprüft` als operativ verfügbar. `nicht_erforderlich` wird aus dem Nenner ausgeschlossen. Diese Kennzahl ist keine rechtliche Freigabe und keine Qualitätswahrscheinlichkeit.

## Providerarchitektur

`DocumentStorageProvider` definiert ausschließlich Verträge für spätere Anbieter:

- Datei hochladen
- Datei laden
- Metadaten lesen
- Version anlegen
- Datei löschen
- Freigabelink erzeugen
- Zugriff widerrufen

Die Schnittstelle bindet jede Operation an `workspaceId`, `propertyId` und `documentId`. Der enthaltene `MockDocumentStorageProvider` ist metadata-only. Er besitzt keine Zugangsdaten, führt keine Netzwerk- oder Dateisystemoperationen aus und kann Fehlerzustände gezielt simulieren.

## Sicherheitsanforderungen für eine spätere produktive Umsetzung

### Speicherung und Transport

- Binärdaten ausschließlich serverseitig oder in einem kontrollierten Object Storage speichern.
- Übertragung ausschließlich verschlüsselt über TLS.
- Keine Service-Role-, Root- oder Provider-Schlüssel im Browser.
- Uploads über kurzlebige, eng begrenzte serverseitig autorisierte Vorgänge.
- Keine dauerhaften oder öffentlichen Objekt-URLs.

### Zugriffskontrolle

- Jede Datei und jede Metadatenoperation muss serverseitig auf `workspace_id` geprüft werden.
- Zusätzlich ist der konkrete Objektbezug über `property_id` zu prüfen.
- Rollenprüfung darf nicht allein auf ausgeblendeten UI-Aktionen beruhen.
- Viewer dürfen lesen, aber keine Uploads, Versionen, Löschungen oder Freigaben auslösen.
- Freigaben müssen zweckgebunden, widerrufbar und zeitlich begrenzt sein.

### Auditierung und Versionierung

Jede produktive Operation benötigt ein unveränderbares Auditereignis mit:

- Workspace
- Objekt
- Dokument
- Version
- Operation
- ausführender Benutzer
- Zeitpunkt
- Ergebnis
- Fehlercode
- Begründung bei Löschung, Ablehnung oder Zugriffswiderruf

Neue Fassungen ersetzen alte Dateien nicht still. Jede Fassung erhält eine eigene Versionsnummer, Prüfsumme, Erstellungszeit und Ersteller-ID.

### Löschfristen

- Aufbewahrungszweck und Rechtsgrundlage je Dokumentklasse definieren.
- Fristbeginn und Fristende speichern.
- Legal Hold und offene Transaktionen müssen Löschung verhindern können.
- Löschung zweistufig ausführen: fachliche Freigabe, danach providerseitige Entfernung.
- Löschvorgang auditieren, ohne die gelöschten Binärdaten im Audit zu duplizieren.

### Virenprüfung und Schutz vor schädlichen Dateien

Produktive Uploads müssen vor Freigabe in Quarantäne bleiben. Erforderlich sind:

- Malware- und Virenscan
- MIME-Erkennung anhand des Inhalts, nicht nur der Dateiendung
- Ablehnung ausführbarer oder aktiver Inhalte
- Schutz gegen Archive Bombs und übermäßige Verschachtelung
- PDF-Prüfung auf eingebettete Skripte, Anhänge und gefährliche Aktionen
- Bild-Neukodierung, wenn Bilder extern bereitgestellt werden
- sicherer Download-Header und erzwungene Dateibehandlung

### Vorgeschlagene Dateitypen und Limits

Für eine erste produktive Stufe sollten ausschließlich folgende Typen zugelassen werden:

- PDF: `application/pdf`
- JPEG: `image/jpeg`
- PNG: `image/png`
- optional später TIFF nach gesonderter Prüfung

Nicht zulassen:

- HTML, SVG und XML mit aktiven Inhalten
- Office-Dateien mit Makros
- ausführbare Dateien
- Skripte
- Archive, solange kein sicherer Entpack- und Scanprozess existiert

Empfohlene Startlimits:

- maximal 25 MB pro Datei
- maximal 250 MB je Objekt-Transaktionsraum ohne gesonderte Freigabe
- maximal 50 Versionen je Dokument
- Dateiname maximal 180 Zeichen
- serverseitiges Timeout und Rate Limit je Workspace und Benutzer

Die Werte sind vor Produktion anhand Provider, Kosten, Datenschutz und Nutzerbedarf zu bestätigen.

## Spätere zentrale Datenfelder

### Tabelle `documents`

- `id uuid`
- `workspace_id uuid`
- `property_id uuid`
- `transaction_id uuid nullable`
- `document_type text`
- `original_document_type text nullable`
- `title text`
- `status text`
- `current_version integer`
- `required_for_phase text[]`
- `requested_at timestamptz nullable`
- `requested_from_contact_id uuid nullable`
- `reviewed_at timestamptz nullable`
- `reviewed_by uuid nullable`
- `review_note text nullable`
- `issued_at date nullable`
- `valid_until date nullable`
- `retention_policy_id uuid nullable`
- `legal_hold boolean`
- `created_at timestamptz`
- `updated_at timestamptz`
- `created_by uuid`
- `updated_by uuid`
- `record_version bigint`

### Tabelle `document_versions`

- `id uuid`
- `workspace_id uuid`
- `property_id uuid`
- `document_id uuid`
- `version integer`
- `provider_id text`
- `provider_key text`
- `file_name text`
- `mime_type text`
- `size_bytes bigint`
- `checksum_sha256 text`
- `scan_status text`
- `scan_result_code text nullable`
- `quarantine_status text`
- `created_at timestamptz`
- `created_by uuid`

### Tabelle `document_access_grants`

- `id uuid`
- `workspace_id uuid`
- `document_id uuid`
- `version_id uuid`
- `purpose text`
- `recipient_reference text nullable`
- `created_by uuid`
- `created_at timestamptz`
- `expires_at timestamptz`
- `revoked_at timestamptz nullable`
- `revoked_by uuid nullable`
- `revoke_reason text nullable`

### Tabelle `transactions`

- `id uuid`
- `workspace_id uuid`
- `property_id uuid`
- `owner_contact_id uuid`
- `phase text`
- `status text`
- `next_action text`
- `next_action_due_at timestamptz nullable`
- `primary_responsible_user_id uuid`
- `started_at timestamptz`
- `completed_at timestamptz nullable`
- `record_version bigint`
- `created_at timestamptz`
- `updated_at timestamptz`

### Tabelle `transaction_checklist_items`

- `id uuid`
- `workspace_id uuid`
- `transaction_id uuid`
- `template_key text`
- `phase text`
- `title text`
- `description text`
- `status text`
- `required_document_type text nullable`
- `responsible_user_id uuid nullable`
- `due_at timestamptz nullable`
- `completed_at timestamptz nullable`
- `completed_by uuid nullable`
- `record_version bigint`

### Tabelle `transaction_tasks`

- `id uuid`
- `workspace_id uuid`
- `transaction_id uuid`
- `document_id uuid nullable`
- `title text`
- `status text`
- `priority text`
- `responsible_user_id uuid`
- `due_at timestamptz`
- `completed_at timestamptz nullable`
- `record_version bigint`

## Integrationsschritte nach Freigabe

1. Fachliche Freigabe der Typen, Status und Checklisten.
2. Datenschutz-, Aufbewahrungs- und Berechtigungskonzept bestätigen.
3. Provider auswählen und serverseitigen Adapter implementieren.
4. SQL-Migration in einem getrennten Arbeitspaket erstellen.
5. RLS, Objekt-Scope und Auditierung serverseitig testen.
6. Malware-Scan und Quarantäneprozess integrieren.
7. Erst danach Router und zentrale Navigation ergänzen.
8. Mit ausschließlich synthetischen Dateien testen.
9. Produktive Dokumente erst nach gesonderter Freigabe zulassen.

## Bewusste Nicht-Umsetzung

- keine echten Dateien
- keine produktiven Dokumentmetadaten
- keine externe Cloud
- keine öffentliche URL
- keine SQL-Migration
- keine Veränderung von `AppStore.tsx`, `cloudRepository.ts`, `domain.ts`, Auth, Realtime oder Router
- kein Merge
- kein Deployment
