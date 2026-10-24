-- Timed exercises: planks, wall sits and dead hangs are logged as a time
-- held instead of reps. An exercise is tracked by reps (as before) or by
-- time; a timed set keeps its seconds in duration_sec and leaves reps
-- empty. For a timed exercise, a plan's target_reps is the target hold in
-- seconds, so plans need no new column.

alter table public.exercises
  add column tracking text not null default 'reps' check (tracking in ('reps', 'time'));

alter table public.sets
  add column duration_sec int check (duration_sec between 1 and 3600);

comment on column public.routine_exercises.target_reps is
  'Target reps; for an exercise tracked by time, the target hold in seconds.';

-- Holds start out timed, however they are created (by hand, from a
-- template or by AI). Anyone can switch an exercise back in the app.
create function public.exercises_default_tracking() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.tracking = 'reps'
     and new.name ~* '(plank|wall sit|dead hang|hollow (body )?hold|l-sit|isometric|\mhold\M)' then
    new.tracking := 'time';
  end if;
  return new;
end $$;

create trigger exercises_default_tracking before insert on public.exercises
  for each row execute function public.exercises_default_tracking();

-- Existing holds that were never logged with reps become timed, and a hold
-- planned as a handful of "reps" (3 x 10) becomes 3 x 30 seconds.
update public.exercises e set tracking = 'time'
where e.name ~* '(plank|wall sit|dead hang|hollow (body )?hold|l-sit|isometric|\mhold\M)'
  and not exists (
    select 1 from public.sets s where s.exercise_id = e.id and s.reps is not null and s.deleted_at is null
  );

update public.routine_exercises re set target_reps = 30
from public.exercises e
where e.id = re.exercise_id and e.tracking = 'time' and re.target_reps < 20;

-- Fixing a set (History) can change its time too; without one it keeps
-- the time it had. Same rules as before otherwise.
drop function public.correct_set(uuid, numeric, numeric, int);

create function public.correct_set(
  p_set uuid, p_weight_kg numeric, p_added_kg numeric, p_reps int, p_duration_sec int default null
)
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
  insert into public.sets (id, workout_id, exercise_id, set_no, set_type, weight_kg, added_kg, reps, duration_sec, rpe, logged_at)
  values (v_new, s.workout_id, s.exercise_id, s.set_no, s.set_type, p_weight_kg, coalesce(p_added_kg, 0), p_reps,
          coalesce(p_duration_sec, s.duration_sec), s.rpe, s.logged_at);
  return v_new;
end;
$$;

revoke execute on function public.correct_set(uuid, numeric, numeric, int, int) from public, anon;
grant execute on function public.correct_set(uuid, numeric, numeric, int, int) to authenticated;
