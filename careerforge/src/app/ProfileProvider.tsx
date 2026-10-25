import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { calculateCompletion } from '../lib/completion';
import { emptyBundle, loadProfile, type ProfileBundle } from '../services/profile';
import { errMsg } from '../lib/utils';
export interface ProfileState extends ProfileBundle { loading: boolean; error: string | null; completion: { percent: number; missing: string[] }; reload: () => Promise<void> }
export const ProfileContext = createContext<ProfileState>({ ...emptyBundle, loading: false, error: null, completion: calculateCompletion({}), reload: async () => {} });
export const useProfile = () => useContext(ProfileContext);
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const uid = user?.id;
  const [bundle, setBundle] = useState<ProfileBundle>(emptyBundle);
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!uid) { setBundle(emptyBundle); return; }
    setLoading(true);
    try { setBundle(await loadProfile(uid)); setError(null); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [uid]);
  useEffect(() => { void reload(); }, [reload]);
  const completion = useMemo(() => calculateCompletion(bundle.data), [bundle.data]);
  return <ProfileContext.Provider value={{ ...bundle, loading, error, completion, reload }}>{children}</ProfileContext.Provider>;
}
