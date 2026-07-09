# Marktmonitor-/Karten-Regeln

Vollständige Regeln: `docs/prd/04-market-map-platform.md`.

- Ein MapAdapter (`KK_MAP`), eine primäre Engine. Kein zweiter Kartenstack parallel sichtbar (§6, §52).
- Kein Wert ohne Quelle, Zeitraum, Abrufzeitpunkt, Qualitätsstatus (§15, §43). "Heute abgerufen" ≠ "heute entstandener Wert" — beides getrennt anzeigen.
- Keine approximierten Polygone als amtliche Gemeindegrenze ausgeben (§10). Aktuelle Koordinaten sind Näherungen und müssen als solche gekennzeichnet bleiben, bis eine BKG-VG250-Pipeline existiert (siehe ADR-0000, offene Lücke).
- Angebotspreise nie als Kaufpreise bezeichnen (§16, §52).
- Bodenrichtwerte nicht als täglich neu darstellen — Festsetzungszyklus beachten (§17).
- Fehlerhafter neuer Snapshot ersetzt nie den letzten validen Stand (§22, §52).
- Keine Privatadressen als öffentliche Einzelmarker; CRM-Layer aggregiert pro Gebiet (§19, §30).
- Jede Gebietsdetailansicht braucht mindestens eine operative Aktion (Kontakte/Follow-ups/Pipeline öffnen) (§2, §34).
