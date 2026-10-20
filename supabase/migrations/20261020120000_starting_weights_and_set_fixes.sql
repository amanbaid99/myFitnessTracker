-- 1. Starting weights: someone new can enter what they currently lift, so
-- their first workout starts there instead of from nothing. Saved as a
-- finished workout of its own kind, 'baseline', so the numbers count for
-- aims and records like any logged set, but not for streaks, workout
-- counts, the rotation or AI reviews.
alter table public.workouts drop constraint workouts_source_check;
alter table public.workouts
  add constraint workouts_source_check check (source in ('app', 'sheet_import', 'baseline'));

-- 2. Fixing a wrongly logged set. Sets stay append-only (spec rule 1): the
-- wrong set is soft-deleted and a corrected copy takes its place, with the
-- same workout, exercise, set number, type, effort and time. Records are
-- computed from live sets, so they follow at once. One call, so a fix never
-- leaves the set missing or doubled. Runs as the caller: row-level security
-- decides whose sets can be fixed.
create function public.correct_set(p_set uuid, p_weight_kg numeric, p_added_kg numeric, p_reps int)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  s public.sets;
  v_new uuid := gen_random_uuid();
begin
  select * into s from public.sets where id = p_set and deleted_at is null;
  if not found then
    raise exception 'set not found';
  end if;

  update public.sets set deleted_at = now() where id = p_set;
  insert into public.sets (id, workout_id, exercise_id, set_no, set_type, weight_kg, added_kg, reps, rpe, logged_at)
  values (v_new, s.workout_id, s.exercise_id, s.set_no, s.set_type, p_weight_kg, coalesce(p_added_kg, 0), p_reps, s.rpe, s.logged_at);
  return v_new;
end;
$$;

revoke execute on function public.correct_set(uuid, numeric, numeric, int) from public, anon;
grant execute on function public.correct_set(uuid, numeric, numeric, int) to authenticated;
