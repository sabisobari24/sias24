import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase (Can be defined in AI Studio Secrets, .env, or Vercel dashboard)
const supabaseUrl = ((import.meta.env.VITE_SUPABASE_URL as string) || '').trim();
const rawPublishableKey = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '').trim();
const rawAnonKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim();

function isSecretSupabaseKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;
  if (key.startsWith('eyJ')) {
    try {
      const parts = key.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.role === 'service_role') return true;
      }
    } catch {
      /* ignore malformed jwt */
    }
  }
  return false;
}

const resolvedBrowserKey = (() => {
  if (rawPublishableKey && !isSecretSupabaseKey(rawPublishableKey) && rawPublishableKey.length > 20) {
    return rawPublishableKey;
  }
  if (rawAnonKey && !isSecretSupabaseKey(rawAnonKey) && rawAnonKey.length > 20) {
    return rawAnonKey;
  }
  return '';
})();

export const isSupabaseSecretKeyConfigured = (): boolean => {
  if (resolvedBrowserKey) return false;
  return isSecretSupabaseKey(rawAnonKey) || isSecretSupabaseKey(rawPublishableKey);
};

/**
 * Checks whether Supabase has been configured with valid browser-safe credentials
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    resolvedBrowserKey &&
    supabaseUrl.startsWith('https://') &&
    resolvedBrowserKey.length > 20 &&
    !supabaseUrl.includes('placeholder')
  );
};

/**
 * Supabase client instance (initialized only when a non-secret browser key is provided)
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, resolvedBrowserKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
