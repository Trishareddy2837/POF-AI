alter table public.career_preferences add column if not exists self_reported_skills text[] not null default '{}' check (cardinality(self_reported_skills) <= 50);
create unique index if not exists education_one_per_user on public.education_records(user_id);
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  score int not null check (score >= 0), total int not null check (total > 0),
  taken_at timestamptz not null default now(), check (score <= total));
create index on public.assessment_attempts(user_id, taken_at desc);
alter table public.assessment_attempts enable row level security;
-- Append-only for students: they can read and insert their own attempts, not edit or delete them.
create policy attempts_read on public.assessment_attempts for select to authenticated using (user_id = auth.uid());
create policy attempts_insert on public.assessment_attempts for insert to authenticated with check (user_id = auth.uid());
