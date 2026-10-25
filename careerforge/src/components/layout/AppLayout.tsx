import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Compass, LogOut, Menu, X, UserRound, ChevronDown, LayoutDashboard, FileText, BrainCircuit, BriefcaseBusiness, BookOpen, Map, Settings, ChartNoAxesCombined, Code2 } from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { useProfile } from '../../app/ProfileProvider';
import { authService } from '../../services/auth';
const menu = [
  { path:'/dashboard', label:'Dashboard', icon:LayoutDashboard }, { path:'/profile', label:'My profile', icon:FileText },
  { path:'/career-analysis', label:'AI career analysis', icon:BrainCircuit }, { path:'/careers', label:'Career catalogue', icon:BriefcaseBusiness },
  { path:'/roadmaps', label:'My roadmap', icon:Map }, { path:'/learning-resources', label:'Learning resources', icon:BookOpen },
  { path:'/courses', label:'Courses', icon:BookOpen }, { path:'/internships', label:'Internships', icon:BriefcaseBusiness },
  { path:'/hackathons', label:'Hackathons', icon:Code2 }, { path:'/jobs', label:'Jobs', icon:BriefcaseBusiness },
  { path:'/resume-builder', label:'Resume studio', icon:FileText }, { path:'/challenges', label:'Roadmap coding practice', icon:Code2 },
  { path:'/analytics', label:'Learning analytics', icon:ChartNoAxesCombined }, { path:'/settings', label:'Settings', icon:Settings },
];
export function AppLayout() {
  const { user } = useAuth(); const { data, completion } = useProfile(); const nav = useNavigate(); const [open, setOpen] = useState(false);
  const name = data.fullName || (user?.user_metadata?.full_name as string | undefined) || user?.email || 'Student';
  const initials = name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const close = () => setOpen(false);
  return <div className="flex min-h-screen flex-col">
    <header className="site-header sticky top-0 z-30 text-white"><div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 xl:px-10">
      <div className="relative"><button aria-label="Open profile navigation" aria-expanded={open} aria-controls="profile-navigation" onClick={()=>setOpen(value=>!value)} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 pr-3 hover:bg-white/10"><span className="brand-mark grid h-9 w-9 place-items-center rounded-full text-xs font-bold">{initials||<UserRound size={18}/>}</span><span className="hidden max-w-28 truncate text-xs font-semibold sm:block">{name.split(' ')[0]}</span><ChevronDown size={14}/></button>
        {open&&<nav id="profile-navigation" aria-label="Your account" className="absolute left-0 top-12 z-40 max-h-[75vh] w-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#19171b] p-2 shadow-2xl shadow-black/50 animate-fade-up"><div className="mb-2 rounded-xl bg-white/5 p-3"><p className="truncate text-sm font-semibold text-white">{name}</p><p className="truncate text-xs text-white/55">Profile {completion.percent}% complete</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-red-400" style={{width:`${completion.percent}%`}}/></div></div>
          {menu.map(({path,label,icon:Icon})=><NavLink key={path} to={path} onClick={close} className={({isActive})=>`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${isActive?'bg-red-500/15 text-rose-200':'text-white/75 hover:bg-white/8 hover:text-white'}`}><Icon size={16}/>{label}</NavLink>)}
          <Link to="/publisher" onClick={close} className="mt-1 block rounded-lg border-t border-white/10 px-3 py-2.5 text-xs text-white/55 hover:text-white">Publisher workspace sign in</Link>
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-200 hover:bg-white/8" onClick={async()=>{await authService.signOut();close();nav('/',{replace:true});}}><LogOut size={16}/>Sign out</button>
        </nav>}</div>
      <Link to="/" className="flex items-center gap-2 font-bold tracking-tight"><span className="brand-mark grid h-8 w-8 place-items-center rounded-lg"><Compass className="h-4 w-4 text-white"/></span><span>POF-AI <span className="hidden font-normal text-white/55 sm:inline">· PATH OF FUTURE</span></span></Link>
      <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">{[['Home','/'],['Courses','/courses'],['Internships','/internships'],['Jobs','/jobs'],['Hackathons','/hackathons'],['Resume builder','/resume-builder'],['Careers','/careers']].map(([label,path])=><NavLink key={path} to={path} className={({isActive})=>`rounded-full px-3 py-2 text-xs ${isActive?'bg-white/15 text-white':'text-white/65 hover:bg-white/10 hover:text-white'}`}>{label}</NavLink>)}</nav>
      <button className="ml-auto rounded-xl border border-white/20 p-2 lg:hidden" aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(value=>!value)}>{open?<X size={18}/>:<Menu size={18}/>}</button>
    </div></header>
    {open&&<nav aria-label="Mobile main navigation" className="grid grid-cols-2 gap-2 bg-[#171619] p-4 text-white lg:hidden">{[['Home','/'],['Courses','/courses'],['Internships','/internships'],['Jobs','/jobs'],['Hackathons','/hackathons'],['Resume studio','/resume-builder'],['Career options','/careers'],['Learning analytics','/analytics']].map(([label,path])=><Link key={path} to={path} onClick={close} className="rounded-lg border border-white/10 px-3 py-2 text-sm">{label}</Link>)}</nav>}
    <main className="min-w-0 flex-1"><Outlet/></main>
  </div>;
}
