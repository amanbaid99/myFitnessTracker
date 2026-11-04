-- Local-only auth adapter for the disposable PostgREST test database.
create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
update public.profiles set seen_tips=array['tour:intro'],onboarded_at=now(),units='kg' where id in('44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666');
