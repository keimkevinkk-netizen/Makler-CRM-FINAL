export type AppEnvironment = 'local' | 'preview' | 'beta' | 'production';
export type DataMode = 'demo' | 'live';

export interface SupabaseRuntimeConfig {
  url: string;
  publishableKey: string;
  configured: boolean;
}

export interface RuntimeIssue {
  code: string;
  severity: 'warning' | 'blocking';
  message: string;
}

export interface RuntimeConfig {
  environment: AppEnvironment;
  dataMode: DataMode;
  appVersion: string;
  release: string;
  supabase: SupabaseRuntimeConfig;
  mockDataEnabled: boolean;
  providerFunctionsEnabled: boolean;
  developerToolsEnabled: boolean;
  issues: RuntimeIssue[];
  protectedDataReady: boolean;
}

type EnvSource = Partial<Record<string, string | undefined>>;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const truthy = new Set(['1', 'true', 'yes', 'on']);
const falsy = new Set(['0', 'false', 'no', 'off']);

function readBoolean(value: string | undefined, fallback = false) {
  if (value === undefined || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (truthy.has(normalized)) return true;
  if (falsy.has(normalized)) return false;
  throw new Error(`Ungültiger boolescher Umgebungswert: ${value}`);
}

function readEnvironment(env: EnvSource): AppEnvironment {
  const requested = env.VITE_APP_ENV?.trim().toLowerCase();
  if (!requested) return env.MODE === 'production' ? 'production' : 'local';
  if (requested === 'local' || requested === 'preview' || requested === 'beta' || requested === 'production') {
    return requested;
  }
  throw new Error(`VITE_APP_ENV besitzt einen ungültigen Wert: ${requested}`);
}

function decodeJwtRole(value: string) {
  const segments = value.split('.');
  if (segments.length !== 3) return '';
  try {
    const normalized = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(globalThis.atob(padded)) as { role?: string };
    return payload.role?.toLowerCase() ?? '';
  } catch {
    return '';
  }
}

function assertBrowserSafeKey(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.startsWith('sb_secret_')
    || normalized.includes('service_role')
    || decodeJwtRole(value) === 'service_role'
  ) {
    throw new Error('Ein Service-Role- oder Secret-Schlüssel darf niemals im VINCERE-Browserbundle verwendet werden.');
  }
}

export function getSupabaseConfig(env: EnvSource = import.meta.env as EnvSource): SupabaseRuntimeConfig {
  const url = trimTrailingSlash(env.VITE_SUPABASE_URL?.trim() ?? '');
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

  if (!url && !publishableKey) return { url: '', publishableKey: '', configured: false };
  if (!url || !publishableKey) {
    throw new Error('VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY müssen gemeinsam gesetzt werden.');
  }

  assertBrowserSafeKey(publishableKey);

  try {
    const parsed = new URL(url);
    const localHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
    if (parsed.username || parsed.password) throw new Error('credentials');
    if (parsed.protocol !== 'https:' && !localHost) throw new Error('protocol');
  } catch {
    throw new Error('VITE_SUPABASE_URL ist keine sichere, gültige URL. Außerhalb von localhost ist HTTPS verpflichtend.');
  }

  return { url, publishableKey, configured: true };
}

export function getRuntimeConfig(env: EnvSource = import.meta.env as EnvSource): RuntimeConfig {
  const environment = readEnvironment(env);
  const supabase = getSupabaseConfig(env);
  const defaultDataMode: DataMode = environment === 'local' || environment === 'preview' ? 'demo' : 'live';
  const requestedDataMode = env.VITE_DATA_MODE?.trim().toLowerCase() || defaultDataMode;
  if (requestedDataMode !== 'demo' && requestedDataMode !== 'live') {
    throw new Error(`VITE_DATA_MODE besitzt einen ungültigen Wert: ${requestedDataMode}`);
  }

  const dataMode = requestedDataMode as DataMode;
  const mockDataEnabled = readBoolean(env.VITE_ENABLE_MOCK_DATA, dataMode === 'demo');
  const providerFunctionsEnabled = readBoolean(env.VITE_ENABLE_PROVIDER_FUNCTIONS, false);
  const developerToolsEnabled = readBoolean(env.VITE_ENABLE_DEVELOPER_TOOLS, environment === 'local');

  if (environment === 'production' && (dataMode === 'demo' || mockDataEnabled)) {
    throw new Error('Die Produktionsumgebung darf nicht mit Demo- oder Mock-Daten gestartet werden.');
  }
  if (providerFunctionsEnabled && !supabase.configured) {
    throw new Error('Produktive Providerfunktionen benötigen eine vollständig konfigurierte Cloud-Umgebung.');
  }
  if (environment === 'production' && developerToolsEnabled) {
    throw new Error('Interne Entwicklungsfunktionen dürfen in Produktion nicht aktiviert werden.');
  }

  const issues: RuntimeIssue[] = [];
  if ((environment === 'beta' || environment === 'production') && !supabase.configured) {
    issues.push({
      code: 'cloud-not-configured',
      severity: 'blocking',
      message: `${environment === 'beta' ? 'Beta' : 'Produktion'} benötigt eine konfigurierte, geschützte Cloud-Authentifizierung.`,
    });
  }
  if (environment === 'beta' && mockDataEnabled) {
    issues.push({
      code: 'beta-mock-data',
      severity: 'warning',
      message: 'Mock-Daten sind in der Beta aktiv und müssen sichtbar als Testdaten gekennzeichnet bleiben.',
    });
  }
  if (dataMode === 'live' && mockDataEnabled) {
    issues.push({
      code: 'live-mock-mismatch',
      severity: 'blocking',
      message: 'Live-Datenmodus und Mock-Daten dürfen nicht gleichzeitig aktiv sein.',
    });
  }

  return {
    environment,
    dataMode,
    appVersion: env.VITE_APP_VERSION?.trim() || '0.1.0',
    release: env.VITE_RELEASE_SHA?.trim() || 'local',
    supabase,
    mockDataEnabled,
    providerFunctionsEnabled,
    developerToolsEnabled,
    issues,
    protectedDataReady: !issues.some((issue) => issue.severity === 'blocking'),
  };
}

export const runtimeConfig = getRuntimeConfig();
export const supabaseConfig = runtimeConfig.supabase;
