import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { CLUSTERS, skillLabel } from '../../data/careerCatalogue';
import { ROADMAP_OPTIONS } from '../../data/roadmapCatalogue';

const clusters = [...new Set(ROADMAP_OPTIONS.map(option => option.career.cluster))];
export function RoadmapGallery() {
  const [query, setQuery] = useState(''); const [cluster, setCluster] = useState('all'); const [visible, setVisible] = useState(12); const [previewId, setPreviewId] = useState<string | null>(null);
  const filtered = useMemo(() => ROADMAP_OPTIONS.filter(option => (cluster === 'all' || option.career.cluster === cluster) && `${option.title} ${option.career.industry} ${CLUSTERS[option.career.cluster]?.label ?? ''} ${option.career.skills.map(s => s.name).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [query, cluster]);
  const shown = filtered.slice(0, visible);
  return <div>
    <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
      <label className="relative block"><span className="sr-only">Search career roadmaps</span><Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e => { setQuery(e.target.value); setVisible(12); }} placeholder="Search careers, skills, or industries" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm" /></label>
      <label className="flex items-center gap-2 text-sm"><span className="text-slate-600">Field</span><select value={cluster} onChange={e => { setCluster(e.target.value); setVisible(12); }} className="rounded-xl border border-slate-300 px-3 py-2"><option value="all">All fields</option>{clusters.map(x => <option key={x} value={x}>{CLUSTERS[x]?.label ?? x}</option>)}</select></label>
    </div>
    <p className="mb-3 text-sm text-slate-600">Browse {filtered.length} of {ROADMAP_OPTIONS.length} roadmap tracks. Each career has five different focus plans.</p>
    {shown.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((option, i) => { const { career, track } = option; const expanded = previewId === option.id; const topSkills = career.skills.filter(s => s.core).slice(0, 4).map(s => skillLabel(s.name));
      return <article key={option.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg" style={{ animationDelay: `${Math.min(i % 6, 5) * 45}ms` }}>
        <div className="h-1.5 bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-500"/><div className="p-5"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">{CLUSTERS[career.cluster]?.label ?? career.industry} · {track.label}</p>
          <h3 className="font-serif text-xl font-semibold leading-tight">{career.title}</h3><p className="mt-1 text-sm text-slate-500">{career.industry}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">{topSkills.map(skill => <span key={skill} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-900">{skill}</span>)}</div>
          {expanded && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm animate-fade-up">
            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900">1</span><div><b>Build foundations</b><p className="text-slate-600">Start with {topSkills.slice(0, 2).join(' and ') || 'the core concepts'}.</p></div></div>
            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-900">2</span><div><b>{track.label}</b><p className="text-slate-600">{track.description}</p></div></div>
            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-900">3</span><div><b>Create a project</b><p className="text-slate-600">{career.projects[0]}</p></div></div>
            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">4</span><div><b>Prepare for entry roles</b><p className="text-slate-600">{career.entryTitles.slice(0, 2).join(' · ')}</p></div></div>
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">Preview based on POF-AI’s career catalogue. Sign in to generate and save a personalized roadmap; course feeds are not connected.</p>
          </div>}
          <div className="mt-5 flex flex-wrap items-center gap-2"><button type="button" aria-expanded={expanded} onClick={() => setPreviewId(expanded ? null : option.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-teal-50">{expanded ? 'Hide preview' : 'Preview path'}<ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}/></button>
            <Link to={`/roadmaps/create?careerId=${encodeURIComponent(career.id)}&track=${track.id}`} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">Build this roadmap<ArrowRight aria-hidden className="h-4 w-4"/></Link></div>
        </div></article>;
    })}</div> : <p className="rounded-xl border border-dashed bg-white p-6 text-center text-slate-600">No career paths match your search. Try a broader skill or another field.</p>}
    {shown.length < filtered.length && <div className="mt-6 text-center"><button type="button" onClick={() => setVisible(n => n + 12)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold hover:border-teal-400 hover:text-teal-900">Show more paths ({filtered.length - shown.length} remaining)</button></div>}
  </div>;
}
