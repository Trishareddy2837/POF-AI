import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
interface Base { label: string; error?: string }
const cls = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
const wrap = (id: string, label: string, error: string | undefined, control: JSX.Element) => (
  <div className="mb-3"><label htmlFor={id} className="block text-sm font-semibold">{label}</label>{control}
    {error && <p id={`${id}-e`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}</div>);
export const TextField = forwardRef<HTMLInputElement, Base & InputHTMLAttributes<HTMLInputElement>>(({ label, error, ...r }, ref) => {
  const id = r.id ?? r.name ?? label;
  return wrap(id, label, error, <input ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-e` : undefined} className={cls} {...r} />);
});
TextField.displayName = 'TextField';
export const TextAreaField = forwardRef<HTMLTextAreaElement, Base & TextareaHTMLAttributes<HTMLTextAreaElement>>(({ label, error, ...r }, ref) => {
  const id = r.id ?? r.name ?? label;
  return wrap(id, label, error, <textarea ref={ref} id={id} rows={3} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-e` : undefined} className={cls} {...r} />);
});
TextAreaField.displayName = 'TextAreaField';
export const SelectField = forwardRef<HTMLSelectElement, Base & SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }>(({ label, error, options, ...r }, ref) => {
  const id = r.id ?? r.name ?? label;
  return wrap(id, label, error, <select ref={ref} id={id} className={cls} {...r}>{options.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}</select>);
});
SelectField.displayName = 'SelectField';
