-- RLS and append-only checks. Run after auth-stub.sql and the migrations,
-- with ON_ERROR_STOP=1: any failed assertion aborts with a message.
-- Usage: pnpm test:db (see scripts/test-db.sh)

\set ON_ERROR_STOP 1
\o /dev/null

-- Helper: run a statement as the current role and assert it fails.
create function pg_temp.expect_error(stmt text, label text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL: % (statement succeeded)', label;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'ok: % (%)', label, sqlerrm;
end $$;

create function pg_temp.expect(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'ok: %', label;
end $$;

grant execute on function pg_temp.expect_error(text, text) to authenticated, anon;
grant execute on function pg_temp.expect(boolean, text) to authenticated, anon;

-- Signup trigger ------------------------------------------------------------
insert into auth.users (id, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', '{"name":"Aman"}'),
  ('22222222-2222-2222-2222-222222222222', '{}');

select pg_temp.expect(
  (select count(*) from public.profiles) = 2
  and (select name from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'Aman'
  and (select units from public.profiles limit 1) = 'kg',
  'signup trigger creates profiles with kg default');

-- User 1 builds a workout ---------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.exercises (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Incline Bench Press');
insert into public.routines (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Push');
insert into public.routine_exercises (routine_id, exercise_id, sort_order, target_sets, target_reps)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 3, 10);
insert into public.workouts (id, routine_id)
  values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001');
insert into public.sets (id, workout_id, exercise_id, set_no, set_type, weight_kg, added_kg, reps) values
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'warmup', 7.5, 0, 10),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'working', 15, 0, 8),
  ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 2, 'working', 22.5, 3.75, 14);

select pg_temp.expect(
  (select user_id from public.exercises limit 1) = '11111111-1111-1111-1111-111111111111',
  'user_id defaults to auth.uid()');

-- Metrics view --------------------------------------------------------------
select pg_temp.expect((select count(*) from public.working_sets) = 2, 'view excludes warm-ups');
select pg_temp.expect(
  (select round(e1rm_kg, 2) from public.working_sets where set_no = 1) = 19.00,
  'e1RM of 15 x 8 is 19');
select pg_temp.expect(
  (select load_kg from public.working_sets where set_no = 2) = 26.25
  and (select round(e1rm_kg, 2) from public.working_sets where set_no = 2) = 38.50,
  'added_kg counts toward load and e1RM');

-- Append-only ---------------------------------------------------------------
select pg_temp.expect_error(
  $$update public.sets set reps = 9 where id = 'dddddddd-0000-0000-0000-000000000002'$$,
  'editing a logged set is rejected');
update public.sets set deleted_at = now() where id = 'dddddddd-0000-0000-0000-000000000003';
select pg_temp.expect((select count(*) from public.working_sets) = 1, 'soft-deleted set leaves the view');
select pg_temp.expect_error(
  $$update public.sets set deleted_at = null where id = 'dddddddd-0000-0000-0000-000000000003'$$,
  'undeleting or re-editing a deleted set is rejected');

with d as (delete from public.sets returning 1)
select pg_temp.expect((select count(*) from d) = 0, 'hard delete of sets removes nothing');

with d as (delete from public.workouts where id = 'cccccccc-0000-0000-0000-000000000001' returning 1)
select pg_temp.expect((select count(*) from d) = 0, 'workout with sets cannot be deleted');

insert into public.workouts (id) values ('cccccccc-0000-0000-0000-000000000002');
with d as (delete from public.workouts where id = 'cccccccc-0000-0000-0000-000000000002' returning 1)
select pg_temp.expect((select count(*) from d) = 1, 'empty workout can be deleted');

-- User 2 sees nothing of user 1 ---------------------------------------------
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select pg_temp.expect(
  (select count(*) from public.sets) = 0
  and (select count(*) from public.working_sets) = 0
  and (select count(*) from public.workouts) = 0
  and (select count(*) from public.exercises) = 0
  and (select count(*) from public.routines) = 0
  and (select count(*) from public.routine_exercises) = 0
  and (select count(*) from public.profiles) = 1,
  'second user sees only their own profile');

insert into public.workouts (id) values ('cccccccc-0000-0000-0000-000000000009');

select pg_temp.expect_error(
  $$insert into public.sets (id, workout_id, exercise_id, set_no, weight_kg, reps)
    values (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 3, 15, 8)$$,
  'cannot add a set to another user''s workout');
select pg_temp.expect_error(
  $$insert into public.sets (id, workout_id, exercise_id, set_no, weight_kg, reps)
    values (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 15, 8)$$,
  'cannot log against another user''s exercise');
select pg_temp.expect_error(
  $$insert into public.exercises (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'x')$$,
  'cannot insert rows owned by another user');
select pg_temp.expect_error(
  $$insert into public.workouts (routine_id) values ('bbbbbbbb-0000-0000-0000-000000000001')$$,
  'cannot start a workout from another user''s routine');

with u as (update public.profiles set units = 'lb'
           where id = '11111111-1111-1111-1111-111111111111' returning 1)
select pg_temp.expect((select count(*) from u) = 0, 'cannot update another user''s profile');

-- Anonymous -----------------------------------------------------------------
reset role;
set role anon;
select public.ping();
select pg_temp.expect((select count(*) from public.sets) = 0, 'anon sees no sets');
reset role;

\o
\echo 'All RLS checks passed.'
