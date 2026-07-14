# VINCERE Netzwerk-, Tippgeber- und Empfehlungsmaschine

## Aktueller Umsetzungsrahmen

Die aktuelle Ausbaustufe arbeitet ausschließlich als deterministisches View-Modell auf den bestehenden VINCERE-Daten:

- Kontakte
- Follow-ups
- Immobilien
- Termine
- Telefonereignisse
- Auditereignisse

Es werden keine neuen zentralen Datentypen, SQL-Tabellen oder parallelen Persistenzwege eingeführt. Der angezeigte Beziehungswert ist keine Abschluss- oder Empfehlungswahrscheinlichkeit. Sämtliche Faktoren, Punkte und Begründungen werden im Cockpit sichtbar ausgewiesen.

## Abgeleitete Netzwerksegmente

Die erweiterten Kategorien werden zunächst aus Rolle, Quelle, Pipeline und dokumentierten Stichworten abgeleitet:

- Tippgeber
- Multiplikator
- Kooperationspartner
- Dienstleister
- Finanzierungsberater
- Notar
- Hausverwaltung
- Handwerker
- lokaler Unternehmer
- ehemaliger Kunde
- privates Netzwerk
- strategischer Kontakt

Diese Segmentierung ist bewusst ein View-Modell. Sie darf später nicht stillschweigend als dauerhaft gespeicherte Wahrheit behandelt werden.

## Fachlicher Empfehlungsablauf

1. Kontakt identifizieren
2. Beziehung, Historie und Datenqualität prüfen
3. einen dokumentierten Anlass erkennen
4. Gesprächsziel und Nutzen vorbereiten
5. Empfehlung passend und konkret anfragen
6. Ergebnis als echte Aktivität dokumentieren
7. nächste Pflegeaktion planen

## Empfohlenes späteres Datenmodell

Sobald die fachlichen Regeln stabil sind, sollte eine eigene Migration in einem separaten Arbeitspaket geprüft werden.

### `network_relationships`

- `id`
- `workspace_id`
- `contact_id`
- `segment`
- `relationship_status`
- `relationship_owner_user_id`
- `preferred_contact_channel`
- `care_cadence_days`
- `last_reviewed_at`
- `created_at`
- `updated_at`

### `referral_requests`

- `id`
- `workspace_id`
- `relationship_id`
- `requested_at`
- `occasion`
- `request_channel`
- `status` (`planned`, `asked`, `accepted`, `declined`, `expired`)
- `result_note`
- `next_action_at`
- `created_by`
- `created_at`

### `referral_opportunities`

- `id`
- `workspace_id`
- `contact_id`
- `rule_code`
- `detected_at`
- `evidence_json`
- `status` (`open`, `dismissed`, `converted`)
- `dismissal_reason`
- `converted_referral_request_id`

### `referrals`

- `id`
- `workspace_id`
- `referrer_contact_id`
- `referred_contact_id`
- `referral_request_id`
- `referred_at`
- `status`
- `related_property_id`
- `outcome`
- `closed_at`

### `relationship_interactions`

Nur dann einführen, wenn die vorhandenen Telefon-, Termin-, Follow-up- und Auditereignisse den fachlichen Bedarf nicht mehr sauber abdecken. Eine doppelte Aktivitätshistorie ist zu vermeiden.

## Integritätsregeln für die spätere Persistenz

- alle Datensätze müssen `workspace_id` tragen
- RLS muss Workspace-Grenzen erzwingen
- Empfehlungsgelegenheiten benötigen einen eindeutigen Schlüssel aus Kontakt, Regelcode und offenem Status
- Kontakte dürfen niemals automatisch zusammengeführt oder gelöscht werden
- eine Referral-Anfrage darf nur über vorhandene Kontakte verknüpft werden
- Änderungen an Segmenten und Ergebnissen müssen auditierbar sein
- View-Modell-Signale dürfen nicht rückwirkend als reale Ereignisse gespeichert werden
