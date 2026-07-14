# VINCERE Datenschutz-, Einwilligungs- und Compliance-Zentrale

## Status und Grenze

Dieses Arbeitspaket liefert eine **technische Prüf- und Workflowgrundlage**. Es ersetzt keine anwaltliche Datenschutzprüfung, keine Datenschutz-Folgenabschätzung und keine Entscheidung einer verantwortlichen Stelle.

Die Implementierung:

- löscht keine Daten,
- erzeugt keinen produktiven Datenexport,
- versendet keine Auskunft,
- behauptet keine Rechtsgrundlage,
- berechnet keine automatische Löschfrist,
- verändert weder Authentifizierung noch Row Level Security,
- führt keine SQL-Migration aus.

## Architektur

### Reine, deterministische Regelengine

`src/domain/privacy/privacyRules.ts` verarbeitet einen expliziten `AppState`, optionale Datenschutzmetadaten und einen expliziten Bewertungszeitpunkt. Dadurch sind alle Befunde reproduzierbar und testbar.

Die Engine trennt strikt:

1. **technischen Befund** – zum Beispiel fehlende Herkunft, unbekannte Einwilligung oder lange Inaktivität,
2. **fachliche Prüfung** – zum Beispiel ob ein aktiver Vorgang fortbesteht,
3. **juristische Entscheidung** – wird nie automatisiert oder simuliert.

### Additives Metadatenmodell

`src/domain/privacy/privacyTypes.ts` beschreibt Einwilligungen, Zwecke, Herkunft, Notizprüfung und Einschränkungen. Diese Metadaten werden in diesem Arbeitspaket **nicht persistent gespeichert**. Die Oberfläche arbeitet deshalb bewusst mit unbekannten Zuständen, sofern kein späterer Adapter Daten liefert.

### Vorschau für Betroffenenanfragen

`prepareSubjectRequestPreview()` unterstützt:

- Datenauskunft,
- Datenexport,
- Berichtigung,
- Einschränkung,
- Löschanfrage,
- Widerspruch,
- Einwilligungswiderruf.

Die Funktion gibt ausschließlich Kategorien, Feldnamen, Datensatzanzahlen, Blocker und empfohlene Prüfschritte zurück. Sie enthält zwei unveränderliche Sicherheitskennzeichen:

- `payloadProduced: false`
- `deletionExecuted: false`

## Dateninventar

| Kategorie | Aktuelle Quelle | Besonderheit |
|---|---|---|
| Kontakte | `AppState.contacts` | Zentraler Personenbezug; Zweck muss separat dokumentiert werden |
| Telefonnummern | `contacts.phone` | Telefon- und Marketingpräferenz dürfen nicht gleichgesetzt werden |
| E-Mail-Adressen | `contacts.email` | Einwilligung und sonstige Verarbeitungszwecke getrennt behandeln |
| Adressen | `contacts.city`, `properties.address` | Kontaktort und Objektadresse sind fachlich verschieden |
| Gesprächsnotizen | `contacts.notes`, `callEvents.note` | Freitext kann unerwartet sensible Inhalte enthalten |
| Follow-ups | `AppState.followUps` | Offene Vorgänge sind Prüfsignale, keine Rechtsgrundlage |
| Termine | `AppState.appointments` | Operativer Kontext ohne automatische rechtliche Bewertung |
| Immobilien | `AppState.properties` | Über Eigentümerbeziehung potenziell personenbezogen |
| Telefonereignisse | `AppState.callEvents` | Kommunikationshistorie und Freitextnotizen |
| Auditdaten | `AppState.auditEvents` | Historische Rolle ist aktuell nicht zuverlässig gespeichert |
| Externe Providerdaten | noch nicht angebunden | Nur als zukünftige Inventarkategorie vorbereitet |

## Verarbeitungszwecke

Vorbereitet sind die Kategorien:

- Vertragsanbahnung (`contract_initiation`)
- Kundenbetreuung (`customer_care`)
- berechtigtes Interesse (`legitimate_interest`)
- Einwilligung (`consent`)
- gesetzliche Pflicht (`legal_obligation`)
- ungeklärt (`unresolved`)

Ein Zweck wird nur als dokumentiert betrachtet, wenn er ausdrücklich in Datenschutzmetadaten vorhanden ist. Aus Pipeline-Stufe, Termin, Follow-up oder Objektbeziehung wird keine Rechtsgrundlage abgeleitet.

## Einwilligungen und Kontaktpräferenzen

Getrennte Kanäle:

- E-Mail
- Telefon
- Messaging
- Marketing

Mögliche Entscheidungen:

- erlaubt
- nicht erlaubt
- widerrufen
- unbekannt

Eine eingetragene Entscheidung ohne Datum oder Quelle wird als **Nachweis unvollständig** markiert. `unbekannt` bedeutet weder erlaubt noch verboten.

## Aufbewahrungs- und Prüflogik

Standardwerte der technischen Regelengine:

- lange Inaktivität: 365 volle Tage,
- Löschprüfungskandidat: 730 volle Tage,
- lange nicht geprüfte Notiz: 730 volle Tage.

Ein Löschprüfungskandidat entsteht nur bei der Kombination:

- Schwelle der Inaktivität erreicht,
- kein dokumentierter Zweck,
- kein offenes Follow-up,
- kein künftiger Termin,
- keine aktive Eigentümer-/Objektbeziehung.

Das Ergebnis ist ausschließlich ein Prüfhinweis. Konfigurationswerte sind keine gesetzlichen Fristen.

## Audit und Rollen

Die bestehende Auditstruktur enthält Benutzer-ID, Workspace, Entität, Aktion, Zusammenfassung und Zeitpunkt. Die Rolle zum Ereigniszeitpunkt fehlt. Die Engine zeigt deshalb:

- die aktuelle Rolle nur beim aktuell angemeldeten Benutzer,
- eine Rolle aus einem ausdrücklich bereitgestellten Rollenverzeichnis,
- ansonsten `unknown`.

Eine heutige Rolle wird nicht rückwirkend als historische Rolle ausgegeben.

## Technische Rollenbegrenzung der Vorschau

- Owner und Administrator: alle Vorschautypen,
- Makler: keine Export- oder Löschvorschau,
- Viewer: keine Vorbereitung von Betroffenenanfragen.

Diese Matrix ist eine technische Sicherheitsbegrenzung und keine Aussage über die rechtlich zuständige Person oder interne Organisationspflichten.

## Notwendige spätere Datenfelder

Ohne Änderung von `domain.ts` oder SQL wurden folgende Erweiterungen identifiziert:

### Kontaktbezogene Datenschutzmetadaten

- `workspace_id`
- `contact_id`
- `data_origin`
- `origin_recorded_at`
- `processing_restricted`
- `restriction_reason`
- `notes_reviewed_at`
- `created_at`
- `updated_at`
- `version`

### Verarbeitungszwecke

- `id`
- `workspace_id`
- `contact_id`
- `purpose_category`
- `decision_status`
- `recorded_at`
- `recorded_by`
- `source`
- `legal_review_reference`
- `valid_from`
- `valid_until`
- `version`

### Einwilligungen und Präferenzen

- `id`
- `workspace_id`
- `contact_id`
- `channel`
- `decision`
- `recorded_at`
- `source`
- `evidence_reference`
- `withdrawn_at`
- `withdrawal_source`
- `version`

### Betroffenenanfragen

- `id`
- `workspace_id`
- `contact_id`
- `request_type`
- `received_at`
- `identity_verification_status`
- `status`
- `assigned_to`
- `due_at`
- `legal_decision`
- `decision_by`
- `decision_at`
- `execution_reference`
- `completed_at`
- `version`

### Export- und Löschvorbereitungen

- `id`
- `workspace_id`
- `subject_request_id`
- `prepared_by`
- `prepared_at`
- `scope_manifest`
- `approval_status`
- `approved_by`
- `approved_at`
- `executed_at`
- `content_hash`

Es sollen keine Rohdaten oder sensiblen Inhalte in technischen Logs abgelegt werden. Manifeste sollten Kategorien, IDs und Hashes enthalten, nicht unkontrollierte Freitextkopien.

### Audit-Erweiterungen

- `actor_role_at_event`
- `request_id`
- `legal_decision_reference`
- `export_manifest_id`
- `compliance_action`
- `result_status`
- `safe_metadata`

## Notwendige spätere SQL- und RLS-Erweiterungen

Für eine produktive Umsetzung sind getrennte, geprüfte Migrationen erforderlich:

1. workspacegebundene Tabellen für Datenschutzmetadaten, Zwecke, Einwilligungen und Betroffenenanfragen,
2. zusammengesetzte Fremdschlüssel mit `workspace_id`, damit kein Kontakt über Workspace-Grenzen referenziert werden kann,
3. RLS für jeden neuen Datensatz,
4. restriktive Rollen für Export- und Löschfreigaben,
5. serverseitige Funktionen für Vorschau, Freigabe und Ausführung,
6. unveränderliche Auditereignisse für Vorbereitung, Entscheidung und Ausführung,
7. keine Ausgabe von Exportinhalten an Browser oder Logs ohne gesonderte Sicherheitsarchitektur,
8. Wiederholungs- und Konfliktschutz über Versionen beziehungsweise idempotente Request-IDs.

Diese Punkte sind dokumentiert, aber nicht implementiert.

## Tests

`tests/privacy-compliance.test.ts` deckt ab:

- unbekannte Einwilligung,
- widerrufene Einwilligung,
- lange Inaktivität,
- fehlende Datenquelle,
- Exportvorschau ohne Payload,
- Löschvorschau ohne Löschung,
- Workspace-Isolation,
- Viewer-Schreibschutz,
- Auditrollen,
- deterministische Regeln.

Alle Testdaten sind vollständig synthetisch und verwenden die reservierte Domain `.invalid`.

## Integration in die Anwendung

Die Seite `PrivacyComplianceCenterPage` ist bewusst noch nicht in die zentrale Router- oder Navigationskonfiguration eingetragen, weil diese Dateien für das Arbeitspaket gesperrt sind. Eine spätere Integration muss in einem eigenen, kontrollierten Paket erfolgen und darf erst stattfinden, wenn die Rollen-, Datenfeld- und SQL-Entscheidungen geprüft sind.
