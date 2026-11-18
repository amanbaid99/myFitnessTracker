-- Local compatibility fixture on all migrations BEFORE optional_plan_days.
do $$ begin if current_database()<>'wt_optional_legacy_1818' then raise exception 'Use throwaway legacy database';end if;end $$;
create or replace function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
insert into auth.users(id,email) values('18180000-0000-4000-8000-000000000001','optional-fixture@example.test');
set role authenticated;
set request.jwt.claim.sub='18180000-0000-4000-8000-000000000001';
update public.profiles set name='Synthetic lifter',onboarded_at=now(),feedback_prompted_at=now() where id=auth.uid();
select public.mark_seen(array['tour:intro','tip:log-set','tip:feel','tip:alternates','tip:edit-exercise','tour:update:nov-3-5-2026-v2']);
insert into public.plans(id,name,is_active,days_per_week) values('18180000-0000-4000-8000-000000000002','Legacy fixture',true,3);
insert into public.routines(id,plan_id,name,sort_order) values
 ('18180000-0000-4000-8000-000000000003','18180000-0000-4000-8000-000000000002','Push',0),
 ('18180000-0000-4000-8000-000000000004','18180000-0000-4000-8000-000000000002','Pull',1),
 ('18180000-0000-4000-8000-000000000005','18180000-0000-4000-8000-000000000002','Legs',2);
insert into public.workouts(id,routine_id,started_at,ended_at) values('18180000-0000-4000-8000-000000000010','18180000-0000-4000-8000-000000000003','2026-11-01T08:00:00Z','2026-11-01T09:00:00Z');
reset role;
notify pgrst,'reload schema';
