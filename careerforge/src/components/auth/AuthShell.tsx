import type { ReactNode } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Notice } from '../common/ui';
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (<div className="auth-scene min-h-[calc(100vh-68px)] px-4 py-10 sm:px-6 sm:py-14"><div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 md:grid-cols-[.9fr_1.1fr]">
    <div className="relative hidden min-h-[560px] overflow-hidden text-white md:block"><img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=85" alt="Students planning their future together" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-[#111114]/60 to-[#721b2b]/20"/><div className="absolute bottom-0 p-9"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em]">POF-AI: PATH OF FUTURE</span><h2 className="mt-5 font-serif text-4xl font-bold leading-tight">Make your next step count.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/70">Build your profile, discover a direction, and move forward with purpose.</p></div></div>
    <div className="p-6 sm:p-10 md:p-12"><h1 className="mb-2 font-serif text-3xl font-bold tracking-tight">{title}</h1><p className="mb-6 text-sm text-slate-500">Continue your POF-AI journey.</p>
    {!isSupabaseConfigured && <Notice>Supabase is not configured, so sign-in is unavailable. Add your project URL and public anon key to the local environment.</Notice>}
    <div>{children}</div></div></div></div>);
}
export const Alert = ({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) => (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`mb-3 rounded-lg px-3 py-2 text-sm ${kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-teal-50 text-teal-900'}`}>{children}</p>);
export const Submit = ({ busy, children }: { busy: boolean; children: ReactNode }) => (
  <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-navy disabled:opacity-60">{busy ? 'Please wait…' : children}</button>);
