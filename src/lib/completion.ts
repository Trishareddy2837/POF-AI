export interface ProfileData { fullName?: string; phone?: string; city?: string; institution?: string; degree?: string; specialization?: string; graduationYear?: number | string; preDegreeType?: string; preDegreeInstitution?: string; preDegreeMarks?: string; preDegreePercentage?: number | string; btechMarks?: string; btechPercentage?: number | string; status?: string; interests?: string; targetRoles?: string; goals?: string; industries?: string; locationPref?: string; skills?: string[]; resumeUploaded?: boolean }
export const COMPLETION_FIELDS: { key: string; label: string; done: (p: ProfileData) => boolean }[] = [
  ...([['fullName','Full name'],['phone','Phone number'],['city','City or location'],['institution','Institution'],['degree','Degree'],['specialization','Specialization'],['graduationYear','Graduation year'],['status','Education status'],['interests','Career interests'],['targetRoles','Target job roles'],['goals','Career goals']] as const)
    .map(([key, label]) => ({ key, label, done: (p: ProfileData) => String((p as Record<string, unknown>)[key] ?? '').trim() !== '' })),
  { key: 'skills', label: 'At least 3 skills', done: p => (p.skills ?? []).filter(s => s.trim()).length >= 3 },
  { key: 'resume', label: 'Resume uploaded', done: p => Boolean(p.resumeUploaded) },
];
export function calculateCompletion(p: ProfileData) {
  const missing = COMPLETION_FIELDS.filter(f => !f.done(p)).map(f => f.label);
  return { percent: Math.round(((COMPLETION_FIELDS.length - missing.length) / COMPLETION_FIELDS.length) * 100), missing };
}
