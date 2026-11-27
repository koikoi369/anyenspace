-- LÀNG YÊN · Giai đoạn 1 (Quy hoạch v2.3) — CHƯA CHẠY trên Supabase chính.
-- Chạy file này trên Supabase thử trước; khi đồng bộ lên anyen.space thì chạy trên Supabase chính.
-- Chạy lại nhiều lần vẫn an toàn (if not exists / create or replace / on conflict).
-- Dựa trên các bảng đã có: anyen_profiles (role, therapist_status, member_status, email), anyen_admins (email, is_root).
--
-- 5 vai trò: Khách (đăng nhập ẩn danh) · Thành viên · Nhà trị liệu (therapist_status='approved') · Admin (anyen_admins) · 02 Admin Gốc (anyen_admins.is_root)
-- Nội dung:
--   1. Khóa 1 hoạt động theo tài khoản + đồng bộ trạng thái:   anyen_active_session, anyen_user_state
--   2. Không gian và sức chứa (Solo · 1+5 · 36):                 anyen_venues
--   3. Khung 30 phút/tuần của Nhà trị liệu, Admin duyệt, Admin Gốc điều phối: anyen_slots, anyen_schedule_log
--   4. Đặt lịch 2 chiều (lời mời / yêu cầu), tối đa 5 khách:     anyen_bookings
--   (Khung chat chung ẩn/hiện đi qua kênh realtime của từng không gian, không lưu bảng.)

-- ===== Hàm phụ: vai trò của người đang gọi =====
create or replace function public.anyen_p1_admin_level()
returns int language sql stable security definer set search_path = '' as $$
  -- 0: không phải admin · 1: Admin · 2: Admin Gốc. Chỉ tính khi email đã xác thực.
  select coalesce((select case when a.is_root then 2 else 1 end
    from public.anyen_admins a join auth.users u on lower(u.email)=lower(a.email)
    where u.id=auth.uid() and u.email_confirmed_at is not null limit 1),0)
$$;
create or replace function public.anyen_p1_is_therapist(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.anyen_profiles p where p.id=p_uid and p.role='therapist' and coalesce(p.therapist_status,'approved')='approved')
$$;
create or replace function public.anyen_p1_is_member(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id=p_uid and not coalesce(u.is_anonymous,false))
     and not exists(select 1 from public.anyen_profiles p where p.id=p_uid and coalesce(p.member_status,'active')='restricted')
$$;
revoke all on function public.anyen_p1_admin_level() from public, anon;
revoke all on function public.anyen_p1_is_therapist(uuid) from public, anon;
revoke all on function public.anyen_p1_is_member(uuid) from public, anon;
grant execute on function public.anyen_p1_admin_level() to authenticated;
grant execute on function public.anyen_p1_is_therapist(uuid) to authenticated;
grant execute on function public.anyen_p1_is_member(uuid) to authenticated;

-- Vai trò tổng hợp cho giao diện: guest | member | therapist | admin | root_admin
create or replace function public.anyen_my_role()
returns text language plpgsql stable security definer set search_path = '' as $$
declare lv int := public.anyen_p1_admin_level();
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then return 'guest'; end if;
  if lv=2 then return 'root_admin'; end if;
  if lv=1 then return 'admin'; end if;
  if public.anyen_p1_is_therapist() then return 'therapist'; end if;
  return 'member';
end $$;
revoke all on function public.anyen_my_role() from public, anon;
grant execute on function public.anyen_my_role() to authenticated;

-- ===== 1. Khóa 1 hoạt động + đồng bộ trạng thái (mỗi tài khoản 1 dòng) =====
create table if not exists public.anyen_active_session (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tab_id text not null check (char_length(tab_id) between 1 and 64),
  device text check (device is null or char_length(device) <= 80),
  claimed_at timestamptz not null default now()
);
create table if not exists public.anyen_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb check (pg_column_size(state) <= 65536),
  updated_at timestamptz not null default now()
);
alter table public.anyen_active_session enable row level security;
alter table public.anyen_user_state enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='anyen_active_session' and policyname='own_session') then
    create policy own_session on public.anyen_active_session for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='anyen_user_state' and policyname='own_state') then
    create policy own_state on public.anyen_user_state for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
  end if;
end $$;
grant select, insert, update on public.anyen_active_session, public.anyen_user_state to authenticated;

-- ===== 2. Không gian & sức chứa =====
-- tier: solo (1) · group (1 Nhà trị liệu/chủ + 5 khách = 6) · community (36)
create table if not exists public.anyen_venues (
  id text primary key,
  realm text not null check (realm in ('rung_yen','vinh_yen')),
  kind text not null check (kind in ('house','island','home','island_home','cabin','yacht','culture','sea')),
  name text not null,
  tier text not null check (tier in ('solo','group','community')),
  capacity int not null check (capacity between 1 and 36),
  schedulable boolean not null default false,
  sort int not null default 0
);
alter table public.anyen_venues enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='anyen_venues' and policyname='read_venues') then
    create policy read_venues on public.anyen_venues for select to anon, authenticated using (true);
  end if;
end $$;
grant select on public.anyen_venues to anon, authenticated;
insert into public.anyen_venues(id,realm,kind,name,tier,capacity,schedulable,sort) values
  ('xong_huong','rung_yen','house','Nhà Hương · Haromy','group',6,true,1),
  ('nha_hoa_lan','rung_yen','house','Nhà Sắc','group',6,true,2),
  ('xuong_gom','rung_yen','house','Nhà Chạm','group',6,true,3),
  ('quan_tra','rung_yen','house','Nhà Vị','group',6,true,4),
  ('chuong_gio','rung_yen','house','Nhà Thanh','group',6,true,5),
  ('nha_van_hoa','rung_yen','culture','Nhà Văn Hóa','community',36,false,6),
  ('tu_gia','rung_yen','home','Tư Gia','group',6,false,7),
  ('mat_vinh','vinh_yen','sea','Mặt vịnh (đi tàu riêng)','solo',1,false,10),
  ('dao_ngoc_lan','vinh_yen','island','Đảo Ngọc Lan','group',6,false,11),
  ('dao_hang_vong','vinh_yen','island','Đảo Hang Vọng','group',6,false,12),
  ('dao_gio_thom','vinh_yen','island','Đảo Gió Thơm','group',6,false,13),
  ('dao_tinh_tra','vinh_yen','island','Đảo Tĩnh Trà','group',6,false,14),
  ('dao_da_lang','vinh_yen','island','Đảo Đá Lặng','group',6,false,15),
  ('du_thuyen_yen','vinh_yen','yacht','Du thuyền Yên','community',36,false,20),
  ('cabin','vinh_yen','cabin','Cabin phòng riêng','solo',1,false,21),
  ('tu_dao','vinh_yen','island_home','Tư Đảo','group',6,false,22)
on conflict (id) do update set realm=excluded.realm,kind=excluded.kind,name=excluded.name,tier=excluded.tier,capacity=excluded.capacity,schedulable=excluded.schedulable,sort=excluded.sort;

-- ===== 3. Khung 30 phút/tuần =====
-- weekday: 1 = Thứ 2 … 7 = Chủ nhật · start_min: phút trong ngày, bội số của 30 (0 … 1410)
create table if not exists public.anyen_slots (
  id bigint generated always as identity primary key,
  venue_id text not null references public.anyen_venues(id),
  therapist_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_min smallint not null check (start_min between 0 and 1410 and start_min % 30 = 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  note text check (note is null or char_length(note) <= 300),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- mỗi khung tại một Nhà/Đảo chỉ có 1 Nhà trị liệu đã duyệt
create unique index if not exists anyen_slots_one_approved on public.anyen_slots(venue_id,weekday,start_min) where status='approved';
-- một Nhà trị liệu không thể ở 2 nơi cùng lúc
create unique index if not exists anyen_slots_therapist_once on public.anyen_slots(therapist_id,weekday,start_min) where status in ('pending','approved');
alter table public.anyen_slots enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='anyen_slots' and policyname='read_approved_or_own') then
    create policy read_approved_or_own on public.anyen_slots for select to authenticated
      using (status='approved' or therapist_id=auth.uid() or public.anyen_p1_admin_level()>0);
  end if;
end $$;
grant select on public.anyen_slots to authenticated;

create table if not exists public.anyen_schedule_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id),
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.anyen_schedule_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='anyen_schedule_log' and policyname='admins_read_log') then
    create policy admins_read_log on public.anyen_schedule_log for select to authenticated using (public.anyen_p1_admin_level()>0);
  end if;
end $$;
grant select on public.anyen_schedule_log to authenticated;

-- Nhà trị liệu xin nhiều khung một lúc (ghép 2–3 khung cho ca 60–90 phút)
create or replace function public.anyen_slot_request(p_venue text, p_weekday int, p_starts int[], p_note text default null)
returns setof public.anyen_slots language plpgsql security definer set search_path = '' as $$
declare s int; v public.anyen_slots;
begin
  if not public.anyen_p1_is_therapist() then raise exception 'Chỉ Nhà trị liệu đã được duyệt mới đăng ký khung giờ'; end if;
  if not exists(select 1 from public.anyen_venues where id=p_venue and schedulable) then raise exception 'Nơi này không nhận đăng ký khung giờ'; end if;
  if coalesce(array_length(p_starts,1),0) between 1 and 6 is not true then raise exception 'Chọn từ 1 đến 6 khung 30 phút'; end if;
  foreach s in array p_starts loop
    if exists(select 1 from public.anyen_slots x where x.venue_id=p_venue and x.weekday=p_weekday and x.start_min=s and x.status='approved') then
      raise exception 'Khung %:% đã có Nhà trị liệu khác. Admin Gốc có thể điều phối nếu cần.', s/60, lpad((s%60)::text,2,'0'); end if;
    insert into public.anyen_slots(venue_id,therapist_id,weekday,start_min,note) values (p_venue,auth.uid(),p_weekday,s,left(p_note,300)) returning * into v;
    return next v;
  end loop;
  insert into public.anyen_schedule_log(actor,action,detail) values (auth.uid(),'request',jsonb_build_object('venue',p_venue,'weekday',p_weekday,'starts',p_starts));
end $$;

-- Nhà trị liệu hủy khung của mình
create or replace function public.anyen_slot_cancel(p_slot bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.anyen_slots set status='cancelled' where id=p_slot and therapist_id=auth.uid() and status in ('pending','approved');
  if not found then raise exception 'Không hủy được khung này'; end if;
  insert into public.anyen_schedule_log(actor,action,detail) values (auth.uid(),'cancel',jsonb_build_object('slot',p_slot));
end $$;

-- Admin duyệt / từ chối. Trùng khung đã duyệt: chỉ Admin Gốc mới được ghi đè (p_force), khung cũ chuyển 'cancelled'.
create or replace function public.anyen_admin_review_slot(p_slot bigint, p_approve boolean, p_force boolean default false)
returns public.anyen_slots language plpgsql security definer set search_path = '' as $$
declare lv int := public.anyen_p1_admin_level(); v public.anyen_slots; other bigint;
begin
  if lv=0 then raise exception 'Chỉ Admin mới duyệt khung giờ'; end if;
  select * into v from public.anyen_slots where id=p_slot for update;
  if v.id is null or v.status<>'pending' then raise exception 'Khung không ở trạng thái chờ duyệt'; end if;
  if p_approve then
    select id into other from public.anyen_slots where venue_id=v.venue_id and weekday=v.weekday and start_min=v.start_min and status='approved' and id<>v.id;
    if other is not null then
      if not (lv=2 and p_force) then raise exception 'Trùng khung đã duyệt (#%). Cần 02 Admin Gốc điều phối.', other; end if;
      update public.anyen_slots set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where id=other;
    end if;
    update public.anyen_slots set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=v.id returning * into v;
  else
    update public.anyen_slots set status='rejected',reviewed_by=auth.uid(),reviewed_at=now() where id=v.id returning * into v;
  end if;
  insert into public.anyen_schedule_log(actor,action,detail) values (auth.uid(),case when p_approve then 'approve' else 'reject' end,jsonb_build_object('slot',p_slot,'force',p_force,'replaced',other));
  return v;
end $$;

-- Admin Gốc: dời / hoán đổi khung (sang giờ khác, ngày khác, Nhà/Đảo khác, hoặc giao cho Nhà trị liệu khác)
create or replace function public.anyen_root_move_slot(p_slot bigint, p_venue text default null, p_weekday int default null, p_start int default null, p_therapist uuid default null)
returns public.anyen_slots language plpgsql security definer set search_path = '' as $$
declare v public.anyen_slots; old jsonb;
begin
  if public.anyen_p1_admin_level()<2 then raise exception 'Chỉ 02 Admin Gốc mới dời / hoán đổi khung giờ'; end if;
  select * into v from public.anyen_slots where id=p_slot for update;if v.id is null then raise exception 'Không có khung này'; end if;
  old:=to_jsonb(v);
  if p_therapist is not null and not public.anyen_p1_is_therapist(p_therapist) then raise exception 'Người nhận không phải Nhà trị liệu đã duyệt'; end if;
  update public.anyen_slots set venue_id=coalesce(p_venue,venue_id),weekday=coalesce(p_weekday,weekday),start_min=coalesce(p_start,start_min),
    therapist_id=coalesce(p_therapist,therapist_id),reviewed_by=auth.uid(),reviewed_at=now() where id=p_slot returning * into v;
  insert into public.anyen_schedule_log(actor,action,detail) values (auth.uid(),'root_move',jsonb_build_object('before',old,'after',to_jsonb(v)));
  return v;
end $$;

-- ===== 4. Đặt lịch 2 chiều =====
-- direction 'invite': Nhà trị liệu mời khách, khách bấm Đồng ý · 'request': khách xin, Nhà trị liệu bấm Chấp nhận
create table if not exists public.anyen_bookings (
  id bigint generated always as identity primary key,
  slot_id bigint not null references public.anyen_slots(id) on delete cascade,
  session_date date not null,
  guest_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('invite','request')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  message text check (message is null or char_length(message) <= 300),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (slot_id, session_date, guest_id)
);
alter table public.anyen_bookings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='anyen_bookings' and policyname='booking_parties') then
    create policy booking_parties on public.anyen_bookings for select to authenticated using (
      guest_id=auth.uid() or exists(select 1 from public.anyen_slots s where s.id=slot_id and s.therapist_id=auth.uid()) or public.anyen_p1_admin_level()>0);
  end if;
end $$;
grant select on public.anyen_bookings to authenticated;

create or replace function public.anyen_p1_check_date(p_slot public.anyen_slots, p_date date)
returns void language plpgsql stable set search_path = '' as $$
begin
  if p_slot.status<>'approved' then raise exception 'Khung giờ chưa được duyệt'; end if;
  if extract(isodow from p_date)<>p_slot.weekday then raise exception 'Ngày đã chọn không đúng thứ của khung giờ'; end if;
  if p_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày đã qua'; end if;
end $$;

create or replace function public.anyen_booking_invite(p_slot bigint, p_date date, p_guest uuid, p_message text default null)
returns public.anyen_bookings language plpgsql security definer set search_path = '' as $$
declare s public.anyen_slots; b public.anyen_bookings;
begin
  select * into s from public.anyen_slots where id=p_slot;
  if s.id is null or s.therapist_id<>auth.uid() then raise exception 'Chỉ Nhà trị liệu của khung này mới gửi lời mời'; end if;
  perform public.anyen_p1_check_date(s,p_date);
  if not public.anyen_p1_is_member(p_guest) then raise exception 'Người được mời cần là thành viên'; end if;
  insert into public.anyen_bookings(slot_id,session_date,guest_id,direction,message,created_by) values (p_slot,p_date,p_guest,'invite',left(p_message,300),auth.uid())
    on conflict (slot_id,session_date,guest_id) do update set status='pending',direction='invite',message=excluded.message,created_at=now(),responded_at=null
    returning * into b;
  return b;
end $$;

create or replace function public.anyen_booking_request(p_slot bigint, p_date date, p_message text default null)
returns public.anyen_bookings language plpgsql security definer set search_path = '' as $$
declare s public.anyen_slots; b public.anyen_bookings;
begin
  if not public.anyen_p1_is_member() then raise exception 'Cần đăng nhập thành viên để đặt lịch'; end if;
  select * into s from public.anyen_slots where id=p_slot;if s.id is null then raise exception 'Không có khung giờ này'; end if;
  perform public.anyen_p1_check_date(s,p_date);
  insert into public.anyen_bookings(slot_id,session_date,guest_id,direction,message,created_by) values (p_slot,p_date,auth.uid(),'request',left(p_message,300),auth.uid())
    on conflict (slot_id,session_date,guest_id) do update set status='pending',direction='request',message=excluded.message,created_at=now(),responded_at=null
    returning * into b;
  return b;
end $$;

-- Trả lời: lời mời do khách trả lời, yêu cầu do Nhà trị liệu trả lời. Khóa cứng tối đa 5 khách / phiên.
create or replace function public.anyen_booking_respond(p_booking bigint, p_accept boolean)
returns public.anyen_bookings language plpgsql security definer set search_path = '' as $$
declare b public.anyen_bookings; s public.anyen_slots; n int;
begin
  select * into b from public.anyen_bookings where id=p_booking for update;if b.id is null or b.status<>'pending' then raise exception 'Lịch không còn chờ trả lời'; end if;
  select * into s from public.anyen_slots where id=b.slot_id;
  if (b.direction='invite' and b.guest_id<>auth.uid()) or (b.direction='request' and s.therapist_id<>auth.uid()) then raise exception 'Bạn không có quyền trả lời lịch này'; end if;
  if p_accept then
    perform 1 from public.anyen_slots where id=s.id for update;   -- khóa để đếm chính xác khi nhiều người cùng bấm
    select count(*) into n from public.anyen_bookings where slot_id=b.slot_id and session_date=b.session_date and status='accepted';
    if n>=5 then raise exception 'Phiên đã đủ 5 khách'; end if;
  end if;
  update public.anyen_bookings set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=b.id returning * into b;
  return b;
end $$;

create or replace function public.anyen_booking_cancel(p_booking bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.anyen_bookings b set status='cancelled',responded_at=now()
   where b.id=p_booking and b.status in ('pending','accepted')
     and (b.guest_id=auth.uid() or exists(select 1 from public.anyen_slots s where s.id=b.slot_id and s.therapist_id=auth.uid()));
  if not found then raise exception 'Không hủy được lịch này'; end if;
end $$;

do $$ declare f text; begin
  foreach f in array array['anyen_slot_request(text,int,int[],text)','anyen_slot_cancel(bigint)','anyen_admin_review_slot(bigint,boolean,boolean)',
    'anyen_root_move_slot(bigint,text,int,int,uuid)','anyen_booking_invite(bigint,date,uuid,text)','anyen_booking_request(bigint,date,text)',
    'anyen_booking_respond(bigint,boolean)','anyen_booking_cancel(bigint)'] loop
    execute 'revoke all on function public.'||f||' from public, anon';
    execute 'grant execute on function public.'||f||' to authenticated';
  end loop;
end $$;
revoke all on function public.anyen_p1_check_date(public.anyen_slots,date) from public, anon, authenticated;
