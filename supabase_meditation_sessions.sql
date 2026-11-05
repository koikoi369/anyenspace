-- LÀNG YÊN 3.4: database-backed shared meditation sessions.
-- Run AFTER the working 3.2 private-room SQL. This script does not replace those policies.
create table if not exists public.anyen_meditation_sessions (
 id uuid primary key default gen_random_uuid(),
 room_topic text not null,
 host_id uuid not null references auth.users(id) on delete cascade,
 host_name text not null,
 minutes integer not null check (minutes in (5,10,15)),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 status text not null default 'active' check (status in ('active','ended')),
 created_at timestamptz not null default now(),
 ended_at timestamptz
);
create unique index if not exists anyen_one_active_session_per_room
 on public.anyen_meditation_sessions(room_topic) where status='active';
create index if not exists anyen_meditation_sessions_room_idx
 on public.anyen_meditation_sessions(room_topic,ends_at desc);
alter table public.anyen_meditation_sessions enable row level security;
revoke all on table public.anyen_meditation_sessions from anon,authenticated;

-- Reuse the same private-room membership check as Realtime policies.
create or replace function public.anyen_can_access_meditation_room(p_topic text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_uuid uuid;
begin
 if auth.uid() is null then return false; end if;
 if p_topic = 'anyen:room:sen' then return true; end if;
 if p_topic !~ '^anyen:private:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
 v_uuid := substring(p_topic from 15)::uuid;
 return public.anyen_is_private_member(v_uuid);
end $$;

create or replace function public.anyen_get_meditation_session(p_topic text)
returns public.anyen_meditation_sessions language plpgsql stable security definer set search_path = '' as $$
declare v public.anyen_meditation_sessions;
begin
 if not public.anyen_can_access_meditation_room(p_topic) then raise exception 'Room access denied'; end if;
 select * into v from public.anyen_meditation_sessions
 where room_topic=p_topic and status='active' and ends_at>now()
 order by created_at desc limit 1;
 return v;
end $$;

create or replace function public.anyen_start_meditation_session(
 p_topic text,p_minutes integer,p_host_name text
)
returns public.anyen_meditation_sessions language plpgsql security definer set search_path = '' as $$
declare v public.anyen_meditation_sessions;
begin
 if not public.anyen_can_access_meditation_room(p_topic) then raise exception 'Room access denied'; end if;
 if p_minutes not in (5,10,15) then raise exception 'Invalid duration'; end if;
 -- Serialize starts per room; prevent two simultaneous hosts.
 perform pg_advisory_xact_lock(hashtextextended(p_topic, 0));
 update public.anyen_meditation_sessions set status='ended',ended_at=now()
 where room_topic=p_topic and status='active' and ends_at<=now();
 select * into v from public.anyen_meditation_sessions
 where room_topic=p_topic and status='active' and ends_at>now() limit 1;
 if v.id is not null then return v; end if;
 insert into public.anyen_meditation_sessions(room_topic,host_id,host_name,minutes,starts_at,ends_at)
 values(p_topic,auth.uid(),left(coalesce(nullif(trim(p_host_name),''),'Khách Làng Yên'),24),p_minutes,now()+interval '3 seconds',now()+interval '3 seconds'+make_interval(mins=>p_minutes))
 returning * into v;
 return v;
end $$;

create or replace function public.anyen_end_meditation_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
 update public.anyen_meditation_sessions set status='ended',ended_at=now(),ends_at=now()
 where id=p_session_id and host_id=auth.uid() and status='active';
 get diagnostics v_count=row_count;
 return v_count>0;
end $$;

revoke all on function public.anyen_can_access_meditation_room(text) from public,anon;
revoke all on function public.anyen_get_meditation_session(text) from public,anon;
revoke all on function public.anyen_start_meditation_session(text,integer,text) from public,anon;
revoke all on function public.anyen_end_meditation_session(uuid) from public,anon;
grant execute on function public.anyen_can_access_meditation_room(text) to authenticated;
grant execute on function public.anyen_get_meditation_session(text) to authenticated;
grant execute on function public.anyen_start_meditation_session(text,integer,text) to authenticated;
grant execute on function public.anyen_end_meditation_session(uuid) to authenticated;
