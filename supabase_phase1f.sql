-- LÀNG YÊN · Giai đoạn 1f — Lịch hẹn v3.9 (đợt 3). Chạy SAU supabase_phase1.sql, 1b, 1c, 1d, 1e. Chạy lại nhiều lần vẫn an toàn.
--   1. Đăng ký nhiều tuần liên tiếp (tối đa 52 tuần, trong 1 năm): tuần hiện tại là lời xin bình thường (chờ Healer nhận);
--      các tuần sau giữ trạng thái 'registered' (Lịch đăng ký, chưa khớp). Đầu mỗi tuần, lịch đăng ký của tuần đó tự chuyển
--      thành lời xin để Healer duyệt và khớp.
--   2. Thông báo hủy: Healer / Chủ nhà hủy thì người chơi được báo; người chơi hủy lịch đã khớp thì chủ phiên được báo.
--      Thông báo hiện ở trang Lịch hẹn và một dòng nhắc nhỏ ở trang chính. Không gửi email.
-- Giờ tính theo Asia/Ho_Chi_Minh. Tuần tính từ Thứ 2 đến Chủ nhật.

-- ===== 0. Trạng thái 'registered' =====
alter table public.anyen_bookings drop constraint if exists anyen_bookings_status_check;
alter table public.anyen_bookings add constraint anyen_bookings_status_check check (status in ('registered','pending','accepted','declined','cancelled','expired'));

-- Chủ nhật của tuần hiện tại
create or replace function public.anyen_p1_week_end() returns date
language sql stable set search_path = '' as $$
  select d + (7 - extract(isodow from d)::int) from (select (now() at time zone 'Asia/Ho_Chi_Minh')::date d) t
$$;

-- Dọn lịch: hết hạn (như 1e) + lịch đăng ký của tuần hiện tại thành lời xin chờ Healer duyệt
create or replace function public.anyen_p1_expire() returns void
language sql volatile security definer set search_path = '' as $$
  update public.anyen_bookings b set status='pending', created_at=now()
   where b.status='registered' and b.session_date <= public.anyen_p1_week_end()
     and exists(select 1 from public.anyen_slots s where s.id=b.slot_id and s.status='approved');
  update public.anyen_bookings b set status='expired', responded_at=now()
   where b.status in ('pending','registered') and b.session_date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
     and public.anyen_p1_started(b.slot_id, b.session_date);
  update public.anyen_home_invites i set status='expired', responded_at=now()
    from public.anyen_home_sessions h
   where h.id=i.session_id and i.status='pending' and h.session_date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
     and (h.session_date + make_interval(mins => h.start_min)) <= (now() at time zone 'Asia/Ho_Chi_Minh');
$$;

-- ===== 1. Đăng ký nhiều tuần =====
-- Trả số tuần đã đăng ký. Tuần nào trùng lịch đã khớp hoặc đã có lịch thì bỏ qua tuần đó (trả về trong 'skipped').
create or replace function public.anyen_booking_request_weeks(p_slot bigint, p_date date, p_weeks int, p_message text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.anyen_slots; me uuid := auth.uid(); w int; d date; e int; c text; ok int := 0; skipped jsonb := '[]'::jsonb;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; we date := public.anyen_p1_week_end();
begin
  if not public.anyen_p1_is_member() then raise exception 'Cần đăng nhập thành viên để đặt lịch'; end if;
  if coalesce(p_weeks,0) not between 1 and 52 then raise exception 'Chọn từ 1 đến 52 tuần'; end if;
  select * into s from public.anyen_slots where id=p_slot; if s.id is null then raise exception 'Không có khung giờ này'; end if;
  if s.therapist_id=me then raise exception 'Đây là phiên bạn dẫn'; end if;
  perform public.anyen_p1_check_date(s,p_date);
  e:=public.anyen_p1_run_end(s.id);
  for w in 0..p_weeks-1 loop
    d:=p_date+7*w;
    exit when d > today+365;
    if d <= we then
      begin perform public.anyen_booking_request(p_slot,d,p_message); ok:=ok+1;
      exception when others then skipped:=skipped||jsonb_build_object('date',d,'why',sqlerrm); end;
      continue;
    end if;
    c:=public.anyen_p1_clash(me,d,s.start_min,e);
    if c is not null then skipped:=skipped||jsonb_build_object('date',d,'why','Đã có lịch '||c); continue; end if;
    insert into public.anyen_bookings(slot_id,session_date,guest_id,direction,status,message,created_by) values (p_slot,d,me,'request','registered',left(p_message,300),me)
      on conflict (slot_id,session_date,guest_id) do update set status='registered',direction='request',message=excluded.message,created_at=now(),responded_at=null
      where public.anyen_bookings.status in ('declined','cancelled','expired');
    if found then ok:=ok+1; else skipped:=skipped||jsonb_build_object('date',d,'why','Đã có lịch phiên này'); end if;
  end loop;
  return jsonb_build_object('ok',ok,'skipped',skipped);
end $$;

-- Hủy: thêm lịch đăng ký (registered)
create or replace function public.anyen_booking_cancel(p_booking bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.anyen_bookings;
begin
  select * into b from public.anyen_bookings x where x.id=p_booking and x.status in ('registered','pending','accepted')
     and (x.guest_id=auth.uid() or exists(select 1 from public.anyen_slots s where s.id=x.slot_id and s.therapist_id=auth.uid())) for update;
  if b.id is null then raise exception 'Không hủy được lịch này'; end if;
  if public.anyen_p1_started(b.slot_id,b.session_date) then raise exception 'Phiên đã bắt đầu. Bạn cứ rời phiên lúc nào cũng được.'; end if;
  update public.anyen_bookings set status='cancelled',responded_at=now() where id=b.id;
end $$;

-- Healer hủy khung định kỳ: mọi lịch các ngày tới (cả lịch đăng ký nhiều tuần) hủy theo
create or replace function public.anyen_slot_cancel(p_slot bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare r bigint := public.anyen_p1_run_start(p_slot); today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  update public.anyen_slots set status='cancelled' where id=p_slot and therapist_id=auth.uid() and status in ('pending','approved');
  if not found then raise exception 'Không hủy được khung này'; end if;
  update public.anyen_bookings set status='cancelled',responded_at=now() where slot_id in (p_slot,r) and session_date>=today and status in ('registered','pending','accepted');
  insert into public.anyen_schedule_log(actor,action,detail) values (auth.uid(),'cancel',jsonb_build_object('slot',p_slot));
end $$;

-- ===== 2. Thông báo hủy =====
create table if not exists public.anyen_notices (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) <= 400),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists anyen_notices_user on public.anyen_notices(user_id, created_at desc);
alter table public.anyen_notices enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='anyen_notices' and policyname='own_notices') then
    create policy own_notices on public.anyen_notices for select to authenticated using (user_id=(select auth.uid()));
  end if;
end $$;
grant select on public.anyen_notices to authenticated;

create or replace function public.anyen_p1_hhmm(m int) returns text language sql immutable set search_path = '' as $$
  select lpad((m/60)::text,2,'0')||':'||lpad((m%60)::text,2,'0')
$$;
create or replace function public.anyen_p1_dm(d date) returns text language sql immutable set search_path = '' as $$
  select case extract(isodow from d)::int when 7 then 'CN' else 'Thứ '||(extract(isodow from d)::int+1) end||' '||extract(day from d)||'/'||extract(month from d)
$$;
create or replace function public.anyen_p1_name(p_uid uuid) returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select nullif(btrim(p.display_name),'') from public.anyen_profiles p where p.id=p_uid),'Một thành viên')
$$;

-- Lịch trị liệu bị hủy: báo bên còn lại (không báo người tự hủy)
create or replace function public.anyen_p1_booking_notice() returns trigger language plpgsql security definer set search_path = '' as $$
declare s public.anyen_slots; v text; me uuid := auth.uid(); what text;
begin
  if new.status<>'cancelled' or old.status not in ('registered','pending','accepted') then return new; end if;
  select * into s from public.anyen_slots where id=new.slot_id;
  select name into v from public.anyen_venues where id=s.venue_id;
  what:=v||' · '||public.anyen_p1_dm(new.session_date)||' lúc '||public.anyen_p1_hhmm(s.start_min);
  if me is distinct from new.guest_id then
    insert into public.anyen_notices(user_id,text) values (new.guest_id,'Healer '||public.anyen_p1_name(s.therapist_id)||
      case when s.status='cancelled' then ' đã đóng phiên ' else ' đã hủy lịch của bạn ở phiên ' end||what||'. Bạn có thể chọn một phiên khác.');
  elsif old.status='accepted' and s.therapist_id is distinct from me then
    insert into public.anyen_notices(user_id,text) values (s.therapist_id,public.anyen_p1_name(new.guest_id)||' đã hủy lịch phiên '||what||'. Phiên có thêm một chỗ trống.');
  end if;
  return new;
end $$;
drop trigger if exists anyen_booking_notice on public.anyen_bookings;
create trigger anyen_booking_notice after update of status on public.anyen_bookings for each row execute function public.anyen_p1_booking_notice();

-- Lời mời Tư Gia / Đảo Yên bị hủy: báo bên còn lại
create or replace function public.anyen_p1_home_notice() returns trigger language plpgsql security definer set search_path = '' as $$
declare h public.anyen_home_sessions; me uuid := auth.uid(); what text;
begin
  if new.status<>'cancelled' or old.status not in ('pending','accepted') then return new; end if;
  select * into h from public.anyen_home_sessions where id=new.session_id;
  what:=public.anyen_p1_place_name(h.place)||' · '||public.anyen_p1_dm(h.session_date)||' lúc '||public.anyen_p1_hhmm(h.start_min);
  if me is distinct from new.guest_id then
    insert into public.anyen_notices(user_id,text) values (new.guest_id,public.anyen_p1_name(h.host_id)||
      case when h.status='cancelled' then ' đã hủy buổi hẹn ở ' else ' đã rút lời mời tới ' end||what||'.');
  elsif old.status='accepted' and h.host_id is distinct from me then
    insert into public.anyen_notices(user_id,text) values (h.host_id,public.anyen_p1_name(new.guest_id)||' không đến được buổi hẹn ở '||what||'. Bạn có thể mời người khác.');
  end if;
  return new;
end $$;
drop trigger if exists anyen_home_notice on public.anyen_home_invites;
create trigger anyen_home_notice after update of status on public.anyen_home_invites for each row execute function public.anyen_p1_home_notice();

-- Đọc thông báo (mới nhất trước, 20 tin trong 30 ngày) và số chưa đọc
create or replace function public.anyen_my_notices() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('unread',(select count(*) from public.anyen_notices n where n.user_id=auth.uid() and n.read_at is null),
    'list',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'text',x.text,'at',x.created_at,'read',x.read_at is not null) order by x.created_at desc)
      from (select * from public.anyen_notices n where n.user_id=auth.uid() and n.created_at>now()-interval '30 days' order by n.created_at desc limit 20) x),'[]'::jsonb))
$$;
create or replace function public.anyen_notices_read() returns void
language sql volatile security definer set search_path = '' as $$
  update public.anyen_notices set read_at=now() where user_id=auth.uid() and read_at is null
$$;

-- ===== Quyền =====
revoke all on function public.anyen_p1_expire() from public, anon, authenticated;
revoke all on function public.anyen_p1_name(uuid) from public, anon, authenticated;
revoke all on function public.anyen_p1_booking_notice() from public, anon, authenticated;
revoke all on function public.anyen_p1_home_notice() from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['anyen_booking_request_weeks(bigint,date,int,text)','anyen_booking_cancel(bigint)','anyen_slot_cancel(bigint)',
    'anyen_my_notices()','anyen_notices_read()'] loop
    execute 'revoke all on function public.'||f||' from public, anon';
    execute 'grant execute on function public.'||f||' to authenticated';
  end loop;
end $$;

notify pgrst, 'reload schema';
