import type { CareerDef } from '../data/careerCatalogue';
import { z } from 'zod';
import { roadmapContentSchema, roadmapPreferencesSchema, validateRoadmapOrder, type RoadmapContent, type RoadmapPreferences } from '../schemas/roadmap';
import { normalizeSkill } from './careerMatching';

const aiActivitySchema = z.object({ kind: z.enum(['course', 'tutorial', 'documentation', 'reading', 'exercise', 'project', 'certification', 'career_prep']),
  title: z.string().trim().min(1).max(140), description: z.string().trim().min(1).max(500), estimatedHours: z.number().min(0.5).max(200),
  completionCriteria: z.string().trim().min(1).max(300), resourceName: z.string().max(160).optional() });
const aiMilestoneSchema = z.object({ title: z.string().trim().min(1).max(140), description: z.string().trim().min(1).max(600),
  objectives: z.array(z.string().trim().min(1).max(180)).min(1).max(8), relatedSkills: z.array(z.string().trim().min(1).max(60)).max(12),
  estimatedHours: z.number().min(1).max(500), priority: z.enum(['high', 'medium', 'low']), completionCriteria: z.string().trim().min(1).max(400),
  activities: z.array(aiActivitySchema).min(1).max(8) });
export const roadmapAiResponseSchema = z.object({ description: z.string().trim().min(1).max(1200), phases: z.array(z.object({
  title: z.string().trim().min(1).max(140), description: z.string().trim().min(1).max(500), milestones: z.array(aiMilestoneSchema).min(1).max(12),
})).min(2).max(6) });
export type RoadmapAiResponse = z.infer<typeof roadmapAiResponseSchema>;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'learning-step';
function assemble(career: CareerDef, prefs: RoadmapPreferences, generated: RoadmapAiResponse, startingSkillLevel: RoadmapContent['startingSkillLevel']): RoadmapContent {
  const skillNames = new Set(career.skills.map(s => s.name.toLowerCase()));
  const milestoneIds: string[] = [];
  const phases = generated.phases.map((phase, pi) => ({ id: `phase-${pi + 1}-${slug(phase.title)}`, title: phase.title, description: phase.description,
    milestones: phase.milestones.map((m, mi) => {
      const id = `milestone-${pi + 1}-${mi + 1}-${slug(m.title)}`;
      const skills = m.relatedSkills.map(s => s.toLowerCase());
      if (skills.some(s => !skillNames.has(s))) throw new Error('The roadmap suggested a skill outside this career’s catalogue. Retry to generate a valid plan.');
      const prev = milestoneIds.at(-1);
      milestoneIds.push(id);
      return { ...m, id, relatedSkills: [...new Set(m.relatedSkills)], prerequisiteIds: prev ? [prev] : [],
        activities: m.activities.map((a, ai) => ({ ...a, id: `activity-${pi + 1}-${mi + 1}-${ai + 1}-${slug(a.title)}` })) };
    }),
  }));
  const hours = phases.flatMap(p => p.milestones).reduce((n, m) => n + m.estimatedHours, 0);
  const estimatedDurationWeeks = Math.max(prefs.durationWeeks, Math.ceil(hours / prefs.weeklyHours));
  return validateRoadmapOrder(roadmapContentSchema.parse({ description: generated.description, startingSkillLevel, targetSkillLevel: 'Prepared for entry-level learning and project work',
    estimatedDurationWeeks, weeklyHours: prefs.weeklyHours, targetCompletionDate: prefs.targetDate, phases }));
}
export function createDemoRoadmap(career: CareerDef, gaps: string[], preferences: Partial<RoadmapPreferences> = {}, currentSkills: string[] = []): RoadmapContent {
  const prefs = roadmapPreferencesSchema.parse(preferences);
  const canonical = career.skills.map(s => s.name);
  const have = new Set(currentSkills.map(normalizeSkill));
  const missing = [...new Set(gaps.map(g => g.toLowerCase()).filter(g => canonical.includes(g)))];
  if (!missing.length) missing.push(...career.skills.filter(s => !have.has(normalizeSkill(s.name)) && !(s.alt ?? []).some(alt => have.has(normalizeSkill(alt)))).map(s => s.name));
  missing.splice(8);
  const topics = missing.length ? missing : career.skills.slice(0, 4).map(s => s.name);
  const resources = career.resources;
  const activity = (kind: RoadmapAiResponse['phases'][number]['milestones'][number]['activities'][number]['kind'], title: string, description: string, estimatedHours: number, completionCriteria: string, resourceName?: string) => ({ kind, title, description, estimatedHours, completionCriteria, ...(resourceName ? { resourceName } : {}) });
  const mk = (title: string, desc: string, skills: string[], estimatedHours: number, project: boolean) => ({ title, description: desc, objectives: skills.map(s => `Practise ${s} in a beginner-friendly context.`).slice(0, 4), relatedSkills: skills,
    estimatedHours, priority: 'high' as const, completionCriteria: project ? 'Save the project files or a short written summary and note one limitation.' : 'Complete the practice and write down what you learned.',
    activities: [
      activity('reading', `Learn ${skills[0] ?? career.title} foundations`, `Study one introductory section, then summarize the main ideas in your own words.`, Math.max(1, Math.round(estimatedHours * 0.3)), 'Write three key ideas and one question.', resources[0]),
      activity('exercise', `Practise ${skills.slice(0, 2).join(' and ') || career.title}`, 'Complete a small guided exercise and record what worked and what you would improve.', Math.max(1, Math.round(estimatedHours * 0.3)), 'Save your exercise and a short reflection.'),
      ...(project ? [activity('project', career.projects[0], 'Create an educational portfolio project. It is a learning exercise, not a professionally validated design.', Math.max(2, Math.round(estimatedHours * 0.4)), 'Document the outcome, tools used and limitations.')] : []),
    ] });
  const split = Math.ceil(topics.length / 2);
  const generated: RoadmapAiResponse = { description: `A starter plan for ${career.title}, personalized to your listed skills${currentSkills.length ? ` (${currentSkills.slice(0, 4).join(', ')})` : ''} and selected learning preferences. Skills from the profile are self-reported, not verified.`, phases: [
    { title: 'Foundations', description: 'Build or refresh the concepts needed for the next activities.', milestones: [mk('Review core foundations', 'Start with the highest-priority skills for this career.', topics.slice(0, split), Math.max(4, split * 4), false)] },
    { title: 'Guided practice', description: 'Apply core concepts with small, observable exercises.', milestones: [mk('Practise core skills', 'Use short exercises to turn concepts into repeatable skills.', topics.slice(split).length ? topics.slice(split) : topics.slice(0, 2), Math.max(6, topics.length * 3), false)] },
    { title: 'Portfolio project', description: 'Create a small piece of evidence and document your choices.', milestones: [mk(career.projects[0], 'Complete a portfolio-scale educational project with clear assumptions and limits.', topics.slice(0, 4), 12, true)] },
    { title: 'Career preparation', description: 'Connect your learning evidence to entry-level roles and next learning steps.', milestones: [{ title: 'Prepare an entry-level portfolio', description: `Review entry-level roles such as ${career.entryTitles.slice(0, 2).join(' and ')}.`, objectives: ['Describe your project decisions', 'Identify one next skill to practise'], relatedSkills: topics.slice(0, 3), estimatedHours: 5, priority: 'medium', completionCriteria: 'Write a short project summary and choose one next learning goal.', activities: [activity('career_prep', 'Write a project case study', 'Summarize the problem, your approach, result and limitations in a portfolio-ready page.', 3, 'Save a one-page case study.'), activity('career_prep', 'Review entry-level role requirements', `Compare two sample role titles: ${career.entryTitles.slice(0, 2).join(', ')}.`, 2, 'Record two recurring skills to continue practising.')] }] },
  ] };
  return assemble(career, prefs, generated, prefs.experienceLevel);
}
export function assembleAiRoadmap(career: CareerDef, prefs: RoadmapPreferences, response: RoadmapAiResponse, startingSkillLevel: RoadmapContent['startingSkillLevel']): RoadmapContent {
  return assemble(career, prefs, response, startingSkillLevel);
}
