-- Read-only report of what the init migration created, run by the
-- "Database migrations" workflow before anything is applied.
\pset footer off

with expected(kind, name) as (
  values
    ('table', 'profiles'), ('table', 'exercises'), ('table', 'routines'),
    ('table', 'routine_exercises'), ('table', 'workouts'), ('table', 'sets'),
    ('table', 'sessions'), ('view', 'working_sets'),
    ('type', 'exercise_type'), ('type', 'equipment'), ('type', 'set_type'), ('type', 'units'),
    ('function', 'handle_new_user'), ('function', 'sets_append_only'), ('function', 'ping'),
    ('trigger', 'on_auth_user_created'), ('trigger', 'sets_append_only')
),
found as (
  select e.kind, e.name,
    case e.kind
      when 'table' then to_regclass('public.' || e.name) is not null
      when 'view' then to_regclass('public.' || e.name) is not null
      when 'type' then to_regtype('public.' || e.name) is not null
      when 'function' then exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                   where n.nspname = 'public' and p.proname = e.name)
      when 'trigger' then exists (select 1 from pg_trigger where tgname = e.name and not tgisinternal)
    end as present
  from expected e
)
select kind, name, status from (
  select kind, name, case when present then 'present' else 'MISSING' end as status,
         case when present then 1 else 0 end as sort
  from found
  union all
  select 'summary', (select count(*) from found where present) || ' of ' || (select count(*) from found) || ' present', '', 2
) r
order by sort, kind, name;

-- Counts run through query_to_xml so a missing table reads as n/a instead
-- of failing the whole report.
create function pg_temp.count_rows(rel text, expr text default 'count(*)::text') returns text
language sql as $$
  select case when to_regclass(rel) is null then 'n/a'
    else (xpath('/row/c/text()', query_to_xml(format('select %s as c from %s', expr, rel), false, true, '')))[1]::text
  end
$$;

select
  pg_temp.count_rows('auth.users') as auth_users,
  pg_temp.count_rows('public.profiles') as profiles,
  pg_temp.count_rows('public.routines') as routines,
  coalesce(pg_temp.count_rows('supabase_migrations.schema_migrations', $$coalesce(string_agg(version, ', '), 'none')$$), 'none')
    as recorded_migrations;
