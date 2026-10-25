import { CAREERS } from './careerCatalogue';

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CoursePrice = 'free' | 'unknown';

export interface CourseRecord {
  id: string;
  title: string;
  description: string;
  provider: string;
  category: string;
  relatedSkills: string[];
  difficulty: CourseDifficulty;
  estimatedHours: number | null;
  language: string | null;
  price: CoursePrice;
  officialUrl: string;
  relatedCareerIds: string[];
  source: string;
  verifiedOn: string;
}

/** A small, manually curated directory of official provider pages; it is not a live provider feed. */
export const COURSES: CourseRecord[] = [
  { id: 'cs50x', title: 'CS50x: Introduction to Computer Science', description: 'A broad introduction to computer science and programming, with weekly problem sets and a final project.', provider: 'Harvard University', category: 'Computer science', relatedSkills: ['programming', 'data structures', 'algorithms', 'sql', 'web development'], difficulty: 'beginner', estimatedHours: null, language: 'English', price: 'free', officialUrl: 'https://cs50.harvard.edu/x/', relatedCareerIds: ['software-development', 'cybersecurity'], source: 'Harvard CS50 official course page', verifiedOn: '2026-10-21' },
  { id: 'khan-python', title: 'Intro to Computer Science — Python', description: 'Learn Python fundamentals through practical exercises, challenges and small projects.', provider: 'Khan Academy', category: 'Programming', relatedSkills: ['python', 'programming', 'problem solving'], difficulty: 'beginner', estimatedHours: null, language: 'English', price: 'free', officialUrl: 'https://www.khanacademy.org/computing/intro-to-python-fundamentals', relatedCareerIds: ['software-development', 'data-analytics', 'ai-ml'], source: 'Khan Academy official course page', verifiedOn: '2026-10-21' },
  { id: 'khan-javascript-web', title: 'Computer Programming — JavaScript and the Web', description: 'Explore JavaScript, web pages, interactive programming and visual projects in guided lessons.', provider: 'Khan Academy', category: 'Web development', relatedSkills: ['javascript', 'programming', 'html', 'css', 'web development'], difficulty: 'beginner', estimatedHours: null, language: 'English', price: 'free', officialUrl: 'https://www.khanacademy.org/computing/computer-programming/programming/intro-to-programming', relatedCareerIds: ['software-development', 'ui-ux-design'], source: 'Khan Academy official course page', verifiedOn: '2026-10-21' },
  { id: 'kaggle-python', title: 'Python', description: 'A short, hands-on introduction to Python syntax, functions, loops, collections and libraries.', provider: 'Kaggle Learn', category: 'Programming', relatedSkills: ['python', 'programming'], difficulty: 'beginner', estimatedHours: 5, language: 'English', price: 'free', officialUrl: 'https://www.kaggle.com/learn/python', relatedCareerIds: ['software-development', 'data-analytics', 'ai-ml'], source: 'Kaggle Learn official course page', verifiedOn: '2026-10-21' },
  { id: 'kaggle-pandas', title: 'Pandas', description: 'Practise loading, exploring, selecting and summarizing data with pandas.', provider: 'Kaggle Learn', category: 'Data', relatedSkills: ['python', 'data analysis', 'pandas'], difficulty: 'beginner', estimatedHours: 4, language: 'English', price: 'free', officialUrl: 'https://www.kaggle.com/learn/pandas', relatedCareerIds: ['data-analytics', 'ai-ml'], source: 'Kaggle Learn official course page', verifiedOn: '2026-10-21' },
  { id: 'kaggle-sql', title: 'Intro to SQL', description: 'Learn foundational SQL queries and practise working with data in BigQuery.', provider: 'Kaggle Learn', category: 'Data', relatedSkills: ['sql', 'data analysis', 'databases'], difficulty: 'beginner', estimatedHours: 3, language: 'English', price: 'free', officialUrl: 'https://www.kaggle.com/learn/intro-to-sql', relatedCareerIds: ['data-analytics', 'software-development'], source: 'Kaggle Learn official course page', verifiedOn: '2026-10-21' },
  { id: 'kaggle-intro-ml', title: 'Intro to Machine Learning', description: 'Build and validate introductory machine-learning models through guided exercises.', provider: 'Kaggle Learn', category: 'Artificial intelligence', relatedSkills: ['machine learning', 'python', 'data analysis'], difficulty: 'beginner', estimatedHours: 3, language: 'English', price: 'free', officialUrl: 'https://www.kaggle.com/learn/intro-to-machine-learning', relatedCareerIds: ['ai-ml', 'data-analytics'], source: 'Kaggle Learn official course page', verifiedOn: '2026-10-21' },
  { id: 'freecodecamp-fullstack', title: 'Certified Full-Stack Developer Curriculum', description: 'A project-based curriculum covering core skills used to build full-stack web applications.', provider: 'freeCodeCamp', category: 'Web development', relatedSkills: ['html', 'css', 'javascript', 'web development'], difficulty: 'beginner', estimatedHours: null, language: 'English', price: 'free', officialUrl: 'https://www.freecodecamp.org/learn/full-stack-developer-v9', relatedCareerIds: ['software-development', 'ui-ux-design'], source: 'freeCodeCamp official curriculum page', verifiedOn: '2026-10-21' },
  { id: 'mit-python-cs', title: 'Introduction to CS and Programming Using Python', description: 'MIT OpenCourseWare lecture videos, notes and problem sets for introductory computer science with Python.', provider: 'MIT OpenCourseWare', category: 'Computer science', relatedSkills: ['python', 'programming', 'algorithms'], difficulty: 'intermediate', estimatedHours: null, language: 'English', price: 'free', officialUrl: 'https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/', relatedCareerIds: ['software-development', 'data-analytics', 'ai-ml'], source: 'MIT OpenCourseWare official course page', verifiedOn: '2026-10-21' },
];

type CourseSeed = Pick<CourseRecord, 'id'|'title'|'provider'|'category'|'relatedSkills'|'difficulty'|'officialUrl'|'relatedCareerIds'>;
const moreCourses: CourseSeed[] = [
  ...[
    ['kaggle-intro-programming','Intro to Programming','programming',['python','programming'],'beginner'],
    ['kaggle-intermediate-ml','Intermediate Machine Learning','machine-learning',['python','machine learning'],'intermediate'],
    ['kaggle-data-viz','Data Visualization','data',['python','data visualization'],'beginner'],
    ['kaggle-feature-engineering','Feature Engineering','machine-learning',['python','machine learning','data analysis'],'intermediate'],
    ['kaggle-advanced-sql','Advanced SQL','data',['sql','databases'],'intermediate'],
    ['kaggle-deep-learning','Intro to Deep Learning','machine-learning',['python','deep learning'],'intermediate'],
    ['kaggle-computer-vision','Computer Vision','machine-learning',['python','computer vision'],'intermediate'],
    ['kaggle-time-series','Time Series','data',['python','statistics','data analysis'],'intermediate'],
    ['kaggle-data-cleaning','Data Cleaning','data',['python','data analysis'],'beginner'],
    ['kaggle-geospatial','Geospatial Analysis','data',['python','data visualization'],'intermediate'],
    ['kaggle-ai-ethics','Intro to AI Ethics','artificial-intelligence',['artificial intelligence','ethics'],'beginner'],
    ['kaggle-explainability','Machine Learning Explainability','machine-learning',['python','machine learning'],'advanced'],
    ['kaggle-game-ai','Intro to Game AI and Reinforcement Learning','artificial-intelligence',['python','algorithms','artificial intelligence'],'intermediate'],
  ].map(([id,title,category,skills,difficulty])=>({id:String(id),title:String(title),provider:'Kaggle Learn',category:String(category),relatedSkills:skills as string[],difficulty:difficulty as CourseDifficulty,officialUrl:'https://www.kaggle.com/learn/',relatedCareerIds:['data-analytics','ai-ml']})),
  ...[
    ['fcc-responsive-web','Responsive Web Design','web development',['html','css','accessibility'],'beginner'],
    ['fcc-javascript','JavaScript Algorithms and Data Structures','programming',['javascript','algorithms','data structures'],'beginner'],
    ['fcc-front-end','Front-End Development Libraries','web development',['javascript','react','web development'],'intermediate'],
    ['fcc-python','Python Programming','programming',['python','programming'],'beginner'],
    ['fcc-relational-db','Relational Databases','data',['sql','databases'],'beginner'],
    ['fcc-backend-api','Back-End Development and APIs','web development',['javascript','apis','databases'],'intermediate'],
    ['fcc-scientific-python','Scientific Computing with Python','data',['python','data analysis'],'intermediate'],
    ['fcc-machine-learning','Machine Learning with Python','machine-learning',['python','machine learning'],'intermediate'],
  ].map(([id,title,category,skills,difficulty])=>({id:String(id),title:String(title),provider:'freeCodeCamp',category:String(category),relatedSkills:skills as string[],difficulty:difficulty as CourseDifficulty,officialUrl:'https://www.freecodecamp.org/learn/full-stack-developer-v9',relatedCareerIds:['software-development','data-analytics','ai-ml']})),
  ...[
    ['cs50-python','CS50’s Introduction to Programming with Python','programming',['python','programming'],'beginner','https://cs50.harvard.edu/python/'],
    ['cs50-ai','CS50’s Introduction to Artificial Intelligence with Python','artificial-intelligence',['python','artificial intelligence'],'advanced','https://cs50.harvard.edu/ai/'],
    ['cs50-sql','CS50’s Introduction to Databases with SQL','data',['sql','databases'],'beginner','https://cs50.harvard.edu/sql/'],
    ['cs50-web','CS50’s Web Programming with Python and JavaScript','web development',['python','javascript','web development'],'intermediate','https://cs50.harvard.edu/web/'],
    ['cs50-cybersecurity','CS50’s Introduction to Cybersecurity','cybersecurity',['cybersecurity','security'],'beginner','https://cs50.harvard.edu/cybersecurity/'],
    ['cs50-business','CS50’s Computer Science for Business Professionals','business',['technology strategy','computer science'],'beginner','https://cs50.harvard.edu/business/'],
    ['cs50-games','CS50’s Introduction to Game Development','game development',['programming','game development'],'intermediate','https://cs50.harvard.edu/games/'],
  ].map(([id,title,category,skills,difficulty,url])=>({id:String(id),title:String(title),provider:'Harvard University · CS50',category:String(category),relatedSkills:skills as string[],difficulty:difficulty as CourseDifficulty,officialUrl:String(url),relatedCareerIds:['software-development','cybersecurity','ai-ml']})),
  ...[
    ['mit-computational-thinking','Introduction to Computational Thinking and Data Science','computer science',['python','data analysis'],'intermediate'],
    ['mit-software-construction','Software Construction','computer science',['programming','software engineering'],'intermediate'],
    ['mit-algorithms','Introduction to Algorithms','computer science',['algorithms','data structures'],'advanced'],
    ['mit-matlab','Introduction to MATLAB','engineering',['programming','matlab'],'beginner'],
    ['mit-java','Introduction to Programming in Java','programming',['java','programming'],'beginner'],
    ['mit-linear-algebra','Linear Algebra','mathematics',['linear algebra','mathematics'],'intermediate'],
    ['mit-machine-learning','Introduction to Machine Learning','machine-learning',['machine learning','statistics'],'advanced'],
    ['mit-deep-learning','Deep Learning','machine-learning',['deep learning','artificial intelligence'],'advanced'],
  ].map(([id,title,category,skills,difficulty])=>({id:String(id),title:String(title),provider:'MIT OpenCourseWare',category:String(category),relatedSkills:skills as string[],difficulty:difficulty as CourseDifficulty,officialUrl:`https://ocw.mit.edu/search/?q=${encodeURIComponent(String(title))}`,relatedCareerIds:['software-development','data-analytics','ai-ml','engineering']})),
  {id:'google-ml-crash-course',title:'Machine Learning Crash Course',provider:'Google for Developers',category:'machine-learning',relatedSkills:['python','machine learning','statistics'],difficulty:'intermediate',officialUrl:'https://developers.google.com/machine-learning/crash-course',relatedCareerIds:['ai-ml','data-analytics']},
  {id:'google-python-class',title:'Python Class',provider:'Google for Education',category:'programming',relatedSkills:['python','programming'],difficulty:'beginner',officialUrl:'https://developers.google.com/edu/python',relatedCareerIds:['software-development','data-analytics']},
  {id:'google-tech-writing',title:'Technical Writing Courses',provider:'Google for Developers',category:'communication',relatedSkills:['technical writing','communication'],difficulty:'beginner',officialUrl:'https://developers.google.com/tech-writing',relatedCareerIds:['software-development','data-analytics']},
  {id:'webdev-accessibility',title:'Learn Accessibility',provider:'web.dev',category:'web development',relatedSkills:['accessibility','html','web development'],difficulty:'beginner',officialUrl:'https://web.dev/learn/accessibility/',relatedCareerIds:['software-development','ui-ux-design']},
  {id:'webdev-performance',title:'Learn Performance',provider:'web.dev',category:'web development',relatedSkills:['web performance','javascript','web development'],difficulty:'intermediate',officialUrl:'https://web.dev/learn/performance/',relatedCareerIds:['software-development']},
  {id:'webdev-responsive-design',title:'Learn Responsive Design',provider:'web.dev',category:'web development',relatedSkills:['css','responsive design','web development'],difficulty:'beginner',officialUrl:'https://web.dev/learn/design/',relatedCareerIds:['software-development','ui-ux-design']},
];

for (const course of moreCourses) {
  if (COURSES.some(existing => existing.id === course.id)) continue;
  COURSES.push({ ...course, description: `${course.title} learning path from ${course.provider}. Review the provider page for current lesson details, access and completion requirements.`, estimatedHours: null, language: 'English', price: 'free', source: `${course.provider} official learning catalogue`, verifiedOn: '2026-10-21' });
}

// Topic-specific official catalogue searches provide a much broader starting library.
// Search results are not represented as verified courses and their prices can vary.
const courseProviders = [
  { id: 'coursera', name: 'Coursera', url: (topic: string) => `https://www.coursera.org/search?query=${encodeURIComponent(topic)}` },
  { id: 'edx', name: 'edX', url: (topic: string) => `https://www.edx.org/search?q=${encodeURIComponent(topic)}` },
  { id: 'mit-ocw', name: 'MIT OpenCourseWare', url: (topic: string) => `https://ocw.mit.edu/search/?q=${encodeURIComponent(topic)}` },
  { id: 'microsoft-learn', name: 'Microsoft Learn', url: (topic: string) => `https://learn.microsoft.com/en-us/training/browse/?terms=${encodeURIComponent(topic)}` },
  { id: 'udemy', name: 'Udemy', url: (topic: string) => `https://www.udemy.com/courses/search/?q=${encodeURIComponent(topic)}` },
];
for (const career of CAREERS) for (const provider of courseProviders) {
  const id = `catalog-${career.id}-${provider.id}`;
  if (COURSES.some(course => course.id === id)) continue;
  COURSES.push({ id, title: `${career.title} · ${provider.name} course options`, description: `Search ${provider.name} for learning about ${career.title}. Results, course quality, access and price are controlled by the provider; review the course details before enrolling.`, provider: provider.name, category: career.industry, relatedSkills: career.skills.map(skill => skill.name).slice(0, 5), difficulty: 'beginner', estimatedHours: null, language: 'English', price: 'unknown', officialUrl: provider.url(career.title), relatedCareerIds: [career.id], source: `${provider.name} official course search`, verifiedOn: '2026-10-21' });
}

export const COURSE_CATEGORIES = [...new Set(COURSES.map(course => course.category))].sort();
export const COURSE_PROVIDERS = [...new Set(COURSES.map(course => course.provider))].sort();
export const COURSE_SKILLS = [...new Set(COURSES.flatMap(course => course.relatedSkills))].sort();
