import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
/** True only when real project credentials are present. UI must show a setup state otherwise. */
export const isSupabaseConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT'));
export const supabase = isSupabaseConfigured ? createClient(url!, key!, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null;
