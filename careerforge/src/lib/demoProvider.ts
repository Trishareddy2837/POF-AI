import { CAREERS } from '../data/careerCatalogue.ts';
import type { AiRequest, AiResponse } from '../schemas/analysis.ts';
export const DEMO_NOTICE = 'Demo mode: these explanations come from fixed templates, not an AI model. Scores and skill matches still come from the real matching rules.';
/** Deterministic template "provider". Used only when the student or the app configuration explicitly selects demo mode. */
export function generateDemo(req: AiRequest): AiResponse {
  const cat = new Map(CAREERS.map(c => [c.id, c]));
  const names = req.matches.slice(0, 4).map(m => m.title).join(', ');
  const explore = req.matches.every(m => m.fitScore === 0);
  return {
    summary: explore ? `[Demo template] There is not enough profile evidence to score a career match yet. Explore these broad areas: ${names}. Add skills, study focus or interests to see a more useful comparison.` : `[Demo template] Your profile lists ${req.profile.skills.length} skills${req.profile.specialization ? ` and a ${req.profile.specialization} study focus` : ''}. The rule-based comparison currently finds the strongest overlap with: ${names}. Scores describe profile overlap, not hiring chances.`,
    profileStrengths: req.profile.skills.slice(0, 5).map(s => ({ name: s, evidence: 'Listed in your profile (self-reported, not verified).' })),
    skillGaps: req.matches.slice(0, 3).flatMap(match => match.missingSkills.slice(0, 3).map((s, i) => ({ skill: s, importance: i === 0 ? 'high' as const : 'medium' as const, reason: `${s} is included in the catalogue requirements for ${match.title} and was not found in the information you shared. This means not yet assessed, not that you lack it.`, recommendedActions: [`Study the basics of ${s} using a beginner resource`, `Practise ${s} in a small ${match.title} task and record what you learn`] }))).slice(0, 12),
    careerPaths: req.matches.map(m => ({ careerId: m.careerId, fitExplanation: explore ? `[Demo template] ${m.title} is a broad area to explore. We cannot score it without more information.` : `[Demo template] ${m.matchingSkills.length} of the required skills for ${m.title} were found in your profile; ${m.missingSkills.length} were not found.`, nextSteps: [`Review the core skills for ${m.title}`, 'Add a project that shows these skills'] })),
    recommendedJobRoles: req.matches.slice(0, 3).map(m => { const c = cat.get(m.careerId); return { title: c?.entryTitles[0] ?? m.title, industry: c?.industry ?? 'General', requiredSkills: (c?.skills ?? []).filter(k => k.core).map(k => k.name).slice(0, 5), preparationAdvice: `Build visible evidence for ${m.title} skills before applying.` }; }),
    recommendedProjects: req.matches.slice(0, 4).flatMap((m, i) => (cat.get(m.careerId)?.projects ?? []).slice(0, 1).map(p => ({ title: p, purpose: `A portfolio-scale learning exercise for ${m.title}. Document the tools, assumptions and limitations.`, difficulty: i === 0 ? 'beginner' as const : 'intermediate' as const, skillsToPractice: m.missingSkills.slice(0, 4) }))),
    recommendedLearning: req.matches.slice(0, 3).flatMap(m => m.missingSkills.slice(0, 2).map((s, i) => ({ topic: s, reason: `Start with a short foundation in ${s}, then apply it to ${m.title}.`, priority: i === 0 ? 'high' as const : 'medium' as const }))).slice(0, 6),
  };
}
