-- Synthetic owner-only optional days and immutable start-time snapshots.
reset role;
insert into auth.users(id) values('18181818-0000-4000-8000-000000000001'),('18181818-0000-4000-8000-000000000002');
set role authenticated;
set request.jwt.claim.sub='18181818-0000-4000-8000-000000000001';
insert into public.plans(id,name,days_per_week,is_active) values('18181818-0000-4000-8000-000000000003','Optional-day fixture',3,true);
insert into public.routines(id,plan_id,name,sort_order,is_optional) values
 ('18181818-0000-4000-8000-000000000004','18181818-0000-4000-8000-000000000003','Push',0,false),
 ('18181818-0000-4000-8000-000000000005','18181818-0000-4000-8000-000000000003','Bodyweight extras',1,true),
 ('18181818-0000-4000-8000-000000000006','18181818-0000-4000-8000-000000000003','Pull',2,false);
insert into public.workouts(id,routine_id,counts_for_rotation) values
 ('18181818-0000-4000-8000-000000000007','18181818-0000-4000-8000-000000000004',false);
select pg_temp.expect((select counts_for_rotation from public.workouts where id='18181818-0000-4000-8000-000000000007'),'regular starts retain the normal rotation even if client sends false');
select pg_temp.expect(public.start_planned_workout('18181818-0000-4000-8000-000000000005')='18181818-0000-4000-8000-000000000007','optional start resumes an existing open workout');
update public.workouts set ended_at=now() where id='18181818-0000-4000-8000-000000000007';
select public.start_planned_workout('18181818-0000-4000-8000-000000000005');
select pg_temp.expect((select not counts_for_rotation from public.workouts where routine_id='18181818-0000-4000-8000-000000000005'),'planned optional start snapshots exemption');
select pg_temp.expect_error($$update public.workouts set counts_for_rotation=true where routine_id='18181818-0000-4000-8000-000000000005'$$,'cannot rewrite rotation snapshot');
update public.routines set is_optional=false where id='18181818-0000-4000-8000-000000000005';
select pg_temp.expect((select not counts_for_rotation from public.workouts where routine_id='18181818-0000-4000-8000-000000000005'),'day reclassification does not reinterpret its open workout');
insert into public.exercises(id,name,equipment,muscle_groups) values('18181818-0000-4000-8000-000000000008','Optional push-up','bodyweight',array['chest']);
insert into public.sets(id,workout_id,exercise_id,set_no,reps)
select gen_random_uuid(),w.id,'18181818-0000-4000-8000-000000000008',n,10 from public.workouts w cross join generate_series(1,6) n where w.routine_id='18181818-0000-4000-8000-000000000005';
update public.workouts set ended_at=now() where routine_id='18181818-0000-4000-8000-000000000005';
select pg_temp.expect((select sum(sets)=6 from public.workout_muscle_sets where user_id=auth.uid() and muscle='chest'),'optional workout still counts towards muscle coverage');
select pg_temp.expect((select target=3 from public.weekly_targets where user_id=auth.uid() and week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date),'optional day does not raise weekly target');
select public.start_planned_workout('18181818-0000-4000-8000-000000000005');
select pg_temp.expect((select counts_for_rotation from public.workouts where routine_id='18181818-0000-4000-8000-000000000005' and ended_at is null),'new starts use updated day status');
update public.workouts set ended_at=now() where ended_at is null;
update public.routines set is_optional=true where id='18181818-0000-4000-8000-000000000005';
-- Existing custom-workout starts and older direct inserts also use the trigger.
select public.use_custom_workout('18181818-0000-4000-8000-000000000009',true,0,'Extra variation','[{"id":"s","exercise_id":"18181818-0000-4000-8000-000000000008","tracking":"reps","sets":2,"reps":10}]','18181818-0000-4000-8000-000000000005');
select pg_temp.expect((select routine_id is null from public.workouts where id='18181818-0000-4000-8000-000000000009'),'today-only variations retain their existing no-rotation behavior');
update public.workouts set ended_at=now() where id='18181818-0000-4000-8000-000000000009';
insert into public.workouts(id,routine_id) values('18181818-0000-4000-8000-00000000000a','18181818-0000-4000-8000-000000000005');
select pg_temp.expect((select not counts_for_rotation from public.workouts where id='18181818-0000-4000-8000-00000000000a'),'older direct starts snapshot optional status');
set request.jwt.claim.sub='18181818-0000-4000-8000-000000000002';
with changed as(update public.routines set is_optional=false where id='18181818-0000-4000-8000-000000000005' returning 1)
select pg_temp.expect((select count(*) from changed)=0,'cannot toggle another owner day');
select pg_temp.expect((select count(*) from public.workouts where id='18181818-0000-4000-8000-00000000000a')=0,'optional history remains private');
select pg_temp.expect_error($$insert into public.workouts(routine_id) values('18181818-0000-4000-8000-000000000005')$$,'cannot start another owner optional day');
reset role;
