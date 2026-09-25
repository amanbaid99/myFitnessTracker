-- Checks supabase/seed.sql loaded the Sheet correctly for seed@example.com,
-- and that the user sees it through RLS. Run by scripts/test-db.sh.

\set ON_ERROR_STOP 1
\o /dev/null

create function pg_temp.expect(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'ok: %', label;
end $$;
grant execute on function pg_temp.expect(boolean, text) to authenticated;

set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select pg_temp.expect(
  (select string_agg(name, ',' order by sort_order) from public.routines) = 'Push,Legs,Upper 2,Lower',
  'seed: 4 routines in rotation order');
select pg_temp.expect((select count(*) from public.exercises) = 26, 'seed: 26 exercises');
select pg_temp.expect((select count(*) from public.routine_exercises) = 26, 'seed: 26 routine slots');
select pg_temp.expect(
  (select count(*) from public.workouts where source = 'sheet_import' and notes = 'Imported from Google Sheet') = 4,
  'seed: one imported workout per routine');
select pg_temp.expect(
  (select count(*) from public.sets where set_type = 'working') = 25
  and (select count(*) from public.working_sets) = 25,
  'seed: 25 working sets, all visible in working_sets');
select pg_temp.expect(
  (select e.machine_setting from public.exercises e where e.name = 'Incline Bench Press') = '5'
  and (select count(*) from public.exercises where machine_setting is not null) = 8,
  'seed: seat settings');
select pg_temp.expect(
  (select load_kg from public.working_sets s join public.exercises e on e.id = s.exercise_id
   where e.name = 'Hip Abduction') = 26.25,
  'seed: add-on weight (22.5 + 3.75)');
select pg_temp.expect(
  (select reps is null and weight_kg = 15 from public.sets s join public.exercises e on e.id = s.exercise_id
   where e.name = 'Walking Lunge'),
  'seed: Walking Lunge weight kept, reps empty');
select pg_temp.expect(
  (select weight_kg is null and reps = 10 from public.sets s join public.exercises e on e.id = s.exercise_id
   where e.name = 'Leg Raise'),
  'seed: Leg Raise is 10 bodyweight reps');
select pg_temp.expect(
  not exists (select 1 from public.sets s join public.exercises e on e.id = s.exercise_id
              where e.name = 'Incline Dumbbell Press'),
  'seed: no set for Incline Dumbbell Press');
select pg_temp.expect(
  (select count(*) from public.exercises where per_hand) = 8
  and (select per_hand from public.exercises where name = 'Split Squat'),
  'seed: per-hand exercises');
select pg_temp.expect(
  (select string_agg(e.name, ',' order by re.sort_order)
   from public.routine_exercises re
   join public.routines r on r.id = re.routine_id
   join public.exercises e on e.id = re.exercise_id
   where r.name = 'Legs')
  = 'Leg Press,Single-Leg Dumbbell RDL,Hip Abduction,Leg Extension,Seated Calf Raise,Pallof Press',
  'seed: exercise order within a routine');

reset role;
\o
\echo 'All seed checks passed.'
