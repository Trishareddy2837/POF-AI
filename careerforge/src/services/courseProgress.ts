import { supabase } from '../lib/supabase';

export type CourseProgressStatus = 'saved' | 'in_progress' | 'completed';
export type CourseProgressRecord = { course_id: string; status: CourseProgressStatus; updated_at: string; completion_source: 'self_reported' | null };
export type CourseRoadmapLink = { roadmap_id: string; course_id: string };
const storageKey = (userId?: string) => `careerforge.course-progress.${userId || 'guest'}`;

export async function loadCourseProgress(userId?: string): Promise<CourseProgressRecord[]> {
  if (userId && supabase) {
    const { data, error } = await supabase.from('course_learning_progress').select('course_id,status,updated_at,completion_source').eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as CourseProgressRecord[];
  }
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) || '[]') as CourseProgressRecord[]; }
  catch { return []; }
}

export async function setCourseProgress(courseId: string, status: CourseProgressStatus | null, userId?: string): Promise<CourseProgressRecord[]> {
  if (userId && supabase) {
    if (status) {
      const { error } = await supabase.from('course_learning_progress').upsert({ user_id: userId, course_id: courseId, status, completion_source: status === 'completed' ? 'self_reported' : null }, { onConflict: 'user_id,course_id' });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('course_learning_progress').delete().eq('user_id', userId).eq('course_id', courseId);
      if (error) throw new Error(error.message);
    }
    return loadCourseProgress(userId);
  }
  const records = await loadCourseProgress(userId);
  const next = records.filter(record => record.course_id !== courseId);
  if (status) next.push({ course_id: courseId, status, updated_at: new Date().toISOString(), completion_source: status === 'completed' ? 'self_reported' : null });
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
}

export async function loadCourseRoadmapLinks(userId: string): Promise<CourseRoadmapLink[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('course_roadmap_links').select('roadmap_id,course_id').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as CourseRoadmapLink[];
}

export async function addCourseToRoadmap(roadmapId: string, courseId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('course_roadmap_links').upsert({ user_id: userId, roadmap_id: roadmapId, course_id: courseId }, { onConflict: 'user_id,roadmap_id,course_id' });
  if (error) throw new Error(error.message);
}
