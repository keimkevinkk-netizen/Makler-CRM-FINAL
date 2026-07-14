import { describe, expect, it } from 'vitest';
import { createFeatureFlagRegistry } from '../src/config/featureFlags';
import { getRuntimeConfig } from '../src/config/runtime';

describe('VINCERE feature flags', () => {
  it('keeps stable core functions available while unintegrated modules stay disabled', () => {
    const runtime = getRuntimeConfig({ VITE_APP_ENV: 'local' });
    const flags = createFeatureFlagRegistry(runtime, {});

    expect(flags.contacts.enabled).toBe(true);
    expect(flags.followUps.enabled).toBe(true);
    expect(flags.properties.enabled).toBe(true);
    expect(flags.realtime.enabled).toBe(false);
    expect(flags.migration.enabled).toBe(false);
    expect(flags.privacyCenter.enabled).toBe(false);
  });

  it('does not enable productive providers through a generic feature override', () => {
    const runtime = getRuntimeConfig({ VITE_APP_ENV: 'local' });
    const flags = createFeatureFlagRegistry(runtime, { VITE_FEATURE_PROVIDER_FUNCTIONS: 'true' });

    expect(flags.providerFunctions.enabled).toBe(false);
  });

  it('allows explicit experimental preview features but disables them in production', () => {
    const preview = getRuntimeConfig({ VITE_APP_ENV: 'preview', VITE_DATA_MODE: 'demo' });
    const previewFlags = createFeatureFlagRegistry(preview, { VITE_FEATURE_APPOINTMENTS: 'true' });
    expect(previewFlags.appointments.enabled).toBe(true);

    const production = getRuntimeConfig({
      VITE_APP_ENV: 'production',
      VITE_DATA_MODE: 'live',
      VITE_ENABLE_MOCK_DATA: 'false',
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_key',
    });
    const productionFlags = createFeatureFlagRegistry(production, { VITE_FEATURE_APPOINTMENTS: 'true' });
    expect(productionFlags.appointments.enabled).toBe(false);
  });
});
