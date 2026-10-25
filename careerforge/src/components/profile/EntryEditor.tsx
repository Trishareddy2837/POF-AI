import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../app/AuthProvider';
import { addEntry, listEntries, removeEntry, type EntryTable } from '../../services/profile';
import { errMsg } from '../../lib/utils';
export interface EntryField { name: string; label: string; required?: boolean; options?: string[] }
export function EntryEditor({ table, title, fields }: { table: EntryTable; title: string; fields: EntryField[] }) {
  const { user } = useAuth();
  const init = () => Object.fromEntries(fields.map(f => [f.name, f.options?.[0] ?? '']));
  const [rows, setRows] = useState<Record<string, string>[]>([]); const [vals, setVals] = useState<Record<string, string>>(init()); const [err, setErr] = useState<string | null>(null);
  const load = async () => { try { setRows(await listEntries(table)); } catch (e) { setErr(errMsg(e)); } };
  useEffect(() => { void load(); }, [table]);
  const add = async (e: FormEvent) => {
    e.preventDefault(); if (!user) return;
    const miss = fields.find(f => f.required && !vals[f.name]?.trim()); if (miss) { setErr(`${miss.label} is required.`); return; }
    try { await addEntry(table, user.id, Object.fromEntries(fields.map(f => [f.name, vals[f.name]?.trim().slice(0, 300) || null]))); setVals(init()); setErr(null); await load(); } catch (x) { setErr(errMsg(x)); }
  };
  return (<section className="mb-6" aria-label={title}><h3 className="mb-2 font-serif text-lg font-semibold">{title}</h3>
    {err && <p role="alert" className="mb-2 text-sm text-red-700">{err}</p>}
    {rows.length === 0 ? <p className="mb-2 text-sm text-slate-600">None added yet.</p> : <ul className="mb-3 divide-y rounded-lg border bg-white">{rows.map(r => <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span><b>{r.title}</b> <span className="text-slate-600">{fields.filter(f => f.name !== 'title' && r[f.name]).map(f => r[f.name]).join(' · ')}</span></span>
      <button type="button" className="text-red-700 underline" aria-label={`Remove ${r.title}`} onClick={async () => { try { await removeEntry(table, r.id); await load(); } catch (x) { setErr(errMsg(x)); } }}>Remove</button></li>)}</ul>}
    <form onSubmit={add} className="grid gap-2 sm:grid-cols-3">{fields.map(f => <div key={f.name}><label className="block text-xs font-semibold" htmlFor={`${table}-${f.name}`}>{f.label}</label>
      {f.options ? <select id={`${table}-${f.name}`} className="w-full rounded-lg border border-slate-300 px-2 py-1.5" value={vals[f.name]} onChange={e => setVals({ ...vals, [f.name]: e.target.value })}>{f.options.map(o => <option key={o}>{o}</option>)}</select>
        : <input id={`${table}-${f.name}`} maxLength={300} className="w-full rounded-lg border border-slate-300 px-2 py-1.5" value={vals[f.name]} onChange={e => setVals({ ...vals, [f.name]: e.target.value })} />}</div>)}
      <div className="sm:col-span-3"><button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Add</button></div></form></section>);
}
