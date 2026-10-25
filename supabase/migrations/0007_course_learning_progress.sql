-- Student course saves and self-reported progress. Course catalogue details remain curated in the app.
create table public.course_learning_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null check (char_length(course_id) between 1 and 100),
  status text not null check (status in ('saved', 'in_progress', 'completed')),
  completion_source text check (completion_source is null or completion_source = 'self_reported'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id),
  check ((status = 'completed' and completion_source = 'self_reported') or (status <> 'completed' and completion_source is null))
);
create index course_learning_progress_user_status on public.course_learning_progress(user_id, status, updated_at desc);
create trigger t_course_learning_progress before update on public.course_learning_progress for each row execute function public.touch();
alter table public.course_learning_progress enable row level security;
create policy course_progress_read_own on public.course_learning_progress for select to authenticated using (user_id = auth.uid());
create policy course_progress_insert_own on public.course_learning_progress for insert to authenticated with check (user_id = auth.uid());
create policy course_progress_update_own on public.course_learning_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy course_progress_delete_own on public.course_learning_progress for delete to authenticated using (user_id = auth.uid());

-- Link a curated course to a student's existing private roadmap without mutating its validated plan content.
create table public.course_roadmap_links (
  user_id uuid not null references public.profiles(id) on delete cascade,
  roadmap_id uuid not null,
  course_id text not null check (char_length(course_id) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, roadmap_id, course_id),
  foreign key (roadmap_id, user_id) references public.career_roadmaps(id, user_id) on delete cascade
);
create index course_roadmap_links_roadmap on public.course_roadmap_links(user_id, roadmap_id);
alter table public.course_roadmap_links enable row level security;
create policy course_roadmap_links_read_own on public.course_roadmap_links for select to authenticated using (user_id = auth.uid());
create policy course_roadmap_links_insert_own on public.course_roadmap_links for insert to authenticated with check (user_id = auth.uid());
create policy course_roadmap_links_delete_own on public.course_roadmap_links for delete to authenticated using (user_id = auth.uid());
