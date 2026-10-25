import { supabase } from '../lib/supabase';
import { aiError, codeFromBody, mapStatus } from '../lib/aiErrors';
import { generateDemo } from '../lib/demoProvider';
import { aiResponseSchema, type AiRequest, type AiResponse } from '../schemas/analysis';
export type ProviderMode = 'real' | 'demo';
/** Real AI is attempted only when explicitly enabled. Otherwise the app is in demo mode, and the UI says so. */
export const aiEnabled = import.meta.env.VITE_AI_ENABLED === 'true';
type Ctx = { status?: number; clone?: () => { json: () => Promise<{ detail?: string; error?: string }> } };
export async function invokeCareerAnalysis(body: Record<string, unknown>): Promise<unknown> {
  if (!supabase) throw aiError('not_configured');
  const { data, error } = await supabase.functions.invoke('career-analysis', { body });
  if (error) {
    const ctx = (error as { context?: Ctx }).context; let detail: string | undefined; let errorCode: string | undefined;
    try { const parsed = await ctx?.clone?.().json(); detail = parsed?.detail; errorCode = parsed?.error; } catch { /* body was not JSON */ }
    throw aiError(codeFromBody(errorCode) ?? mapStatus(ctx?.status), detail);
  }
  return data;
}
export async function generateNarrative(req: AiRequest, mode: ProviderMode): Promise<AiResponse> {
  if (mode === 'demo') return generateDemo(req);
  const data = await invokeCareerAnalysis(req);
  const parsed = aiResponseSchema.safeParse((data as { data?: unknown } | null)?.data);
  if (!parsed.success) {
    // Report only schema paths/reasons; never include the provider's potentially sensitive raw response.
    const detail = parsed.error.issues.slice(0, 3).map(issue => `${issue.path.join('.') || 'response'}: ${issue.message}`).join('; ');
    throw aiError('invalid_response', detail);
  }
  return parsed.data;
}
