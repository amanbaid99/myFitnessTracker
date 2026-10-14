-- "Ask coach": how many questions each user asked per day (UTC), so one
-- person cannot use up the app's shared free AI quota. Users can read
-- their own count; only count_coach_question() writes it, one at a time,
-- for the caller.

create table public.coach_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  questions int not null default 0 check (questions >= 0),
  primary key (user_id, day)
);

alter table public.coach_usage enable row level security;

create policy "coach_usage: owner reads" on public.coach_usage
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.coach_usage from anon, authenticated;

-- Counts one answered question for the caller and returns today's total.
create function public.count_coach_question()
returns int
language sql
security definer
set search_path = ''
as $$
  insert into public.coach_usage (user_id, day, questions)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set questions = public.coach_usage.questions + 1
  returning questions;
$$;

revoke execute on function public.count_coach_question() from public, anon;
grant execute on function public.count_coach_question() to authenticated;
