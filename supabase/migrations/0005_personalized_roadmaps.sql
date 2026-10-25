-- Private, student-owned roadmaps. Plan content is schema-validated by the app before insert.
create table public.career_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  career_id text not null,
  career_title text not null,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  preferences jsonb not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index career_roadmaps_user_updated on public.career_roadmaps(user_id, updated_at desc);

create table public.roadmap_milestone_completions (
  roadmap_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_id text not null,
  completed_at timestamptz not null default now(),
  primary key (roadmap_id, milestone_id),
  foreign key (roadmap_id, user_id) references public.career_roadmaps(id, user_id) on delete cascade
);
create index roadmap_milestone_completions_user on public.roadmap_milestone_completions(user_id, completed_at desc);

create table public.roadmap_activity_completions (
  roadmap_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id text not null,
  completed_at timestamptz not null default now(),
  primary key (roadmap_id, activity_id),
  foreign key (roadmap_id, user_id) references public.career_roadmaps(id, user_id) on delete cascade
);

alter table public.career_roadmaps enable row level security;
create policy roadmap_read_own on public.career_roadmaps for select to authenticated using (user_id = auth.uid());
create policy roadmap_insert_own on public.career_roadmaps for insert to authenticated with check (user_id = auth.uid());
-- No direct UPDATE policy: status and completion changes go through checked functions below.
create policy roadmap_delete_own on public.career_roadmaps for delete to authenticated using (user_id = auth.uid());
alter table public.roadmap_milestone_completions enable row level security;
create policy roadmap_milestones_read_own on public.roadmap_milestone_completions for select to authenticated using (user_id = auth.uid());
alter table public.roadmap_activity_completions enable row level security;
create policy roadmap_activities_read_own on public.roadmap_activity_completions for select to authenticated using (user_id = auth.uid());

create or replace function public.complete_roadmap_activity(p_roadmap_id uuid, p_activity_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_content jsonb;
begin
  select content into v_content from public.career_roadmaps where id = p_roadmap_id and user_id = auth.uid() and status = 'active' for update;
  if not found then raise exception 'Active roadmap not found'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_content->'phases') as phase(p)
    cross join lateral jsonb_array_elements(p->'milestones') as milestone(m)
    cross join lateral jsonb_array_elements_text(coalesce(m->'prerequisiteIds','[]'::jsonb)) as prereq(milestone_id)
    where exists(select 1 from jsonb_array_elements(m->'activities') as activity(a) where a->>'id'=p_activity_id)
      and not exists(select 1 from public.roadmap_milestone_completions c where c.roadmap_id=p_roadmap_id and c.user_id=auth.uid() and c.milestone_id=prereq.milestone_id)
  ) then raise exception 'Complete the prerequisite milestones first'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_content->'phases') as phase(p)
    cross join lateral jsonb_array_elements(p->'milestones') as milestone(m)
    cross join lateral jsonb_array_elements(m->'activities') as activity(a) where a->>'id' = p_activity_id
  ) then raise exception 'Activity does not belong to this roadmap'; end if;
  insert into public.roadmap_activity_completions(roadmap_id, user_id, activity_id)
  values (p_roadmap_id, auth.uid(), p_activity_id) on conflict (roadmap_id, activity_id) do nothing;
  update public.career_roadmaps set updated_at = now() where id = p_roadmap_id;
end $$;

create or replace function public.complete_roadmap_milestone(p_roadmap_id uuid, p_milestone_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_content jsonb; v_milestone jsonb; v_prereq text; v_total int; v_done int;
begin
  select content into v_content from public.career_roadmaps where id = p_roadmap_id and user_id = auth.uid() and status = 'active' for update;
  if not found then raise exception 'Active roadmap not found'; end if;
  select m into v_milestone from jsonb_array_elements(v_content->'phases') as phase(p)
    cross join lateral jsonb_array_elements(p->'milestones') as milestone(m) where m->>'id' = p_milestone_id;
  if v_milestone is null then raise exception 'Milestone does not belong to this roadmap'; end if;
  for v_prereq in select jsonb_array_elements_text(coalesce(v_milestone->'prerequisiteIds','[]'::jsonb)) loop
    if not exists(select 1 from public.roadmap_milestone_completions c where c.roadmap_id=p_roadmap_id and c.user_id=auth.uid() and c.milestone_id=v_prereq) then
      raise exception 'Complete the prerequisite milestones first';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(v_milestone->'activities') as activity(a)
    where not exists(select 1 from public.roadmap_activity_completions c where c.roadmap_id=p_roadmap_id and c.user_id=auth.uid() and c.activity_id=a->>'id')
  ) then raise exception 'Complete every learning activity before completing this milestone'; end if;
  insert into public.roadmap_milestone_completions(roadmap_id, user_id, milestone_id)
  values (p_roadmap_id, auth.uid(), p_milestone_id) on conflict (roadmap_id, milestone_id) do nothing;
  select count(*) into v_total from jsonb_array_elements(v_content->'phases') as phase(p) cross join lateral jsonb_array_elements(p->'milestones') as milestone(m);
  select count(*) into v_done from public.roadmap_milestone_completions c where c.roadmap_id=p_roadmap_id and c.user_id=auth.uid();
  update public.career_roadmaps set status = case when v_total > 0 and v_done >= v_total then 'completed' else status end, updated_at=now() where id=p_roadmap_id;
end $$;

create or replace function public.set_roadmap_status(p_roadmap_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_status not in ('active','paused','archived') then raise exception 'Invalid roadmap status'; end if;
  update public.career_roadmaps set status=p_status, updated_at=now() where id=p_roadmap_id and user_id=auth.uid() and status <> 'completed';
  if not found then raise exception 'Roadmap not found or already completed'; end if;
end $$;

revoke all on function public.complete_roadmap_activity(uuid,text) from public;
revoke all on function public.complete_roadmap_milestone(uuid,text) from public;
revoke all on function public.set_roadmap_status(uuid,text) from public;
grant execute on function public.complete_roadmap_activity(uuid,text) to authenticated;
grant execute on function public.complete_roadmap_milestone(uuid,text) to authenticated;
grant execute on function public.set_roadmap_status(uuid,text) to authenticated;
