alter table public.profiles
 add column measurement_reminders boolean not null default true,
 add column measurement_snoozed_until date,
 add column coverage_goal text not null default 'plan' check(coverage_goal in('plan','balanced')),
 add column coverage_exclusions text[] not null default '{}',
 add column coverage_snoozed_until date,
 add constraint valid_coverage_exclusions check(cardinality(coverage_exclusions)<=16 and coverage_exclusions<@array['chest','front delts','side delts','rear delts','upper back','lats','traps','biceps','triceps','quads','hamstrings','glutes','abductors','adductors','calves','core']::text[]);
grant update(measurement_reminders,measurement_snoozed_until,coverage_goal,coverage_exclusions,coverage_snoozed_until) on public.profiles to authenticated;

create table public.body_measurements (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 measured_on date not null,
 weight_kg numeric(5,2) check(weight_kg between 20 and 400),
 waist_cm numeric(5,1) check(waist_cm between 10 and 300),
 chest_cm numeric(5,1) check(chest_cm between 10 and 300),
 hips_cm numeric(5,1) check(hips_cm between 10 and 300),
 arm_cm numeric(5,1) check(arm_cm between 5 and 150),
 body_fat_pct numeric(4,1) check(body_fat_pct between 1 and 75),
 body_fat_method text check(body_fat_method in('smart_scale','calipers','other')),
 created_at timestamptz not null default now(),
 unique(user_id,measured_on),
 check(num_nonnulls(weight_kg,waist_cm,chest_cm,hips_cm,arm_cm,body_fat_pct)>0),
 check(body_fat_pct is null or body_fat_method is not null)
);
create index body_measurements_owner_date on public.body_measurements(user_id,measured_on desc);
alter table public.body_measurements enable row level security;
revoke all on public.body_measurements from anon,authenticated;
grant select,insert on public.body_measurements to authenticated;
grant update(weight_kg,waist_cm,chest_cm,hips_cm,arm_cm,body_fat_pct,body_fat_method) on public.body_measurements to authenticated;
create policy "measurements owner reads" on public.body_measurements for select to authenticated using(user_id=(select auth.uid()));
create policy "measurements owner inserts" on public.body_measurements for insert to authenticated with check(user_id=(select auth.uid()) and measured_on<=(now() at time zone 'UTC')::date+1);
create policy "measurements owner updates" on public.body_measurements for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- One atomic save keeps the existing weight chart in sync, without replacing historical sets.
create function public.save_body_measurement(p_day date,p_weight numeric default null,p_waist numeric default null,p_chest numeric default null,p_hips numeric default null,p_arm numeric default null,p_fat numeric default null,p_method text default null)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_day is null or p_day>(now() at time zone 'UTC')::date+1 then raise exception 'Choose a valid measurement date';end if;
 insert into public.body_measurements(user_id,measured_on,weight_kg,waist_cm,chest_cm,hips_cm,arm_cm,body_fat_pct,body_fat_method)
 values(auth.uid(),p_day,p_weight,p_waist,p_chest,p_hips,p_arm,p_fat,case when p_fat is null then null else p_method end)
 on conflict(user_id,measured_on) do update set weight_kg=excluded.weight_kg,waist_cm=excluded.waist_cm,chest_cm=excluded.chest_cm,hips_cm=excluded.hips_cm,arm_cm=excluded.arm_cm,body_fat_pct=excluded.body_fat_pct,body_fat_method=excluded.body_fat_method;
 if p_weight is not null then
   insert into public.body_weights(user_id,measured_on,weight_kg) values(auth.uid(),p_day,p_weight)
   on conflict(user_id,measured_on) do update set weight_kg=excluded.weight_kg;
 end if;
end $$;
revoke all on function public.save_body_measurement(date,numeric,numeric,numeric,numeric,numeric,numeric,text) from public, anon, authenticated;
grant execute on function public.save_body_measurement(date,numeric,numeric,numeric,numeric,numeric,numeric,text) to authenticated;

create function public.training_coverage() returns jsonb language sql stable security invoker set search_path='' as $$
 with eligible as(select w.id from public.workouts w where w.user_id=auth.uid() and w.source='app' and w.ended_at is not null and w.cancelled_at is null and w.started_at>=now()-interval '28 days' and w.started_at<=now()),
 planned as(select distinct m from public.plans p join public.routines r on r.plan_id=p.id join public.routine_exercises re on re.routine_id=r.id join public.exercises e on e.id=re.exercise_id cross join lateral unnest(e.muscle_groups) m where p.user_id=auth.uid() and p.is_active),
 covered as(select distinct v.muscle from public.workout_muscle_sets v join eligible w on w.id=v.workout_id where v.sets>0),
 missing as(select count(*) as n from public.working_sets s join eligible w on w.id=s.workout_id join public.exercises e on e.id=s.exercise_id where not(e.muscle_groups && array['chest','front delts','side delts','rear delts','upper back','lats','traps','biceps','triceps','quads','hamstrings','glutes','abductors','adductors','calves','core']::text[]))
 select jsonb_build_object('workouts',(select count(*) from eligible),'unmapped_sets',(select n from missing),'planned',coalesce((select jsonb_agg(m) from planned),'[]'::jsonb),'covered',coalesce((select jsonb_agg(muscle) from covered),'[]'::jsonb),'goal',p.coverage_goal,'exclusions',to_jsonb(p.coverage_exclusions),'paused_until',p.coverage_snoozed_until)
 from public.profiles p where p.id=auth.uid();
$$;
revoke all on function public.training_coverage() from public, anon, authenticated;
grant execute on function public.training_coverage() to authenticated;
