import { supabase, isSupabaseConfigured } from '../lib/supabase';
const need = () => { if (!supabase) throw new Error('Supabase is not configured. Copy .env.example to .env and add your project keys.'); return supabase; };
export const authService = {
  configured: isSupabaseConfigured,
  signUp: (email: string, password: string, fullName: string) =>
    need().auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${location.origin}/auth/callback` } }),
  signIn: (email: string, password: string) => need().auth.signInWithPassword({ email, password }),
  google: (next = '/dashboard') => need().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } }),
  forgot: (email: string) => need().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` }),
  updatePassword: (password: string) => need().auth.updateUser({ password }),
  signOut: () => need().auth.signOut(),
};
