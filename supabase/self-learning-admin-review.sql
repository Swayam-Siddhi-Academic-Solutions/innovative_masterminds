create function public.im_sl_review_data(p_owner uuid,p_view text,p_search text,p_page integer,p_chapter text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; skip_rows integer:=20*p_page;
begin
 if not exists(select 1 from public.im_paper_admins where user_id=p_owner) then raise exception 'Owner access is required.'; end if;
 if p_page not between 0 and 10000 or length(p_search)>150 then raise exception 'Invalid page or search.'; end if;
 if p_view='chapter' then
 select jsonb_build_object('title',c.title,'board',c.board,'grade',c.grade,'challenge',c.challenge,'lessons',jsonb_agg(jsonb_build_object('title',l.title,'body',u.body) order by l.position)) into result from public.im_sl_chapters c join public.im_sl_lessons l on l.chapter_id=c.id join public.im_sl_units u on u.id=l.unit_id where c.id=p_chapter group by c.id;
 return coalesce(result,'{}'::jsonb);
 end if;
 if p_view not in ('chapters','learners','payments','choices','progress') then raise exception 'Unknown data view.'; end if;
 with records as (
 select c.id sortkey, jsonb_build_object('Chapter',c.title,'Curriculum',c.board,'Class',c.grade) fields,c.id chapter from public.im_sl_chapters c where p_view='chapters'
 union all select l.id::text,jsonb_build_object('Learner',l.name,'Email',l.email,'Registered',l.created_at),null from public.im_sl_learners l where p_view='learners'
 union all select s.id::text,jsonb_build_object('Learner',l.name,'Email',l.email,'Amount (INR)',s.amount,'Payer',s.payer,'Reference',s.utr,'Status',case when s.ends_at<=now() then 'expired' else s.status end,'Starts',s.starts_at,'Expires',s.ends_at),null from public.im_sl_passes s join public.im_sl_learners l on l.id=s.learner_id where p_view='payments'
 union all select k.pass_id::text||c.id,jsonb_build_object('Learner',l.name,'Email',l.email,'Chapter',c.title,'Class',c.grade,'Curriculum',c.board,'Chosen',k.picked_at),null from public.im_sl_picks k join public.im_sl_chapters c on c.id=k.chapter_id join public.im_sl_passes s on s.id=k.pass_id join public.im_sl_learners l on l.id=s.learner_id where p_view='choices'
 union all select l.id::text||c.id||g.unit_id,jsonb_build_object('Learner',l.name,'Email',l.email,'Chapter',c.title,'Lesson',u.title,'Completed',g.completed_at),null from public.im_sl_progress g join public.im_sl_chapters c on c.id=g.chapter_id join public.im_sl_lessons u on u.chapter_id=c.id and u.unit_id=g.unit_id join public.im_sl_learners l on l.id=g.learner_id where p_view='progress'
 ), matches as (select * from records where strpos(lower(fields::text),lower(p_search))>0), page as (select * from matches order by coalesce(fields->>'Chapter',fields->>'Learner'),sortkey limit 20 offset skip_rows)
 select jsonb_build_object('total',(select count(*) from matches),'rows',coalesce((select jsonb_agg(jsonb_build_object('fields',fields,'chapter',chapter) order by coalesce(fields->>'Chapter',fields->>'Learner'),sortkey) from page),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.im_sl_review_data(uuid,text,text,integer,text) from public, anon, authenticated;
grant execute on function public.im_sl_review_data(uuid,text,text,integer,text) to service_role;