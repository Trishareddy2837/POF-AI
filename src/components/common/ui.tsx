import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Item } from '../../data/sample';
export const DemoBadge = () => <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Sample data</span>;
export const Notice = ({ children }: { children: ReactNode }) => <div role="note" className="notice-soft mb-4 rounded-xl px-4 py-3 text-sm">{children}</div>;
export const Tags = ({ items }: { items: string[] }) => <div className="flex flex-wrap gap-1">{items.map(t => <span key={t} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">{t}</span>)}</div>;
export const ItemCard = ({ item }: { item: Item }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <DemoBadge /><h3 className="font-serif text-lg font-semibold">{item.title}</h3>
    <p className="mb-2 text-sm text-slate-600">{item.meta}</p><Tags items={item.tags} />
    <ul className="mt-2 space-y-0.5 text-sm text-slate-600">{item.lines.map(l => <li key={l}>{l}</li>)}</ul>
  </article>
);
export const ItemGrid = ({ items }: { items: Item[] }) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(i => <ItemCard key={i.title} item={i} />)}</div>;
export const Section = ({ title, to, linkLabel, alt, children }: { title: string; to?: string; linkLabel?: string; alt?: boolean; children: ReactNode }) => (
  <section className={`py-14 ${alt ? 'border-y border-slate-200 bg-white' : ''}`}>
    <div className="mx-auto max-w-6xl px-5">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {to && <Link to={to} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-red-300 hover:bg-rose-50">{linkLabel}</Link>}</div>{children}
    </div>
  </section>
);
const pageVisuals = [
  ['course', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1500&q=80'],
  ['career', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1500&q=80'],
  ['roadmap', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1500&q=80'],
  ['resume', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1500&q=80'],
  ['job', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1500&q=80'],
  ['internship', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1500&q=80'],
  ['hackathon', 'https://images.unsplash.com/photo-1517048676732-d65bc937f902?auto=format&fit=crop&w=1500&q=80'],
  ['profile', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1500&q=80'],
  ['dashboard', 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1500&q=80'],
];
const pageImage = (title: string) => pageVisuals.find(([key]) => title.toLowerCase().includes(key))?.[1] ?? pageVisuals[1][1];
export const PageShell = ({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) => <div className={`page-shell mx-auto max-w-6xl px-5 py-7 sm:py-10 ${className}`}><header className="page-hero animate-fade-up mb-7"><img src={pageImage(title)} alt="" loading="lazy" /><div className="page-hero-shade"/><div className="page-hero-content"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-rose-200">POF-AI: PATH OF FUTURE</p><h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1></div></header><div className="page-content">{children}</div></div>;
