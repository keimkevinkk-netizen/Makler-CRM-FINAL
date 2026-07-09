# KEIM CRM PRO – MASTER PRODUCT REQUIREMENTS DOCUMENT
## Teil 3: Informationsarchitektur, technische Architektur und Datenmodell

**Version:** 1.0  
**Stand:** 09. Juli 2026  
**Status:** Verbindliche technische Zielarchitektur für V31 und Folgeversionen  

## 0 Dokumentauftrag, Geltungsbereich und Rangordnung

Teil 3 übersetzt Produktstrategie und UX-Verträge in eine belastbare technische Zielarchitektur. Das Dokument legt fest, wie Navigation, Zustände, Datenmodelle, Speicherung, Provider, Kartenlogik, Integrationen, Migrationen, Sicherheit, Tests und Deployment zusammenwirken. Es beschreibt keine beliebige Idealarchitektur, sondern einen kontrollierten Entwicklungsweg ausgehend von der bestehenden großen Vanilla-JavaScript-Single-File-Anwendung.

Die Architektur muss zwei scheinbar gegensätzliche Anforderungen gleichzeitig erfüllen: Bestehende Nutzerdaten und funktionierende Abläufe dürfen nicht beschädigt werden; zugleich müssen historisch gewachsene Parallelstrukturen, CSS-Schichten und Modulduplikate schrittweise in ein klar verantwortetes System überführt werden. V31 ist deshalb eine Konsolidierungs- und Plattformversion, kein unkontrollierter Komplettneubau.

> **Verbindlicher Architekturgrundsatz:** Keim CRM Pro erhält pro fachlichem Problem genau eine autoritative Datenquelle, einen öffentlichen Vertrag und einen kontrollierten Schreibweg. Neue Oberflächen dürfen dieselben Daten anders darstellen, aber keine zweite Wahrheit erzeugen.

| Rang | Dokument | Technische Bedeutung |
| --- | --- | --- |
| 1 | Teil 1 – Produktstrategie | Bestimmt Zweck, Prioritäten, Nicht-Ziele und Erfolg. |
| 2 | Teil 2 – UX & Design Bible | Bestimmt sichtbare Arbeitsflüsse, Zustände und Interaktionsverträge. |
| 3 | Teil 3 – Architektur & Datenmodell | Bestimmt technische Grenzen, Datenverträge, Persistenz und Integrationen. |
| 4 | ADRs und Modulspezifikationen | Dokumentieren konkrete Entscheidungen innerhalb dieser Leitplanken. |
| 5 | Implementierungsdetails | Dürfen ausgetauscht werden, solange öffentliche Verträge erhalten bleiben. |

- Dieses Dokument gilt für die aktuelle Netlify-/GitHub-Anwendung und eine spätere Modularisierung.
- Bestehende produktive LocalStorage-Daten werden als schützenswert behandelt.
- Die heutige Single-File-Struktur ist ein Auslieferungsformat, nicht zwangsläufig die langfristige Quellcode-Organisation.
- Architekturentscheidungen müssen auf Desktop, iPhone, Offline-Nutzung und öffentliche Netlify-Auslieferung passen.
- Externe Marktdaten und Kartenressourcen gelten als unzuverlässige Netzabhängigkeiten und benötigen klare Fallbacks.

### 0.1 Dokumentensteuerung

| Feld | Festlegung |
| --- | --- |
| Produkt | Keim CRM Pro |
| Dokument | Master PRD – Teil 3: Informationsarchitektur, technische Architektur und Datenmodell |
| Version | 1.0 |
| Status | Verbindliche technische Zielarchitektur für V31 und Folgeversionen |
| Primärer Nutzer | Kevin Keim |
| Aktueller Kern | Vanilla JavaScript, HTML/CSS, lokale Persistenz, Netlify Hosting |
| Ziel | Konsolidierte modulare Architektur bei vollständiger Datenkompatibilität |
| Freigaberegel | Änderungen an Datenverträgen, Storage-Keys oder öffentlichen APIs nur versioniert und dokumentiert |

Die Pflege dieses Dokuments ist Teil der Produkt-Governance. Neue Entitäten, neue Persistenzbereiche, neue Provider oder neue globale Events werden in einem Schema-Register und bei wesentlicher Tragweite zusätzlich in einem Architecture Decision Record dokumentiert.

### 0.2 Arbeitsanweisung an Claude Code

1. Das vollständige Dokument lesen, bevor zentrale Speicherung, Navigation, Datenmodelle oder Provider verändert werden.
2. Zuerst den Istzustand inventarisieren: Storage-Keys, globale APIs, Modulinitialisierungen, Event Listener, aktive und Legacy-Oberflächen.
3. Vor jeder Migration einen exportierbaren Backup-Snapshot und einen reproduzierbaren Testdatensatz erzeugen.
4. Öffentliche Verträge zuerst definieren, dann Implementierung schrittweise dahinter konsolidieren.
5. Keine bestehenden Storage-Keys stillschweigend umbenennen, löschen oder semantisch umdeuten.
6. Keine geheimen API-Schlüssel, privaten Tokens oder personenbezogenen Daten in öffentlich ausgelieferten Quellcode schreiben.
7. Jede Phase mit Datenparität, Import/Export, Offline-Verhalten und Regressionstests abschließen.
8. Bei einem echten Zielkonflikt anhalten, den Konflikt dokumentieren und eine Entscheidung anfordern; nicht raten.

> **Keine Scheinkonsolidierung:** Eine neue Fassade über unverändert konkurrierenden Datenmodellen ist keine Architekturverbesserung. Konsolidierung ist erst erreicht, wenn Schreibwege, IDs, Beziehungen, Migrationen und Verantwortlichkeiten eindeutig sind.

## 1 Executive Architecture Summary

Die Zielarchitektur von Keim CRM Pro ist lokal-first, modular, ereignisorientiert und providerfähig. Der operative Kern – Kontakte, Aktivitäten, Anrufe, Follow-ups, Aufgaben, Objekte und Pipeline – muss auch ohne Internetzugang arbeitsfähig bleiben. Netzabhängige Funktionen wie Basiskarte, externe Marktdaten oder spätere Cloud-Synchronisierung werden über klar abgegrenzte Adapter integriert.

Die Anwendung wird in vier Zustandsebenen getrennt: persistente Nutzerdaten, transiente UI-Zustände, abgeleitete Kennzahlen und entfernte beziehungsweise gecachte Provider-Daten. Diese Ebenen dürfen nicht unkontrolliert ineinander geschrieben werden. Jede Entität erhält stabile IDs, Schema-Versionen, Zeitstempel und nachvollziehbare Beziehungen.

Eine zentrale App-Shell steuert Navigation und Lebenszyklus. Ein Navigationsvertrag öffnet Tabs, Ansichten, Filter und Datensätze. Ein Store-Gateway kontrolliert Lesen, Schreiben, Migration und Change Events. Fachmodule greifen nicht direkt auf beliebige LocalStorage-Keys anderer Module zu, sondern verwenden dokumentierte Repositories oder Services.

| Architektursäule | Verbindliche Wirkung |
| --- | --- |
| Local-first core | Operative Arbeit bleibt bei Netzfehlern verfügbar. |
| One source of truth | Jede Entität besitzt einen autoritativen Store und klaren Schreibweg. |
| Stable contracts | UI, Module und Provider kommunizieren über dokumentierte Schnittstellen. |
| Incremental migration | Bestehende Daten werden schrittweise migriert, nicht per Big Bang. |
| Provider isolation | Externe Quellen können ausgetauscht werden, ohne die UI neu zu schreiben. |
| Truthful data | Quelle, Zeitraum, Aktualität und Qualität sind Bestandteil des Datenmodells. |
| Secure boundaries | Secrets und privilegierte Abrufe liegen serverseitig. |
| Observable behavior | Fehler, Migrationen und Providerläufe sind nachvollziehbar. |

> *„Das Ziel ist nicht maximale technische Komplexität. Das Ziel ist minimale Unklarheit darüber, wer welche Daten besitzt, wie sie sich ändern und wie jede Oberfläche daraus zuverlässig Arbeit erzeugt.“*

## 2 Istzustand und technische Ausgangslage

Die aktuelle Anwendung ist eine sehr große HTML-Datei mit eingebetteten Styles, Scripts, Fallbacks, historischen Versionsschichten und zahlreichen produktiven LocalStorage-Bereichen. Sie enthält bereits wertvolle Plattformbausteine wie KK_BOOT, KK_STORE, Backup-/Import-/Export-Funktionen, Chart-Fallbacks, Kartenadapter, Datenprovider-Grundlagen und zentrale App-Shell-Mechanismen. Diese Substanz wird nicht verworfen.

| Beobachtung | Chance | Risiko |
| --- | --- | --- |
| Single-File-Auslieferung | Einfaches Hosting, offlinefähiger Kern, geringe Toolchain | Hohe Kopplung und schwer kontrollierbare Reihenfolge |
| Viele Storage-Keys | Breiter Funktionsumfang und vorhandene Daten | Doppelte Wahrheiten und uneinheitliche Schemata |
| Mehrere historische Module | Funktionswissen im Code erhalten | Parallelansichten und konkurrierende Initialisierung |
| Globale APIs | Einfacher Zugriff zwischen Modulen | Unklare Verantwortlichkeit und Namenskollisionen |
| Netlify Hosting | Schnelle öffentliche Auslieferung und Functions möglich | Öffentliche App erfordert Datenschutz- und Secret-Disziplin |
| Lokale Speicherung | Schnell und offline nutzbar | Gerätegebunden, Backup und spätere Sync-Konflikte nötig |
| Vorhandene Kartenadapter | Guter Startpunkt für echte Karte | Dritte Kartenengine würde Fragmentierung erhöhen |

> **Migrationshaltung:** Der bestehende Code ist nicht „falsch“, weil er gewachsen ist. Er ist der produktive Ausgangspunkt. V31 führt klare Grenzen ein, ohne die Anwendung durch ein ideologisches Komplett-Refactoring zu destabilisieren.

### 2.1 Bekannte zentrale Plattformbausteine

| Baustein | Zielrolle in V31 |
| --- | --- |
| KK_BOOT | Einmaliger, idempotenter Bootstrap und Modul-Lebenszyklus. |
| KK_STORE | Zentrales Persistenz-Gateway mit Schema-, Migrations- und Eventunterstützung. |
| KK_DATA_CORE | Provider-, Cache- und Datenqualitätsgrundlage für entfernte Daten. |
| KK_MAP / MapAdapter | Öffentlicher Kartenvertrag und austauschbare Engine. |
| App-Shell / Tab-Registry | Autoritative Navigation und Sichtbarkeit der Hauptmodule. |
| Backup / Import / Export | Sicherung, Portabilität und Migrationsschutz. |
| Chart-Fallback | Resiliente Visualisierung bei externer Ressourcenstörung. |
| Command Center | Globale Suche und Navigation, jedoch kein zweiter Router. |

Wo ein Baustein bereits einen geeigneten öffentlichen Vertrag besitzt, wird er erweitert. Wo er nur implizit oder inkonsistent existiert, wird der Vertrag zuerst dokumentiert und danach vereinheitlicht.

## 3 Zielarchitektur auf Systemebene

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APP SHELL / KK_BOOT                          │
│ Navigation · Lifecycle · Error Boundary · Feature Flags · Status    │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │                               │
┌───────────────▼──────────────┐  ┌────────────▼──────────────────────┐
│       PRESENTATION LAYER      │  │        NAVIGATION / EVENTS        │
│ Views · Components · Panels   │  │ KK_NAV · Event Bus · Deep Links   │
└───────────────┬──────────────┘  └────────────┬──────────────────────┘
                │                               │
┌───────────────▼───────────────────────────────▼─────────────────────┐
│                     APPLICATION SERVICES                            │
│ ContactService · FollowUpService · CallService · PipelineService    │
│ MarketService · BackupService · SearchService · MigrationService    │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │                               │
┌───────────────▼──────────────┐  ┌────────────▼──────────────────────┐
│      LOCAL DATA LAYER         │  │        REMOTE PROVIDER LAYER      │
│ KK_STORE · Repositories       │  │ Netlify Functions · Adapters      │
│ LocalStorage / later IndexedDB│  │ Cache · Source Registry · GeoJSON │
└───────────────────────────────┘  └───────────────────────────────────┘
```

Die Schichten sind Verantwortungsgrenzen, keine Pflicht zu einem bestimmten Framework. Auch in einer Single-File-Auslieferung können sie über Namespaces, Module, Repositories und kontrollierte Initialisierung eingehalten werden.

| Schicht | Darf | Darf nicht |
| --- | --- | --- |
| Presentation | Daten anzeigen, Benutzerereignisse senden, UI-Zustand halten | beliebige Fremd-Keys direkt schreiben |
| Application Services | Fachregeln, Validierung, Orchestrierung, Events | DOM-Strukturen besitzen |
| Repositories | Entitäten lesen/schreiben, Schemata migrieren | fachliche UI-Entscheidungen treffen |
| Provider | externe Daten abrufen und normalisieren | operative CRM-Daten verändern |
| App Shell | Navigation und Modul-Lifecycle steuern | Modulinterne Fachlogik duplizieren |

## 4 Architekturprinzipien

| Nr. | Prinzip | Verbindliche Konsequenz |
| --- | --- | --- |
| 01 | Eine autoritative Quelle | Ein Datentyp besitzt einen kanonischen Store. Legacy-Keys werden adaptiert oder migriert. |
| 02 | Schreiben nur über Services | UI-Komponenten verändern keine fremden Daten direkt. |
| 03 | Lesen darf optimiert sein | Abgeleitete Views und Indizes sind erlaubt, aber neu erzeugbar. |
| 04 | Schema vor Oberfläche | Neue Felder werden zuerst im Datenvertrag definiert. |
| 05 | Stabile IDs | Beziehungen verwenden IDs, nicht Namen, Tabellenzeilen oder Arraypositionen. |
| 06 | Zeit ist explizit | Created, Updated, Due, Completed und Fetched werden getrennt modelliert. |
| 07 | Soft Migration | Altdaten bleiben lesbar, bis Migration und Backup bestätigt sind. |
| 08 | Idempotente Initialisierung | Mehrfaches Starten erzeugt keine doppelten Listener oder Datensätze. |
| 09 | Events statt DOM-Kopplung | Module reagieren auf fachliche Ereignisse, nicht auf fremde CSS-Selektoren. |
| 10 | Remote ist unzuverlässig | Timeout, Cache, Stale State und Offline sind Standardfälle. |
| 11 | Secrets serverseitig | Schlüsselpflichtige Provider niemals direkt aus dem Browser aufrufen. |
| 12 | Abgeleitet ist nicht persistent nötig | KPIs und Prioritätslisten werden aus Grunddaten berechnet, wenn praktikabel. |
| 13 | Auditierbare Änderungen | Kritische Schreibvorgänge besitzen Quelle und Zeitstempel. |
| 14 | Datensparsamkeit | Nur fachlich notwendige personenbezogene Daten speichern. |
| 15 | Kompatibilität ist ein Feature | Alte Backups und bestehende Nutzerdaten werden getestet. |
| 16 | Keine stille Magie | Automatische Migration, Refresh und Vorschläge werden sichtbar protokolliert. |
| 17 | Austauschbare Infrastruktur | Karte, Provider und Hostingdetails liegen hinter Adaptern. |
| 18 | Testbare Verträge | Services und Datenmodelle können ohne vollständige UI geprüft werden. |

## 5 Informationsarchitektur als technischer Vertrag

Die in Teil 2 festgelegte Hauptnavigation wird technisch über eine autoritative Tab-Registry abgebildet. Jeder Hauptbereich besitzt eine stabile ID, eine Mount-Funktion, eine optionale Unmount-/Pause-Funktion, unterstützte Views und einen Deep-Link-Parser.

| Tab-ID | Fachbereich | Beispiel-Views |
| --- | --- | --- |
| today | Heute | default, calls, urgent, appointments |
| crm | Kontakte | list, leads, owners, detail |
| followups | Follow-ups | due, overdue, upcoming, completed |
| pipeline | Pipeline | board, list, stagnant, stage |
| market | Markt | map, compare, sources, data-quality |
| referrals | Tippgeber | partners, activity, pipeline |
| more | Mehr | kpi, prompts, scripts, knowledge, backup, settings |

Bestehende Hashes wie `#crm`, `#followup` oder `#markt` werden in einer Alias-Tabelle auf die neuen kanonischen Tab-IDs abgebildet. Alias-Unterstützung ist eine Kompatibilitätsschicht und erzeugt keine zweite Navigation.

### 5.1 Tab-Registry-Vertrag

```
KK_APP.registerTab({
  id: "crm",
  aliases: ["contacts", "kontakte"],
  title: "Kontakte",
  mount(context) { /* render or activate */ },
  pause() { /* stop heavy observers */ },
  accepts: ["list", "leads", "owners", "detail"],
  defaultView: "list"
});
```

- `id` ist stabil und wird nicht für Marketingbegriffe geändert.
- `aliases` dienen ausschließlich der Rückwärtskompatibilität.
- `mount` ist idempotent und darf mehrfach aufgerufen werden.
- `pause` stoppt Karten-, Chart- oder Observerarbeit, ohne Nutzerdaten zu verlieren.
- Unbekannte Views fallen kontrolliert auf `defaultView` zurück und erzeugen eine Diagnosemeldung.

## 6 Zentraler Navigationsvertrag – KK_NAV

V31 führt `KK_NAV` als additive, zentrale Schnittstelle ein. Sie ersetzt verstreute direkte Tab-Klicks, `location.hash`-Sonderfälle und DOM-basierte Fremdsteuerung. Bestehende Mechanismen werden intern angebunden, bis sie vollständig migriert sind.

```
KK_NAV.open({
  tab: "followups",
  view: "due",
  filters: {
    due: "today_or_overdue",
    status: "open"
  },
  focusId: "fu_01J...",
  source: "dashboard",
  returnTo: { tab: "today", view: "default" },
  history: "push"
});
```

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| tab | string | Kanonische Tab-ID. |
| view | string? | Unteransicht des Zielmoduls. |
| filters | object? | Serialisierbare sichtbare Filter. |
| focusId | string? | Datensatz, der geöffnet oder hervorgehoben wird. |
| source | string? | Navigationsquelle für Rückkehr und Diagnose. |
| returnTo | object? | Expliziter Rückkehrkontext. |
| history | push|replace|none | Steuerung der Browser-Historie. |
| transient | object? | Nicht persistente UI-Hinweise. |

> **Deep-Link-Abnahme:** Eine Navigation gilt erst als erfolgreich, wenn Zieltab, View, Filteranzeige und fokussierter Datensatz übereinstimmen. Ein bloßer Tabwechsel erfüllt den Vertrag nicht.

### 6.1 URL-, Hash- und Session-Strategie

| Zustandsart | Speicherort | Beispiel |
| --- | --- | --- |
| Teilbarer Navigationszustand | URL/Hash | Tab, View, einfache Filter, Record-ID |
| Kurzlebiger Arbeitskontext | sessionStorage | Rückkehrhinweis, Scrollposition, einmalige Hervorhebung |
| Nutzerpräferenz | localStorage über SettingsRepository | letzte Ansicht, Dichte, Kartenlayer |
| Fachdaten | kanonisches Repository | Kontakt, Follow-up, Pipeline |
| Nicht serialisierbar | Memory State | DOM-Referenzen, laufende Controller |

Sensitive Informationen werden nicht in URL-Parametern abgelegt. Filterwerte werden auf bekannte Enums begrenzt und validiert. Unbekannte oder manipulierte Parameter dürfen weder Fehler noch Datenänderungen auslösen.

## 7 Ereignisarchitektur

Module kommunizieren über fachlich benannte Events. Ein schlanker Event Bus reicht aus; er muss jedoch Namensraum, Payload-Vertrag und Abmeldung unterstützen. DOM Custom Events können intern verwendet werden, solange ein zentraler Wrapper die Verträge kontrolliert.

```
KK_EVENTS.emit("followup.completed", {
  followupId: "fu_01J...",
  contactId: "ct_01J...",
  completedAt: "2026-07-09T08:42:00+02:00",
  result: "reached",
  source: "mobile-sheet"
});
```

| Event | Auslöser | Typische Reaktionen |
| --- | --- | --- |
| contact.created | Kontakt gespeichert | CRM aktualisieren, Suchindex aktualisieren |
| contact.updated | Stammdaten geändert | Details, Listen und Karte neu rendern |
| activity.recorded | Anruf/Notiz/E-Mail protokolliert | Kontaktverlauf und letzte Aktivität aktualisieren |
| followup.created | Wiedervorlage angelegt | Dashboard- und Follow-up-Zähler aktualisieren |
| followup.completed | Wiedervorlage erledigt | Aktivität schreiben, Queue neu sortieren |
| call.completed | Anrufergebnis gespeichert | Call Log, Kontakt und Tagesfortschritt aktualisieren |
| pipeline.changed | Deal geändert oder verschoben | Board, KPI und Risiko neu berechnen |
| market.refreshed | Providerlauf erfolgreich | Marktansicht und Aktualitätsstatus aktualisieren |
| store.migrated | Schema migriert | Diagnose und Backupstatus aktualisieren |
| app.online.changed | Netzstatus geändert | Provider und UI-Status anpassen |

- Events verwenden Vergangenheitsform für abgeschlossene Tatsachen.
- Events enthalten IDs und minimale notwendige Metadaten, keine vollständigen mutierbaren Objekte.
- Listener müssen bei Unmount oder erneuter Initialisierung sauber entfernt werden.
- Events sind keine Ersatzdatenbank; verlorene Events dürfen den dauerhaften Zustand nicht inkonsistent machen.

## 8 Zustandsmodell

| Ebene | Beispiele | Lebensdauer | Autorität |
| --- | --- | --- | --- |
| Persistente Fachdaten | Kontakte, Aktivitäten, Follow-ups, Deals | dauerhaft | Repositories / KK_STORE |
| Nutzerpräferenzen | Dichte, Kartenlayer, Tagesmodus | dauerhaft | SettingsRepository |
| Transiente UI-Zustände | aktives Panel, Auswahl, Filterquelle | Sitzung oder View | View State / sessionStorage |
| Abgeleitete Daten | KPIs, überfällige Anzahl, Stagnation | neu berechenbar | Selectors / Services |
| Remote Snapshots | Marktdaten, Geometrien, Providerstatus | TTL-gebunden | Provider Cache |
| Runtime State | Controller, Listener, Map-Instanz | bis Unmount | Modul-Lifecycle |

Persistente und abgeleitete Zustände werden nicht vermischt. Beispielsweise wird „überfällig“ aus Fälligkeitsdatum und Abschlussstatus berechnet; es ist kein dauerhaftes Freitextfeld, das veralten kann. Ein manueller Risikostatus darf zusätzlich existieren, muss aber als manuell gekennzeichnet sein.

## 9 KK_STORE als Persistenz-Gateway

`KK_STORE` wird zum kontrollierten Gateway für lokale persistente Daten. Direkte `localStorage.getItem`- und `setItem`-Aufrufe werden außerhalb von Kompatibilitätsadaptern schrittweise reduziert. Das Gateway übernimmt Parsing, Defaultwerte, Schema-Versionen, Migrationen, atomar wirkende Schreibsequenzen, Change Events und Diagnose.

```
KK_STORE.define({
  key: "kk_crm_contacts",
  schemaVersion: 3,
  defaultValue: [],
  validate: validateContactCollection,
  migrations: {
    1: migrateContactsV1toV2,
    2: migrateContactsV2toV3
  }
});

const contacts = KK_STORE.read("kk_crm_contacts");
KK_STORE.write("kk_crm_contacts", nextContacts, {
  reason: "contact.updated",
  actor: "local-user"
});
```

| Funktion | Pflichtverhalten |
| --- | --- |
| define | registriert Key, Schema, Default, Validator und Migrationen |
| read | parst sicher, validiert, migriert bei Bedarf und liefert Kopie |
| write | validiert vor Speicherung, aktualisiert Metadaten und emittiert Change Event |
| update | führt kontrollierte Read-Modify-Write-Operation aus |
| remove | nur für explizit löschbare Settings/Cachebereiche; Fachdaten über Services |
| snapshot | erzeugt konsistenten Export über registrierte Bereiche |
| diagnose | meldet Parsefehler, unbekannte Version und ungültige Daten |
| subscribe | informiert über Änderungen eines Keys oder Bereichs |

### 9.1 LocalStorage-Grenzen und spätere IndexedDB-Option

V31 darf weiterhin LocalStorage verwenden, solange Datenmenge, Synchronität und Performance tragbar bleiben. Große Geometrien, Provider-Snapshots, Attachments oder umfangreiche Aktivitätsverläufe dürfen in eine abstrahierte IndexedDB-Schicht ausgelagert werden. Die Fachmodule dürfen den konkreten Speicherort nicht kennen.

| Datenart | V31 Standard | Spätere Option |
| --- | --- | --- |
| Kontakte und Follow-ups | LocalStorage über Repository | IndexedDB bei deutlich größerem Volumen |
| Kleine Settings | LocalStorage | unverändert |
| GeoJSON / große Snapshots | Cache Storage oder IndexedDB | versionierter lokaler Datencache |
| Dateianhänge | nicht in LocalStorage | IndexedDB oder Cloud Object Storage |
| Backupdateien | Download/Upload durch Nutzer | verschlüsselte Cloudablage später |

> **Keine vorzeitige Datenbankmigration:** IndexedDB wird nicht eingeführt, nur weil sie technisch moderner ist. Sie wird eingeführt, wenn Datenmenge, atomare Transaktionen, Querybedarf oder Dateispeicherung den zusätzlichen Aufwand rechtfertigen.

## 10 Schema-Registry und Datenverträge

Jeder kanonische Storage-Bereich wird in einer zentralen Schema-Registry dokumentiert. Das Register enthält Eigentümermodul, Schema-Version, Primärentität, Validator, Migrationen, Backup-Einbezug und Sensitivitätsklasse.

| Feld | Beispiel |
| --- | --- |
| key | kk_crm_contacts |
| owner | crm |
| schemaVersion | 3 |
| entity | Contact[] |
| validator | validateContactCollection |
| migrations | v1→v2, v2→v3 |
| backup | required |
| sensitivity | personal |
| retention | user-controlled |
| legacyAliases | kk_crmpro_leads, kk_eigentuemer |

Die Schema-Registry ist maschinenlesbar. Backup, Import, Datenqualitätsprüfung und Diagnose verwenden dieselbe Registry, damit neue Keys nicht vergessen werden.

## 11 ID-Strategie und Referenzintegrität

Alle kanonischen Entitäten besitzen stabile, kollisionsarme String-IDs. Empfohlen sind zeit-sortierbare ULID-ähnliche IDs oder UUIDs mit Präfix. Namen, Telefonnummern und Array-Indizes sind keine Identitäten.

| Entität | Präfix | Beispiel |
| --- | --- | --- |
| Contact | ct_ | ct_01J2X... |
| Activity | ac_ | ac_01J2X... |
| FollowUp | fu_ | fu_01J2X... |
| Call | cl_ | cl_01J2X... |
| Task | tk_ | tk_01J2X... |
| Object | ob_ | ob_01J2X... |
| Deal | dl_ | dl_01J2X... |
| ReferralPartner | rp_ | rp_01J2X... |
| Area | ar_ | ar_mkk_bruchkoebel |
| MarketSnapshot | ms_ | ms_01J2X... |

- IDs werden einmal erzeugt und nicht bei Bearbeitung geändert.
- Importierte Altdaten ohne ID erhalten deterministisch protokollierte neue IDs.
- Beziehungen speichern ausschließlich IDs und optional einen Snapshot für Anzeige, nie nur Freitext.
- Löschung prüft abhängige Entitäten und bietet Archivierung beziehungsweise kontrolliertes Cascade-Verhalten.
- Der Datenqualitätsdienst findet verwaiste Referenzen und doppelte Identitäten.

## 12 Gemeinsame Metadaten aller Entitäten

```
{
  "id": "ct_01J...",
  "schemaVersion": 3,
  "createdAt": "2026-07-09T08:00:00+02:00",
  "updatedAt": "2026-07-09T08:35:00+02:00",
  "createdBy": "local-user",
  "updatedBy": "local-user",
  "source": "manual",
  "status": "active",
  "archivedAt": null
}
```

| Feld | Regel |
| --- | --- |
| schemaVersion | Version der Entitätsstruktur, nicht der gesamten App. |
| createdAt | Unveränderlicher ISO-Zeitstempel. |
| updatedAt | Bei fachlicher Änderung aktualisiert. |
| createdBy / updatedBy | Heute lokaler Nutzer; später Account-ID. |
| source | manual, import, migration, provider oder integration. |
| status | fachlich definierter Zustand; kein beliebiger Freitext. |
| archivedAt | Soft-Archive statt ungeprüfter physischer Löschung. |

Zeitstempel werden intern als ISO 8601 mit Zeitzonenbezug gespeichert. Anzeigeformatierung erfolgt ausschließlich in der Presentation Layer und berücksichtigt die Nutzerzeitzone.

## 13 Kanonisches Kontaktmodell

```
Contact {
  id, schemaVersion, createdAt, updatedAt,
  person: {
    firstName, lastName, organization, role,
    phones[], emails[], preferredChannel
  },
  classification: {
    contactType, lifecycleStatus, leadStatus, ownerStatus
  },
  location: {
    street, postalCode, city, areaId, geoPrecision
  },
  relationship: {
    source, sourceDetail, referralPartnerId, consentStatus
  },
  nextAction: { type, dueAt, note, followupId },
  tags[], notes, archivedAt
}
```

| Bereich | Verbindliche Regeln |
| --- | --- |
| Person | Name nicht als einzelnes Pflichtfeld erzwingen; Organisationen unterstützen. |
| Telefon/E-Mail | Mehrfachwerte möglich, ein bevorzugter Kanal. |
| Klassifikation | Enums und klar definierte Übergänge statt frei wachsender Statusbegriffe. |
| Ort | `areaId` verknüpft Markt und CRM; Geogenauigkeit wird dokumentiert. |
| Quelle | Tippgeber- oder Kampagnenbezug über ID. |
| Nächste Aktion | Bevorzugt aus offenem Follow-up abgeleitet; kein zweiter unverbundener Termin. |
| Notizen | Nutzereingaben sicher darstellen; sensible Inhalte minimieren. |

### 13.1 Kontaktstatus und Klassifikationen

| Dimension | Beispielwerte | Zweck |
| --- | --- | --- |
| contactType | person, organization | Grundtyp |
| lifecycleStatus | lead, active, customer, partner, inactive | Beziehungsphase |
| leadStatus | new, contacted, qualified, unqualified, nurturing | Vertriebsstatus |
| ownerStatus | unknown, potential, active-mandate, past-client | Eigentümerbezug |
| consentStatus | unknown, legitimate-interest, consented, opted-out | Kommunikationsgrundlage |
| archiveReason | duplicate, invalid, no-longer-relevant, requested | Nachvollziehbares Archiv |

Statusdimensionen werden nicht zu einem einzigen unübersichtlichen Feld vermischt. UI darf eine vereinfachte Zusammenfassung anzeigen, die Grunddaten bleiben jedoch getrennt.

## 14 Aktivitätsmodell

```
Activity {
  id, contactId, objectId?, dealId?,
  type: "call" | "email" | "meeting" | "note" | "document",
  occurredAt,
  direction: "inbound" | "outbound" | "internal",
  outcome?, summary, details?,
  relatedFollowupId?, relatedCallId?,
  createdAt, source
}
```

- Aktivitäten sind unveränderliche oder kontrolliert editierbare Verlaufseinträge.
- `occurredAt` beschreibt das Ereignis; `createdAt` die Erfassung.
- Ein Anrufabschluss erzeugt genau eine Aktivität und referenziert den Call-Datensatz.
- Follow-up-Abschluss und Aktivität dürfen nicht doppelt aus mehreren Listenern geschrieben werden.
- Große Freitexte werden sicher gerendert und in Exporten eindeutig gekennzeichnet.

## 15 Follow-up-Modell

```
FollowUp {
  id, contactId,
  type: "call" | "email" | "meeting" | "task" | "other",
  title, purpose, dueAt,
  status: "open" | "completed" | "cancelled",
  priority: "normal" | "high" | null,
  relatedObjectId?, relatedDealId?,
  completedAt?, completionResult?,
  snoozedFrom?, createdAt, updatedAt
}
```

| Regel | Begründung |
| --- | --- |
| DueAt als Datum/Zeit | Überfälligkeit kann zuverlässig berechnet werden. |
| Status getrennt von Ergebnis | „completed“ und „not reached“ sind unterschiedliche Dimensionen. |
| Snooze protokollieren | Verschiebungen bleiben nachvollziehbar. |
| Kontaktbezug verpflichtend, sofern fachlich möglich | Follow-up bleibt im Beziehungskontext. |
| Kein automatisch erfundener Follow-up | Automatisierung darf Vorschläge machen, nicht unbemerkt Pflichten erzeugen. |

## 16 Anruf- und Call-Queue-Modell

```
CallItem {
  id, contactId,
  reason, goal,
  scheduledAt?, dueDate?,
  status: "queued" | "in-progress" | "completed" | "skipped",
  phoneId?, source,
  attempts: [{ at, outcome, note }],
  completedAt?, nextFollowupId?
}
```

`kk_call_queue` ist die kanonische operative Queue. `kk_calls_log_v27` kann als Verlauf beziehungsweise Legacy-Quelle angebunden werden. Ein Service stellt sicher, dass Queue-Abschluss, Call Log, Aktivität, Tagesfortschritt und optionaler neuer Follow-up in einer kontrollierten Operation aktualisiert werden.

| Operation | Schreibfolgen |
| --- | --- |
| Anruf gestartet | Queue-Status in-progress, Runtime-Timer optional |
| Erreicht | Attempt + completed, Aktivität, optional Folgeaktion |
| Nicht erreicht | Attempt, Status queued oder completed gemäß Auswahl, Wiedervorlage |
| Übersprungen | Status skipped mit Grund; kein falscher Erfolg |
| Direktanruf aus Kontakt | CallItem oder Activity nach Ergebnisdialog erzeugen |

## 17 Aufgabenmodell

```
Task {
  id, title, description?,
  status: "open" | "completed" | "cancelled",
  priority: "A" | "B" | "C" | null,
  dueAt?,
  contactId?, objectId?, dealId?,
  source: "manual" | "workflow" | "import",
  completedAt?, createdAt, updatedAt
}
```

Aufgaben und Follow-ups bleiben unterscheidbar: Follow-ups beziehen sich primär auf eine zukünftige Kontakt- oder Beziehungshandlung; Tasks können interne administrative Arbeit abbilden. Die Oberfläche darf beide in „Jetzt erledigen“ zusammenführen, ohne ihre Datenmodelle zu vermischen.

## 18 Objektmodell

```
RealEstateObject {
  id, title,
  address: { street, postalCode, city, areaId, lat?, lng?, precision },
  type, usageType,
  facts: { livingArea?, lotArea?, rooms?, yearBuilt? },
  ownership: { primaryContactId?, additionalContactIds[] },
  status, valuationId?, activeDealId?,
  notes, createdAt, updatedAt, archivedAt
}
```

- Exakte Koordinaten und Privatadressen werden nur gespeichert, wenn fachlich notwendig.
- Öffentliche Kartenlayer verwenden mindestens aggregierte beziehungsweise datenschutzgerechte Darstellung.
- Objekt, Bewertung und Verkaufschance sind getrennte Entitäten mit klaren Beziehungen.
- Ortszuordnung verwendet stabile `areaId`, nicht nur frei eingegebenen Ortsnamen.

## 19 Pipeline- und Deal-Modell

```
Deal {
  id, type: "sales" | "valuation" | "referral",
  title, contactIds[], objectId?,
  stageId, status: "open" | "won" | "lost" | "archived",
  value: { amount?, currency, basis? },
  nextAction: { type, dueAt, note, followupId? },
  stageEnteredAt,
  lastActivityAt?,
  lostReason?, wonAt?, lostAt?,
  createdAt, updatedAt
}
```

| Feld | Bedeutung |
| --- | --- |
| type | Erlaubt gemeinsame Grundstruktur bei getrennten Stage-Konfigurationen. |
| stageId | Verweist auf versionierte Pipeline-Konfiguration. |
| stageEnteredAt | Grundlage für transparente Stagnationslogik. |
| lastActivityAt | Aus Aktivitäten ableitbar oder beim Schreiben aktualisiert. |
| value.basis | Kennzeichnet Schätzung, Angebot, Courtage oder erwarteten Umsatz. |
| nextAction | Verknüpft Dealsteuerung mit tatsächlicher Arbeit. |

Bestehende Keys wie `kk_sales_pipeline`, `kk_sales_pipeline_v15`, `kk_valuation_pipeline`, `kk_referral_pipeline` und weitere Legacy-Pipelinebereiche werden über Adapter inventarisiert. V31 definiert eine kanonische Deal-Sicht, ohne historische Daten unkontrolliert zusammenzuwerfen.

### 19.1 Pipeline-Stage-Konfiguration

```
PipelineDefinition {
  id: "sales-default",
  version: 2,
  stages: [
    { id: "lead", label: "Lead", order: 10, staleAfterDays: 7 },
    { id: "qualified", label: "Qualifiziert", order: 20, staleAfterDays: 10 },
    { id: "valuation", label: "Bewertung", order: 30, staleAfterDays: 14 },
    { id: "mandate", label: "Auftrag", order: 40, staleAfterDays: 21 }
  ]
}
```

Stages sind konfigurierbar, aber nicht frei pro Datensatz. Migrationen bei Stage-Änderungen benötigen Mappingregeln. Stagnation wird aus `stageEnteredAt`, `lastActivityAt`, offenem Follow-up und konfiguriertem Richtwert berechnet und zeigt die konkrete Ursache.

## 20 Tippgeber- und Empfehlungsmodell

```
ReferralPartner {
  id, contactId,
  partnerType, status,
  relationshipSince?,
  preferredContactCadence?,
  lastContactAt?, nextContactAt?,
  referralsGivenIds[], referralsReceivedIds[],
  notes, createdAt, updatedAt
}
```

Tippgeber verwenden den bestehenden Kontakt als Personenquelle. Partnerdaten erweitern die Beziehung und duplizieren keine Telefonnummern oder Adressen. Empfehlungsereignisse werden als eigene Entitäten oder klar strukturierte Aktivitäten modelliert.

> **Kein Personenranking:** Die Architektur unterstützt keine intransparenten Personen-Scores oder A/B/C-Klassen. Pflegebedarf entsteht aus realen Kontaktzeitpunkten, vereinbarter Kadenz und offenen Vorgängen.

## 21 Gebiets- und Geodatenmodell

```
Area {
  id: "ar_mkk_bruchkoebel",
  name: "Bruchköbel",
  type: "municipality",
  parentAreaId: "ar_mkk",
  officialCode?,
  centroid: { lat, lng },
  bounds?,
  geometryRef?,
  source: { name, version, license },
  updatedAt
}
```

| Aspekt | Regel |
| --- | --- |
| Stabile Area-ID | CRM, Karte und Marktdaten verwenden dieselbe ID. |
| Geometrie getrennt | Große Polygone liegen als referenzierte Ressource, nicht in jedem Datensatz. |
| Quelle und Lizenz | Sind verpflichtender Bestandteil der Geometriedefinition. |
| Centroid | Dient Fallback und Marker, ersetzt keine Grenze. |
| Hierarchie | MKK → Kommune → optional Stadtteil/Gemarkung. |
| Namensalias | Rechtschreibvarianten werden auf Area-ID normalisiert. |

## 22 Marktdatenmodell

```
MarketMetricSnapshot {
  id, areaId,
  metric: "asking_price_sqm",
  value, unit: "EUR/m²",
  period: "2026-06",
  observedAt, fetchedAt,
  source: { id, name, url?, license? },
  quality: {
    status: "verified" | "estimated" | "stale" | "missing",
    sampleSize?, confidence?, notes?
  },
  providerPayloadVersion,
  createdAt
}
```

- Ein Snapshot wird nicht durch den nächsten Abruf überschrieben, wenn historische Entwicklung benötigt wird.
- UI wählt den aktuellsten validen Snapshot pro Area und Metric.
- `observedAt` beziehungsweise `period` beschreibt fachlichen Stand; `fetchedAt` nur den Abrufzeitpunkt.
- Forecasts verwenden eine separate Entität und werden nie als Istwert gespeichert.
- Manuell gepflegte Referenzwerte werden als eigene Quelle mit Status „manual-reference“ gekennzeichnet.

### 22.1 Forecast-Modell

```
MarketForecast {
  id, areaId, metric,
  horizon, generatedAt,
  model: { id, version, method },
  inputSnapshotIds[],
  estimate, lowerBound?, upperBound?, unit,
  assumptions[],
  quality: { status, notes }
}
```

Forecasts sind optional und werden erst produktiv angezeigt, wenn Methode, Inputs und Unsicherheit dokumentiert sind. Die Architektur verhindert, dass Prognosen dieselbe Struktur oder Farbe wie beobachtete Werte erhalten.

## 23 Datenbeziehungen und fachlicher Graph

```
Contact ──< Activity
   │
   ├──< FollowUp
   ├──< CallItem
   ├──< Task
   ├──< Deal >── RealEstateObject
   └── ReferralPartner

Area ──< Contact / Object
Area ──< MarketMetricSnapshot
Area ── GeometryRef
```

Der fachliche Graph erlaubt kontextbezogene Navigation: Vom Follow-up zum Kontakt, vom Kontakt zum Objekt, vom Objekt zum Deal und vom Gebiet zu aggregierten CRM- und Marktdaten. Diese Beziehungen werden über IDs abgebildet und durch Datenqualitätsprüfungen abgesichert.

## 24 Kanonische Storage-Bereiche und Legacy-Zuordnung

Die folgenden Bereiche sind produktiv und werden während V31 ausdrücklich geschützt. Die Tabelle beschreibt Zielverantwortung, nicht zwingend sofortige physische Zusammenführung.

| Bestehender Key / Bereich | Zielverantwortung | V31-Behandlung |
| --- | --- | --- |
| kk_crm_contacts | ContactRepository | kanonisch erhalten, Schema versionieren |
| kk_crm_activities | ActivityRepository | kanonisch erhalten |
| kk_crm_objects | ObjectRepository | kanonisch erhalten |
| kk_followups | FollowUpRepository | kanonisch erhalten |
| kk_call_queue | CallRepository | operative Queue erhalten |
| kk_calls_log_v27 | Call/Activity Legacy Adapter | lesen, kontrolliert migrieren oder referenzieren |
| kk_sales_pipeline | DealRepository | bestehende Hauptquelle prüfen |
| kk_sales_pipeline_v15 | Pipeline Legacy Adapter | Mapping und Datenparität prüfen |
| kk_valuation_pipeline | DealRepository type=valuation | Adapter/Migration |
| kk_referral_pipeline | DealRepository type=referral | Adapter/Migration |
| kk_crm_referrals | ReferralRepository | Beziehungen prüfen |
| kk_referral_network_v1 | ReferralPartnerRepository | Adapter oder kanonische Partnerquelle |
| kk_market_analysis_v1 | MarketRepository | manuelle Analysen getrennt halten |
| kk_mkk_market_reference_v29_4 | MarketReferenceRepository | Quelle als manuell/Referenz markieren |
| kk_mkk_map_state_v29_7 | MapSettingsRepository | Nutzerpräferenz, kein Fachdatenstore |
| kk_mkk_area_plans_v29_10 | AreaPlanRepository | Gebietsziele getrennt von Marktdaten |
| kk_kpi_targets | Settings / KPI Target | Zielwerte erhalten |
| kk_master_index / kk_master_schema | Schema Registry / Index | prüfen und konsolidieren |
| kk_data_quality_queue | DataQualityRepository | Probleme und Reparaturstatus |
| kk_weekly_reviews / kk_monthly_reviews | ReviewRepository | erhalten |
| kk_app_active_tab | Navigation Preference | Alias/Kompatibilität erhalten |

Weitere im Code vorhandene Keys werden in Phase 0 vollständig inventarisiert. Kein Key wird allein deshalb gelöscht, weil er in dieser Tabelle fehlt.

## 25 Repository- und Service-Schnittstellen

```
ContactRepository {
  list(query?)
  getById(id)
  create(input)
  update(id, patch)
  archive(id, reason)
  findDuplicates(candidate)
  subscribe(listener)
}

FollowUpService {
  create(input)
  complete(id, result, options)
  snooze(id, dueAt, reason?)
  listDue(referenceTime)
}
```

Repositories kontrollieren Persistenz und strukturelle Validierung. Services kontrollieren fachliche Mehrschrittoperationen. Beispielsweise gehört „Follow-up abschließen und Aktivität schreiben“ in einen Service, nicht in zwei unabhängig reagierende UI-Listener.

| Ebene | Beispielverantwortung |
| --- | --- |
| Repository | CRUD, Schema, Query, Change Notification |
| Service | Fachregel, Mehrfachschreibvorgang, Validierung, Event |
| Selector | abgeleitete Liste oder KPI ohne Schreiben |
| View Model | für eine konkrete Oberfläche aufbereitete Daten |
| Component | Darstellung und Benutzerinteraktion |

## 26 Mehrschrittoperationen und lokale Konsistenz

LocalStorage besitzt keine echten Transaktionen über mehrere Keys. Kritische Mehrschrittoperationen benötigen deshalb eine kontrollierte Commit-Strategie: Eingaben validieren, nächste Zustände im Speicher vorbereiten, optional Pre-Write-Snapshot erzeugen, Writes in definierter Reihenfolge ausführen, Abschluss markieren und Events erst nach erfolgreichem Commit emittieren.

```
async function completeCall(command) {
  const snapshot = KK_STORE.createRecoveryPoint(["kk_call_queue", "kk_calls_log_v27", "kk_crm_activities", "kk_followups"]);
  try {
    const next = CallService.planCompletion(command);
    KK_STORE.batchWrite(next.writes, { operationId: next.operationId });
    KK_EVENTS.emit("call.completed", next.event);
  } catch (error) {
    KK_STORE.restoreRecoveryPoint(snapshot);
    throw error;
  }
}
```

> **Pragmatische Transaktionsregel:** Die Implementierung muss nicht wie eine Serverdatenbank aussehen. Sie muss jedoch verhindern, dass ein teilweise abgeschlossener Anruf zwar aus der Queue verschwindet, aber weder Aktivität noch Follow-up erzeugt.

## 27 Validierung und Datenqualität

Validierung erfolgt auf drei Ebenen: Eingabevalidierung in der UI, Schema-/Strukturvalidierung im Repository und fachliche Validierung im Service. Keine Ebene ersetzt die anderen.

| Ebene | Beispiel |
| --- | --- |
| UI | E-Mail-Format, Pflichtfeld, Datum sichtbar erklären |
| Repository | ID, Datentypen, Enumwerte, Schema-Version |
| Service | Follow-up darf nicht vor Erstellung abgeschlossen sein; Deal-Stage muss existieren |
| Data Quality | verwaiste Referenz, Dublette, unbekannter Ort, fehlende nächste Aktion |

`kk_data_quality_queue` wird als nachvollziehbare Reparaturwarteschlange verwendet. Ein Problem besitzt Typ, Entitäts-ID, Schweregrad, erkannte Ursache, vorgeschlagene Aktion, Status und Zeitstempel. Automatische Reparaturen sind nur bei eindeutig reversiblen Fällen erlaubt.

## 28 Migrationen und Versionierung

Migrationen sind kleine, deterministische und idempotente Schritte. Jede Migration besitzt Quelle, Ziel, Vorbedingungen, Nachbedingungen und Testfälle. Eine Migration darf nicht gleichzeitig umfassende UX- oder Fachänderungen verstecken.

```
Migration {
  id: "contacts-v2-to-v3",
  key: "kk_crm_contacts",
  fromVersion: 2,
  toVersion: 3,
  up(data) { /* deterministic transform */ },
  verify(before, after) { /* invariants */ }
}
```

1. Vor Migration: vollständiger Snapshot und Datenzählung.
2. Migration auf Kopie ausführen und validieren.
3. Datensatzanzahl, IDs und kritische Beziehungen vergleichen.
4. Neue Version schreiben und Migrationslog aktualisieren.
5. UI und Backup-Test ausführen.
6. Bei Fehler: Originalzustand wiederherstellen und Diagnose anzeigen.

| Änderung | Strategie |
| --- | --- |
| Neues optionales Feld | Default beim Lesen oder Migration, rückwärtskompatibel |
| Enum-Umbenennung | Mappingtabelle und Aliaszeitraum |
| Entität aufteilen | IDs erhalten, Beziehungen explizit erzeugen |
| Keys zusammenführen | zuerst Read Adapter, dann kontrollierte Migration |
| Key entfernen | erst nach zwei bestätigten Releases und Backupkompatibilität |

### 28.1 Migrationslog

```
{
  "migrationId": "contacts-v2-to-v3",
  "startedAt": "...",
  "completedAt": "...",
  "status": "success",
  "recordsBefore": 142,
  "recordsAfter": 142,
  "warnings": [],
  "backupId": "backup_..."
}
```

Das Log enthält keine unnötigen personenbezogenen Inhalte. Es dient Diagnose, nicht Nutzerüberwachung.

## 29 Backup, Export und Import

Backup ist Teil der Produktarchitektur, nicht nur ein Button. Ein vollständiges Backup enthält registrierte Fachdaten, Settings, Schema-Versionen, App-Version, Exportzeitpunkt und Prüfsumme. Cache und neu beschaffbare Kartenressourcen können optional ausgeschlossen werden.

```
BackupEnvelope {
  format: "keim-crm-backup",
  formatVersion: 2,
  appVersion: "31.x",
  exportedAt,
  registryVersion,
  datasets: {
    "kk_crm_contacts": { schemaVersion: 3, data: [...] },
    "kk_followups": { schemaVersion: 2, data: [...] }
  },
  checksum
}
```

| Importphase | Pflicht |
| --- | --- |
| Dateiprüfung | Format, Größe, JSON, Prüfsumme |
| Vorschau | Datensätze und betroffene Bereiche anzeigen |
| Kompatibilität | Schema-Versionen und notwendige Migrationen prüfen |
| Pre-Import-Backup | automatisch lokalen Wiederherstellungspunkt erzeugen |
| Strategie | Ersetzen, Zusammenführen oder Abbrechen explizit wählen |
| Validierung | IDs, Beziehungen, Zählwerte und Pflichtfelder prüfen |
| Abschluss | Ergebnisbericht und erneuter Exporttest |

> **Kein blindes Merge:** Zusammenführen erfolgt nicht durch einfaches Array-Konkatenieren. Dubletten, ID-Kollisionen und neuere Aktualisierungen benötigen definierte Regeln und eine Vorschau.

## 30 Globale Suche und Indexierung

Die globale Suche greift auf einen abgeleiteten lokalen Suchindex zu. Der Index enthält nur für Suche notwendige normalisierte Felder und kann vollständig aus kanonischen Daten neu aufgebaut werden.

| Suchobjekt | Indexfelder | Zielaktion |
| --- | --- | --- |
| Kontakt | Name, Organisation, Telefon, E-Mail, Ort, Tags | Kontakt öffnen |
| Objekt | Titel, Ort, Adresse, Eigentümername | Objekt/Deal öffnen |
| Deal | Titel, Kontakt, Objekt, Stage | Pipeline-Detail öffnen |
| Follow-up | Titel, Kontakt, Zweck | Follow-up fokussieren |
| Wissen/Skript | Titel, Stichworte | Dokumentabschnitt öffnen |
| Gebiet | Name, Alias | Marktgebiet auswählen |

- Suche ist fehlertolerant, aber zeigt keine erfundenen Ergebnisse.
- Sensible vollständige Inhalte wie lange Notizen werden nicht unnötig indexiert.
- Indexupdate reagiert auf Events und besitzt einen vollständigen Rebuild-Befehl.
- Die Command Palette nutzt dieselbe Suchquelle und keinen separaten Datenschatten.

## 31 Marktdaten-Providerarchitektur

```
Market UI
   ↓
MarketService
   ↓
MarketDataClient
   ↓
Netlify Function / controlled endpoint
   ↓
ProviderAdapter
   ↓
Normalizer → Validator → Snapshot Store
   ↓
Source Registry + Cache + Quality Status
```

Der Provideradapter übersetzt eine konkrete externe Quelle in das interne MarketMetricSnapshot-Modell. Die UI kennt weder API-Feldnamen noch Authentifizierungsdetails. Ein Anbieter kann ersetzt oder ergänzt werden, ohne Komponenten umzubauen.

```
ProviderAdapter {
  id: "provider-x",
  supports: ["asking_price_sqm"],
  fetch(request, context),
  normalize(raw, context),
  validate(snapshot),
  getSourceMetadata()
}
```

| Komponente | Verantwortung |
| --- | --- |
| SourceRegistry | Quelle, Lizenz, Abdeckung, Frequenz, Kosten, Status |
| ProviderAdapter | Abruf und Normalisierung einer Quelle |
| MarketService | Auswahl, Fallback, Vergleich, Refreshsteuerung |
| CacheManager | TTL, letzter valider Snapshot, Eviction |
| DataValidator | Wertebereich, Einheit, Zeitraum, Pflichtmetadaten |
| LastUpdateManager | letzter Versuch, letzter Erfolg, Fehlerstatus |
| MarketRepository | lokale Snapshots und Historie |

### 31.1 Serverseitige Grenze und Netlify Functions

Schlüsselpflichtige, kostenpflichtige oder CORS-beschränkte Quellen werden über serverseitige Funktionen angebunden. Umgebungsvariablen enthalten Secrets. Das Frontend ruft ausschließlich kontrollierte Endpunkte der eigenen Anwendung auf.

```
GET /.netlify/functions/market-data?area=ar_mkk_bruchkoebel&metric=asking_price_sqm

Response {
  "data": [MarketMetricSnapshot],
  "meta": {
    "requestId": "...",
    "cached": true,
    "generatedAt": "..."
  }
}
```

- Parameter werden serverseitig gegen Allow-Lists validiert.
- Providerfehler werden in kontrollierte Fehlercodes übersetzt.
- Tokens, Rohantworten und personenbezogene Daten erscheinen nicht in Client-Logs.
- Rate Limits und Kostenkontrolle werden berücksichtigt.
- Scheduled Refresh kann serverseitig oder über einen kontrollierten externen Scheduler erfolgen; Browser-Timer gelten nicht als tägliche Aktualisierung.

## 32 Cache-, TTL- und Aktualitätsstrategie

| Status | Definition | UI-Verhalten |
| --- | --- | --- |
| current | Snapshot innerhalb fachlicher TTL | normal anzeigen |
| stale | TTL überschritten, aber letzter valider Wert vorhanden | Wert anzeigen + „nicht aktuell“ |
| refreshing | Abruf läuft | alten Wert erhalten + Fortschritt |
| missing | kein valider Snapshot | klarer Leerzustand |
| error | Abruf fehlgeschlagen | letzten Wert + Fehlerstatus + Retry |
| offline | kein Netz | lokalen Snapshot + Offline-Hinweis |

TTL wird pro Datenart festgelegt. Eine täglich ausgeführte technische Aktualisierung macht eine monatlich veröffentlichte Datenquelle nicht fachlich „täglich neu“. UI zeigt deshalb den Beobachtungszeitraum und den Abrufzeitpunkt getrennt.

```
CachePolicy {
  metric: "asking_price_sqm",
  refreshAfter: "24h",
  staleAfter: "7d",
  expireAfter: "90d",
  retainHistory: true
}
```

## 33 Kartenarchitektur

`KK_MAP` beziehungsweise `MapAdapter` bildet den stabilen Vertrag zur Kartenengine. Die Engine darf Leaflet bleiben oder nach dokumentierter Entscheidung auf MapLibre wechseln. Fachmodule arbeiten ausschließlich mit Area-IDs, Layerdefinitionen und Kartenbefehlen.

```
KK_MAP.mount(container, {
  centerAreaId: "ar_mkk",
  layers: ["market-price", "crm-density"],
  onAreaSelect(areaId) { ... }
});

KK_MAP.setMetric({ metric: "asking_price_sqm", period: "latest" });
KK_MAP.focusArea("ar_mkk_bruchkoebel");
```

| Teilsystem | Verantwortung |
| --- | --- |
| MapAdapter | Engineunabhängige Methoden und Events |
| GeometryRepository | Grenzen, Centroids, Bounds und Quelle |
| LayerRegistry | verfügbare Layer, Legenden und Datenbedarf |
| MapStateRepository | Nutzerpräferenzen wie Zoom und aktive Layer |
| MarketService | fachliche Werte pro Area |
| CRM Aggregator | datenschutzgerechte aggregierte Kontaktdichte |
| Map View | Darstellung, Tooltip, Auswahl und Mobile Sheet |

- Geometrie und fachliche Werte werden getrennt geladen.
- Gemeindegrenzen sind versionierte Ressourcen mit Quelle und Lizenz.
- Karten-Auswahl synchronisiert sich über Area-ID mit Detailpanel und Filter.
- Exakte personenbezogene Marker sind standardmäßig deaktiviert oder aggregiert.
- Engine-Ausfall führt zu einer tabellarischen Gebietsansicht, nicht zu einem unbenutzbaren Modul.

## 34 Offline- und Resilienzarchitektur

Der operative Kern ist lokal-first. Netzabhängige Module degradieren kontrolliert. Online-/Offline-Erkennung ist nur ein Signal; ein vorhandenes Netzwerk garantiert keinen erfolgreichen Providerabruf.

| Funktion | Offline-Verhalten |
| --- | --- |
| Kontakte | vollständig lesen und schreiben |
| Follow-ups / Calls / Pipeline | vollständig operativ |
| Backup Export | lokal möglich |
| Basiskarte | letzte Kacheln nur, wenn technisch vorhanden; sonst Schema-/Listenfallback |
| Marktdaten | letzten validen Snapshot anzeigen |
| Manueller Refresh | deaktiviert mit verständlichem Hinweis |
| Serverintegration | Operation in lokale Outbox nur, wenn später Cloud-Sync existiert |

Fehlerzustände unterscheiden Netzwerkfehler, Providerfehler, ungültige Daten, fehlende Berechtigung und leere Quelle. Ein pauschales „Etwas ist schiefgelaufen“ reicht nicht.

## 35 Sicherheit und Vertrauensgrenzen

| Grenze | Risiko | Pflichtmaßnahme |
| --- | --- | --- |
| Nutzereingabe → DOM | Stored XSS | Escaping, sichere DOM-APIs, keine ungefilterte innerHTML-Ausgabe |
| Browser → Function | Manipulierte Parameter | Allow-List, Validierung, Rate Limit |
| Function → Provider | Token-Leak, Kostenmissbrauch | Secrets in Env, Timeout, Logging-Redaktion |
| Importdatei → Store | beschädigte oder bösartige Daten | Schema-Prüfung, Größenlimit, Vorschau, Pre-Backup |
| Öffentliche URL → CRM | unberechtigter Zugriff | Zugriffsschutzstrategie vor Nutzung sensibler Echtdaten |
| Karte → Privatadresse | Datenschutzverletzung | Aggregation, Rollen-/Zugriffskontrolle, keine öffentliche Exaktheit |
| Backupdatei | Datenabfluss | klare Sensitivitätswarnung und lokale Kontrolle |

- Content Security Policy wird so streng wie mit den notwendigen Bibliotheken praktikabel gehalten.
- Externe Scripts erhalten feste Quellen und nach Möglichkeit Integritätsprüfung.
- Fehlerlogs enthalten keine Notizen, Telefonnummern oder Provider-Secrets.
- Löschen und Importieren sind bestätigungspflichtige Hochrisikoaktionen.
- Eine spätere Authentifizierung wird als eigenes Architekturthema umgesetzt, nicht durch einen kosmetischen Passwortdialog im Client.

## 36 Datenschutz und Datenklassifikation

| Klasse | Beispiele | Behandlung |
| --- | --- | --- |
| Öffentlich | Gebietsname, allgemeine Kartenquelle | normal nutzbar |
| Intern | KPI-Ziele, Pipeline-Stages | lokal schützen, nicht öffentlich exponieren |
| Personenbezogen | Name, Telefon, E-Mail, Adresse | minimieren, sichern, kontrolliert exportieren |
| Sensibel | Notizen, Gesprächsinhalte, private Objektangaben | besonders sparsam, keine Logs/URLs |
| Secret | API-Key, Token | ausschließlich serverseitig |

Das System unterstützt später Lösch-, Export- und Berichtigungsprozesse auf Kontaktebene. Bereits V31 soll abhängige Daten auffindbar machen, damit ein Kontakt nicht nur aus einer Liste verschwindet, während Aktivitäten und Objekte unkontrolliert zurückbleiben.

## 37 Fehlerbehandlung und Error Boundaries

Ein Fehler in Marktkarte oder Chart darf nicht die gesamte App blockieren. KK_BOOT isoliert Module, protokolliert Startfehler und zeigt einen modulbezogenen Wiederherstellungszustand.

| Fehlertyp | Reaktion |
| --- | --- |
| Parsefehler eines Storage-Keys | Key isolieren, Backup anbieten, andere Module starten |
| Modulinitialisierung fehlgeschlagen | Fehlerkarte im Modul, Retry, Diagnosecode |
| Provider Timeout | Cache anzeigen, Retry mit Backoff |
| Ungültige Providerdaten | nicht speichern, Quality Error protokollieren |
| Migration fehlgeschlagen | Rollback, App in sicheren Lesemodus für Bereich |
| Unhandled Error | globale Meldung, technischer Bericht ohne sensible Daten |

```
AppError {
  code: "STORE_SCHEMA_INVALID",
  module: "crm",
  recoverable: true,
  userMessage: "Kontaktdaten konnten nicht vollständig geladen werden.",
  technicalContext: { key, schemaVersion },
  occurredAt
}
```

## 38 Observability und Diagnose

Da die Anwendung heute primär lokal arbeitet, bedeutet Observability zunächst lokale Diagnose statt Nutzertracking. Ein Diagnosepanel kann App-Version, Modulstatus, Storage-Schema, letzte Migration, Providerstatus und Fehlercodes anzeigen.

| Signal | Beispiel |
| --- | --- |
| Bootstrap | Module gestartet / fehlgeschlagen |
| Store | Parsefehler, Migration, Schreibfehler, Speichergrenze |
| Provider | letzter Versuch, Dauer, Status, Cachetreffer |
| Karte | Engine geladen, Geometrieversion, Layerfehler |
| Backup | letzter Export/Import, Ergebnis |
| Performance | Startdauer, langsame Modulinitialisierung |

- Diagnoseeinträge besitzen begrenzte Aufbewahrung.
- Keine personenbezogenen Freitexte in Diagnose speichern.
- Ein exportierbarer technischer Bericht schwärzt sensible Werte.
- Telemetrie an externe Dienste wird erst nach bewusster Datenschutzentscheidung eingeführt.

## 39 Performance- und Lebenszyklusarchitektur

| Problem | Zielmuster |
| --- | --- |
| Alle Module starten gleichzeitig | sichtbares Modul zuerst; schwere Module lazy mounten |
| Doppelte Listener | idempotenter Mount und AbortController/Unsubscribe |
| Große Listen komplett rendern | Pagination, Windowing oder begrenzte View Models |
| Karte bleibt im Hintergrund aktiv | pause bei Tabwechsel, resize bei Rückkehr |
| KPI scannt alle Stores mehrfach | zentrale Selectors und memoized Ableitungen |
| Große GeoJSON-Datei blockiert Start | bedarfsgerecht laden und vereinfachen |
| Jede Eingabe schreibt sofort mehrfach | debounced Settings; fachliche Daten bewusst speichern |

Performancebudgets werden in Teil 5/QA konkretisiert. Architekturziel ist, dass der Heute-Tab und lokale Kernfunktionen nicht auf externe Fonts, Kartenbibliotheken oder Provider warten müssen.

## 40 Quellcode- und Build-Strategie

Die öffentlich ausgelieferte Anwendung kann weiterhin eine `index.html` sein. Der Quellcode darf jedoch in logisch getrennte Dateien überführt und durch einen reproduzierbaren Build zu einer deploybaren Ausgabe zusammengeführt werden. Ein Buildsystem ist nur sinnvoll, wenn es Wartbarkeit verbessert und auf iPhone-/Claude-Code-Workflow beherrschbar bleibt.

```
src/
  core/
    boot.js
    store.js
    events.js
    navigation.js
  domain/
    contacts/
    followups/
    calls/
    pipeline/
    market/
  ui/
    components/
    views/
  adapters/
    legacy/
    map/
    providers/
  styles/
    tokens.css
    components.css
netlify/functions/
data/geo/
docs/adr/
index.html  ← Build-/Deploy-Ausgabe oder Shell
```

| Option | Bewertung |
| --- | --- |
| Single-File-Quellcode behalten | geringes Setup, aber weiter hohe Kopplung |
| Native ES Modules ohne Bundler | gute Zwischenstufe, klare Dateien, einfache Browserausführung |
| Leichter Bundler | ermöglicht Build und Optimierung, zusätzliche Toolchain |
| Framework-Neubau | nicht Teil V31 ohne klare Notwendigkeit und Migrationsplan |

> **Kein Framework als Selbstzweck:** React, Vue oder ein anderes Framework wird nicht eingeführt, um Modernität zu signalisieren. Eine solche Migration benötigt ein eigenes PRD, Datenparität, schrittweisen Übergang und einen nachgewiesenen Produktivitätsgewinn.

## 41 Legacy-Adapter und Strangler-Pattern

V31 verwendet ein Strangler-Pattern: Neue öffentliche Services und Views werden schrittweise vor bestehende Implementierungen gesetzt. Legacy-Daten und Funktionen bleiben über Adapter erreichbar, bis Parität und Migration nachgewiesen sind.

1. Legacy-Bereich und Datenvertrag inventarisieren.
2. Kanonischen Service und Repository-Vertrag definieren.
3. Read Adapter für bestehende Daten implementieren.
4. Neue Oberfläche gegen kanonischen Vertrag bauen.
5. Schreibwege zentralisieren und Parallelwrites vermeiden.
6. Datenparität und Backup testen.
7. Legacy-Oberfläche aus Navigation entfernen, aber Rollback ermöglichen.
8. Legacy-Code erst nach bestätigtem Release entfernen.

Jeder Adapter erhält eine Ablaufbedingung. „Temporär“ ohne Exit-Kriterium wird sonst zur dauerhaften Parallelarchitektur.

## 42 Feature Flags und kontrollierte Einführung

```
KK_FEATURES = {
  v31Dashboard: true,
  canonicalCrm: false,
  realMap: true,
  remoteMarketProvider: false
};
```

- Flags dienen Rollout und Rückfall, nicht permanenter Variantenvielfalt.
- Flags besitzen Eigentümer, Standardwert und geplantes Entferndatum.
- Datenmigrationen dürfen nicht allein durch UI-Flag unkontrolliert hin- und herlaufen.
- Produktive Flagzustände werden im Abschlussbericht dokumentiert.

## 43 Deployment- und Umgebungsarchitektur

| Umgebung | Zweck | Daten |
| --- | --- | --- |
| Local / Claude Code | Entwicklung und Tests | synthetische oder gesicherte Testdaten |
| Deploy Preview | visuelle und funktionale Abnahme | keine sensiblen Echtdaten im Build |
| Production | aktive persönliche Nutzung | lokale Browserdaten des Nutzers; externe Provider kontrolliert |
| Optional Staging | spätere Integrationsprüfung | separater Provider-/Config-Kontext |

GitHub `main` bleibt der produktive Branch, sofern Workflow nicht bewusst geändert wird. Größere V31-Arbeit erfolgt auf einem klar benannten Branch. Netlify Deploy Previews dienen Abnahme. Produktionsdeployment erfolgt erst nach Release Gate und Backupprüfung.

- Build- und Function-Konfiguration ist versioniert.
- Umgebungsvariablen werden nicht committed.
- Provider können pro Umgebung deaktiviert oder auf Testendpunkte gesetzt werden.
- Rollback auf den vorherigen funktionierenden Deploy ist dokumentiert.
- Daten im Browser werden durch Frontend-Rollback nicht automatisch zurückmigriert; Schema-Kompatibilität wird berücksichtigt.

## 44 Testarchitektur

| Testebene | Zweck | Beispiele |
| --- | --- | --- |
| Schema Unit Tests | Datenvertrag und Migration | Kontaktvalidierung, v2→v3 |
| Service Tests | fachliche Mehrschrittoperation | Call abschließen, Follow-up snoozen |
| Repository Tests | Persistenz und Change Events | Read/Write/Recovery |
| Contract Tests | Provider und Adapter | Normalizer liefert internes Schema |
| Integration Tests | Module über Services | Dashboard-Klick öffnet gefilterte View |
| UI Smoke Tests | Hauptabläufe | Kontakt anlegen, Anruf erledigen |
| Backup Roundtrip | Portabilität | Export → leere Umgebung → Import |
| Migration Fixtures | Altdatenkompatibilität | Backups aus V27–V30 |
| Offline Tests | Resilienz | Providerausfall, Karte fehlt |
| Security Tests | Vertrauensgrenzen | XSS-Payload, manipulierte Importdatei |

Testdaten besitzen realistische, aber synthetische Beziehungen und deutsche Formate. Persönliche Echtdaten werden nicht in Fixtures oder Repository aufgenommen.

## 45 Architektur-Release-Gates

| Gate | Muss erfüllt sein |
| --- | --- |
| Datenparität | Anzahl und IDs kritischer Entitäten vor/nach Änderung stimmen oder Abweichung ist erklärt. |
| Storage | keine ungeplanten neuen Keys; Registry aktualisiert. |
| Migration | Backup, Rollback und Fixture-Test erfolgreich. |
| Navigation | Deep Links, Browser Back und Filtervertrag funktionieren. |
| Offline | operativer Kern bleibt nutzbar; Remote-Zustände degradieren ehrlich. |
| Security | keine Secrets im Client; Eingaben sicher gerendert. |
| Provider | Quelle, TTL, Qualität und Fehlerpfad dokumentiert. |
| Performance | kein mehrfacher Bootstrap, keine kritische Startblockade. |
| Backup | Export/Import-Roundtrip erfolgreich. |
| Dokumentation | ADRs, Schema-Registry und Change Log aktualisiert. |

## 46 Architecture Decision Records

Wesentliche Entscheidungen werden als ADR dokumentiert. Ein ADR ist kurz, dauerhaft und beschreibt nicht nur das Ergebnis, sondern den Kontext und die Konsequenzen.

```
ADR-00X: Kartenengine V31
Status: Accepted
Kontext: bestehender Leaflet-Unterbau, Bedarf an echten Grenzen und Layern
Optionen: Leaflet weiterführen / MapLibre migrieren / statischer Fallback
Entscheidung: ...
Begründung: ...
Konsequenzen: ...
Review-Datum: ...
```

| Pflicht-ADR | Entscheidungsgegenstand |
| --- | --- |
| ADR-001 | Quellcode-Modularisierung und Buildstrategie |
| ADR-002 | KK_NAV und URL-/Historienvertrag |
| ADR-003 | Kanonisches CRM-/Kontaktmodell |
| ADR-004 | Pipeline-Konsolidierung |
| ADR-005 | Kartenengine und Geodatenquelle |
| ADR-006 | Marktdatenprovider und serverseitige Grenze |
| ADR-007 | LocalStorage versus IndexedDB |
| ADR-008 | Zugriffsschutz und spätere Authentifizierung |

## 47 Umsetzungsphasen für Teil 3

| Phase | Architekturarbeit | Gate |
| --- | --- | --- |
| A0 | Inventar, Registry, Backup-Fixtures, globale APIs | Istzustand reproduzierbar |
| A1 | KK_NAV, Tab-Registry, Event Bus, Lifecycle | Navigation konsistent |
| A2 | KK_STORE-Verträge, Schema-Registry, Diagnose | Persistenz kontrolliert |
| A3 | Contact/Activity/FollowUp/Call Services | Dashboard und CRM teilen Datenquelle |
| A4 | Deal/Pipeline-Adapter und Stagnationslogik | Pipeline-Datenparität |
| A5 | Area/Geometry/MapAdapter | echte Karte mit stabilem Area-Modell |
| A6 | Market Provider, Function, Cache, Source Registry | erster ehrlicher Datenfluss |
| A7 | Legacy-Abbau, Performance, Security | keine parallele sichtbare Architektur |
| A8 | Backup-Roundtrip, Migration Fixtures, Release | Produktionsfreigabe |

## 48 Nicht-Ziele von V31

- Kein vollständiger Multi-User-Cloud-Neubau.
- Keine ungeplante Framework-Migration.
- Keine Speicherung echter Dokumentanhänge in LocalStorage.
- Keine automatisierte Portal-Scraping-Plattform.
- Keine künstliche KI-Priorisierung von Personen.
- Keine Echtzeit-Kollaboration zwischen mehreren Nutzern.
- Keine komplexe Microservice-Landschaft.
- Keine vollständige GIS-Plattform für beliebige Regionen; Architektur jedoch erweiterbar.
- Keine tägliche Scheingenauigkeit bei Quellen, die seltener aktualisieren.

## 49 Anti-Pattern-Katalog

| Anti-Pattern | Problem | Zielmuster |
| --- | --- | --- |
| Direkter Fremd-Key-Zugriff | Kopplung und unkontrollierte Schemata | Repository/Service |
| Neuer Key pro UI-Widget | fragmentierte Wahrheit | kanonische Entität + abgeleitete View |
| Name als Beziehung | Umbenennung bricht Referenz | stabile ID |
| Arrayindex als ID | Sortierung zerstört Referenz | persistente Entity-ID |
| Mehrere Listener schreiben dasselbe | Dubletten und Teilzustände | ein orchestrierender Service |
| Providerpayload direkt in UI | Anbieterbindung | Normalizer und internes Schema |
| API-Key im HTML | Secret-Leak | Netlify Function + Env |
| Browser-Interval als täglicher Job | unzuverlässig | serverseitiger Scheduler |
| Migration im Rendercode | nicht testbar | MigrationService vor View |
| Großer Big-Bang-Rewrite | hohes Daten- und Regressionsrisiko | Strangler-Pattern |
| Persistierter KPI | veraltet schnell | Selector aus Grunddaten |
| Stille Fehlerkorrektur | Vertrauensverlust | Datenqualitätsqueue und Log |
| Neue Kartenengine parallel | mehrfacher Zustand | ein MapAdapter |
| Komplettes Objekt im Event | mutierbare Kopie und Kopplung | ID + minimale Payload |
| Legacy ohne Exit-Kriterium | dauerhafte Doppelarchitektur | Adapter mit Abschaltplan |

## 50 Definition of Done – Architektur und Daten

- Jede zentrale Entität besitzt dokumentiertes Schema, ID-Regel und Validator.
- Jeder produktive Storage-Key ist registriert und einem Eigentümermodul zugeordnet.
- Navigation erfolgt über einen zentralen Vertrag und unterstützt sichtbare Filterzustände.
- Fachmodule schreiben nicht unkontrolliert in fremde Stores.
- Mehrschrittoperationen erzeugen keine halbfertigen Zustände.
- Backup und Import berücksichtigen Schema-Versionen und Migrationen.
- Legacy-Daten sind lesbar, migriert oder mit dokumentiertem Adapter versehen.
- Karte und Marktdaten nutzen stabile Area-IDs und getrennte Geometrie-/Wertmodelle.
- Externe Provider liegen hinter Adaptern und serverseitigen Secret-Grenzen.
- Offline-, Stale-, Missing- und Error-Zustände sind technisch und visuell umgesetzt.
- Keine geheimen Schlüssel oder personenbezogenen Diagnosedaten sind im Build enthalten.
- Migrationen und kritische Services besitzen reproduzierbare Tests.
- Diagnose, ADRs, Schema-Registry und Change Log sind aktuell.
- Die bestehende Nutzerdatenbasis wurde mit Zähl- und Beziehungstests geschützt.

## 51 Übergabe an Teil 4 – Marktmonitor und Kartenplattform

Teil 3 definiert die gemeinsame Architektur. Teil 4 vertieft den Marktmonitor als eigenständige Produkt- und Datenplattform. Es spezifiziert insbesondere:

- Entscheidung und Konfiguration der Kartenengine.
- Beschaffung, Lizenzierung, Vereinfachung und Versionierung der Gemeindegrenzen.
- Layerkatalog, Legenden, Aggregation und Datenschutz.
- Marktdatenkategorien, Source Registry und Datenqualitätsregeln.
- Netlify Functions, Scheduling, Caching und Kostenkontrolle.
- Gebietsvergleich, Zeitreihen, Prognosen und Unsicherheit.
- Mobile Karteninteraktion und Offline-Fallback.
- Abnahmefälle für alle priorisierten Orte im Main-Kinzig-Kreis.

## 52 Glossar

| Begriff | Definition |
| --- | --- |
| Autoritative Quelle | Der Store, dessen Daten für einen fachlichen Bereich gelten. |
| Adapter | Übersetzt externe oder alte Struktur in einen stabilen internen Vertrag. |
| Repository | Persistenzschnittstelle für eine Entität oder Sammlung. |
| Service | Orchestriert fachliche Regeln und Mehrschrittoperationen. |
| Selector | Berechnet abgeleitete Daten ohne Persistenz. |
| Snapshot | Datenstand zu einem fachlichen beziehungsweise technischen Zeitpunkt. |
| TTL | Zeitraum bis ein Cache erneut aktualisiert werden soll. |
| Stale | Vorhanden, aber älter als gewünschte Aktualität. |
| Schema-Version | Version der Struktur eines Datensatzes oder Storage-Bereichs. |
| Migration | Deterministische Transformation von einer Schema-Version zur nächsten. |
| Deep Link | Navigation, die Tab, View, Filter und optional Datensatz beschreibt. |
| Area-ID | Stabile Kennung eines geografischen Gebiets. |
| ADR | Dokumentierte Architekturentscheidung mit Kontext und Konsequenzen. |
| Strangler-Pattern | Schrittweiser Ersatz eines Altsystems hinter neuen Verträgen. |
| Local-first | Lokale Daten und Kernfunktionen bleiben ohne Netz arbeitsfähig. |

## Change Log

- **1.0 – 09. Juli 2026:** Vollständige Neufassung von Teil 3: Informationsarchitektur, technische Architektur und Datenmodell.

<!-- ENDE TEIL 3: Teil 3 – Architektur & Datenmodell -->
