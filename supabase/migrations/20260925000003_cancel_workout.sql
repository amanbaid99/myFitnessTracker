-- Cancel a workout in progress.
--
-- No sets logged: the workout row is deleted. Sets logged: sets stay
-- append-only, so they are soft-deleted (which removes them from PRs,
-- working_sets and pre-fill) and the workout is marked cancelled and ended,
-- so it no longer counts for the rotation or "last done".

alter table public.workouts add column cancelled_at timestamptz;
alter table public.workouts
  add constraint workouts_cancelled_is_ended check (cancelled_at is null or ended_at is not null);

create function public.cancel_workout(p_workout uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.workouts where id = p_workout and user_id = auth.uid()) then
    raise exception 'workout not found';
  end if;
  if exists (select 1 from public.workouts where id = p_workout and ended_at is not null) then
    raise exception 'workout is already finished';
  end if;

  if not exists (select 1 from public.sets where workout_id = p_workout) then
    delete from public.workouts where id = p_workout;
    return;
  end if;

  update public.sets set deleted_at = now() where workout_id = p_workout and deleted_at is null;
  update public.workouts set ended_at = now(), cancelled_at = now() where id = p_workout;
end;
$$;
