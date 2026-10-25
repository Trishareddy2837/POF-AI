import { z } from 'zod';

export const resumeSectionSchema = z.object({ id: z.string().min(1).max(60), title: z.string().trim().min(1).max(80), content: z.string().max(12000), visible: z.boolean() });
export const resumeContentSchema = z.object({
  fullName: z.string().trim().max(120), headline: z.string().trim().max(160), email: z.string().trim().max(254), phone: z.string().trim().max(32), location: z.string().trim().max(120),
  summary: z.string().max(2500), links: z.string().max(1000), sections: z.array(resumeSectionSchema).max(20),
});
export const resumeTemplateSchema = z.enum(['ats','modern','technical','compact','graduate']);
export const resumeDocumentSchema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(120), template: resumeTemplateSchema, content: resumeContentSchema, parent_document_id: z.string().uuid().nullable().optional(), created_at: z.string().optional(), updated_at: z.string().optional() });
export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type ResumeTemplate = z.infer<typeof resumeTemplateSchema>;
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;

export const DEFAULT_RESUME_SECTIONS = [
  { id: 'education', title: 'Education', content: '', visible: true },
  { id: 'technical-skills', title: 'Technical Skills', content: '', visible: true },
  { id: 'soft-skills', title: 'Soft Skills', content: '', visible: true },
  { id: 'experience', title: 'Work Experience', content: '', visible: true },
  { id: 'internships', title: 'Internships', content: '', visible: false },
  { id: 'projects', title: 'Projects', content: '', visible: true },
  { id: 'certifications', title: 'Certifications', content: '', visible: false },
  { id: 'achievements', title: 'Achievements', content: '', visible: false },
  { id: 'competitions', title: 'Competitions', content: '', visible: false },
];
export const blankResumeContent: ResumeContent = { fullName: '', headline: '', email: '', phone: '', location: '', summary: '', links: '', sections: DEFAULT_RESUME_SECTIONS.map(section => ({ ...section })) };
