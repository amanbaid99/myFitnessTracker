-- Assisted exercises can also take weighted sets (Aman, 12 Nov): 2 assisted
-- dips, 2 at bodyweight, then 1 with a 10 kg belt. A weighted set has no
-- assistance, no base weight and a positive add-on. Older clients that type
-- assistance into the weight box still send a base weight with no add-on, so
-- they stay blocked as before.
create or replace function public.validate_assisted_set() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.assistance_kg is null
    and not (new.weight_kg is null and new.added_kg > 0)
    and exists(select 1 from public.exercises e
      where e.id=new.exercise_id and e.user_id=(select auth.uid()) and e.load_mode='assisted')
    and exists(select 1 from public.workouts w where w.id=new.workout_id and w.ended_at is null) then
    raise exception 'This exercise uses assistance. Update the app and enter machine assistance';
  end if;
  return new;
end $$;
