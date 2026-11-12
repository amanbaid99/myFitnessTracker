-- Completed-workout edits are distinct from when the training happened.
-- NULL on existing workouts means no edit has been recorded, not a guessed date.
alter table public.workouts
  add column sets_changed_at timestamptz,
  add column review_refresh_requested_at timestamptz;

create function public.mark_finished_sets_changed() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and new.deleted_at is not distinct from old.deleted_at then return new; end if;
  update public.workouts set sets_changed_at=clock_timestamp()
  where id=new.workout_id and user_id=(select auth.uid()) and ended_at is not null and cancelled_at is null;
  return new;
end $$;
create trigger finished_sets_changed after insert or update of deleted_at on public.sets
for each row execute function public.mark_finished_sets_changed();

-- A client-generated ID makes a lost response safe to retry. Lock the workout
-- so simultaneous additions choose different set numbers, including gaps.
create function public.add_missed_set(p_id uuid,p_workout uuid,p_exercise uuid,p_type public.set_type,
 p_weight_kg numeric,p_added_kg numeric,p_reps int,p_duration_sec int default null,p_assistance_kg numeric default null)
returns uuid language plpgsql set search_path='' as $$
declare w public.workouts; s public.sets; n int;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into w from public.workouts where id=p_workout and user_id=auth.uid() for update;
 if not found or w.ended_at is null or w.cancelled_at is not null or w.source='baseline' then
  raise exception 'Choose a completed workout'; end if;
 if p_id is null or p_type is null then raise exception 'Check the set details'; end if;
 if not exists(select 1 from public.sets where workout_id=w.id and exercise_id=p_exercise and deleted_at is null)
  or not exists(select 1 from public.exercises where id=p_exercise and user_id=auth.uid()) then
  raise exception 'Choose an exercise already logged in this workout'; end if;
 p_weight_kg:=round(p_weight_kg,2); p_added_kg:=round(coalesce(p_added_kg,0),2); p_assistance_kg:=round(p_assistance_kg,2);
 if (p_weight_kg is not null and p_weight_kg not between 0 and 9999.99) or p_added_kg not between 0 and 999.99
  or (p_assistance_kg is not null and (p_assistance_kg not between 0 and 9999.99 or p_weight_kg is not null or p_added_kg<>0 or p_duration_sec is not null))
  or (p_duration_sec is not null and (p_duration_sec not between 1 and 3600 or p_reps is not null))
  or (p_duration_sec is null and (p_reps is null or p_reps not between 1 and 500)) then
  raise exception 'Check the weight, assistance, reps or seconds'; end if;
 select * into s from public.sets where id=p_id;
 if found then
  if s.workout_id=p_workout and s.exercise_id=p_exercise and s.set_type=p_type and s.deleted_at is null
    and s.weight_kg is not distinct from p_weight_kg and s.added_kg=p_added_kg
    and s.reps is not distinct from p_reps and s.duration_sec is not distinct from p_duration_sec
    and s.assistance_kg is not distinct from p_assistance_kg then return s.id; end if;
  raise exception 'This set was already saved or changed. Refresh to review it';
 end if;
 select min(candidate) into n from generate_series(1,coalesce((select count(*)::int from public.sets
  where workout_id=p_workout and exercise_id=p_exercise and set_type=p_type and deleted_at is null),0)+1) candidate
 where not exists(select 1 from public.sets where workout_id=p_workout and exercise_id=p_exercise
  and set_type=p_type and set_no=candidate and deleted_at is null);
 insert into public.sets(id,workout_id,exercise_id,set_no,set_type,weight_kg,added_kg,reps,duration_sec,assistance_kg,logged_at)
 values(p_id,p_workout,p_exercise,n,p_type,p_weight_kg,p_added_kg,p_reps,p_duration_sec,p_assistance_kg,w.ended_at);
 return p_id;
end $$;
revoke execute on function public.add_missed_set(uuid,uuid,uuid,public.set_type,numeric,numeric,int,int,numeric) from public,anon;
grant execute on function public.add_missed_set(uuid,uuid,uuid,public.set_type,numeric,numeric,int,int,numeric) to authenticated;

-- Accidental repeated refreshes share the same in-flight request. A newer edit
-- may request a new analysis; failed generation can be retried after 150 seconds.
create function public.claim_workout_review_refresh(p_workout uuid,p_revision timestamptz) returns boolean
language plpgsql set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 update public.workouts set review_refresh_requested_at=clock_timestamp()
 where id=p_workout and user_id=auth.uid() and ended_at is not null and cancelled_at is null and source='app'
  and sets_changed_at=p_revision and (review_refresh_requested_at is null
    or review_refresh_requested_at<sets_changed_at or review_refresh_requested_at<clock_timestamp()-interval '150 seconds');
 return found;
end $$;
revoke execute on function public.claim_workout_review_refresh(uuid,timestamptz) from public,anon;
grant execute on function public.claim_workout_review_refresh(uuid,timestamptz) to authenticated;
