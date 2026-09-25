-- Minimal stand-in for Supabase's auth schema and roles, so migrations and
-- RLS tests can run against plain Postgres in CI. Not for real databases.

create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'
);

-- Supabase reads the caller from the JWT; tests set this setting instead.
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
