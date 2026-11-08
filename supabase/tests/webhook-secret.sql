-- The analyze-workout webhook secret is readable by the service role only.
reset role;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';
select pg_temp.expect_error($$select public.analyze_webhook_secret()$$,'a signed-in user cannot read the webhook secret');
select pg_temp.expect_error($$select public.notify_analyze_workout()$$,'a signed-in user cannot call the webhook trigger function');
reset role;
set role anon;
select pg_temp.expect_error($$select public.analyze_webhook_secret()$$,'anon cannot read the webhook secret');
reset role;
