-- Workout Tracker: initial schema (Milestone 1)
--
-- Apply once in the Supabase SQL editor (docs/SETUP.md). Tested by
-- supabase/tests/rls.sql (pnpm test:db).
--
-- Seven tables and one view, per docs/SPEC.md. Every table is owner-only
-- through row-level security. Sets are append-only: there is no delete
-- policy, and a trigger rejects any update other than a soft delete.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.exercise_type as enum ('strength', 'cardio', 'skill', 'mobility');
create type public.equipment as enum ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other');
create type public.set_type as enum ('warmup', 'working');
create type public.units as enum ('kg', 'lb');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- profiles.id is the user id, so it plays the role of user_id here.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  units public.units not null default 'kg',
  default_rest_sec int not null default 90 check (default_rest_sec between 0 and 3600),
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type public.exercise_type not null default 'strength',
  equipment public.equipment not null default 'machine',
  muscle_groups text[] not null default '{}',
  machine_setting text,                     -- seat adjustment, e.g. '5' from 'Incline bench press(5)'
  per_hand boolean not null default false,  -- true for dumbbell weights logged per hand
  warmup_enabled boolean not null default true,
  warmup_template jsonb                     -- null = app default ramp
    check (warmup_template is null or jsonb_typeof(warmup_template) = 'array'),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines on delete cascade,
  exercise_id uuid not null references public.exercises,
  sort_order int not null,
  target_sets int not null check (target_sets > 0),
  target_reps int not null check (target_reps > 0),
  rest_sec int check (rest_sec is null or rest_sec between 0 and 3600)
);

-- id has a default, but the client supplies it when a workout is started
-- offline so its sets can reference it before the first sync.
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  routine_id uuid references public.routines on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  energy smallint check (energy between 1 and 5),
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 24),
  notes text,
  source text not null default 'app' check (source in ('app', 'sheet_import')),
  check (ended_at is null or ended_at >= started_at)
);

create table public.sets (
  id uuid primary key,                      -- generated on the client for offline sync
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  workout_id uuid not null references public.workouts on delete cascade,
  exercise_id uuid not null references public.exercises,
  set_no int not null check (set_no > 0),
  set_type public.set_type not null default 'working',
  weight_kg numeric(6,2) check (weight_kg >= 0),              -- base weight, e.g. 22.5
  added_kg numeric(5,2) not null default 0 check (added_kg >= 0), -- pin-loaded add-on, e.g. 3.75
  reps int check (reps >= 0),
  rpe numeric(3,1) check (rpe between 1 and 10),
  logged_at timestamptz not null default now(),
  deleted_at timestamptz                    -- soft delete only
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  workout_id uuid not null references public.workouts on delete cascade,
  kind text not null,                       -- boxing, muay_thai, run, mobility
  rounds int check (rounds >= 0),
  work_sec int check (work_sec >= 0),
  rest_sec int check (rest_sec >= 0),
  duration_min int check (duration_min >= 0),
  intensity smallint check (intensity between 1 and 10)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index sets_user_exercise_logged_idx on public.sets (user_id, exercise_id, logged_at);
create index sets_workout_idx on public.sets (workout_id);
create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
create index routines_user_idx on public.routines (user_id, sort_order);
create index routine_exercises_routine_idx on public.routine_exercises (routine_id, sort_order);
create index sessions_workout_idx on public.sessions (workout_id);

-- One live exercise per name per user, so the Sheet import can be re-run
-- without creating duplicates.
create unique index exercises_user_name_live_idx
  on public.exercises (user_id, lower(name))
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Append-only sets
-- ---------------------------------------------------------------------------

-- The only permitted change to a logged set is marking it deleted.
create function public.sets_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.deleted_at is not null then
    raise exception 'set % is deleted and cannot be changed', old.id;
  end if;
  if (to_jsonb(new) - 'deleted_at') is distinct from (to_jsonb(old) - 'deleted_at') then
    raise exception 'sets are append-only: only deleted_at may be set';
  end if;
  return new;
end;
$$;

create trigger sets_append_only
  before update on public.sets
  for each row execute function public.sets_append_only();

-- ---------------------------------------------------------------------------
-- Profile on signup
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
-- Inserts also check that any referenced workout, routine or exercise
-- belongs to the same user. Foreign keys bypass RLS, so without this a
-- user could attach rows to someone else's workout if they knew its id.

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.sets enable row level security;
alter table public.sessions enable row level security;

-- profiles: the row is created by the signup trigger; users read and edit it.
create policy "profiles: owner reads" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: owner updates" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- exercises: archive rather than delete, since sets reference them.
create policy "exercises: owner reads" on public.exercises
  for select to authenticated using (user_id = (select auth.uid()));
create policy "exercises: owner inserts" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "exercises: owner updates" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- routines
create policy "routines: owner reads" on public.routines
  for select to authenticated using (user_id = (select auth.uid()));
create policy "routines: owner inserts" on public.routines
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "routines: owner updates" on public.routines
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routines: owner deletes" on public.routines
  for delete to authenticated using (user_id = (select auth.uid()));

-- routine_exercises: ownership through the parent routine.
create policy "routine_exercises: owner reads" on public.routine_exercises
  for select to authenticated using (
    exists (select 1 from public.routines r
            where r.id = routine_id and r.user_id = (select auth.uid()))
  );
create policy "routine_exercises: owner inserts" on public.routine_exercises
  for insert to authenticated with check (
    exists (select 1 from public.routines r
            where r.id = routine_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id and e.user_id = (select auth.uid()))
  );
create policy "routine_exercises: owner updates" on public.routine_exercises
  for update to authenticated
  using (
    exists (select 1 from public.routines r
            where r.id = routine_id and r.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.routines r
            where r.id = routine_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id and e.user_id = (select auth.uid()))
  );
create policy "routine_exercises: owner deletes" on public.routine_exercises
  for delete to authenticated using (
    exists (select 1 from public.routines r
            where r.id = routine_id and r.user_id = (select auth.uid()))
  );

-- workouts: deletable only while empty, so a started-by-mistake workout
-- can be discarded but logged history cannot.
create policy "workouts: owner reads" on public.workouts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "workouts: owner inserts" on public.workouts
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())))
  );
create policy "workouts: owner updates" on public.workouts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())))
  );
create policy "workouts: owner deletes empty" on public.workouts
  for delete to authenticated using (
    user_id = (select auth.uid())
    and not exists (select 1 from public.sets s where s.workout_id = workouts.id)
  );

-- sets: read, insert, soft delete. No delete policy.
create policy "sets: owner reads" on public.sets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "sets: owner inserts" on public.sets
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id and e.user_id = (select auth.uid()))
  );
create policy "sets: owner soft-deletes" on public.sets
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- sessions
create policy "sessions: owner reads" on public.sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "sessions: owner inserts" on public.sessions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_id and w.user_id = (select auth.uid()))
  );
create policy "sessions: owner updates" on public.sessions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sessions: owner deletes" on public.sessions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Metrics view
-- ---------------------------------------------------------------------------
-- Working sets only, with effective load and Epley estimated 1RM.
-- security_invoker makes the view obey the caller's RLS; without it a view
-- runs as its owner and would expose every user's sets.

create view public.working_sets
with (security_invoker = true) as
select s.*,
       (s.weight_kg + s.added_kg) as load_kg,
       (s.weight_kg + s.added_kg) * (1 + s.reps / 30.0) as e1rm_kg
from public.sets s
where s.set_type = 'working' and s.deleted_at is null;

-- ---------------------------------------------------------------------------
-- Keepalive
-- ---------------------------------------------------------------------------
-- Called once a day by .github/workflows/keepalive.yml so the free-tier
-- project is not auto-paused. Returns nothing and reads no user data.

create function public.ping()
returns void
language sql
stable
set search_path = ''
as $$ select $$;

grant execute on function public.ping() to anon;
