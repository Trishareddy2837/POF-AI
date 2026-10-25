-- AI career analysis. All tables are private to the owning student via RLS.
create table public.career_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'completed' check (status in ('completed','failed')),
  provider_mode text not null check (provider_mode in ('real','demo')),
  input_version text not null,            -- hash of the inputs, not the inputs themselves
  summary text not null check (char_length(summary) <= 1500),
  result jsonb not null,                  -- validated AnalysisResult (skill names and explanations only; no resume text)
  created_at timestamptz not null default now());
create index on public.career_analyses(user_id, created_at desc);

create table public.career_recommendations (
  id uuid primary key default gen_random_uuid(), analysis_id uuid not null references public.career_analyses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, career_id text not null, title text not null,
  fit_score int not null check (fit_score between 0 and 100), rank int not null check (rank between 1 and 5), created_at timestamptz not null default now());
create table public.skill_gaps (
  id uuid primary key default gen_random_uuid(), analysis_id uuid not null references public.career_analyses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, career_id text not null, skill text not null,
  importance text not null check (importance in ('high','medium','low')), status text not null default 'not_yet_assessed' check (status in ('not_yet_assessed')), reason text);
create table public.recommended_actions (
  id uuid primary key default gen_random_uuid(), analysis_id uuid not null references public.career_analyses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, career_id text not null, skill text,
  kind text not null check (kind in ('learn','practice','project')), text text not null check (char_length(text) <= 400),
  completed boolean not null default false, completed_at timestamptz);
create index on public.career_recommendations(analysis_id); create index on public.skill_gaps(analysis_id); create index on public.recommended_actions(analysis_id);
create index on public.recommended_actions(user_id, completed);
-- One selected path per student; the student can change it at any time (this is the input for the future roadmap generator).
create table public.selected_career_paths (
  user_id uuid primary key references public.profiles(id) on delete cascade, career_id text not null, title text not null,
  analysis_id uuid references public.career_analyses(id) on delete set null, selected_at timestamptz not null default now());

alter table public.career_analyses enable row level security;
create policy a_sel on public.career_analyses for select to authenticated using (user_id = auth.uid());
create policy a_ins on public.career_analyses for insert to authenticated with check (user_id = auth.uid());
create policy a_del on public.career_analyses for delete to authenticated using (user_id = auth.uid());
-- Child rows: owned by the student AND must point at one of the student's own analyses (an ID swap cannot attach rows to someone else's analysis).
do $$ declare t text; begin
  foreach t in array array['career_recommendations','skill_gaps','recommended_actions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t||'_sel', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())', t||'_del', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.career_analyses a where a.id = analysis_id and a.user_id = auth.uid()))', t||'_ins', t);
  end loop; end $$;
-- Students may only tick or untick actions; they cannot rewrite them or move them to another user.
create policy recommended_actions_upd on public.recommended_actions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.career_analyses a where a.id = analysis_id and a.user_id = auth.uid()));
alter table public.selected_career_paths enable row level security;
create policy sel_sel on public.selected_career_paths for select to authenticated using (user_id = auth.uid());
create policy sel_ins on public.selected_career_paths for insert to authenticated with check (user_id = auth.uid() and (analysis_id is null or exists (select 1 from public.career_analyses a where a.id = analysis_id and a.user_id = auth.uid())));
create policy sel_upd on public.selected_career_paths for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and (analysis_id is null or exists (select 1 from public.career_analyses a where a.id = analysis_id and a.user_id = auth.uid())));
create policy sel_del on public.selected_career_paths for delete to authenticated using (user_id = auth.uid());
