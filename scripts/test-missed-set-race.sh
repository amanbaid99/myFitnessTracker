#!/usr/bin/env bash
# Only used on the throwaway local database created by test-db.sh.
set -euo pipefail
DB="$1"
TASK_TMP="$(mktemp -d)"
trap 'rm -rf "$TASK_TMP"' EXIT
for suffix in 11 12; do
 psql -v ON_ERROR_STOP=1 -q -d "$DB" > "$TASK_TMP/$suffix.log" 2>&1 <<SQL &
set role authenticated;
set request.jwt.claim.sub='88888888-0000-4000-8000-000000000001';
select public.add_missed_set('77777777-0000-4000-8000-0000000000$suffix','88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000003','working',null,0,8,null,0);
SQL
 pids[$suffix]=$!
done
for suffix in 11 12; do if ! wait "${pids[$suffix]}"; then cat "$TASK_TMP/$suffix.log";exit 1;fi;done
psql -v ON_ERROR_STOP=1 -q -d "$DB" <<'SQL'
do $$ begin
 if(select count(distinct set_no) from public.sets where id in ('77777777-0000-4000-8000-000000000011','77777777-0000-4000-8000-000000000012'))<>2 then raise exception 'FAIL: simultaneous missed sets lost a row';end if;
end $$;
SQL
for suffix in 1 2; do
 psql -v ON_ERROR_STOP=1 -qAt -d "$DB" > "$TASK_TMP/claim-$suffix.log" <<'SQL' &
set role authenticated;
set request.jwt.claim.sub='88888888-0000-4000-8000-000000000001';
select public.claim_workout_review_refresh('88888888-0000-4000-8000-000000000004',(select sets_changed_at from public.workouts where id='88888888-0000-4000-8000-000000000004'));
SQL
 pids[$suffix]=$!
done
for suffix in 1 2; do wait "${pids[$suffix]}";done
if [ "$(cat "$TASK_TMP"/claim-*.log | grep -c '^t$')" -ne 1 ];then cat "$TASK_TMP"/claim-*.log;exit 1;fi
printf 'Missed-set and review-claim races passed.\n'
