import type { AnalysisResult } from '../../schemas/analysis';
type Path = AnalysisResult['careerPaths'][number];
export function CareerCard({ path, selected, open, onDetails, onSelect, busy, scored = true, color }: { path: Path; selected: boolean; open: boolean; onDetails: () => void; onSelect: () => void; busy: boolean; scored?: boolean; color?: string }) {
  return (<article className={`rounded-lg border bg-white p-4 shadow-sm ${selected ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'}`} aria-label={path.title} style={color ? { borderTop: `4px solid ${color}` } : undefined}>
    <div className="flex items-start justify-between gap-2"><div><h3 className="font-serif text-lg font-semibold">{path.title}</h3><p className="text-sm text-slate-600">{path.industry}</p></div>
      {scored ? <div className="text-right"><p className="text-xl font-bold" aria-label={`Approximate profile match ${path.fitScore} out of 100`}>{path.fitScore}<span className="text-sm font-normal text-slate-500">/100</span></p><p className="text-xs text-slate-500">approx. profile match</p></div>
        : <p className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">Not scored yet</p>}</div>
    <p className="mt-2 text-sm text-slate-700">{path.fitExplanation}</p>
    {scored && <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div role="img" aria-label={`${path.title}: ${path.matchingSkills.length} of ${path.requiredSkills.length} typical skills match; ${path.missingSkills.length} to build`} className="grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#0f766e 0 ${path.requiredSkills.length ? Math.round(path.matchingSkills.length / path.requiredSkills.length * 100) : 0}%, #fecdd3 0 100%)` }}><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-xs font-bold text-slate-900">{path.requiredSkills.length ? Math.round(path.matchingSkills.length / path.requiredSkills.length * 100) : 0}%</span></div><div className="text-xs"><p className="font-bold">Skill fit for this career</p><p className="mt-1 text-teal-900">{path.matchingSkills.length} profile skills aligned</p><p className="text-rose-800">{path.missingSkills.length} suggested to build</p><p className="mt-1 text-slate-500">Separate chart for {path.title}</p></div></div>}
    {scored ? <><p className="mt-2 text-xs font-semibold text-slate-600">Matching skills</p><p className="text-sm">{path.matchingSkills.length ? path.matchingSkills.join(', ') : 'None found in your profile yet'}</p>
      <p className="mt-2 text-xs font-semibold text-slate-600">Skills to improve (not yet assessed)</p><p className="text-sm">{path.missingSkills.length ? path.missingSkills.join(', ') : 'None'}</p></>
      : <><p className="mt-2 text-xs font-semibold text-slate-600">Typical core skills in this field</p><p className="text-sm">{path.missingSkills.join(', ')}</p></>}
    <p className="mt-2 text-xs text-slate-600">Typical entry-level titles: {path.entryLevelTitles.join(', ')}</p>
    {scored && path.confidence === 'low' && <p role="note" className="mt-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">Low confidence: your profile has limited information for this match.</p>}
    <div className="mt-3 flex flex-wrap gap-2"><button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" aria-expanded={open} onClick={onDetails}>{open ? 'Hide details' : 'View details'}</button>
      <button disabled={busy || selected} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-navy disabled:opacity-60" onClick={onSelect}>{selected ? 'Selected' : 'Select & build roadmap'}</button></div>
    {open && <div className="mt-3 border-t pt-3 text-sm">{path.factors.length > 0 && <><p className="mb-1 font-semibold">How the approximate score was calculated</p>
      <ul className="mb-2 space-y-0.5">{path.factors.map(f => <li key={f.factor}>{f.factor}: {f.points}/{f.max} <span className="text-slate-500">· {f.note}</span></li>)}</ul></>}
      <p className="font-semibold">Required skills</p><p className="mb-2">{path.requiredSkills.join(', ')}</p>
      <p className="font-semibold">Suggested next steps</p><ul className="list-disc pl-5">{path.nextSteps.map(s => <li key={s}>{s}</li>)}</ul></div>}
  </article>);
}
