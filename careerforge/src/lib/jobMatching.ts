import type { Opportunity } from '../data/opportunityCatalogue';

export interface JobMatchProfile { skills: string[]; careerIds?: string[]; projectTitles?: string[]; education?: string }
export interface JobMatchResult { score: number; matchingSkills: string[]; missingSkills: string[]; preferredMatches: string[]; eligibilityIssues: string[]; note: string }
const norm = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ');
const overlap = (candidate: string, known: string) => { const a = norm(candidate); const b = norm(known); return a === b || a.includes(b) || b.includes(a); };

/** Transparent profile-alignment index (required 70%, preferred 15%, career 10%, evidence 5%); not hiring probability. */
export function scoreJobMatch(job: Opportunity, profile: JobMatchProfile): JobMatchResult {
  const evidence = [...profile.skills, ...(profile.projectTitles ?? [])];
  const matchingSkills = job.requiredSkills.filter(required => evidence.some(item => overlap(required, item)));
  const missingSkills = job.requiredSkills.filter(required => !matchingSkills.includes(required));
  const preferredMatches = job.preferredSkills.filter(preferred => evidence.some(item => overlap(preferred, item)));
  const careerMatch = (profile.careerIds ?? []).some(id => job.relatedCareerIds.includes(id));
  const projectEvidence = (profile.projectTitles ?? []).some(title => job.requiredSkills.some(skill => overlap(skill, title)));
  const requiredScore = job.requiredSkills.length ? (matchingSkills.length / job.requiredSkills.length) * 70 : 0;
  const preferredScore = job.preferredSkills.length ? (preferredMatches.length / job.preferredSkills.length) * 15 : 0;
  const eligibilityIssues: string[] = [];
  if (job.educationRequirements && (!profile.education || !norm(profile.education).split(' ').some(word => word.length > 3 && norm(job.educationRequirements).includes(word)))) eligibilityIssues.push(profile.education ? 'Your education details may not show the listed requirement; review it manually.' : 'Education details were not supplied, so this requirement cannot be checked.');
  return { score: Math.round(requiredScore + preferredScore + (careerMatch ? 10 : 0) + (projectEvidence ? 5 : 0)), matchingSkills, missingSkills, preferredMatches, eligibilityIssues,
    note: 'Approximate profile alignment only. It is not the probability of an interview or job offer.' };
}
