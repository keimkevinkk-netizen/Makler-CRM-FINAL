import { describe, expect, it } from 'vitest';
import { getRuntimeConfig, getSupabaseConfig } from '../src/config/runtime';

describe('VINCERE runtime configuration', () => {
  it('defaults local development to a visibly isolated demo mode', () => {
    const config = getRuntimeConfig({ VITE_APP_ENV: 'local' });

    expect(config.environment).toBe('local');
    expect(config.dataMode).toBe('demo');
    expect(config.mockDataEnabled).toBe(true);
    expect(config.providerFunctionsEnabled).toBe(false);
  });

  it('fails closed when beta has no protected cloud configuration', () => {
    const config = getRuntimeConfig({ VITE_APP_ENV: 'beta', VITE_DATA_MODE: 'live' });

    expect(config.protectedDataReady).toBe(false);
    expect(config.issues).toContainEqual(expect.objectContaining({ code: 'cloud-not-configured', severity: 'blocking' }));
  });

  it('accepts an explicitly configured private beta without mock data', () => {
    const config = getRuntimeConfig({
      VITE_APP_ENV: 'beta',
      VITE_DATA_MODE: 'live',
      VITE_ENABLE_MOCK_DATA: 'false',
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_key',
    });

    expect(config.protectedDataReady).toBe(true);
    expect(config.supabase.configured).toBe(true);
    expect(config.mockDataEnabled).toBe(false);
  });

  it('rejects service-role or secret keys in browser configuration', () => {
    expect(() => getSupabaseConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_service_role_key',
    })).toThrow(/Service-Role|Secret/);
  });

  it('rejects mock data in production', () => {
    expect(() => getRuntimeConfig({
      VITE_APP_ENV: 'production',
      VITE_DATA_MODE: 'demo',
      VITE_ENABLE_MOCK_DATA: 'true',
    })).toThrow(/Produktionsumgebung/);
  });

  it('requires HTTPS for non-local cloud endpoints', () => {
    expect(() => getSupabaseConfig({
      VITE_SUPABASE_URL: 'http://project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_key',
    })).toThrow(/HTTPS/);
  });
});
