-- Feedback stages 1 and 2. No historical metric values are stored.
alter type public.equipment add value if not exists 'band';
alter type public.equipment add value if not exists 'plate';

create table public.weekly_targets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  target smallint not null check (target between 1 and 14),
  plan_id uuid references public.plans on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start),
  check (extract(isodow from week_start)=1)
);
alter table public.weekly_targets enable row level security;
revoke all on public.weekly_targets from anon, authenticated;
grant select, insert on public.weekly_targets to authenticated;
grant update(target) on public.weekly_targets to authenticated;
create policy "weekly targets owner reads" on public.weekly_targets for select to authenticated using (user_id=(select auth.uid()));
create policy "weekly targets owner creates current week" on public.weekly_targets for insert to authenticated with check (
 user_id=(select auth.uid()) and week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date
 and (plan_id is null or exists(select 1 from public.plans p where p.id=plan_id and p.user_id=(select auth.uid())))
);
create policy "weekly targets owner updates current week" on public.weekly_targets for update to authenticated
 using(user_id=(select auth.uid()) and week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date)
 with check(user_id=(select auth.uid()) and week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date);

create function public.ensure_weekly_target() returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into public.weekly_targets(user_id,week_start,target,plan_id)
 select auth.uid(),date_trunc('week',now() at time zone 'Asia/Kolkata')::date,p.days_per_week,p.id
 from public.plans p where p.user_id=auth.uid() and p.is_active and p.days_per_week is not null
 on conflict(user_id,week_start) do nothing;
end $$;
revoke all on function public.ensure_weekly_target() from public, anon, authenticated;
grant execute on function public.ensure_weekly_target() to authenticated;

-- A snapshot is made when a plan is activated/changed or a current-week session starts.
-- Late offline imports are not assigned today's plan retroactively.
create function public.capture_weekly_target() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_target int;v_plan uuid;v_week date;
begin
 if tg_table_name='plans' then
   if not new.is_active or new.days_per_week is null then return new; end if;
   v_target:=new.days_per_week;v_plan:=new.id;v_week:=date_trunc('week',now() at time zone 'Asia/Kolkata')::date;
 else
   if new.source<>'app' then return new; end if;
   v_week:=date_trunc('week',new.started_at at time zone 'Asia/Kolkata')::date;
   if v_week<>date_trunc('week',now() at time zone 'Asia/Kolkata')::date then return new; end if;
   select p.days_per_week,p.id into v_target,v_plan from public.routines r join public.plans p on p.id=r.plan_id where r.id=new.routine_id and p.user_id=new.user_id;
 end if;
 if v_target is not null then
   insert into public.weekly_targets(user_id,week_start,target,plan_id) values(new.user_id,v_week,v_target,v_plan) on conflict(user_id,week_start) do nothing;
 end if;
 return new;
end $$;
create trigger snapshot_plan_week after insert or update of days_per_week,is_active on public.plans for each row execute function public.capture_weekly_target();
create trigger snapshot_workout_week after insert on public.workouts for each row execute function public.capture_weekly_target();

create view public.weekly_exercise_volume with(security_invoker=true) as
select w.user_id,date_trunc('week',w.started_at at time zone 'Asia/Kolkata')::date as week_start,
 e.id as exercise_id,e.name as exercise_name,
 sum(s.load_kg*s.reps) filter(where s.reps>0 and s.load_kg is not null and e.equipment::text not in('bodyweight','band') and e.tracking='reps') as volume_kg,
 count(*) filter(where s.reps>0 and s.load_kg is not null and e.equipment::text not in('bodyweight','band') and e.tracking='reps')::int as eligible_sets,
 count(*) filter(where not(coalesce(s.reps>0,false) and s.load_kg is not null and e.equipment::text not in('bodyweight','band') and e.tracking='reps'))::int as excluded_sets
from public.working_sets s join public.workouts w on w.id=s.workout_id join public.exercises e on e.id=s.exercise_id
where w.source='app' and w.ended_at is not null and w.cancelled_at is null
group by w.user_id,date_trunc('week',w.started_at at time zone 'Asia/Kolkata')::date,e.id,e.name;
grant select on public.weekly_exercise_volume to authenticated;
revoke all on public.weekly_exercise_volume from anon;

create view public.weekly_muscle_volume with(security_invoker=true) as
select v.user_id,v.week_start,m.muscle,
 sum(v.volume_kg*case when m.ord=1 then 1 else 0.5 end) as volume_kg,
 sum(v.eligible_sets*case when m.ord=1 then 1 else 0.5 end) as eligible_sets,
 sum(v.excluded_sets*case when m.ord=1 then 1 else 0.5 end) as excluded_sets
from public.weekly_exercise_volume v join public.exercises e on e.id=v.exercise_id
cross join lateral unnest(e.muscle_groups) with ordinality m(muscle,ord)
group by v.user_id,v.week_start,m.muscle;
grant select on public.weekly_muscle_volume to authenticated;
revoke all on public.weekly_muscle_volume from anon;

create function public.training_weekly_report(p_weeks int default 12,p_exercise uuid default null,p_muscle text default null)
returns table(week_start date,workouts int,target int,volume_kg numeric,eligible_sets numeric,excluded_sets numeric)
language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_weeks is null or p_weeks not between 1 and 52 or (p_exercise is not null and p_muscle is not null) then raise exception 'Invalid reporting filter';end if;
 return query
 with weeks as (select (date_trunc('week',now() at time zone 'Asia/Kolkata')::date - n*7)::date as day from generate_series(0,p_weeks-1) n),
 counts as (select date_trunc('week',w.started_at at time zone 'Asia/Kolkata')::date as day,count(*)::int as n from public.workouts w where w.user_id=auth.uid() and w.source='app' and w.ended_at is not null and w.cancelled_at is null group by 1),
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
revoke all on function public.training_weekly_report(int,uuid,text) from public, anon, authenticated;
grant execute on function public.training_weekly_report(int,uuid,text) to authenticated;
