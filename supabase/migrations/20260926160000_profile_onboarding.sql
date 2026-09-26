-- Optional details asked when a new user first opens the app, and the
-- training setup their plan was built for. Every column may stay empty.
-- Body weight is stored in kg (spec rule 3); height in cm.

alter table public.profiles
  add column gender text check (gender in ('male', 'female', 'prefer_not_to_say')),
  add column body_weight_kg numeric(5, 2) check (body_weight_kg between 20 and 400),
  add column height_cm numeric(4, 1) check (height_cm between 90 and 250),
  add column experience text check (experience in ('beginner', 'intermediate', 'advanced')),
  add column training_setup text check (training_setup in ('gym', 'dumbbells', 'bodyweight')),
  add column onboarded_at timestamptz;

-- Existing users already have a plan: do not send them through the welcome.
update public.profiles p set onboarded_at = now()
where onboarded_at is null
  and exists (select 1 from public.plans pl where pl.user_id = p.id);
