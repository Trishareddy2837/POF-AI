import { describe, expect, it } from 'vitest';
import { OPPORTUNITIES } from '../../src/data/opportunityCatalogue';
import { scoreJobMatch } from '../../src/lib/jobMatching';
import { blankResumeContent, resumeContentSchema, resumeDocumentSchema } from '../../src/schemas/resume';

describe('Prompt 5 career features', () => {
  it('computes a transparent job alignment score and lists skill gaps', () => {
    const job = { ...OPPORTUNITIES.find(item => item.id === 'demo-job-data-analyst')!, requiredSkills: ['sql', 'python'], preferredSkills: ['excel'], relatedCareerIds: ['data-analytics'], educationRequirements: '' };
    const result = scoreJobMatch(job, { skills: ['SQL', 'Excel'], careerIds: ['data-analytics'] });
    expect(result.score).toBe(60);
    expect(result.matchingSkills).toEqual(['sql']);
    expect(result.missingSkills).toEqual(['python']);
    expect(result.note).toContain('not the probability');
  });

  it('validates editable resume content and bounded, versionable documents', () => {
    expect(resumeContentSchema.safeParse(blankResumeContent).success).toBe(true);
    expect(resumeDocumentSchema.safeParse({ title: 'Graduate resume', template: 'modern', content: blankResumeContent }).success).toBe(true);
    expect(resumeDocumentSchema.safeParse({ title: '', template: 'decorative', content: blankResumeContent }).success).toBe(false);
  });
});
