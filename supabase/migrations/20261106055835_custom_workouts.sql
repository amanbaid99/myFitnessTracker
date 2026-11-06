-- Reviewed, owner-only workout prescriptions. Logged sets and metrics stay unchanged.
create table public.workout_customizations (
  workout_id uuid primary key references public.workouts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  has_prescription boolean not null default true,
  warmup text[],
  cooldown text[],
  source_routine_id uuid references public.routines(id) on delete set null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 0 and 30),
  request_id uuid not null default gen_random_uuid(),
  revision integer not null default 1 check (revision > 0)
);
create index workout_customizations_source on public.workout_customizations(source_routine_id);
create index workout_customizations_owner on public.workout_customizations(user_id);
alter table public.workout_customizations enable row level security;
create policy customizations_owner on public.workout_customizations for all to authenticated
using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  and (source_routine_id is null or exists (select 1 from public.routines r where r.id = source_routine_id and r.user_id = (select auth.uid())))
);
grant select, insert, update, delete on public.workout_customizations to authenticated;

-- Invoker rights: resolution can only see/create the caller's exercises.
-- Existing metadata is never changed by a customization.
create function public.resolve_custom_items(p_items jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  e jsonb; ex public.exercises; result jsonb := '[]'; seen uuid[] := '{}';
  slot text; n integer := 0; sets integer; reps integer; rest integer; v_tracking text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'A workout needs 1 to 30 exercises';
  end if;
  for e in select value from jsonb_array_elements(p_items) loop
    n := n + 1;
    sets := (e->>'sets')::integer; reps := (e->>'reps')::integer; rest := (e->>'rest_sec')::integer;
    v_tracking := e->>'tracking';
    if sets is null or sets not between 1 and 10 or v_tracking is null or v_tracking not in ('reps','time')
       or reps is null or reps not between 1 and (case when v_tracking = 'time' then 3600 else 50 end)
       or (rest is not null and rest not between 0 and 3600) then raise exception 'Invalid exercise targets'; end if;
    ex := null;
    if nullif(e->>'exercise_id','') is not null then
      select * into ex from public.exercises where id = (e->>'exercise_id')::uuid and user_id = auth.uid();
      if ex.id is null then raise exception 'Exercise unavailable'; end if;
    else
      if length(trim(coalesce(e->>'name',''))) not between 1 and 100
         or coalesce(e->>'equipment','') not in ('machine','cable','dumbbell','barbell','bodyweight','band','plate','other')
         or jsonb_typeof(e->'muscle_groups') is distinct from 'array'
         or jsonb_array_length(e->'muscle_groups') > 16
         or (select count(distinct m) from jsonb_array_elements_text(e->'muscle_groups') m) <> jsonb_array_length(e->'muscle_groups')
         or exists (select 1 from jsonb_array_elements_text(e->'muscle_groups') m where m not in (
           'chest','front delts','side delts','rear delts','upper back','lats','traps','biceps','triceps',
           'quads','hamstrings','glutes','abductors','adductors','calves','core')) then
        raise exception 'Invalid exercise details';
      end if;
      select * into ex from public.exercises where user_id = auth.uid() and archived_at is null
        and lower(name) = lower(trim(e->>'name'));
      if ex.id is not null and (ex.equipment::text <> e->>'equipment' or ex.tracking <> v_tracking) then
        raise exception 'An exercise with that name uses different equipment or tracking. Choose it from your library or rename this exercise';
      end if;
      if ex.id is null then
        insert into public.exercises(name,equipment,muscle_groups,per_hand,tracking)
        values (trim(e->>'name'),(e->>'equipment')::public.equipment,
          array(select jsonb_array_elements_text(e->'muscle_groups')),coalesce((e->>'per_hand')::boolean,false),v_tracking)
        returning * into ex;
        -- Existing name inference must not override an explicit reviewed tracking choice.
        if ex.tracking <> v_tracking then update public.exercises set tracking = v_tracking where id = ex.id returning * into ex; end if;
      end if;
    end if;
    if ex.tracking <> v_tracking then raise exception 'Exercise tracking changed. Review the workout again'; end if;
    if ex.id = any(seen) then raise exception 'An exercise appears twice'; end if;
    seen := array_append(seen,ex.id);
    slot := coalesce(nullif(e->>'id',''),'custom:' || n);
    if length(slot) > 100 or exists(select 1 from jsonb_array_elements(result) x where x->>'id' = slot) then raise exception 'Invalid exercise order'; end if;
    result := result || jsonb_build_array(jsonb_build_object('id',slot,'exerciseId',ex.id,
      'targetSets',sets,'targetReps',reps,'restSec',rest));
  end loop;
  return result;
end $$;
revoke all on function public.resolve_custom_items(jsonb) from public, anon;
grant execute on function public.resolve_custom_items(jsonb) to authenticated;

-- A pre-generated workout UUID makes a retried Start safe after a lost response.
-- revision rejects a second tab applying an older review over a newer one.
create function public.use_custom_workout(
  p_workout uuid, p_start boolean, p_revision integer, p_name text, p_items jsonb,
  p_source_routine uuid default null, p_locked uuid[] default '{}', p_request uuid default gen_random_uuid()
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare w public.workouts; snapshot public.workout_customizations; normalized jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 80 then raise exception 'Name your workout'; end if;
  if p_source_routine is not null and not exists(select 1 from public.routines where id = p_source_routine and user_id = auth.uid()) then raise exception 'Source workout unavailable'; end if;
  -- Serialize retries even before the workout exists.
  if p_start then perform pg_advisory_xact_lock(hashtextextended('workout-start:'||auth.uid()::text,0)); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_workout::text,0));
  select * into w from public.workouts where id = p_workout and user_id = auth.uid() for update;
  if p_start then
    if w.id is not null then
      if exists(select 1 from public.workout_customizations where workout_id = w.id) then return w.id; end if;
      raise exception 'Workout already exists';
    end if;
    if exists(select 1 from public.workouts where user_id = auth.uid() and source = 'app' and ended_at is null and cancelled_at is null) then raise exception 'Resume or discard your open workout first'; end if;
    -- No routine_id: a today-only session does not advance the regular rotation.
    insert into public.workouts(id) values(p_workout) returning * into w;
  elsif w.id is null or w.ended_at is not null or w.cancelled_at is not null then
    raise exception 'This workout is no longer open';
  end if;
  select * into snapshot from public.workout_customizations where workout_id = w.id;
  if snapshot.request_id = p_request then return w.id; end if;
  if p_revision is null or coalesce(snapshot.revision,0) <> p_revision then raise exception 'The workout changed. Close this review and try again'; end if;
  normalized := public.resolve_custom_items(p_items);
  if exists(select 1 from public.sets s where s.workout_id = w.id and s.deleted_at is null and (
    not (s.exercise_id = any(coalesce(p_locked,'{}'))) or
    not exists(select 1 from jsonb_array_elements(normalized) x where (x->>'exerciseId')::uuid = s.exercise_id)
  )) then raise exception 'New sets were logged. Close this review and try again'; end if;
  insert into public.workout_customizations(workout_id,name,source_routine_id,items,revision,request_id)
    values(w.id,trim(p_name),p_source_routine,normalized,1,p_request)
    on conflict(workout_id) do update set name=excluded.name,items=excluded.items,request_id=excluded.request_id,revision=public.workout_customizations.revision+1;
  return w.id;
end $$;
revoke all on function public.use_custom_workout(uuid,boolean,integer,text,jsonb,uuid,uuid[],uuid) from public, anon;
grant execute on function public.use_custom_workout(uuid,boolean,integer,text,jsonb,uuid,uuid[],uuid) to authenticated;

-- Accepted save requests are append-only. A lost response can be retried exactly.
create table public.customization_saves (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  payload jsonb not null check (octet_length(payload::text) <= 150000),
  result jsonb not null
);
alter table public.customization_saves enable row level security;
create index customization_saves_plan on public.customization_saves(plan_id);
create index customization_saves_owner on public.customization_saves(user_id);
revoke all on public.customization_saves from anon, authenticated;
grant select,insert on public.customization_saves to authenticated;
create policy customization_saves_read on public.customization_saves for select to authenticated using(user_id=(select auth.uid()));
create policy customization_saves_insert on public.customization_saves for insert to authenticated with check(
  user_id=(select auth.uid()) and exists(select 1 from public.plans where id=plan_id and user_id=(select auth.uid()))
);

-- Retain current prescriptions before future edits. Older finished sessions
-- keep their displayed name only; unknown historical targets are not inferred.
-- This freezes prescriptions only, never sets or calculated metrics.
create function public.freeze_routine_workouts(p_routine uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.routines; w record; prescribed jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into r from public.routines where id=p_routine and user_id=auth.uid();
  if r.id is null then raise exception 'Source day unavailable'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',re.id,'exerciseId',re.exercise_id,
    'targetSets',re.target_sets,'targetReps',re.target_reps,'restSec',re.rest_sec,
    'alternateIds',coalesce((select jsonb_agg(a.exercise_id order by a.sort_order,a.exercise_id)
      from public.routine_exercise_alternates a where a.routine_exercise_id=re.id),'[]'::jsonb)) order by re.sort_order,re.id),'[]'::jsonb)
    into prescribed from public.routine_exercises re where re.routine_id=r.id;
  for w in select id,ended_at from public.workouts where routine_id=r.id and user_id=auth.uid() order by id for update loop
    insert into public.workout_customizations(workout_id,name,source_routine_id,items,warmup,cooldown,has_prescription)
      values(w.id,r.name,r.id,case when w.ended_at is null then prescribed else '[]'::jsonb end,
        case when w.ended_at is null then r.warmup else null end,case when w.ended_at is null then r.cooldown else null end,w.ended_at is null) on conflict(workout_id) do nothing;
  end loop;
end $$;
revoke all on function public.freeze_routine_workouts(uuid) from public,anon;
grant execute on function public.freeze_routine_workouts(uuid) to authenticated;

-- Add a day, save an inactive copy, or explicitly replace selected existing days.
-- Replacement is atomic and detects edits made since the AI draft was generated.
create function public.save_custom_routines(
  p_id uuid,p_plan uuid,p_name text,p_days jsonb,p_replace uuid[] default null,
  p_expected jsonb default null,p_workout uuid default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare target uuid; r jsonb; normalized jsonb; day_id uuid; pos integer; idx integer:=0;
  old_day public.routines; actual jsonb; expected jsonb; payload jsonb; prior public.customization_saves; response jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 80 or jsonb_typeof(p_days) is distinct from 'array'
    or jsonb_array_length(p_days) not between 1 and 7 then raise exception 'Invalid plan'; end if;
  if p_workout is not null and not exists(select 1 from public.workouts where id=p_workout and user_id=auth.uid()) then raise exception 'Workout unavailable'; end if;
  payload:=jsonb_build_object('plan',p_plan,'name',p_name,'days',p_days,'replace',p_replace,'expected',p_expected,'workout',p_workout);
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into prior from public.customization_saves where id=p_id and user_id=auth.uid();
  if prior.id is not null then
    if prior.payload<>payload then raise exception 'The reviewed save changed. Start a new save'; end if;
    return prior.result;
  end if;
  if p_plan is null then
    if p_replace is not null then raise exception 'Choose a current plan to replace days'; end if;
    insert into public.plans(id,name,is_custom,is_active,days_per_week)
      values(p_id,trim(p_name),true,false,jsonb_array_length(p_days));
    target:=p_id; pos:=0;
  else
    perform 1 from public.plans where id=p_plan and user_id=auth.uid() for update;
    if not found then raise exception 'Plan unavailable'; end if;
    target:=p_plan;
    if p_replace is null then
      if jsonb_array_length(p_days)<>1 then raise exception 'Choose one day to add'; end if;
      select coalesce(max(sort_order),-1)+1 into pos from public.routines where plan_id=target;
    elsif cardinality(p_replace)<>jsonb_array_length(p_days) or cardinality(p_replace) not between 1 and 7
      or (select count(distinct id) from unnest(p_replace) id)<>cardinality(p_replace)
      or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Invalid replacement days';
    end if;
  end if;
  for r in select value from jsonb_array_elements(p_days) loop
    if length(trim(coalesce(r->>'name',''))) not between 1 and 80 or jsonb_array_length(r->'exercises')>15 then raise exception 'Invalid workout day'; end if;
    normalized:=public.resolve_custom_items(r->'exercises');
    if p_replace is not null then
      select * into old_day from public.routines where id=p_replace[idx+1] and plan_id=target and user_id=auth.uid() for update;
      if old_day.id is null then raise exception 'Replacement day unavailable'; end if;
      perform 1 from public.routine_exercises where routine_id=old_day.id order by id for update;
      select value into expected from jsonb_array_elements(p_expected) where value->>'id'=old_day.id::text;
      select jsonb_build_object('id',old_day.id,'name',old_day.name,
        'warmup',case when cardinality(old_day.warmup)>0 then to_jsonb(old_day.warmup) else 'null'::jsonb end,
        'cooldown',case when cardinality(old_day.cooldown)>0 then to_jsonb(old_day.cooldown) else 'null'::jsonb end,
        'items',coalesce(jsonb_agg(jsonb_build_object('id',re.id,'exerciseId',re.exercise_id,'sets',re.target_sets,
          'reps',re.target_reps,'restSec',re.rest_sec,'alternateIds',coalesce((select jsonb_agg(a.exercise_id order by a.sort_order,a.exercise_id)
            from public.routine_exercise_alternates a where a.routine_exercise_id=re.id),'[]'::jsonb)) order by re.sort_order,re.id)
          filter(where re.id is not null),'[]'::jsonb)) into actual from public.routine_exercises re where re.routine_id=old_day.id;
      if expected is null or expected<>actual then raise exception 'The source plan changed. Create a fresh draft before replacing days'; end if;
      perform public.freeze_routine_workouts(old_day.id);
      day_id:=old_day.id;
      delete from public.routine_exercises where routine_id=day_id;
      update public.routines set name=trim(r->>'name') where id=day_id;
    else
      day_id:=case when p_plan is not null then p_id else gen_random_uuid() end;
      insert into public.routines(id,plan_id,name,sort_order) values(day_id,target,trim(r->>'name'),pos+idx);
    end if;
    idx:=idx+1;
    insert into public.routine_exercises(routine_id,exercise_id,sort_order,target_sets,target_reps,rest_sec)
      select day_id,(x->>'exerciseId')::uuid,ord::integer,(x->>'targetSets')::integer,(x->>'targetReps')::integer,(x->>'restSec')::integer
      from jsonb_array_elements(normalized) with ordinality as t(x,ord);
  end loop;
  update public.plans set is_custom=true where id=target;
  response:=jsonb_build_object('plan_id',target,'workout_revision',(select revision from public.workout_customizations where workout_id=p_workout));
  insert into public.customization_saves(id,plan_id,payload,result) values(p_id,target,payload,response);
  return response;
end $$;
revoke all on function public.save_custom_routines(uuid,uuid,text,jsonb,uuid[],jsonb,uuid) from public,anon;
grant execute on function public.save_custom_routines(uuid,uuid,text,jsonb,uuid[],jsonb,uuid) to authenticated;

-- Queued rest edits for a custom session use the existing offline outbox.
create function public.set_custom_workout_rest(p_workout uuid,p_slot text,p_seconds integer)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or p_seconds is null or p_seconds not between 0 and 3600 then raise exception 'Invalid rest'; end if;
  update public.workout_customizations c set items=(
    select jsonb_agg(case when x->>'id'=p_slot then jsonb_set(x,'{restSec}',to_jsonb(p_seconds)) else x end order by ord)
    from jsonb_array_elements(c.items) with ordinality as t(x,ord)
  ) where workout_id=p_workout and user_id=auth.uid()
    and exists(select 1 from jsonb_array_elements(items) x where x->>'id'=p_slot);
  if not found then raise exception 'Custom exercise unavailable'; end if;
  return p_workout;
end $$;
revoke all on function public.set_custom_workout_rest(uuid,text,integer) from public,anon;
grant execute on function public.set_custom_workout_rest(uuid,text,integer) to authenticated;

-- Known replacements remain usable offline. The outbox sends this before their sets.
create function public.replace_custom_workout_exercise(p_workout uuid,p_slot text,p_previous uuid,p_exercise uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare c public.workout_customizations; current_id uuid; replacement public.exercises; old_tracking text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into c from public.workout_customizations where workout_id=p_workout and user_id=auth.uid() for update;
  if c.workout_id is null then raise exception 'Custom workout unavailable'; end if;
  select (x->>'exerciseId')::uuid into current_id from jsonb_array_elements(c.items) x where x->>'id'=p_slot;
  if current_id = p_exercise then return p_workout; end if;
  if current_id is null or current_id <> p_previous then raise exception 'The exercise changed on another device'; end if;
  if exists(select 1 from public.sets where workout_id=p_workout and exercise_id=current_id and deleted_at is null) then raise exception 'This exercise has logged sets'; end if;
  select * into replacement from public.exercises where id=p_exercise and user_id=auth.uid();
  if replacement.id is null then raise exception 'Replacement unavailable'; end if;
  if exists(select 1 from jsonb_array_elements(c.items) x where (x->>'exerciseId')::uuid=p_exercise) then raise exception 'That exercise is already in the workout'; end if;
  select tracking into old_tracking from public.exercises where id=current_id;
  update public.workout_customizations set items=(
    select jsonb_agg(case when x->>'id'=p_slot then jsonb_set(jsonb_set(x-'alternateIds','{exerciseId}',to_jsonb(p_exercise)),
      '{targetReps}',case when old_tracking<>replacement.tracking then to_jsonb(case when replacement.tracking='time' then 30 else 10 end) else x->'targetReps' end) else x end order by ord)
    from jsonb_array_elements(c.items) with ordinality as t(x,ord)
  ),revision=revision+1 where workout_id=p_workout;
  return p_workout;
end $$;
revoke all on function public.replace_custom_workout_exercise(uuid,text,uuid,uuid) from public,anon;
grant execute on function public.replace_custom_workout_exercise(uuid,text,uuid,uuid) to authenticated;

-- Both start entry points share an owner lock, so simultaneous taps cannot
-- open a regular and custom session together. An existing session is resumed.
create function public.start_planned_workout(p_routine uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare existing uuid; started uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists(select 1 from public.routines where id=p_routine and user_id=auth.uid()) then raise exception 'Workout day unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended('workout-start:'||auth.uid()::text,0));
  select id into existing from public.workouts where user_id=auth.uid() and source='app' and ended_at is null and cancelled_at is null order by started_at desc limit 1;
  if existing is not null then return existing; end if;
  insert into public.workouts(routine_id) values(p_routine) returning id into started;
  return started;
end $$;
revoke all on function public.start_planned_workout(uuid) from public,anon;
grant execute on function public.start_planned_workout(uuid) to authenticated;

-- Remove only this unlogged item, preserving concurrent edits to other slots.
create function public.remove_custom_workout_exercise(p_workout uuid,p_slot text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare c public.workout_customizations; exercise uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists(select 1 from public.workouts where id=p_workout and user_id=auth.uid() and ended_at is null and cancelled_at is null) then raise exception 'This workout is no longer open'; end if;
  select * into c from public.workout_customizations where workout_id=p_workout and user_id=auth.uid() for update;
  if c.workout_id is null then raise exception 'Custom workout unavailable'; end if;
  select (x->>'exerciseId')::uuid into exercise from jsonb_array_elements(c.items) x where x->>'id'=p_slot;
  if exercise is null then return p_workout; end if;
  if exists(select 1 from public.sets where workout_id=p_workout and exercise_id=exercise and deleted_at is null) then raise exception 'This exercise has logged sets'; end if;
  update public.workout_customizations set items=(select coalesce(jsonb_agg(x order by ord),'[]'::jsonb)
    from jsonb_array_elements(c.items) with ordinality as t(x,ord) where x->>'id'<>p_slot),revision=revision+1 where workout_id=p_workout;
  return p_workout;
end $$;
revoke all on function public.remove_custom_workout_exercise(uuid,text) from public,anon;
grant execute on function public.remove_custom_workout_exercise(uuid,text) to authenticated;
