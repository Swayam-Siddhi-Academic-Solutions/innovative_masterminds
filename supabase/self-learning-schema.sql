-- Paid Self Learning. Only the Edge Function may invoke these invoker-rights routines.
create table public.im_sl_release (
  singleton boolean primary key default true check (singleton),
  accepting boolean not null default false
);
insert into public.im_sl_release(singleton) values (true);

create table public.im_sl_units (
  id text primary key,
  body jsonb not null check (jsonb_typeof(body) = 'object' and body ?& array['teach','example','steps','question','answer','why','tip'])
);
create table public.im_sl_chapters (
  id text primary key, board text not null, grade text not null, title text not null,
  challenge jsonb not null check (jsonb_typeof(challenge)='object' and challenge ?& array['question','solution']),
  unique (board, grade, title)
);
create table public.im_sl_lessons (
  chapter_id text not null references public.im_sl_chapters,
  unit_id text not null references public.im_sl_units,
  position smallint not null check (position > 0), title text not null,
  primary key (chapter_id, unit_id), unique (chapter_id, position)
);
create index im_sl_lessons_unit_idx on public.im_sl_lessons(unit_id);
create table public.im_sl_learners (
  id uuid primary key default gen_random_uuid(), key_hash text unique not null check (key_hash ~ '^[a-f0-9]{64}$'),
  email text not null, name text not null, created_at timestamptz not null default now()
);
create index im_sl_learners_email_idx on public.im_sl_learners(email);
create table public.im_sl_passes (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.im_sl_learners,
  amount smallint not null default 599 check (amount = 599),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','in_review','needs_reference','approved')),
  payer text, utr text unique, review_note text, submitted_at timestamptz,
  starts_at timestamptz, ends_at timestamptz, reviewed_by uuid references auth.users,
  created_at timestamptz not null default now(),
  check ((status='approved' and starts_at is not null and ends_at = starts_at + interval '720 hours' and ends_at is not null)
      or (status <> 'approved' and starts_at is null and ends_at is null)),
  check (status='awaiting_payment' or (payer is not null and utr is not null and submitted_at is not null))
);
create index im_sl_passes_learner_idx on public.im_sl_passes(learner_id,created_at desc);
create index im_sl_passes_queue_idx on public.im_sl_passes(status,submitted_at);
create index im_sl_passes_reviewer_idx on public.im_sl_passes(reviewed_by);
create table public.im_sl_picks (
  pass_id uuid not null references public.im_sl_passes, chapter_id text not null references public.im_sl_chapters,
  picked_at timestamptz not null default now(), primary key (pass_id, chapter_id)
);
create index im_sl_picks_chapter_idx on public.im_sl_picks(chapter_id);
create table public.im_sl_progress (
  learner_id uuid not null references public.im_sl_learners,
  chapter_id text not null, unit_id text not null, completed_at timestamptz not null default now(),
  primary key (learner_id, chapter_id, unit_id),
  foreign key (chapter_id, unit_id) references public.im_sl_lessons(chapter_id, unit_id)
);
create index im_sl_progress_lesson_idx on public.im_sl_progress(chapter_id,unit_id);

create function public.im_sl_catalog() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('accepting',(select accepting from public.im_sl_release where singleton),
    'chapters',coalesce(jsonb_agg(to_jsonb(s) order by s.board,s.grade,s.title),'[]'::jsonb))
  from (
    select c.id,c.title,c.board,c.grade,array_agg(l.title order by l.position) as lessons
    from public.im_sl_chapters c join public.im_sl_lessons l on l.chapter_id=c.id group by c.id
  ) s;
$$;

create function public.im_sl_student(p_action text,p_hash text,p_email text,p_data jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  learner public.im_sl_learners%rowtype;
  pass public.im_sl_passes%rowtype;
  chapter text := p_data->>'chapter';
  unit text := p_data->>'unit';
  ref text := p_data->>'ref';
  named text := p_data->>'name';
  payer_name text := p_data->>'payer';
  ready boolean; picks jsonb; detail jsonb;
begin
  if p_action not in ('register','status','payment','renew','pick','open','complete') then raise exception 'Unknown request.'; end if;
  select accepting into ready from public.im_sl_release where singleton;
  if p_action='register' then
    if p_hash !~ '^[0-9a-f]{64}$' or length(named) not between 1 and 90 or named is null
       or length(p_email)>180 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
       then raise exception 'Check your name and email address.'; end if;
    select * into learner from public.im_sl_learners where key_hash=p_hash for update;
    if not found then
      if not ready then raise exception 'New passes are currently paused.'; end if;
      insert into public.im_sl_learners(key_hash,email,name) values(p_hash,p_email,named)
        on conflict(key_hash) do nothing;
    end if;
  end if;
  -- Serializes checkout retries, renewals, chapter picks and progress for a single learner.
  select * into learner from public.im_sl_learners where key_hash=p_hash and email=p_email for update;
  if not found then raise exception 'The email and learning key do not match.'; end if;
  select * into pass from public.im_sl_passes where learner_id=learner.id order by created_at desc,ends_at desc nulls first,id limit 1 for update;
  if (pass.id is null and p_action='register') or (p_action='renew' and pass.ends_at<=now()) then
    if not ready then raise exception 'New passes are currently paused.'; end if;
    insert into public.im_sl_passes(learner_id) values(learner.id) returning * into pass;
  end if;
  if pass.id is null then raise exception 'Pass unavailable.'; end if;
  -- Bind actions to the specific pass the learner saw, including retries received after renewal.
  if p_action in ('pick','complete','open','payment') and p_data->>'pass' is distinct from pass.id::text then
    raise exception 'Refresh your pass and try again.';
  end if;
  if p_action='payment' then
    if ref is null or ref !~ '^[A-Z0-9]{8,35}$' or payer_name is null or length(payer_name) not between 1 and 90 then raise exception 'Enter the payer name and a valid transaction reference.'; end if;
    if pass.status in ('awaiting_payment','needs_reference') then
      if exists (select 1 from public.im_paper_orders where utr=ref) then raise exception 'This reference is already on a payment record. Contact us for help.'; end if;
      begin
        update public.im_sl_passes set payer=payer_name,utr=ref,submitted_at=now(),status='in_review',review_note=null
          where id=pass.id returning * into pass;
      exception when unique_violation then raise exception 'This reference is already on a payment record. Contact us for help.';
      end;
    elsif pass.utr is distinct from ref then raise exception 'This pass already has a submitted reference. Contact us for help.';
    end if;
  end if;
  if p_action in ('pick','open','complete') then
    if pass.status<>'approved' or not (pass.starts_at<=now() and now()<pass.ends_at) then
      raise exception 'An active, payment-approved pass is required.';
    end if;
    if not exists(select 1 from public.im_sl_lessons where chapter_id=chapter) then raise exception 'Choose a listed chapter.'; end if;
    if not exists(select 1 from public.im_sl_picks where pass_id=pass.id and chapter_id=chapter) then
      if p_action<>'pick' then raise exception 'Choose this chapter on your pass first.'; end if;
      if (select count(*) from public.im_sl_picks where pass_id=pass.id)>=10 then raise exception 'All 10 chapters on this pass have been chosen.'; end if;
      insert into public.im_sl_picks(pass_id,chapter_id) values(pass.id,chapter);
    end if;
    if p_action='complete' then
      if not exists(select 1 from public.im_sl_lessons l where l.chapter_id=chapter and l.unit_id=unit) then raise exception 'Choose a lesson in this chapter.'; end if;
      insert into public.im_sl_progress(learner_id,chapter_id,unit_id) values (learner.id,chapter,unit) on conflict do nothing;
    end if;
    if p_action='open' then
      select jsonb_build_object('id',c.id,'board',c.board,'grade',c.grade,'title',c.title,'endsAt',pass.ends_at,'challenge',c.challenge,
          'lessons',jsonb_agg(jsonb_build_object('id',l.unit_id,'title',l.title,'body',u.body,'complete',p.unit_id is not null) order by l.position))
        into detail from public.im_sl_chapters c join public.im_sl_lessons l on l.chapter_id=c.id
        join public.im_sl_units u on u.id=l.unit_id left join public.im_sl_progress p
        on p.learner_id=learner.id and p.chapter_id=c.id and p.unit_id=l.unit_id where c.id=chapter group by c.id;
      return detail;
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'grade',c.grade,'board',c.board,
      'total',(select count(*) from public.im_sl_lessons l where l.chapter_id=c.id),
      'done',(select count(*) from public.im_sl_progress p where p.learner_id=learner.id and p.chapter_id=c.id)) order by k.picked_at,c.title),'[]'::jsonb)
    into picks from public.im_sl_picks k join public.im_sl_chapters c on c.id=k.chapter_id where k.pass_id=pass.id;
  return jsonb_build_object('id',pass.id,'name',learner.name,'email',learner.email,'amount',pass.amount,'status',
    case when pass.ends_at<=now() then 'expired' else pass.status end,'startsAt',pass.starts_at,'endsAt',pass.ends_at,
    'reference',pass.utr,'reviewNote',pass.review_note,'chapters',picks);
end;
$$;

create function public.im_sl_staff(p_owner uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare target public.im_sl_passes%rowtype; result jsonb; search_email text := nullif(p_data->>'email',''); stamp timestamptz := now();
begin
  if not exists(select 1 from public.im_paper_admins where user_id=p_owner) then raise exception 'Owner access is required.'; end if;
  if p_action='list' then
    select coalesce(jsonb_agg(to_jsonb(q) order by q.priority,q.submitted_at nulls last,q.created_at desc),'[]'::jsonb)
      into result from (select s.id,s.amount,s.utr,s.payer,s.submitted_at,s.starts_at,s.ends_at,s.created_at,s.review_note,l.email,l.name,
        case when s.ends_at<=now() then 'expired' else s.status end as status,case when s.status='in_review' then 0 else 1 end as priority,
        count(*) over() as matches from public.im_sl_passes s join public.im_sl_learners l on l.id=s.learner_id
        where (search_email is null and s.status='in_review') or l.email=search_email
        order by priority,s.submitted_at nulls last,s.created_at desc limit 100) q;
    return result;
  end if;
  perform 1 from public.im_sl_learners where id=(select learner_id from public.im_sl_passes where id=(p_data->>'pass')::uuid) for update;
  select * into target from public.im_sl_passes where id=(p_data->>'pass')::uuid for update;
  if not found then raise exception 'Pass not found.'; end if;
  if p_action='rotate' then
    if p_data->>'email' is distinct from (select email from public.im_sl_learners where id=target.learner_id)
      or coalesce(p_data->>'hash','') !~ '^[0-9a-f]{64}$' then raise exception 'Check the registered email.'; end if;
    update public.im_sl_learners set key_hash=p_data->>'hash' where id=target.learner_id;
    return jsonb_build_object('updated',true);
  end if;
  if p_data->>'ref' is distinct from target.utr or target.utr is null then raise exception 'Payment details changed. Refresh the review queue.'; end if;
  if p_action='approve' and target.status='approved' then return jsonb_build_object('updated',true); end if;
  if target.status<>'in_review' then raise exception 'Only a submitted payment can be reviewed.'; end if;
  if p_action='approve' then
    update public.im_sl_passes set status='approved',starts_at=stamp,ends_at=stamp+interval '720 hours',reviewed_by=p_owner,review_note=null where id=target.id;
  elsif p_action='issue' then
    if length(trim(coalesce(p_data->>'note',''))) not between 3 and 240 then raise exception 'Add a short explanation for the learner.'; end if;
    update public.im_sl_passes set status='needs_reference',review_note=p_data->>'note',reviewed_by=p_owner where id=target.id;
  else raise exception 'Unknown review action.';
  end if;
  return jsonb_build_object('updated',true);
end;
$$;

do $$
declare t text; r regprocedure;
begin
  foreach t in array array['im_sl_release','im_sl_units','im_sl_chapters','im_sl_lessons','im_sl_learners','im_sl_passes','im_sl_picks','im_sl_progress'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all privileges on public.%I from public, anon, authenticated',t);
    execute format('grant select,insert,update on public.%I to service_role',t);
  end loop;
  foreach r in array array['public.im_sl_catalog()'::regprocedure,'public.im_sl_student(text,text,text,jsonb)'::regprocedure,'public.im_sl_staff(uuid,text,jsonb)'::regprocedure] loop
    execute format('revoke all on function %s from public, anon, authenticated',r);
    execute format('grant execute on function %s to service_role',r);
  end loop;
end;
$$;
