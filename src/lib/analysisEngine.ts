import { CAREERS, skillLabel } from '../data/careerCatalogue.ts';
import { buildSkillGaps, normalizeSkill, skillsInText, studentSkillMap, type CareerMatch, type MatchInput } from './careerMatching.ts';
import type { AiRequest, AiResponse, AnalysisResult } from '../schemas/analysis.ts';
const clip = (s: string, n: number) => s.trim().slice(0, n);
/** Builds the minimal payload for the AI provider. No name, email, phone, city or resume content. */
export function buildAiRequest(i: MatchInput, matches: CareerMatch[]): AiRequest {
  const titles = (k: string) => i.evidence.filter(e => e.kind === k).map(e => clip(e.title, 120)).slice(0, 20);
  return {
    profile: { degree: clip(i.degree, 120), specialization: clip(i.specialization, 120), interests: clip(i.interests, 300), targetRoles: clip(i.targetRoles, 300), goals: clip(i.goals, 500),
      skills: i.skills.map(s => clip(s, 40)).filter(Boolean).slice(0, 50), projectTitles: titles('project'), certificationTitles: titles('certification'), experienceTitles: titles('experience') },
    matches: matches.slice(0, 20).map(m => {
      const career = CAREERS.find(c => c.id === m.careerId)!;
      return { careerId: m.careerId, title: m.title, fitScore: m.fitScore, matchingSkills: m.matchingSkills.map(x => skillLabel(x.skill)), missingSkills: m.missingSkills.map(x => skillLabel(x.skill)),
        entryLevelTitles: career.entryTitles.slice(0, 5), learningResources: career.resources.slice(0, 5), projectIdeas: career.projects.slice(0, 4) };
    }),
  };
}
/** Drops anything the AI invented: strengths the student does not have, gaps outside the catalogue match, careers not recommended. */
export function sanitizeAi(ai: AiResponse, i: MatchInput, matches: CareerMatch[]): AiResponse {
  const have = new Set(studentSkillMap(i).keys());
  const missing = new Set(matches.flatMap(m => m.missingSkills.map(k => k.skill)));
  const ids = new Set(matches.map(m => m.careerId));
  const catalog = new Map(CAREERS.map(c => [c.id, c]));
  const roles = new Map(matches.flatMap(m => (catalog.get(m.careerId)?.entryTitles ?? []).map(title => [title.toLowerCase(), { title, career: catalog.get(m.careerId)! }] as const)));
  const allowedSkills = new Set(matches.flatMap(m => [...m.matchingSkills, ...m.missingSkills]).map(s => s.skill));
  return { ...ai,
    profileStrengths: ai.profileStrengths.filter(s => have.has(normalizeSkill(s.name)) || [...skillsInText(s.name)].some(x => have.has(x))),
    skillGaps: ai.skillGaps.filter(g => missing.has(normalizeSkill(g.skill))),
    careerPaths: ai.careerPaths.filter(c => ids.has(c.careerId)),
    recommendedJobRoles: ai.recommendedJobRoles.flatMap(r => { const grounded = roles.get(r.title.toLowerCase()); if (!grounded) return [];
      return [{ ...r, title: grounded.title, industry: grounded.career.industry,
        requiredSkills: grounded.career.skills.filter(k => k.core).map(k => skillLabel(k.name)).slice(0, 10) }]; }),
    recommendedProjects: ai.recommendedProjects.map(p => ({ ...p, skillsToPractice: p.skillsToPractice.filter(s => allowedSkills.has(normalizeSkill(s))).slice(0, 8) })).filter(p => p.skillsToPractice.length > 0),
    recommendedLearning: ai.recommendedLearning.filter(l => missing.has(normalizeSkill(l.topic)) || allowedSkills.has(normalizeSkill(l.topic))).slice(0, 10),
  };
}
export function buildResult(i: MatchInput, matches: CareerMatch[], aiRaw: AiResponse, mode: 'real' | 'demo', exploratory = false): AnalysisResult {
  const ai = sanitizeAi(aiRaw, i, matches); const map = studentSkillMap(i); const cat = new Map(CAREERS.map(c => [c.id, c]));
  const strengths = ai.profileStrengths.length ? ai.profileStrengths.map(s => ({ ...s, source: map.get(normalizeSkill(s.name)) ?? 'mentioned_in_projects' as const }))
    : [...map.entries()].slice(0, 6).map(([k, src]) => ({ name: skillLabel(k), evidence: src === 'self_reported' ? 'Listed in your profile (self-reported, not verified).' : 'Mentioned in your projects or experience (not verified).', source: src }));
  const careerPaths = matches.map(m => { const c = cat.get(m.careerId)!; const a = ai.careerPaths.find(p => p.careerId === m.careerId);
    return { careerId: m.careerId, title: m.title, industry: m.industry, fitScore: m.fitScore,
      fitExplanation: a?.fitExplanation ?? (exploratory ? `${m.title} is a broad area to explore. There is not enough information yet to score a match.` : `Approximate profile match ${m.fitScore}/100: ${m.matchingSkills.length} of ${c.skills.length} required skills found in your profile.`), factors: m.factors,
      requiredSkills: c.skills.map(k => skillLabel(k.name)), matchingSkills: m.matchingSkills.map(k => skillLabel(k.skill)), missingSkills: m.missingSkills.map(k => skillLabel(k.skill)),
      entryLevelTitles: c.entryTitles, nextSteps: a?.nextSteps.length ? a.nextSteps : [...c.practice, ...c.projects].slice(0, 3), confidence: m.confidence }; });
  const skillGaps = exploratory ? [] : matches.flatMap(m => buildSkillGaps(m).map(g => { const a = ai.skillGaps.find(x => normalizeSkill(x.skill) === g.skill);
    return { ...g, reason: a?.reason ?? g.reason, recommendedActions: a?.recommendedActions.length ? a.recommendedActions : [`Find an introductory resource on ${skillLabel(g.skill)} and complete one exercise`] }; }));
  const top = cat.get(matches[0].careerId)!;
  return { summary: ai.summary, providerMode: mode, exploratory, profileStrengths: strengths, skillGaps, careerPaths,
    recommendedJobRoles: ai.recommendedJobRoles.length ? ai.recommendedJobRoles : matches.slice(0, 3).map(m => { const c = cat.get(m.careerId)!; return { title: c.entryTitles[0], industry: c.industry, requiredSkills: c.skills.filter(k => k.core).map(k => skillLabel(k.name)), preparationAdvice: `Build evidence for the core skills of ${c.title}, then apply for entry-level roles.` }; }),
    recommendedProjects: ai.recommendedProjects.length ? ai.recommendedProjects : top.projects.map(p => ({ title: p, purpose: `Shows practical ${top.title} skills`, difficulty: 'beginner' as const, skillsToPractice: top.skills.filter(k => k.core).map(k => skillLabel(k.name)).slice(0, 4) })),
    recommendedLearning: ai.recommendedLearning.length ? ai.recommendedLearning : buildSkillGaps(matches[0]).slice(0, 4).map(g => ({ topic: skillLabel(g.skill), reason: g.reason, priority: g.importance })) };
}
