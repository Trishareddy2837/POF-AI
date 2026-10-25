import { supabase } from '../lib/supabase';
import { resumeDocumentSchema, type ResumeDocument } from '../schemas/resume';

const storageKey = (userId?: string) => `careerforge.resume-documents.${userId || 'guest'}`;
const parseLocal = (userId?: string): ResumeDocument[] => { try { return (JSON.parse(localStorage.getItem(storageKey(userId)) || '[]') as unknown[]).map(item => resumeDocumentSchema.parse(item)); } catch { return []; } };
export async function listResumeDocuments(userId?: string): Promise<ResumeDocument[]> {
  if (userId && supabase) { const { data, error } = await supabase.from('resume_documents').select('*').eq('user_id', userId).order('updated_at', { ascending: false }); if (error) throw new Error(error.message); return (data ?? []).map(row => resumeDocumentSchema.parse(row)) as ResumeDocument[]; }
  return parseLocal(userId);
}
export async function createResumeDocument(document: ResumeDocument, userId?: string): Promise<ResumeDocument[]> {
  const clean = resumeDocumentSchema.parse(document);
  if (userId && supabase) { const { error } = await supabase.from('resume_documents').insert({ user_id: userId, title: clean.title, template: clean.template, content: clean.content, parent_document_id: clean.parent_document_id ?? null }); if (error) throw new Error(error.message); return listResumeDocuments(userId); }
  const rows = parseLocal(userId); rows.unshift({ ...clean, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); localStorage.setItem(storageKey(userId), JSON.stringify(rows)); return rows;
}
export async function updateResumeDocument(document: ResumeDocument, userId?: string): Promise<ResumeDocument[]> {
  const clean = resumeDocumentSchema.parse(document); if (!clean.id) return createResumeDocument(clean, userId);
  if (userId && supabase) { const { error } = await supabase.from('resume_documents').update({ title: clean.title, template: clean.template, content: clean.content }).eq('user_id', userId).eq('id', clean.id); if (error) throw new Error(error.message); return listResumeDocuments(userId); }
  const rows = parseLocal(userId).map(row => row.id === clean.id ? { ...clean, updated_at: new Date().toISOString() } : row); localStorage.setItem(storageKey(userId), JSON.stringify(rows)); return rows;
}
export async function duplicateResumeDocument(document: ResumeDocument, userId?: string): Promise<ResumeDocument[]> {
  return createResumeDocument({ title: `${document.title} — Copy`, template: document.template, content: document.content, parent_document_id: document.id ?? null }, userId);
}
export async function deleteResumeDocument(id: string, userId?: string): Promise<ResumeDocument[]> {
  if (userId && supabase) { const { error } = await supabase.from('resume_documents').delete().eq('user_id', userId).eq('id', id); if (error) throw new Error(error.message); return listResumeDocuments(userId); }
  const rows = parseLocal(userId).filter(row => row.id !== id); localStorage.setItem(storageKey(userId), JSON.stringify(rows)); return rows;
}
