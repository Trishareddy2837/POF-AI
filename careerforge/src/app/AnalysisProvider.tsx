import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { loadActions, loadLatest, loadSelected, type ActionRow, type AnalysisRow, type SelectedRow } from '../services/careerAnalysis';
import { errMsg } from '../lib/utils';
export interface AnalysisState { latest: AnalysisRow | null; actions: ActionRow[]; selected: SelectedRow | null; loading: boolean; error: string | null; reload: () => Promise<void> }
export const AnalysisContext = createContext<AnalysisState>({ latest: null, actions: [], selected: null, loading: false, error: null, reload: async () => {} });
export const useAnalysis = () => useContext(AnalysisContext);
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const uid = user?.id;
  const [s, setS] = useState<Omit<AnalysisState, 'reload'>>({ latest: null, actions: [], selected: null, loading: false, error: null });
  const reload = useCallback(async () => {
    if (!uid) { setS({ latest: null, actions: [], selected: null, loading: false, error: null }); return; }
    setS(p => ({ ...p, loading: true }));
    try { const [latest, selected] = await Promise.all([loadLatest(uid), loadSelected(uid)]); const actions = latest ? await loadActions(latest.id) : []; setS({ latest, actions, selected, loading: false, error: null }); }
    catch (e) { setS(p => ({ ...p, loading: false, error: errMsg(e) })); }
  }, [uid]);
  useEffect(() => { void reload(); }, [reload]);
  return <AnalysisContext.Provider value={{ ...s, reload }}>{children}</AnalysisContext.Provider>;
}
