-- Importing workout history. Synthetic accounts only.
reset role;
insert into auth.users(id) values('99999999-9999-9999-9999-999999999991'),('99999999-9999-9999-9999-999999999992');
set role authenticated;
set request.jwt.claim.sub='99999999-9999-9999-9999-999999999991';
insert into public.exercises(id,name,equipment) values('99999999-0000-0000-0000-000000000001','Import Test Press','barbell');
insert into public.imports(id,source) values('99999999-0000-0000-0000-0000000000a1','strong');
select pg_temp.expect(public.import_workouts('99999999-0000-0000-0000-0000000000a1',
 '[{"started_at":"2026-06-01T10:00:00Z","ended_at":"2026-06-01T11:00:00Z","notes":"Felt good","sets":[
   {"exercise_id":"99999999-0000-0000-0000-000000000001","set_no":1,"set_type":"warmup","weight_kg":20,"reps":10,"logged_at":"2026-06-01T10:00:00Z"},
   {"exercise_id":"99999999-0000-0000-0000-000000000001","set_no":2,"set_type":"working","weight_kg":60,"reps":5,"logged_at":"2026-06-01T10:00:01Z"}]}]')=1,
 'the owner imports a finished workout');
select pg_temp.expect(
 (select source='sheet_import' and import_id='99999999-0000-0000-0000-0000000000a1' and ended_at is not null from public.workouts where import_id='99999999-0000-0000-0000-0000000000a1') and
 (select workouts=1 and sets=2 from public.imports where id='99999999-0000-0000-0000-0000000000a1'),
 'imported workouts are tagged and counted');
select pg_temp.expect(
 (select count(*) from public.exercise_session_best where exercise_id='99999999-0000-0000-0000-000000000001')=1 and
 (select volume_kg=300 and eligible_sets=1 from public.weekly_exercise_volume where exercise_id='99999999-0000-0000-0000-000000000001'),
 'imported working sets count for records and weekly volume, warm-ups do not');
select pg_temp.expect_error($$select public.import_workouts('99999999-0000-0000-0000-0000000000a1',
 '[{"started_at":"2026-06-02T10:00:00Z","ended_at":"2026-06-02T11:00:00Z","sets":[]}]')$$,'a workout needs sets');
with u as (update public.imports set sets=0, undone_at=now() where id='99999999-0000-0000-0000-0000000000a1' returning 1)
select pg_temp.expect((select count(*) from u)=0 and (select sets=2 and undone_at is null from public.imports where id='99999999-0000-0000-0000-0000000000a1'),
 'import counts and undo change only through the functions');
select pg_temp.expect_error($$insert into public.imports(source) values('made_up')$$,'only known import sources');

set request.jwt.claim.sub='99999999-9999-9999-9999-999999999992';
select pg_temp.expect((select count(*) from public.imports)=0,'another user cannot see the import');
select pg_temp.expect_error($$select public.import_workouts('99999999-0000-0000-0000-0000000000a1','[]')$$,'another user cannot add to the import');
insert into public.imports(id,source) values('99999999-0000-0000-0000-0000000000b1','hevy');
select pg_temp.expect_error($$select public.import_workouts('99999999-0000-0000-0000-0000000000b1',
 '[{"started_at":"2026-06-01T10:00:00Z","ended_at":"2026-06-01T11:00:00Z","sets":[{"exercise_id":"99999999-0000-0000-0000-000000000001","set_no":1,"set_type":"working","weight_kg":60,"reps":5,"logged_at":"2026-06-01T10:00:00Z"}]}]')$$,
 'cannot import sets for another user''s exercise');
select pg_temp.expect_error($$select public.undo_import('99999999-0000-0000-0000-0000000000a1')$$,'another user cannot undo the import');

set request.jwt.claim.sub='99999999-9999-9999-9999-999999999991';
select public.undo_import('99999999-0000-0000-0000-0000000000a1');
select pg_temp.expect(
 (select cancelled_at is not null from public.workouts where import_id='99999999-0000-0000-0000-0000000000a1') and
 (select undone_at is not null from public.imports where id='99999999-0000-0000-0000-0000000000a1') and
 (select count(*) from public.sets where deleted_at is null and exercise_id='99999999-0000-0000-0000-000000000001')=2 and
 (select count(*) from public.exercise_session_best where exercise_id='99999999-0000-0000-0000-000000000001')=0,
 'undo removes the import from history and records without touching sets');
select pg_temp.expect_error($$select public.import_workouts('99999999-0000-0000-0000-0000000000a1','[]')$$,'cannot add to an undone import');
reset role;
set role anon;
select pg_temp.expect((select count(*) from public.imports)=0,'anon sees no imports');
select pg_temp.expect_error($$select public.undo_import(gen_random_uuid())$$,'anon cannot undo imports');
reset role;
