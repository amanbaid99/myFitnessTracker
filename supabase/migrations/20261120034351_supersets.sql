-- Pairing metadata only. No set, metric or historical workout backfill.
create function public.valid_supersets(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare x jsonb; used text[]:='{}';
begin
  if jsonb_typeof(p) is distinct from 'array' or jsonb_array_length(p)>30 then return false; end if;
  for x in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(x) is distinct from 'object' or x-'first'-'second'-'restSec'<>'{}'::jsonb
      or jsonb_typeof(x->'first') is distinct from 'string' or jsonb_typeof(x->'second') is distinct from 'string'
      or length(x->>'first') not between 1 and 80 or length(x->>'second') not between 1 and 80
      or x->>'first'=x->>'second' or x->>'first'=any(used) or x->>'second'=any(used)
      or jsonb_typeof(x->'restSec') is distinct from 'number' or (x->>'restSec')::numeric not between 0 and 3600
      or (x->>'restSec')::numeric<>trunc((x->>'restSec')::numeric) then return false; end if;
    used:=used||array[x->>'first',x->>'second'];
  end loop;
  return true;
exception when others then return false;
end $$;
revoke all on function public.valid_supersets(jsonb) from public,anon;
grant execute on function public.valid_supersets(jsonb) to authenticated;
alter table public.routines add column supersets jsonb not null default '[]' check(public.valid_supersets(supersets));
-- NULL means an older workout with no recorded pairing, never today's plan.
alter table public.workouts add column supersets jsonb check(supersets is null or public.valid_supersets(supersets));

create function public.capture_workout_supersets() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if TG_OP='INSERT' then
    if NEW.supersets is null then
      select r.supersets into NEW.supersets from public.routines r where r.id=NEW.routine_id and r.user_id=auth.uid();
      NEW.supersets:=coalesce(NEW.supersets,'[]'::jsonb);
    end if;
  elsif OLD.ended_at is not null and NEW.supersets is distinct from OLD.supersets then
    raise exception 'Finished workout pairings are read-only';
  end if;
  return NEW;
end $$;
revoke all on function public.capture_workout_supersets() from public,anon,authenticated;
create trigger capture_workout_supersets before insert or update of supersets on public.workouts
for each row execute function public.capture_workout_supersets();

create function public.change_superset(p jsonb,p_first text,p_second text,p_rest integer) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb; position integer;
begin
  if p_first is null or length(p_first) not between 1 and 80 then raise exception 'Invalid exercise slot'; end if;
  select ord::integer-1 into position from jsonb_array_elements(coalesce(p,'[]'::jsonb)) with ordinality t(x,ord) where x->>'first'=p_first or x->>'second'=p_first;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into result from jsonb_array_elements(coalesce(p,'[]'::jsonb)) x
    where x->>'first'<>p_first and x->>'second'<>p_first;
  if p_second is not null then
    if exists(select 1 from jsonb_array_elements(result) x where x->>'first'=p_second or x->>'second'=p_second) then
      raise exception 'That exercise is already in a superset. Unpair it first'; end if;
    if position is null then result:=result||jsonb_build_array(jsonb_build_object('first',p_first,'second',p_second,'restSec',p_rest));
    else result:=jsonb_insert(result,array[position::text],jsonb_build_object('first',p_first,'second',p_second,'restSec',p_rest)); end if;
  end if;
  if not public.valid_supersets(result) then raise exception 'Choose two exercises and a valid rest time'; end if;
  return result;
end $$;
revoke all on function public.change_superset(jsonb,text,text,integer) from public,anon;
grant execute on function public.change_superset(jsonb,text,text,integer) to authenticated;

-- Atomic read/modify/write preserves other pairs. Optional future-plan save
-- belongs to this workout's source day and commits together with today's pair.
create function public.set_superset(p_kind text,p_parent uuid,p_first text,p_second text,p_rest integer,p_routine uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.routines; w public.workouts; c public.workout_customizations; slot text; ids text[]; result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_kind not in ('routine','workout') or p_kind is null then raise exception 'Invalid pairing scope'; end if;
  if p_kind='routine' or p_routine is not null then
    select * into r from public.routines where id=case when p_kind='routine' then p_parent else p_routine end and user_id=auth.uid() for update;
    if r.id is null then raise exception 'Plan day unavailable'; end if;
    select array_agg(id::text) into ids from public.routine_exercises where routine_id=r.id;
    if not coalesce(p_first=any(ids),false) or (p_second is not null and not coalesce(p_second=any(ids),false)) then raise exception 'Choose exercises from this plan day'; end if;
  end if;
  if p_kind='workout' then
    select * into w from public.workouts where id=p_parent and user_id=auth.uid() and source='app' for update;
    if w.id is null or w.cancelled_at is not null then raise exception 'Workout unavailable'; end if;
    select * into c from public.workout_customizations where workout_id=w.id and user_id=auth.uid();
    if p_routine is not null and p_routine is distinct from coalesce(c.source_routine_id,w.routine_id) then raise exception 'Plan day does not match this workout'; end if;
    if c.workout_id is not null and c.has_prescription then
      select array_agg(x->>'id') into ids from jsonb_array_elements(c.items) x;
    else
      select array_agg(id::text) into ids from public.routine_exercises where routine_id=w.routine_id;
    end if;
    foreach slot in array array_remove(array[p_first,p_second],null) loop
      if not coalesce(slot=any(ids),false) and not exists(select 1 from public.exercises e where 'extra:'||e.id::text=slot and e.user_id=auth.uid()) then
        raise exception 'Exercise slot unavailable'; end if;
    end loop;
    result:=public.change_superset(w.supersets,p_first,p_second,p_rest);
    if w.ended_at is not null and result<>coalesce(w.supersets,'[]'::jsonb) then raise exception 'Finished workout pairings are read-only'; end if;
    if w.ended_at is not null then return result; end if;
    update public.workouts set supersets=result where id=w.id;
  else result:=public.change_superset(r.supersets,p_first,p_second,p_rest);
  end if;
  if r.id is not null then
    update public.routines set supersets=public.change_superset(r.supersets,p_first,p_second,p_rest) where id=r.id;
    update public.plans set is_custom=true where id=r.plan_id and user_id=auth.uid() and template is not null;
  end if;
  return result;
end $$;
revoke all on function public.set_superset(text,uuid,text,text,integer,uuid) from public,anon;
grant execute on function public.set_superset(text,uuid,text,text,integer,uuid) to authenticated;

-- Removing a plan slot unpairs it in the plan, never in captured workouts.
create function public.unpair_removed_plan_slot() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  update public.routines set supersets=public.change_superset(supersets,OLD.id::text,null,0)
    where id=OLD.routine_id and user_id=auth.uid();
  return OLD;
end $$;
revoke all on function public.unpair_removed_plan_slot() from public,anon,authenticated;
create trigger unpair_removed_plan_slot after delete on public.routine_exercises
for each row execute function public.unpair_removed_plan_slot();

-- A removed/customized session slot cannot leave a hidden conflicting pair.
create function public.prune_custom_workout_supersets() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if NEW.has_prescription then
    update public.workouts w set supersets=(
      select coalesce(jsonb_agg(p),'[]'::jsonb) from jsonb_array_elements(coalesce(w.supersets,'[]'::jsonb)) p
      where (p->>'first' like 'extra:%' or exists(select 1 from jsonb_array_elements(NEW.items) x where x->>'id'=p->>'first'))
        and (p->>'second' like 'extra:%' or exists(select 1 from jsonb_array_elements(NEW.items) x where x->>'id'=p->>'second'))
    ) where w.id=NEW.workout_id and w.user_id=auth.uid() and w.ended_at is null;
  end if;
  return NEW;
end $$;
revoke all on function public.prune_custom_workout_supersets() from public,anon,authenticated;
create trigger prune_custom_workout_supersets after insert or update of items on public.workout_customizations
for each row execute function public.prune_custom_workout_supersets();
