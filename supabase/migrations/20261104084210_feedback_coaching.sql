-- Sharing is explicit and revocable. Existing workout/set RLS policies are unchanged.
create table public.coaching_invites (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 token_hash text not null unique,
 expires_at timestamptz not null default now()+interval '7 days',
 used_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.coaching_connections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 client_id uuid not null references auth.users on delete cascade,
 share_measurements boolean not null default false,
 accepted_at timestamptz not null default now(),
 revoked_at timestamptz,
 check(user_id<>client_id)
);
create unique index one_active_coaching_connection on public.coaching_connections(user_id,client_id) where revoked_at is null;
create index coaching_client_idx on public.coaching_connections(client_id);
create table public.client_assessments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 coach_id uuid not null references auth.users on delete cascade,
 connection_id uuid not null references public.coaching_connections on delete cascade,
 finding text not null check(length(trim(finding)) between 1 and 300),
 adaptation text not null check(length(trim(adaptation)) between 1 and 1500),
 review_on date not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index assessments_client_idx on public.client_assessments(user_id,active,review_on);
alter table public.coaching_invites enable row level security;
alter table public.coaching_connections enable row level security;
alter table public.client_assessments enable row level security;
revoke all on public.coaching_invites,public.coaching_connections,public.client_assessments from anon,authenticated;
grant select on public.coaching_connections,public.client_assessments to authenticated;
create policy "connection participants read" on public.coaching_connections for select to authenticated using(user_id=(select auth.uid()) or client_id=(select auth.uid()));
create policy "client owns assessment history" on public.client_assessments for select to authenticated using(user_id=(select auth.uid()));
create policy "assigned coach reads assessments" on public.client_assessments for select to authenticated using(coach_id=(select auth.uid()) and exists(select 1 from public.coaching_connections c where c.id=connection_id and c.user_id=(select auth.uid()) and c.client_id=client_assessments.user_id and c.revoked_at is null));

-- These narrow definer functions cross the consent boundary. Every access is checked.
create function public.create_coaching_invite() returns text language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,7));
 if (select count(*) from public.coaching_invites where user_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Invitation limit reached. Try tomorrow.';end if;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.coaching_invites(user_id,token_hash) values(auth.uid(),encode(sha256(convert_to(token,'UTF8')),'hex'));
 return token;
end $$;
create function public.accept_coaching_invite(p_token text,p_share_measurements boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.coaching_invites;connection uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_token is null or length(p_token)<>64 then raise exception 'Invitation is not available';end if;
 select * into inv from public.coaching_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if inv.id is null or inv.used_at is not null or inv.expires_at<=now() or inv.user_id=auth.uid() then raise exception 'Invitation is not available';end if;
 if exists(select 1 from public.coaching_connections where user_id=inv.user_id and client_id=auth.uid() and revoked_at is null) then raise exception 'You already have an active connection with this coach';end if;
 insert into public.coaching_connections(user_id,client_id,share_measurements) values(inv.user_id,auth.uid(),coalesce(p_share_measurements,false)) returning id into connection;
 update public.coaching_invites set used_at=now() where id=inv.id;
 return connection;
end $$;
create function public.revoke_coaching_connection(p_connection uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 update public.coaching_connections set revoked_at=coalesce(revoked_at,now()) where id=p_connection and (user_id=auth.uid() or client_id=auth.uid());
 if not found then raise exception 'Connection unavailable';end if;
end $$;
create function public.set_coaching_sharing(p_connection uuid,p_share boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 update public.coaching_connections set share_measurements=coalesce(p_share,false) where id=p_connection and client_id=auth.uid() and revoked_at is null;
 if not found then raise exception 'Connection unavailable';end if;
end $$;
create function public.save_coach_assessment(p_connection uuid,p_finding text,p_adaptation text,p_review date,p_assessment uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.coaching_connections;answer uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select * into c from public.coaching_connections where id=p_connection and user_id=auth.uid() and revoked_at is null for share;
 if c.id is null then raise exception 'Connection unavailable';end if;
 if p_review is null or p_review<(now() at time zone 'UTC')::date or p_review>(now() at time zone 'UTC')::date+366 then raise exception 'Choose a review date within the next year';end if;
 if p_assessment is null then
 insert into public.client_assessments(user_id,coach_id,connection_id,finding,adaptation,review_on) values(c.client_id,auth.uid(),c.id,trim(p_finding),trim(p_adaptation),p_review) returning id into answer;
 else
 update public.client_assessments set finding=trim(p_finding),adaptation=trim(p_adaptation),review_on=p_review,updated_at=now() where id=p_assessment and connection_id=c.id and user_id=c.client_id and coach_id=auth.uid() returning id into answer;
 if answer is null then raise exception 'Assessment unavailable';end if;
 end if;
 return answer;
end $$;
create function public.archive_coach_assessment(p_assessment uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 update public.client_assessments a set active=false,updated_at=now() where a.id=p_assessment and
 (a.user_id=auth.uid() or (a.coach_id=auth.uid() and exists(select 1 from public.coaching_connections c where c.id=a.connection_id and c.user_id=auth.uid() and c.client_id=a.user_id and c.revoked_at is null)));
 if not found then raise exception 'Assessment unavailable';end if;
end $$;

create function public.coaching_client_summary(p_connection uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.coaching_connections;answer jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select * into c from public.coaching_connections where id=p_connection and user_id=auth.uid() and revoked_at is null;
 if c.id is null then raise exception 'Connection unavailable';end if;
 select jsonb_build_object('connection_id',c.id,'client_name',coalesce(p.name,'Client'),'units',p.units,'share_measurements',c.share_measurements,
 'report',coalesce((select jsonb_agg(to_jsonb(x)) from public.coaching_client_report(c.id,12,null,null) x),'[]'::jsonb),
 'report_exercises',coalesce((select jsonb_agg(jsonb_build_object('id',x.exercise_id,'name',x.exercise_name)) from (select distinct exercise_id,exercise_name from public.weekly_exercise_volume where user_id=c.client_id) x),'[]'::jsonb),
 'workouts',coalesce((select jsonb_agg(to_jsonb(x)) from (select w.id,w.started_at,w.ended_at,r.name as routine_name,(select count(*) from public.working_sets s where s.workout_id=w.id) as working_sets from public.workouts w left join public.routines r on r.id=w.routine_id where w.user_id=c.client_id and w.source='app' and w.ended_at is not null and w.cancelled_at is null order by w.started_at desc limit 20) x),'[]'::jsonb),
 'assessments',coalesce((select jsonb_agg(to_jsonb(a) order by a.active desc,a.review_on) from public.client_assessments a where a.connection_id=c.id and a.user_id=c.client_id and a.coach_id=auth.uid()),'[]'::jsonb),
 'measurements',case when c.share_measurements then coalesce((select jsonb_agg(to_jsonb(x)) from (select measured_on,weight_kg,waist_cm,chest_cm,hips_cm,arm_cm,body_fat_pct,body_fat_method from public.body_measurements where user_id=c.client_id order by measured_on desc limit 12) x),'[]'::jsonb) else '[]'::jsonb end,
 'recent_weight',case when c.share_measurements then (select jsonb_build_object('measured_on',measured_on,'weight_kg',weight_kg) from public.body_weights where user_id=c.client_id order by measured_on desc limit 1) else null end
 ) into answer from public.profiles p where p.id=c.client_id;
 return answer;
end $$;
create function public.coaching_client_workout(p_connection uuid,p_workout uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.coaching_connections;answer jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select * into c from public.coaching_connections where id=p_connection and user_id=auth.uid() and revoked_at is null;
 if c.id is null then raise exception 'Connection unavailable';end if;
 select jsonb_build_object('id',w.id,'started_at',w.started_at,'ended_at',w.ended_at,'routine_name',r.name,
 'sets',coalesce((select jsonb_agg(jsonb_build_object('exercise_name',e.name,'set_no',s.set_no,'set_type',s.set_type,'weight_kg',s.weight_kg,'added_kg',s.added_kg,'reps',s.reps,'duration_sec',s.duration_sec) order by e.name,s.set_type,s.set_no) from public.sets s join public.exercises e on e.id=s.exercise_id where s.workout_id=w.id and s.user_id=c.client_id and s.deleted_at is null),'[]'::jsonb)) into answer
 from public.workouts w left join public.routines r on r.id=w.routine_id where w.id=p_workout and w.user_id=c.client_id and w.source='app' and w.ended_at is not null and w.cancelled_at is null;
 if answer is null then raise exception 'Workout unavailable';end if;
 return answer;
end $$;
revoke all on function public.create_coaching_invite(),public.accept_coaching_invite(text,boolean),public.revoke_coaching_connection(uuid),public.set_coaching_sharing(uuid,boolean),public.save_coach_assessment(uuid,text,text,date,uuid),public.archive_coach_assessment(uuid),public.coaching_client_summary(uuid),public.coaching_client_workout(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_coaching_invite(),public.accept_coaching_invite(text,boolean),public.revoke_coaching_connection(uuid),public.set_coaching_sharing(uuid,boolean),public.save_coach_assessment(uuid,text,text,date,uuid),public.archive_coach_assessment(uuid),public.coaching_client_summary(uuid),public.coaching_client_workout(uuid,uuid) to authenticated;

create function public.coaching_invite_preview(p_token text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare answer jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_token is null or length(p_token)<>64 then raise exception 'Invitation is not available';end if;
 select jsonb_build_object('coach_name',coalesce(p.name,'Coach'),'expires_at',i.expires_at) into answer
 from public.coaching_invites i join public.profiles p on p.id=i.user_id
 where i.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and i.used_at is null and i.expires_at>now() and i.user_id<>auth.uid();
 if answer is null then raise exception 'Invitation is not available';end if;
 return answer;
end $$;
create function public.coaching_connections_list() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'user_id',c.user_id,'client_id',c.client_id,'share_measurements',c.share_measurements,'accepted_at',c.accepted_at,'revoked_at',c.revoked_at,'coach_name',coalesce(coach.name,'Coach'),'client_name',coalesce(client.name,'Client')) order by c.accepted_at desc),'[]'::jsonb)
 from public.coaching_connections c join public.profiles coach on coach.id=c.user_id join public.profiles client on client.id=c.client_id
 where auth.uid() is not null and (c.user_id=auth.uid() or c.client_id=auth.uid());
$$;
revoke all on function public.coaching_invite_preview(text),public.coaching_connections_list() from public, anon, authenticated;
grant execute on function public.coaching_invite_preview(text),public.coaching_connections_list() to authenticated;

create function public.coaching_client_report(p_connection uuid,p_weeks int default 12,p_exercise uuid default null,p_muscle text default null)
returns table(week_start date,workouts int,target int,volume_kg numeric,eligible_sets numeric,excluded_sets numeric)
language plpgsql stable security definer set search_path='' as $$
declare client uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select c.client_id into client from public.coaching_connections c where c.id=p_connection and c.user_id=auth.uid() and c.revoked_at is null;
 if client is null then raise exception 'Connection unavailable';end if;
 if p_weeks is null or p_weeks not between 1 and 52 or (p_exercise is not null and p_muscle is not null) then raise exception 'Invalid reporting filter';end if;
 return query
 with weeks as(select (date_trunc('week',now() at time zone 'Asia/Kolkata')::date-n*7)::date as day from generate_series(0,p_weeks-1) n),
 counts as(select date_trunc('week',w.started_at at time zone 'Asia/Kolkata')::date as day,count(*)::int as n from public.workouts w where w.user_id=client and w.source='app' and w.ended_at is not null and w.cancelled_at is null group by 1),
 volumes as(
 select v.week_start as day,sum(v.volume_kg) as volume,sum(v.eligible_sets)::numeric as eligible,sum(v.excluded_sets)::numeric as excluded from public.weekly_exercise_volume v where v.user_id=client and p_muscle is null and (p_exercise is null or v.exercise_id=p_exercise) group by 1
 union all
 select v.week_start,sum(v.volume_kg),sum(v.eligible_sets),sum(v.excluded_sets) from public.weekly_muscle_volume v where v.user_id=client and p_muscle is not null and v.muscle=p_muscle group by 1)
 select weeks.day,coalesce(c.n,0),t.target::int,v.volume,coalesce(v.eligible,0),coalesce(v.excluded,0) from weeks
 left join counts c on c.day=weeks.day left join public.weekly_targets t on t.user_id=client and t.week_start=weeks.day left join volumes v on v.day=weeks.day order by weeks.day;
end $$;
revoke all on function public.coaching_client_report(uuid,int,uuid,text) from public,anon,authenticated;
grant execute on function public.coaching_client_report(uuid,int,uuid,text) to authenticated;
