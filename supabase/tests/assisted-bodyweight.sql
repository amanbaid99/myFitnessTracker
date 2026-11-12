-- Synthetic fixtures, owner-only reads/writes and SQL-derived exclusions.
reset role;
insert into auth.users(id) values('88888888-0000-4000-8000-000000000001'),('88888888-0000-4000-8000-000000000002');
set role authenticated;
set request.jwt.claim.sub='88888888-0000-4000-8000-000000000001';
insert into public.exercises(id,name,equipment,load_mode,default_assistance_kg,muscle_groups) values('88888888-0000-4000-8000-000000000003','Assisted dips','machine','assisted',30,array['triceps']);
insert into public.workouts(id,started_at) values('88888888-0000-4000-8000-000000000004',now()-interval '1 hour');
insert into public.sets(id,workout_id,exercise_id,set_no,reps,assistance_kg) values
 ('88888888-0000-4000-8000-000000000005','88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003',1,10,30),
 ('88888888-0000-4000-8000-000000000006','88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003',2,8,0);
select pg_temp.expect_error($$insert into public.sets(id,workout_id,exercise_id,set_no,reps,assistance_kg) values(gen_random_uuid(),'88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003',3,10,-5)$$,'negative assistance rejected');
select pg_temp.expect_error($$insert into public.sets(id,workout_id,exercise_id,set_no,reps,assistance_kg,weight_kg) values(gen_random_uuid(),'88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003',3,10,20,50)$$,'help is never lifted load');
select pg_temp.expect_error($$insert into public.sets(id,workout_id,exercise_id,set_no,reps,weight_kg) values(gen_random_uuid(),'88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003',3,10,30)$$,'older clients cannot log assistance as weight');
select pg_temp.expect_error($$update public.exercises set load_mode='standard' where id='88888888-0000-4000-8000-000000000003'$$,'cannot reinterpret an open workout');
select pg_temp.expect_error($$update public.sets set assistance_kg=20 where id='88888888-0000-4000-8000-000000000005'$$,'help is append-only');
select public.correct_set('88888888-0000-4000-8000-000000000005',null,0,12,null,25);
select pg_temp.expect((select count(*) from public.sets where workout_id='88888888-0000-4000-8000-000000000004' and deleted_at is not null)=1,'correction retains original');
-- The old RPC call keeps saved help even when assistance parameter is absent.
select public.correct_set('88888888-0000-4000-8000-000000000006',null,0,9);
insert into public.sets(id,workout_id,exercise_id,set_no,set_type,reps,assistance_kg) values(gen_random_uuid(),'88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003',1,'warmup',10,40);
insert into public.sets(id,workout_id,exercise_id,set_no,set_type,reps,assistance_kg) values('88888888-0000-4000-8000-000000000009','88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003',2,'warmup',5,35);
update public.workouts set ended_at=now() where id='88888888-0000-4000-8000-000000000004';
select pg_temp.expect((select least_assistance_kg=0 and reps_at_least_assistance=9 and bodyweight_sets=1 and working_sets=2 and total_reps=21 from public.assisted_session_progress where exercise_id='88888888-0000-4000-8000-000000000003'),'progress excludes warmups and superseded corrections, preserves zero');
select pg_temp.expect((select count(*) from public.exercise_prs where exercise_id='88888888-0000-4000-8000-000000000003')=0 and (select count(*) from public.exercise_session_best where exercise_id='88888888-0000-4000-8000-000000000003')=0,'assisted sets never create estimated strength records');
select pg_temp.expect((select volume_kg is null and eligible_sets=0 and excluded_sets=2 from public.weekly_exercise_volume where exercise_id='88888888-0000-4000-8000-000000000003'),'assistance not included in volume');
select pg_temp.expect((select sets=2 from public.workout_muscle_sets where workout_id='88888888-0000-4000-8000-000000000004' and muscle='triceps'),'assisted work counts towards muscle coverage');
set request.jwt.claim.sub='88888888-0000-4000-8000-000000000002';
select pg_temp.expect((select count(*) from public.assisted_session_progress where exercise_id='88888888-0000-4000-8000-000000000003')=0,'another user cannot read assisted progress');
select pg_temp.expect_error($$select public.correct_set('88888888-0000-4000-8000-000000000009',null,0,10,null,20)$$,'another user cannot correct assisted sets');
set request.jwt.claim.sub='88888888-0000-4000-8000-000000000001';
insert into public.exercises(name,equipment,load_mode,tracking) values('Assisted dead hang reps','machine','assisted','reps');
select pg_temp.expect((select tracking='reps' from public.exercises where name='Assisted dead hang reps'),'explicit assisted mode wins over timed-name inference');
select public.log_quick_workout('88888888-0000-4000-8000-00000000000a','Assisted quick log',now()-interval '1 hour',10,
 '[{"exercise_id":"88888888-0000-4000-8000-000000000003","set_no":1,"assistance_kg":20,"reps":10},{"exercise_id":"88888888-0000-4000-8000-000000000003","set_no":2,"assistance_kg":0,"reps":8}]');
select pg_temp.expect((select count(*) from public.sets where workout_id='88888888-0000-4000-8000-00000000000a' and assistance_kg is not null and weight_kg is null)=2,'quick logging keeps positive and zero help separately');
select pg_temp.expect_error($$update public.exercises set default_assistance_kg='NaN'::numeric where id='88888888-0000-4000-8000-000000000003'$$,'NaN assistance rejected');
insert into public.exercises(id,name,equipment) values('88888888-0000-4000-8000-00000000000b','Historical standard dips','machine');
insert into public.workouts(id,started_at) values('88888888-0000-4000-8000-00000000000c',now()-interval '1 day');
insert into public.sets(id,workout_id,exercise_id,set_no,reps,weight_kg) values('88888888-0000-4000-8000-00000000000d','88888888-0000-4000-8000-00000000000c','88888888-0000-4000-8000-00000000000b',1,10,40);
update public.workouts set ended_at=started_at+interval '1 hour' where id='88888888-0000-4000-8000-00000000000c';
update public.exercises set load_mode='assisted' where id='88888888-0000-4000-8000-00000000000b';
select public.correct_set('88888888-0000-4000-8000-00000000000d',42.5,0,10);
select pg_temp.expect((select weight_kg=42.5 and assistance_kg is null from public.sets where workout_id='88888888-0000-4000-8000-00000000000c' and deleted_at is null),'older standard history stays correctable after changing future mode');
set role anon;
select pg_temp.expect_error($$select * from public.assisted_session_progress$$,'anon cannot read assisted progress');
reset role;
