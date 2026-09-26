-- Applied to the live database directly on 2026-09-26 (outside CI); copied
-- here verbatim so `supabase db push` knows about it.
alter table public.insights drop constraint insights_kind_check;
alter table public.insights add constraint insights_kind_check
  check (kind in ('weekly_review','workout_review','plateau','balance','suggestion'));

alter table public.insights
  add column workout_id uuid references public.workouts(id) on delete cascade;

-- One weekly review per week (workout_id null), one review per workout
alter table public.insights drop constraint insights_user_id_kind_period_start_key;
alter table public.insights add constraint insights_unique_period_workout
  unique nulls not distinct (user_id, kind, period_start, workout_id);

alter table public.insights add constraint insights_workout_review_has_workout
  check (kind <> 'workout_review' or workout_id is not null);

create index insights_workout_idx on public.insights (workout_id) where workout_id is not null;
