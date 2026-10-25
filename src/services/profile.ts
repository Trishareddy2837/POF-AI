import { supabase } from '../lib/supabase';
import type { ProfileData } from '../lib/completion';
import { parseSkills, type ProfileForm } from '../schemas/profile';
const db = () => { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; };
const nul = (s: string) => (s.trim() === '' ? null : s.trim());
export interface Attempt { id: string; name: string; score: number; total: number; taken_at: string }
export interface ResumeMeta { file_name: string; size_bytes: number; storage_path: string; uploaded_at: string }
export interface ProfileBundle { data: ProfileData; attempts: Attempt[]; resume: ResumeMeta | null }
export const emptyBundle: ProfileBundle = { data: {}, attempts: [], resume: null };

export async function loadProfile(uid: string): Promise<ProfileBundle> {
  const c = db();
  const [p, e, cp, r, a] = await Promise.all([
    c.from('profiles').select('full_name,phone,city,status').eq('id', uid).maybeSingle(),
    c.from('education_records').select('institution,degree,specialization,graduation_year,pre_degree_type,pre_degree_institution,pre_degree_marks,pre_degree_percentage,btech_marks,btech_percentage').eq('user_id', uid).maybeSingle(),
    c.from('career_preferences').select('interests,target_roles,industries,location_pref,goals,self_reported_skills').eq('user_id', uid).maybeSingle(),
    c.from('resumes').select('file_name,size_bytes,storage_path,uploaded_at').eq('user_id', uid).maybeSingle(),
    c.from('assessment_attempts').select('id,name,score,total,taken_at').eq('user_id', uid).order('taken_at', { ascending: false }).limit(20),
  ]);
  for (const x of [p, e, cp, r, a]) if (x.error) throw new Error(x.error.message);
  return {
    data: {
      fullName: p.data?.full_name ?? '', phone: p.data?.phone ?? '', city: p.data?.city ?? '', status: p.data?.status ?? '',
      institution: e.data?.institution ?? '', degree: e.data?.degree ?? '', specialization: e.data?.specialization ?? '', graduationYear: e.data?.graduation_year ?? '',
      preDegreeType: e.data?.pre_degree_type ?? '', preDegreeInstitution: e.data?.pre_degree_institution ?? '', preDegreeMarks: e.data?.pre_degree_marks ?? '', preDegreePercentage: e.data?.pre_degree_percentage ?? '', btechMarks: e.data?.btech_marks ?? '', btechPercentage: e.data?.btech_percentage ?? '',
      interests: cp.data?.interests ?? '', targetRoles: cp.data?.target_roles ?? '', industries: cp.data?.industries ?? '', locationPref: cp.data?.location_pref ?? '', goals: cp.data?.goals ?? '',
      skills: cp.data?.self_reported_skills ?? [], resumeUploaded: Boolean(r.data),
    },
    attempts: (a.data ?? []) as Attempt[], resume: (r.data as ResumeMeta | null) ?? null,
  };
}

export async function saveProfile(uid: string, f: ProfileForm): Promise<void> {
  const c = db();
  const jobs = [
    c.from('profiles').upsert({ id: uid, full_name: f.fullName.trim(), phone: nul(f.phone), city: nul(f.city), status: nul(f.status) }),
    c.from('career_preferences').upsert({ user_id: uid, interests: nul(f.interests), target_roles: nul(f.targetRoles), industries: nul(f.industries), location_pref: nul(f.locationPref), goals: nul(f.goals), self_reported_skills: parseSkills(f.skills) }),
  ];
  if (f.institution || f.preDegreeInstitution || f.preDegreeType) jobs.push(c.from('education_records').upsert({ user_id: uid, institution: f.institution || 'Not provided', degree: nul(f.degree), specialization: nul(f.specialization), graduation_year: f.graduationYear ? Number(f.graduationYear) : null,
    pre_degree_type: nul(f.preDegreeType), pre_degree_institution: nul(f.preDegreeInstitution), pre_degree_marks: nul(f.preDegreeMarks), pre_degree_percentage: f.preDegreePercentage ? Number(f.preDegreePercentage) : null,
    btech_marks: nul(f.btechMarks), btech_percentage: f.btechPercentage ? Number(f.btechPercentage) : null }, { onConflict: 'user_id' }));
  for (const r of await Promise.all(jobs)) if (r.error) throw new Error(r.error.message);
}

export type EntryTable = 'projects' | 'certifications' | 'experiences';
export async function listEntries(t: EntryTable): Promise<Record<string, string>[]> {
  const { data, error } = await db().from(t).select('*'); if (error) throw new Error(error.message); return data ?? [];
}
export async function addEntry(t: EntryTable, uid: string, row: Record<string, string | null>) {
  const { error } = await db().from(t).insert({ ...row, user_id: uid }); if (error) throw new Error(error.message);
}
export async function removeEntry(t: EntryTable, id: string) {
  const { error } = await db().from(t).delete().eq('id', id); if (error) throw new Error(error.message);
}

export async function saveAttempt(uid: string, name: string, score: number, total: number) {
  const { error } = await db().from('assessment_attempts').insert({ user_id: uid, name, score, total }); if (error) throw new Error(error.message);
}

export const RESUME_TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' };
export const RESUME_MAX = 5 * 1024 * 1024;
export function validateResume(file: { type: string; size: number }): string | null {
  if (!(file.type in RESUME_TYPES)) return 'Upload a PDF or DOCX file.';
  if (file.size === 0) return 'That file is empty.';
  if (file.size > RESUME_MAX) return 'The file must be 5 MB or smaller.';
  return null;
}
export async function uploadResume(uid: string, file: File): Promise<void> {
  const bad = validateResume(file); if (bad) throw new Error(bad);
  const c = db(); const path = `${uid}/resume.${RESUME_TYPES[file.type]}`;
  const old = await c.from('resumes').select('storage_path').eq('user_id', uid).maybeSingle();
  const up = await c.storage.from('resumes').upload(path, file, { upsert: true, contentType: file.type }); if (up.error) throw new Error(up.error.message);
  if (old.data && old.data.storage_path !== path) await c.storage.from('resumes').remove([old.data.storage_path]);
  const row = await c.from('resumes').upsert({ user_id: uid, storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size }, { onConflict: 'user_id' });
  if (row.error) throw new Error(row.error.message);
}
export async function removeResume(uid: string, path: string) {
  const c = db(); const s = await c.storage.from('resumes').remove([path]); if (s.error) throw new Error(s.error.message);
  const r = await c.from('resumes').delete().eq('user_id', uid); if (r.error) throw new Error(r.error.message);
}
export async function resumeUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from('resumes').createSignedUrl(path, 60); if (error || !data) throw new Error(error?.message ?? 'Could not open the file.'); return data.signedUrl;
}
