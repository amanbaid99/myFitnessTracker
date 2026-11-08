-- The analyze-workout webhook used a short shared secret written into the
-- trigger set up in the dashboard. It is replaced by a random 256-bit secret
-- generated inside the database and kept in Supabase Vault: the trigger reads
-- it from Vault when it calls the function, and the function reads it back
-- with analyze_webhook_secret() using the service role. Nobody types or sees
-- the value (Aman, 8 Nov 2026).
--
-- Vault and pg_net exist only on the hosted project. Local test databases
-- skip the parts that need them.

-- The function's way to read the secret: service role only.
create or replace function public.analyze_webhook_secret()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (select decrypted_secret from vault.decrypted_secrets where name = 'analyze_workout_webhook_secret');
end;
$$;
revoke execute on function public.analyze_webhook_secret() from public, anon, authenticated;

-- Calls analyze-workout when a workout is finished, with the secret from Vault.
create or replace function public.notify_analyze_workout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  -- Only a workout that has just been finished needs a review.
  if old.ended_at is not null or new.ended_at is null then return new; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'analyze_workout_webhook_secret';
  if v_secret is null then return new; end if;
  perform net.http_post(
    url := 'https://qoeyskhsjvlolbvlvypm.supabase.co/functions/v1/analyze-workout',
    body := jsonb_build_object('type', tg_op, 'schema', tg_table_schema, 'table', tg_table_name,
                               'record', to_jsonb(new), 'old_record', to_jsonb(old)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;
revoke execute on function public.notify_analyze_workout() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.analyze_webhook_secret() to service_role;
  end if;
  if to_regnamespace('vault') is null or to_regnamespace('net') is null then
    raise notice 'Vault or pg_net not installed: the analyze-workout webhook is left as it is';
    return;
  end if;
  if not exists (select 1 from vault.secrets where name = 'analyze_workout_webhook_secret') then
    -- Two random UUIDs: 64 hex characters, about 244 random bits.
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'analyze_workout_webhook_secret',
      'Shared secret between the workouts trigger and the analyze-workout function');
  end if;
  -- Replaces the dashboard webhook of the same name.
  drop trigger if exists analyze_workout on public.workouts;
  create trigger analyze_workout after update on public.workouts
    for each row execute function public.notify_analyze_workout();
end;
$$;
