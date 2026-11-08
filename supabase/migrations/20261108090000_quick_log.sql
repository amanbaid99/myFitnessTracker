-- Quick logs: a workout done outside the logger (push-ups at home, pull-ups
-- in the evening), saved in one go with an optional name. It counts for the
-- streak, records, volume and AI reviews like any workout, and towards the
-- weekly goal only with 6 or more working sets (Aman, 8 Nov 2026).

alter table public.workouts
  add column title text check (title is null or length(trim(title)) between 1 and 60),
  add column quick_log boolean not null default false;

-- Saves a finished quick log. p_id comes from the device, so a retry of the
-- same save returns the same workout instead of a second one. The workout is
-- added open, then finished, so the workout review runs as for any workout.
-- Runs as the caller: row-level security keeps every row the caller's own.
create function public.log_quick_workout(p_id uuid, p_title text, p_started_at timestamptz, p_minutes int, p_sets jsonb)
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
    insert into public.sets (id, workout_id, exercise_id, set_no, set_type, weight_kg, reps, duration_sec, rpe, logged_at)
    values (gen_random_uuid(), p_id, (s->>'exercise_id')::uuid, (s->>'set_no')::int, 'working',
            (s->>'weight_kg')::numeric, (s->>'reps')::int, (s->>'duration_sec')::int, (s->>'rpe')::numeric,
            p_started_at + make_interval(secs => i));
  end loop;
  update public.workouts set ended_at = p_started_at + make_interval(mins => p_minutes) where id = p_id;
  return p_id;
end;
$$;

revoke execute on function public.log_quick_workout(uuid, text, timestamptz, int, jsonb) from public, anon;
grant execute on function public.log_quick_workout(uuid, text, timestamptz, int, jsonb) to authenticated;

-- Weekly report: a quick log counts towards the week's workouts only with 6
-- or more working sets. Otherwise unchanged.
create or replace function public.training_weekly_report(p_weeks int default 12,p_exercise uuid default null,p_muscle text default null)
returns table(week_start date,workouts int,target int,volume_kg numeric,eligible_sets numeric,excluded_sets numeric)
language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_weeks is null or p_weeks not between 1 and 52 or (p_exercise is not null and p_muscle is not null) then raise exception 'Invalid reporting filter';end if;
 return query
 with weeks as (select (date_trunc('week',now() at time zone 'Asia/Kolkata')::date - n*7)::date as day from generate_series(0,p_weeks-1) n),
 counts as (select date_trunc('week',w.started_at at time zone 'Asia/Kolkata')::date as day,count(*)::int as n from public.workouts w where w.user_id=auth.uid() and w.source='app' and w.ended_at is not null and w.cancelled_at is null
   and (not w.quick_log or (select count(*) from public.sets s where s.workout_id=w.id and s.set_type='working' and s.deleted_at is null)>=6) group by 1),
 volumes as (
 select v.week_start as day,sum(v.volume_kg) as volume,sum(v.eligible_sets)::numeric as eligible,sum(v.excluded_sets)::numeric as excluded from public.weekly_exercise_volume v
 where v.user_id=auth.uid() and p_muscle is null and (p_exercise is null or v.exercise_id=p_exercise) group by 1
 union all
 select v.week_start,sum(v.volume_kg),sum(v.eligible_sets),sum(v.excluded_sets) from public.weekly_muscle_volume v where v.user_id=auth.uid() and p_muscle is not null and v.muscle=p_muscle group by 1)
 select weeks.day,coalesce(c.n,0),t.target::int,v.volume,coalesce(v.eligible,0),coalesce(v.excluded,0) from weeks
 left join counts c on c.day=weeks.day
 left join public.weekly_targets t on t.user_id=auth.uid() and t.week_start=weeks.day
 left join volumes v on v.day=weeks.day order by weeks.day;
end $$;
