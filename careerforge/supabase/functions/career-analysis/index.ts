// Supabase Edge Function (Deno). Holds the AI key server-side. Deploy: supabase functions deploy career-analysis --use-api
// Secrets: AI_API_KEY, AI_MODEL, AI_BASE_URL (any OpenAI-compatible chat API), optional AI_FALLBACK_MODEL (tried if the main model is overloaded).
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const SYSTEM = `You are a careful career-guidance writer for students. Use ONLY the facts in the user message. Never invent skills, qualifications or experience.
Never promise jobs or outcomes. Fit scores are approximate profile-match indicators supplied to you; do not change or restate them as probabilities.
Only discuss careers whose careerId appears in "matches". If most profile fields are empty (all fitScore values are 0), the student is unsure: say there is not enough information to match, do not claim any fit, and give simple advice for exploring the listed careers. Explain fit using profile evidence and the supplied rule score; never describe a fit score as job probability. Make suggestions concrete, ordered, beginner-accessible where appropriate, and connect each suggestion to a missing skill, supplied project idea or learning resource. Use only supplied entryLevelTitles for job roles and supplied required skills for their requirements. Return a brief careerPaths entry for every supplied match (up to 20), plus at most 3 profileStrengths, 8 skillGaps, 8 recommendedJobRoles, 6 recommendedProjects and 10 recommendedLearning items. Keep each career path explanation and next step at most 25 words; keep other text fields at most 35 words. Reply with ONE JSON object and nothing else, with exactly these keys:
summary (string), profileStrengths [{name,evidence}], skillGaps [{skill,importance:"high|medium|low",reason,recommendedActions[]}],
careerPaths [{careerId,fitExplanation,nextSteps[]}], recommendedJobRoles [{title,industry,requiredSkills[],preparationAdvice}],
recommendedProjects [{title,purpose,difficulty:"beginner|intermediate|advanced",skillsToPractice[]}], recommendedLearning [{topic,reason,priority:"high|medium|low"}].
profileStrengths must only name skills present in profile.skills or the project, certification or experience titles. skillGaps must only use skills from matches[].missingSkills.`;
const ROADMAP_SYSTEM = `Create a practical student roadmap using only supplied career, skills, gaps and preferences. Return ONE valid JSON object, no markdown or extra text, with exactly: {description, phases:[{title,description,milestones:[{title,description,objectives:string[],relatedSkills:string[],estimatedHours:number,priority:"high|medium|low",completionCriteria,activities:[{kind:"course|tutorial|documentation|reading|exercise|project|certification|career_prep",title,description,estimatedHours:number,completionCriteria,resourceName?}]}]}]}. Return exactly 4 ordered phases (foundations, guided practice, applied project, career preparation), exactly 1 milestone per phase and exactly 2 activities per milestone. Keep the response compact: titles under 8 words; each description and criterion under 18 words; 2-3 objectives of at most 8 words each; 2-4 relatedSkills. Every required field must be present; hours are numbers. Use exact canonical required skill names in relatedSkills and only supplied learningResources for resourceName; omit resourceName otherwise. Do not invent links, providers, course availability, certifications, deadlines, qualifications or job outcomes. Prefer free resources for free_first. Respect weekly hours, experience, formats, language and supplied highlights; self-reported skills are unverified. Engineering and healthcare projects are educational exercises, not validated professional work. Criteria must be observable. Do not output IDs, dates or status.`;
const RESUME_ASSIST_SYSTEM = `You are a careful resume writing assistant. Use only the exact evidence supplied in the student's resume. Return exactly one JSON object {suggestions:[{field:"summary|experience|projects",original,proposed,reason}]}. Suggest concise truthful rewrites only for text that already exists. Do not add duties, tools, skills, metrics, dates, results, credentials, seniority or outcomes not explicitly present. Do not infer a result from an activity. If a job description is supplied, use it only to identify relevant wording already supported by the resume. Keep original as an exact input line or the complete original summary. Keep proposed under 600 characters. Return at most 8 suggestions; use an empty list if no safe improvement is possible. No markdown or extra text.`;
const BUSY = [500, 502, 503, 504];
const strings = (value: unknown, maxItems: number, maxLength: number) => Array.isArray(value) && value.length <= maxItems && value.every(x => typeof x === 'string' && x.length <= maxLength);
Deno.serve(async (req: Request) => {
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const authorization = req.headers.get('Authorization'); const projectUrl = Deno.env.get('SUPABASE_URL'); const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization) return json({ error: 'unauthorized' }, 401);
  if (!projectUrl || !anonKey) return json({ error: 'auth_verification_unavailable' }, 503);
  try { const authCheck = await fetch(`${projectUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey } }); if (!authCheck.ok) return json({ error: 'unauthorized' }, 401); }
  catch { return json({ error: 'auth_verification_unavailable' }, 503); }
  const key = Deno.env.get('AI_API_KEY'), model = Deno.env.get('AI_MODEL'), base = Deno.env.get('AI_BASE_URL') ?? 'https://api.openai.com/v1';
  const fallback = Deno.env.get('AI_FALLBACK_MODEL');
  const effort = Deno.env.get('AI_REASONING_EFFORT'); // optional, e.g. low or none; speeds up models that think before answering
  if (!key || !model) return json({ error: 'ai_not_configured' }, 503);
  const raw = await req.text(); if (raw.length > 20000) return json({ error: 'too_large' }, 413);
  let body: { task?: string; profile?: unknown; matches?: unknown[]; [key: string]: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); }
  const roadmapTask = body.task === 'roadmap';
  const resumeTask = body.task === 'resume_assist';
  if (roadmapTask) {
    const career = body.career as Record<string, unknown> | undefined;
    const preferences = body.preferences as Record<string, unknown> | undefined;
    if (!career || typeof career.id !== 'string' || typeof career.title !== 'string' ||
        career.id.length > 80 || career.title.length > 140 ||
        !strings(career.requiredSkills, 20, 60) || !strings(career.entryTitles, 8, 140) ||
        !strings(career.learningResources, 8, 160) || !strings(career.projectIdeas, 8, 160) ||
        !strings(body.currentSkills, 50, 60) || !strings(body.missingSkills, 20, 60) || !preferences ||
        typeof body.education !== 'string' || body.education.length > 240 ||
        !strings(body.experienceHighlights, 4, 240) || !strings(body.projectHighlights, 4, 240) ||
        typeof preferences.weeklyHours !== 'number' || !Number.isInteger(preferences.weeklyHours) || preferences.weeklyHours < 1 || preferences.weeklyHours > 40 ||
        typeof preferences.durationWeeks !== 'number' || !Number.isInteger(preferences.durationWeeks) || preferences.durationWeeks < 4 || preferences.durationWeeks > 104 ||
        typeof preferences.experienceLevel !== 'string' || !['beginner','intermediate','advanced'].includes(preferences.experienceLevel) ||
        !strings(preferences.learningStyle, 4, 20) || (preferences.learningStyle as string[]).some(x => !['reading','videos','practice','projects'].includes(x)) ||
        typeof preferences.budget !== 'string' || !['free_first','mixed','flexible'].includes(preferences.budget) ||
        typeof preferences.language !== 'string' || preferences.language.length > 60 ||
        !(preferences.targetDate === null || (typeof preferences.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(preferences.targetDate)))) return json({ error: 'bad_request' }, 400);
  } else if (resumeTask) {
    const content = body.resume as Record<string, unknown> | undefined;
    const lines = (value: unknown) => Array.isArray(value) && value.length <= 30 && value.every(line => typeof line === 'string' && line.length <= 600);
    if (!content || typeof content.summary !== 'string' || content.summary.length > 2500 ||
        !lines(content.experience) || !lines(content.projects) ||
        (body.jobDescription !== undefined && (typeof body.jobDescription !== 'string' || body.jobDescription.length > 6000))) return json({ error: 'bad_request' }, 400);
  } else if (!body.profile || !Array.isArray(body.matches) || body.matches.length < 1 || body.matches.length > 20) return json({ error: 'bad_request' }, 400);
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 90000);
  const career = body.career as Record<string, unknown> | undefined;
  const supplied = roadmapTask ? { task: 'roadmap', career, currentSkills: body.currentSkills, missingSkills: body.missingSkills, preferences: body.preferences,
    education: body.education, experienceHighlights: body.experienceHighlights, projectHighlights: body.projectHighlights } : { profile: body.profile, matches: body.matches };
  const actualSupplied = resumeTask ? { task: 'resume_assist', resume: body.resume, jobDescription: body.jobDescription ?? '' } : supplied;
  const call = (m: string) => fetch(`${base}/chat/completions`, { method: 'POST', signal: ctl.signal, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(effort ? { reasoning_effort: effort } : {}), model: m, temperature: roadmapTask || resumeTask ? 0.2 : 0.25, max_tokens: roadmapTask ? 4000 : resumeTask ? 3500 : 7000, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: roadmapTask ? ROADMAP_SYSTEM : resumeTask ? RESUME_ASSIST_SYSTEM : SYSTEM }, { role: 'user', content: JSON.stringify(actualSupplied) }] }) });
  const t0 = Date.now();
  try {
    // Retry briefly when the provider is overloaded; then try the optional fallback model.
    let r: Response | null = null;
    outer: for (const m of [model, fallback].filter((x): x is string => Boolean(x))) {
      for (let attempt = 0; attempt < 3; attempt++) {
        r = await call(m);
        if (!BUSY.includes(r.status)) break outer;
        await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
      }
    }
    console.log(`career-analysis: provider status ${r?.status} after ${Date.now() - t0} ms`);
    if (!r) return json({ error: 'provider_error', detail: 'No request was made.' }, 502);
    if (r.status === 429) return json({ error: 'rate_limited' }, 429);
    if (BUSY.includes(r.status)) return json({ error: 'provider_busy', detail: `Provider returned HTTP ${r.status} after retries.` }, 502);
    if (!r.ok) return json({ error: 'provider_error', detail: `Provider returned HTTP ${r.status}: ${(await r.text()).replace(/\s+/g, ' ').slice(0, 180)}` }, 502);
    const result = await r.json();
    const message = result?.choices?.[0]?.message;
    const rawContent = message?.content;
    const content = typeof rawContent === 'string' ? rawContent : Array.isArray(rawContent) ? rawContent.map((part: { text?: unknown }) => typeof part?.text === 'string' ? part.text : '').join('') : '';
    const finishReason = result?.choices?.[0]?.finish_reason;
    if (!content.trim()) return json({ error: 'invalid_json', detail: 'The AI provider returned an empty roadmap response. Retry; if it continues, check that the selected model supports JSON output.' }, 502);
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try { return json({ data: JSON.parse(cleaned) }); }
    catch {
      const detail = finishReason === 'length'
        ? 'The AI roadmap response was cut off at the model output limit. Retry; if it continues, use a model with a larger JSON output limit.'
        : `The AI provider returned malformed JSON${finishReason ? ` (finish reason: ${String(finishReason).slice(0, 40)})` : ''}. Retry; if it continues, check that the selected model supports JSON output.`;
      return json({ error: 'invalid_json', detail }, 502);
    }
  } catch (e) { return (e as Error).name === 'AbortError' ? json({ error: 'timeout' }, 504) : json({ error: 'provider_error' }, 502); } finally { clearTimeout(timer); }
});
