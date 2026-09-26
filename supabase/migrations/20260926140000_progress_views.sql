-- Progress screen metrics, computed and never stored (spec rules 4 and 5):
-- both views read working_sets, so warm-ups and deleted sets never count,
-- and skip cancelled workouts. security_invoker makes them obey the
-- caller's RLS.

-- Best set of each exercise in each workout, by estimated 1RM (Epley), with
-- that workout's working-set count and volume for the exercise. Drives the
-- 1RM chart and the per-exercise session list.
create view public.exercise_session_best
with (security_invoker = true) as
select distinct on (ws.workout_id, ws.exercise_id)
  ws.user_id,
  ws.exercise_id,
  ws.workout_id,
  w.started_at,
  ws.weight_kg,
  ws.added_kg,
  ws.reps,
  ws.load_kg,
  ws.e1rm_kg,
  count(*) over (partition by ws.workout_id, ws.exercise_id) as working_sets,
  sum(ws.load_kg * ws.reps) over (partition by ws.workout_id, ws.exercise_id) as volume_kg
from public.working_sets ws
join public.workouts w on w.id = ws.workout_id
where ws.reps > 0 and ws.load_kg is not null and w.cancelled_at is null
order by ws.workout_id, ws.exercise_id, ws.e1rm_kg desc, ws.logged_at;

-- Working sets per muscle group in each workout: a set counts 1 for the
-- exercise's primary (first) muscle and 0.5 for each other muscle. The app
-- groups workouts into weeks in the user's own time zone.
create view public.workout_muscle_sets
with (security_invoker = true) as
select
  ws.user_id,
  ws.workout_id,
  w.started_at,
  m.muscle,
  sum(case when m.ord = 1 then 1.0 else 0.5 end) as sets
from public.working_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
cross join lateral unnest(e.muscle_groups) with ordinality as m(muscle, ord)
where w.cancelled_at is null
group by ws.user_id, ws.workout_id, w.started_at, m.muscle;
