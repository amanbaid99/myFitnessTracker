-- Synthetic customization accounts. No production data or AI requests.
reset role;
insert into auth.users(id) values('77777777-7777-7777-7777-777777777777'),('88888888-8888-8888-8888-888888888888');
set role authenticated;
set request.jwt.claim.sub='77777777-7777-7777-7777-777777777777';
insert into public.plans(id,name,is_active,days_per_week) values('77777777-0000-0000-0000-000000000001','Customization source',true,4);
insert into public.routines(id,plan_id,name,sort_order) values('77777777-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000001','Upper',0);
insert into public.exercises(id,name,equipment,muscle_groups,per_hand) values('77777777-0000-0000-0000-000000000003','Custom Floor Press','dumbbell',array['chest'],true);

select public.use_custom_workout('77777777-0000-0000-0000-000000000004',true,0,'Upper today',
 '[{"id":"review-slot","exercise_id":"77777777-0000-0000-0000-000000000003","name":"Custom Floor Press","tracking":"reps","sets":2,"reps":10,"rest_sec":120}]',
 '77777777-0000-0000-0000-000000000002');
select pg_temp.expect(
 (select routine_id is null from public.workouts where id='77777777-0000-0000-0000-000000000004') and
 (select items->0->>'targetSets'='2' and name='Upper today' from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000004') and
 (select count(*) from public.routines where plan_id='77777777-0000-0000-0000-000000000001')=1,
 'custom start persists the reviewed prescription without adding a day or advancing rotation');
select public.use_custom_workout('77777777-0000-0000-0000-000000000004',true,0,'Upper today',
 '[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":2,"reps":10}]');
select pg_temp.expect((select count(*) from public.workouts)=1,'custom start retry returns the same workout');
select pg_temp.expect_error($$select public.use_custom_workout('77777777-0000-0000-0000-000000000005',true,0,'Duplicate','[]')$$,'cannot start another custom workout while one is open');

insert into public.sets(id,workout_id,exercise_id,set_no,set_type,weight_kg,reps) values('77777777-0000-0000-0000-000000000006','77777777-0000-0000-0000-000000000004','77777777-0000-0000-0000-000000000003',1,'working',20,10);
select pg_temp.expect_error($$select public.use_custom_workout('77777777-0000-0000-0000-000000000004',false,1,'Upper changed','[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":2,"reps":10}]')$$,'fresh server logs cannot be silently replaced by an older review');
select public.use_custom_workout('77777777-0000-0000-0000-000000000004',false,1,'Upper changed',
 '[{"id":"review-slot","exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":2,"reps":10,"rest_sec":90},
 {"id":"hold","name":"Custom Wall Sit","equipment":"bodyweight","muscle_groups":["quads"],"per_hand":false,"tracking":"time","sets":2,"reps":45,"rest_sec":60}]',
 '77777777-0000-0000-0000-000000000002',array['77777777-0000-0000-0000-000000000003']::uuid[],'77777777-0000-0000-0000-000000000007');
select public.use_custom_workout('77777777-0000-0000-0000-000000000004',false,1,'Upper changed','[]',null,'{}','77777777-0000-0000-0000-000000000007');
select pg_temp.expect((select revision=2 and jsonb_array_length(items)=2 from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000004'),'lost apply response can be retried safely with its request id');
select pg_temp.expect((select tracking='time' from public.exercises where name='Custom Wall Sit') and (select weight_kg=20 and reps=10 and deleted_at is null from public.sets where id='77777777-0000-0000-0000-000000000006'),'customization preserves logged sets and timed tracking');
select pg_temp.expect_error($$select public.use_custom_workout('77777777-0000-0000-0000-000000000004',false,1,'Stale','[]')$$,'stale snapshot revision is rejected');
select public.set_custom_workout_rest('77777777-0000-0000-0000-000000000004','review-slot',135);
select public.set_custom_workout_rest('77777777-0000-0000-0000-000000000004','review-slot',135);
select pg_temp.expect((select items->0->>'restSec'='135' from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000004'),'rest outbox retry updates only the custom slot');
select pg_temp.expect_error($$select public.set_custom_workout_rest('77777777-0000-0000-0000-000000000004','review-slot',-1)$$,'invalid rest rejected');
select pg_temp.expect_error($$select public.resolve_custom_items('[{"name":"Orphan candidate","equipment":"bodyweight","muscle_groups":["core"],"tracking":"reps","sets":2,"reps":10},{"name":"Custom Floor Press","equipment":"barbell","muscle_groups":["chest"],"tracking":"reps","sets":2,"reps":10}]')$$,'name collisions never silently change equipment');
select pg_temp.expect(not exists(select 1 from public.exercises where name='Orphan candidate'),'failed validation rolls back exercise creation');

select public.save_custom_routines('77777777-0000-0000-0000-000000000008','77777777-0000-0000-0000-000000000001','Extra day',
 '[{"name":"Extra day","exercises":[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":2,"reps":12,"rest_sec":75}]}]');
select public.save_custom_routines('77777777-0000-0000-0000-000000000008','77777777-0000-0000-0000-000000000001','Extra day',
 '[{"name":"Extra day","exercises":[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":2,"reps":12,"rest_sec":75}]}]');
select pg_temp.expect((select count(*) from public.routines where plan_id='77777777-0000-0000-0000-000000000001')=2 and (select days_per_week=4 and is_active from public.plans where id='77777777-0000-0000-0000-000000000001'),'append day retries do not duplicate days or change weekly goal');
select public.save_custom_routines('77777777-0000-0000-0000-000000000009',null,'Adapted plan',
 '[{"name":"Adapted Upper","exercises":[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":3,"reps":8,"rest_sec":150}]}]');
select pg_temp.expect((select not is_active from public.plans where id='77777777-0000-0000-0000-000000000009') and (select per_hand and muscle_groups=array['chest'] from public.exercises where id='77777777-0000-0000-0000-000000000003'),'new copy is inactive and global exercise metadata is unchanged');

-- Future replacements retain the current and past prescriptions, not just their sets.
set request.jwt.claim.sub='77777777-7777-7777-7777-777777777777';
insert into public.exercises(id,name,equipment,muscle_groups) values('77777777-0000-0000-0000-000000000012','Custom Push-up','bodyweight',array['chest']);
insert into public.routine_exercises(id,routine_id,exercise_id,sort_order,target_sets,target_reps,rest_sec)
 values('77777777-0000-0000-0000-000000000011','77777777-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000003',1,4,8,150);
insert into public.routine_exercise_alternates(routine_exercise_id,exercise_id,sort_order)
 values('77777777-0000-0000-0000-000000000011','77777777-0000-0000-0000-000000000012',0);
update public.routines set warmup=array['Arm circles'],cooldown=array['Easy walk'] where id='77777777-0000-0000-0000-000000000002';
insert into public.workouts(id,routine_id,ended_at) values
 ('77777777-0000-0000-0000-000000000013','77777777-0000-0000-0000-000000000002',null),
 ('77777777-0000-0000-0000-000000000014','77777777-0000-0000-0000-000000000002',now());
insert into public.sets(id,workout_id,exercise_id,set_no,set_type,weight_kg,reps)
 values(gen_random_uuid(),'77777777-0000-0000-0000-000000000013','77777777-0000-0000-0000-000000000003',1,'warmup',10,5);
do $$
declare d jsonb:='[{"name":"Upper adapted","exercises":[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":2,"reps":12,"rest_sec":75}]}]';
 expected jsonb:='[{"id":"77777777-0000-0000-0000-000000000002","name":"Upper","warmup":["Arm circles"],"cooldown":["Easy walk"],"items":[{"id":"77777777-0000-0000-0000-000000000011","exerciseId":"77777777-0000-0000-0000-000000000003","sets":4,"reps":8,"restSec":150,"alternateIds":["77777777-0000-0000-0000-000000000012"]}]}]';
 response jsonb;
begin
 response:=public.save_custom_routines('77777777-0000-0000-0000-000000000015','77777777-0000-0000-0000-000000000001','Upper adapted',d,
  array['77777777-0000-0000-0000-000000000002']::uuid[],expected,'77777777-0000-0000-0000-000000000013');
 perform pg_temp.expect(response->>'workout_revision'='1','future save returns the current preserved workout revision');
 perform public.save_custom_routines('77777777-0000-0000-0000-000000000015','77777777-0000-0000-0000-000000000001','Upper adapted',d,
  array['77777777-0000-0000-0000-000000000002']::uuid[],expected,'77777777-0000-0000-0000-000000000013');
 begin
  perform public.save_custom_routines('77777777-0000-0000-0000-000000000016','77777777-0000-0000-0000-000000000001','Stale',d,
   array['77777777-0000-0000-0000-000000000002']::uuid[],expected);
  raise exception 'FAIL: stale replacement accepted';
 exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select pg_temp.expect((select count(*) from public.routines where plan_id='77777777-0000-0000-0000-000000000001')=2 and
 (select name='Upper adapted' and sort_order=0 from public.routines where id='77777777-0000-0000-0000-000000000002') and
 (select count(*)=1 and max(target_sets)=2 and max(target_reps)=12 and max(rest_sec)=75 from public.routine_exercises where routine_id='77777777-0000-0000-0000-000000000002'),
 'replacement keeps the day identity and rotation position while updating only future targets');
select pg_temp.expect((select has_prescription and name='Upper' and items->0->>'targetSets'='4' and items->0->>'restSec'='150' and items->0->'alternateIds'='["77777777-0000-0000-0000-000000000012"]'::jsonb
 and warmup=array['Arm circles'] and cooldown=array['Easy walk'] from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000013'),
 'open workouts retain their current preparation, targets, slots and alternates');
select pg_temp.expect((select not has_prescription and name='Upper' and items='[]'::jsonb and warmup is null and cooldown is null
 from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000014'),
 'older finished workouts keep their name without inventing historical targets');
select pg_temp.expect((select count(*) from public.sets where workout_id='77777777-0000-0000-0000-000000000013' and deleted_at is null)=1
 and (select days_per_week=4 and is_active from public.plans where id='77777777-0000-0000-0000-000000000001'),
 'future replacement does not touch warm-up logs, current goal or active plan');
select public.set_custom_workout_rest('77777777-0000-0000-0000-000000000013','77777777-0000-0000-0000-000000000011',135);
select pg_temp.expect((select items->0->>'restSec'='135' from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000013')
 and (select rest_sec=75 from public.routine_exercises where routine_id='77777777-0000-0000-0000-000000000002'),
 'a queued old rest edit applies to its preserved session, not the new future day');
select pg_temp.expect_error($$select public.replace_custom_workout_exercise('77777777-0000-0000-0000-000000000013','77777777-0000-0000-0000-000000000011','77777777-0000-0000-0000-000000000003','77777777-0000-0000-0000-000000000012')$$,'logged warm-ups protect the current exercise');
select public.replace_custom_workout_exercise('77777777-0000-0000-0000-000000000004','hold',(select id from public.exercises where name='Custom Wall Sit'),'77777777-0000-0000-0000-000000000012');
select public.replace_custom_workout_exercise('77777777-0000-0000-0000-000000000004','hold',(select id from public.exercises where name='Custom Wall Sit'),'77777777-0000-0000-0000-000000000012');
select pg_temp.expect((select revision=3 and items->1->>'exerciseId'='77777777-0000-0000-0000-000000000012' and items->1->>'targetReps'='10' from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000004'),'known exercise replacement retries do not duplicate or change logs');
select pg_temp.expect_error($$update public.workout_customizations set user_id='88888888-8888-8888-8888-888888888888' where workout_id='77777777-0000-0000-0000-000000000013'$$,'snapshot ownership cannot be reassigned');
select pg_temp.expect_error($$update public.customization_saves set payload='{}'$$,'accepted save requests are append-only');
-- A whole-plan update is all-or-nothing, including when its later day fails.
set request.jwt.claim.sub='77777777-7777-7777-7777-777777777777';
do $$
declare expected jsonb; days jsonb:='[
 {"name":"Upper final","exercises":[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":3,"reps":10,"rest_sec":90}]},
 {"name":"Extra final","exercises":[{"exercise_id":"77777777-0000-0000-0000-000000000012","tracking":"reps","sets":2,"reps":12,"rest_sec":60}]}]';
begin
 select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'warmup',r.warmup,'cooldown',r.cooldown,
  'items',(select jsonb_agg(jsonb_build_object('id',re.id,'exerciseId',re.exercise_id,'sets',re.target_sets,'reps',re.target_reps,'restSec',re.rest_sec,'alternateIds','[]'::jsonb) order by re.sort_order,re.id) from public.routine_exercises re where re.routine_id=r.id)) order by r.sort_order)
 into expected from public.routines r where r.plan_id='77777777-0000-0000-0000-000000000001';
 begin
  perform public.save_custom_routines('77777777-0000-0000-0000-000000000017','77777777-0000-0000-0000-000000000001','Rejected multi-day',days,
   array['77777777-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000099']::uuid[],expected);
  raise exception 'FAIL: partial multi-day update accepted';
 exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
 perform pg_temp.expect((select name='Upper adapted' from public.routines where id='77777777-0000-0000-0000-000000000002'),
  'a later-day failure rolls back the first day update');
 perform public.save_custom_routines('77777777-0000-0000-0000-000000000018','77777777-0000-0000-0000-000000000001','Whole plan',days,
  array['77777777-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000008']::uuid[],expected);
 perform public.save_custom_routines('77777777-0000-0000-0000-000000000018','77777777-0000-0000-0000-000000000001','Whole plan',days,
  array['77777777-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000008']::uuid[],expected);
 perform pg_temp.expect((select string_agg(name,',' order by sort_order)='Upper final,Extra final' from public.routines where plan_id='77777777-0000-0000-0000-000000000001'),
  'whole-plan replacement updates each selected day once and retains their order');
end $$;
select pg_temp.expect(public.start_planned_workout('77777777-0000-0000-0000-000000000002') in
 ('77777777-0000-0000-0000-000000000004','77777777-0000-0000-0000-000000000013'),
 'planned start resumes an existing session, including a custom one');
select pg_temp.expect_error($$select public.remove_custom_workout_exercise('77777777-0000-0000-0000-000000000004','review-slot')$$,'logged work cannot be removed from a custom prescription');
select public.remove_custom_workout_exercise('77777777-0000-0000-0000-000000000004','hold');
select public.remove_custom_workout_exercise('77777777-0000-0000-0000-000000000004','hold');
select pg_temp.expect((select jsonb_array_length(items)=1 and items->0->>'id'='review-slot' from public.workout_customizations where workout_id='77777777-0000-0000-0000-000000000004'),'removal retries leave all other prescribed and logged work intact');
set request.jwt.claim.sub='88888888-8888-8888-8888-888888888888';
select pg_temp.expect((select count(*) from public.customization_saves)=0,'save requests are owner-only');
select pg_temp.expect_error($$select public.freeze_routine_workouts('77777777-0000-0000-0000-000000000002')$$,'other owners cannot freeze another day');
select pg_temp.expect_error($$select public.replace_custom_workout_exercise('77777777-0000-0000-0000-000000000013','77777777-0000-0000-0000-000000000011','77777777-0000-0000-0000-000000000003','77777777-0000-0000-0000-000000000012')$$,'other owners cannot replace private exercises');

set request.jwt.claim.sub='88888888-8888-8888-8888-888888888888';
select pg_temp.expect((select count(*) from public.workout_customizations)=0,'other owner cannot read custom workouts');
select pg_temp.expect_error($$select public.use_custom_workout('77777777-0000-0000-0000-000000000004',false,2,'Foreign','[]')$$,'other owner cannot adapt a workout');
select pg_temp.expect_error($$select public.set_custom_workout_rest('77777777-0000-0000-0000-000000000004','review-slot',90)$$,'other owner cannot change custom rest');
select pg_temp.expect_error($$select public.save_custom_routines(gen_random_uuid(),'77777777-0000-0000-0000-000000000001','Foreign','[{"name":"x","exercises":[]}]')$$,'other owner cannot append to a plan');
select pg_temp.expect_error($$select public.resolve_custom_items('[{"exercise_id":"77777777-0000-0000-0000-000000000003","tracking":"reps","sets":2,"reps":10}]')$$,'other owner cannot reuse private exercise ids');
reset role;
set role anon;
select pg_temp.expect((select count(*) from public.workout_customizations)=0,'anonymous cannot read custom workouts');
select pg_temp.expect_error($$select public.use_custom_workout(gen_random_uuid(),true,0,'Anonymous','[]')$$,'anonymous cannot start custom workouts');
select pg_temp.expect_error($$select public.save_custom_routines(gen_random_uuid(),null,'Anonymous','[]')$$,'anonymous cannot save plans');
reset role;
