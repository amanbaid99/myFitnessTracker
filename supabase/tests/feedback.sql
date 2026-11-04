-- Four-stage feedback features: owner isolation, consent, revocation and metric rules.
reset role;
insert into auth.users(id,email) values
 ('44444444-4444-4444-4444-444444444444','coach-fixture@example.invalid'),
 ('55555555-5555-5555-5555-555555555555','client-fixture@example.invalid'),
 ('66666666-6666-6666-6666-666666666666','unrelated-fixture@example.invalid');
update public.profiles set name=case when id='44444444-4444-4444-4444-444444444444' then 'Fixture Coach' else 'Fixture Client' end where id in('44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555');
insert into public.plans(id,user_id,name,days_per_week,is_active) values('55550000-0000-0000-0000-000000000001','55555555-5555-5555-5555-555555555555','Fixture Plan',4,true);
insert into public.routines(id,user_id,plan_id,name,sort_order) values('55550000-0000-0000-0000-000000000002','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000001','Fixture Day',1);
insert into public.exercises(id,user_id,name,equipment,muscle_groups) values
 ('55550000-0000-0000-0000-000000000003','55555555-5555-5555-5555-555555555555','Fixture Press','barbell',array['chest','triceps']),
 ('55550000-0000-0000-0000-000000000004','55555555-5555-5555-5555-555555555555','Fixture Band','band',array['lats']),
 ('55550000-0000-0000-0000-000000000005','55555555-5555-5555-5555-555555555555','Fixture Bodyweight','bodyweight',array['core']);
insert into public.routine_exercises(routine_id,exercise_id,sort_order,target_sets,target_reps) values('55550000-0000-0000-0000-000000000002','55550000-0000-0000-0000-000000000003',1,3,10);
insert into public.workouts(id,user_id,routine_id,started_at,ended_at) values('55550000-0000-0000-0000-000000000006','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000002',now(),now());
insert into public.sets(id,user_id,workout_id,exercise_id,set_no,set_type,weight_kg,reps,deleted_at) values
 ('55550000-0000-0000-0000-000000000010','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000006','55550000-0000-0000-0000-000000000003',1,'working',10,10,null),
 ('55550000-0000-0000-0000-000000000011','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000006','55550000-0000-0000-0000-000000000003',2,'working',20,5,null),
 ('55550000-0000-0000-0000-000000000012','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000006','55550000-0000-0000-0000-000000000003',1,'warmup',100,10,null),
 ('55550000-0000-0000-0000-000000000013','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000006','55550000-0000-0000-0000-000000000003',3,'working',100,10,now()),
 ('55550000-0000-0000-0000-000000000014','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000006','55550000-0000-0000-0000-000000000004',1,'working',10,10,null),
 ('55550000-0000-0000-0000-000000000015','55555555-5555-5555-5555-555555555555','55550000-0000-0000-0000-000000000006','55550000-0000-0000-0000-000000000005',1,'working',null,10,null);
insert into public.weekly_targets(user_id,week_start,target) values('55555555-5555-5555-5555-555555555555',date_trunc('week',now() at time zone 'Asia/Kolkata')::date-7,5);
set role authenticated;
set request.jwt.claim.sub='55555555-5555-5555-5555-555555555555';
select pg_temp.expect((select volume_kg=200 and eligible_sets=2 and excluded_sets=2 and workouts=1 and target=4 from public.training_weekly_report(1)),'weekly volume uses eligible live working sets and the captured target');
select pg_temp.expect((select volume_kg=100 from public.training_weekly_report(1,null,'triceps')),'muscle volume is explicitly weighted and non-additive');
select pg_temp.expect_error($$select * from public.training_weekly_report(99)$$,'report window is bounded');
select pg_temp.expect_error($$select * from public.training_weekly_report(1,'55550000-0000-0000-0000-000000000003','chest')$$,'ambiguous report filters are rejected');
update public.weekly_targets set target=2 where week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date-7;
select pg_temp.expect((select target=5 from public.weekly_targets where week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date-7),'past weekly targets cannot be rewritten');
update public.plans set days_per_week=3 where id='55550000-0000-0000-0000-000000000001';
select public.ensure_weekly_target();
select pg_temp.expect((select target=4 from public.weekly_targets where week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date),'changing the plan does not rewrite a captured target');
update public.weekly_targets set target=3 where week_start=date_trunc('week',now() at time zone 'Asia/Kolkata')::date;
select pg_temp.expect((select target=3 from public.training_weekly_report(1)),'current weekly target is editable');
select public.save_body_measurement(current_date,70,80,null,null,null,20,'smart_scale');
select pg_temp.expect((select weight_kg=70 from public.body_weights where measured_on=current_date),'measurement save updates the body-weight log atomically');
select pg_temp.expect_error($$select public.save_body_measurement(current_date,80,999,null,null,null,null,null)$$,'invalid measurements are rejected');
select pg_temp.expect((select weight_kg=70 from public.body_weights where measured_on=current_date),'invalid measurement does not partially change weight');
select pg_temp.expect_error($$select public.save_body_measurement(current_date,null,null,null,null,null,25,null)$$,'body fat estimates require a method');
update public.profiles set units='lb',default_rest_sec=245 where id=auth.uid();
select pg_temp.expect((select weight_kg=10 from public.sets where id='55550000-0000-0000-0000-000000000010'),'unit preference does not rewrite historical loads');
set request.jwt.claim.sub='66666666-6666-6666-6666-666666666666';
select pg_temp.expect((select count(*)=0 from public.weekly_exercise_volume),'another user cannot read weekly volume');
select pg_temp.expect((select count(*)=0 from public.body_measurements),'another user cannot read measurements');
select pg_temp.expect((select count(*)=0 from public.weekly_targets),'another user cannot read targets');
select pg_temp.expect_error($$insert into public.weekly_targets(user_id,week_start,target) values('55555555-5555-5555-5555-555555555555',date_trunc('week',now() at time zone 'Asia/Kolkata')::date,7)$$,'another user cannot forge a target');
select pg_temp.expect_error($$insert into public.coaching_connections(user_id,client_id) values(auth.uid(),'55555555-5555-5555-5555-555555555555')$$,'direct connections cannot bypass consent');

-- Keep private fixture invitation tokens inside this block, never in test output.
do $$
declare token text;connection uuid;assessment uuid;coach uuid:='44444444-4444-4444-4444-444444444444';client uuid:='55555555-5555-5555-5555-555555555555';outsider uuid:='66666666-6666-6666-6666-666666666666';
begin
 perform set_config('request.jwt.claim.sub',coach::text,false);
 token:=public.create_coaching_invite();
 perform pg_temp.expect_error(format('select public.accept_coaching_invite(%L,false)',token),'a coach cannot accept their own invitation');
 perform set_config('request.jwt.claim.sub',client::text,false);
 perform pg_temp.expect((public.coaching_invite_preview(token)->>'coach_name')='Fixture Coach','client can review coach identity before consent');
 connection:=public.accept_coaching_invite(token,false);
 perform pg_temp.expect_error(format('select public.accept_coaching_invite(%L,false)',token),'invitation tokens are single-use');
 perform pg_temp.expect_error(format('select public.save_coach_assessment(%L,%L,%L,current_date+28)',connection,'Fake observation','Fake cue'),'clients cannot impersonate the coach');
 perform set_config('request.jwt.claim.sub',outsider::text,false);
 perform pg_temp.expect_error(format('select public.coaching_client_summary(%L)',connection),'unrelated accounts cannot read a client record');
 perform pg_temp.expect_error(format('select public.coaching_client_workout(%L,%L)',connection,'55550000-0000-0000-0000-000000000006'),'unrelated accounts cannot read client sets');
 perform pg_temp.expect_error(format('select public.revoke_coaching_connection(%L)',connection),'unrelated accounts cannot revoke connections');
 perform pg_temp.expect_error(format('select public.coaching_client_report(%L,1)',connection),'unrelated accounts cannot read delegated reports');
 perform set_config('request.jwt.claim.sub',coach::text,false);
 perform pg_temp.expect(jsonb_array_length(public.coaching_client_summary(connection)->'measurements')=0,'measurement sharing defaults off');
 perform pg_temp.expect((select count(*)=0 from public.body_measurements),'a connected coach cannot bypass the scoped measurement API');
 perform pg_temp.expect((select count(*)=0 from public.workouts where user_id=client),'a coach has no general access to client workout tables');
 perform pg_temp.expect((select volume_kg=200 and target=3 from public.coaching_client_report(connection,1)),'coach report is scoped to the consenting client');
 perform pg_temp.expect((select volume_kg=100 from public.coaching_client_report(connection,1,null,'triceps')),'coach report supports weighted muscle filters');
 assessment:=public.save_coach_assessment(connection,'Observed movement limit','Coach-reviewed training cue',current_date+28);
 perform pg_temp.expect((select count(*)=1 from public.client_assessments where id=assessment),'assigned coach reads the reviewed assessment');
 perform pg_temp.expect(jsonb_array_length(public.coaching_client_workout(connection,'55550000-0000-0000-0000-000000000006')->'sets')=5,'scoped workout excludes deleted sets and retains warm-ups');
 perform set_config('request.jwt.claim.sub',client::text,false);
 perform public.set_coaching_sharing(connection,true);
 perform set_config('request.jwt.claim.sub',coach::text,false);
 perform pg_temp.expect(jsonb_array_length(public.coaching_client_summary(connection)->'measurements')=1,'measurement sharing requires the client opt-in');
 perform set_config('request.jwt.claim.sub',client::text,false);
 perform public.set_coaching_sharing(connection,false);
 perform set_config('request.jwt.claim.sub',coach::text,false);
 perform pg_temp.expect(jsonb_array_length(public.coaching_client_summary(connection)->'measurements')=0,'measurement opt-out takes effect on the next read');
 perform set_config('request.jwt.claim.sub',client::text,false);
 perform public.revoke_coaching_connection(connection);
 perform set_config('request.jwt.claim.sub',coach::text,false);
 perform pg_temp.expect_error(format('select public.coaching_client_summary(%L)',connection),'revocation blocks future profile reads');
 perform pg_temp.expect_error(format('select public.coaching_client_report(%L,1)',connection),'revocation blocks delegated reports');
 perform pg_temp.expect_error(format('select public.save_coach_assessment(%L,%L,%L,current_date+28)',connection,'Changed observation','Changed cue'),'revocation blocks assessment writes');
 perform pg_temp.expect((select count(*)=0 from public.client_assessments where id=assessment),'revoked coach loses direct assessment access');
 perform set_config('request.jwt.claim.sub',client::text,false);
 perform pg_temp.expect((select count(*)=1 from public.client_assessments where id=assessment),'client retains their own assessment history');
 perform public.archive_coach_assessment(assessment);
 perform pg_temp.expect((select not active from public.client_assessments where id=assessment),'client can archive an observation after revocation');
end $$;
reset role;
set role anon;
select pg_temp.expect_error($$select public.create_coaching_invite()$$,'anonymous callers cannot create coaching invites');
select pg_temp.expect_error($$select public.training_weekly_report(1)$$,'anonymous callers cannot read training reports');
select pg_temp.expect_error($$select public.save_body_measurement(current_date,70)$$,'anonymous callers cannot record measurements');
reset role;

-- Expired invitations remain unavailable even if their raw token is known.
insert into public.coaching_invites(user_id,token_hash,expires_at)
values('44444444-4444-4444-4444-444444444444',encode(sha256(convert_to(repeat('e',64),'UTF8')),'hex'),now()-interval '1 second');
set role authenticated;
set request.jwt.claim.sub='55555555-5555-5555-5555-555555555555';
select pg_temp.expect_error($$select public.coaching_invite_preview(repeat('e',64))$$,'expired invitation cannot be previewed');
select pg_temp.expect_error($$select public.accept_coaching_invite(repeat('e',64),false)$$,'expired invitation cannot grant access');
reset role;
