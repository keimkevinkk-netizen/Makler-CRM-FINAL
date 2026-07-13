# VINCERE Product Blueprint

## Produktthese

VINCERE ist kein klassisches CRM. Es ist ein intelligentes Real Estate Sales Operating System, das den Makler täglich zu den vertriebswirksamsten Aktionen führt.

## Verbindliche Produktprinzipien

1. **Handlung vor Reporting** – jede Ansicht muss eine nächste sinnvolle Aktion ermöglichen.
2. **Ein Kontakt, eine Identität** – Beziehungen erfolgen über stabile IDs, nicht über Namen.
3. **Kein Gespräch ohne Ergebnis** – jeder Anruf endet mit Ergebnis, Notiz und nächstem Schritt.
4. **Follow-ups dürfen nicht verloren gehen** – Überfälligkeit, Priorität und Chancenwert bestimmen die Reihenfolge.
5. **Premium ohne Ablenkung** – dunkle, ruhige Oberfläche mit Burgunderrot und gedämpftem Gold.
6. **Einfachheit vor Funktionsmenge** – neue Funktionen werden nur aufgenommen, wenn sie Vertrieb, Produktivität oder Entscheidungssicherheit verbessern.
7. **Sichere Migration** – MaklerCRM bleibt Referenz und Rückfalloption, bis VINCERE vollständig geprüft ist.

## V1 Informationsarchitektur

- Übersicht / Command Center
- Heute
- Kontakte
- Pipeline
- Telefon-Assistent
- Immobilien
- Bewertungen
- Netzwerk / Tippgeber
- Kampagnen
- Wissen
- Einstellungen / Backup

## Kernkreislauf

Kontakt → Priorisierung → Anruf → Gesprächsergebnis → nächster Schritt → Follow-up → Termin → Auftrag → Immobilie → Verkauf → Lernsignal

## Designrichtung

- Hintergrund: fast schwarzes Anthrazit
- Hauptakzent: tiefes Burgunderrot
- Sekundärakzent: gedämpftes warmes Gold
- Typografie: klare Sans-Serif für Bedienung, elegante Serifenschrift für Marke und emotionale Überschriften
- Karten: feine Konturen, kaum Schatten, hohe Informationsruhe
- Statusfarben: sparsam, semantisch und nicht dekorativ
- Responsive: Desktop als Command Center, Mobile als Aktions- und Gesprächsbegleiter

## Technische Zielarchitektur

- React + TypeScript + Vite
- Feature-orientierte Modulstruktur
- zentrale Domain-Typen und Repositories
- GitHub Actions für Typecheck, Lint, Tests und Build
- Netlify-kompatibler Build
- zunächst LocalStorage nur für die isolierte Foundation
- anschließend Authentifizierung, PostgreSQL, Rollen, Audit Log und Datenmigration als getrennte Arbeitspakete

## Nicht Bestandteil dieser Foundation

- produktive Benutzeranmeldung
- zentrale Cloud-Datenbank
- Multi-Tenant-Fähigkeit
- echte KI-Inferenz
- produktive Markt- und Bewertungsdatenanbieter
- automatische Migration produktiver MaklerCRM-Daten
- produktives Deployment

Diese Punkte sind bewusst nicht stillschweigend simuliert. Sie benötigen separate Sicherheits-, Datenschutz- und Migrationsentscheidungen.
