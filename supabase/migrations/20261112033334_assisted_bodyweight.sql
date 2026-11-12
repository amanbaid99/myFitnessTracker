-- Assistance is machine help, stored separately from lifted load. No history rewrite.
alter table public.exercises
  add column load_mode text not null default 'standard' check (load_mode in ('standard','assisted')),
  add column default_assistance_kg numeric(6,2) not null default 0 check (default_assistance_kg between 0 and 9999.99),
  add constraint exercises_assisted_reps check (load_mode <> 'assisted' or (tracking = 'reps' and not per_hand));
alter table public.sets
  add column assistance_kg numeric(6,2),
  add constraint sets_assistance_valid check (assistance_kg is null or
    (assistance_kg between 0 and 9999.99 and weight_kg is null and added_kg = 0 and duration_sec is null and reps is not null and reps > 0));
-- Existing views derive load from weight_kg + added_kg. NULL base keeps assisted
-- sets out of lifted volume, Epley estimates and PRs; muscle/set counts remain.
comment on column public.sets.assistance_kg is 'Machine help in kg. NULL: standard set. 0: unassisted bodyweight within assisted tracking. Never lifted load.';

-- Preserve the five-argument call contract for older clients via defaults.
drop function public.correct_set(uuid,numeric,numeric,int,int);
create function public.correct_set(p_set uuid,p_weight_kg numeric,p_added_kg numeric,p_reps int,p_duration_sec int default null,p_assistance_kg numeric default null)
returns uuid language plpgsql set search_path = '' as $$
declare s public.sets; v_new uuid := gen_random_uuid();
begin
  select * into s from public.sets where id=p_set and deleted_at is null for update;
  if not found then raise exception 'set not found'; end if;
  if s.assistance_kg is null and p_assistance_kg is not null then
    raise exception 'Cannot change a standard set to assisted tracking';
  end if;
  update public.sets set deleted_at=now() where id=p_set;
  insert into public.sets(id,workout_id,exercise_id,set_no,set_type,weight_kg,added_kg,reps,duration_sec,rpe,logged_at,assistance_kg)
  values(v_new,s.workout_id,s.exercise_id,s.set_no,s.set_type,p_weight_kg,coalesce(p_added_kg,0),p_reps,
    coalesce(p_duration_sec,s.duration_sec),s.rpe,s.logged_at,coalesce(p_assistance_kg,s.assistance_kg));
  return v_new;
end $$;
revoke execute on function public.correct_set(uuid,numeric,numeric,int,int,numeric) from public,anon;
grant execute on function public.correct_set(uuid,numeric,numeric,int,int,numeric) to authenticated;

-- Comparable assistance/reps, never an invented effective-bodyweight 1RM.
create view public.assisted_session_progress with(security_invoker=true) as
with sessions as (
  select s.user_id,s.exercise_id,s.workout_id,w.started_at,
    min(s.assistance_kg) as least_assistance_kg,
    count(*)::int as working_sets,
    count(*) filter(where s.assistance_kg=0)::int as bodyweight_sets,
    sum(s.reps)::int as total_reps
  from public.sets s join public.workouts w on w.id=s.workout_id
  where s.set_type='working' and s.deleted_at is null and s.assistance_kg is not null
    and w.ended_at is not null and w.cancelled_at is null
  group by s.user_id,s.exercise_id,s.workout_id,w.started_at
)
select x.*, (select max(s.reps) from public.sets s where s.workout_id=x.workout_id
  and s.exercise_id=x.exercise_id and s.set_type='working' and s.deleted_at is null
  and s.assistance_kg=x.least_assistance_kg) as reps_at_least_assistance
from sessions x;
revoke all on public.assisted_session_progress from public,anon,authenticated;
grant select on public.assisted_session_progress to authenticated;

-- An older client must not silently log assistance as lifted load during training.
-- Finished standard sets remain correctable after changing future tracking.
create function public.validate_assisted_set() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.assistance_kg is null and exists(select 1 from public.exercises e
    where e.id=new.exercise_id and e.user_id=(select auth.uid()) and e.load_mode='assisted')
    and exists(select 1 from public.workouts w where w.id=new.workout_id and w.ended_at is null) then
    raise exception 'This exercise uses assistance. Update the app and enter machine assistance';
  end if;
  return new;
end $$;
create trigger sets_assistance_tracking before insert on public.sets
for each row execute function public.validate_assisted_set();

-- Quick-log entries preserve the same explicit assistance marker.
create or replace function public.log_quick_workout(p_id uuid, p_title text, p_started_at timestamptz, p_minutes int, p_sets jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  s jsonb;
  i int := 0;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.workouts where id = p_id and user_id = auth.uid()) then return p_id; end if;
  if p_minutes is null or p_minutes not between 1 and 240 then raise exception 'Duration must be between 1 and 240 minutes'; end if;
  if p_started_at is null or p_started_at + make_interval(mins => p_minutes) > now() + interval '5 minutes' then
    raise exception 'That time is in the future';
  end if;
  if jsonb_typeof(p_sets) is distinct from 'array' or jsonb_array_length(p_sets) not between 1 and 100 then
    raise exception 'Add between 1 and 100 sets';
  end if;
  insert into public.workouts (id, started_at, source, title, quick_log)
  values (p_id, p_started_at, 'app', nullif(left(trim(coalesce(p_title, '')), 60), ''), true);
  for s in select value from jsonb_array_elements(p_sets) loop
    i := i + 1;
    insert into public.sets (id, workout_id, exercise_id, set_no, set_type, weight_kg, reps, duration_sec, rpe, logged_at, assistance_kg)
    values (gen_random_uuid(), p_id, (s->>'exercise_id')::uuid, (s->>'set_no')::int, 'working',
            (s->>'weight_kg')::numeric, (s->>'reps')::int, (s->>'duration_sec')::int, (s->>'rpe')::numeric,
            p_started_at + make_interval(secs => i), (s->>'assistance_kg')::numeric);
  end loop;
  update public.workouts set ended_at = p_started_at + make_interval(mins => p_minutes) where id = p_id;
  return p_id;
end;
$$;

revoke execute on function public.log_quick_workout(uuid, text, timestamptz, int, jsonb) from public, anon;
grant execute on function public.log_quick_workout(uuid, text, timestamptz, int, jsonb) to authenticated;


-- Explicit assisted tracking takes priority over name-based timed-hold defaults.
create or replace function public.exercises_default_tracking() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.load_mode <> 'assisted' and new.tracking = 'reps'
     and new.name ~* '(plank|wall sit|dead hang|hollow (body )?hold|l-sit|isometric|\mhold\M)' then
    new.tracking := 'time';
  end if;
  return new;
end $$;


-- Do not reinterpret the rows of an exercise that is currently being logged.
create function public.assisted_mode_change_guard() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.load_mode <> old.load_mode and exists (
    select 1 from public.sets s join public.workouts w on w.id=s.workout_id
    where s.exercise_id=old.id and s.deleted_at is null and w.ended_at is null and w.cancelled_at is null
  ) then raise exception 'Finish the workout or undo its sets before changing load tracking'; end if;
  return new;
end $$;
create trigger exercises_assisted_mode_guard before update of load_mode on public.exercises
for each row execute function public.assisted_mode_change_guard();
