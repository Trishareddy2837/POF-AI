import { describe, expect, it } from 'vitest';
import { CAREERS } from '../../src/data/careerCatalogue';
import { createDemoRoadmap } from '../../src/lib/roadmapGenerator';
import { roadmapContentSchema, roadmapPreferencesSchema, validateRoadmapOrder } from '../../src/schemas/roadmap';
import { isTargetDateUnrealistic, roadmapPrerequisitesMet, roadmapProgress, type RoadmapBundle } from '../../src/services/roadmaps';

describe('career catalogue expansion', () => {
  it('contains 100 distinct career paths with stable IDs and titles', () => {
    expect(CAREERS).toHaveLength(100);
    expect(new Set(CAREERS.map(c => c.id)).size).toBe(100);
    expect(new Set(CAREERS.map(c => c.title)).size).toBe(100);
  });
  it('keeps every career connected to a known learning cluster', () => {
    expect(CAREERS.every(c => c.skills.length > 0 && c.entryTitles.length > 0 && c.projects.length > 0)).toBe(true);
  });
});

describe('roadmap generation and validation', () => {
  const career = CAREERS.find(c => c.id === 'data-analytics')!;
  const prefs = roadmapPreferencesSchema.parse({ weeklyHours: 5, durationWeeks: 12, experienceLevel: 'beginner', budget: 'free_first' });
  it('creates a labelled demo plan with ordered prerequisites and activities', () => {
    const plan = createDemoRoadmap(career, ['sql', 'statistics'], prefs, ['excel']);
    expect(plan.phases.length).toBeGreaterThanOrEqual(2);
    expect(plan.phases.flatMap(p => p.milestones).every(m => m.activities.length > 0)).toBe(true);
    expect(validateRoadmapOrder(plan)).toEqual(plan);
    expect(plan.weeklyHours).toBe(5);
    expect(plan.estimatedDurationWeeks).toBeGreaterThanOrEqual(12);
  });
  it('rejects out-of-order or unknown prerequisites', () => {
    const plan = createDemoRoadmap(career, ['sql'], prefs);
    const first = plan.phases[0].milestones[0];
    const broken = { ...plan, phases: [{ ...plan.phases[0], milestones: [{ ...first, prerequisiteIds: ['not-present'] }, ...plan.phases[0].milestones.slice(1)] }, ...plan.phases.slice(1)] };
    expect(() => validateRoadmapOrder(roadmapContentSchema.parse(broken))).toThrow(/prerequisite/i);
  });
  it('requires valid preference bounds and structurally valid learning activities', () => {
    expect(roadmapPreferencesSchema.safeParse({ weeklyHours: 0 }).success).toBe(false);
    const plan = createDemoRoadmap(career, ['sql'], prefs);
    const bad = { ...plan, phases: [{ ...plan.phases[0], milestones: [{ ...plan.phases[0].milestones[0], activities: [{ ...plan.phases[0].milestones[0].activities[0], resourceUrl: 'javascript:alert(1)' }] }] }, ...plan.phases.slice(1)] };
    expect(roadmapContentSchema.safeParse(bad).success).toBe(false);
  });
});

describe('roadmap progress rules', () => {
  const content = createDemoRoadmap(CAREERS.find(c => c.id === 'data-analytics')!, ['sql']);
  const row = { id: 'r', user_id: 'u', title: 'Plan', career_id: 'data-analytics', career_title: 'Data Analytics', status: 'active' as const, preferences: roadmapPreferencesSchema.parse({}), content, created_at: '', updated_at: '' };
  const bundle = (completedMilestones: string[]): RoadmapBundle => ({ roadmap: row, completedMilestones, completedActivities: [] });
  it('calculates progress only from unique completed milestone IDs', () => {
    const ids = content.phases.flatMap(p => p.milestones.map(m => m.id));
    expect(roadmapProgress(bundle([ids[0], ids[0]]))).toBe(Math.round(100 / ids.length));
    expect(roadmapProgress(bundle(ids))).toBe(100);
  });
  it('does not unlock a milestone before prerequisites are done', () => {
    const milestones = content.phases.flatMap(p => p.milestones);
    expect(roadmapPrerequisitesMet(content, milestones[0].id, [])).toBe(true);
    expect(roadmapPrerequisitesMet(content, milestones[1].id, [])).toBe(false);
    expect(roadmapPrerequisitesMet(content, milestones[1].id, [milestones[0].id])).toBe(true);
  });
  it('warns when the target date is earlier than the estimate', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect(isTargetDateUnrealistic(content, tomorrow)).toBe(true);
    expect(isTargetDateUnrealistic(content, null)).toBe(false);
  });
});
