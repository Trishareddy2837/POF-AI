import type { AnalysisResult } from '../../schemas/analysis';
type Path = AnalysisResult['careerPaths'][number];
export const PIE_COLORS = ['#0f766e', '#1d4ed8', '#b45309', '#7e22ce', '#be123c', '#0369a1', '#4d7c0f', '#c2410c', '#4338ca', '#0e7490', '#a21caf', '#047857', '#a16207', '#6d28d9', '#9f1239', '#075985', '#3f6212', '#9a3412', '#3730a3', '#115e59'];
const colorAt = (index: number) => PIE_COLORS[index % PIE_COLORS.length];
const C = 100, R = 82, R2 = 52;
const pt = (a: number, r: number) => [C + r * Math.cos(a), C + r * Math.sin(a)];
const arc = (a0: number, a1: number) => { const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, R2), [x3, y3] = pt(a0, R2); const l = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${l} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} A${R2} ${R2} 0 ${l} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`; };
/** The pie displays approximate profile-fit score shares, never job probability. */
export function matchShares(paths: Path[], max = 20) {
  const selected = paths.slice(0, max), total = selected.reduce((a, p) => a + Math.max(0, p.fitScore), 0);
  return total ? selected.map(p => ({ id: p.careerId, title: p.title, score: p.fitScore, pct: Math.round((Math.max(0, p.fitScore) / total) * 100) })) : [];
}
export function MatchPie({ paths, selectedId, onSelect }: { paths: Path[]; selectedId?: string; onSelect?: (careerId: string) => void }) {
  const shares = matchShares(paths); const selected = shares.find(x => x.id === selectedId) ?? shares[0];
  if (shares.length === 0) return <p className="rounded-lg border border-dashed bg-white p-4 text-sm text-slate-600">There is not enough profile information to show scored career shares yet. Add skills, study focus or interests and rerun your analysis.</p>;
  const total = shares.reduce((a, x) => a + Math.max(0, x.score), 0); let a = -Math.PI / 2;
  const slices = shares.filter(x => x.score > 0).map(x => { const sweep = (x.score / total) * 2 * Math.PI; const s = { ...x, i: shares.indexOf(x), a0: a, a1: a + sweep }; a += sweep; return s; });
  const label = `Approximate profile match score distribution: ${shares.map(x => `${x.title} ${x.pct} percent`).join(', ')}. Scores are not job probabilities.`;
  return (<figure className="grid items-center gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[240px_1fr] md:p-6">
    <div className="mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 200" role="img" aria-label={label} className="mx-auto h-56 w-56">
        {slices.length === 1 ? <circle cx={C} cy={C} r={(R + R2) / 2} fill="none" stroke={colorAt(slices[0].i)} strokeWidth={R - R2} /> :
          slices.map(s => <path key={s.id} d={arc(s.a0, s.a1)} fill={colorAt(s.i)} stroke="#fff" strokeWidth="1.2"><title>{`${s.title}: ${s.pct}% share, match score ${s.score} out of 100`}</title></path>)}
        <text x={C} y={C - 7} textAnchor="middle" className="fill-slate-500" fontSize="8">Selected path</text>
        <text x={C} y={C + 7} textAnchor="middle" className="fill-slate-900" fontSize="9" fontWeight="700">{(selected?.title ?? '').length > 21 ? `${selected?.title.slice(0, 19)}…` : selected?.title}</text>
        <text x={C} y={C + 22} textAnchor="middle" className="fill-teal-800" fontSize="11" fontWeight="700">{selected?.score ?? 0}/100</text>
      </svg>
      <p className="text-center text-xs text-slate-500">Select a career from the ranked list</p>
    </div>
    <div className="min-w-0"><figcaption className="mb-1 font-serif text-lg font-semibold">Your 20 career matches</figcaption>
      <p className="mb-3 text-sm text-slate-600">Choose any path to review it. The chart shows each score’s share of the combined matches.</p>
      <ul className="grid max-h-[22rem] gap-1 overflow-y-auto pr-1 sm:grid-cols-2" aria-label="Select a career match">
        {shares.map((s, i) => <li key={s.id}><button type="button" aria-pressed={selected?.id === s.id} onClick={() => onSelect?.(s.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-teal-50 ${selected?.id === s.id ? 'bg-teal-50 font-semibold text-teal-950 ring-1 ring-teal-200' : 'text-slate-700'}`}>
          <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colorAt(i) }} /><span className="min-w-0 flex-1 truncate">{s.title}</span><b className="tabular-nums">{s.score}</b><span className="w-9 text-right tabular-nums text-slate-500">{s.pct}%</span>
        </button></li>)}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Each slice is that career’s share of the combined match scores. It shows where your profile fits best today, not your chance of getting a job. Scores do not predict hiring or job success.</p>
    </div></figure>);
}
