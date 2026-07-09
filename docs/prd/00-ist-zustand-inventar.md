# Ist-Zustand-Inventar (Phase 0 / A0 / M0)

**Stand:** 2026-07-09 · erstellt vor der ersten PRD-V31-Aenderung als Baseline-Evidenz gem. Teil 3 §0.2 und Teil 5 §12.

Quelle: statische Analyse (grep) von `kevin keim makler betriebssystem v30 7 ux finalisiert repariert 2.html` (13.010 Zeilen) auf Branch `claude/v31-prd-implementation`, abgezweigt von `claude/project-analysis-audit-u1z1iu` nach Abschluss der V31-Phasen A-E (Marktmonitor-Kartenfundament, Dashboard-Command-Center, UX-Bereinigung, Mobile-Native-Pass).

## 1. Oeffentliche `window.KK_*` APIs (24)

| API | Vermutete Rolle (aus Namen/Kontext) |
| --- | --- |
| `window.KK_AI_PROMPT_ASSISTANT_V1=` | (unklar, in Phase A1 pruefen) |
| `window.KK_APP_SHELL=` | (unklar, in Phase A1 pruefen) |
| `window.KK_BOOT=` | (unklar, in Phase A1 pruefen) |
| `window.KK_CHART_FALLBACK_ACTIVE=` | (unklar, in Phase A1 pruefen) |
| `window.KK_COMMAND_CENTER=` | (unklar, in Phase A1 pruefen) |
| `window.KK_CRM_PRO=` | (unklar, in Phase A1 pruefen) |
| `window.KK_DATA_CORE=` | (unklar, in Phase A1 pruefen) |
| `window.KK_FINAL_QA_V24=` | (unklar, in Phase A1 pruefen) |
| `window.KK_MAP=` | (unklar, in Phase A1 pruefen) |
| `window.KK_MARKET=` | (unklar, in Phase A1 pruefen) |
| `window.KK_MARKET_ANALYSIS_V1=` | (unklar, in Phase A1 pruefen) |
| `window.KK_MKK_MAP=` | (unklar, in Phase A1 pruefen) |
| `window.KK_MKK_PLAN=` | (unklar, in Phase A1 pruefen) |
| `window.KK_MKK_ZOOM=` | (unklar, in Phase A1 pruefen) |
| `window.KK_REALMAP=` | (unklar, in Phase A1 pruefen) |
| `window.KK_REFERRAL_NETWORK_V1=` | (unklar, in Phase A1 pruefen) |
| `window.KK_STORE` | LocalStorage-Gateway (getRaw/setRaw/readJSON/writeJSON/updateJSON, Backup/Export) |
| `window.KK_UTIL=` | (unklar, in Phase A1 pruefen) |
| `window.KK_UX=` | (unklar, in Phase A1 pruefen) |
| `window.KK_V11_SALES_MACHINE=` | (unklar, in Phase A1 pruefen) |
| `window.KK_V30_MOBILE=` | (unklar, in Phase A1 pruefen) |
| `window.KK_V30_QA=` | (unklar, in Phase A1 pruefen) |
| `window.KK_V30_SHELL=` | (unklar, in Phase A1 pruefen) |
| `window.KK_V30_WORKSPACES=` | (unklar, in Phase A1 pruefen) |

## 2. KK_BOOT-Module (41)

Register-Aufrufe mit `KK_BOOT.register('<name>', initFn, {priority})`. Reihenfolge/Prioritaet steuert Initialisierung.

- `app-shell'`
- `command-center'`
- `crm-kontakte'`
- `crm-pro'`
- `final-qa'`
- `followups'`
- `heute-dashboard-v29'`
- `heute-dashboard-v30-3'`
- `iframe-resize-sicherheit'`
- `ki-prompt-assistent'`
- `kontakt-recherche-und-charts'`
- `kontaktqualitaet'`
- `market-providers'`
- `markt-tagesmonitor'`
- `marktanalyse'`
- `master-os'`
- `mkk-area-plan'`
- `mkk-market-map'`
- `mkk-zoom-pan'`
- `oeffentliche-signale'`
- `operative-command-center'`
- `operative-repair'`
- `operatives-cockpit'`
- `pipeline-intelligence-refresh'`
- `pipeline-kpi-cockpit'`
- `produktivitaets-os'`
- `realmap-v31'`
- `reviews-und-pipeline-alerts'`
- `saas-modus-und-schnellerfassung'`
- `sales-machine'`
- `strukturpruefung'`
- `technik-hardening-ui'`
- `technik-normalisierung'`
- `tippgeber-legacy-os'`
- `tippgeber-netzwerk'`
- `v30-designsystem-shell'`
- `v30-mobile-redesign'`
- `v30-ux'`
- `v30-visual-qa'`
- `v30-workspaces'`
- `zusaetzliche-charts-und-kpis'`

## 3. Storage-Keys (kk_* Literale, 70 gefunden)

Alle nachfolgenden Keys gelten als **geschuetzt** im Sinne von Teil 3 §24 / Teil 5 §19. Kein Key wird in V31 umbenannt, geloescht oder semantisch umgedeutet, ohne Adapter/Migration.

Backup/Export erfasst automatisch alle Keys, die dem Regex `/^(kk_|kkbib|kk11|kk12|kkref|kk[A-Z]|kkcrm|kkops|kkdom|kkprod|__kk)/` entsprechen (bestehende KK_STORE-Konvention) — neue Keys MUESSEN dieser Konvention folgen, um automatisch gesichert zu werden.

| Key | Vermutete Zielverantwortung (PRD Teil 3 §24) |
| --- | --- |
| `kk_ai_prompt_assistant_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_angebot_monitor_entries_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_app_active_tab` | Navigation Preference (Alias/Kompatibilitaet erhalten) |
| `kk_area_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_call_queue` | CallRepository (operative Queue, kanonisch) |
| `kk_calls_log_v27` | Call/Activity Legacy-Adapter |
| `kk_check_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_conversion_metrics` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_crm_activities` | ActivityRepository (kanonisch) |
| `kk_crm_contacts` | ContactRepository (kanonisch) |
| `kk_crm_duplicates` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_crm_followups` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_crm_objects` | ObjectRepository (kanonisch) |
| `kk_crm_owner_pipeline` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_crm_referrals` | ReferralRepository |
| `kk_crm_source_roi` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_crmpro_leads` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_daily_call_queue_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_data_cache_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_data_lastrun_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_data_quality_queue` | DataQualityRepository |
| `kk_eigentuemer` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_final_qa_v28_4_last_smoke` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_followups` | FollowUpRepository (kanonisch) |
| `kk_followups_deleted_auto_keys` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_fu_items` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_heute_focus_v29` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_heute_notes` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_heute_ziele_v27` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_kpi_targets` | Settings/KPI Target |
| `kk_last_technical_smoke_test` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_makler_os_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_makler_os_v2` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_market_analysis_v1` | MarketRepository (manuell) |
| `kk_market_monitor_entries_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_master_index` | Schema-Registry/Index (zu pruefen ob konsolidierbar) |
| `kk_master_schema` | Schema-Registry/Index (zu pruefen ob konsolidierbar) |
| `kk_mkk_area_plans_v29_10` | AreaPlanRepository |
| `kk_mkk_map_state_v29_7` | MapSettingsRepository (Praeferenz, kein Fachdatenstore) |
| `kk_mkk_market_reference_v29_4` | MarketReferenceRepository (manuell/Referenz) |
| `kk_monthly_decisions_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_monthly_reviews` | ReviewRepository |
| `kk_offer_monitor_entries_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_owner_opportunities` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_pipeline_deals` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_pipeline_module` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_pipeline_production_stages_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_production_day_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_public_signals_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_referral_activity_os` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_referral_network_v1` | ReferralPartnerRepository |
| `kk_referral_partners_os` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_referral_pipeline` | DealRepository type=referral |
| `kk_referral_settings_os` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_referrals` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_region_market_cockpit_v10` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_saas_daymode` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_sales_pipeline` | DealRepository (Hauptquelle, zu pruefen) |
| `kk_sales_pipeline_v15` | Pipeline-Legacy-Adapter |
| `kk_scripts_module` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_time_budget` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_tippgeber` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_today_done_fallback_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_today_manual_actions_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_today_reminders_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_today_reminders_v1` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_today_writeback_log_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_valuation_pipeline` | DealRepository type=valuation |
| `kk_weekly_production_` | (im PRD nicht explizit genannt — als eigenstaendiger Legacy-Bereich behandeln, nicht loeschen) |
| `kk_weekly_reviews` | ReviewRepository |

## 4. Bekannter struktureller Befund: doppelte Navigations-Registry

`KK_APP_SHELL` (REGISTRY-Array, ~Zeile 11037) und `KK_V30_SHELL` (eigenes `tabs`-Array, ~Zeile 12706) sind zwei parallele Tab-Listen. Sie wurden in Phase 1 der vorherigen V31-Iteration bereits manuell synchron gehalten (z. B. fuer den Wissens-Tab). PRD Teil 3 §5 verlangt eine **einzige autoritative Tab-Registry** (`KK_NAV`/Tab-Registry-Vertrag). Dies ist der wichtigste A1-Befund: `KK_V30_SHELL.tabs` sollte in Phase A1 additiv aus `KK_APP_SHELL.REGISTRY` abgeleitet werden statt eine zweite Quelle zu bleiben.

## 5. Bereits PRD-konforme Bausteine aus V31 Phase A-E (Vorarbeit, nicht neu zu bauen)

- `KK_MAP` MapAdapter-Vertrag mit `create/registerSource/registerLayer/setLayerVisibility/fitArea/selectFeature/destroy` — deckt sich strukturell mit PRD Teil 4 §6.1.
- `KK_DATA_CORE` + `KK_MARKET` Provider/Cache/LastUpdate-Fundament — deckt sich mit PRD Teil 3 §31 (Provider-Isolation, CacheManager, LastUpdateManager).
- Card-Table-Mobile-Transform, progressive Formular-Disclosure, 44px-Touch-Ziele, Kanban-Scroll-Snap (Phase E) — decken PRD Teil 2 §31 (Responsive System) grossteils ab.
- CRM-Doppelmodul bereits ueber `<details>`-Collapse entschaerft (Phase D) — vollstaendige Konsolidierung gem. PRD Teil 3 §41 (Strangler-Pattern) steht noch aus (Legacy-Formular ist noch vorhanden, nicht nur Read-Adapter).

## 6. Offene Luecken gegenueber dem PRD (fuer Phasenplanung)

- Keine zentrale `KK_NAV`-Schnittstelle (Tab+View+Filter+focusId als ein Aufruf) — bisher nur `openTab`/`openAnchor`.
- Keine formale Schema-Registry mit ID-Praefixen wie in PRD Teil 3 §11 (`ct_`, `fu_`, `dl_`, ...) — die bestehende `uid(prefix)`-Funktion (Zeile ~1663) erzeugt bereits praefixierte IDs (`contact_`, `fu_`, `act_`, `obj_`, `ref_`, `crm_`, `kk12_`, `kkcrm_`, `kkfu_`, `kkref20_`), d. h. die Grundidee ist vorhanden, aber nicht als dokumentiertes, zentrales Schema — in A2 formalisieren statt neu erfinden.
- Geometrie der MKK-Gemeinden ist NICHT amtlich (Teil 4 §10 verlangt BKG VG250) — aktuell Naeherungskoordinaten, in Phase A/M-Berichten bereits ehrlich als 'unverifiziert' gekennzeichnet.
- Kein Netlify-Function-Provider fuer echte Marktdaten (Teil 4 §20/§21) — aktuell keine externe Quelle angebunden (`KK_MARKET` hat StaticJsonAdapter, keine Live-Quelle).
- Kein Source Registry / Provider Dossier / ADR-Verzeichnis vorhanden (wird in diesem Phase-0-Commit erstmals angelegt).
- Keine dokumentierte Zugriffsschutzstrategie fuer die oeffentliche Netlify-URL (Teil 1 §16, Teil 4 §42) — reales Risiko, da Netlify-Deploy bereits existiert (index.html auf main).
