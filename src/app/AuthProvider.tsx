import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
export interface AuthState { session: Session | null; user: User | null; loading: boolean }
export const AuthContext = createContext<AuthState>({ session: null, user: null, loading: false });
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: Boolean(supabase) });
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    void supabase.auth.getSession().then(({ data }) => { if (live) setState({ session: data.session, user: data.session?.user ?? null, loading: false }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setState({ session: s, user: s?.user ?? null, loading: false }));
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
