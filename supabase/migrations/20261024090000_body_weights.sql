-- Body weight log: one weight per person per day, shown as a graph on the
-- Today screen and used as the load of bodyweight exercises (pull-ups,
-- dips) in reviews and the logger. Kilograms, like every weight.

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create index body_weights_user_day_idx on public.body_weights (user_id, measured_on desc);

alter table public.body_weights enable row level security;

create policy "body_weights: owner reads" on public.body_weights
  for select to authenticated using (user_id = (select auth.uid()));
create policy "body_weights: owner inserts" on public.body_weights
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "body_weights: owner updates" on public.body_weights
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "body_weights: owner deletes" on public.body_weights
  for delete to authenticated using (user_id = (select auth.uid()));

-- Only the weight changes after creation (re-logging a day updates it).
revoke update on public.body_weights from anon, authenticated;
grant update (weight_kg) on public.body_weights to authenticated;
