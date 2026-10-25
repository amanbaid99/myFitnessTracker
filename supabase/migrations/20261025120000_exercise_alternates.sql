-- Alternate exercises for a slot in a day: e.g. Lat Pulldown one week,
-- Pull-up the next. The slot keeps its own exercise (routine_exercises.
-- exercise_id) and its sets, reps and rest; alternates are the other
-- exercises it can be done as. Which one comes up next is worked out from
-- history (the one after the option done last time), so nothing about the
-- rotation is stored.

create table public.routine_exercise_alternates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  routine_exercise_id uuid not null references public.routine_exercises on delete cascade,
  exercise_id uuid not null references public.exercises,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (routine_exercise_id, exercise_id)
);

create index routine_exercise_alternates_slot_idx
  on public.routine_exercise_alternates (routine_exercise_id, sort_order);

alter table public.routine_exercise_alternates enable row level security;

-- Owner only. Adding one also needs the slot's day and the exercise to be
-- the user's own.
create policy "routine_exercise_alternates: owner reads" on public.routine_exercise_alternates
  for select to authenticated using (user_id = (select auth.uid()));
create policy "routine_exercise_alternates: owner inserts" on public.routine_exercise_alternates
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routine_exercises re
                join public.routines r on r.id = re.routine_id
                where re.id = routine_exercise_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id and e.user_id = (select auth.uid()))
  );
create policy "routine_exercise_alternates: owner deletes" on public.routine_exercise_alternates
  for delete to authenticated using (user_id = (select auth.uid()));

-- Alternates are added and removed, never edited.
revoke update on public.routine_exercise_alternates from anon, authenticated;
