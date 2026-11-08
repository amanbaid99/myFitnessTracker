-- Deleting a finished workout (Aman, 8 Nov 2026). Nothing is erased: like
-- cancelling an open workout, its sets are soft-deleted and the workout is
-- marked cancelled, so it leaves History, records, volume, last-time
-- prefill and streaks at once. Runs as the caller: row-level security keeps
-- it to the caller's own workout.
create function public.delete_workout(p_workout uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.workouts where id = p_workout and user_id = auth.uid() and cancelled_at is null) then
    raise exception 'Workout not found';
  end if;
  if exists (select 1 from public.workouts where id = p_workout and ended_at is null) then
    raise exception 'Finish or discard this workout instead';
  end if;
  update public.sets set deleted_at = now() where workout_id = p_workout and deleted_at is null;
  update public.workouts set cancelled_at = now() where id = p_workout;
end;
$$;
revoke execute on function public.delete_workout(uuid) from public, anon;
grant execute on function public.delete_workout(uuid) to authenticated;

-- Undoing an import now also soft-deletes its sets, as deleting a workout
-- does; before, undone imports still counted for records and prefill. No
-- import had been undone yet, so there is nothing to backfill.
create or replace function public.undo_import(p_import uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from public.imports where id = p_import and user_id = auth.uid()) then
    raise exception 'Import not found';
  end if;
  update public.sets set deleted_at = now()
    where deleted_at is null and user_id = auth.uid()
      and workout_id in (select id from public.workouts where import_id = p_import and user_id = auth.uid());
  update public.workouts set cancelled_at = now()
    where import_id = p_import and user_id = auth.uid() and cancelled_at is null;
  update public.imports set undone_at = coalesce(undone_at, now()) where id = p_import;
end;
$$;
