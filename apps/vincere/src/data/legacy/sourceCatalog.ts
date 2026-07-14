import type { LegacySourceDefinition } from '../../features/migration/types';

export const LEGACY_SOURCE_CATALOG: readonly LegacySourceDefinition[] = [
  { key: 'kk_crm_contacts', status: 'canonical', entity: 'contact', priority: 100, description: 'Kanonische CRM-Kontakte' },
  { key: 'kk_eigentuemer', status: 'legacy', entity: 'contact', priority: 70, description: 'Historische Eigentümer-Datensätze' },
  { key: 'kk_crmpro_leads', status: 'parallel', entity: 'contact', priority: 65, description: 'CRM-Pro-Leads und Kontaktentwürfe' },
  { key: 'kk_crm_referrals', status: 'parallel', entity: 'contact', priority: 60, description: 'Tippgeber aus dem CRM-Repository' },
  { key: 'kk_referral_network_v1', status: 'canonical', entity: 'contact', priority: 90, description: 'Kanonisches Tippgeber-Netzwerk' },

  { key: 'kk_crm_activities', status: 'canonical', entity: 'activity', priority: 100, description: 'Kanonische CRM-Aktivitäten' },
  { key: 'kk_calls_log_v27', status: 'legacy', entity: 'activity', priority: 55, description: 'Historisches Anrufprotokoll' },

  { key: 'kk_followups', status: 'canonical', entity: 'followup', priority: 100, description: 'Kanonische Follow-ups' },
  { key: 'kk_crm_followups', status: 'parallel', entity: 'followup', priority: 70, description: 'CRM-interne Follow-up-Struktur' },
  { key: 'kk_fu_items', status: 'legacy', entity: 'followup', priority: 50, description: 'Historisches Follow-up-Modul' },

  { key: 'kk_crm_objects', status: 'canonical', entity: 'property', priority: 100, description: 'Kanonische zentrale Objektdatenbank' },
  { key: 'kk12_objects', status: 'legacy', entity: 'property', priority: 45, description: 'Historische V12-Objekte' },

  { key: 'kk_sales_pipeline', status: 'canonical', entity: 'pipeline', priority: 100, description: 'Kanonische Vertriebspipeline' },
  { key: 'kk_pipeline_deals', status: 'parallel', entity: 'pipeline', priority: 70, description: 'Parallele Deal-Struktur' },
  { key: 'kk_sales_pipeline_v15', status: 'legacy', entity: 'pipeline', priority: 50, description: 'Historische Sales-Pipeline V15' },
  { key: 'kk_pipeline_module', status: 'legacy', entity: 'pipeline', priority: 45, description: 'Historisches Pipeline-Modul' },
  { key: 'kk_pipeline_production_stages_v1', status: 'parallel', entity: 'pipeline', priority: 60, description: 'Produktionsstufen der Pipeline' },
  { key: 'kk_crm_owner_pipeline', status: 'parallel', entity: 'pipeline', priority: 65, description: 'Eigentümer-Pipeline aus CRM Pro' },

  { key: 'kk_valuation_pipeline', status: 'parallel', entity: 'valuation', priority: 70, description: 'Bewertungs- und Termin-Chancen' },

  { key: 'kk_market_observations_v1', status: 'canonical', entity: 'market', priority: 100, description: 'Kanonische Marktbeobachtungen' },
  { key: 'kk_market_monitor_entries_v1', status: 'legacy', entity: 'market', priority: 55, description: 'Historische Marktmonitor-Einträge' },
] as const;

const catalogByKey = new Map(LEGACY_SOURCE_CATALOG.map((source) => [source.key, source]));

export function findLegacySource(key: string): LegacySourceDefinition | undefined {
  return catalogByKey.get(key);
}

export const SUPPORTED_LEGACY_KEYS = new Set(LEGACY_SOURCE_CATALOG.map((source) => source.key));
