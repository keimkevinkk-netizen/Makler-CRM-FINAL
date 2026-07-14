import { runtimeConfig, type AppEnvironment, type RuntimeConfig } from './runtime';

export type FeatureFlagStatus = 'stable' | 'experimental' | 'disabled' | 'internal';

export type FeatureFlagKey =
  | 'contacts'
  | 'followUps'
  | 'properties'
  | 'appointments'
  | 'communication'
  | 'valuations'
  | 'network'
  | 'forecast'
  | 'realtime'
  | 'conflictResolution'
  | 'offlineCapture'
  | 'migration'
  | 'dataQuality'
  | 'privacyCenter'
  | 'aiMockMode'
  | 'mockData'
  | 'providerFunctions'
  | 'developerTools';

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  label: string;
  status: FeatureFlagStatus;
  enabled: boolean;
  reason: string;
}

type EnvSource = Partial<Record<string, string | undefined>>;

const statusDefaults: Record<FeatureFlagStatus, boolean> = {
  stable: true,
  experimental: false,
  disabled: false,
  internal: false,
};

const definitions: Array<Omit<FeatureFlagDefinition, 'enabled'>> = [
  { key: 'contacts', label: 'Kontakte', status: 'stable', reason: 'Kernfunktion mit Rollenprüfung und Workspace-Persistenz.' },
  { key: 'followUps', label: 'Follow-ups', status: 'stable', reason: 'Kernfunktion mit Rollenprüfung und Auditereignissen.' },
  { key: 'properties', label: 'Immobilien', status: 'stable', reason: 'Kernfunktion mit Eigentümerkonsistenzprüfung.' },
  { key: 'appointments', label: 'Termine', status: 'experimental', reason: 'Anzeige vorhanden; vollständige Bearbeitung und E2E-Abdeckung fehlen.' },
  { key: 'communication', label: 'Kommunikation', status: 'disabled', reason: 'Produktive Provider und vollständige Kommunikationszentrale sind nicht integriert.' },
  { key: 'valuations', label: 'Bewertungen', status: 'experimental', reason: 'Oberfläche vorhanden; belastbare Bewertungslogik und Datenquellen fehlen.' },
  { key: 'network', label: 'Netzwerk', status: 'experimental', reason: 'Grundseite vorhanden; vollständige Netzwerkdomäne fehlt.' },
  { key: 'forecast', label: 'Forecast', status: 'disabled', reason: 'Forecast-Feature ist im Integrationsbranch nicht vollständig vorhanden.' },
  { key: 'realtime', label: 'Realtime', status: 'disabled', reason: 'Keine produktive Realtime-Subscription ist im Integrationsbranch aktiv.' },
  { key: 'conflictResolution', label: 'Konfliktauflösung', status: 'experimental', reason: 'Versionskonflikte werden erkannt, aber noch nicht interaktiv aufgelöst.' },
  { key: 'offlineCapture', label: 'Offline-Erfassung', status: 'disabled', reason: 'Es existiert noch keine freigegebene Offline-Queue oder Service-Worker-Strategie.' },
  { key: 'migration', label: 'Migration', status: 'disabled', reason: 'Kontrollierter Legacy-Importer ist nicht in den Integrationsbranch übernommen.' },
  { key: 'dataQuality', label: 'Datenqualität', status: 'disabled', reason: 'Datenqualitätszentrale ist nicht in den Integrationsbranch übernommen.' },
  { key: 'privacyCenter', label: 'Datenschutz', status: 'disabled', reason: 'Datenschutz- und Einwilligungszentrale ist nicht in den Integrationsbranch übernommen.' },
  { key: 'aiMockMode', label: 'KI-Mock-Modus', status: 'internal', reason: 'Nur für ausdrücklich gekennzeichnete lokale oder Preview-Tests.' },
  { key: 'mockData', label: 'Mock-Daten', status: 'internal', reason: 'Testdaten dürfen nicht mit Echtdaten vermischt werden.' },
  { key: 'providerFunctions', label: 'Produktive Providerfunktionen', status: 'disabled', reason: 'Nur durch explizite Environment-Konfiguration freischaltbar.' },
  { key: 'developerTools', label: 'Entwicklungsfunktionen', status: 'internal', reason: 'Ausschließlich für lokale Entwicklung und kontrollierte Preview-Umgebungen.' },
];

function envKey(key: FeatureFlagKey) {
  return `VITE_FEATURE_${key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}`;
}

function explicitBoolean(value: string | undefined) {
  if (value === undefined || value.trim() === '') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Ungültiger Feature-Flag-Wert: ${value}`);
}

function environmentAllows(status: FeatureFlagStatus, environment: AppEnvironment) {
  if (status === 'stable') return true;
  if (status === 'experimental') return environment === 'local' || environment === 'preview' || environment === 'beta';
  if (status === 'internal') return environment === 'local' || environment === 'preview';
  return false;
}

export function createFeatureFlagRegistry(
  runtime: RuntimeConfig = runtimeConfig,
  env: EnvSource = import.meta.env as EnvSource,
): Record<FeatureFlagKey, FeatureFlagDefinition> {
  const entries = definitions.map((definition) => {
    const override = explicitBoolean(env[envKey(definition.key)]);
    let enabled = override ?? (statusDefaults[definition.status] && environmentAllows(definition.status, runtime.environment));

    if (definition.status === 'disabled') enabled = false;
    if (definition.key === 'mockData') enabled = runtime.mockDataEnabled;
    if (definition.key === 'providerFunctions') enabled = runtime.providerFunctionsEnabled;
    if (definition.key === 'developerTools') enabled = runtime.developerToolsEnabled;
    if (definition.key === 'aiMockMode') enabled = runtime.environment !== 'production' && Boolean(override);

    if (runtime.environment === 'production' && definition.status !== 'stable') enabled = false;
    if (!runtime.protectedDataReady && ['providerFunctions', 'realtime'].includes(definition.key)) enabled = false;

    return [definition.key, { ...definition, enabled }] as const;
  });

  return Object.fromEntries(entries) as Record<FeatureFlagKey, FeatureFlagDefinition>;
}

export const featureFlags = createFeatureFlagRegistry();

export function isFeatureEnabled(key: FeatureFlagKey) {
  return featureFlags[key].enabled;
}

export function listFeatureFlags() {
  return Object.values(featureFlags);
}
