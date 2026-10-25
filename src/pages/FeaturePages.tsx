import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Check, Clock3, ExternalLink, GraduationCap, Search, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CAREERS } from '../data/careerCatalogue';
import { COURSE_CATEGORIES, COURSE_PROVIDERS, COURSE_SKILLS, COURSES, type CourseRecord } from '../data/courseCatalogue';
import { filterCourses } from '../lib/courseDiscovery';
import { useAuth } from '../app/AuthProvider';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { addCourseToRoadmap, loadCourseProgress, loadCourseRoadmapLinks, setCourseProgress, type CourseProgressRecord, type CourseProgressStatus, type CourseRoadmapLink } from '../services/courseProgress';
import { listRoadmaps, type RoadmapRow } from '../services/roadmaps';
import { Notice, PageShell } from '../components/common/ui';
const NEXT_STATUS: Record<CourseProgressStatus, CourseProgressStatus | null> = { saved: 'in_progress', in_progress: 'completed', completed: null };
const STATUS_LABEL: Record<CourseProgressStatus, string> = { saved: 'Saved', in_progress: 'In progress', completed: 'Completed · self-reported' };
const statusButton: Record<CourseProgressStatus | 'none', string> = { none: 'Save to my learning', saved: 'Start learning', in_progress: 'Mark complete', completed: 'Remove from my learning' };
export function CoursesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('all'); const [skill, setSkill] = useState('all'); const [difficulty, setDifficulty] = useState('all');
  const [provider, setProvider] = useState('all'); const [price, setPrice] = useState('all'); const [duration, setDuration] = useState('all');
  const [visibleCount, setVisibleCount] = useState(24);
  const [progress, setProgress] = useState<CourseProgressRecord[]>([]); const [published, setPublished] = useState<CourseRecord[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [myRoadmaps, setMyRoadmaps] = useState<RoadmapRow[]>([]); const [roadmapLinks, setRoadmapLinks] = useState<CourseRoadmapLink[]>([]);
  useEffect(() => { let active = true; setLoading(true); void loadCourseProgress(user?.id).then(rows => { if (active) { setProgress(rows); setError(''); } }).catch(() => { if (active) setError('Could not load your learning list. Check your connection and retry.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [user?.id]);
  useEffect(() => { let active=true; if(supabase) void supabase.from('opportunity_listings').select('*,publisher_organizations(name)').eq('publication_status','published').eq('kind','course').gte('last_verified',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).then(({data})=>{if(!active)return;setPublished((data??[]).map(row=>({id:row.id,title:row.title,description:row.description,provider:(row.publisher_organizations as {name?:string}|null)?.name??'Publisher',category:row.industry||'Learning',relatedSkills:row.required_skills??[],difficulty:'beginner' as const,estimatedHours:null,language:null,price:'unknown' as const,officialUrl:row.source_url??'',relatedCareerIds:[],source:row.source_url??'',verifiedOn:row.last_verified??''})));});return()=>{active=false;};},[]);
  useEffect(() => { let active = true; if (!user || !isSupabaseConfigured) { setMyRoadmaps([]); setRoadmapLinks([]); return () => { active = false; }; }
    void Promise.all([listRoadmaps(user.id), loadCourseRoadmapLinks(user.id)]).then(([plans, links]) => { if (active) { setMyRoadmaps(plans.filter(plan => plan.status !== 'archived')); setRoadmapLinks(links); } }).catch(() => { if (active) setError('Could not load your saved roadmaps.'); });
    return () => { active = false; };
  }, [user?.id]);
  const statusByCourse = useMemo(() => new Map(progress.map(record => [record.course_id, record])), [progress]);
  const allCourses = useMemo(() => [...COURSES,...published], [published]);
  const visible = useMemo(() => filterCourses(allCourses, { query, category, skill, difficulty, provider, price, duration }), [allCourses, query, category, skill, difficulty, provider, price, duration]);
  const shownCourses = visible.slice(0, visibleCount);
  async function updateProgress(courseId: string) {
    const current = statusByCourse.get(courseId)?.status ?? null; const next = current ? NEXT_STATUS[current] : 'saved';
    setBusy(courseId); setNotice(''); setError('');
    try { setProgress(await setCourseProgress(courseId, next, user?.id)); setNotice(next === 'completed' ? 'Marked complete as your self-reported progress.' : next ? `Course ${next === 'saved' ? 'saved to' : 'moved to'} your learning list.` : 'Course removed from your learning list.'); }
    catch { setError('Your learning list could not be updated. Please retry.'); }
    finally { setBusy(null); }
  }
  async function addToRoadmap(roadmapId: string, courseId: string) {
    if (!user) return;
    const key = `link:${roadmapId}:${courseId}`; setBusy(key); setError(''); setNotice('');
    try { await addCourseToRoadmap(roadmapId, courseId, user.id); setRoadmapLinks(current => current.some(link => link.roadmap_id === roadmapId && link.course_id === courseId) ? current : [...current, { roadmap_id: roadmapId, course_id: courseId }]); setNotice('Course added to your roadmap learning links.'); }
    catch { setError('Could not add this course to the roadmap. Apply migration 0007 and retry.'); }
    finally { setBusy(null); }
  }
  const savedCount = progress.length; const completeCount = progress.filter(item => item.status === 'completed').length;
  return <div className="courses-view"><PageShell title="Learning marketplace">
    <section className="courses-hero mb-6 overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-xl sm:p-8">
      <div className="courses-orb courses-orb-a" aria-hidden="true" /><div className="courses-orb courses-orb-b" aria-hidden="true" />
      <div className="relative z-10 grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-teal-100"><Sparkles size={14} /> Learn with direction</span>
          <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">Find a course that moves your career forward.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200">Explore official learning pages, compare skills and time, then track your progress in one place.</p>
        </div>
        <div className="learning-stat-grid grid grid-cols-2 gap-3 md:w-64"><div className="learning-stat"><BookOpen size={18} /><strong>{savedCount}</strong><span>in your list</span></div><div className="learning-stat"><Check size={18} /><strong>{completeCount}</strong><span>self-reported done</span></div></div>
      </div>
    </section>
    <Notice>Curated official provider pages plus organization-published courses that link to an official source and were verified within 30 days. Providers can change content, access and pricing. Completion is self-reported here and does not verify provider enrollment or certification.</Notice>
    {!user && <p className="mb-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-950">Browse freely. <Link className="font-semibold underline" to="/login">Sign in</Link> to keep your learning list with your account.</p>}
    {user && !isSupabaseConfigured && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Supabase is not configured, so your learning list is stored only in this browser.</p>}
    <div className="course-filter-panel mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-semibold">Search courses<input aria-label="Search courses" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title, provider, or skill" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
      <label className="text-sm font-semibold">Category<select aria-label="Course category" value={category} onChange={event => setCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="all">All categories</option>{COURSE_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold">Skill<select aria-label="Course skill" value={skill} onChange={event => setSkill(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="all">All skills</option>{COURSE_SKILLS.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold">Difficulty<select aria-label="Course difficulty" value={difficulty} onChange={event => setDifficulty(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="all">Any level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
      <label className="text-sm font-semibold">Provider<select aria-label="Course provider" value={provider} onChange={event => setProvider(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="all">All providers</option>{COURSE_PROVIDERS.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-semibold">Price<select aria-label="Course price" value={price} onChange={event => setPrice(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="all">Any price status</option><option value="free">Verified free access</option><option value="unknown">Not verified</option></select></label>
      <label className="text-sm font-semibold">Estimated duration<select aria-label="Course duration" value={duration} onChange={event => setDuration(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="all">Any duration</option><option value="short">Up to 5 hours</option><option value="medium">6–20 hours</option><option value="long">Over 20 hours</option><option value="unknown">Not listed</option></select></label>
    </div>
    <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-slate-600">Showing <b>{visible.length}</b> courses ({published.length} organization-published)</p><Link to="/learning-resources" className="text-sm font-semibold text-teal-800 underline">Browse related resources</Link></div>
    {notice && <p role="status" className="mb-3 text-sm text-teal-800">{notice}</p>}{error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}{loading && <p role="status" className="mb-3 text-sm text-slate-600">Loading your learning list…</p>}
    {visible.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{shownCourses.map((course, index) => {
      const record = statusByCourse.get(course.id); const matching = COURSES.filter(item => item.id !== course.id && item.relatedSkills.some(skill => course.relatedSkills.includes(skill))).slice(0, 2);
      const relatedCareers = course.relatedCareerIds.map(id => CAREERS.find(career => career.id === id)).filter((career): career is (typeof CAREERS)[number] => Boolean(career));
      return <article key={course.id} className="course-card rounded-2xl border border-slate-200 bg-white p-5 shadow-md" style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
        <div className="course-card-top flex items-start justify-between gap-3"><span className="course-icon"><GraduationCap size={21} /></span><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">{record ? STATUS_LABEL[record.status] : published.some(item=>item.id===course.id) ? 'Publisher listing' : course.difficulty}</span></div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-teal-800">{course.category}</p><h2 className="mt-1 font-serif text-xl font-semibold leading-snug">{course.title}</h2><p className="mt-1 text-sm text-slate-600">{course.provider}</p>
        <p className="mt-3 min-h-12 text-sm leading-relaxed text-slate-700">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><Clock3 size={14} />{course.estimatedHours ? `${course.estimatedHours} hours (estimate)` : 'Self-paced · time not listed'}</span><span>{course.price === 'free' ? 'Free access listed' : 'Price not verified'}</span></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{course.relatedSkills.slice(0, 4).map(skill => <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700" key={skill}>{skill}</span>)}</div>
        <div className="mt-5 flex flex-wrap gap-2">{user ? <button type="button" disabled={busy === course.id} onClick={() => void updateProgress(course.id)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy === course.id ? 'Saving…' : statusButton[record?.status ?? 'none']}</button> : <Link to="/login" className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-800">Sign in to save learning</Link>}<Link to={`/courses/${course.id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50">More resources <ExternalLink size={14} /></Link><a href={course.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50">Provider page <ExternalLink size={14} /></a></div>
        {record?.status === 'completed' && <p className="mt-2 text-xs text-slate-500">You reported completion on {new Date(record.updated_at).toLocaleDateString()}.</p>}
        <details className="course-details mt-4 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-sm font-semibold text-teal-900">Course details and career links</summary><div className="mt-3 space-y-3 text-sm"><p><b>Language:</b> {course.language ?? 'Not listed'} · <b>Availability:</b> official page checked {course.verifiedOn}</p><p><b>Catalogue source:</b> {course.source}</p><div><b>Related career roadmaps</b><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{relatedCareers.map(career => <Link key={career.id} to={`/roadmaps/create?careerId=${encodeURIComponent(career.id)}`} className="inline-flex items-center gap-1 text-teal-800 underline">{career.title}<ArrowUpRight size={13} /></Link>)}</div></div>
          {user && <div><b>Add to a saved roadmap</b>{myRoadmaps.length ? <div className="mt-2 flex flex-wrap gap-2">{myRoadmaps.map(plan => { const added = roadmapLinks.some(link => link.roadmap_id === plan.id && link.course_id === course.id); const actionKey = `link:${plan.id}:${course.id}`; return <button key={plan.id} type="button" disabled={added || busy === actionKey} onClick={() => void addToRoadmap(plan.id, course.id)} className="rounded-lg border border-teal-200 px-2.5 py-1.5 text-xs font-semibold text-teal-900 disabled:bg-teal-50">{added ? `Added · ${plan.career_title}` : busy === actionKey ? 'Adding…' : `Add · ${plan.career_title}`}</button>; })}</div> : <p className="mt-1 text-slate-600">Create a roadmap first, then you can attach this course as a learning link.</p>}</div>}
          {!user && <p><Link to="/login" className="font-semibold text-teal-800 underline">Sign in</Link> to add this course to a saved roadmap.</p>}
          {matching.length > 0 && <div><b>Related learning</b><ul className="mt-1 list-disc pl-5">{matching.map(item => <li key={item.id}><a href={item.officialUrl} target="_blank" rel="noreferrer" className="text-teal-800 underline">{item.title}</a> · {item.provider}</li>)}</ul></div>}</div></details>
      </article>;
    })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Search className="mx-auto text-slate-400" /><p role="status" className="mt-2 font-semibold">No courses match those filters.</p><p className="mt-1 text-sm text-slate-600">Try clearing a filter or searching for a skill.</p><button type="button" onClick={() => { setQuery(''); setCategory('all'); setDifficulty('all'); setProvider('all'); setPrice('all'); setDuration('all'); }} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Clear filters</button></div>}
    {shownCourses.length < visible.length && <div className="my-6 text-center"><button type="button" onClick={() => setVisibleCount(count => count + 24)} className="rounded-xl border px-5 py-2.5 font-semibold hover:border-red-300">Show more courses · {visible.length - shownCourses.length} remaining</button></div>}
    <p className="mt-6 text-xs text-slate-500">Saved and completed states are maintained by CareerForge. They do not represent provider enrollment, certificates, or verified progress.</p>
  </PageShell></div>;
}

export function CourseDetailPage() {
  const { courseId = '' } = useParams();
  const course = COURSES.find(item => item.id === courseId);
  const { user } = useAuth();
  if (!course) return <PageShell title="Course not found"><Link to="/courses" className="inline-flex rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">Browse all courses</Link></PageShell>;
  const resources = [
    { name: `${course.provider} course page`, label: 'Official course', url: course.officialUrl },
    ...course.relatedSkills.flatMap(skill => [
      { name: `${skill} video lessons`, label: 'YouTube search', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} course tutorial`)}` },
      { name: `${skill} university courses`, label: 'edX search', url: `https://www.edx.org/search?q=${encodeURIComponent(skill)}` },
      { name: `${skill} course options`, label: 'Coursera search', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}` },
      { name: `${skill} documentation and guides`, label: 'MDN search', url: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(skill)}` },
      { name: `${skill} Microsoft learning paths`, label: 'Microsoft Learn', url: `https://learn.microsoft.com/en-us/training/browse/?terms=${encodeURIComponent(skill)}` },
      { name: `${skill} Udemy options`, label: 'Udemy search', url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}` },
    ]),
    { name: `${course.category} open course materials`, label: 'MIT OpenCourseWare search', url: `https://ocw.mit.edu/search/?q=${encodeURIComponent(course.category)}` },
    { name: `${course.category} free learning curriculum`, label: 'freeCodeCamp curriculum', url: 'https://www.freecodecamp.org/learn/full-stack-developer-v9' },
  ];
  const relatedCourses = COURSES.filter(item => item.id !== course.id && item.relatedSkills.some(skill => course.relatedSkills.includes(skill))).slice(0, 8);
  const relatedCareers = course.relatedCareerIds.map(id => CAREERS.find(career => career.id === id)).filter((career): career is (typeof CAREERS)[number] => Boolean(career));
  return <PageShell title={course.title}>
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="surface-card rounded-3xl p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-red-700">{course.provider} · {course.category}</p><p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">{course.description}</p><div className="mt-4 flex flex-wrap gap-2">{course.relatedSkills.map(skill => <span key={skill} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-900">{skill}</span>)}</div><div className="mt-6 flex flex-wrap gap-3"><a href={course.officialUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/15">Open course at provider ↗</a>{user ? <Link to="/courses" className="inline-flex rounded-full border px-5 py-3 text-sm font-semibold">Save progress from Courses</Link> : <Link to="/login" className="inline-flex rounded-full border px-5 py-3 text-sm font-semibold">Sign in to save learning</Link>}</div><p className="mt-3 text-xs text-slate-500">Course details, access, and pricing can change. Check the provider page before starting.</p>
      </section>
      <aside className="surface-card rounded-3xl p-5"><h2 className="font-serif text-xl font-semibold">Course snapshot</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Level</dt><dd className="font-semibold capitalize">{course.difficulty}</dd></div><div><dt className="text-xs text-slate-500">Time</dt><dd className="font-semibold">{course.estimatedHours ? `${course.estimatedHours} hours (estimate)` : 'Self-paced · provider has not listed a duration'}</dd></div><div><dt className="text-xs text-slate-500">Price</dt><dd className="font-semibold">{course.price === 'free' ? 'Free access listed by the provider' : 'Check provider'}</dd></div><div><dt className="text-xs text-slate-500">Language</dt><dd className="font-semibold">{course.language ?? 'Check provider'}</dd></div></dl></aside>
    </div>
    <section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><h2 className="font-serif text-2xl font-bold">Recommended learning resources</h2><p className="mt-1 text-sm text-slate-600">Each topic includes several provider choices. The first card is the best starting point; the rest are alternatives to compare.</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-900">{resources.length} resource links</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{resources.map((resource,index) => <a key={`${resource.label}-${resource.name}-${index}`} href={resource.url} target="_blank" rel="noreferrer" className={`surface-card rounded-2xl p-4 ${index===0?'border-2 border-red-500 bg-rose-50/70 shadow-lg shadow-red-900/10':''}`}><span className="text-[10px] font-bold uppercase tracking-wider text-red-700">{index===0?'Best starting point':`Suggested · ${resource.label}`}</span><h3 className="mt-2 font-semibold">{resource.name}</h3><span className="button-secondary mt-3 inline-flex items-center">Open resource ↗</span></a>)}</div></section>
    {relatedCourses.length > 0 && <section className="mt-8"><h2 className="mb-4 font-serif text-2xl font-bold">Related courses</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{relatedCourses.map(item => <Link key={item.id} to={`/courses/${item.id}`} className="surface-card rounded-2xl p-4"><span className="text-[10px] font-bold uppercase text-red-700">{item.provider}</span><h3 className="mt-2 font-semibold">{item.title}</h3><span className="mt-3 inline-block text-xs font-semibold text-red-700">View course ↗</span></Link>)}</div></section>}
    {relatedCareers.length > 0 && <section className="mt-8"><h2 className="mb-4 font-serif text-2xl font-bold">Careers connected to this course</h2><div className="flex flex-wrap gap-3">{relatedCareers.map(career => <Link key={career.id} to={`/roadmaps/create?careerId=${encodeURIComponent(career.id)}`} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-rose-50">Explore {career.title} roadmap</Link>)}</div></section>}
  </PageShell>;
}

export const AboutPage = () => <PageShell title="What is POF-AI?"><p className="max-w-3xl text-slate-600">POF-AI means Path of Future. It helps students explore career options, understand the skills they can build, and connect learning to practical next steps.</p></PageShell>;
export const HelpPage = () => <PageShell title="Help, Privacy and Terms"><p className="text-slate-600">Contact information and legal text will be added before launch.</p></PageShell>;
export const ComingSoon = ({ title, batch }: { title: string; batch: string }) => <PageShell title={title}><Notice>Not available yet: this feature is built in {batch}. No data is collected here.</Notice><Link to="/" className="rounded-lg border border-slate-300 px-3 py-1.5">Back to home</Link></PageShell>;
