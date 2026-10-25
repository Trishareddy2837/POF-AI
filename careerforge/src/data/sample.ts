/** DEMONSTRATION DATA ONLY. Not real listings, events or courses. Replace with live sources later. */
export interface Item { title: string; meta: string; tags: string[]; lines: string[] }
const nl = 'Official link: not connected';
export const courses: Item[] = [
  { title: 'Python for Beginners', meta: 'Programming · Beginner · 6 weeks', tags: ['Python', 'Logic'], lines: ['Provider link: not connected'] },
  { title: 'SQL and Data Analysis', meta: 'Data · Beginner · 5 weeks', tags: ['SQL', 'Excel'], lines: ['Provider link: not connected'] },
  { title: 'CAD Fundamentals', meta: 'Design · Beginner · 4 weeks', tags: ['CAD', 'Sketching'], lines: ['Provider link: not connected'] },
  { title: 'EV Powertrain Basics', meta: 'Electric Vehicles · Intermediate · 8 weeks', tags: ['Batteries', 'Motors'], lines: ['Provider link: not connected'] },
];
const rm = (title: string, tags: string[], project: string, t: string): Item => ({ title, meta: 'Career roadmap', tags, lines: [`Starter project: ${project}`, `Estimated timeline: ${t} (estimate only)`] });
export const roadmaps: Item[] = [
  rm('Software Development', ['Programming', 'Git', 'APIs'], 'Build a REST API', '6–9 months'),
  rm('Data Analytics', ['SQL', 'Statistics', 'Dashboards'], 'Sales dashboard', '5–8 months'),
  rm('Mechanical and Automotive Design', ['CAD', 'Materials', 'GD&T'], 'Suspension part design', '8–12 months'),
  rm('Electric Vehicles', ['Battery systems', 'Motor control', 'Charging'], 'Battery pack model', '8–12 months'),
  rm('Manufacturing and Production', ['Lean', 'Quality', 'Process planning'], 'Line balancing study', '6–10 months'),
  rm('CAD/CAE and Product Design', ['CAD', 'FEA', 'Prototyping'], 'Stress analysis report', '6–10 months'),
];
export const internships: Item[] = [
  { title: 'Software Intern', meta: 'Sample Organization A · Remote', tags: ['JavaScript', 'Git'], lines: ['Eligibility: final-year students', 'Deadline: not verified', nl] },
  { title: 'Design Engineering Intern', meta: 'Sample Organization B · On-site', tags: ['CAD', 'Mechanics'], lines: ['Eligibility: engineering students', 'Deadline: not verified', nl] },
  { title: 'Data Analyst Intern', meta: 'Sample Organization C · Hybrid', tags: ['SQL', 'Excel'], lines: ['Eligibility: any degree', 'Deadline: not verified', nl] },
];
export const hackathons: Item[] = [
  { title: 'Sample Build Challenge', meta: 'Organizer: Sample Organizer', tags: ['Sustainable mobility'], lines: ['Eligibility: students', 'Dates: not verified', 'Registration link: not connected'] },
  { title: 'Sample Data Sprint', meta: 'Organizer: Sample Organizer', tags: ['Open data'], lines: ['Eligibility: students and graduates', 'Dates: not verified', 'Registration link: not connected'] },
];
export const jobs: Item[] = [
  { title: 'Junior Developer', meta: 'Sample Co. · Entry level · Remote', tags: ['JavaScript', 'SQL'], lines: ['Eligibility: graduates', 'Application link: not connected'] },
  { title: 'Data Analyst', meta: 'Sample Co. · Entry level · Hybrid', tags: ['SQL', 'Excel', 'Statistics'], lines: ['Eligibility: graduates', 'Application link: not connected'] },
  { title: 'CAD Engineer', meta: 'Sample Co. · 0–2 years · On-site', tags: ['CAD', 'GD&T'], lines: ['Eligibility: mechanical degree', 'Application link: not connected'] },
  { title: 'EV Test Engineer', meta: 'Sample Co. · 0–2 years · On-site', tags: ['Batteries', 'Testing'], lines: ['Eligibility: engineering degree', 'Application link: not connected'] },
];
export const roles: Item[] = [
  { title: 'Software Developer', meta: 'Technology', tags: ['Programming', 'Git'], lines: ['Soft skills: communication, teamwork', 'Roadmap: Software Development'] },
  { title: 'Data Analyst', meta: 'Analytics', tags: ['SQL', 'Statistics'], lines: ['Soft skills: curiosity, storytelling', 'Roadmap: Data Analytics'] },
  { title: 'Design Engineer', meta: 'Automotive', tags: ['CAD', 'FEA'], lines: ['Soft skills: attention to detail', 'Roadmap: CAD/CAE and Product Design'] },
];
export const quiz = [
  { q: 'What is 15% of 200?', options: ['20', '30', '35'], answer: 1 },
  { q: 'Next in series: 2, 4, 8, 16, …', options: ['24', '32', '30'], answer: 1 },
  { q: 'Which data structure is first-in, first-out?', options: ['Stack', 'Queue', 'Tree'], answer: 1 },
];
