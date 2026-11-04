-- LÀNG YÊN 3.1. Run in Supabase SQL Editor as project owner.
-- Requires Anonymous Sign-Ins enabled, Realtime public access OFF.
create extension if not exists pgcrypto;
create table if not exists public.anyen_private_rooms (
 id uuid primary key default gen_random_uuid(),
 invite_hash text not null unique,
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.anyen_private_members (
 room_id uuid not null references public.anyen_private_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
alter table public.anyen_private_rooms enable row level security;
alter table public.anyen_private_members enable row level security;
revoke all on public.anyen_private_rooms from anon,authenticated;
revoke all on public.anyen_private_members from anon,authenticated;
create or replace function public.anyen_create_private_room()
returns text language plpgsql security definer set search_path = '' as $$
declare code text; rid uuid;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 code:=upper(encode(gen_random_bytes(12),'hex'));
 insert into public.anyen_private_rooms(invite_hash,owner_id)
 values (encode(digest(code,'sha256'),'hex'),auth.uid()) returning id into rid;
 insert into public.anyen_private_members(room_id,user_id) values(rid,auth.uid());
 return code;
end $$;
create or replace function public.anyen_join_private_room(invite_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 if length(invite_code)>32 or length(invite_code)<20 then return null; end if;
 select id into rid from public.anyen_private_rooms
 where invite_hash=encode(digest(upper(trim(invite_code)),'sha256'),'hex');
 if rid is null then return null; end if;
 insert into public.anyen_private_members(room_id,user_id) values(rid,auth.uid()) on conflict do nothing;
 return rid;
end $$;
revoke all on function public.anyen_create_private_room() from public,anon;
revoke all on function public.anyen_join_private_room(text) from public,anon;
grant execute on function public.anyen_create_private_room() to authenticated;
grant execute on function public.anyen_join_private_room(text) to authenticated;
-- Restrict membership checks to authenticated user only.
create or replace function public.anyen_is_private_member(room_uuid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.anyen_private_members
 where room_id=room_uuid and user_id=auth.uid());
$$;
revoke all on function public.anyen_is_private_member(uuid) from public,anon;
grant execute on function public.anyen_is_private_member(uuid) to authenticated;

drop policy if exists "anyen_room_read" on realtime.messages;
drop policy if exists "anyen_room_write" on realtime.messages;
create policy "anyen_room_read" on realtime.messages for select to authenticated using (
 realtime.messages.extension in ('presence','broadcast') and (
 (select realtime.topic()) in ('anyen:room:lobby','anyen:room:sen','anyen:room:truc')
 or (
 (select realtime.topic()) ~ '^anyen:private:[0-9a-f-]{36}$'
 and public.anyen_is_private_member(substring((select realtime.topic()) from 15)::uuid)
 ))) ;
create policy "anyen_room_write" on realtime.messages for insert to authenticated with check (
 realtime.messages.extension in ('presence','broadcast') and (
 (select realtime.topic()) in ('anyen:room:lobby','anyen:room:sen','anyen:room:truc')
 or (
 (select realtime.topic()) ~ '^anyen:private:[0-9a-f-]{36}$'
 and public.anyen_is_private_member(substring((select realtime.topic()) from 15)::uuid)
 ))) ;
-- NOTE: Review other existing permissive policies on realtime.messages; they may grant broader access.
-- Invitation codes are bearer credentials. No expiry, revocation UI, moderation or rate limiting yet.
