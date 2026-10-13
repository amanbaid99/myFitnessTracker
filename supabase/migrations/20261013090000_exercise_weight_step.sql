-- How much an exercise's weight goes up by: the smallest plate or stack
-- jump on the equipment it uses. Aims and warm-ups step by it. Every
-- exercise, existing ones included, starts at 2.5 kg (Aman's choice).
-- Stored in kg like every other weight (spec rule 3).

alter table public.exercises
  add column weight_step_kg numeric(4, 2) not null default 2.5
    check (weight_step_kg > 0 and weight_step_kg <= 20);
