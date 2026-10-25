import { CAREERS, skillLabel, type CareerDef } from '../data/careerCatalogue';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { assembleAiRoadmap, createDemoRoadmap, roadmapAiResponseSchema } from '../lib/roadmapGenerator';
import { roadmapContentSchema, roadmapPreferencesSchema, type RoadmapContent, type RoadmapPreferences } from '../schemas/roadmap';
import { invokeCareerAnalysis, type ProviderMode } from './aiProvider';

export interface RoadmapRow { id: string; user_id: string; title: string; career_id: string; career_title: string; status: 'active' | 'paused' | 'completed' | 'archived'; preferences: RoadmapPreferences; content: RoadmapContent; created_at: string; updated_at: string }
export interface RoadmapBundle { roadmap: RoadmapRow; completedMilestones: string[]; completedActivities: string[] }
export interface RoadmapGenerationInput { career: CareerDef; currentSkills: string[]; missingSkills: string[]; preferences: RoadmapPreferences; education?: string; experienceHighlights?: string[]; projectHighlights?: string[] }
const db = () => { if (!supabase) throw new Error('Supabase is not configured. Apply the documented database setup before saving a roadmap.'); return supabase; };

export async function generateRoadmapContent(input: RoadmapGenerationInput, mode: ProviderMode): Promise<RoadmapContent> {
  if (mode === 'demo') return createDemoRoadmap(input.career, input.missingSkills.map(name => input.career.skills.find(s => skillLabel(s.name).toLowerCase() === name.toLowerCase())?.name ?? name), input.preferences, input.currentSkills);
  const data = await invokeCareerAnalysis({
    task: 'roadmap', career: { id: input.career.id, title: input.career.title, industry: input.career.industry,
      requiredSkills: input.career.skills.map(s => s.name), entryTitles: input.career.entryTitles, learningResources: input.career.resources, projectIdeas: input.career.projects },
    currentSkills: input.currentSkills.slice(0, 50), missingSkills: input.missingSkills.slice(0, 20), preferences: input.preferences,
    education: input.education?.slice(0, 240) ?? '', experienceHighlights: input.experienceHighlights?.slice(0, 4) ?? [], projectHighlights: input.projectHighlights?.slice(0, 4) ?? [],
  });
  const parsed = roadmapAiResponseSchema.safeParse((data as { data?: unknown } | null)?.data);
  if (!parsed.success) throw new Error('The AI returned an incomplete roadmap. Retry or select the labelled demo option.');
  const allowedResources = new Set(input.career.resources.map(s => s.toLowerCase()));
  const cleaned = { ...parsed.data, phases: parsed.data.phases.map(p => ({ ...p, milestones: p.milestones.map(m => ({ ...m,
    activities: m.activities.map(a => ({ ...a, ...(a.resourceName && allowedResources.has(a.resourceName.toLowerCase()) ? {} : { resourceName: undefined }) })),
  })) })) };
  return assembleAiRoadmap(input.career, input.preferences, cleaned, input.preferences.experienceLevel);
}

export async function saveRoadmap(uid: string, career: CareerDef, preferences: RoadmapPreferences, content: RoadmapContent): Promise<RoadmapRow> {
  const clean = roadmapContentSchema.parse(content); const prefs = roadmapPreferencesSchema.parse(preferences); const c = db();
  const { data, error } = await c.from('career_roadmaps').insert({ user_id: uid, title: `${career.title} learning roadmap`, career_id: career.id, career_title: career.title,
    status: 'active', preferences: prefs, content: clean }).select('*').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not save the roadmap.');
  return { ...data, content: roadmapContentSchema.parse(data.content), preferences: roadmapPreferencesSchema.parse(data.preferences) } as RoadmapRow;
}
export async function listRoadmaps(uid: string, includeArchived = false): Promise<RoadmapRow[]> {
  let query = db().from('career_roadmaps').select('*').eq('user_id', uid).order('updated_at', { ascending: false });
  if (!includeArchived) query = query.neq('status', 'archived');
  const { data, error } = await query; if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({ ...r, content: roadmapContentSchema.parse(r.content), preferences: roadmapPreferencesSchema.parse(r.preferences) })) as RoadmapRow[];
}
export async function listRoadmapBundles(uid: string, includeArchived = false): Promise<RoadmapBundle[]> {
  const [rows, milestones, activities] = await Promise.all([
    listRoadmaps(uid, includeArchived),
    db().from('roadmap_milestone_completions').select('roadmap_id,milestone_id').eq('user_id', uid),
    db().from('roadmap_activity_completions').select('roadmap_id,activity_id').eq('user_id', uid),
  ]);
  if (milestones.error) throw new Error(milestones.error.message); if (activities.error) throw new Error(activities.error.message);
  return rows.map(roadmap => ({ roadmap,
    completedMilestones: (milestones.data ?? []).filter(r => r.roadmap_id === roadmap.id).map(r => r.milestone_id),
    completedActivities: (activities.data ?? []).filter(r => r.roadmap_id === roadmap.id).map(r => r.activity_id),
  }));
}
export async function loadRoadmap(uid: string, id: string): Promise<RoadmapBundle> {
  const c = db(); const { data, error } = await c.from('career_roadmaps').select('*').eq('user_id', uid).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message); if (!data) throw new Error('Roadmap not found or you do not have access to it.');
  const [milestones, activities] = await Promise.all([
    c.from('roadmap_milestone_completions').select('milestone_id').eq('roadmap_id', id).eq('user_id', uid),
    c.from('roadmap_activity_completions').select('activity_id').eq('roadmap_id', id).eq('user_id', uid),
  ]);
  for (const r of [milestones, activities]) if (r.error) throw new Error(r.error.message);
  return { roadmap: { ...data, content: roadmapContentSchema.parse(data.content), preferences: roadmapPreferencesSchema.parse(data.preferences) } as RoadmapRow,
    completedMilestones: (milestones.data ?? []).map(r => r.milestone_id), completedActivities: (activities.data ?? []).map(r => r.activity_id) };
}
export async function markActivityComplete(roadmapId: string, activityId: string): Promise<void> {
  const { error } = await db().rpc('complete_roadmap_activity', { p_roadmap_id: roadmapId, p_activity_id: activityId }); if (error) throw new Error(error.message);
}
export async function markMilestoneComplete(roadmapId: string, milestoneId: string): Promise<void> {
  const { error } = await db().rpc('complete_roadmap_milestone', { p_roadmap_id: roadmapId, p_milestone_id: milestoneId }); if (error) throw new Error(error.message);
}
export async function setRoadmapStatus(roadmapId: string, status: 'active' | 'paused' | 'archived'): Promise<void> {
  const { error } = await db().rpc('set_roadmap_status', { p_roadmap_id: roadmapId, p_status: status }); if (error) throw new Error(error.message);
}
export const roadmapConfigured = isSupabaseConfigured;
export const findCareer = (id: string) => CAREERS.find(c => c.id === id) ?? null;
export function roadmapProgress(bundle: RoadmapBundle): number {
  const milestones = bundle.roadmap.content.phases.flatMap(p => p.milestones);
  const completed = new Set(bundle.completedMilestones);
  return milestones.length ? Math.round(100 * milestones.filter(m => completed.has(m.id)).length / milestones.length) : 0;
}
export function countRoadmapMilestones(content: RoadmapContent): number { return content.phases.reduce((n, p) => n + p.milestones.length, 0); }
export function roadmapPrerequisitesMet(content: RoadmapContent, milestoneId: string, done: string[]): boolean {
  const m = content.phases.flatMap(p => p.milestones).find(x => x.id === milestoneId); return Boolean(m && m.prerequisiteIds.every(id => done.includes(id)));
}
export function isTargetDateUnrealistic(content: RoadmapContent, targetDate: string | null): boolean {
  if (!targetDate) return false; const weeks = Math.max(1, Math.ceil((new Date(`${targetDate}T00:00:00Z`).getTime() - Date.now()) / 604800000));
  return weeks < content.estimatedDurationWeeks;
}
