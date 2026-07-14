# VINCERE Vertriebsakademie und Gesprächssimulator

## Umfang

Dieses Arbeitspaket stellt eine lokale, deterministische Trainingsumgebung für Immobilienvertrieb bereit. Es werden keine echten Kundendaten benötigt, keine Gespräche aufgezeichnet und keine produktiven KI-Provider angesprochen.

Enthalten sind:

- zwölf vollständige Trainingsszenarien für Eigentümerakquise, Einwandbehandlung, Terminabschluss, Empfehlungen und Netzwerkgespräche
- acht Lernpfade vom Anfängerpfad bis zur Prüfung
- ein deterministisches Bewertungsmodell mit zehn Gesprächsdimensionen
- konkrete Rückmeldungen zu Stärken, Verbesserungen, verpassten Fragen, zu früher Argumentation, nächstem Schritt und problematischen Formulierungen
- ein lokaler Mock-Simulationsprovider mit kontrolliertem Offlinezustand
- anonymisierte Evaluationsfälle für gute, schwache, aggressive, manipulative, erfundene und rechtlich problematische Antworten
- eine responsive Premium-Oberfläche als exportierbares Feature-Modul

## Architekturgrenzen

Die Akademie verändert weder `AppStore.tsx` noch `cloudRepository.ts`, `domain.ts`, Auth, SQL-Migrationen, die zentrale Routerkonfiguration oder die Providergrundlage des KI-Verkaufscoachs. Die Oberfläche wird über `features/academy/index.ts` exportiert und kann später an einem freigegebenen Integrationspunkt eingebunden werden.

Der Mock-Simulationsprovider ist bewusst unabhängig von der bestehenden AI-Providergrundlage. Er erzeugt ausschließlich regelbasierte Antworten und darf nicht als produktive Inferenzschicht verstanden werden.

## Bewertungsprinzip

Jede Antwort wird anhand folgender Dimensionen mit jeweils 0 bis 10 Punkten bewertet:

1. Gesprächseröffnung
2. Fragetechnik
3. Bedarfsermittlung
4. Zuhören
5. Einwandbehandlung
6. Nutzenargumentation
7. Vertrauensaufbau
8. Zielorientierung
9. nächster Schritt
10. Gesprächsabschluss

Zusätzliche deterministische Abzüge entstehen bei:

- erfundenen Fakten oder nicht belegten Wertangaben
- aggressiver oder manipulativer Sprache
- unzulässigen Ergebnisgarantien
- rechtlich problematischen Pauschalaussagen
- fehlendem Abschlussziel
- unklarer nächster Aktion
- Argumentation vor der Bedarfsklärung

Das Modell erstellt keine psychologischen Diagnosen und leitet keine Persönlichkeitsmerkmale aus Formulierungen ab.

## Fortschritt und Persistenz

Der Fortschritt lebt zunächst ausschließlich im lokalen React-View-Modell der Seite. Es wird keine neue Persistenz, keine Cloudtabelle und keine SQL-Migration eingeführt. Eine spätere Persistierung muss separat freigegeben und an das bestehende Workspace-, Rollen- und Auditmodell angebunden werden.

## Spätere Erweiterungen

Eine spätere KI-gestützte Simulation muss die vorhandene serverseitige Sicherheitsgrenze des KI-Verkaufscoachs verwenden. Vor einer produktiven Nutzung sind insbesondere Datenschutz, Einwilligung, Datenminimierung, Auditierung, Kostenlimits, Inhaltsfilter und die Trennung von Trainings- und Kundendaten festzulegen.
