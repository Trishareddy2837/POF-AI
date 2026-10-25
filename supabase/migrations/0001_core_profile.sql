-- Core student schema. Every private table is owned by auth.users(id) and protected by RLS.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  city text check (city is null or char_length(city) <= 120),
  avatar_path text, status text check (status in ('Studying','Graduated','Looking for work')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.education_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  institution text not null, degree text, specialization text,
  graduation_year int check (graduation_year between 1990 and 2100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.career_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  interests text, target_roles text, industries text, location_pref text, goals text,
  updated_at timestamptz not null default now());
create table public.skills (id serial primary key, name text not null unique, kind text not null check (kind in ('technical','soft','aptitude')));
create table public.student_skills (
  user_id uuid not null references public.profiles(id) on delete cascade, skill_id int not null references public.skills(id),
  level smallint check (level between 1 and 5),
  source text not null default 'self_reported' check (source in ('self_reported','assessed','evidence')),
  primary key (user_id, skill_id));
create table public.projects (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null, description text, url text, created_at timestamptz not null default now());
create table public.certifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null, issuer text, issued_on date);
create table public.experiences (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, kind text not null check (kind in ('internship','job','competition','achievement')), title text not null, organization text, description text);
create table public.resumes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
  storage_path text not null, file_name text not null, mime_type text not null check (mime_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes int not null check (size_bytes <= 5242880), uploaded_at timestamptz not null default now());
create index on public.education_records(user_id); create index on public.projects(user_id);
create index on public.certifications(user_id); create index on public.experiences(user_id);

create function public.touch() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger t_profiles before update on public.profiles for each row execute function public.touch();
create trigger t_edu before update on public.education_records for each row execute function public.touch();
create trigger t_pref before update on public.career_preferences for each row execute function public.touch();

-- Create the profile row when a user registers (email or Google).
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id, full_name) values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), split_part(new.email,'@',1)));
return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS: students reach only their own rows.
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
do $$ declare t text; begin
  foreach t in array array['education_records','projects','certifications','experiences','resumes','student_skills'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop; end $$;
alter table public.career_preferences enable row level security;
create policy own_pref on public.career_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.skills enable row level security;
create policy skills_read on public.skills for select using (true);  -- public catalogue, read-only

-- Private resume bucket: files live under <user_id>/, 5 MB, PDF/DOCX only.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('resumes','resumes',false,5242880,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict (id) do nothing;
create policy resumes_own on storage.objects for all to authenticated
  using (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);
