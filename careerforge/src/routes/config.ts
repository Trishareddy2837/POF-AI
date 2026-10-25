/** Single source of truth for navigation. `auth: true` routes are wired to real guards in Batch 2. */
export interface RouteDef { path: string; label: string; auth?: boolean; publicNav?: boolean; sidebar?: boolean }
export const ROUTES: RouteDef[] = [
  { path: '/', label: 'Home', publicNav: true },
  { path: '/courses', label: 'Courses', publicNav: true, sidebar: true },
  { path: '/internships', label: 'Internships', publicNav: true, sidebar: true },
  { path: '/jobs', label: 'Jobs', publicNav: true, sidebar: true },
  { path: '/hackathons', label: 'Hackathons', publicNav: true, sidebar: true },
  { path: '/resume-builder', label: 'Resume Builder', publicNav: true, sidebar: true },
  { path: '/careers', label: 'Career Options', publicNav: true, sidebar: true },
  { path: '/roadmaps/create', label: 'Roadmaps', publicNav: true },
  { path: '/career-roles', label: 'Career Options' },
  { path: '/roadmaps', label: 'My Roadmaps', auth: true, sidebar: true },
  { path: '/learning-resources', label: 'Learning Resources', auth: true, sidebar: true },
  { path: '/applications', label: 'Application Tracker', auth: true },
  { path: '/publisher', label: 'Publisher Workspace', auth: true },
  { path: '/competitions', label: 'Projects and Competitions' },
  { path: '/challenges', label: 'Roadmap Coding Practice', auth: true, sidebar: true },
  { path: '/login', label: 'Sign In' }, { path: '/register', label: 'Get Started' },
  { path: '/dashboard', label: 'Dashboard', auth: true, sidebar: true },
  { path: '/profile', label: 'My Profile', auth: true, sidebar: true },
  { path: '/career-analysis', label: 'AI Career Analysis', auth: true, sidebar: true },
  { path: '/progress', label: 'My Progress', auth: true, sidebar: true },
  { path: '/analytics', label: 'Learning Analytics', auth: true, sidebar: true },
  { path: '/settings', label: 'Settings', auth: true, sidebar: true },
];
export const publicNav = ROUTES.filter(r => r.publicNav);
