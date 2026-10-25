import { supabase } from '../lib/supabase';
import type { ProfileData } from '../lib/completion';
import { buildActions, buildSkillGaps, dataLevel, exploreCareers, inputVersion, rankCareers, type MatchInput } from '../lib/careerMatching';
import { buildAiRequest, buildResult } from '../lib/analysisEngine';
import { CAREERS } from '../data/careerCatalogue';
import { analysisResultSchema, type AnalysisResult } from '../schemas/analysis';
import { generateNarrative, type ProviderMode } from './aiProvider';
import { listEntries } from './profile';
const db = () => { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; };
export interface AnalysisRow { id: string; created_at: string; provider_mode: ProviderMode; result: AnalysisResult }
export interface ActionRow { id: string; analysis_id: string; career_id: string; skill: string | null; kind: 'learn' | 'practice' | 'project'; text: string; completed: boolean }
export interface SelectedRow { career_id: string; title: string; analysis_id: string | null; selected_at: string }

export async function loadMatchInput(data: ProfileData, extras?: { interests?: string; notes?: string }): Promise<MatchInput> {
  const [p, c, x] = await Promise.all([listEntries('projects'), listEntries('certifications'), listEntries('experiences')]);
  const ev = (kind: 'project' | 'certification' | 'experience', rows: Record<string, string>[]) => rows.map(r => ({ kind, title: r.title ?? '', text: `${r.title ?? ''} ${r.description ?? ''} ${r.issuer ?? ''} ${r.organization ?? ''}` }));
  return { degree: data.degree ?? '', specialization: data.specialization ?? '', interests: [data.interests, extras?.interests].filter(Boolean).join(', '), targetRoles: data.targetRoles ?? '', goals: [data.goals, extras?.notes].filter(Boolean).join(' '), skills: data.skills ?? [], evidence: [...ev('project', p), ...ev('certification', c), ...ev('experience', x)] };
}
const parseRow = (r: { id: string; created_at: string; provider_mode: ProviderMode; result: unknown }): AnalysisRow => {
  const v = analysisResultSchema.safeParse(r.result); if (!v.success) throw new Error('A saved analysis failed validation and was not displayed.');
  return { id: r.id, created_at: r.created_at, provider_mode: r.provider_mode, result: v.data };
};
/** Validate -> match -> narrate -> validate -> save. Throws (never falls back to demo) if the real provider fails. */
export async function runAnalysis(uid: string, data: ProfileData, mode: ProviderMode, extras?: { interests?: string; notes?: string }): Promise<string> {
  const input = await loadMatchInput(data, extras);
  // Analysis always runs. With no information at all we show unscored starting areas instead of fake scores.
  const exploratory = dataLevel(input) === 'none';
  const matches = exploratory ? exploreCareers() : rankCareers(input);
  const result = analysisResultSchema.parse(buildResult(input, matches, await generateNarrative(buildAiRequest(input, matches), mode), mode, exploratory));
  const c = db();
  const prev = await c.from('recommended_actions').select('career_id,skill,kind,text').eq('user_id', uid).eq('completed', true);
  const done = new Set((prev.data ?? []).map((a: { career_id: string; skill: string | null; kind: string; text: string }) => `${a.career_id}|${a.skill}|${a.kind}|${a.text}`));
  const ins = await c.from('career_analyses').insert({ user_id: uid, provider_mode: mode, input_version: inputVersion(input), summary: result.summary.slice(0, 1500), result }).select('id').single();
  if (ins.error || !ins.data) throw new Error(ins.error?.message ?? 'Could not save the analysis.');
  const id = ins.data.id as string; const now = new Date().toISOString();
  const actions = (exploratory ? [] : matches.slice(0, 3)).flatMap(m => { const def = CAREERS.find(k => k.id === m.careerId)!; return buildActions(def, buildSkillGaps(m)); })
    .map(a => { const was = done.has(`${a.careerId}|${a.skill}|${a.kind}|${a.text}`); return { analysis_id: id, user_id: uid, career_id: a.careerId, skill: a.skill, kind: a.kind, text: a.text, completed: was, completed_at: was ? now : null }; });
  const insertRows = (t: string, r: unknown[]) => (r.length ? c.from(t).insert(r) : Promise.resolve({ error: null }));
  const rows = await Promise.all([
    insertRows('career_recommendations', result.careerPaths.map((p, i) => ({ analysis_id: id, user_id: uid, career_id: p.careerId, title: p.title, fit_score: p.fitScore, rank: i + 1 }))),
    insertRows('skill_gaps', result.skillGaps.map(g => ({ analysis_id: id, user_id: uid, career_id: g.careerId, skill: g.skill, importance: g.importance, status: g.status, reason: g.reason }))),
    insertRows('recommended_actions', actions)]);
  const bad = rows.find(r => r.error);
  if (bad?.error) { await c.from('career_analyses').delete().eq('id', id); throw new Error(`Could not save the analysis: ${bad.error.message}`); }
  return id;
}
export async function loadLatest(uid: string): Promise<AnalysisRow | null> {
  const { data, error } = await db().from('career_analyses').select('id,created_at,provider_mode,result').eq('user_id', uid).eq('status', 'completed').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message); return data ? parseRow(data) : null;
}
export async function loadHistory(uid: string): Promise<{ id: string; created_at: string; provider_mode: ProviderMode; summary: string }[]> {
  const { data, error } = await db().from('career_analyses').select('id,created_at,provider_mode,summary').eq('user_id', uid).order('created_at', { ascending: false }).limit(20);
  if (error) throw new Error(error.message); return data ?? [];
}
export async function loadAnalysis(id: string): Promise<AnalysisRow> {
  const { data, error } = await db().from('career_analyses').select('id,created_at,provider_mode,result').eq('id', id).single(); if (error) throw new Error(error.message); return parseRow(data);
}
export async function loadActions(analysisId: string): Promise<ActionRow[]> {
  const { data, error } = await db().from('recommended_actions').select('id,analysis_id,career_id,skill,kind,text,completed').eq('analysis_id', analysisId); if (error) throw new Error(error.message); return data ?? [];
}
export async function toggleAction(id: string, completed: boolean) {
  const { error } = await db().from('recommended_actions').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', id); if (error) throw new Error(error.message);
}
export async function deleteAnalysis(id: string) { const { error } = await db().from('career_analyses').delete().eq('id', id); if (error) throw new Error(error.message); }
export async function loadSelected(uid: string): Promise<SelectedRow | null> {
  const { data, error } = await db().from('selected_career_paths').select('career_id,title,analysis_id,selected_at').eq('user_id', uid).maybeSingle(); if (error) throw new Error(error.message); return data;
}
export async function selectCareer(uid: string, careerId: string, title: string, analysisId: string | null) {
  const { error } = await db().from('selected_career_paths').upsert({ user_id: uid, career_id: careerId, title, analysis_id: analysisId, selected_at: new Date().toISOString() }, { onConflict: 'user_id' }); if (error) throw new Error(error.message);
}
