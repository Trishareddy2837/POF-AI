import { supabase } from '../lib/supabase';
import type { OpportunityKind, OpportunityStatus } from '../data/opportunityCatalogue';

export interface TrackingRecord { opportunity_id: string; opportunity_kind: OpportunityKind; title: string; organization: string; status: OpportunityStatus; application_url: string | null; applied_at: string | null; next_action: string; follow_up_date: string | null; notes: string; resume_document_id: string | null; updated_at: string }
const key = (userId?: string) => `careerforge.opportunity-tracking.${userId || 'guest'}`;
export async function loadTracking(userId?: string): Promise<TrackingRecord[]> {
  if (userId && supabase) { const { data, error } = await supabase.from('student_opportunity_tracking').select('*').eq('user_id', userId).order('updated_at', { ascending: false }); if (error) throw new Error(error.message); return (data ?? []) as TrackingRecord[]; }
  try { return JSON.parse(localStorage.getItem(key(userId)) || '[]') as TrackingRecord[]; } catch { return []; }
}
export async function saveTracking(record: Omit<TrackingRecord, 'updated_at'>, userId?: string): Promise<TrackingRecord[]> {
  const appliedAt = record.status === 'applied' && !record.applied_at ? new Date().toISOString() : record.applied_at;
  const nextRecord = { ...record, applied_at: appliedAt, updated_at: new Date().toISOString() };
  if (userId && supabase) { const { error } = await supabase.from('student_opportunity_tracking').upsert({ ...record, applied_at: appliedAt, user_id: userId }, { onConflict: 'user_id,opportunity_id' }); if (error) throw new Error(error.message); return loadTracking(userId); }
  const records = (await loadTracking(userId)).filter(item => item.opportunity_id !== record.opportunity_id); records.unshift(nextRecord); localStorage.setItem(key(userId), JSON.stringify(records)); return records;
}
export async function removeTracking(opportunityId: string, userId?: string): Promise<TrackingRecord[]> {
  if (userId && supabase) { const { error } = await supabase.from('student_opportunity_tracking').delete().eq('user_id', userId).eq('opportunity_id', opportunityId); if (error) throw new Error(error.message); return loadTracking(userId); }
  const records = (await loadTracking(userId)).filter(item => item.opportunity_id !== opportunityId); localStorage.setItem(key(userId), JSON.stringify(records)); return records;
}
