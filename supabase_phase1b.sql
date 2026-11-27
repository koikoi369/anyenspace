-- LÀNG YÊN · Giai đoạn 1b — chạy SAU supabase_phase1.sql. CHƯA CHẠY trên Supabase chính.
-- Chạy lại nhiều lần vẫn an toàn.
--   1. Chỗ ngồi theo không gian + kênh trò chuyện trực tiếp cho Nhà / Đảo (1+5 = 6) và không gian cộng đồng (36)
--      Kênh: anyen:sp:<id không gian>. Muốn vào kênh phải giữ chỗ qua anyen_space_enter (kiểm tra vai trò, phiên trị liệu, sức chứa).
--      Khung chat đi qua kênh này (broadcast), không lưu tin nhắn.
--   2. Chỉ 02 Admin Gốc được thêm / gỡ Admin và đổi trạng thái Nhà trị liệu.
--   3. Tối ưu: chỉ mục cho khóa ngoại, policy gọi auth.uid() một lần.

-- ===== 1. Chỗ ngồi theo không gian =====
alter table public.anyen_active_session add column if not exists space text;
alter table public.anyen_active_session add column if not exists seen_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='anyen_active_session_space_chk') then
    alter table public.anyen_active_session add constraint anyen_active_session_space_chk check (space is null or space ~ '^[a-z0-9_]{1,40}$');
  end if;
end $$;
create index if not exists anyen_active_session_space on public.anyen_active_session(space, seen_at) where space is not null;
-- người dùng chỉ được ghi tab/thiết bị; chỗ ngồi chỉ đổi qua hàm (không tự ghi để lách sức chứa)
revoke insert, update on public.anyen_active_session from authenticated;
grant insert (user_id, tab_id, device, claimed_at), update (user_id, tab_id, device, claimed_at) on public.anyen_active_session to authenticated;
-- đổi sang tab / thiết bị khác thì tự trả chỗ
create or replace function public.anyen_p1_tab_changed() returns trigger language plpgsql set search_path = '' as $$
begin if new.tab_id is distinct from old.tab_id then new.space:=null; new.seen_at:=null; end if; return new; end $$;
drop trigger if exists anyen_active_session_tab on public.anyen_active_session;
create trigger anyen_active_session_tab before update of tab_id on public.anyen_active_session for each row execute function public.anyen_p1_tab_changed();

-- khung 30 phút đã duyệt đang diễn ra tại một nơi (giờ Việt Nam)
create or replace function public.anyen_p1_slot_now(p_venue text) returns public.anyen_slots
language sql stable security definer set search_path = '' as $$
  select s.* from public.anyen_slots s,
    lateral (select (now() at time zone 'Asia/Ho_Chi_Minh') t) n
  where s.venue_id=p_venue and s.status='approved'
    and s.weekday=extract(isodow from n.t)::int
    and s.start_min=((extract(hour from n.t)*60+extract(minute from n.t))::int/30)*30
  limit 1
$$;

-- 'ok' hoặc lý do không vào được kênh chung (vẫn trải nghiệm riêng)
create or replace function public.anyen_p1_space_reason(p_venue text, p_uid uuid default auth.uid()) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v public.anyen_venues; s public.anyen_slots;
begin
  select * into v from public.anyen_venues where id=p_venue;
  if v.id is null then return 'unknown'; end if;
  if v.tier='solo' then return 'solo'; end if;
  if not public.anyen_p1_is_member(p_uid) then return 'guest'; end if;
  if v.tier='group' then
    s:=public.anyen_p1_slot_now(p_venue);
    if s.id is not null and s.therapist_id<>p_uid and public.anyen_p1_admin_level()<2
       and not exists(select 1 from public.anyen_bookings b where b.slot_id=s.id and b.guest_id=p_uid and b.status='accepted'
                        and b.session_date=(now() at time zone 'Asia/Ho_Chi_Minh')::date) then
      return 'session';
    end if;
  end if;
  return 'ok';
end $$;

-- Giữ chỗ trong không gian. Trả {ok, reason, count, capacity, topic, session}
create or replace function public.anyen_space_enter(p_venue text, p_tab text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v public.anyen_venues; r text; n int; s public.anyen_slots; me uuid:=auth.uid();
begin
  if me is null then return jsonb_build_object('ok',false,'reason','auth'); end if;
  select * into v from public.anyen_venues where id=p_venue;
  r:=public.anyen_p1_space_reason(p_venue, me);
  if r<>'ok' then return jsonb_build_object('ok',false,'reason',r,'capacity',v.capacity); end if;
  perform pg_advisory_xact_lock(hashtextextended('anyen:sp:'||p_venue,0));
  select count(*) into n from public.anyen_active_session a where a.space=p_venue and a.user_id<>me and a.seen_at>now()-interval '45 seconds';
  if n>=v.capacity and public.anyen_p1_admin_level()<2 then return jsonb_build_object('ok',false,'reason','full','count',n,'capacity',v.capacity); end if;
  insert into public.anyen_active_session(user_id,tab_id,space,seen_at) values (me,coalesce(left(p_tab,64),'space'),p_venue,now())
    on conflict (user_id) do update set space=excluded.space, seen_at=now();
  s:=public.anyen_p1_slot_now(p_venue);
  return jsonb_build_object('ok',true,'count',n+1,'capacity',v.capacity,'topic','anyen:sp:'||p_venue,'session',s.id,'therapist',s.therapist_id);
end $$;

-- Báo vẫn còn ở đây (gọi ~20 giây/lần); false = đã mất chỗ (bị tab khác chiếm hoặc hết hạn)
create or replace function public.anyen_space_beat(p_venue text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.anyen_active_session set seen_at=now() where user_id=auth.uid() and space=p_venue and seen_at>now()-interval '45 seconds';
  return found;
end $$;

create or replace function public.anyen_space_leave() returns void
language sql volatile security definer set search_path = '' as $$
  update public.anyen_active_session set space=null, seen_at=null where user_id=auth.uid();
$$;

-- Số người đang ở (để hiện trên cửa Nhà / Đảo)
create or replace function public.anyen_space_counts() returns table(space text, n int)
language sql stable security definer set search_path = '' as $$
  select a.space, count(*)::int from public.anyen_active_session a where a.space is not null and a.seen_at>now()-interval '45 seconds' group by a.space
$$;

-- Kênh trực tiếp: chỉ ai đang giữ chỗ trong không gian đó
create or replace function public.anyen_p1_space_seat(p_topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_topic ~ '^anyen:sp:[a-z0-9_]{1,40}$' and exists(
    select 1 from public.anyen_active_session a where a.user_id=auth.uid() and a.space=substring(p_topic from 10) and a.seen_at>now()-interval '2 minutes')
$$;

drop policy if exists anyen_sp_read on realtime.messages;
drop policy if exists anyen_sp_write on realtime.messages;
create policy anyen_sp_read on realtime.messages for select to authenticated
  using (extension in ('presence','broadcast') and public.anyen_p1_space_seat((select realtime.topic())));
create policy anyen_sp_write on realtime.messages for insert to authenticated
  with check (extension in ('presence','broadcast') and public.anyen_p1_space_seat((select realtime.topic())));

revoke all on function public.anyen_p1_tab_changed() from public, anon, authenticated;
revoke all on function public.anyen_p1_slot_now(text) from public, anon, authenticated;
revoke all on function public.anyen_p1_space_reason(text,uuid) from public, anon, authenticated;
revoke all on function public.anyen_space_enter(text,text) from public, anon;
revoke all on function public.anyen_space_beat(text) from public, anon;
revoke all on function public.anyen_space_leave() from public, anon;
revoke all on function public.anyen_space_counts() from public, anon;
revoke all on function public.anyen_p1_space_seat(text) from public, anon;
grant execute on function public.anyen_space_enter(text,text), public.anyen_space_beat(text), public.anyen_space_leave(), public.anyen_space_counts(), public.anyen_p1_space_seat(text) to authenticated;

-- ===== 2. Chỉ 02 Admin Gốc quản lý phân quyền Admin & Nhà trị liệu =====
create or replace function public.anyen_admin_add_admin(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e text := lower(btrim(coalesce(p_email,'')));
begin
 if not public.anyen_is_root_admin() then raise exception 'Chỉ 02 Admin Gốc mới thêm Admin'; end if;
 if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email không hợp lệ'; end if;
 insert into public.anyen_admins(email,is_root,added_by) values (e,false,auth.uid()) on conflict (email) do nothing;
 perform public.anyen_admin_log_add('admin_add', e, '{}'::jsonb);
 return public.anyen_admin_list_admins();
end $$;
create or replace function public.anyen_admin_remove_admin(p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e text := lower(btrim(coalesce(p_email,'')));
begin
 if not public.anyen_is_root_admin() then raise exception 'Chỉ 02 Admin Gốc mới gỡ Admin'; end if;
 if exists(select 1 from public.anyen_admins where email=e and is_root) then raise exception 'Không thể gỡ admin gốc'; end if;
 delete from public.anyen_admins where email=e;
 perform public.anyen_admin_log_add('admin_remove', e, '{}'::jsonb);
 return public.anyen_admin_list_admins();
end $$;
create or replace function public.anyen_admin_set_therapist_status(p_user uuid, p_status text, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.anyen_profiles;
begin
 if not public.anyen_is_root_admin() then raise exception 'Chỉ 02 Admin Gốc mới duyệt / đổi trạng thái Nhà trị liệu'; end if;
 if p_status not in ('pending','approved','rejected','suspended') then raise exception 'Trạng thái không hợp lệ'; end if;
 select * into v from public.anyen_profiles where id=p_user for update;
 if v.id is null then raise exception 'Không tìm thấy tài khoản'; end if;
 if exists(select 1 from public.anyen_admins a where a.email=v.email and a.is_root) then raise exception 'Không thể đổi trạng thái của admin gốc'; end if;
 update public.anyen_profiles set role='therapist', therapist_status=p_status, status_reason=left(nullif(btrim(coalesce(p_reason,'')),''),500), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() where id=p_user;
 perform public.anyen_admin_log_add('therapist_'||p_status, v.email, jsonb_build_object('reason',p_reason,'user',p_user));
 return jsonb_build_object('id',p_user,'therapist_status',p_status);
end $$;

-- ===== 3. Tối ưu =====
create index if not exists anyen_lobby_offerings_owner on public.anyen_lobby_offerings(owner_id);
create index if not exists anyen_meditation_sessions_host on public.anyen_meditation_sessions(host_id);
create index if not exists anyen_private_members_user on public.anyen_private_members(user_id);
create index if not exists anyen_private_rooms_owner on public.anyen_private_rooms(owner_id);
create index if not exists anyen_bookings_guest on public.anyen_bookings(guest_id);
create index if not exists anyen_slots_reviewed_by on public.anyen_slots(reviewed_by);
create index if not exists anyen_bookings_created_by on public.anyen_bookings(created_by);
create index if not exists anyen_schedule_log_actor on public.anyen_schedule_log(actor);

alter policy "anyen bag add own" on public.anyen_bag_items with check (owner = (select auth.uid()));
alter policy "anyen bag read own" on public.anyen_bag_items using (owner = (select auth.uid()));
alter policy "anyen bag remove own" on public.anyen_bag_items using (owner = (select auth.uid()));
alter policy own_session on public.anyen_active_session using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
alter policy own_state on public.anyen_user_state using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
alter policy read_approved_or_own on public.anyen_slots using (status='approved' or therapist_id=(select auth.uid()) or (select public.anyen_p1_admin_level())>0);
alter policy admins_read_log on public.anyen_schedule_log using ((select public.anyen_p1_admin_level())>0);
alter policy booking_parties on public.anyen_bookings using (
  guest_id=(select auth.uid()) or exists(select 1 from public.anyen_slots s where s.id=slot_id and s.therapist_id=(select auth.uid())) or (select public.anyen_p1_admin_level())>0);

notify pgrst, 'reload schema';
