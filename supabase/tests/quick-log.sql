-- Quick logs. Synthetic accounts only.
reset role;
insert into auth.users(id) values('99999999-9999-9999-9999-999999999993'),('99999999-9999-9999-9999-999999999994');
set role authenticated;
set request.jwt.claim.sub='99999999-9999-9999-9999-999999999993';
insert into public.exercises(id,name,equipment) values('99999999-0000-0000-0000-0000000000c1','Quick Push Up','bodyweight');
select pg_temp.expect(public.log_quick_workout('99999999-0000-0000-0000-0000000000d1','  Morning push-ups ',now()-interval '2 hours',10,
 '[{"exercise_id":"99999999-0000-0000-0000-0000000000c1","set_no":1,"reps":20,"rpe":9},{"exercise_id":"99999999-0000-0000-0000-0000000000c1","set_no":2,"reps":18,"rpe":9.5}]')
 ='99999999-0000-0000-0000-0000000000d1','the owner saves a quick log');
select pg_temp.expect(
 (select source='app' and quick_log and title='Morning push-ups' and ended_at=started_at+interval '10 minutes' from public.workouts where id='99999999-0000-0000-0000-0000000000d1') and
 (select count(*) from public.sets where workout_id='99999999-0000-0000-0000-0000000000d1' and set_type='working')=2,
 'a quick log is a finished app workout with its name and working sets');
select pg_temp.expect(public.log_quick_workout('99999999-0000-0000-0000-0000000000d1','Again',now()-interval '1 hour',5,
 '[{"exercise_id":"99999999-0000-0000-0000-0000000000c1","set_no":1,"reps":5}]')='99999999-0000-0000-0000-0000000000d1'
 and (select count(*) from public.workouts where quick_log)=1,'a retried save does not log twice');
select pg_temp.expect((select workouts from public.training_weekly_report(1))=0,'a short quick log does not count towards the weekly goal');
select public.log_quick_workout('99999999-0000-0000-0000-0000000000d2',null,now()-interval '1 hour',20,
 (select jsonb_agg(jsonb_build_object('exercise_id','99999999-0000-0000-0000-0000000000c1','set_no',n,'reps',10)) from generate_series(1,6) n));
select pg_temp.expect((select workouts from public.training_weekly_report(1))=1
 and (select title is null from public.workouts where id='99999999-0000-0000-0000-0000000000d2'),'a quick log with 6 working sets counts, and the name is optional');
select pg_temp.expect_error($$select public.log_quick_workout(gen_random_uuid(),'Later',now()+interval '1 hour',10,'[{"exercise_id":"99999999-0000-0000-0000-0000000000c1","set_no":1,"reps":5}]')$$,'cannot log a workout in the future');
select pg_temp.expect_error($$select public.log_quick_workout(gen_random_uuid(),'Empty',now()-interval '1 hour',10,'[]')$$,'a quick log needs sets');
select pg_temp.expect_error($$select public.log_quick_workout(gen_random_uuid(),'Long',now()-interval '9 hours',500,'[{"exercise_id":"99999999-0000-0000-0000-0000000000c1","set_no":1,"reps":5}]')$$,'duration is limited');
select pg_temp.expect(length((select title from public.workouts where id=public.log_quick_workout('99999999-0000-0000-0000-0000000000d3',repeat('x',80),now()-interval '30 minutes',10,
 '[{"exercise_id":"99999999-0000-0000-0000-0000000000c1","set_no":1,"reps":5}]')))=60,'a long name is cut to 60 characters');

set request.jwt.claim.sub='99999999-9999-9999-9999-999999999994';
select pg_temp.expect_error($$select public.log_quick_workout(gen_random_uuid(),'Theirs',now()-interval '1 hour',10,'[{"exercise_id":"99999999-0000-0000-0000-0000000000c1","set_no":1,"reps":5}]')$$,'cannot log sets of another user''s exercise');
insert into public.exercises(id,name,equipment) values('99999999-0000-0000-0000-0000000000c2','Other Push Up','bodyweight');
select pg_temp.expect_error($$select public.log_quick_workout('99999999-0000-0000-0000-0000000000d1','Hijack',now()-interval '1 hour',10,'[{"exercise_id":"99999999-0000-0000-0000-0000000000c2","set_no":1,"reps":5}]')$$,
 'cannot reuse another user''s workout id');
select pg_temp.expect((select count(*) from public.workouts where id='99999999-0000-0000-0000-0000000000d1')=0,'another user cannot see someone else''s quick log');
reset role;
set role anon;
select pg_temp.expect_error($$select public.log_quick_workout(gen_random_uuid(),'x',now(),1,'[]')$$,'anon cannot log workouts');
reset role;
