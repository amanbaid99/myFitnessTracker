-- Feedback and bug reports from inside the app.
--
-- Users can send and read their own; nobody can edit or delete one through
-- the API. Aman reads them all in the Supabase dashboard (Table Editor >
-- feedback), which bypasses RLS.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('feedback', 'bug')),
  rating text check (rating in ('good', 'okay', 'bad')),
  message text check (char_length(message) <= 2000),
  -- Where it was sent from and on what, to help reproduce bugs.
  page text check (char_length(page) <= 200),
  user_agent text check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now(),
  -- A bug needs a description; feedback needs a rating or a message.
  constraint feedback_has_content check (
    case kind
      when 'bug' then rating is null and length(trim(coalesce(message, ''))) > 0
      else rating is not null or length(trim(coalesce(message, ''))) > 0
    end
  )
);

create index feedback_user_created_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

create policy "feedback: owner reads" on public.feedback
  for select to authenticated using (user_id = (select auth.uid()));
create policy "feedback: owner inserts" on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));

-- The one-time "how is it going?" prompt: set when the user answers or
-- dismisses it, so it never shows again on any device.
alter table public.profiles add column feedback_prompted_at timestamptz;
