import { CAREERS } from './careerCatalogue';

export const ROADMAP_TRACKS = [
  { id: 'foundation', label: 'Foundations', description: 'Build the core concepts and prerequisite skills.' },
  { id: 'projects', label: 'Project practice', description: 'Learn by completing portfolio-ready projects.' },
  { id: 'industry', label: 'Industry preparation', description: 'Focus on tools and workflows used in the field.' },
  { id: 'portfolio', label: 'Portfolio building', description: 'Turn learning into evidence you can show.' },
  { id: 'career-ready', label: 'Career readiness', description: 'Prepare for entry roles and practical interviews.' },
] as const;

export const ROADMAP_OPTIONS = CAREERS.flatMap(career => ROADMAP_TRACKS.map(track => ({
  id: `${career.id}-${track.id}`,
  careerId: career.id,
  career,
  track,
  title: `${career.title} · ${track.label}`,
})));
