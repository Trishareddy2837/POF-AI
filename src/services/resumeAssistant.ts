import { z } from 'zod';
import { aiError } from '../lib/aiErrors';
import { invokeCareerAnalysis } from './aiProvider';

const responseSchema = z.object({ suggestions: z.array(z.object({ field: z.enum(['summary','experience','projects']), original: z.string().trim().min(1).max(2500), proposed: z.string().trim().min(1).max(600), reason: z.string().trim().min(1).max(300) })).max(8) });
export type ResumeSuggestion = z.infer<typeof responseSchema>['suggestions'][number];
const clean = (text: string) => text.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email removed]').replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone removed]');
export async function suggestResumeEdits(resume: { summary: string; experience: string[]; projects: string[] }, jobDescription = ''): Promise<ResumeSuggestion[]> {
  const data = await invokeCareerAnalysis({ task: 'resume_assist', resume: { summary: clean(resume.summary), experience: resume.experience.map(clean), projects: resume.projects.map(clean) }, jobDescription: clean(jobDescription).slice(0, 6000) });
  const parsed = responseSchema.safeParse((data as { data?: unknown } | null)?.data);
  if (!parsed.success) throw aiError('invalid_response', parsed.error.issues.slice(0, 2).map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  const evidence = { summary: [clean(resume.summary)], experience: resume.experience.map(clean), projects: resume.projects.map(clean) };
  return parsed.data.suggestions.filter(suggestion => {
    if (!evidence[suggestion.field].some(line => line.includes(suggestion.original))) return false;
    const originalNumbers = new Set(suggestion.original.match(/\d+(?:[.,]\d+)?%?/g) ?? []);
    return (suggestion.proposed.match(/\d+(?:[.,]\d+)?%?/g) ?? []).every(number => originalNumbers.has(number));
  });
}
