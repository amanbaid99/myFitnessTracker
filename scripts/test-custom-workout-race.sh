#!/usr/bin/env bash
# Only called against the throwaway database created by test-db.sh.
set -euo pipefail
DB="$1"
TASK_TMP="$(mktemp -d)"
trap 'rm -f "$TASK_TMP/custom.log" "$TASK_TMP/planned.log"; rmdir "$TASK_TMP"' EXIT
psql -v ON_ERROR_STOP=1 -q -d "$DB" <<'SQL'
insert into auth.users(id) values('99998888-7777-6666-5555-444433332222');
set role authenticated;
set request.jwt.claim.sub='99998888-7777-6666-5555-444433332222';
insert into public.plans(id,name) values('99990000-0000-0000-0000-000000000001','Race fixture');
insert into public.routines(id,plan_id,name) values('99990000-0000-0000-0000-000000000002','99990000-0000-0000-0000-000000000001','Race day');
insert into public.exercises(id,name,equipment) values('99990000-0000-0000-0000-000000000003','Race press','dumbbell');
SQL
psql -v ON_ERROR_STOP=1 -q -d "$DB" > "$TASK_TMP/custom.log" 2>&1 <<'SQL' &
set role authenticated;
set request.jwt.claim.sub='99998888-7777-6666-5555-444433332222';
select public.use_custom_workout('99990000-0000-0000-0000-000000000004',true,0,'Race today','[{"id":"s","exercise_id":"99990000-0000-0000-0000-000000000003","tracking":"reps","sets":3,"reps":10}]','99990000-0000-0000-0000-000000000002');
SQL
CUSTOM_PID=$!
psql -v ON_ERROR_STOP=1 -q -d "$DB" > "$TASK_TMP/planned.log" 2>&1 <<'SQL' &
set role authenticated;
set request.jwt.claim.sub='99998888-7777-6666-5555-444433332222';
select public.start_planned_workout('99990000-0000-0000-0000-000000000002');
SQL
PLANNED_PID=$!
if ! wait "$CUSTOM_PID"; then
  if ! grep -q 'Resume or discard your open workout first' "$TASK_TMP/custom.log"; then cat "$TASK_TMP/custom.log"; exit 1; fi
fi
if ! wait "$PLANNED_PID"; then cat "$TASK_TMP/planned.log"; exit 1; fi
psql -v ON_ERROR_STOP=1 -q -d "$DB" <<'SQL'
do $$ begin
 if(select count(*) from public.workouts where user_id='99998888-7777-6666-5555-444433332222' and ended_at is null)<>1 then raise exception 'FAIL: concurrent planned/custom starts created duplicate sessions'; end if;
end $$;
SQL
printf 'Custom/planned start race passed.\n'
