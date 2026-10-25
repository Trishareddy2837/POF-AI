import { describe, it, expect } from 'vitest';
import { aiRequestSchema, aiResponseSchema, analysisResultSchema } from '../../src/schemas/analysis';
import { buildAiRequest, buildResult, sanitizeAi } from '../../src/lib/analysisEngine';
import { generateDemo } from '../../src/lib/demoProvider';
import { aiError, mapStatus } from '../../src/lib/aiErrors';
import { rankCareers, type MatchInput } from '../../src/lib/careerMatching';
const input: MatchInput = { degree: 'B.Tech', specialization: 'Mechanical Engineering', interests: 'automotive design', targetRoles: 'design engineer', goals: 'Join an EV company', skills: ['SolidWorks', 'Thermodynamics', 'Mechanics'], evidence: [{ kind: 'project', title: 'Suspension bracket', text: 'CATIA and ANSYS' }] };
const matches = rankCareers(input); const req = buildAiRequest(input, matches);
describe('request privacy', () => {
  it('builds a valid 20-path request with no personal contact details', () => { expect(req.matches).toHaveLength(20); expect(aiRequestSchema.safeParse(req).success).toBe(true); expect(JSON.stringify(req.profile)).not.toMatch(/email|phone|city|fullName/i); });
});
describe('AI response validation', () => {
  it('accepts a well-formed response', () => expect(aiResponseSchema.safeParse(generateDemo(req)).success).toBe(true));
  it('rejects malformed responses', () => { expect(aiResponseSchema.safeParse({}).success).toBe(false); expect(aiResponseSchema.safeParse({ ...generateDemo(req), skillGaps: [{ skill: 'x', importance: 'urgent', reason: 'r', recommendedActions: [] }] }).success).toBe(false); expect(aiResponseSchema.safeParse({ ...generateDemo(req), summary: '' }).success).toBe(false); });
  it('removes invented strengths, gaps and careers', () => {
    const bad = { ...generateDemo(req), profileStrengths: [{ name: 'Kubernetes', evidence: 'x' }], skillGaps: [{ skill: 'quantum computing', importance: 'high' as const, reason: 'r', recommendedActions: [] }], careerPaths: [{ careerId: 'made-up', fitExplanation: 'z', nextSteps: [] }] };
    const s = sanitizeAi(bad, input, matches); expect(s.profileStrengths).toHaveLength(0); expect(s.skillGaps).toHaveLength(0); expect(s.careerPaths).toHaveLength(0);
  });
  it('grounds suggested roles and skills in the career catalogue', () => {
    const generated = generateDemo(req);
    const candidateRole = generated.recommendedJobRoles[0];
    const s = sanitizeAi({ ...generated,
      recommendedJobRoles: [{ ...candidateRole, requiredSkills: ['Kubernetes'] }, { title: 'Unlisted Astronaut', industry: 'Space', requiredSkills: ['Kubernetes'], preparationAdvice: 'Invented' }],
      recommendedProjects: [{ title: 'Made up project', purpose: 'A suggestion', difficulty: 'beginner', skillsToPractice: ['quantum computing'] }],
      recommendedLearning: [{ topic: 'quantum computing', reason: 'Made up', priority: 'high' }],
    }, input, matches);
    expect(s.recommendedJobRoles.map(r => r.title)).toContain(candidateRole.title);
    expect(s.recommendedJobRoles.flatMap(r => r.requiredSkills)).not.toContain('Kubernetes');
    expect(s.recommendedJobRoles.map(r => r.title)).not.toContain('Unlisted Astronaut');
    expect(s.recommendedProjects).toHaveLength(0);
    expect(s.recommendedLearning).toHaveLength(0);
  });
  it('ignores any score the AI tries to supply: scores come from the rules', () => {
    const r = buildResult(input, matches, { ...generateDemo(req), careerPaths: [{ careerId: matches[0].careerId, fitExplanation: 'x', nextSteps: [], fitScore: 100 } as never] }, 'real');
    expect(r.careerPaths[0].fitScore).toBe(matches[0].fitScore);
  });
});
describe('result validation and demo provider', () => {
  it('produces a valid demo result with twenty careers', () => { const r = buildResult(input, matches, generateDemo(req), 'demo'); expect(analysisResultSchema.safeParse(r).success).toBe(true); expect(r.careerPaths).toHaveLength(20); expect(r.providerMode).toBe('demo'); expect(r.summary).toContain('Demo'); });
  it('rejects out-of-range fit scores', () => { const r = buildResult(input, matches, generateDemo(req), 'demo'); r.careerPaths[0].fitScore = 101; expect(analysisResultSchema.safeParse(r).success).toBe(false); r.careerPaths[0].fitScore = -1; expect(analysisResultSchema.safeParse(r).success).toBe(false); });
  it('gives meaningful output for a student with little experience', () => { const thin: MatchInput = { ...input, evidence: [], skills: ['Excel', 'Communication', 'Statistics'], specialization: 'Commerce' }; const m = rankCareers(thin); const r = buildResult(thin, m, generateDemo(buildAiRequest(thin, m)), 'demo'); expect(analysisResultSchema.safeParse(r).success).toBe(true); expect(r.recommendedProjects.length).toBeGreaterThan(0); });
});
describe('provider errors', () => {
  it('maps HTTP statuses to specific error codes, including invalid function requests', () => expect([503, 429, 504, 400, 500, undefined].map(mapStatus)).toEqual(['not_configured', 'rate_limited', 'timeout', 'invalid_request', 'unavailable', 'unavailable']));
  it('creates friendly error messages', () => expect(aiError('timeout').message).toMatch(/too long/));
});
import { codeFromBody } from '../../src/lib/aiErrors';
describe('provider overload', () => {
  it('maps a busy provider to a friendly, non-configuration error', () => { expect(codeFromBody('provider_busy')).toBe('provider_busy'); expect(codeFromBody('x')).toBeUndefined(); expect(aiError('provider_busy').message).toMatch(/overloaded/); });
  it('maps malformed model JSON to a retry hint instead of blaming credentials', () => { expect(codeFromBody('invalid_json')).toBe('invalid_json'); expect(aiError('invalid_json', 'response was truncated').message).toMatch(/incomplete or malformed answer.*response was truncated/i); });
});
