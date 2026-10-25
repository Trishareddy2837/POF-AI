/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/lib/supabase', () => {
  const calls: { table: string; op: string; arg: any; opts?: any }[] = []; const inv = { value: null as unknown };
  const from = (table: string) => { const st: { op?: string } = {};
    const p: any = new Proxy(function () {}, { get: (_t, prop) => {
      if (prop === 'then') return (res: (v: unknown) => void) => res({ data: st.op === 'insert' && table === 'career_analyses' ? { id: 'a1' } : [], error: null });
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: table === 'career_analyses' ? { id: 'a1' } : null, error: null });
      return (...args: unknown[]) => { if (['insert', 'upsert', 'update', 'delete'].includes(String(prop))) { st.op = String(prop); calls.push({ table, op: st.op, arg: args[0], opts: args[1] }); } return p; }; } });
    return p; };
  return { supabase: { from, functions: { invoke: async () => inv.value } }, isSupabaseConfigured: true, __calls: calls, __inv: inv };
});
import * as sb from '../../src/lib/supabase';
import { runAnalysis, selectCareer, toggleAction } from '../../src/services/careerAnalysis';
import { generateNarrative } from '../../src/services/aiProvider';
import { generateDemo } from '../../src/lib/demoProvider';
import { buildAiRequest } from '../../src/lib/analysisEngine';
import { rankCareers, type MatchInput } from '../../src/lib/careerMatching';
const mock = sb as unknown as { __calls: { table: string; op: string; arg: any; opts?: any }[]; __inv: { value: unknown } };
const ready = { degree: 'B.Tech', specialization: 'Mechanical Engineering', interests: 'automotive design', skills: ['CAD', 'Mechanics', 'Thermodynamics'] };
beforeEach(() => { mock.__calls.length = 0; });
describe('analysis persistence', () => {
  it('still runs with an empty profile, saving unscored exploration areas and no skill gaps', async () => {
    expect(await runAnalysis('u1', {}, 'demo')).toBe('a1');
    const head = mock.__calls.find(c => c.table === 'career_analyses' && c.op === 'insert')!; expect(head.arg.result.exploratory).toBe(true);
    const recs = mock.__calls.find(c => c.table === 'career_recommendations')!.arg as { fit_score: number }[]; expect(recs.length).toBeGreaterThanOrEqual(6); expect(recs.every(r => r.fit_score === 0)).toBe(true);
    expect(mock.__calls.some(c => c.table === 'skill_gaps' || c.table === 'recommended_actions')).toBe(false);
  });
  it('uses interest topics and notes the student typed when the profile is empty', async () => {
    await runAnalysis('u1', {}, 'demo', { interests: 'electric vehicle', notes: 'I like cars' });
    const head = mock.__calls.find(c => c.table === 'career_analyses' && c.op === 'insert')!; expect(head.arg.result.exploratory).toBe(false); expect(head.arg.result.careerPaths[0].careerId).toBe('electric-vehicles');
  });
  it('saves a demo analysis with provider mode and only the caller’s user id', async () => {
    expect(await runAnalysis('u1', ready, 'demo')).toBe('a1');
    const head = mock.__calls.find(c => c.table === 'career_analyses' && c.op === 'insert')!;
    expect(head.arg.provider_mode).toBe('demo'); expect(head.arg.user_id).toBe('u1'); expect(typeof head.arg.input_version).toBe('string');
    for (const t of ['career_recommendations', 'skill_gaps', 'recommended_actions']) { const rows = mock.__calls.find(c => c.table === t && c.op === 'insert')!.arg as { user_id: string; analysis_id: string }[]; expect(rows.length).toBeGreaterThan(0); expect(rows.every(r => r.user_id === 'u1' && r.analysis_id === 'a1')).toBe(true); }
  });
});
describe('selecting and changing the career path', () => {
  it('upserts one row per student, so changing the path replaces the previous one', async () => {
    await selectCareer('u1', 'data-analytics', 'Data Analytics', 'a1'); await selectCareer('u1', 'cybersecurity', 'Cybersecurity', 'a1');
    const ups = mock.__calls.filter(c => c.table === 'selected_career_paths'); expect(ups).toHaveLength(2);
    expect(ups.every(u => u.opts.onConflict === 'user_id' && u.arg.user_id === 'u1')).toBe(true); expect(ups[1].arg.career_id).toBe('cybersecurity');
  });
  it('persists completion changes with a timestamp', async () => {
    await toggleAction('x1', true); await toggleAction('x1', false);
    const u = mock.__calls.filter(c => c.op === 'update'); expect(u[0].arg.completed).toBe(true); expect(typeof u[0].arg.completed_at).toBe('string'); expect(u[1].arg.completed_at).toBeNull();
  });
});
describe('real provider handling', () => {
  const m: MatchInput = { ...ready, targetRoles: '', goals: '', evidence: [] }; const req = buildAiRequest(m, rankCareers(m));
  it('does not call the server in demo mode', async () => { mock.__inv.value = { data: null, error: { context: { status: 500 } } }; expect((await generateNarrative(req, 'demo')).summary).toContain('Demo'); });
  it('surfaces rate limits, missing configuration and outages as errors', async () => {
    for (const [status, code] of [[429, 'rate_limited'], [503, 'not_configured'], [504, 'timeout'], [500, 'unavailable']] as const) { mock.__inv.value = { data: null, error: { context: { status } } }; await expect(generateNarrative(req, 'real')).rejects.toMatchObject({ code }); }
  });
  it('rejects an invalid AI answer with safe field-level diagnostics instead of saving it', async () => {
    mock.__inv.value = { data: { data: { summary: 'x' } }, error: null };
    await expect(generateNarrative(req, 'real')).rejects.toMatchObject({ code: 'invalid_response', message: expect.stringContaining('profileStrengths') });
  });
  it('accepts a valid AI answer', async () => { mock.__inv.value = { data: { data: generateDemo(req) }, error: null }; expect((await generateNarrative(req, 'real')).careerPaths.length).toBeGreaterThan(0); });
});
