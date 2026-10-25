import { describe, expect, it } from 'vitest';
import { parseResumeText } from '../../src/services/resumeImport';

describe('resume text import', () => {
  it('keeps technical skills, soft skills, and internship history in separate sections', () => {
    const result = parseResumeText([
      'Sample Student', 'PROFESSIONAL SUMMARY', 'Mechanical engineering student.',
      'INTERNSHIP EXPERIENCE', 'Assembly Intern — learned production planning.',
      'TECHNICAL SKILLS', 'AutoCAD, SAP PP, quality inspection',
      'SOFT SKILLS', 'Communication, teamwork, adaptability',
    ].join('\n'));
    expect(result.sectionContents['technical-skills']).toBe('AutoCAD, SAP PP, quality inspection');
    expect(result.sectionContents['soft-skills']).toBe('Communication, teamwork, adaptability');
    expect(result.sectionContents.internships).toBe('Assembly Intern — learned production planning.');
    expect(result.sectionContents['technical-skills']).not.toBe(result.sectionContents['soft-skills']);
  });
});
