-- Secure, server-scored assessments and opt-in public leaderboards.
-- Existing legacy assessment_attempts remain readable, but students can no longer forge scores.
drop policy if exists attempts_insert on public.assessment_attempts;
revoke insert, update, delete on public.assessment_attempts from authenticated;
alter table public.student_opportunity_tracking drop constraint if exists student_opportunity_tracking_opportunity_kind_check;
alter table public.student_opportunity_tracking add constraint student_opportunity_tracking_opportunity_kind_check check (opportunity_kind in ('job','internship','hackathon','competition'));

create table public.quiz_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (char_length(title) between 2 and 100), description text not null default '',
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.quizzes (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.quiz_categories(id),
  title text not null check (char_length(title) between 3 and 160), description text not null check (char_length(description) between 10 and 2000),
  objectives text[] not null default '{}' check (cardinality(objectives) <= 12), difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  question_count int not null check (question_count between 1 and 100), time_limit_seconds int check (time_limit_seconds is null or time_limit_seconds between 60 and 14400),
  passing_score int not null default 60 check (passing_score between 0 and 100), max_attempts int not null default 3 check (max_attempts between 1 and 20),
  allow_review boolean not null default true, leaderboard_enabled boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived','retired')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(), quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 5 and 2000), topic text not null check (char_length(topic) between 1 and 100),
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')), explanation text not null default '' check (char_length(explanation) <= 1200),
  position int not null check (position between 1 and 100), unique (quiz_id, position), unique (id,quiz_id)
);
create table public.quiz_options (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 500), is_correct boolean not null default false, position int not null check (position between 1 and 8),
  unique (question_id, position)
);
create unique index quiz_one_correct_option on public.quiz_options(question_id) where is_correct;
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id), attempt_number int not null check (attempt_number between 1 and 20),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  started_at timestamptz not null default now(), expires_at timestamptz, submitted_at timestamptz,
  correct_count int check (correct_count is null or correct_count >= 0), total_questions int check (total_questions is null or total_questions > 0),
  score_percent int check (score_percent is null or score_percent between 0 and 100), time_spent_seconds int,
  unique (user_id,quiz_id,attempt_number), unique (id,user_id)
);
create index quiz_attempts_user_recent on public.quiz_attempts(user_id,started_at desc);
create index quiz_attempts_quiz_submitted on public.quiz_attempts(quiz_id,status,score_percent desc,submitted_at);
create table public.quiz_attempt_questions (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id), position int not null,
  option_order uuid[] not null, primary key(attempt_id,question_id), unique(attempt_id,position)
);
create table public.quiz_attempt_answers (
  attempt_id uuid not null, user_id uuid not null, question_id uuid not null, selected_option_id uuid not null,
  updated_at timestamptz not null default now(), primary key(attempt_id,question_id),
  foreign key(attempt_id,user_id) references public.quiz_attempts(id,user_id) on delete cascade,
  foreign key(attempt_id,question_id) references public.quiz_attempt_questions(attempt_id,question_id) on delete cascade,
  foreign key(selected_option_id) references public.quiz_options(id)
);
create table public.quiz_leaderboard_opt_ins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32 and position('@' in display_name)=0), opted_in boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.quiz_admin_audit (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
  entity_type text not null check(entity_type in ('quiz','category','question','option')), entity_id uuid not null,
  action text not null check(action in ('insert','update','delete')), created_at timestamptz not null default now()
);

alter table public.quiz_categories enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_questions enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.quiz_leaderboard_opt_ins enable row level security;
alter table public.quiz_admin_audit enable row level security;
create policy quiz_categories_public on public.quiz_categories for select using (active);
create policy quiz_categories_admin on public.quiz_categories for all to authenticated using (public.is_careerforge_admin()) with check (public.is_careerforge_admin());
create policy quizzes_public on public.quizzes for select using (status='published');
create policy quizzes_admin on public.quizzes for all to authenticated using (public.is_careerforge_admin()) with check (public.is_careerforge_admin());
create policy quiz_questions_admin on public.quiz_questions for all to authenticated using (public.is_careerforge_admin()) with check (public.is_careerforge_admin());
create policy quiz_options_admin on public.quiz_options for all to authenticated using (public.is_careerforge_admin()) with check (public.is_careerforge_admin());
create policy quiz_attempts_own_read on public.quiz_attempts for select to authenticated using (user_id=auth.uid());
create policy quiz_attempt_questions_own_read on public.quiz_attempt_questions for select to authenticated using (exists(select 1 from public.quiz_attempts a where a.id=attempt_id and a.user_id=auth.uid()));
create policy quiz_attempt_answers_own_read on public.quiz_attempt_answers for select to authenticated using (user_id=auth.uid());
create policy quiz_optin_own on public.quiz_leaderboard_opt_ins for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy quiz_audit_admin_read on public.quiz_admin_audit for select to authenticated using(public.is_careerforge_admin());
create trigger t_quizzes before update on public.quizzes for each row execute function public.touch();

create function public.validate_quiz_publication() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_questions int; v_invalid int;
begin
  if new.status='published' then
    select count(*) into v_questions from public.quiz_questions q where q.quiz_id=new.id;
    select count(*) into v_invalid
    from public.quiz_questions q
    left join lateral (
      select count(*) as option_count,count(*) filter(where o.is_correct) as correct_count
      from public.quiz_options o where o.question_id=q.id
    ) options on true
    where q.quiz_id=new.id and (options.option_count<2 or options.correct_count<>1);
    if v_questions<new.question_count or v_invalid>0 then
      raise exception 'Cannot publish quiz "%": requires % questions; found % questions and % invalid question(s). Each question needs at least two choices and exactly one correct answer.',new.title,new.question_count,v_questions,v_invalid;
    end if;
  end if;
  return new;
end $$;
create trigger quiz_publish_validate before insert or update of status,question_count on public.quizzes for each row execute function public.validate_quiz_publication();

create function public.audit_quiz_content() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.quiz_admin_audit(actor_id,entity_type,entity_id,action)
  values(auth.uid(),case tg_table_name when 'quizzes' then 'quiz' when 'quiz_categories' then 'category' when 'quiz_questions' then 'question' else 'option' end,
    case when tg_op='DELETE' then old.id else new.id end,lower(tg_op));
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger audit_quizzes after insert or update or delete on public.quizzes for each row execute function public.audit_quiz_content();
create trigger audit_quiz_categories after insert or update or delete on public.quiz_categories for each row execute function public.audit_quiz_content();
create trigger audit_quiz_questions after insert or update or delete on public.quiz_questions for each row execute function public.audit_quiz_content();
create trigger audit_quiz_options after insert or update or delete on public.quiz_options for each row execute function public.audit_quiz_content();

create function public.lock_published_quiz_bank() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_quiz_id uuid;
begin
  if tg_table_name='quiz_questions' then v_quiz_id:=case when tg_op='DELETE' then old.quiz_id else new.quiz_id end;
  else select quiz_id into v_quiz_id from public.quiz_questions where id=case when tg_op='DELETE' then old.question_id else new.question_id end; end if;
  if exists(select 1 from public.quizzes where id=v_quiz_id and status='published') then raise exception 'Unpublish the quiz before changing its question bank'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger lock_published_questions before insert or update or delete on public.quiz_questions for each row execute function public.lock_published_quiz_bank();
create trigger lock_published_options before insert or update or delete on public.quiz_options for each row execute function public.lock_published_quiz_bank();

create function public.quiz_attempt_payload(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_payload jsonb;
begin
  select jsonb_build_object('attempt_id',a.id,'expires_at',a.expires_at,'started_at',a.started_at,'status',a.status,
    'answers',coalesce((select jsonb_object_agg(question_id::text,selected_option_id::text) from public.quiz_attempt_answers where attempt_id=a.id and user_id=auth.uid()),'{}'::jsonb),
    'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'topic',q.topic,'difficulty',q.difficulty,'position',aq.position,'options',
      (select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label) order by x.ord) from unnest(aq.option_order) with ordinality x(id,ord) join public.quiz_options o on o.id=x.id)) order by aq.position)
      from public.quiz_attempt_questions aq join public.quiz_questions q on q.id=aq.question_id where aq.attempt_id=a.id),'[]'::jsonb))
    into v_payload from public.quiz_attempts a where a.id=p_attempt_id and a.user_id=auth.uid();
  return v_payload;
end $$;
revoke all on function public.quiz_attempt_payload(uuid) from public;

create function public.start_quiz_attempt(p_quiz_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_quiz public.quizzes%rowtype; v_attempt public.quiz_attempts%rowtype; v_num int; v_q record; v_choices uuid[];
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_quiz_id::text,0));
  select * into v_quiz from public.quizzes where id=p_quiz_id and status='published';
  if not found then raise exception 'Quiz not available'; end if;
  select * into v_attempt from public.quiz_attempts where user_id=auth.uid() and quiz_id=p_quiz_id and status='in_progress' and (expires_at is null or expires_at>now()) order by started_at desc limit 1 for update;
  if found then return public.quiz_attempt_payload(v_attempt.id); end if;
  update public.quiz_attempts set status='expired' where user_id=auth.uid() and quiz_id=p_quiz_id and status='in_progress' and expires_at<=now();
  select count(*)+1 into v_num from public.quiz_attempts where user_id=auth.uid() and quiz_id=p_quiz_id;
  if v_num>v_quiz.max_attempts then raise exception 'Attempt limit reached'; end if;
  insert into public.quiz_attempts(user_id,quiz_id,attempt_number,expires_at) values(auth.uid(),p_quiz_id,v_num,case when v_quiz.time_limit_seconds is null then null else now()+make_interval(secs=>v_quiz.time_limit_seconds) end) returning * into v_attempt;
  for v_q in select id from public.quiz_questions where quiz_id=p_quiz_id order by random() limit v_quiz.question_count loop
    select array_agg(id order by random()) into v_choices from public.quiz_options where question_id=v_q.id;
    insert into public.quiz_attempt_questions(attempt_id,question_id,position,option_order) values(v_attempt.id,v_q.id,(select count(*)+1 from public.quiz_attempt_questions where attempt_id=v_attempt.id),v_choices);
  end loop;
  if (select count(*) from public.quiz_attempt_questions where attempt_id=v_attempt.id)<>v_quiz.question_count then raise exception 'Quiz question bank is incomplete'; end if;
  return public.quiz_attempt_payload(v_attempt.id);
end $$;

create function public.save_quiz_answers(p_attempt_id uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_attempt public.quiz_attempts%rowtype; v_item jsonb; v_q uuid; v_o uuid;
begin
  if jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)>100 then raise exception 'Invalid answer set'; end if;
  select * into v_attempt from public.quiz_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found or v_attempt.status<>'in_progress' then raise exception 'Attempt is not active'; end if;
  if v_attempt.expires_at is not null and v_attempt.expires_at<=now() then update public.quiz_attempts set status='expired' where id=p_attempt_id; return jsonb_build_object('expired',true); end if;
  for v_item in select value from jsonb_array_elements(p_answers) loop
    v_q:=(v_item->>'question_id')::uuid; v_o:=(v_item->>'option_id')::uuid;
    if not exists(select 1 from public.quiz_attempt_questions aq join public.quiz_options o on o.question_id=aq.question_id and o.id=v_o where aq.attempt_id=p_attempt_id and aq.question_id=v_q) then raise exception 'Answer does not belong to this attempt'; end if;
    insert into public.quiz_attempt_answers(attempt_id,user_id,question_id,selected_option_id) values(p_attempt_id,auth.uid(),v_q,v_o)
      on conflict(attempt_id,question_id) do update set selected_option_id=excluded.selected_option_id,updated_at=now();
  end loop;
  return jsonb_build_object('saved',jsonb_array_length(p_answers));
end $$;

create function public.submit_quiz_attempt(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_attempt public.quiz_attempts%rowtype; v_correct int; v_total int; v_payload jsonb;
begin
  select * into v_attempt from public.quiz_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status='submitted' then
    return jsonb_build_object('attempt_id',v_attempt.id,'score_percent',v_attempt.score_percent,'correct_count',v_attempt.correct_count,'total_questions',v_attempt.total_questions,'time_spent_seconds',v_attempt.time_spent_seconds,'duplicate',true,'review',public.quiz_result_review(v_attempt.id));
  end if;
  if v_attempt.status<>'in_progress' then raise exception 'Attempt is not active'; end if;
  if v_attempt.expires_at is not null and v_attempt.expires_at<=now() then update public.quiz_attempts set status='expired' where id=p_attempt_id; raise exception 'Time expired'; end if;
  select count(*),count(*) filter(where a.selected_option_id=o.id) into v_total,v_correct
    from public.quiz_attempt_questions aq join public.quiz_options o on o.question_id=aq.question_id and o.is_correct
    left join public.quiz_attempt_answers a on a.attempt_id=aq.attempt_id and a.question_id=aq.question_id where aq.attempt_id=p_attempt_id;
  update public.quiz_attempts set status='submitted',submitted_at=now(),correct_count=v_correct,total_questions=v_total,score_percent=case when v_total=0 then 0 else round(100.0*v_correct/v_total)::int end,time_spent_seconds=greatest(0,extract(epoch from(now()-started_at))::int) where id=p_attempt_id returning * into v_attempt;
  insert into public.assessment_attempts(user_id,name,score,total,taken_at) values(v_attempt.user_id,(select title from public.quizzes where id=v_attempt.quiz_id),v_correct,v_total,v_attempt.submitted_at);
  v_payload:=jsonb_build_object('attempt_id',v_attempt.id,'score_percent',v_attempt.score_percent,'correct_count',v_correct,'total_questions',v_total,'time_spent_seconds',v_attempt.time_spent_seconds,'duplicate',false,'review',public.quiz_result_review(v_attempt.id));
  return v_payload;
end $$;

create function public.quiz_result_review(p_attempt_id uuid) returns jsonb language sql security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('question_id',q.id,'prompt',q.prompt,'topic',q.topic,'selected_option_id',a.selected_option_id,'correct_option_id',o.id,'correct_label',o.label,'explanation',q.explanation,'is_correct',a.selected_option_id=o.id) order by aq.position),'[]'::jsonb)
  from public.quiz_attempts at join public.quiz_attempt_questions aq on aq.attempt_id=at.id join public.quiz_questions q on q.id=aq.question_id
  join public.quiz_options o on o.question_id=q.id and o.is_correct left join public.quiz_attempt_answers a on a.attempt_id=at.id and a.question_id=q.id
  where at.id=p_attempt_id and at.user_id=auth.uid() and at.status='submitted' and (select allow_review from public.quizzes where id=at.quiz_id)
$$;

create function public.set_quiz_leaderboard_opt_in(p_display_name text,p_opted_in boolean) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  insert into public.quiz_leaderboard_opt_ins(user_id,display_name,opted_in) values(auth.uid(),left(trim(p_display_name),32),p_opted_in)
  on conflict(user_id) do update set display_name=excluded.display_name,opted_in=excluded.opted_in,updated_at=now();
end $$;

create function public.get_quiz_leaderboard(p_quiz_id uuid) returns table(display_name text,score_percent int,submitted_at timestamptz,rank bigint) language sql security definer set search_path=public,pg_temp as $$
  with best_attempts as (
    select distinct on(a.user_id) o.display_name,a.score_percent,a.submitted_at
    from public.quiz_attempts a join public.quiz_leaderboard_opt_ins o on o.user_id=a.user_id and o.opted_in
    join public.quizzes q on q.id=a.quiz_id and q.status='published' and q.leaderboard_enabled
    where a.quiz_id=p_quiz_id and a.status='submitted' order by a.user_id,a.score_percent desc,a.submitted_at asc
  ) select display_name,score_percent,submitted_at,dense_rank() over(order by score_percent desc,submitted_at asc)
    from best_attempts order by score_percent desc,submitted_at asc limit 100
$$;

create function public.get_my_quiz_topic_scores(p_since timestamptz default null) returns table(topic text,correct bigint,total bigint,accuracy numeric) language sql security definer set search_path=public,pg_temp as $$
  select q.topic,count(*) filter(where a.selected_option_id=o.id),count(*),round(100.0*count(*) filter(where a.selected_option_id=o.id)/count(*),1)
  from public.quiz_attempts at join public.quiz_attempt_questions aq on aq.attempt_id=at.id
  join public.quiz_questions q on q.id=aq.question_id join public.quiz_options o on o.question_id=q.id and o.is_correct
  left join public.quiz_attempt_answers a on a.attempt_id=at.id and a.question_id=q.id
  where at.user_id=auth.uid() and at.status='submitted' and (p_since is null or at.submitted_at>=p_since)
  group by q.topic order by 4 asc,3 desc
$$;

create function public.get_quiz_admin_metrics() returns table(quiz_id uuid,title text,attempts bigint,submitted bigint,average_score numeric) language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_careerforge_admin() then raise exception 'Administrator access required'; end if;
  return query select q.id,q.title,count(a.id),count(a.id) filter(where a.status='submitted'),round(avg(a.score_percent) filter(where a.status='submitted'),1)
    from public.quizzes q left join public.quiz_attempts a on a.quiz_id=q.id group by q.id,q.title order by q.title;
end $$;

revoke all on function public.start_quiz_attempt(uuid),public.save_quiz_answers(uuid,jsonb),public.submit_quiz_attempt(uuid),public.quiz_result_review(uuid),public.set_quiz_leaderboard_opt_in(text,boolean),public.get_quiz_leaderboard(uuid),public.get_my_quiz_topic_scores(timestamptz),public.get_quiz_admin_metrics() from public;
grant execute on function public.start_quiz_attempt(uuid),public.save_quiz_answers(uuid,jsonb),public.submit_quiz_attempt(uuid),public.quiz_result_review(uuid),public.set_quiz_leaderboard_opt_in(text,boolean),public.get_quiz_leaderboard(uuid),public.get_my_quiz_topic_scores(timestamptz),public.get_quiz_admin_metrics() to authenticated;
grant select on public.quiz_categories,public.quizzes to anon,authenticated;
grant select,insert,update,delete on public.quiz_categories,public.quizzes,public.quiz_questions,public.quiz_options to authenticated;
grant select on public.quiz_attempts,public.quiz_attempt_questions,public.quiz_attempt_answers,public.quiz_leaderboard_opt_ins to authenticated;
grant insert,update,delete on public.quiz_leaderboard_opt_ins to authenticated;
grant select on public.quiz_admin_audit to authenticated;

-- Admin-defined configurable topics covering the requested learning areas.
insert into public.quiz_categories(slug,title,description) values
('programming-fundamentals','Programming Fundamentals','Core problem solving and programming concepts.'),('data-structures-algorithms','Data Structures and Algorithms','Common structures, complexity and algorithms.'),('web-development','Web Development','Web platform, HTML, CSS and browser fundamentals.'),
('python','Python','Python syntax and common patterns.'),('java','Java','Java language and object-oriented basics.'),('javascript','JavaScript','JavaScript language and browser APIs.'),('sql','SQL','Relational queries and data fundamentals.'),
('data-analytics','Data Analytics and Data Science','Data reasoning, statistics and analysis.'),('ai-ml','AI and Machine Learning','Core machine-learning concepts.'),('cybersecurity','Cybersecurity Fundamentals','Security concepts and safe practice.'),
('aptitude','Aptitude and Logical Reasoning','Logical reasoning and pattern recognition.'),('quantitative','Quantitative Aptitude','Numerical reasoning and quantitative basics.'),('verbal','Verbal Ability','Reading and language reasoning.'),('communication','Communication and Workplace Skills','Professional communication and collaboration.'),
('mechanical','Mechanical Engineering','Engineering mechanics and mechanical fundamentals.'),('automotive-ev','Automotive and Electric Vehicles','Vehicle and EV concepts.'),('cad-cae','CAD, CAE and Design Engineering','Design and engineering analysis fundamentals.'),('manufacturing','Manufacturing and Production','Production systems and processes.'),('quality','Quality Engineering','Quality methods and process improvement.'),
('thermal','Thermal Engineering','Thermodynamics and heat transfer.'),('electrical-electronics','Electrical and Electronics','Electrical and electronic fundamentals.'),('supply-chain','Supply Chain and Operations','Operations and supply chain reasoning.')
on conflict(slug) do nothing;

-- Optional, pseudonymous leaderboards. No identity or email fields are exposed.

