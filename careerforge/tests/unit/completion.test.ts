import { describe, it, expect } from 'vitest';
import { calculateCompletion } from '../../src/lib/completion';
describe('calculateCompletion', () => {
  it('is 0% for an empty profile and lists every field', () => { const r = calculateCompletion({}); expect(r.percent).toBe(0); expect(r.missing).toHaveLength(13); });
  it('counts only filled fields', () => { const r = calculateCompletion({ fullName: 'Asha', city: ' ', skills: ['a', 'b'] }); expect(r.percent).toBe(8); expect(r.missing).toContain('At least 3 skills'); });
  it('is 100% when complete', () => { const r = calculateCompletion({ fullName:'a',phone:'1',city:'c',institution:'i',degree:'d',specialization:'s',graduationYear:2026,status:'Studying',interests:'x',targetRoles:'y',goals:'g',skills:['a','b','c'],resumeUploaded:true }); expect(r.percent).toBe(100); });
});
