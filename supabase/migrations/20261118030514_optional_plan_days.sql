-- Existing days and workouts keep their current rotation behavior.
alter table public.routines add column is_optional boolean not null default false;
alter table public.workouts add column counts_for_rotation boolean not null default true;

-- Snapshot at start, including planned starts from older clients.
-- Later plan edits must not reinterpret a workout that was optional when started.
create function public.capture_workout_rotation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if new.counts_for_rotation is distinct from old.counts_for_rotation then
      raise exception 'A workout keeps its original rotation setting';
    end if;
  else
    new.counts_for_rotation := coalesce(
      (select not r.is_optional from public.routines r where r.id=new.routine_id), true);
  end if;
  return new;
end $$;
revoke execute on function public.capture_workout_rotation() from public, anon;
create trigger capture_workout_rotation
before insert or update of counts_for_rotation on public.workouts
for each row execute function public.capture_workout_rotation();
