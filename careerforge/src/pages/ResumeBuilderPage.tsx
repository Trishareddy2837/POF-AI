import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Copy, Download, Eye, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../app/AuthProvider';
import { useProfile } from '../app/ProfileProvider';
import { isSupabaseConfigured } from '../lib/supabase';
import { aiEnabled } from '../services/aiProvider';
import { deleteResumeDocument, duplicateResumeDocument, listResumeDocuments, createResumeDocument, updateResumeDocument } from '../services/resumeDocuments';
import { suggestResumeEdits, type ResumeSuggestion } from '../services/resumeAssistant';
import { parseResumeText } from '../services/resumeImport';
import { blankResumeContent, resumeContentSchema, type ResumeDocument, type ResumeTemplate } from '../schemas/resume';
import { listEntries } from '../services/profile';
import { uploadResume, validateResume } from '../services/profile';
import { Notice, PageShell } from '../components/common/ui';

const templateLabels: Record<ResumeTemplate, string> = { ats: 'Simple ATS-friendly', modern: 'Modern professional', technical: 'Technical / project-focused', compact: 'Compact one-page', graduate: 'Graduate / student' };
const emptyDoc = (content = blankResumeContent): ResumeDocument => ({ title: 'My Resume', template: 'ats', content: structuredClone(content) });
const scrubLine = (value: string) => value.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email removed]').replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone removed]');
async function extractResumeText(file:File){
  if(file.type==='application/pdf'){const [{getDocument,GlobalWorkerOptions},workerUrl]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);GlobalWorkerOptions.workerSrc=workerUrl.default;const pdf=await getDocument({data:await file.arrayBuffer()}).promise;const pages:string[]=[];for(let page=1;page<=pdf.numPages;page++){const content=await (await pdf.getPage(page)).getTextContent();pages.push(content.items.map(item=>'str'in item?item.str:'').filter(Boolean).join(' '));}return pages.join('\n').trim();}
  const {extractRawText}=await import('mammoth/mammoth.browser.js');
  return (await extractRawText({arrayBuffer:await file.arrayBuffer()})).value.trim();
}

export function ResumeBuilderPage() {
  const { user } = useAuth(); const { data: profile, reload: reloadProfile } = useProfile();
  const [documents, setDocuments] = useState<ResumeDocument[]>([]); const [doc, setDoc] = useState<ResumeDocument>(() => emptyDoc()); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [dirty, setDirty] = useState(false); const [jobDescription, setJobDescription] = useState(''); const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>([]); const [assistantBusy, setAssistantBusy] = useState(false); const [assistantMessage, setAssistantMessage] = useState(''); const [extracting,setExtracting]=useState(false); const [extractedText,setExtractedText]=useState(''); const [resumeAiConsent,setResumeAiConsent]=useState(false); const [templateReference,setTemplateReference] = useState<{name:string;url:string;image:boolean}|null>(null);
  useEffect(() => { let active = true; setLoading(true); void listResumeDocuments(user?.id).then(rows => { if (!active) return; setDocuments(rows); setDoc(rows[0] ?? emptyDoc()); setDirty(false); }).catch(() => { if (active) setError('Could not load your resume documents. Check your connection and database setup.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [user?.id]);
  const updateDoc = (updater: (current: ResumeDocument) => ResumeDocument) => { setDoc(current => updater(current)); setDirty(true); setMessage(''); };
  const activeId = doc.id ?? '';
  const profilesNotice = user && !isSupabaseConfigured ? 'Supabase is not configured. Documents are saved only in this browser.' : !user ? 'You can build a resume without an account; drafts stay in this browser. Sign in to save them to your private account.' : 'Your resume documents are private to your signed-in account.';

  async function readResume(file?:File){
    if(!file)return;const invalid=validateResume(file);if(invalid){setError(invalid);return;}setError('');setMessage('');setExtracting(true);setExtractedText('');
    try{const text=(await extractResumeText(file)).slice(0,30000);if(!text.trim())throw new Error('No selectable text was found. Scanned-image PDFs need OCR or manual entry.');setExtractedText(text);setMessage('Resume text extracted in this browser. Review it below before importing.');
      if(user&&isSupabaseConfigured){try{await uploadResume(user.id,file);await reloadProfile();setMessage('Resume text extracted and the original file saved privately to your account.');}catch{setError('Text was extracted locally, but private file storage failed. Apply migration 0001 and check the resume storage bucket.');}}
    }catch(e){setError(e instanceof Error?e.message:'This resume could not be read. Try a text-based PDF or DOCX file.');}finally{setExtracting(false);}
  }
  function importExtracted(){
    const parsed = parseResumeText(extractedText);
    updateDoc(current=>{const sections=current.content.sections.map(item=>{const content=parsed.sectionContents[item.id]??'';return content?{...item,content,visible:true}:item;});const raw={id:'imported-source',title:'Imported resume text · review',content:extractedText,visible:false};if(!sections.some(item=>item.id===raw.id))sections.push(raw);return{...current,content:{...current.content,fullName:current.content.fullName||parsed.fullName,email:current.content.email||parsed.email,phone:current.content.phone||parsed.phone,links:current.content.links||parsed.links,summary:parsed.summary||current.content.summary,sections}};});setMessage('Extracted text was added to editable resume sections. Review every field before saving.');
  }

  async function save() {
    const checked = resumeContentSchema.safeParse(doc.content); if (!checked.success) { setError('One of the resume fields is too long. Shorten it and save again.'); return; }
    if (doc.content.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.content.email)) { setError('Enter a valid email address or leave the email field blank.'); return; }
    const invalidLink = doc.content.links.split(/\n|,/).map(value => value.trim()).filter(Boolean).find(value => !/^https:\/\//i.test(value));
    if (invalidLink) { setError('Resume links should begin with https://.'); return; }
    setSaving(true); setError(''); setMessage('');
    try { const rows = doc.id ? await updateResumeDocument(doc, user?.id) : await createResumeDocument(doc, user?.id); setDocuments(rows); const current = doc.id ? rows.find(row => row.id === doc.id) : rows[0]; if (current) setDoc(current); setDirty(false); setMessage('Resume draft saved.'); }
    catch { setError('Could not save the resume. Apply migration 0008 and retry.'); }
    finally { setSaving(false); }
  }
  async function createNew() {
    if (dirty && !window.confirm('Discard unsaved changes and start a new resume?')) return;
    setDoc(emptyDoc()); setDirty(false); setSuggestions([]); setMessage('New blank resume ready.');
  }
  async function duplicate() {
    if (!doc.id) { setError('Save this resume before duplicating it.'); return; }
    try { const rows = await duplicateResumeDocument(doc, user?.id); setDocuments(rows); setDoc(rows[0]); setDirty(false); setMessage('A separate resume copy was created; the original is unchanged.'); }
    catch { setError('Could not duplicate this resume.'); }
  }
  async function remove() {
    if (!doc.id || !window.confirm(`Delete “${doc.title}”? This cannot be undone.`)) return;
    try { const rows = await deleteResumeDocument(doc.id, user?.id); setDocuments(rows); setDoc(rows[0] ?? emptyDoc()); setDirty(false); setMessage('Resume deleted.'); }
    catch { setError('Could not delete this resume.'); }
  }
  async function importProfile() {
    const content = structuredClone(doc.content);
    content.fullName = profile.fullName || user?.user_metadata?.full_name || content.fullName;
    content.email = user?.email || content.email; content.phone = profile.phone || content.phone; content.location = profile.city || content.location;
    const education = [profile.degree, profile.specialization, profile.institution, profile.graduationYear].filter(Boolean).join(' · ');
    content.sections = content.sections.map(section => {
      if (section.id === 'education' && education) return { ...section, content: [section.content, education].filter(Boolean).join('\n') };
      if (section.id === 'technical-skills' && profile.skills?.length) return { ...section, content: [section.content, profile.skills.join(', ')].filter(Boolean).join('\n') };
      return section;
    });
    if (user && isSupabaseConfigured) {
      try {
        const [projects, certifications, experiences] = await Promise.all([listEntries('projects'), listEntries('certifications'), listEntries('experiences')]);
        content.sections = content.sections.map(section => {
          const rows = section.id === 'projects' ? projects.map(row => [row.title, row.description, row.url].filter(Boolean).join(' · ')) :
            section.id === 'certifications' ? certifications.map(row => [row.title, row.issuer, row.issued_on].filter(Boolean).join(' · ')) :
              section.id === 'experience' ? experiences.filter(row => row.kind === 'job').map(row => [row.title, row.organization, row.description].filter(Boolean).join(' · ')) :
                section.id === 'internships' ? experiences.filter(row => row.kind === 'internship').map(row => [row.title, row.organization, row.description].filter(Boolean).join(' · ')) :
                  section.id === 'achievements' ? experiences.filter(row => row.kind === 'achievement').map(row => [row.title, row.organization, row.description].filter(Boolean).join(' · ')) :
                    section.id === 'competitions' ? experiences.filter(row => row.kind === 'competition').map(row => [row.title, row.organization, row.description].filter(Boolean).join(' · ')) : [];
          return rows.length ? { ...section, content: [...section.content.split('\n').filter(Boolean), ...rows].join('\n'), visible: true } : section;
        });
      } catch { setError('Some profile entries could not be imported. Basic profile details were still added.'); }
    }
    updateDoc(current => ({ ...current, content })); setMessage('Imported information already present in your profile. Please review each section for accuracy.');
  }
  async function requestSuggestions() {
    if (!aiEnabled) { setAssistantMessage('AI assistance is unavailable because real AI is not enabled in this deployment. Manual editing still works.'); return; }
    if (!user) { setAssistantMessage('Sign in to use AI suggestions. Resume editing and printing are available as a guest.'); return; }
    const sectionContent = (id: string) => doc.content.sections.find(section => section.id === id)?.content ?? '';
    const experience = ['experience', 'internships'].flatMap(id => sectionContent(id).split('\n').map(scrubLine).filter(Boolean));
    const projects = sectionContent('projects').split('\n').map(scrubLine).filter(Boolean);
    if (!doc.content.summary.trim() && !experience.length && !projects.length) { setAssistantMessage('Add a summary, experience or project first so the assistant has evidence to improve.'); return; }
    setAssistantBusy(true); setAssistantMessage(''); setSuggestions([]);
    try { const result = await suggestResumeEdits({ summary: scrubLine(doc.content.summary), experience, projects }, jobDescription); setSuggestions(result); setAssistantMessage(result.length ? 'Suggestions are separate from your resume. Review each one; nothing has been applied.' : 'No safe edits were suggested from the supplied evidence.'); }
    catch (e) { setAssistantMessage(e instanceof Error ? e.message : 'AI assistance could not complete this request.'); }
    finally { setAssistantBusy(false); }
  }
  function applySuggestion(suggestion: ResumeSuggestion) {
    updateDoc(current => {
      if (suggestion.field === 'summary') return { ...current, content: { ...current.content, summary: current.content.summary.replace(suggestion.original, suggestion.proposed) } };
      const sectionId = suggestion.field; const sections = current.content.sections.map(section => section.id === sectionId ? { ...section, content: section.content.replace(suggestion.original, suggestion.proposed) } : section);
      return { ...current, content: { ...current.content, sections } };
    }); setSuggestions(current => current.filter(item => item !== suggestion)); setAssistantMessage('Suggestion accepted in the editor. Save it when ready.');
  }
  function applyAllSuggestions(){const pending=[...suggestions];pending.forEach(applySuggestion);setSuggestions([]);setAssistantMessage('All suggested edits were applied to the draft. Review them and save when ready.');}
  async function saveTailoredCopy() {
    if (!jobDescription.trim()) { setAssistantMessage('Paste a job description before creating a tailored copy.'); return; }
    if (!doc.id) { setAssistantMessage('Save the original resume first to create a separate tailored version.'); return; }
    try { const rows = await createResumeDocument({ ...doc, id: undefined, title: `${doc.title} — tailored`, parent_document_id: doc.id }, user?.id); setDocuments(rows); setDoc(rows[0]); setDirty(false); setMessage('A separate tailored resume version was saved. The source resume is preserved.'); }
    catch { setError('Could not save the tailored version.'); }
  }
  function moveSection(index: number, delta: number) { const target = index + delta; if (target < 0 || target >= doc.content.sections.length) return; updateDoc(current => { const sections = [...current.content.sections]; [sections[index], sections[target]] = [sections[target], sections[index]]; return { ...current, content: { ...current.content, sections } }; }); }
  function addSection() { updateDoc(current => ({ ...current, content: { ...current.content, sections: [...current.content.sections, { id: `custom-${Date.now()}`, title: 'Additional section', content: '', visible: true }] } })); }

  const fields = [ ['fullName','Full name'], ['headline','Target role / headline'], ['email','Email'], ['phone','Phone'], ['location','Location'] ] as const;
  const previewSections = useMemo(() => doc.content.sections.filter(section => section.visible && section.content.trim()), [doc.content.sections]);
  return <PageShell title="Resume studio" className="resume-page">
    <Notice>{profilesNotice} Resume files are read locally in your browser. A signed-in original can be saved privately; files are not sent to AI automatically. Review every extracted item. PDF export uses your browser’s print-to-PDF option.</Notice>
    <div className="resume-toolbar mb-5 flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={() => void createNew()} className="rounded-lg border px-3 py-2 text-sm font-semibold"><Plus size={15} className="mr-1 inline" />New blank</button>
      <button type="button" onClick={() => void importProfile()} className="rounded-lg border px-3 py-2 text-sm font-semibold">Import profile details</button>
      <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy">{saving ? 'Saving…' : 'Save draft'}</button>
      <button type="button" onClick={() => window.print()} className="rounded-lg border px-3 py-2 text-sm font-semibold"><Download size={15} className="mr-1 inline" />Print / Save PDF</button>
      <button type="button" onClick={() => void duplicate()} className="rounded-lg border px-3 py-2 text-sm font-semibold" disabled={!doc.id}><Copy size={15} className="mr-1 inline" />Duplicate</button>
      <button type="button" onClick={() => void remove()} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" disabled={!doc.id}><Trash2 size={15} className="mr-1 inline" />Delete</button>
      <span role="status" className="ml-auto text-xs text-slate-600">{dirty ? 'Unsaved edits' : doc.id ? 'Saved draft' : 'New draft'}</span>
    </div>
    <section className="mb-5 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm print:hidden"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-xl font-semibold">Import an existing resume</h2><p className="mt-1 text-sm text-slate-600">Upload a text-based PDF or Word file. We extract its text on this device, then you choose what to add to your draft.</p></div><label className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600">{extracting?'Reading…':'Choose PDF or DOCX'}<input aria-label="Upload resume file" type="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={extracting} onChange={event=>{void readResume(event.target.files?.[0]);event.currentTarget.value='';}} className="sr-only"/></label></div>
      {extractedText&&<div className="mt-4"><label htmlFor="extracted-resume" className="block text-xs font-bold uppercase tracking-wider text-slate-500">Extracted text · review before importing</label><textarea id="extracted-resume" rows={6} value={extractedText} onChange={event=>setExtractedText(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2 text-xs leading-5"/><button type="button" onClick={importExtracted} className="mt-3 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Import into resume draft</button><p className="mt-2 text-xs text-slate-500">Scanned PDFs without selectable text need OCR and are not extracted automatically.</p></div>}
    </section>
    {loading && <p role="status">Loading saved resumes…</p>}{error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mb-3 text-sm text-teal-800">{message}</p>}
    {documents.length > 0 && <label className="mb-4 block max-w-lg text-sm font-semibold print:hidden">Saved resumes<select aria-label="Saved resumes" value={activeId} onChange={event => { const selected = documents.find(item => item.id === event.target.value); if (dirty && !window.confirm('Discard unsaved changes and switch resumes?')) return; if (selected) { setDoc(selected); setDirty(false); setSuggestions([]); } }} className="mt-1 block w-full rounded-lg border px-3 py-2">{documents.map(item => <option key={item.id} value={item.id}>{item.title}{item.parent_document_id ? ' · tailored copy' : ''}</option>)}</select></label>}
    <div className="resume-document-layout grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,.95fr)]">
      <section className="resume-editor space-y-4 print:hidden" aria-label="Resume editing form">
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-serif text-xl font-semibold">Resume identity</h2><label className="mt-3 block text-sm font-semibold">Document name<input aria-label="Document name" value={doc.title} onChange={event => updateDoc(current => ({ ...current, title: event.target.value }))} className="mt-1 block w-full rounded-lg border px-3 py-2 font-normal" /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{fields.map(([field,title]) => <label key={field} className="text-sm font-semibold">{title}<input aria-label={title} value={doc.content[field]} onChange={event => updateDoc(current => ({ ...current, content: { ...current.content, [field]: event.target.value } }))} className="mt-1 block w-full rounded-lg border px-3 py-2 font-normal" /></label>)}</div>
          <label className="mt-3 block text-sm font-semibold">Professional summary<textarea aria-label="Professional summary" rows={4} maxLength={2500} value={doc.content.summary} onChange={event => updateDoc(current => ({ ...current, content: { ...current.content, summary: event.target.value } }))} className="mt-1 block w-full rounded-lg border px-3 py-2 font-normal" placeholder="Write only claims you can support with your real experience." /></label>
          <label className="mt-3 block text-sm font-semibold">Relevant links<textarea aria-label="Relevant links" rows={2} value={doc.content.links} onChange={event => updateDoc(current => ({ ...current, content: { ...current.content, links: event.target.value } }))} className="mt-1 block w-full rounded-lg border px-3 py-2 font-normal" placeholder="https://github.com/… · one URL per line" /></label>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-serif text-xl font-semibold">Resume sections</h2><button onClick={addSection} type="button" className="text-sm font-semibold text-teal-800 underline">Add section</button></div><p className="mb-3 mt-1 text-xs text-slate-500">One item per line. Reorder with arrows; hide sections you do not need.</p>
          {doc.content.sections.map((section,index) => <div key={section.id} className="mb-3 rounded-xl border p-3"><div className="flex items-center gap-2"><input aria-label={`${section.title} visible`} type="checkbox" checked={section.visible} onChange={event => updateDoc(current => ({ ...current, content: { ...current.content, sections: current.content.sections.map(s => s.id === section.id ? { ...s, visible: event.target.checked } : s) } }))} /><input aria-label={`${section.title} section title`} value={section.title} onChange={event => updateDoc(current => ({ ...current, content: { ...current.content, sections: current.content.sections.map(s => s.id === section.id ? { ...s, title: event.target.value } : s) } }))} className="min-w-0 flex-1 rounded border px-2 py-1 text-sm font-semibold" /><button type="button" aria-label={`Move ${section.title} up`} disabled={index === 0} onClick={() => moveSection(index,-1)} className="rounded border p-1 disabled:opacity-40"><ArrowUp size={15} /></button><button type="button" aria-label={`Move ${section.title} down`} disabled={index === doc.content.sections.length-1} onClick={() => moveSection(index,1)} className="rounded border p-1 disabled:opacity-40"><ArrowDown size={15} /></button></div><textarea aria-label={section.title} rows={3} value={section.content} onChange={event => updateDoc(current => ({ ...current, content: { ...current.content, sections: current.content.sections.map(s => s.id === section.id ? { ...s, content: event.target.value } : s) } }))} className="mt-2 block w-full rounded-lg border px-3 py-2 text-sm" placeholder="Add accurate details, dates, tools and evidence." /></div>)}
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-serif text-xl font-semibold">Choose a template</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{(Object.entries(templateLabels) as [ResumeTemplate,string][]).map(([key,title]) => <label key={key} className={`cursor-pointer rounded-xl border p-3 text-sm ${doc.template === key ? 'border-teal-600 bg-teal-50' : ''}`}><input type="radio" name="resume-template" checked={doc.template === key} onChange={() => updateDoc(current => ({ ...current, template: key }))} className="mr-2" />{title}</label>)}</div><p className="mt-3 text-xs text-slate-500">Compact layout follows common career-center guidance: simple formatting, readable type, and concise content. Long resumes may still print to more than one page.</p><label className="mt-4 block text-sm font-semibold">Optional template reference<input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf" className="mt-2 block w-full text-xs" onChange={event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>8*1024*1024){setError('Template reference must be under 8 MB.');event.currentTarget.value='';return;}const url=URL.createObjectURL(file);setTemplateReference(previous=>{if(previous)URL.revokeObjectURL(previous.url);return{name:file.name,url,image:file.type.startsWith('image/')};});setMessage('Template reference is available in this browser only; it is not sent to the AI provider.');event.currentTarget.value='';}} /></label>{templateReference&&<div className="mt-3 rounded-xl border p-3 text-sm"><p className="font-semibold">{templateReference.name}</p>{templateReference.image?<img src={templateReference.url} alt="Uploaded resume template reference" className="mt-2 max-h-56 rounded-lg object-contain"/>:<a href={templateReference.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-red-700 underline">Open template reference</a>}<p className="mt-2 text-xs text-slate-500">Reference preview only. Choose one of the five layouts above for the generated resume.</p></div>}</div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4"><h2 className="font-serif text-xl font-semibold"><Sparkles className="mr-1 inline text-red-700" size={19} />AI resume assistant</h2><p className="mt-1 text-sm text-slate-700">Get truthful, job-description-aware suggestions based on your resume text. Review them before they are added to your draft.</p>{!aiEnabled && <p className="mt-2 text-sm text-amber-800">AI is unavailable in this deployment; manual editing and export remain available.</p>}
          {!aiEnabled && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">AI suggestions are disabled in this deployment. The site owner must set <code>VITE_AI_ENABLED=true</code>, configure the Supabase Edge Function secrets <code>AI_API_KEY</code> and <code>AI_MODEL</code>, then redeploy the site and function.</p>}
          {aiEnabled && !user && <p role="status" className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">Sign in to use AI suggestions. Resume editing and printing are available as a guest, but the AI service requires an authenticated account. <Link to="/login" className="font-semibold underline">Sign in</Link></p>}
          <label className="mt-3 block text-sm font-semibold">Optional job description for tailoring<textarea aria-label="Job description" rows={4} maxLength={6000} value={jobDescription} onChange={event => setJobDescription(event.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2 font-normal" /></label><label className="mt-3 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={resumeAiConsent} onChange={event=>setResumeAiConsent(event.target.checked)} className="mt-0.5"/>When I request suggestions, send the resume text and job description to the configured AI provider. Contact details are removed first.</label><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!aiEnabled || !user || assistantBusy || !resumeAiConsent} onClick={() => void requestSuggestions()} className="rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{assistantBusy ? 'Reviewing…' : 'Suggest improvements'}</button><button type="button" disabled={!doc.id || !jobDescription.trim()} onClick={() => void saveTailoredCopy()} className="rounded-full border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Save as separate tailored version</button></div>
          {assistantMessage && <p role="status" className="mt-2 text-sm text-slate-700">{assistantMessage}</p>}{suggestions.length>1&&<button type="button" onClick={applyAllSuggestions} className="mt-3 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-800">Apply all suggestions to draft</button>}{suggestions.map((suggestion,index) => <article key={`${suggestion.field}-${index}`} className="mt-3 rounded-xl border bg-white p-3"><p className="text-xs font-bold uppercase text-teal-800">{suggestion.field} · proposed edit</p><p className="mt-1 text-xs text-slate-500">Current: {suggestion.original}</p><p className="mt-1 text-sm">{suggestion.proposed}</p><p className="mt-1 text-xs text-slate-600">{suggestion.reason}</p><button type="button" onClick={() => applySuggestion(suggestion)} className="mt-2 rounded border px-2.5 py-1 text-xs font-semibold">Accept this suggestion</button></article>)}</div>
      </section>
      <section className="resume-preview-column" aria-label="Live resume preview"><div className="mb-2 flex items-center justify-between print:hidden"><h2 className="inline-flex items-center gap-2 font-serif text-xl font-semibold"><Eye size={18} /> Live preview</h2><span className="text-xs text-slate-500">{templateLabels[doc.template]}</span></div>
        <article className={`resume-preview resume-template resume-${doc.template} min-h-[740px] rounded-2xl border border-slate-200 bg-white p-8 shadow-lg print:min-h-0 print:border-0 print:p-0 print:shadow-none`}>
          <header className="resume-heading border-b-2 border-slate-800 pb-4"><h1 className="text-3xl font-bold">{doc.content.fullName || <span className="resume-placeholder print:hidden">Your Name</span>}</h1>{doc.content.headline ? <p className="mt-1 text-lg">{doc.content.headline}</p> : <p className="resume-placeholder mt-1 text-lg print:hidden">Add your target role</p>}{[doc.content.email,doc.content.phone,doc.content.location].some(Boolean) ? <p className="mt-2 text-sm text-slate-600">{[doc.content.email,doc.content.phone,doc.content.location].filter(Boolean).join(' · ')}</p> : <p className="resume-placeholder mt-2 text-sm text-slate-600 print:hidden">Add contact details</p>}{doc.content.links.split(/\n|,/).map(link => link.trim()).filter(link => /^https:\/\//i.test(link)).map(link => <a key={link} href={link} className="mr-3 text-xs text-teal-800 underline">{link}</a>)}</header>
          {doc.content.summary.trim() && <section className="resume-section mt-5"><h2>Professional Summary</h2><p>{doc.content.summary}</p></section>}
          {previewSections.map(section => <section key={section.id} className="resume-section mt-5"><h2>{section.title}</h2><div>{section.content.split('\n').map(line => line.trim()).filter(Boolean).map((line,index) => <p key={`${section.id}-${index}`}>{line}</p>)}</div></section>)}
        </article>
      </section>
    </div>
  </PageShell>;
}
