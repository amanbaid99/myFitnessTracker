-- Throwaway local Postgres only, after test:db. Never run in production.
do $$ begin
  if current_database() <> 'wt_test' then raise exception 'Analysis fixtures require the throwaway wt_test database'; end if;
end $$;
create role service_role nologin bypassrls;
grant usage on schema public, auth to service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
create or replace function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
insert into auth.users(id,email) values
 ('77777777-7777-4777-8777-777777777777','analysis@example.test'),
 ('88888888-8888-4888-8888-888888888888','private@example.test');
insert into public.exercises(id,user_id,name,equipment,muscle_groups) values
 ('77777777-0000-4000-8000-000000000001','77777777-7777-4777-8777-777777777777','Bench Press','barbell','{chest,triceps}'),
 ('88888888-0000-4000-8000-000000000001','88888888-8888-4888-8888-888888888888','Private lift','barbell','{chest}');
insert into public.workouts(id,user_id,started_at,ended_at,title,source,quick_log,energy,notes) values
 ('77777777-0000-4000-8000-000000000010','77777777-7777-4777-8777-777777777777','2026-11-02T06:00:00Z','2026-11-02T07:00:00Z','Earlier press','app',false,4,null),
 ('77777777-0000-4000-8000-000000000011','77777777-7777-4777-8777-777777777777','2026-11-09T06:00:00Z','2026-11-09T07:00:00Z','Renamed press','app',false,4,'Felt steady. Contact trainer@example.test'),
 ('77777777-0000-4000-8000-000000000012','77777777-7777-4777-8777-777777777777','2026-11-11T06:00:00Z','2026-11-11T07:00:00Z','Later quick log','app',true,3,null),
 ('77777777-0000-4000-8000-000000000013','77777777-7777-4777-8777-777777777777','2026-10-26T06:00:00Z','2026-10-26T07:00:00Z','Imported press','sheet_import',false,null,null),
 ('88888888-0000-4000-8000-000000000010','88888888-8888-4888-8888-888888888888','2026-11-09T06:00:00Z','2026-11-09T07:00:00Z','Private workout','app',false,null,null);
insert into public.sets(id,user_id,workout_id,exercise_id,set_no,weight_kg,reps,rpe,logged_at)
 select gen_random_uuid(),'77777777-7777-4777-8777-777777777777',w.id,'77777777-0000-4000-8000-000000000001',1,v.weight,10,8,w.started_at
 from (values ('77777777-0000-4000-8000-000000000010'::uuid,80),('77777777-0000-4000-8000-000000000011'::uuid,82.5),('77777777-0000-4000-8000-000000000012'::uuid,100),('77777777-0000-4000-8000-000000000013'::uuid,75)) v(id,weight)
 join public.workouts w on w.id=v.id;
insert into public.sets(id,user_id,workout_id,exercise_id,set_no,set_type,weight_kg,reps)
 values(gen_random_uuid(),'77777777-7777-4777-8777-777777777777','77777777-0000-4000-8000-000000000011','77777777-0000-4000-8000-000000000001',2,'warmup',1000,10);
insert into public.body_weights(user_id,measured_on,weight_kg) values
 ('77777777-7777-4777-8777-777777777777','2026-11-08',70),('77777777-7777-4777-8777-777777777777','2026-11-10',71);
insert into public.weekly_targets(user_id,week_start,target) values ('77777777-7777-4777-8777-777777777777','2026-11-09',5);
notify pgrst, 'reload schema';
