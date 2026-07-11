# Schema-Registry (Phase 2, aktualisiert 11.07.2026)

Formalisiert `docs/prd/00-ist-zustand-inventar.md` §3 zu einem maschinenlesbaren Register gemäß PRD Teil 3 §10. Maschinenlesbare Fassung: `docs/prd/schema-registry.json`. **Kein Datensatz wurde migriert oder umbenannt** — reine Dokumentation des Ist-Zustands.

## Methodik
Jeder der ursprünglich 70 gefundenen `kk_*`-Storage-Keys wurde einem Owner-Modul zugeordnet (per Namensanalyse und, wo mehrdeutig, per Codestellen-Verifikation — siehe `notes`-Feld). 22 Keys mit bereits im PRD-Inventar bekannter Rolle (aus Teil 3 §24) haben eine präzise `entity`-Typangabe; die übrigen 48 sind als "Legacy, formale Struktur folgt bei Bedarf" markiert — das ist eine bewusst ehrliche Lücke, kein Fehler: die Namen sind aus dem Code ableitbar, ihre interne Feldstruktur wurde in Phase 2 nicht einzeln nachvollzogen, um den Umfang nicht zu sprengen.

**Update 11.07.2026 (Registry v2):** ein vollständiger automatisierter Abgleich aller `kk_[a-z0-9_]+`-Literale in `index.html` gegen diese Registry (Anlass: eine externe technische Analyse hatte 4 nicht dokumentierte Keys benannt) bestätigte genau diese 4 fehlenden Keys und keine weiteren: `kk_geo_active_layers_v1` (Kartenebenen-Sichtbarkeit, Phase 11), `kk_market_observations_v1` (Marktbeobachtungen-Modul, Grundlage von `KK_VALUATION`), `kk_market_presentation_mode` (Präsentationsmodus-Flag, Phase 15.4a), `kk_official_gis_capabilities_cache_v2` (BORIS/ALKIS-Layer-Cache, PR #7). Damit sind jetzt **74 von 74** live im Code verwendeten `kk_*`-Keys erfasst (0 verbleibend unklar).

## Ergebnis
- Alle 74 Keys haben jetzt einen zugeordneten Owner (0 verbleibend unklar, nach Verifikation von 9 zunächst unklaren Fällen direkt im Code — z. B. `kk_makler_os_v2` als `CENTRAL_STORE_KEY`, `kk_scripts_module` als Iframe-Modul-ID des Skripte-Archivs).
- Sensitivitätsklassifikation (`personal`/`internal`) nach PRD Teil 3 §36, konservativ geschätzt (im Zweifel `personal`, wenn ein Bezug zu Kontakten/Eigentümern/Tippgebern plausibel ist).
- Backup-Einordnung: 3 Keys (`kk_data_cache_*`, `kk_data_lastrun_*`, `kk_last_technical_smoke_test`) als "aus Rohdaten neu erzeugbar" markiert und damit für zukünftige Backup-Optimierung als optional gekennzeichnet — alle anderen bleiben `required` und werden vom bestehenden Backup-Regex ohnehin bereits automatisch erfasst.
- ID-Präfix-Tabelle (`idPrefixes` im JSON) verbindet die bestehende `uid(prefix)`-Konvention mit der PRD-Zielnotation (z. B. `contact_` ≈ PRD `ct_`).

## Verwendung
Diese Registry ist die Grundlage für spätere automatisierte Datenqualitäts- und Backup-Vollständigkeitsprüfungen (PRD Teil 3 §27, §29). Sie ersetzt keine Migration — Migrationen bleiben eigene, einzeln zu entscheidende Phasen (PRD Teil 3 §28, Teil 5 §19).
