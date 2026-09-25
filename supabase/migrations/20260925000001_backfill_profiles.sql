-- Creates a profiles row for any account that signed up before the init
-- migration's signup trigger existed. Safe to re-run: existing rows are kept.

insert into public.profiles (id, name)
select u.id, u.raw_user_meta_data ->> 'name'
from auth.users u
on conflict (id) do nothing;
