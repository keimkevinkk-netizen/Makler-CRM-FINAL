# VINCERE Benachrichtigungs-, Erinnerungs- und Eskalationssystem

## Zweck und Abgrenzung

Dieses Modul erzeugt nachvollziehbare In-App-Benachrichtigungen aus bereits vorhandenen fachlichen Zuständen. Es enthält keine produktive Push-, E-Mail- oder SMS-Zustellung, keine zentrale Persistenz und keine Änderung an Kommunikationsprovidern. Externe Kanäle werden ausschließlich als lokale Präferenz vorbereitet.

## Architektur

- `src/domain/notifications/types.ts`: providerunabhängige Verträge für Meldungen, Quellen, Eskalationen, Präferenzen und Viewer.
- `src/domain/notifications/rules.ts`: reine, deterministische Erkennungsregeln.
- `src/services/notifications/notificationEngine.ts`: Deduplizierung, Eskalation, Zustandsabgleich und Meldungsflut-Schutz.
- `src/services/notifications/preferences.ts`: lokale Arbeits-/Ruhezeiten, Kanalpräferenzen und Zustellplanung ohne Versand.
- `src/features/notifications/notificationCenterModel.ts`: Filter, Sichten, Sortierung und Gruppierung.
- `src/features/notifications/NotificationCenter.tsx`: eigenständiger, semantischer Viewer ohne Router- oder Store-Abhängigkeit.

## Unterstützte Auslöser

Die Engine erkennt:

1. bald fällige, fällige, überfällige und kritische Follow-ups,
2. bevorstehende Termine und fehlende Terminvorbereitung,
3. Kontakte, die auf Rückmeldung warten,
4. aktive Objekte ohne nächste Aktion,
5. fehlgeschlagene Synchronisation,
6. gestörte Realtime-Verbindungen und Offlinezustände,
7. ungelöste Versionskonflikte,
8. fehlende Dokumente oder Aufgaben.

Ungültige Zeitangaben werden nicht geschätzt. Stattdessen entsteht eine Warnung mit der Aktion, die Zeitangabe zu korrigieren.

## Deterministische Eskalation

Deadline-basierte Meldungen verwenden feste Stufen:

| Zustand | Regel |
| --- | --- |
| `upcoming` | innerhalb des dokumentierten Vorlaufs, aber noch nicht fällig |
| `due` | bis zu 60 Minuten nach Fälligkeit |
| `overdue` | mehr als 60 Minuten, aber höchstens 24 Stunden überfällig |
| `critical` | mehr als 24 Stunden überfällig oder ausdrücklich kritischer Systemzustand |
| `snoozed` | lokal durch den Nutzer zurückgestellt |
| `completed` | Auslöser beseitigt oder manuell erledigt |

Standardwerte:

- Follow-up-Vorlauf: 24 Stunden
- Termin-Vorlauf: 2 Stunden
- Terminvorbereitung: 24 Stunden
- Rückmeldung an Kontakte: 48 Stunden
- kritischer Konflikt: nach 24 Stunden
- kritischer Synchronisationsfehler: nach 60 Minuten
- maximal drei aktive Meldungen pro Kontakt

Alle Schwellen können beim Aufruf überschrieben werden. Es gibt keine Zufallswerte oder versteckten Wahrscheinlichkeiten.

## Deduplizierung und Meldungsflut-Schutz

Jede Meldung besitzt einen stabilen `deduplicationKey` und einen `stateFingerprint`.

- gleicher Schlüssel + gleicher Zustand: keine neue Meldung,
- gleicher Schlüssel + veränderter Zustand: vorhandene Meldung wird aktualisiert,
- höhere Eskalationsstufe: gleiche Meldungs-ID, neuer Status `unread`, dokumentierte vorherige Stufe,
- gleiche koordinierte Aktion aus mehreren Modulen: nur die höchst priorisierte Meldung bleibt aktiv,
- zu viele aktive Meldungen für denselben Kontakt: deterministische Begrenzung nach Priorität, Fälligkeit und Schlüssel.

Wenn ein vollständig ausgewertetes Quellmodul den Auslöser nicht mehr liefert, wird die vorhandene Meldung als erledigt markiert. Nicht geladene Module werden nicht vorschnell abgeschlossen.

## Lokale Präferenzen

`planNotificationDelivery` bewertet lediglich, was später geschehen dürfte:

- `deliver_now`
- `queue_for_working_hours`
- `daily_summary`
- `muted`

Berücksichtigt werden Arbeitszeiten, Ruhezeiten, aktivierte Kanäle, Mindestpriorität, tägliche Zusammenfassung und sofortige kritische Meldungen. Die Funktion ruft keinen Provider auf und versendet nichts.

## Integration

Die Engine kann später aus Store-Selektoren oder Repository-Abfragen gespeist werden:

```ts
const result = evaluateNotifications(snapshot, existingNotifications, {
  now: new Date().toISOString(),
});
```

Der Viewer erhält die resultierende Liste separat:

```tsx
<NotificationCenter notifications={result.notifications} now={now} />
```

Die konkrete Persistenz, Router-Einbindung und Providerzustellung bleiben bewusst außerhalb dieses Arbeitspakets.
