import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { useProfile } from '../app/ProfileProvider';
import { useAnalysis } from '../app/AnalysisProvider';
import { aiEnabled, type ProviderMode } from '../services/aiProvider';
import { deleteAnalysis, loadActions, loadAnalysis, loadHistory, runAnalysis, selectCareer, toggleAction, type ActionRow, type AnalysisRow } from '../services/careerAnalysis';
import { DEMO_NOTICE } from '../lib/demoProvider';
import { profileHints } from '../lib/careerMatching';
import { INTEREST_CHIPS } from '../data/interestChips';
import { AiError } from '../lib/aiErrors';
import { errMsg } from '../lib/utils';
import { CareerCard } from '../components/career/CareerCard';
import { matchShares, PIE_COLORS } from '../components/career/MatchPie';
import { Notice, PageShell, Tags } from '../components/common/ui';
import { isSupabaseConfigured } from '../lib/supabase';
import { CAREERS } from '../data/careerCatalogue';
import { roadmapPreferencesSchema } from '../schemas/roadmap';
import { generateRoadmapContent, saveRoadmap } from '../services/roadmaps';
const btn = 'rounded-lg bg-brand px-4 py-2 font-semibold text-navy disabled:opacity-60';
export default function CareerAnalysisPage() {
  const { user } = useAuth(); const { data, resume } = useProfile(); const { latest, actions, selected, reload } = useAnalysis();
  const navigate = useNavigate();
  const [view, setView] = useState<{ row: AnalysisRow; actions: ActionRow[] } | null>(null);
  const [history, setHistory] = useState<{ id: string; created_at: string; provider_mode: ProviderMode; summary: string }[]>([]);
  const [open, setOpen] = useState<string | null>(null); const [consent, setConsent] = useState(false);
  const [picked, setPicked] = useState<string[]>([]); const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<{ text: string; canDemo: boolean } | null>(null); const [msg, setMsg] = useState<string | null>(null); const [recoveryCareerId, setRecoveryCareerId] = useState<string | null>(null);
  const shown = view?.row ?? latest; const shownActions = view?.actions ?? actions; const exploratory = Boolean(shown?.result.exploratory);
  const hints = useMemo(() => profileHints({ degree: data.degree ?? '', specialization: data.specialization ?? '', interests: [data.interests, ...picked].join(' '), targetRoles: data.targetRoles ?? '', goals: `${data.goals ?? ''}${notes}`, skills: data.skills ?? [], evidence: [] }), [data, picked, notes]);
  useEffect(() => { if (user && isSupabaseConfigured) void loadHistory(user.id).then(setHistory).catch(() => setHistory([])); }, [user, latest?.id]);
  const focusId = open ?? selected?.career_id ?? shown?.result.careerPaths[0]?.careerId;
  const colorOf = (id: string) => { const i = shown ? matchShares(shown.result.careerPaths).findIndex(x => x.id === id) : -1; return i >= 0 ? PIE_COLORS[i % PIE_COLORS.length] : undefined; };
  const run = async (mode: ProviderMode) => {
    if (!user) return; setBusy(true); setErr(null); setMsg(null);
    const terms = INTEREST_CHIPS.filter(c => picked.includes(c.label)).map(c => c.terms).join(', ');
    try { await runAnalysis(user.id, data, mode, { interests: terms, notes: notes.trim().slice(0, 500) }); setView(null); await reload(); setMsg(mode === 'demo' ? 'Demo analysis saved.' : 'Analysis saved.'); }
    catch (e) { setErr({ text: errMsg(e), canDemo: mode === 'real' && e instanceof AiError }); } finally { setBusy(false); }
  };
  const pick = async (id: string, title: string) => {
    if (!user || !shown) return;
    const career = CAREERS.find(c => c.id === id); if (!career) { setErr({ text: 'That career is no longer in the catalogue. Run a fresh analysis and choose again.', canDemo: false }); return; }
    setBusy(true); setErr(null); setMsg(null); setRecoveryCareerId(null);
    try {
      await selectCareer(user.id, id, title, shown.id);
      const path = shown.result.careerPaths.find(p => p.careerId === id);
      const preferences = roadmapPreferencesSchema.parse({});
      const mode = shown.result.providerMode === 'real' && aiEnabled ? 'real' : 'demo';
      setMsg(`Building your ${mode === 'real' ? 'AI-personalized' : 'demo'} roadmap for ${title}…`);
      const content = await generateRoadmapContent({ career, currentSkills: (data.skills ?? []).slice(0, 50), missingSkills: (path?.missingSkills ?? []).slice(0, 20), preferences,
        education: [data.preDegreeType, data.preDegreePercentage ? `${data.preDegreePercentage}%` : '', data.degree, data.specialization, data.institution, data.btechPercentage ? `${data.btechPercentage}%` : ''].filter(Boolean).join(' · ') }, mode);
      const row = await saveRoadmap(user.id, career, preferences, content);
      await reload(); navigate(`/roadmaps/${row.id}`);
    } catch (e) {
      setErr({ text: `Your career choice was saved, but the roadmap could not be created: ${errMsg(e)}`, canDemo: false }); setRecoveryCareerId(id);
    } finally { setBusy(false); }
  };
  const tick = async (a: ActionRow) => { try { await toggleAction(a.id, !a.completed); if (view) setView({ ...view, actions: await loadActions(view.row.id) }); await reload(); } catch (e) { setErr({ text: errMsg(e), canDemo: false }); } };
  const openOld = async (id: string) => { try { setView({ row: await loadAnalysis(id), actions: await loadActions(id) }); } catch (e) { setErr({ text: errMsg(e), canDemo: false }); } };
  const remove = async (id: string) => { if (!window.confirm('Delete this analysis and its saved actions?')) return; try { await deleteAnalysis(id); setView(null); await reload(); } catch (e) { setErr({ text: errMsg(e), canDemo: false }); } };
  const gaps = shown?.result.skillGaps.filter(g => g.careerId === focusId) ?? []; const focus = shown?.result.careerPaths.find(p => p.careerId === focusId);
  return (<PageShell title="AI Career Analysis">
    <p className="mb-3 max-w-3xl text-slate-600">Not sure what you want to do? Share topics, skills, study focus or experience and we compare your profile with 100 career paths. The more you share, the more useful the comparison.</p>
    {!aiEnabled ? <Notice>{DEMO_NOTICE}</Notice> : <Notice>AI mode is enabled. If the AI provider fails you will see the error; nothing is silently replaced with demo results.</Notice>}
    {!isSupabaseConfigured && <Notice>Supabase is not configured, so analyses cannot be saved.</Notice>}
    <section className="mb-6 grid gap-4 md:grid-cols-2" aria-label="Your information">
      <div className="rounded-lg border bg-white p-4"><h2 className="mb-1 font-serif text-lg font-semibold">Not sure? Tap what interests you</h2><p className="mb-2 text-xs text-slate-500">Optional. Pick as many as you like, or none.</p>
        <div className="flex flex-wrap gap-2">{INTEREST_CHIPS.map(c => <button key={c.label} type="button" aria-pressed={picked.includes(c.label)} onClick={() => setPicked(p => p.includes(c.label) ? p.filter(x => x !== c.label) : [...p, c.label])} className={`rounded-full border px-3 py-1 text-sm ${picked.includes(c.label) ? 'border-brand bg-teal-50 font-semibold text-teal-900' : 'border-slate-300'}`}>{c.label}</button>)}</div>
        <label htmlFor="notes" className="mb-1 mt-3 block text-sm font-semibold">Anything else about you (optional)</label>
        <textarea id="notes" rows={3} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Subjects you enjoy, things you have built, what you want from a job…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
      <div className="rounded-lg border bg-white p-4"><h2 className="mb-2 font-serif text-lg font-semibold">Run analysis</h2>
        <p className="mb-1 text-sm text-slate-600">Profile details we will use if you have added them:</p>
        <ul className="mb-2 text-sm">{hints.map(c => <li key={c.key}>{c.done ? '✓' : '○'} {c.label}</li>)}</ul>
        <p className="mb-2 text-xs text-slate-500">All optional. <Link className="underline" to="/profile">Edit your profile</Link> for better results. Resume: {resume ? `${resume.file_name} is on file but is not read automatically.` : 'none uploaded.'}</p>
        <p className="mb-2 text-sm text-slate-600">{aiEnabled ? 'Sent to the AI provider: degree, specialization, interests, goals, your notes, skills, and project, certification and experience titles. Not sent: your name, email, phone, city or resume file.' : 'Nothing leaves your account in demo mode.'}</p>
        {aiEnabled && <label className="mb-2 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to send the information listed above to the AI provider.</label>}
        <button className={btn} disabled={busy || !isSupabaseConfigured || (aiEnabled && !consent)} onClick={() => void run(aiEnabled ? 'real' : 'demo')}>{busy ? 'Analyzing…' : latest ? 'Rerun analysis' : 'Analyze my career'}</button>
        {latest && <p className="mt-2 text-xs text-slate-500">Last analysis: {new Date(latest.created_at).toLocaleString()} ({latest.provider_mode === 'demo' ? 'demo mode' : 'AI'})</p>}</div></section>
    {busy && <p role="status" className="mb-3 text-sm">Working on your analysis. This can take up to a minute or two.</p>}
    {err && <div role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err.text}{err.canDemo && <> <button className="ml-2 underline" onClick={() => void run('demo')}>Run a clearly labelled demo analysis instead</button></>}{recoveryCareerId && <> <Link className="ml-2 font-semibold underline" to={`/roadmaps/create?careerId=${encodeURIComponent(recoveryCareerId)}`}>Open roadmap builder</Link></>}</div>}
    {msg && <p role="status" className="mb-3 text-sm text-teal-800">{msg}</p>}
    {!shown ? <div className="rounded-lg border border-dashed bg-white p-6 text-center text-slate-600">No analysis yet. Choose Analyze my career, even if you are not sure about anything.</div> : <>
      {view && <Notice>You are viewing an older analysis from {new Date(view.row.created_at).toLocaleString()}. <button className="underline" onClick={() => setView(null)}>Back to latest</button></Notice>}
      {shown.provider_mode === 'demo' && <Notice>This analysis was generated in demo mode (templates, not an AI model).</Notice>}
      {exploratory && <Notice>You have not shared enough for us to score matches, so these are broad areas to explore, not recommendations. Tap topics above or add details, then rerun.</Notice>}
      <section className="mb-6"><h2 className="mb-2 font-serif text-xl font-semibold">Summary</h2><p className="max-w-3xl text-slate-700">{shown.result.summary}</p>
        {shown.result.profileStrengths.length > 0 && <><h3 className="mb-1 mt-3 font-semibold">Strengths found in your profile</h3><ul className="text-sm">{shown.result.profileStrengths.map(s => <li key={s.name}><b>{s.name}</b> · <span className="text-slate-600">{s.evidence}</span></li>)}</ul></>}</section>
      {!exploratory && <section className="mb-6"><h2 className="mb-2 font-serif text-xl font-semibold">Your career suggestions</h2><p className="mb-3 text-sm text-slate-600">Each suggested career has its own skill-fit pie chart, showing profile skills already aligned and skills you could build next.</p>{focus && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-teal-50 p-4"><p className="flex-1 text-sm text-teal-950"><b>{focus.title}</b> is your closest match. Review its skill chart below, or build its roadmap now.</p><button className={btn} disabled={busy} onClick={() => void pick(focus.careerId, focus.title)}>{busy ? 'Building roadmap…' : 'Build this career roadmap'}</button></div>}</section>}
      {exploratory ? <section className="mb-6"><h2 className="mb-2 font-serif text-xl font-semibold">Areas to explore</h2><p className="mb-3 text-sm text-slate-600">These are broad starting points, not scored recommendations. Add profile details to see closer matches.</p><div className="grid gap-4 md:grid-cols-2">{shown.result.careerPaths.map(p => <CareerCard key={p.careerId} path={p} scored={false} busy={busy} selected={selected?.career_id === p.careerId} open={open === p.careerId} onDetails={() => setOpen(open === p.careerId ? null : p.careerId)} onSelect={() => void pick(p.careerId, p.title)} />)}</div></section> : <>
        <section className="mb-6"><h2 className="mb-1 font-serif text-xl font-semibold">Closest profile matches</h2><p className="mb-3 text-sm text-slate-600">The strongest overlap from your profile, ranked first. Select a path to create its roadmap.</p><div className="grid gap-4 md:grid-cols-2">{shown.result.careerPaths.slice(0, 8).map(p => <CareerCard key={p.careerId} path={p} color={colorOf(p.careerId)} busy={busy} selected={selected?.career_id === p.careerId} open={open === p.careerId} onDetails={() => setOpen(open === p.careerId ? null : p.careerId)} onSelect={() => void pick(p.careerId, p.title)} />)}</div></section>
        {shown.result.careerPaths.length > 8 && <section className="mb-6"><h2 className="mb-1 font-serif text-xl font-semibold">Related career options</h2><p className="mb-3 text-sm text-slate-600">Adjacent paths with overlapping skills, interests or study areas—useful alternatives to compare.</p><div className="grid gap-4 md:grid-cols-2">{shown.result.careerPaths.slice(8, 20).map(p => <CareerCard key={p.careerId} path={p} color={colorOf(p.careerId)} busy={busy} selected={selected?.career_id === p.careerId} open={open === p.careerId} onDetails={() => setOpen(open === p.careerId ? null : p.careerId)} onSelect={() => void pick(p.careerId, p.title)} />)}</div></section>}</>}
      {!exploratory && <section className="mb-6"><h2 className="mb-2 font-serif text-xl font-semibold">Skill gaps{focus ? ` for ${focus.title}` : ''}</h2>
        {gaps.length === 0 ? <p className="text-sm text-slate-600">No gaps listed for this path.</p> : <ul className="space-y-3">{gaps.map(g => { const acts = shownActions.filter(a => a.career_id === g.careerId && a.skill === g.skill); const done = acts.filter(a => a.completed).length;
          return <li key={g.skill} className="rounded-lg border bg-white p-3 text-sm"><p><b className="capitalize">{g.skill}</b> · {g.importance} importance · <span className="text-slate-600">Not yet assessed{acts.length ? ` · ${done}/${acts.length} actions done` : ''}</span></p>
            <p className="text-slate-600">{g.reason}</p>{acts.map(a => <label key={a.id} className="mt-1 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={a.completed} onChange={() => void tick(a)} />{a.text}</label>)}</li>; })}</ul>}
        {focusId && (() => { const extra = shownActions.filter(a => a.career_id === focusId && !a.skill); return extra.length ? <div className="mt-3"><h3 className="mb-1 font-semibold">Practice and project ideas</h3>{extra.map(a => <label key={a.id} className="mt-1 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={a.completed} onChange={() => void tick(a)} /><span><span className="capitalize text-slate-500">{a.kind}:</span> {a.text}</span></label>)}</div> : null; })()}</section>}
      <section className="mb-6 grid gap-4 md:grid-cols-2"><div><h2 className="mb-2 font-serif text-lg font-semibold">Job roles to consider</h2><ul className="space-y-2 text-sm">{shown.result.recommendedJobRoles.map(r => <li key={r.title}><b>{r.title}</b> · {r.industry}<br /><span className="text-slate-600">{r.preparationAdvice}</span></li>)}</ul></div>
        <div><h2 className="mb-2 font-serif text-lg font-semibold">Project ideas</h2><ul className="space-y-2 text-sm">{shown.result.recommendedProjects.map(p => <li key={p.title}><b>{p.title}</b> ({p.difficulty})<br /><span className="text-slate-600">{p.purpose}</span><Tags items={p.skillsToPractice} /></li>)}</ul></div></section>
      <section className="mb-6"><h2 className="mb-2 font-serif text-lg font-semibold">What to learn next</h2><ul className="text-sm">{shown.result.recommendedLearning.map(l => <li key={l.topic}><b className="capitalize">{l.topic}</b> ({l.priority}) · <span className="text-slate-600">{l.reason}</span></li>)}</ul></section></>}
    {history.length > 0 && <section aria-label="History"><h2 className="mb-2 font-serif text-lg font-semibold">Previous analyses</h2><ul className="divide-y rounded-lg border bg-white text-sm">{history.map(h => <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span>{new Date(h.created_at).toLocaleString()} · {h.provider_mode === 'demo' ? 'demo' : 'AI'}</span>
      <span className="flex gap-3"><button className="underline" onClick={() => void openOld(h.id)}>View</button><button className="text-red-700 underline" onClick={() => void remove(h.id)}>Delete</button></span></li>)}</ul></section>}
    <p className="mt-6 text-xs text-slate-500">Recommendations are guidance only and do not guarantee employment. Self-reported skills are not verified. {selected && <Link className="ml-1 font-semibold text-teal-800 underline" to={`/roadmaps/create?careerId=${encodeURIComponent(selected.career_id)}`}>Open {selected.title} roadmap options</Link>}</p>
  </PageShell>);
}
