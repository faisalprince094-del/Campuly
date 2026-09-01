import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase URL & Public Anon Key configuration with resilient hardcoded fallbacks
const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://gehsrgxcymletikxarga.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_caDAhzna2PLD4b5IWkctXg_RBjKqXIn';

let cachedSupabase: SupabaseClient | null = null;

/**
 * Initializes or retrieves cached Supabase client instance.
 * Safe for both browser and serverless environments.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    return null;
  }

  try {
    cachedSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
    });
    return cachedSupabase;
  } catch (err) {
    console.error('[Supabase Init Error]:', err);
    return null;
  }
}

export const supabase = getSupabaseClient();
