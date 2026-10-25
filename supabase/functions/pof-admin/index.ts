import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anon || !serviceKey) return json({ error: 'admin_service_not_configured' }, 503);
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const caller = authData.user;
  if (authError || !caller) return json({ error: 'unauthorized' }, 401);
  if (caller.app_metadata?.role !== 'careerforge_admin') return json({ error: 'forbidden' }, 403);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  if (body.action === 'overview') {
    const users: Record<string, unknown>[] = [];
    for (let page = 1; page <= 100; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: 'user_list_failed' }, 502);
      users.push(...data.users.map(user => ({ id: user.id, email: user.email ?? '', fullName: text(user.user_metadata?.full_name, 120), createdAt: user.created_at, lastSignInAt: user.last_sign_in_at ?? null, bannedUntil: user.banned_until ?? null })));
      if (data.users.length < 1000) break;
    }
    const count = async (table: string, column = 'id', value?: string) => {
      let query = admin.from(table).select('id', { count: 'exact', head: true });
      if (value) query = query.eq(column, value);
      const result = await query;
      return result.error ? null : result.count;
    };
    const metrics = {
      users: users.length,
      roadmaps: await count('career_roadmaps'),
      analyses: await count('career_analyses'),
      resumeDrafts: await count('resume_documents'),
      trackedCourses: await count('course_learning_progress'),
      jobListings: await count('opportunity_listings', 'kind', 'job'),
      internshipListings: await count('opportunity_listings', 'kind', 'internship'),
      hackathonListings: await count('opportunity_listings', 'kind', 'hackathon'),
      courseListings: await count('opportunity_listings', 'kind', 'course'),
    };
    return json({ metrics, users });
  }
  const userId = text(body.userId, 64);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'invalid_user_id' }, 400);
  if (body.action === 'update_user') {
    const fullName = text(body.fullName, 120);
    if (fullName.length < 2) return json({ error: 'invalid_name' }, 400);
    const banDuration = body.suspended === true ? '87600h' : 'none';
    if (userId === caller.id && body.suspended === true) return json({ error: 'cannot_suspend_current_admin' }, 400);
    const updated = await admin.auth.admin.updateUserById(userId, { user_metadata: { full_name: fullName }, ban_duration: banDuration });
    if (updated.error) return json({ error: 'user_update_failed' }, 502);
    const profile = await admin.from('profiles').update({ full_name: fullName }).eq('id', userId);
    if (profile.error) return json({ error: 'profile_update_failed' }, 502);
    return json({ ok: true });
  }
  if (body.action === 'delete_user') {
    if (userId === caller.id) return json({ error: 'cannot_delete_current_admin' }, 400);
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) return json({ error: 'user_delete_failed' }, 502);
    return json({ ok: true });
  }
  return json({ error: 'unknown_action' }, 400);
});
