#!/usr/bin/env bash
# Applies every migration to a throwaway database with a stubbed auth schema,
# then runs the RLS checks. Needs a local Postgres; set PG* env vars to point
# psql at it (CI uses a postgres service container).
set -euo pipefail

cd "$(dirname "$0")/.."
DB="${TEST_DB:-wt_test}"

psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
# Roles are cluster-wide; ignore "already exists" on reruns.
psql -q -d "$DB" < supabase/tests/auth-stub.sql 2>&1 | grep -v "already exists" || true
psql -v ON_ERROR_STOP=1 -q -d "$DB" -c "select 1 from pg_roles where rolname = 'authenticated'" > /dev/null

for f in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" < "$f"
done

psql -v ON_ERROR_STOP=1 -q -d "$DB" < supabase/tests/rls.sql

# Seed: runs twice (second run must be a no-op), then checks the result.
psql -q -d "$DB" -c "insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'seed@example.com')"
for _ in 1 2; do
  psql -q -d "$DB" -v email=Seed@Example.com -f supabase/seed.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /notice: /'
done
psql -v ON_ERROR_STOP=1 -q -d "$DB" < supabase/tests/seed-check.sql
