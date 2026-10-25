import { describe, it, expect } from 'vitest';
import { CAREERS } from '../../src/data/careerCatalogue';
import { buildActions, buildSkillGaps, dataLevel, exploreCareers, profileHints, skillsInText, inputVersion, normalizeSkill, rankCareers, scoreCareer, type MatchInput } from '../../src/lib/careerMatching';
const empty: MatchInput = { degree: '', specialization: '', interests: '', targetRoles: '', goals: '', skills: [], evidence: [] };
const mech: MatchInput = { degree: 'B.Tech', specialization: 'Mechanical Engineering', interests: 'automotive design, EV', targetRoles: 'design engineer', goals: '',
  skills: ['SolidWorks', 'Thermodynamics', 'Mechanics', 'GDT', 'Teamwork'], evidence: [{ kind: 'project', title: 'Suspension bracket', text: 'Designed in CATIA, checked with ANSYS' }] };
const byId = (id: string) => CAREERS.find(c => c.id === id)!;
describe('catalogue', () => {
  it('has 100 unique, well-formed careers', () => { expect(CAREERS).toHaveLength(100); expect(new Set(CAREERS.map(c => c.id)).size).toBe(CAREERS.length); expect(CAREERS.every(c => c.skills.some(k => k.core) && c.entryTitles.length > 0 && c.keywords.length > 0)).toBe(true); });
  it('covers non-software fields', () => { const ids = CAREERS.map(c => c.id); for (const id of ['civil-engineering', 'financial-analysis', 'biotechnology', 'electrical-engineering', 'aerospace-engineering', 'human-resources']) expect(ids).toContain(id); });
});
describe('sparse and empty profiles', () => {
  it('classifies how much information was given', () => { expect(dataLevel(empty)).toBe('none'); expect(dataLevel({ ...empty, interests: 'cars' })).toBe('sparse'); expect(dataLevel(mech)).toBe('ok'); });
  it('offers twenty unscored starting areas across different fields when nothing is known', () => { const e = exploreCareers(); expect(e).toHaveLength(20); expect(e.every(x => x.fitScore === 0)).toBe(true); expect(new Set(e.map(x => x.careerId)).size).toBe(e.length); });
  it('gives only optional hints, never a block', () => { const h = profileHints(empty); expect(h.length).toBeGreaterThan(0); expect(h.every(x => !x.done)).toBe(true); });
  it('scores a student who only typed a single interest', () => { const r = rankCareers({ ...empty, interests: 'electric vehicle' }); expect(r[0].careerId).toBe('electric-vehicles'); expect(r[0].fitScore).toBeGreaterThan(0); });
  it('ranks a commerce student into business careers, not software', () => { const r = rankCareers({ ...empty, degree: 'B.Com', specialization: 'Commerce', skills: ['Tally', 'Excel', 'GST'] }); expect(r[0].careerId).toBe('accounting-audit'); });
  it('matches whole words only, so "reaction" does not count as React', () => expect([...skillsInText('chemical reaction rate project')]).not.toContain('javascript'));
});
describe('matching', () => {
  it('normalizes aliases', () => { expect(normalizeSkill(' MS  Excel ')).toBe('excel'); expect(normalizeSkill('SolidWorks')).toBe('cad'); });
  it('keeps every fit score an integer between 0 and 100 for every career', () => { for (const c of CAREERS) { const s = scoreCareer(mech, c).fitScore; expect(Number.isInteger(s) && s >= 0 && s <= 100).toBe(true); } });
  it('scores an empty profile 0 and reports low confidence', () => { const m = scoreCareer(empty, byId('data-analytics')); expect(m.fitScore).toBe(0); expect(m.confidence).toBe('low'); });
  it('ranks the student’s own field first, not software by default', () => { const r = rankCareers(mech); expect(r[0].careerId).toBe('mechanical-engineering'); expect(r[0].fitScore).toBeGreaterThan(scoreCareer(mech, byId('software-development')).fitScore); });
  it('factor points add up to the fit score and respect their maximums', () => { const m = scoreCareer(mech, byId('automotive-design')); expect(m.factors.reduce((a, f) => a + f.points, 0)).toBe(m.fitScore); expect(m.factors.every(f => f.points <= f.max)).toBe(true); });
  it('counts skills mentioned in projects as evidence, separately from self-reported', () => { const m = scoreCareer({ ...empty, evidence: [{ kind: 'project', title: 'Bracket', text: 'analysed in ANSYS' }] }, byId('cad-cae')); expect(m.matchingSkills.find(s => s.skill === 'fea')?.evidence).toBe('mentioned_in_projects'); });
  it('lets any one programming language satisfy the programming requirement', () => { const m = scoreCareer({ ...empty, skills: ['JavaScript', 'git', 'data structures'] }, byId('software-development')); expect(m.missingSkills.map(x => x.skill)).not.toContain('programming'); });
  it('orders equal scores deterministically', () => expect(rankCareers(empty)).toEqual(rankCareers(empty)));
  it('returns twenty profile-ranked career paths for the expanded comparison', () => { const r = rankCareers(mech); expect(r).toHaveLength(20); expect(r[0].careerId).toBe('mechanical-engineering'); });
});
describe('skill gaps and actions', () => {
  it('marks gaps as not yet assessed, core skills first', () => { const g = buildSkillGaps(scoreCareer(mech, byId('electric-vehicles'))); expect(g.length).toBeGreaterThan(0); expect(g.every(x => x.status === 'not_yet_assessed')).toBe(true); expect(g[0].importance).toBe('high'); });
  it('plans learn, practice and project actions', () => { const c = byId('electric-vehicles'); const a = buildActions(c, buildSkillGaps(scoreCareer(mech, c))); expect(new Set(a.map(x => x.kind))).toEqual(new Set(['learn', 'practice', 'project'])); });
  it('changes the input version only when the inputs change', () => { expect(inputVersion(mech)).toBe(inputVersion({ ...mech })); expect(inputVersion(mech)).not.toBe(inputVersion({ ...mech, skills: ['x'] })); });
});
