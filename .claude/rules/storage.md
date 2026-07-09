# Storage-Regeln

Vollständige Regeln: `docs/prd/03-architecture-data-model.md` §9–§29. Inventar: `docs/prd/00-ist-zustand-inventar.md`.

- Alle bestehenden `kk_*`-Keys sind geschützt (Liste in `docs/prd/00-ist-zustand-inventar.md` §3). Kein Rename, kein Delete, keine semantische Umdeutung ohne Adapter.
- Neue Keys folgen der Backup-Erkennungs-Regex: `kk_`, `kkbib`, `kk11`, `kk12`, `kkref`, `kk[A-Z]`, `kkcrm`, `kkops`, `kkdom`, `kkprod`, `__kk`.
- Neue Entitäten verwenden `uid(prefix)` (Zeile ~1663 in index.html) mit einem sprechenden Präfix, konsistent mit bestehenden (`contact_`, `fu_`, `act_`, `obj_`, `ref_`).
- Vor jeder Migration: Backup-Export testen, Migration an leer/minimal/voll/fehlerhaft/Legacy-Fixture testen, danach Re-Import des alten Backups prüfen.
- Kein blindes Array-Merge bei Import. Dubletten/ID-Kollisionen brauchen eine sichtbare Vorschau vor dem Schreiben.
- Mehrschrittoperationen (z. B. Anruf abschließen → Queue + Log + Aktivität + Follow-up) dürfen keinen halbfertigen Zustand hinterlassen. Bei Fehler: ursprünglichen Zustand wiederherstellen, nicht teilweise committen.
