export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';
export interface QuizOption { id: string; label: string; correct: boolean }
export interface QuizQuestion { id: string; prompt: string; topic: string; explanation: string; options: QuizOption[] }
export interface QuizRecord {
  id: string; category: string; title: string; description: string; objectives: string[]; difficulty: QuizDifficulty;
  timeLimitSeconds: number | null; passingScore: number; maxAttempts: number; allowReview: boolean; leaderboardEnabled: boolean;
  questionCount: number; demo: boolean; questions?: QuizQuestion[];
}

export const QUIZ_CATEGORIES = [
  'Programming Fundamentals','Data Structures and Algorithms','Web Development','Python','Java','JavaScript','SQL',
  'Data Analytics and Data Science','AI and Machine Learning','Cybersecurity Fundamentals','Aptitude and Logical Reasoning',
  'Quantitative Aptitude','Verbal Ability','Communication and Workplace Skills','Mechanical Engineering','Automotive and Electric Vehicles',
  'CAD, CAE and Design Engineering','Manufacturing and Production','Quality Engineering','Thermal Engineering','Electrical and Electronics','Supply Chain and Operations',
];

const q = (id:string,prompt:string,topic:string,correct:string,wrongOne:string,wrongTwo:string,explanation:string):QuizQuestion => ({id,prompt,topic,explanation,options:[{id:`${id}-a`,label:correct,correct:true},...[wrongOne,wrongTwo].map((label,index)=>({id:`${id}-${String.fromCharCode(98+index)}`,label,correct:false}))]});
export const DEMO_QUIZZES: QuizRecord[] = [
  { id:'demo-programming-foundations',category:'Programming Fundamentals',title:'Programming Foundations',description:'A short introductory check of variables, control flow and clear problem decomposition.',objectives:['Identify basic program behavior','Recognize a simple control structure'],difficulty:'beginner',timeLimitSeconds:300,passingScore:60,maxAttempts:5,allowReview:true,leaderboardEnabled:false,questionCount:4,demo:true,questions:[
    q('pf-1','What is a variable commonly used for?','Variables','Store a value that a program can use','Repeat a block of code','Connect to the internet','A variable names a value so the program can use or update it.'),
    q('pf-2','What does a loop help a program do?','Control flow','Repeat instructions','Create a database table','Encrypt a file','Loops repeat instructions while a condition or sequence allows.'),
    q('pf-3','Which is the clearest first step when solving a new coding task?','Problem solving','Understand inputs, outputs and constraints','Choose a framework immediately','Write code before reading the task','Understanding the requirements helps choose an appropriate solution.'),
    q('pf-4','What does a Boolean value represent?','Data types','True or false','A decimal number only','A collection of files','Booleans represent one of two logical states: true or false.'),
  ]},
  { id:'demo-sql-basics',category:'SQL',title:'SQL Query Basics',description:'Practice reading simple SELECT, WHERE, and aggregate queries.',objectives:['Recognize a basic SELECT query','Choose the right filter or aggregate'],difficulty:'beginner',timeLimitSeconds:360,passingScore:60,maxAttempts:5,allowReview:true,leaderboardEnabled:false,questionCount:4,demo:true,questions:[
    q('sql-1','Which clause chooses the columns returned by a query?','SELECT','SELECT','WHERE','ORDER BY','SELECT lists the columns to return.'),
    q('sql-2','Which clause filters rows before grouping?','Filtering','WHERE','LIMIT','AS','WHERE filters rows that match a condition.'),
    q('sql-3','Which function counts rows in a group?','Aggregation','COUNT(*)','SUM(text)','ORDER(*)','COUNT(*) returns the number of rows.'),
    q('sql-4','What does ORDER BY do by default in many SQL databases?','Sorting','Sorts rows in ascending order','Deletes duplicate rows','Groups rows by every column','ORDER BY sorts results; ascending is the usual default.'),
  ]},
  { id:'demo-workplace-communication',category:'Communication and Workplace Skills',title:'Workplace Communication',description:'Explore practical choices for clear, respectful team communication.',objectives:['Choose clear status updates','Practice constructive clarification'],difficulty:'beginner',timeLimitSeconds:null,passingScore:60,maxAttempts:5,allowReview:true,leaderboardEnabled:false,questionCount:4,demo:true,questions:[
    q('wc-1','A task is blocked. What is the most useful update?','Status updates','State the blocker, its impact, and the help needed','Wait until the deadline passes','Send only “I cannot do this”','A useful update gives context and a clear next step.'),
    q('wc-2','You receive unclear instructions. What should you do first?','Clarification','Ask a focused question and confirm the expected outcome','Guess without checking','Forward the message to everyone','Focused clarification prevents avoidable rework.'),
    q('wc-3','How should you respond to constructive feedback?','Feedback','Listen, ask for an example if needed, and agree on a next step','Dismiss it immediately','Treat it as a personal attack','Specific discussion turns feedback into an actionable improvement.'),
    q('wc-4','What makes a meeting update easier to follow?','Concise writing','Lead with the decision or key point','Use unexplained abbreviations','Include every detail first','Leading with the main point helps listeners understand the update.'),
  ]},
];
