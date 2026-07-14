# VINCERE Marktintelligenz – spätere Daten- und Persistenzlücken

Dieses Arbeitspaket speichert keine Marktwerte in der Cloud und verändert weder zentrale Domain-Grundtypen noch SQL-Migrationen.

Für eine spätere produktive Datenanbindung werden voraussichtlich eigenständige, workspace-gebundene Tabellen oder gleichwertige Repository-Schnittstellen benötigt:

- `market_sources`: versionierte Quellenmetadaten, Lizenzstatus, Prüfhistorie und Importstatus
- `market_datasets`: unveränderliche Datensatzversionen mit Hash, Zeitraum, Importzeitpunkt und Herkunft
- `market_observations`: normalisierte Kennzahlen mit Region, Ortsteil, PLZ, Einheit, Stichprobe und Abdeckung
- `market_import_runs`: Validierungsprotokoll, Warnungen, Fehler, Benutzer und Freigabestatus
- `market_region_aliases`: administrierbare Zuordnung externer Regionsbezeichnungen
- `valuation_market_evidence`: explizite Verknüpfung zwischen Bewertungsfall und verwendeten Datensatzversionen

Zusätzliche Felder, die vor einer produktiven Anbindung fachlich geklärt werden müssen:

- rechtliche Nutzungsgrundlage und Weitergaberechte pro Quelle
- Transaktions- versus Angebotsdatenkennzeichnung
- Objektart, Baualtersklasse, Zustand und Mikrolage als Segmentdimensionen
- Revisions- und Löschregeln für lizenzierte Daten
- fachliche Freigabe und Vier-Augen-Prüfung
- serverseitige Datei- und Malwareprüfung
- reproduzierbare Bewertungsmethode mit Version und Parametern

Bis dahin bleibt der Import eine rein lokale Vorschau. Synthetische Daten sind technisch und visuell als Demo gekennzeichnet und dürfen keinen Markt- oder Verkehrswert erzeugen.
