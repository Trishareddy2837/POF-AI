import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const roadmapPreferencesSchema = z.object({
  weeklyHours: z.number().int().min(1).max(40).default(6),
  durationWeeks: z.number().int().min(4).max(104).default(24),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  learningStyle: z.array(z.enum(['reading', 'videos', 'practice', 'projects'])).max(4).default(['reading', 'practice', 'projects']),
  budget: z.enum(['free_first', 'mixed', 'flexible']).default('free_first'),
  language: text(60).default('English'),
  targetDate: z.string().date().nullable().default(null),
});
export type RoadmapPreferences = z.infer<typeof roadmapPreferencesSchema>;

export const roadmapActivitySchema = z.object({
  id: text(80), kind: z.enum(['course', 'tutorial', 'documentation', 'reading', 'exercise', 'project', 'certification', 'career_prep']),
  title: text(140), description: text(500), estimatedHours: z.number().min(0.5).max(200),
  completionCriteria: text(300), resourceName: z.string().max(160).optional(), resourceUrl: z.string().url().startsWith('https://').optional(),
});
export const roadmapMilestoneSchema = z.object({
  id: text(80), title: text(140), description: text(600), objectives: z.array(text(180)).min(1).max(8),
  relatedSkills: z.array(text(60)).max(12), prerequisiteIds: z.array(text(80)).max(12), estimatedHours: z.number().min(1).max(500),
  priority: z.enum(['high', 'medium', 'low']), completionCriteria: text(400), activities: z.array(roadmapActivitySchema).min(1).max(8),
});
export const roadmapPhaseSchema = z.object({ id: text(80), title: text(140), description: text(500), milestones: z.array(roadmapMilestoneSchema).min(1).max(12) });
export const roadmapContentSchema = z.object({
  description: text(1200), startingSkillLevel: z.enum(['beginner', 'intermediate', 'advanced']), targetSkillLevel: text(100),
  estimatedDurationWeeks: z.number().int().min(1).max(104), weeklyHours: z.number().int().min(1).max(40), targetCompletionDate: z.string().date().nullable(),
  phases: z.array(roadmapPhaseSchema).min(2).max(8),
});
export type RoadmapContent = z.infer<typeof roadmapContentSchema>;

/** Enforce the invariants that are easy for a model to miss before a plan can be saved. */
export function validateRoadmapOrder(content: RoadmapContent): RoadmapContent {
  const seen = new Set<string>();
  for (const phase of content.phases) for (const milestone of phase.milestones) {
    if (seen.has(milestone.id)) throw new Error('The roadmap contains duplicate milestone IDs.');
    if (milestone.prerequisiteIds.some(id => !seen.has(id))) throw new Error('A roadmap milestone has a missing or out-of-order prerequisite.');
    seen.add(milestone.id);
  }
  return content;
}
