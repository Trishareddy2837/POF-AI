import { z } from 'zod';
const str = (n: number) => z.string().trim().min(1).max(n);
const list = (n: number, m = 10) => z.array(str(n)).max(m);
const level = z.enum(['high', 'medium', 'low']);
const arr = z.array(z.string().max(120)).max(20);
/** What is sent to the AI provider. Deliberately excludes name, email, phone and city. */
export const aiRequestSchema = z.object({
  profile: z.object({ degree: z.string().max(120), specialization: z.string().max(120), interests: z.string().max(300), targetRoles: z.string().max(300), goals: z.string().max(500),
    skills: z.array(z.string().max(40)).max(50), projectTitles: arr, certificationTitles: arr, experienceTitles: arr }),
  matches: z.array(z.object({ careerId: str(60), title: str(120), fitScore: z.number().int().min(0).max(100), matchingSkills: list(60, 30), missingSkills: list(60, 30), entryLevelTitles: list(100, 5), learningResources: list(160, 5), projectIdeas: list(160, 4) })).min(1).max(20),
});
/** What the AI must return. Scores are NOT accepted from the AI; they come from the rules engine. */
export const aiResponseSchema = z.object({
  summary: str(1200),
  profileStrengths: z.array(z.object({ name: str(80), evidence: str(300) })).max(10),
  skillGaps: z.array(z.object({ skill: str(80), importance: level, reason: str(400), recommendedActions: list(200, 5) })).max(12),
  careerPaths: z.array(z.object({ careerId: str(60), fitExplanation: str(600), nextSteps: list(200, 5) })).max(20),
  recommendedJobRoles: z.array(z.object({ title: str(100), industry: str(100), requiredSkills: list(60, 10), preparationAdvice: str(400) })).max(8),
  recommendedProjects: z.array(z.object({ title: str(120), purpose: str(300), difficulty: z.enum(['beginner', 'intermediate', 'advanced']), skillsToPractice: list(60, 8) })).max(6),
  recommendedLearning: z.array(z.object({ topic: str(120), reason: str(300), priority: level })).max(10),
});
/** The validated object that is saved and displayed. */
export const analysisResultSchema = z.object({
  summary: str(1500), providerMode: z.enum(['real', 'demo']),
  profileStrengths: z.array(z.object({ name: str(80), evidence: str(300), source: z.enum(['self_reported', 'mentioned_in_projects']) })).max(12),
  skillGaps: z.array(z.object({ careerId: str(60), skill: str(80), importance: level, status: z.literal('not_yet_assessed'), reason: str(400), recommendedActions: list(200, 5) })).max(200),
  careerPaths: z.array(z.object({ careerId: str(60), title: str(120), industry: str(100), fitScore: z.number().int().min(0).max(100), fitExplanation: str(600),
    factors: z.array(z.object({ factor: str(60), points: z.number().min(0), max: z.number().min(0), note: str(200) })).max(8),
    requiredSkills: list(60, 30), matchingSkills: list(60, 30), missingSkills: list(60, 30), entryLevelTitles: list(80, 8), nextSteps: list(200, 6),
    confidence: z.enum(['low', 'medium', 'high']) })).min(1).max(20),
  recommendedJobRoles: aiResponseSchema.shape.recommendedJobRoles, recommendedProjects: aiResponseSchema.shape.recommendedProjects, recommendedLearning: aiResponseSchema.shape.recommendedLearning,
  exploratory: z.boolean().optional(),
});
export type AiRequest = z.infer<typeof aiRequestSchema>;
export type AiResponse = z.infer<typeof aiResponseSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
