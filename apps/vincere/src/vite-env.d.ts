/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: 'local' | 'preview' | 'beta' | 'production';
  readonly VITE_DATA_MODE?: 'demo' | 'live';
  readonly VITE_APP_VERSION?: string;
  readonly VITE_RELEASE_SHA?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_ENABLE_MOCK_DATA?: string;
  readonly VITE_ENABLE_PROVIDER_FUNCTIONS?: string;
  readonly VITE_ENABLE_DEVELOPER_TOOLS?: string;
  readonly VITE_FEATURE_APPOINTMENTS?: string;
  readonly VITE_FEATURE_VALUATIONS?: string;
  readonly VITE_FEATURE_NETWORK?: string;
  readonly VITE_FEATURE_CONFLICT_RESOLUTION?: string;
  readonly VITE_FEATURE_AI_MOCK_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
