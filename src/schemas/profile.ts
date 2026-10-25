import { z } from 'zod';
import type { ProfileData } from '../lib/completion';
const t = (n: number) => z.string().trim().max(n, `Keep this under ${n} characters.`);
export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone: t(30).regex(/^$|^[+\d][\d\s()-]{5,}$/, 'Enter a valid phone number.'),
  city: t(120), status: z.enum(['', 'Studying', 'Graduated', 'Looking for work']),
  institution: t(120), degree: t(120), specialization: t(120),
  preDegreeType: z.enum(['', 'Intermediate', 'Diploma']), preDegreeInstitution: t(160), preDegreeMarks: t(40), preDegreePercentage: z.string().trim().regex(/^$|^\d{1,3}(\.\d{1,2})?$/, 'Enter a valid percentage.'),
  btechMarks: t(40), btechPercentage: z.string().trim().regex(/^$|^\d{1,3}(\.\d{1,2})?$/, 'Enter a valid percentage.'),
  graduationYear: z.string().trim().refine(v => v === '' || (/^\d{4}$/.test(v) && +v >= 1990 && +v <= 2100), 'Enter a year between 1990 and 2100.'),
  interests: t(300), targetRoles: t(300), industries: t(300), locationPref: t(300), goals: t(1000),
  skills: z.string().max(1500, 'Too many skills.').refine(v => v.split(',').every(s => s.trim().length <= 40), 'Each skill must be 40 characters or fewer.'),
}).superRefine((v, ctx) => {
  if (!v.institution && (v.degree || v.specialization || v.graduationYear)) ctx.addIssue({ code: 'custom', path: ['institution'], message: 'Enter your institution.' });
  for (const key of ['preDegreePercentage', 'btechPercentage'] as const) if (v[key] && Number(v[key]) > 100) ctx.addIssue({ code: 'custom', path: [key], message: 'Percentage must be between 0 and 100.' });
});
export type ProfileForm = z.infer<typeof profileSchema>;
export const parseSkills = (s: string): string[] => [...new Set(s.split(',').map(x => x.trim()).filter(Boolean))].slice(0, 50);
export const toForm = (d: ProfileData): ProfileForm => ({
  fullName: d.fullName ?? '', phone: d.phone ?? '', city: d.city ?? '', status: (d.status as ProfileForm['status']) ?? '',
  institution: d.institution ?? '', degree: d.degree ?? '', specialization: d.specialization ?? '', graduationYear: String(d.graduationYear ?? ''),
  preDegreeType: (d.preDegreeType as ProfileForm['preDegreeType']) ?? '', preDegreeInstitution: d.preDegreeInstitution ?? '', preDegreeMarks: d.preDegreeMarks ?? '', preDegreePercentage: String(d.preDegreePercentage ?? ''), btechMarks: d.btechMarks ?? '', btechPercentage: String(d.btechPercentage ?? ''),
  interests: d.interests ?? '', targetRoles: d.targetRoles ?? '', industries: d.industries ?? '', locationPref: d.locationPref ?? '', goals: d.goals ?? '',
  skills: (d.skills ?? []).join(', '),
});
