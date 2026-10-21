import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = null;

// Allow dynamic client re-initialization if configured in UI Settings
export function initSupabase(url: string, key: string): SupabaseClient | null {
  if (!url || !key || !url.startsWith('http')) {
    supabase = null;
    return null;
  }
  try {
    supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabase;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    supabase = null;
    return null;
  }
}

// Initial initialization if env vars exist
if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  initSupabase(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
