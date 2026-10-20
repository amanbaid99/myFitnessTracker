-- A day's own warm-up and cool-down, as short lines of text (no sets or
-- reps). Null means automatic: the app builds them from the day's
-- exercises (lib/general-warmup.ts, lib/general-cooldown.ts), so they keep
-- up when exercises change. A list is the user's own, or one written by AI
-- that they kept.

-- Up to 12 lines of 1 to 200 characters each.
create function public.routine_prep_ok(items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select items is null or (
    cardinality(items) between 1 and 12
    and not exists (select 1 from unnest(items) t where length(trim(t)) = 0 or length(t) > 200)
  )
$$;

alter table public.routines
  add column warmup text[] check (public.routine_prep_ok(warmup)),
  add column cooldown text[] check (public.routine_prep_ok(cooldown));

-- A JSON list of lines as a clean text[]: trimmed, blanks dropped, each cut
-- to 200 characters, at most 12. Null when nothing is left.
create function public.routine_prep_from_json(items jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case when cardinality(a) = 0 then null else a end
  from (
    select coalesce(array(
      select left(trim(t), 200)
      from jsonb_array_elements_text(case when jsonb_typeof(items) = 'array' then items else '[]'::jsonb end)
        with ordinality as x(t, n)
      where length(trim(t)) > 0
      order by n
      limit 12
    ), '{}') as a
  ) s
$$;

-- create_plan: unchanged, except a day may carry "warmup" and "cooldown"
-- lists (from a plan described to the AI); without them the day is
-- automatic.
create or replace function public.create_plan(
  p_name text, p_template text, p_days smallint, p_routines jsonb, p_activate boolean default true
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_plan uuid;
  v_routine uuid;
  v_exercise uuid;
  r jsonb;
  e jsonb;
  r_i int := 0;
  e_i int;
begin
  insert into public.plans (name, template, days_per_week)
  values (p_name, p_template, p_days) returning id into v_plan;

  for r in select * from jsonb_array_elements(p_routines) loop
    insert into public.routines (plan_id, name, sort_order, warmup, cooldown)
    values (
      v_plan, r ->> 'name', r_i,
      public.routine_prep_from_json(r -> 'warmup'),
      public.routine_prep_from_json(r -> 'cooldown')
    ) returning id into v_routine;
    r_i := r_i + 1;
    e_i := 0;

    for e in select * from jsonb_array_elements(r -> 'exercises') loop
      e_i := e_i + 1;
      select id into v_exercise from public.exercises
      where user_id = auth.uid() and lower(name) = lower(e ->> 'name') and archived_at is null;
      if v_exercise is null then
        insert into public.exercises (name, equipment, muscle_groups, per_hand)
        values (
          e ->> 'name',
          coalesce((e ->> 'equipment')::public.equipment, 'machine'),
          coalesce(array(select jsonb_array_elements_text(e -> 'muscle_groups')), '{}'),
          coalesce((e ->> 'per_hand')::boolean, false)
        ) returning id into v_exercise;
      end if;
      insert into public.routine_exercises (routine_id, exercise_id, sort_order, target_sets, target_reps)
      values (v_routine, v_exercise, e_i, (e ->> 'sets')::int, (e ->> 'reps')::int);
    end loop;
  end loop;

  if p_activate then
    perform public.set_active_plan(v_plan);
  end if;
  return v_plan;
end;
$$;
