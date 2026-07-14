export interface SupabaseRuntimeConfig {
  url: string;
  publishableKey: string;
  configured: boolean;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export function getSupabaseConfig(): SupabaseRuntimeConfig {
  const url = trimTrailingSlash(import.meta.env.VITE_SUPABASE_URL?.trim() ?? '');
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

  if (!url || !publishableKey) {
    return { url: '', publishableKey: '', configured: false };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      throw new Error('Supabase muss über HTTPS erreichbar sein.');
    }
  } catch {
    throw new Error('VITE_SUPABASE_URL ist keine gültige URL.');
  }

  return { url, publishableKey, configured: true };
}

export const supabaseConfig = getSupabaseConfig();
