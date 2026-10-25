import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { loadCourseProgress, type CourseProgressRecord } from '../services/courseProgress';
import { listRoadmapBundles, type RoadmapBundle } from '../services/roadmaps';
import { PageShell } from '../components/common/ui';

const Panel = ({ title, children }: { title: string; children: ReactNode }) => <section className="surface-card rounded-2xl p-5"><h2 className="font-serif text-lg font-semibold">{title}</h2>{children}</section>;

export function AnalyticsPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseProgressRecord[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void Promise.all([loadCourseProgress(user?.id), user ? listRoadmapBundles(user.id) : Promise.resolve([])])
      .then(([courseRows, roadmapRows]) => { if (live) { setCourses(courseRows); setRoadmaps(roadmapRows); } })
      .catch(() => { if (live) setError('Your learning analytics could not be loaded. Check your connection and account setup.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user?.id]);
  const milestones = roadmaps.flatMap(bundle => bundle.roadmap.content.phases.flatMap(phase => phase.milestones));
  const completed = new Set(roadmaps.flatMap(bundle => bundle.completedMilestones));
  const completedCourses = courses.filter(course => course.status === 'completed').length;
  const hours = roadmaps.flatMap(bundle => bundle.roadmap.content.phases.flatMap(phase => phase.milestones.flatMap(milestone => milestone.activities.filter(activity => bundle.completedActivities.includes(activity.id)).map(activity => activity.estimatedHours)))).reduce((sum, value) => sum + value, 0);
  return <PageShell title="Learning analytics">
    <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-600">See the learning progress you have recorded across courses and career roadmaps. Completed items are self-reported and are not provider-verified.</p>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading ? <p role="status" className="text-sm text-slate-600">Loading learning progress…</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Panel title="Roadmaps"><p className="mt-3 text-3xl font-bold">{roadmaps.length}</p><Link to="/roadmaps" className="mt-2 inline-block text-sm font-semibold text-red-700 underline">View roadmaps</Link></Panel>
      <Panel title="Milestones completed"><p className="mt-3 text-3xl font-bold">{completed.size}<span className="ml-1 text-base font-medium text-slate-500">/ {milestones.length}</span></p><p className="mt-2 text-xs text-slate-500">Progress recorded from your roadmap.</p></Panel>
      <Panel title="Courses"><p className="mt-3 text-3xl font-bold">{courses.length}</p><p className="mt-2 text-xs text-slate-500">{completedCourses} marked complete by you.</p><Link to="/courses" className="mt-2 inline-block text-sm font-semibold text-red-700 underline">Browse courses</Link></Panel>
      <Panel title="Roadmap study hours"><p className="mt-3 text-3xl font-bold">{hours}</p><p className="mt-2 text-xs text-slate-500">Estimated hours from activities you marked done.</p></Panel>
    </div>}
    {!loading && roadmaps.length > 0 && <section className="mt-6"><h2 className="mb-3 font-serif text-xl font-semibold">Your roadmap progress</h2><div className="grid gap-3 md:grid-cols-2">{roadmaps.map(bundle => { const total = bundle.roadmap.content.phases.reduce((sum, phase) => sum + phase.milestones.length, 0); const done = bundle.completedMilestones.length; const percent = total ? Math.round(done * 100 / total) : 0; return <article key={bundle.roadmap.id} className="surface-card rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-red-700">{bundle.roadmap.status}</p><h3 className="mt-1 font-semibold">{bundle.roadmap.career_title}</h3></div><span className="text-sm font-bold">{percent}%</span></div><div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-gradient-to-r from-red-600 to-rose-400" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-slate-500">{done} of {total} milestones recorded</p><Link to={`/roadmaps/${bundle.roadmap.id}`} className="mt-3 inline-block text-sm font-semibold text-red-700 underline">Open roadmap</Link></article>; })}</div></section>}
  </PageShell>;
}
