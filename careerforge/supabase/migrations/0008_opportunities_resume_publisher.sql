-- Student-owned opportunity tracking and private, versionable resume documents.
create table public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_document_id uuid,
  title text not null check (char_length(title) between 1 and 120),
  template text not null check (template in ('ats', 'modern', 'technical')),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (parent_document_id, user_id) references public.resume_documents(id, user_id) on delete set null (parent_document_id)
);
create index resume_documents_user_updated on public.resume_documents(user_id, updated_at desc);
create trigger t_resume_documents before update on public.resume_documents for each row execute function public.touch();
alter table public.resume_documents enable row level security;
create policy resume_documents_own on public.resume_documents for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.student_opportunity_tracking (
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id text not null check (char_length(opportunity_id) between 1 and 120),
  opportunity_kind text not null check (opportunity_kind in ('job', 'internship', 'hackathon')),
  title text not null check (char_length(title) between 1 and 180),
  organization text not null check (char_length(organization) between 1 and 180),
  status text not null check (status in ('saved','interested','preparing','applied','interviewing','offer_received','rejected','withdrawn','registered','participating','participated')),
  application_url text check (application_url is null or application_url ~ '^https://'),
  applied_at timestamptz,
  next_action text not null default '' check (char_length(next_action) <= 500),
  follow_up_date date,
  notes text not null default '' check (char_length(notes) <= 4000),
  resume_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id),
  foreign key (resume_document_id, user_id) references public.resume_documents(id, user_id) on delete set null (resume_document_id)
);
create index opportunity_tracking_user_status on public.student_opportunity_tracking(user_id, status, updated_at desc);
create trigger t_opportunity_tracking before update on public.student_opportunity_tracking for each row execute function public.touch();
alter table public.student_opportunity_tracking enable row level security;
create policy opportunity_tracking_own on public.student_opportunity_tracking for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Publisher access is invitation-only. Client-side roles never grant publishing rights.
create table public.publisher_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 180),
  website text check (website is null or website ~ '^https://'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.publisher_members (
  organization_id uuid not null references public.publisher_organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','editor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index publisher_members_user on public.publisher_members(user_id) where active;

create function public.is_careerforge_admin() returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'careerforge_admin', false)
$$;
revoke all on function public.is_careerforge_admin() from public;
grant execute on function public.is_careerforge_admin() to authenticated;

create table public.opportunity_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.publisher_organizations(id) on delete cascade,
  kind text not null check (kind in ('course','internship','job','hackathon','competition','quiz')),
  title text not null check (char_length(title) between 3 and 180),
  description text not null check (char_length(description) between 10 and 6000),
  industry text not null default '' check (char_length(industry) <= 120),
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  eligibility text not null default '' check (char_length(eligibility) <= 2000),
  education_requirements text not null default '' check (char_length(education_requirements) <= 1000),
  experience_level text not null default '' check (char_length(experience_level) <= 80),
  location text not null default '' check (char_length(location) <= 180),
  work_mode text not null default 'unknown' check (work_mode in ('remote','hybrid','onsite','online','unknown')),
  employment_type text not null default '' check (char_length(employment_type) <= 80),
  compensation_status text not null default 'unknown' check (compensation_status in ('paid','unpaid','unknown')),
  salary_range text check (salary_range is null or char_length(salary_range) <= 120),
  duration text check (duration is null or char_length(duration) <= 120),
  starts_on date,
  ends_on date,
  deadline date,
  source_url text check (source_url is null or source_url ~ '^https://'),
  last_verified date,
  publication_status text not null default 'draft' check (publication_status in ('draft','submitted','under_review','corrections_requested','approved','published','expired','archived','rejected')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  check (publication_status <> 'published' or (source_url is not null and last_verified is not null))
);
create index opportunity_listings_public_search on public.opportunity_listings(kind, industry, publication_status, deadline);
create index opportunity_listings_org on public.opportunity_listings(organization_id, publication_status, updated_at desc);
create trigger t_opportunity_listings before update on public.opportunity_listings for each row execute function public.touch();

create table public.opportunity_listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.opportunity_listings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  action text not null check (action in ('submitted','under_review','corrections_requested','approved','published','expired','archived','rejected')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index listing_reviews_listing_date on public.opportunity_listing_reviews(listing_id, created_at desc);

alter table public.publisher_organizations enable row level security;
alter table public.publisher_members enable row level security;
alter table public.opportunity_listings enable row level security;
alter table public.opportunity_listing_reviews enable row level security;

create policy publisher_org_read_member on public.publisher_organizations for select to authenticated using (
  public.is_careerforge_admin() or exists (select 1 from public.publisher_members m where m.organization_id = id and m.user_id = auth.uid() and m.active)
);
create policy publisher_org_admin_manage on public.publisher_organizations for all to authenticated using (public.is_careerforge_admin()) with check (public.is_careerforge_admin());
create policy publisher_members_read_self_admin on public.publisher_members for select to authenticated using (user_id = auth.uid() or public.is_careerforge_admin());
create policy publisher_members_admin_manage on public.publisher_members for all to authenticated using (public.is_careerforge_admin()) with check (public.is_careerforge_admin());

create policy listings_public_read on public.opportunity_listings for select using (publication_status = 'published');
create policy listings_publisher_read on public.opportunity_listings for select to authenticated using (
  public.is_careerforge_admin() or exists (select 1 from public.publisher_members m where m.organization_id = opportunity_listings.organization_id and m.user_id = auth.uid() and m.active)
);
create policy listings_publisher_insert_draft on public.opportunity_listings for insert to authenticated with check (
  publication_status = 'draft' and created_by = auth.uid() and exists (select 1 from public.publisher_members m where m.organization_id = opportunity_listings.organization_id and m.user_id = auth.uid() and m.active)
);
create policy listings_publisher_update_nonpublished on public.opportunity_listings for update to authenticated using (
  exists (select 1 from public.publisher_members m where m.organization_id = opportunity_listings.organization_id and m.user_id = auth.uid() and m.active)
) with check (publication_status in ('draft','submitted','expired','archived') and exists (select 1 from public.publisher_members m where m.organization_id = opportunity_listings.organization_id and m.user_id = auth.uid() and m.active));
create policy listings_admin_manage on public.opportunity_listings for all to authenticated using (public.is_careerforge_admin()) with check (public.is_careerforge_admin());

create policy listing_reviews_admin_read on public.opportunity_listing_reviews for select to authenticated using (public.is_careerforge_admin());
create policy listing_reviews_admin_insert on public.opportunity_listing_reviews for insert to authenticated with check (public.is_careerforge_admin() and reviewer_id = auth.uid());

create function public.prevent_publisher_listing_publish() returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if public.is_careerforge_admin() then return new; end if;
  if tg_op = 'INSERT' and new.publication_status <> 'draft' then raise exception 'Publisher listings must start as drafts'; end if;
  if tg_op = 'UPDATE' and old.publication_status = 'published' and new.publication_status not in ('expired','archived') then raise exception 'Publishers may only expire or archive a published listing'; end if;
  if new.publication_status not in ('draft','submitted','expired','archived') then raise exception 'Only an administrator can review or publish a listing'; end if;
  return new;
end $$;
create trigger publisher_listing_workflow before insert or update on public.opportunity_listings for each row execute function public.prevent_publisher_listing_publish();

create function public.review_opportunity_listing(p_listing_id uuid, p_action text, p_note text default '')
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text; v_source text; v_verified date;
begin
  if not public.is_careerforge_admin() then raise exception 'Administrator access required'; end if;
  if p_action not in ('under_review','corrections_requested','approved','published','expired','archived','rejected') then raise exception 'Invalid review action'; end if;
  select publication_status, source_url, last_verified into v_status, v_source, v_verified from public.opportunity_listings where id = p_listing_id for update;
  if not found then raise exception 'Listing not found'; end if;
  if p_action = 'published' and (v_source is null or v_verified is null or v_verified < current_date - 30) then raise exception 'Add an official URL and verify this listing within the last 30 days before publishing'; end if;
  if p_action = 'published' and exists (select 1 from public.opportunity_listings where id=p_listing_id and deadline < current_date) then raise exception 'Expired listings cannot be published'; end if;
  update public.opportunity_listings set publication_status = p_action where id = p_listing_id;
  insert into public.opportunity_listing_reviews(listing_id, reviewer_id, action, note) values (p_listing_id, auth.uid(), p_action, left(coalesce(p_note,''),2000));
end $$;
revoke all on function public.review_opportunity_listing(uuid,text,text) from public;
grant execute on function public.review_opportunity_listing(uuid,text,text) to authenticated;

grant select on public.opportunity_listings to anon, authenticated;
grant select, insert, update, delete on public.student_opportunity_tracking, public.resume_documents to authenticated;
grant select on public.publisher_organizations, public.publisher_members, public.opportunity_listing_reviews to authenticated;
grant insert, update, delete on public.publisher_organizations, public.publisher_members, public.opportunity_listings, public.opportunity_listing_reviews to authenticated;
