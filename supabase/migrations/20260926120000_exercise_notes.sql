-- One optional note per exercise per workout ("seat felt low", "left
-- shoulder twinge"). Shown in the logger, on History, and next time the
-- exercise comes up. Notes are not sets, so they can be edited and cleared.

create table public.exercise_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  workout_id uuid not null references public.workouts on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  note text not null check (length(trim(note)) > 0 and char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_id, exercise_id)
);

-- "Last note for this exercise" lookups.
create index exercise_notes_user_exercise_idx
  on public.exercise_notes (user_id, exercise_id, created_at desc);

alter table public.exercise_notes enable row level security;

create policy "exercise_notes: owner reads" on public.exercise_notes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "exercise_notes: owner inserts" on public.exercise_notes
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = exercise_id and e.user_id = (select auth.uid()))
  );
create policy "exercise_notes: owner updates" on public.exercise_notes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercise_notes: owner deletes" on public.exercise_notes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Only the text changes after creation; updated_at is set here.
revoke update on public.exercise_notes from anon, authenticated;
grant update (note) on public.exercise_notes to authenticated;

create function public.exercise_notes_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger exercise_notes_touch before update on public.exercise_notes
  for each row execute function public.exercise_notes_touch();
