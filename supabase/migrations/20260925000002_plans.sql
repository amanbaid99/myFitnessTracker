-- Workout plans: a plan groups routines (Push, Legs, ...). Several plans per
-- user, exactly one active. Existing routines are moved into one plan per
-- user named "<name>'s Upper Lower plan".

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- Which template it started from; null = built by hand or imported.
  template text check (template in ('full_body', 'upper_lower', 'ppl', 'bro_split')),
  days_per_week smallint check (days_per_week between 1 and 7),
  -- Set once the user edits a template plan; the UI then labels it Custom.
  is_custom boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index plans_one_active_per_user on public.plans (user_id) where is_active;
create index plans_user_idx on public.plans (user_id, created_at);

alter table public.routines add column plan_id uuid references public.plans on delete cascade;

-- Backfill: one active plan per user who already has routines.
insert into public.plans (user_id, name, is_custom, is_active)
select distinct r.user_id,
       coalesce(nullif(trim(p.name), '') || '''s Upper Lower plan', 'My Upper Lower plan'),
       true, true
from public.routines r
left join public.profiles p on p.id = r.user_id;

update public.routines r
set plan_id = pl.id
from public.plans pl
where pl.user_id = r.user_id and r.plan_id is null;

alter table public.routines alter column plan_id set not null;
create index routines_plan_idx on public.routines (plan_id, sort_order);

-- RLS -----------------------------------------------------------------------

alter table public.plans enable row level security;

create policy "plans: owner reads" on public.plans
  for select to authenticated using (user_id = (select auth.uid()));
create policy "plans: owner inserts" on public.plans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "plans: owner updates" on public.plans
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Deleting a plan deletes its routines; workouts keep their sets
-- (workouts.routine_id is set null), so history is never lost.
create policy "plans: owner deletes" on public.plans
  for delete to authenticated using (user_id = (select auth.uid()));

-- Routines may only be attached to the caller's own plans.
drop policy "routines: owner inserts" on public.routines;
create policy "routines: owner inserts" on public.routines
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.plans pl
                where pl.id = plan_id and pl.user_id = (select auth.uid()))
  );
drop policy "routines: owner updates" on public.routines;
create policy "routines: owner updates" on public.routines
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.plans pl
                where pl.id = plan_id and pl.user_id = (select auth.uid()))
  );

-- Functions (run as the caller, so RLS applies) -----------------------------

-- Makes one plan active and every other plan of the caller inactive.
create function public.set_active_plan(p_plan uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.plans where id = p_plan and user_id = auth.uid()) then
    raise exception 'plan not found';
  end if;
  update public.plans set is_active = false where user_id = auth.uid() and is_active and id <> p_plan;
  update public.plans set is_active = true where id = p_plan;
end;
$$;

-- Creates a plan with its routines and exercises in one transaction.
-- p_routines: [{"name":"Push","exercises":[{"name":"Bench Press",
--   "equipment":"barbell","muscle_groups":["chest"],"per_hand":false,
--   "sets":3,"reps":8}]}]
-- Exercises are matched by name to the caller's library, else created.
create function public.create_plan(
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
    insert into public.routines (plan_id, name, sort_order)
    values (v_plan, r ->> 'name', r_i) returning id into v_routine;
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

-- Personal records, computed (spec rule 4): best working set per exercise by
-- estimated 1RM. Warm-ups and deleted sets are excluded by working_sets.
create view public.exercise_prs
with (security_invoker = true) as
select distinct on (exercise_id)
  user_id, exercise_id, id as set_id, weight_kg, added_kg, reps, load_kg, e1rm_kg, logged_at
from public.working_sets
where reps > 0 and load_kg is not null
order by exercise_id, e1rm_kg desc, logged_at desc;

-- Effort per set ------------------------------------------------------------
-- Sets stay append-only, with one exception: the effort (rpe) a set felt
-- like may be recorded or corrected while its workout is still in progress.
-- Once the workout is finished, it is locked like everything else.

create or replace function public.sets_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.deleted_at is not null then
    raise exception 'set % is deleted and cannot be changed', old.id;
  end if;
  if (to_jsonb(new) - 'deleted_at' - 'rpe') is distinct from (to_jsonb(old) - 'deleted_at' - 'rpe') then
    raise exception 'sets are append-only: only deleted_at (or rpe during the workout) may be set';
  end if;
  if new.rpe is distinct from old.rpe and exists (
    select 1 from public.workouts w where w.id = old.workout_id and w.ended_at is not null
  ) then
    raise exception 'workout is finished; effort for set % can no longer change', old.id;
  end if;
  return new;
end;
$$;
