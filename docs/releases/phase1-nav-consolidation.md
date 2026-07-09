# Phasenbericht: V31 Phase 1 — Navigationsvertrag konsolidieren

## Ziel und Ergebnis
Ziel: die zwei parallelen Tab-Listen (`KK_APP_SHELL.REGISTRY`, `KK_V30_SHELL.tabs`) aus `docs/prd/00-ist-zustand-inventar.md` §4 zu einer Quelle zusammenführen, plus ein dünner `KK_NAV.open()`-Einstiegspunkt als Fundament für spätere Deep-Links (PRD Teil 3 §6). Erreicht: `KK_V30_SHELL.tabs` und die mobile Primärliste werden jetzt additiv aus `KK_APP_SHELL.registry` abgeleitet; nur rein präsentationsbezogene Zusatzdaten (Sidebar-Untertitel, Icon-Name) bleiben lokal. `window.KK_NAV.open({tab, focusId, filters})` ist neu verfügbar und bewusst als Teilerfüllung dokumentiert (siehe unten).

## Geänderte Dateien und Verträge
- `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html`:
  - `kk-v30-designsystem-shell-js`: `var tabs=[...]` (hartcodiert) → `deriveTabs()` liest `window.KK_APP_SHELL.registry`, mit `FALLBACK_TABS` als Sicherheitsnetz falls die Registry nicht verfügbar ist. `mobilePrimary` analog über `deriveMobilePrimary()`.
  - `kk-app-shell-js`: neues additives `window.KK_NAV = {version, open}` direkt neben `window.KK_APP_SHELL`.
- Keine Storage-Keys, keine IDs, keine Panel-Struktur geändert.

## Daten / Migrationen
Keine. Rein strukturelle Konsolidierung von In-Memory-Konfiguration, keine Persistenz betroffen.

## Verifikation
- `verify.js` (10 Tabs × Desktop 1440/Mobile 390, XSS-Regression, Console/Overflow): PASS, unverändert grün.
- Gezielter Test `test-phase1-nav.js`: `KK_V30_SHELL.tabs` strukturell identisch (Deep-Equal) zur vorherigen hartcodierten Liste; abgeleitete `mobilePrimary` identisch zur vorherigen hartcodierten Liste; `KK_APP_SHELL.primaryTabs` und `KK_V30_SHELL.tabs`-IDs jetzt beweisbar dieselbe Reihenfolge/Menge (vorher nur durch manuelle Pflege sichergestellt).
- `KK_NAV.open({tab:'followups', filters:{due:'today_or_overdue'}, source:'test'})`: navigiert korrekt zu Follow-ups, feuert `kk-nav-filters`-Event mit korrektem Payload.
- Sidebar-Screenshot Desktop: visuell identisch zur Baseline (`docs/releases/` Baseline-Ordner aus Phase 0).

## Ergebnis Status
PASS.

## Bekannte Grenzen und Risiken
- `KK_NAV.open()` deckt nur Tab-/Anchor-Navigation und optionales Fokus-Highlight ab. Das `filters`-Feld wird als Event weitergereicht, aber **kein bestehendes Modul abonniert dieses Event bisher** — ein Filter wird also noch nicht automatisch sichtbar gesetzt. Das ist bewusst nicht als vollständiger PRD-Deep-Link-Vertrag (Teil 3 §6, "Deep-Link-Abnahme") dargestellt, sondern als Fundament für eine spätere Phase, in der einzelne Module (CRM, Follow-ups, Pipeline) das Event konsumieren und ihre Filter-UI entsprechend setzen.
- `FALLBACK_TABS` ist absichtlich noch immer eine hartcodierte Kopie — sie wird nur genutzt, wenn `KK_APP_SHELL.registry` aus irgendeinem Grund fehlt (Verteidigungslinie, kein Normalfall). Dieser Fallback ist bewusst in Kauf genommene Redundanz für Robustheit, keine aktive zweite Quelle.

## Nächster sinnvoller Schritt
Phase 2 (Schema-Registry dokumentieren) oder ein erstes Modul (z. B. Follow-ups) auf `kk-nav-filters` reagieren lassen, um den ersten echten Dashboard→Follow-ups-Deep-Link mit sichtbarem Filter zu demonstrieren (PRD Teil 2 §41 Anti-Pattern "Klickbare Zahl ohne gefiltertes Ziel").
