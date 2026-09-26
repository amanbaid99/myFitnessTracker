-- Applied to the live database directly on 2026-09-26 (outside CI); copied
-- here verbatim so `supabase db push` knows about it.
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'weekly_review'
    check (kind in ('weekly_review','plateau','balance','suggestion')),
  period_start date not null,
  period_end date not null,
  title text not null check (length(trim(title)) > 0),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  generated_by text not null default 'claude_scheduled',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, kind, period_start)
);

create index insights_user_created_idx on public.insights (user_id, created_at desc);

alter table public.insights enable row level security;

create policy "Users read own insights" on public.insights
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Users mark own insights read" on public.insights
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.insights is 'Written by the scheduled Claude analysis task; app reads and marks read. Clients cannot insert or delete.';
