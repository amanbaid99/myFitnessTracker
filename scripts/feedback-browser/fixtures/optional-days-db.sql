-- Synthetic local fixture only. Never run against a hosted database.
do $$ begin if current_database()<>'wt_test' then raise exception 'Use throwaway wt_test';end if;end $$;
create or replace function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
insert into auth.users(id,email) values('18180000-0000-4000-8000-000000000001','optional-fixture@example.test');
set role authenticated;
set request.jwt.claim.sub='18180000-0000-4000-8000-000000000001';
select public.mark_seen(array['tour:intro','tip:log-set','tip:feel','tip:alternates','tip:edit-exercise','tour:update:nov-3-5-2026-v2']);
update public.profiles set name='Synthetic lifter',onboarded_at=now(),feedback_prompted_at=now() where id=auth.uid();
insert into public.plans(id,name,is_active,days_per_week) values('18180000-0000-4000-8000-000000000002','Strength plus optional extras',true,3);
insert into public.routines(id,plan_id,name,sort_order,is_optional) values
 ('18180000-0000-4000-8000-000000000003','18180000-0000-4000-8000-000000000002','Push',0,false),
 ('18180000-0000-4000-8000-000000000004','18180000-0000-4000-8000-000000000002','Pull',1,false),
 ('18180000-0000-4000-8000-000000000005','18180000-0000-4000-8000-000000000002','Legs',2,false),
 ('18180000-0000-4000-8000-000000000006','18180000-0000-4000-8000-000000000002','Bodyweight extras',3,true);
insert into public.exercises(id,name,equipment,muscle_groups,tracking,warmup_enabled) values
 ('18180000-0000-4000-8000-000000000007','Push-up','bodyweight',array['chest','triceps'],'reps',false),
 ('18180000-0000-4000-8000-000000000008','Row','machine',array['lats'],'reps',false),
 ('18180000-0000-4000-8000-000000000009','Squat','barbell',array['quads'],'reps',false),
 ('18180000-0000-4000-8000-00000000000a','Plank','bodyweight',array['core'],'time',false);
insert into public.routine_exercises(routine_id,exercise_id,sort_order,target_sets,target_reps,rest_sec) values
 ('18180000-0000-4000-8000-000000000003','18180000-0000-4000-8000-000000000007',0,3,10,60),
 ('18180000-0000-4000-8000-000000000004','18180000-0000-4000-8000-000000000008',0,3,10,60),
 ('18180000-0000-4000-8000-000000000005','18180000-0000-4000-8000-000000000009',0,3,10,60),
 ('18180000-0000-4000-8000-000000000006','18180000-0000-4000-8000-000000000007',0,2,10,0),
 ('18180000-0000-4000-8000-000000000006','18180000-0000-4000-8000-00000000000a',1,1,30,0);
insert into public.workouts(id,routine_id,started_at,ended_at) values('18180000-0000-4000-8000-000000000010','18180000-0000-4000-8000-000000000003','2026-01-01T08:00:00Z','2026-01-01T09:00:00Z');
-- More extras than the Home recent-history window. Pull must still be next.
insert into public.workouts(id,routine_id,started_at,ended_at)
select gen_random_uuid(),'18180000-0000-4000-8000-000000000006',now()-interval '210 days'+n*interval '1 day',now()-interval '210 days'+n*interval '1 day'+interval '1 hour' from generate_series(1,205) n;
reset role;
notify pgrst,'reload schema';
