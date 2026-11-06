-- Importing workout history from Strong, Hevy or the Repd template.
--
-- Each upload is one row in imports, so it can be undone in one go.
-- Imported workouts use the existing 'sheet_import' source: they show in
-- History and count for records and weekly volume, but not for streaks,
-- weekly goals, the rotation or AI reviews (Aman, 6 Nov 2026).

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source text not null check (source in ('strong', 'hevy', 'template')),
  workouts int not null default 0 check (workouts >= 0),
  sets int not null default 0 check (sets >= 0),
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index imports_user_idx on public.imports (user_id, created_at desc);

alter table public.imports enable row level security;
create policy "imports: owner reads" on public.imports
  for select to authenticated using (user_id = (select auth.uid()));
create policy "imports: owner inserts" on public.imports
  for insert to authenticated with check (user_id = (select auth.uid()) and workouts = 0 and sets = 0 and undone_at is null);
-- Counts and undo change only through the functions below.

alter table public.workouts add column import_id uuid references public.imports on delete set null;
create index workouts_import_idx on public.workouts (import_id) where import_id is not null;

-- Adds up to 200 finished workouts with their sets to one of the caller's
-- imports. All or nothing per call. Security definer so it can keep the
-- import's counts (users cannot update them); every row it writes belongs
-- to the caller, and each exercise must be the caller's own.
create function public.import_workouts(p_import uuid, p_workouts jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  w jsonb;
  s jsonb;
  v_workout uuid;
  n_workouts int := 0;
  n_sets int := 0;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from public.imports where id = p_import and user_id = auth.uid() and undone_at is null) then
    raise exception 'Import not found';
  end if;
  if jsonb_typeof(p_workouts) is distinct from 'array' or jsonb_array_length(p_workouts) > 200 then
    raise exception 'Send between 0 and 200 workouts at a time';
  end if;
  for w in select value from jsonb_array_elements(p_workouts) loop
    if jsonb_typeof(w->'sets') is distinct from 'array' or jsonb_array_length(w->'sets') = 0
       or jsonb_array_length(w->'sets') > 300 then
      raise exception 'Each workout needs between 1 and 300 sets';
    end if;
    insert into public.workouts (user_id, started_at, ended_at, notes, source, import_id)
    values (auth.uid(), (w->>'started_at')::timestamptz, (w->>'ended_at')::timestamptz,
            nullif(left(trim(coalesce(w->>'notes', '')), 500), ''), 'sheet_import', p_import)
    returning id into v_workout;
    for s in select value from jsonb_array_elements(w->'sets') loop
      if not exists (select 1 from public.exercises where id = (s->>'exercise_id')::uuid and user_id = auth.uid()) then
        raise exception 'Exercise not found';
      end if;
      insert into public.sets (id, user_id, workout_id, exercise_id, set_no, set_type, weight_kg, reps, duration_sec, rpe, logged_at)
      values (gen_random_uuid(), auth.uid(), v_workout, (s->>'exercise_id')::uuid, (s->>'set_no')::int,
              (s->>'set_type')::public.set_type, (s->>'weight_kg')::numeric, (s->>'reps')::int,
              (s->>'duration_sec')::int, (s->>'rpe')::numeric, (s->>'logged_at')::timestamptz);
      n_sets := n_sets + 1;
    end loop;
    n_workouts := n_workouts + 1;
  end loop;
  update public.imports set workouts = workouts + n_workouts, sets = sets + n_sets where id = p_import;
  return n_workouts;
end;
$$;

-- Undoes one of the caller's imports: its workouts are cancelled, so they
-- leave History, records and volume. Logged sets are never touched.
-- Security definer to set undone_at; it only touches the caller's rows.
create function public.undo_import(p_import uuid)
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
  update public.workouts set cancelled_at = now()
    where import_id = p_import and user_id = auth.uid() and cancelled_at is null;
  update public.imports set undone_at = coalesce(undone_at, now()) where id = p_import;
end;
$$;

revoke execute on function public.import_workouts(uuid, jsonb) from public, anon;
grant execute on function public.import_workouts(uuid, jsonb) to authenticated;
revoke execute on function public.undo_import(uuid) from public, anon;
grant execute on function public.undo_import(uuid) to authenticated;

-- Weekly volume now counts imported workouts too. Same columns as before.
create or replace view public.weekly_exercise_volume with(security_invoker=true) as
select w.user_id,date_trunc('week',w.started_at at time zone 'Asia/Kolkata')::date as week_start,
 e.id as exercise_id,e.name as exercise_name,
 sum(s.load_kg*s.reps) filter(where s.reps>0 and s.load_kg is not null and e.equipment::text not in('bodyweight','band') and e.tracking='reps') as volume_kg,
 count(*) filter(where s.reps>0 and s.load_kg is not null and e.equipment::text not in('bodyweight','band') and e.tracking='reps')::int as eligible_sets,
 count(*) filter(where not(coalesce(s.reps>0,false) and s.load_kg is not null and e.equipment::text not in('bodyweight','band') and e.tracking='reps'))::int as excluded_sets
from public.working_sets s join public.workouts w on w.id=s.workout_id join public.exercises e on e.id=s.exercise_id
where w.source in ('app','sheet_import') and w.ended_at is not null and w.cancelled_at is null
group by w.user_id,date_trunc('week',w.started_at at time zone 'Asia/Kolkata')::date,e.id,e.name;
