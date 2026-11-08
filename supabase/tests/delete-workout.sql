-- Deleting and renaming finished workouts. Synthetic accounts only.
reset role;
insert into auth.users(id) values('99999999-9999-9999-9999-999999999995'),('99999999-9999-9999-9999-999999999996');
set role authenticated;
set request.jwt.claim.sub='99999999-9999-9999-9999-999999999995';
insert into public.exercises(id,name,equipment) values('99999999-0000-0000-0000-0000000000e1','Delete Test Row','cable');
insert into public.workouts(id,started_at,ended_at) values('99999999-0000-0000-0000-0000000000f1',now()-interval '2 hours',now()-interval '1 hour');
insert into public.workouts(id,started_at) values('99999999-0000-0000-0000-0000000000f2',now()-interval '10 minutes');
insert into public.sets(id,workout_id,exercise_id,set_no,weight_kg,reps) values
 (gen_random_uuid(),'99999999-0000-0000-0000-0000000000f1','99999999-0000-0000-0000-0000000000e1',1,50,10),
 (gen_random_uuid(),'99999999-0000-0000-0000-0000000000f1','99999999-0000-0000-0000-0000000000e1',2,55,8);
update public.workouts set title='Back day' where id='99999999-0000-0000-0000-0000000000f1';
select pg_temp.expect((select title from public.workouts where id='99999999-0000-0000-0000-0000000000f1')='Back day','the owner renames a workout');
select pg_temp.expect_error($$update public.workouts set title='  ' where id='99999999-0000-0000-0000-0000000000f1'$$,'a name cannot be blank');
select pg_temp.expect_error($$select public.delete_workout('99999999-0000-0000-0000-0000000000f2')$$,'an open workout is discarded, not deleted');

set request.jwt.claim.sub='99999999-9999-9999-9999-999999999996';
select pg_temp.expect_error($$select public.delete_workout('99999999-0000-0000-0000-0000000000f1')$$,'another user cannot delete the workout');
with u as (update public.workouts set title='Hacked' where id='99999999-0000-0000-0000-0000000000f1' returning 1)
select pg_temp.expect((select count(*) from u)=0,'another user cannot rename the workout');

set request.jwt.claim.sub='99999999-9999-9999-9999-999999999995';
select pg_temp.expect((select count(*) from public.exercise_prs where exercise_id='99999999-0000-0000-0000-0000000000e1')=1,'before deleting, the workout sets a record');
select public.delete_workout('99999999-0000-0000-0000-0000000000f1');
select pg_temp.expect(
 (select cancelled_at is not null from public.workouts where id='99999999-0000-0000-0000-0000000000f1') and
 (select count(*) from public.sets where workout_id='99999999-0000-0000-0000-0000000000f1' and deleted_at is null)=0 and
 (select count(*) from public.sets where workout_id='99999999-0000-0000-0000-0000000000f1')=2 and
 (select count(*) from public.exercise_prs where exercise_id='99999999-0000-0000-0000-0000000000e1')=0,
 'deleting a workout hides it and its sets everywhere without erasing them');
select pg_temp.expect_error($$select public.delete_workout('99999999-0000-0000-0000-0000000000f1')$$,'a deleted workout cannot be deleted again');
reset role;
set role anon;
select pg_temp.expect_error($$select public.delete_workout(gen_random_uuid())$$,'anon cannot delete workouts');
reset role;
