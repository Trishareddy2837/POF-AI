export type ParsedResumeText = {
  fullName: string;
  email: string;
  phone: string;
  links: string;
  summary: string;
  sectionContents: Record<string, string>;
  sourceText: string;
};

/** Parse common resume headings without mixing technical and soft skills. */
export function parseResumeText(sourceText: string): ParsedResumeText {
  const lines = sourceText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const buckets: Record<string, string[]> = { summary: [], education: [], technical: [], soft: [], experience: [], internships: [], projects: [], certifications: [] };
  let active = '';
  const heading = (line: string) => {
    const value = line.toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (/^(summary|profile|objective|professional summary)$/.test(value)) return 'summary';
    if (/^(education|academic background)$/.test(value)) return 'education';
    if (/^(soft skills|interpersonal skills)$/.test(value)) return 'soft';
    if (/^(skills|technical skills|core competencies)$/.test(value)) return 'technical';
    if (/^(internship experience|internship|internships)$/.test(value)) return 'internships';
    if (/^(experience|work experience|employment history)$/.test(value)) return 'experience';
    if (/^(projects|selected projects)$/.test(value)) return 'projects';
    if (/^(certifications|certificates)$/.test(value)) return 'certifications';
    return null;
  };
  for (const line of lines) {
    const detected = heading(line);
    if (detected) { active = detected; continue; }
    if (active) buckets[active].push(line);
  }
  const email = sourceText.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? '';
  const phone = sourceText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? '';
  const links = sourceText.match(/https?:\/\/[^\s]+/g)?.join('\n') ?? '';
  const fullName = lines.find(line => line.length < 80 && !line.includes('@') && !/resume|curriculum vitae/i.test(line)) ?? '';
  const value = (key: string) => buckets[key].join('\n');
  return {
    fullName, email, phone, links, summary: value('summary'), sourceText,
    sectionContents: { education: value('education'), 'technical-skills': value('technical'), 'soft-skills': value('soft'), experience: value('experience'), internships: value('internships'), projects: value('projects'), certifications: value('certifications') },
  };
}
