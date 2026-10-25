import { CAREERS, CLUSTER_ORDER, SKILL_ALIASES, skillLabel, type CareerDef, type CareerSkill } from '../data/careerCatalogue.ts';
/** TRANSPARENT SCORING MODEL (max 100). Assessment scores are NOT used yet: no assessment maps to a career skill. */
export const WEIGHTS = { skills: 50, education: 20, interests: 15, experience: 15 } as const;
export type Evidence = { kind: 'project' | 'certification' | 'experience'; title: string; text: string };
export interface MatchInput { degree: string; specialization: string; interests: string; targetRoles: string; goals: string; skills: string[]; evidence: Evidence[] }
export interface Factor { factor: string; points: number; max: number; note: string }
export interface CareerMatch {
  careerId: string; title: string; industry: string; fitScore: number; factors: Factor[]; confidence: 'low' | 'medium' | 'high';
  matchingSkills: { skill: string; evidence: 'self_reported' | 'mentioned_in_projects' }[]; missingSkills: { skill: string; core: boolean }[];
}
export const normalizeSkill = (raw: string): string => { const k = raw.toLowerCase().trim().replace(/\s+/g, ' '); return SKILL_ALIASES[k] ?? k; };
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function containsTerm(text: string, term: string): boolean {
  const t = text.toLowerCase(), w = term.toLowerCase();
  if (w.length >= 4) return t.includes(w);
  return new RegExp(`(^|[^a-z0-9+#])${esc(w)}($|[^a-z0-9+#])`).test(t);
}
/** Whole-word match, used for skill names so that e.g. "react" does not match "reaction". */
export function containsWord(text: string, term: string): boolean { return new RegExp(`(^|[^a-z0-9+#])${esc(term.toLowerCase())}($|[^a-z0-9+#])`).test(text.toLowerCase()); }
const VOCAB = new Set<string>([...Object.keys(SKILL_ALIASES), ...CAREERS.flatMap(c => c.skills.flatMap(k => [k.name, ...(k.alt ?? [])]))].filter(v => v.length >= 2));
export const skillsInText = (text: string): Set<string> => { const out = new Set<string>(); for (const v of VOCAB) if (containsWord(text, v)) out.add(normalizeSkill(v)); return out; };
export function studentSkillMap(input: MatchInput): Map<string, 'self_reported' | 'mentioned_in_projects'> {
  const m = new Map<string, 'self_reported' | 'mentioned_in_projects'>();
  for (const s of input.skills) if (s.trim()) m.set(normalizeSkill(s), 'self_reported');
  for (const e of input.evidence) for (const s of skillsInText(`${e.title} ${e.text}`)) if (!m.has(s)) m.set(s, 'mentioned_in_projects');
  return m;
}
const satisfied = (map: Map<string, 'self_reported' | 'mentioned_in_projects'>, k: CareerSkill) => (map.has(k.name) ? map.get(k.name)! : (k.alt ?? []).map(a => map.get(a)).find(Boolean));
export function scoreCareer(input: MatchInput, c: CareerDef): CareerMatch {
  const map = studentSkillMap(input);
  const matching: CareerMatch['matchingSkills'] = [], missing: CareerMatch['missingSkills'] = []; let got = 0, total = 0;
  for (const k of c.skills) { const w = k.core ? 2 : 1; total += w; const ev = satisfied(map, k); if (ev) { got += w; matching.push({ skill: k.name, evidence: ev }); } else missing.push({ skill: k.name, core: Boolean(k.core) }); }
  const skillsPts = Math.round(WEIGHTS.skills * (total ? got / total : 0));
  const edu = `${input.degree} ${input.specialization}`;
  const eduPts = c.keywords.some(k => containsTerm(edu, k)) ? WEIGHTS.education : 0;
  const pref = `${input.interests} ${input.targetRoles}`;
  const prefHits = c.keywords.filter(k => containsTerm(pref, k)); // more specific (longer) keyword matches score higher, so "electric vehicle" beats plain "vehicle"
  const intPts = prefHits.length ? Math.min(WEIGHTS.interests, 8 + Math.round(prefHits.reduce((a, k) => a + k.length, 0) / 2)) : c.keywords.some(k => containsTerm(input.goals, k)) ? 8 : 0;
  const names = c.skills.flatMap(k => [k.name, ...(k.alt ?? [])]);
  const related = input.evidence.filter(e => { const t = `${e.title} ${e.text}`; return c.keywords.some(k => containsTerm(t, k)) || names.some(n => n.length >= 2 && containsWord(t, n)); }).length;
  const expPts = Math.round(WEIGHTS.experience * Math.min(related, 3) / 3);
  const factors: Factor[] = [
    { factor: 'Skills', points: skillsPts, max: WEIGHTS.skills, note: `${matching.length} of ${c.skills.length} required skills found (core skills count double)` },
    { factor: 'Education', points: eduPts, max: WEIGHTS.education, note: eduPts ? 'Degree or specialization relates to this field' : 'No clear link in degree or specialization' },
    { factor: 'Interests and goals', points: intPts, max: WEIGHTS.interests, note: prefHits.length ? 'Matches your stated interests or target roles' : intPts ? 'Mentioned in your goals only' : 'Not mentioned in your interests or goals' },
    { factor: 'Projects and experience', points: expPts, max: WEIGHTS.experience, note: `${related} related project, certification or experience entr${related === 1 ? 'y' : 'ies'} (up to 3 count)` },
  ];
  const fitScore = Math.max(0, Math.min(100, factors.reduce((a, f) => a + f.points, 0)));
  const data = (input.skills.length >= 5 ? 1 : 0) + (edu.trim() ? 1 : 0) + (input.evidence.length >= 2 ? 1 : 0) + (pref.trim() ? 1 : 0);
  return { careerId: c.id, title: c.title, industry: c.industry, fitScore, factors, confidence: data >= 4 ? 'high' : data >= 2 ? 'medium' : 'low', matchingSkills: matching, missingSkills: missing };
}
export function rankCareers(input: MatchInput, catalogue: CareerDef[] = CAREERS, limit = 20): CareerMatch[] {
  return catalogue.map(c => scoreCareer(input, c)).sort((a, b) => b.fitScore - a.fitScore || a.title.localeCompare(b.title)).slice(0, limit);
}
export interface ProfileHint { key: string; label: string; done: boolean }
export type DataLevel = 'none' | 'sparse' | 'ok';
/** How much the student has told us. Analysis ALWAYS runs; this only decides whether we can score matches. */
export function dataLevel(i: MatchInput): DataLevel {
  const n = [i.skills.some(s => s.trim()), Boolean(`${i.degree}${i.specialization}`.trim()), Boolean(`${i.interests}${i.targetRoles}${i.goals}`.trim()), i.evidence.length > 0].filter(Boolean).length;
  return n === 0 ? 'none' : n <= 2 ? 'sparse' : 'ok';
}
/** Optional suggestions for sharper results. Nothing here blocks an analysis. */
export function profileHints(i: MatchInput): ProfileHint[] {
  return [
    { key: 'skills', label: 'List a few skills (any level)', done: i.skills.filter(s => s.trim()).length >= 3 },
    { key: 'education', label: 'Add your degree or field of study', done: Boolean(`${i.degree}${i.specialization}`.trim()) },
    { key: 'interests', label: 'Say what interests you (or tap the topics below)', done: Boolean(`${i.interests}${i.targetRoles}${i.goals}`.trim()) },
    { key: 'projects', label: 'Add a project, internship or certificate', done: i.evidence.length > 0 },
  ];
}
/** Used when there is nothing to score: one broad starting career per field, unscored. */
export function exploreCareers(catalogue: CareerDef[] = CAREERS, limit = 20): CareerMatch[] {
  const lead: Record<string, string> = { technology: 'software-development', data: 'data-analytics', design: 'ui-ux-design', mechanical: 'mechanical-engineering', electrical: 'electrical-engineering', civil: 'civil-engineering', business: 'financial-analysis', health: 'biotechnology', automotive: 'automotive-design', process: 'chemical-engineering', aerospace: 'aerospace-engineering' };
  const buckets = CLUSTER_ORDER.map(cl => { const first = catalogue.find(c => c.id === lead[cl]); return [first, ...catalogue.filter(c => c.cluster === cl && c.id !== first?.id)]; });
  const balanced: CareerDef[] = [];
  for (let round = 0; balanced.length < limit; round++) {
    let found = false;
    for (const bucket of buckets) { const next = bucket[round]; if (next && balanced.length < limit) { balanced.push(next); found = true; } }
    if (!found) break;
  }
  return balanced.map(c => ({
    careerId: c.id, title: c.title, industry: c.industry, fitScore: 0, factors: [], confidence: 'low' as const, matchingSkills: [], missingSkills: c.skills.filter(k => k.core).map(k => ({ skill: k.name, core: true })) }));
}
export interface SkillGap { careerId: string; skill: string; importance: 'high' | 'medium'; status: 'not_yet_assessed'; reason: string }
export const buildSkillGaps = (m: CareerMatch): SkillGap[] => m.missingSkills
  .map(k => ({ careerId: m.careerId, skill: k.skill, importance: k.core ? 'high' as const : 'medium' as const, status: 'not_yet_assessed' as const,
    reason: `${skillLabel(k.skill)} is ${k.core ? 'a core requirement' : 'commonly expected'} for ${m.title}. It was not found in your profile, so it is not yet assessed; add it if you already have it.` }))
  .sort((a, b) => (a.importance === b.importance ? 0 : a.importance === 'high' ? -1 : 1));
export interface PlannedAction { careerId: string; skill: string | null; kind: 'learn' | 'practice' | 'project'; text: string }
export function buildActions(c: CareerDef, gaps: SkillGap[], maxSkills = 5): PlannedAction[] {
  const out: PlannedAction[] = gaps.slice(0, maxSkills).map((g, i) => ({ careerId: c.id, skill: g.skill, kind: 'learn' as const, text: `Learn ${skillLabel(g.skill)}. Suggested starting point: ${c.resources[i % c.resources.length]}` }));
  c.practice.forEach(p => out.push({ careerId: c.id, skill: null, kind: 'practice', text: p }));
  c.projects.forEach(p => out.push({ careerId: c.id, skill: null, kind: 'project', text: p }));
  return out;
}
export function inputVersion(i: MatchInput): string {
  const str = JSON.stringify([i.degree, i.specialization, i.interests, i.targetRoles, i.goals, i.skills, i.evidence.map(e => e.title)]);
  let h = 2166136261; for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16);
}
