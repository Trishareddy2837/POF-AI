import { useState, type ChangeEvent } from 'react';
import { useAuth } from '../../app/AuthProvider';
import { useProfile } from '../../app/ProfileProvider';
import { removeResume, resumeUrl, uploadResume, validateResume } from '../../services/profile';
import { errMsg } from '../../lib/utils';
export function ResumePanel() {
  const { user } = useAuth(); const { resume, reload } = useProfile();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f || !user) return;
    const bad = validateResume(f); if (bad) { setMsg({ ok: false, text: bad }); return; }
    setBusy(true); try { await uploadResume(user.id, f); await reload(); setMsg({ ok: true, text: 'Resume uploaded.' }); } catch (x) { setMsg({ ok: false, text: errMsg(x) }); } finally { setBusy(false); }
  };
  const open = async () => { if (!resume) return; try { window.open(await resumeUrl(resume.storage_path), '_blank', 'noopener'); } catch (x) { setMsg({ ok: false, text: errMsg(x) }); } };
  const del = async () => { if (!user || !resume) return; try { await removeResume(user.id, resume.storage_path); await reload(); setMsg({ ok: true, text: 'Resume removed.' }); } catch (x) { setMsg({ ok: false, text: errMsg(x) }); } };
  return (<section aria-label="Resume"><h3 className="mb-2 font-serif text-lg font-semibold">Resume</h3>
    {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mb-2 text-sm ${msg.ok ? 'text-teal-800' : 'text-red-700'}`}>{msg.text}</p>}
    {resume ? <div className="mb-3 rounded-lg border bg-white p-3 text-sm"><p><b>{resume.file_name}</b> · {(resume.size_bytes / 1024).toFixed(0)} KB · uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</p>
      <p className="mt-2 flex gap-3"><button type="button" className="underline" onClick={open}>View (private link, expires in 60 s)</button><button type="button" className="text-red-700 underline" onClick={del}>Remove</button></p></div> : <p className="mb-3 text-sm text-slate-600">No resume uploaded.</p>}
    <label className="block text-sm font-semibold" htmlFor="resume-file">{resume ? 'Replace resume' : 'Upload resume'} (PDF or DOCX, up to 5 MB)</label>
    <input id="resume-file" type="file" disabled={busy} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={pick} className="mt-1 text-sm" />
    <p className="mt-2 text-xs text-slate-500">Files are stored privately; only you can open them.</p></section>);
}
