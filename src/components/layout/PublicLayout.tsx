import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X, Compass, ArrowUpRight } from 'lucide-react';
import { publicNav } from '../../routes/config';
const link = ({ isActive }: { isActive: boolean }) => `whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12px] font-medium ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`;
export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const items = publicNav.map(r => <NavLink key={r.path} to={r.path} end={r.path === '/'} className={link} onClick={() => setOpen(false)}>{r.label}</NavLink>);
  return <div className="flex min-h-screen flex-col">
    <header className="site-header sticky top-0 z-30 text-white"><div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 xl:px-10">
      <Link to="/" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight"><span className="brand-mark grid h-9 w-9 place-items-center rounded-xl"><Compass className="h-5 w-5 text-white" aria-hidden /></span><span className="hidden sm:block">POF-AI<span className="ml-2 hidden text-[10px] font-normal tracking-[.12em] text-white/55 lg:inline">PATH OF FUTURE</span></span></Link>
      <nav aria-label="Main" className="ml-auto hidden items-center gap-0.5 xl:flex">{items}</nav>
      <Link to="/register" className="hidden items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/30 hover:bg-red-400 sm:inline-flex">Get Started<ArrowUpRight size={14}/></Link>
      <button className="ml-auto rounded-xl border border-white/20 p-2 xl:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(o => !o)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
    </div>{open && <nav id="mobile-nav" aria-label="Mobile" className="animate-fade-up flex flex-col gap-1 border-t border-white/10 bg-[#111114] px-4 py-3 xl:hidden">{items}<Link to="/register" onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-red-500 px-4 py-2.5 text-center text-sm font-bold">Get Started</Link><Link to="/login" onClick={() => setOpen(false)} className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm">Account sign in · Publisher</Link></nav>}</header>
    <main className="flex-1"><Outlet /></main>
    <footer className="site-footer mt-12 py-10 text-sm text-slate-300"><div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[1.5fr_1fr_1fr]">
      <div><Link to="/" className="font-bold text-white">POF-AI: PATH OF FUTURE</Link><p className="mt-3 max-w-sm text-sm leading-6 text-white/65">A clearer path from your strengths to your next opportunity. Career suggestions are guidance and do not guarantee employment.</p><p className="mt-5 text-xs font-semibold tracking-[.16em] text-rose-300">MADE BY AASHIK &amp; TEAM</p></div>
      <div><h2 className="font-semibold text-white">Quick links</h2><div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2">{[['Home','/'],['Courses','/courses'],['Career options','/careers'],['Roadmaps','/roadmaps'],['Internships','/internships'],['Jobs','/jobs']].map(([label,path])=><Link key={path} to={path} className="text-white/65 hover:text-white">{label}</Link>)}</div></div>
      <div><h2 className="font-semibold text-white">Your next step</h2><p className="mt-3 text-white/65">Build a profile and discover a path that fits your interests.</p><Link to="/register" className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-[#17171b] hover:bg-rose-100">Get started</Link></div>
    </div><div className="mx-auto mt-8 max-w-6xl border-t border-white/10 px-5 pt-4 text-xs text-white/45">© {new Date().getFullYear()} POF-AI: PATH OF FUTURE</div></footer>
  </div>;
}
