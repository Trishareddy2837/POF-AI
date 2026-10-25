import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Notice, PageShell } from '../components/common/ui';
import { useAuth } from '../app/AuthProvider';
import { listRoadmaps, type RoadmapRow } from '../services/roadmaps';

const practiceAreas = [
  { match: /array|list|sequence|two pointer|sliding window/i, topics: ['array', 'two pointers', 'sliding window'] },
  { match: /string|text|pattern/i, topics: ['string', 'string matching'] },
  { match: /tree|graph|traversal/i, topics: ['tree', 'graph'] },
  { match: /sql|database|data model/i, topics: ['database', 'SQL'] },
  { match: /dynamic programming|optimization/i, topics: ['dynamic programming'] },
  { match: /stack|queue/i, topics: ['stack', 'queue'] },
  { match: /search|sort|algorithm/i, topics: ['binary search', 'sorting'] },
  { match: /python|java|javascript|programming|software|web/i, topics: ['array', 'hash table', 'binary search'] },
];

function topicsFor(roadmap: RoadmapRow): string[] {
  const source = roadmap.content.phases.flatMap(phase => [phase.title, ...phase.milestones.flatMap(milestone => [milestone.title, ...milestone.activities.map(activity => activity.title)])]).join(' ');
  const matches = practiceAreas.filter(area => area.match.test(`${roadmap.career_title} ${source}`)).flatMap(area => area.topics);
  return [...new Set(matches)].slice(0, 8);
}

export function PracticeChallengesPage() {
  const { user } = useAuth();
  const [roadmaps, setRoadmaps] = useState<RoadmapRow[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let live = true;
    void listRoadmaps(user.id).then(rows => {
      if (!live) return;
      setRoadmaps(rows);
      setSelectedId(rows.find(row => row.status === 'active')?.id ?? rows[0]?.id ?? '');
    }).catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Could not load your roadmaps.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user]);
  const roadmap = roadmaps.find(row => row.id === selectedId);
  const topics = roadmap ? topicsFor(roadmap) : [];

  return <PageShell title="Roadmap coding practice">
    <section className="opportunity-hero mb-5 rounded-3xl p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-red-100">Practice studio</p><h2 className="mt-2 font-serif text-3xl font-semibold">Practice skills from your learning path.</h2><p className="mt-2 max-w-2xl text-sm text-slate-200">Choose a topic from your current roadmap and open matching problems on LeetCode.</p></section>
    <Notice>Problems open on LeetCode. POF-AI does not run code, submit solutions, or receive your LeetCode activity. The topic suggestions are matched from your saved roadmap.</Notice>
    {loading && <p className="mt-4 text-sm text-slate-600">Loading your roadmap…</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!loading && roadmaps.length > 0 && <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm"><label className="block text-sm font-semibold" htmlFor="practice-roadmap">Choose a roadmap</label><select id="practice-roadmap" value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2 sm:max-w-xl">{roadmaps.map(row => <option key={row.id} value={row.id}>{row.career_title} · {row.status}</option>)}</select><p className="mt-3 text-sm text-slate-600">Topics are suggested from “{roadmap?.title}”. Confirm they match what you are studying before you begin.</p>
      {topics.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{topics.map(topic => <a key={topic} href={`https://leetcode.com/problemset/?search=${encodeURIComponent(topic)}`} target="_blank" rel="noreferrer" className="group rounded-2xl border p-4 transition hover:-translate-y-1 hover:border-red-400 hover:shadow-[0_14px_35px_rgba(239,68,68,0.16)]"><span className="text-xs font-bold uppercase tracking-wider text-red-700">Roadmap topic</span><h3 className="mt-2 font-semibold text-slate-900">{topic}</h3><span className="mt-3 inline-flex text-sm font-semibold text-red-700">Find LeetCode problems ↗</span></a>)}</div> : <p className="mt-4 text-sm text-slate-600">No coding topics matched this roadmap yet. You can still browse the <a className="font-semibold text-red-700 underline" href="https://leetcode.com/problemset/" target="_blank" rel="noreferrer">LeetCode problem set</a>, or update your roadmap with programming skills.</p>}
    </section>}
    {!loading && !roadmaps.length && <section className="mt-5 rounded-2xl border bg-white p-6"><h3 className="font-semibold">Start with a roadmap</h3><p className="mt-2 text-sm text-slate-600">Once you save a career roadmap, we’ll suggest coding topics that relate to its learning phases.</p><Link to="/roadmaps/new" className="mt-4 inline-flex rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white">Build a roadmap</Link></section>}
  </PageShell>;
}
