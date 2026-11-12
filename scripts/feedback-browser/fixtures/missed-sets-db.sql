-- Throwaway local database only. Never apply this fixture to a hosted project.
do $$ begin if current_database()<>'wt_test' then raise exception 'Use throwaway wt_test';end if;end $$;
create or replace function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
insert into auth.users(id) values('aaaaaaaa-0000-4000-8000-000000000001');
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-0000-4000-8000-000000000001';
insert into public.plans(id,name,is_active) values('aaaaaaaa-0000-4000-8000-000000000002','Synthetic assisted plan',true);
insert into public.routines(id,plan_id,name,sort_order) values('aaaaaaaa-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000002','Upper',1);
insert into public.exercises(id,name,equipment,muscle_groups,load_mode,default_assistance_kg,weight_step_kg,warmup_enabled,warmup_template)
values('aaaaaaaa-0000-4000-8000-000000000004','Assisted dips','machine',array['triceps','chest'],'assisted',30,5,true,'[{"pct":50,"reps":8}]');
insert into public.routine_exercises(id,routine_id,exercise_id,target_sets,target_reps,sort_order,rest_sec)
values('aaaaaaaa-0000-4000-8000-000000000005','aaaaaaaa-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000004',5,10,1,90);
insert into public.workouts(id,routine_id,started_at) values('aaaaaaaa-0000-4000-8000-000000000006','aaaaaaaa-0000-4000-8000-000000000003',now()-interval '2 hours');
insert into public.sets(id,workout_id,exercise_id,set_no,assistance_kg,reps,rpe)
select gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000006','aaaaaaaa-0000-4000-8000-000000000004',ord,kg,10,9 from unnest(array[30,20,10,0,0]) with ordinality t(kg,ord);
update public.workouts set ended_at=started_at+interval '1 hour' where id='aaaaaaaa-0000-4000-8000-000000000006';
insert into public.workouts(id,routine_id) values('aaaaaaaa-0000-4000-8000-000000000007','aaaaaaaa-0000-4000-8000-000000000003');
reset role;
notify pgrst,'reload schema';
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-0000-4000-8000-000000000001';
insert into public.exercises(id,name,equipment,per_hand) values('aaaaaaaa-0000-4000-8000-000000000011','Dumbbell press','dumbbell',true),('aaaaaaaa-0000-4000-8000-000000000012','Plank','bodyweight',false);
insert into public.workouts(id,started_at) values('aaaaaaaa-0000-4000-8000-000000000010','2026-11-08T10:00:00Z');
insert into public.sets(id,workout_id,exercise_id,set_no,weight_kg,added_kg,reps) values(gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000011',1,22.5,3.75,10),(gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000011',3,22.5,3.75,8);
insert into public.sets(id,workout_id,exercise_id,set_no,reps,assistance_kg) values(gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000004',1,10,20),(gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000004',2,8,0);
insert into public.sets(id,workout_id,exercise_id,set_no,duration_sec) values(gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-0000-4000-8000-000000000012',1,30);
update public.workouts set ended_at='2026-11-08T11:00:00Z' where id='aaaaaaaa-0000-4000-8000-000000000010';
reset role;
insert into public.insights(user_id,workout_id,kind,period_start,period_end,title,summary,details) values('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000010','workout_review','2026-11-08','2026-11-08','A useful session','Two press sets give you a baseline.','{}');
notify pgrst,'reload schema';
