# Build log

## 2026-10-29: Exercise setup and previous records

Type: Improvement. Project: Repd.

Adding an exercise offers sets and reps or seconds before saving. Workout
edits show progress and prevent repeated submissions. Plan setup and
exercise screens lead to previous-record entry using weight plus reps.
This makes exercise configuration available when it is needed and lets
existing lifters bring their numbers into a new plan.

Technical notes: reuses baseline workouts and the existing schema;
workout-only targets are retained in a validated cookie. No migration or
Edge Function deployment. Branch: `fix/exercise-setup-and-records`.
Post-worthy: yes. Not yet deployed. Notion was unavailable in this session.
