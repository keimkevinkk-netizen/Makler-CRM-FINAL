# VINCERE – kontrollierter MaklerCRM-Migrationsassistent

## 1. Ziel und Sicherheitsgrenze

Dieses Arbeitspaket bereitet Daten aus exportierten MaklerCRM-LocalStorage-Strukturen für VINCERE auf. Es führt **keine produktive Migration** durch.

Der Assistent:

- verarbeitet ausschließlich eine manuell ausgewählte JSON-Datei oder vollständig synthetische Testdaten,
- liest oder verändert nicht das LocalStorage der alten Anwendung,
- sendet keine Daten an externe Dienste,
- schreibt nicht in das VINCERE-Cloud-Repository,
- verändert keine relationale Tabelle und keine SQL-Migration,
- erzeugt ein deterministisches, herunterladbares Importpaket und einen Migrationsbericht.

Die Implementierung ist unter `apps/vincere/src/features/migration/` und `apps/vincere/src/data/legacy/` abgegrenzt. Die einzige UI-Anbindung ist die additive Einbettung in die Einstellungsseite.

## 2. Analysierte Legacy-Datenquellen

Die Einstufung beruht auf der vorhandenen Schema-Registry, den bestehenden MaklerCRM-Modulen und den dokumentierten Konsolidierungen.

| Bereich | Kanonisch | Parallel / historisch | Bewertung |
|---|---|---|---|
| Kontakte | `kk_crm_contacts` | `kk_eigentuemer`, `kk_crmpro_leads` | Kontakte sind die führende Entität. Eigentümer und Leads können dieselbe Person nochmals enthalten. |
| Tippgeber | `kk_referral_network_v1` | `kk_crm_referrals` | Beide werden in VINCERE-Kontakte mit Rolle Tippgeber/Netzwerk überführt; Identitätsprüfung bleibt erforderlich. |
| Aktivitäten | `kk_crm_activities` | `kk_calls_log_v27` | Allgemeine Aktivitäten bleiben als Erweiterung erhalten; erkennbare Telefonate und Termine werden relational abgebildet. |
| Follow-ups | `kk_followups` | `kk_crm_followups`, `kk_fu_items` | `kk_followups` hat höchste Priorität. Parallele Datensätze werden nicht ungeprüft überschrieben. |
| Immobilien | `kk_crm_objects` | `kk12_objects` | Zentrale Objektdatenbank ist führend. Adress- und ID-Dubletten werden geprüft. |
| Pipeline | `kk_sales_pipeline` | `kk_pipeline_deals`, `kk_sales_pipeline_v15`, `kk_pipeline_module`, `kk_pipeline_production_stages_v1`, `kk_crm_owner_pipeline` | Nur eindeutig verknüpfte Kontaktstufen werden in das aktuelle Kontaktmodell übertragen. Vollständige Einträge bleiben als Erweiterungsdaten erhalten. |
| Bewertungen | — | `kk_valuation_pipeline` | Bewertungschancen bleiben als Erweiterung; rekonstruierbare Termine werden zusätzlich erzeugt. |
| Markt | `kk_market_observations_v1` | `kk_market_monitor_entries_v1` | Markt-/Research-Datensätze werden nicht als normale VINCERE-Immobilien ausgegeben, weil das aktuelle relationale Property-Modell keinen sicheren Datensatztyp dafür besitzt. |

## 3. Gleichbedeutende Felder

Die Normalisierung nutzt defensive Aliasgruppen statt eines einzelnen erwarteten Schemas.

### Kontakt

- ID: `id`, `uid`, `_id`, `contactId`, `contact_id`, `uuid`, `key`
- Name: `firstName`/`lastName`, `vorname`/`nachname`, `fullName`, `name`, `contactName`, `ownerName`
- Telefon: `phone`, `telefon`, `telephone`, `mobile`, `mobil`, `phoneNumber`, `tel`
- E-Mail: `email`, `mail`, `emailAddress`
- Ort: `city`, `ort`, `town`, `location`, verschachtelte `address`/`addr`
- Rolle: `role`, `type`, `category`, `kontaktart`, `kind`
- Pipeline-Stufe: `stage`, `status`, `phase`, `pipelineStage`, `productionStage`, `state`

### Follow-up

- Kontakt: direkte Legacy-ID oder eindeutiger Kontaktname
- Titel: `title`, `task`, `text`, `note`, `subject`, `beschreibung`
- Termin: `dueAt`, `due`, `date`, `datum`, `followUpAt`, `nextActionAt`, `scheduledAt`
- Abschluss: `status`, `done`, `completed`

### Immobilie

- Adresse: `address`, `adresse`, `street`, `strasse`/`straße`, `houseNumber`/`hausnummer`
- Objektart: `type`, `objectType`, `propertyType`, `objektart`, `category`
- Wert: `estimatedValue`, `marketValue`, `value`, `price`, `askingPrice`, `kaufpreis`, `preis`
- Eigentümer: Legacy-ID oder eindeutiger, ausdrücklich als Eigentümer/Kontakt benannter Bezug

## 4. Importpipeline

```text
JSON-Datei
  → sichere JSON-Analyse
  → Exportformat erkennen
  → unterstützte LocalStorage-Keys erkennen
  → Quellform und Datensatzanzahl prüfen
  → Feldwerte normalisieren
  → stabile IDs erzeugen
  → Kontakt- und Immobilien-Dubletten bewerten
  → sichere Dubletten zusammenführen
  → Beziehungen über IDs oder eindeutige Identitäten auflösen
  → operative VINCERE-Datensätze und Erweiterungsdaten erzeugen
  → Warnungen, Fehler und offene Beziehungen sammeln
  → Vorschau, Importpaket und Migrationsbericht erzeugen
```

## 5. Deterministische ID-Erzeugung

IDs beruhen auf einer kanonisch sortierten Repräsentation der relevanten Quelldaten und einem stabilen Hash. Sie verwenden weder aktuelle Uhrzeit noch Zufallswerte. Damit erzeugt dieselbe fachliche Eingabe unabhängig von der JSON-Schlüsselreihenfolge dasselbe Paket.

Beispiele:

- `legacy_contact_<hash>`
- `legacy_property_<hash>`
- `legacy_followup_<hash>`
- `legacy_call_<hash>`
- `legacy_appointment_<hash>`

## 6. Dublettenlogik

### Sicher identisch

Automatische Zusammenführung ist nur vorgesehen bei starken Identitäten:

- belastbare bestehende ID,
- E-Mail und Telefon,
- E-Mail und normalisierter Name,
- Telefon und normalisierter Name,
- Immobilie: normalisierte Adresse und Objektart oder belastbare Objekt-ID.

Bei Feldkonflikten gewinnt die Quelle mit höherer Katalogpriorität. Ergänzende, nicht konfliktierende Informationen werden erhalten.

### Wahrscheinlich identisch

Keine automatische Zusammenführung:

- gleiche E-Mail allein,
- gleiche Telefonnummer allein,
- gleicher Name und Ort,
- Immobilie mit gleicher Adresse, aber abweichender/fehlender Objektart.

### Manuelle Prüfung

Keine automatische Zusammenführung:

- nur gleicher Name,
- nur gleiche Objektbezeichnung und gleicher Ort,
- widersprüchliche oder unvollständige Identitätsfelder.

### Eindeutig getrennt

Datensätze ohne belastbare Überschneidung bleiben getrennt und werden im Bericht als solche ausgewiesen.

## 7. Beziehungsauflösung

Die Reihenfolge lautet:

1. bestehende Legacy-ID innerhalb der Quelle,
2. belastbare globale Legacy-ID,
3. eindeutiger normalisierter Name,
4. optional zusätzliche Eingrenzung durch Telefon oder E-Mail.

Sobald mehrere Kandidaten verbleiben, wird die Beziehung als `unresolvedRelationship` gespeichert. Der Importer rät nicht. Der betroffene Follow-up-Datensatz wird beispielsweise nicht operativ ausgegeben, bleibt aber über Fehlerbericht und Quellindex nachvollziehbar.

## 8. Aktuelles Zielpaket

### Direkt im relationalen VINCERE-Modell darstellbar

- Kontakte einschließlich Rollen Eigentümer, Käufer, Tippgeber und Netzwerk
- Follow-ups
- Immobilien
- Termine
- Telefonereignisse
- technisches Audit-Ereignis des Paketbaus

### Verlustfrei als Erweiterungsdaten erhalten

- allgemeine Aktivitäten
- vollständige Pipeline-Einträge
- Bewertungschancen
- Marktbeobachtungen

Diese Trennung verhindert, dass fachlich verschiedene Legacy-Datensätze in unpassende aktuelle Tabellen gezwungen werden.

## 9. JSON-Sicherheit

Der Parser:

- lehnt ungültiges JSON kontrolliert ab,
- begrenzt Dateigröße, Verschachtelungstiefe und Knotenanzahl,
- blockiert `__proto__`, `prototype` und `constructor`,
- akzeptiert nur reine JSON-Objekte und Arrays,
- führt keine Werte als Code aus,
- behandelt gemischte oder nicht unterstützte Quellformen als Fehler,
- verändert bei Fehlern keinen Anwendungszustand.

## 10. Bewusst nicht veränderte Komponenten

Unverändert bleiben:

- `apps/vincere/src/app/AppStore.tsx`
- `apps/vincere/src/data/cloudRepository.ts`
- `apps/vincere/src/main.tsx`
- Authentifizierungsgrundlage
- SQL-Migrationen
- relationale Tabellen
- alte MaklerCRM-`index.html`

## 11. Später erforderlicher Integrationspunkt

Eine spätere echte Migration benötigt ein eigenes, freizugebendes Arbeitspaket mit:

1. Berechtigungsprüfung `backup:manage` oder einer neuen dedizierten Importberechtigung,
2. bewusster Auswahl/Bestätigung aller wahrscheinlichen Dubletten und offenen Beziehungen,
3. Workspace- und Benutzerzuweisung,
4. serverseitigem Dry Run,
5. atomarer Speicherung in Abhängigkeitsreihenfolge,
6. Konflikt- und Rollback-Strategie,
7. produktivem Migrationsprotokoll.

Der jetzige Assistent liefert dafür ausschließlich das geprüfte Eingabepaket.
