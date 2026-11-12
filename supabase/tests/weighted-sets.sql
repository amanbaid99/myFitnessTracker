-- One assisted exercise, three kinds of set: assisted, bodyweight, weighted.
reset role;
insert into auth.users(id) values('99999999-0000-4000-8000-000000000001');
set role authenticated;
set request.jwt.claim.sub='99999999-0000-4000-8000-000000000001';
insert into public.exercises(id,name,equipment,load_mode,default_assistance_kg) values('99999999-0000-4000-8000-000000000002','Assisted dips mixed','machine','assisted',20);
insert into public.workouts(id,started_at) values('99999999-0000-4000-8000-000000000003',now()-interval '1 hour');
insert into public.sets(id,workout_id,exercise_id,set_no,reps,assistance_kg,weight_kg,added_kg) values
 (gen_random_uuid(),'99999999-0000-4000-8000-000000000003','99999999-0000-4000-8000-000000000002',1,10,20,null,0),
 (gen_random_uuid(),'99999999-0000-4000-8000-000000000003','99999999-0000-4000-8000-000000000002',2,8,0,null,0),
 (gen_random_uuid(),'99999999-0000-4000-8000-000000000003','99999999-0000-4000-8000-000000000002',3,6,null,null,10);
select pg_temp.expect((select count(*) from public.sets where workout_id='99999999-0000-4000-8000-000000000003')=3,'assisted, bodyweight and weighted sets share one exercise');
select pg_temp.expect_error($$insert into public.sets(id,workout_id,exercise_id,set_no,reps,weight_kg) values(gen_random_uuid(),'99999999-0000-4000-8000-000000000003','99999999-0000-4000-8000-000000000002',4,10,30)$$,'a base weight on an assisted exercise is still rejected');
select pg_temp.expect_error($$insert into public.sets(id,workout_id,exercise_id,set_no,reps) values(gen_random_uuid(),'99999999-0000-4000-8000-000000000003','99999999-0000-4000-8000-000000000002',4,10)$$,'bodyweight on an assisted exercise needs 0 assistance');
update public.workouts set ended_at=now() where id='99999999-0000-4000-8000-000000000003';
select pg_temp.expect((select working_sets=2 and bodyweight_sets=1 from public.assisted_session_progress where exercise_id='99999999-0000-4000-8000-000000000002'),'assisted progress reads only the assisted and bodyweight sets');
reset role;
