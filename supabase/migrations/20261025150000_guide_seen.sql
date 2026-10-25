-- What a user has already seen of the app's guide: the intro tour,
-- first-time tips and What's new entries, as short keys ("tour:intro",
-- "tip:log-set", "new:alternates"). Kept per account, so a tip shown on one
-- phone does not come back on another. The entries themselves live in the
-- app's code (lib/guide.ts).

alter table public.profiles
  add column seen_tips text[] not null default '{}'
    check (cardinality(seen_tips) <= 500);

-- Adds keys to the signed-in user's list, once each. Atomic, so two
-- devices marking at the same time never drop one another's keys.
create function public.mark_seen(p_keys text[])
returns void
language sql
set search_path = ''
as $$
  update public.profiles p
  set seen_tips = (
    select coalesce(array_agg(distinct k order by k), '{}')
    from unnest(p.seen_tips || array(
      select left(k, 60) from unnest(p_keys) k where length(trim(k)) > 0 limit 50
    )) k
  )
  where p.id = (select auth.uid());
$$;

revoke execute on function public.mark_seen(text[]) from public, anon;
grant execute on function public.mark_seen(text[]) to authenticated;
