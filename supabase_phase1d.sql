-- LÀNG YÊN · Giai đoạn 1d — Lịch hẹn theo Nguyên tắc v3.9 (đợt 1). Chạy SAU supabase_phase1.sql, 1b, 1c.
-- Chạy lại nhiều lần vẫn an toàn.
--   1. Hết hạn: lời mời / đăng ký chưa khớp tự chuyển 'expired' khi phiên bắt đầu.
--   2. Khóa trùng giờ đã khớp: đã khớp một phiên thì không khớp thêm phiên khác chồng giờ (kể cả giờ mình đang dẫn phiên).
--      Muốn đổi, hủy lịch cũ trước. Lời mời vẫn nhận thoải mái, chỉ chặn ở bước Đồng ý.
--   3. Mỗi khung giờ chỉ tự đăng ký (xin tham gia) tối đa 1 phiên.
--   4. Đã khớp rồi thì mời lại / xin lại không làm lịch quay về "chờ".
--   5. Hủy được bất cứ lúc nào trước khi phiên bắt đầu; phiên đã bắt đầu thì chỉ cần rời đi.
--   6. Đảo trị liệu (Healing Island) tạm chưa nhận lịch.
--   7. Lịch của tôi hiện cả lịch đã hủy / bị từ chối / hết hạn từ hôm nay trở đi.
-- Giờ tính theo Asia/Ho_Chi_Minh.

-- ===== 0. Trạng thái 'expired' =====
alter table public.anyen_bookings drop constraint if exists anyen_bookings_status_check;
alter table public.anyen_bookings add constraint anyen_bookings_status_check check (status in ('pending','accepted','declined','cancelled','expired'));
create index if not exists anyen_bookings_guest_date on public.anyen_bookings(guest_id, session_date) where status in ('pending','accepted');

-- ===== 6. Đảo trị liệu tạm chưa có lịch =====
update public.anyen_venues set schedulable=false where kind='island' and schedulable;

-- ===== Hàm phụ =====
-- Phiên (khung p_slot, ngày p_date) đã bắt đầu chưa
create or replace function public.anyen_p1_started(p_slot bigint, p_date date) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (p_date + make_interval(mins => s.start_min)) <= (now() at time zone 'Asia/Ho_Chi_Minh')
    from public.anyen_slots s where s.id=p_slot), true)
$$;

-- Lời mời / đăng ký chưa khớp mà phiên đã bắt đầu: hết hạn
create or replace function public.anyen_p1_expire() returns void
language sql volatile security definer set search_path = '' as $$
  update public.anyen_bookings b set status='expired', responded_at=now()
   where b.status='pending' and b.session_date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
     and public.anyen_p1_started(b.slot_id, b.session_date)
$$;

-- Người p_uid đã có lịch đã khớp chồng giờ [p_start, p_end) ngày p_date chưa? Trả mô tả lịch đó, hoặc null.
-- Tính cả: khách đã khớp (accepted) và Healer đang mở khung đúng giờ đó.
create or replace function public.anyen_p1_clash(p_uid uuid, p_date date, p_start int, p_end int, p_except bigint default null) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  for r in select x.start_min, public.anyen_p1_run_end(x.id) e, v.name
      from public.anyen_bookings b join public.anyen_slots x on x.id=b.slot_id join public.anyen_venues v on v.id=x.venue_id
     where b.guest_id=p_uid and b.session_date=p_date and b.status='accepted' and b.id is distinct from p_except loop
    if r.start_min < p_end and p_start < r.e then
      return r.name||' lúc '||lpad((r.start_min/60)::text,2,'0')||':'||lpad((r.start_min%60)::text,2,'0');
    end if;
  end loop;
  select v.name||' lúc '||lpad((x.start_min/60)::text,2,'0')||':'||lpad((x.start_min%60)::text,2,'0')||' (phiên bạn dẫn)' as name into r
    from public.anyen_slots x join public.anyen_venues v on v.id=x.venue_id
   where x.therapist_id=p_uid and x.status='approved' and x.weekday=extract(isodow from p_date)::int
     and x.start_min < p_end and x.start_min+30 > p_start
   order by x.start_min limit 1;
  if found then return r.name; end if;
  return null;
end $$;

-- ===== Đặt lịch =====
create or replace function public.anyen_booking_invite(p_slot bigint, p_date date, p_guest uuid, p_message text default null)
returns public.anyen_bookings language plpgsql security definer set search_path = '' as $$
declare s public.anyen_slots; b public.anyen_bookings;
begin
  select * into s from public.anyen_slots where id=p_slot;
  if s.id is null or s.therapist_id<>auth.uid() then raise exception 'Chỉ Healer của khung này mới gửi lời mời'; end if;
  perform public.anyen_p1_check_date(s,p_date);
  if public.anyen_p1_started(p_slot,p_date) then raise exception 'Phiên này đã bắt đầu, không mời thêm được'; end if;
  if p_guest=auth.uid() then raise exception 'Không tự mời chính mình được'; end if;
  if not public.anyen_p1_is_member(p_guest) then raise exception 'Người được mời cần là thành viên'; end if;
  insert into public.anyen_bookings(slot_id,session_date,guest_id,direction,message,created_by) values (p_slot,p_date,p_guest,'invite',left(p_message,300),auth.uid())
    on conflict (slot_id,session_date,guest_id) do update set status='pending',direction='invite',message=excluded.message,created_by=excluded.created_by,created_at=now(),responded_at=null
    where public.anyen_bookings.status<>'accepted'
    returning * into b;
  if b.id is null then raise exception 'Bạn này đã khớp lịch phiên này rồi'; end if;
  return b;
end $$;

create or replace function public.anyen_booking_request(p_slot bigint, p_date date, p_message text default null)
returns public.anyen_bookings language plpgsql security definer set search_path = '' as $$
declare s public.anyen_slots; b public.anyen_bookings; e int; c text; me uuid := auth.uid();
begin
  if not public.anyen_p1_is_member() then raise exception 'Cần đăng nhập thành viên để đặt lịch'; end if;
  select * into s from public.anyen_slots where id=p_slot;if s.id is null then raise exception 'Không có khung giờ này'; end if;
  perform public.anyen_p1_check_date(s,p_date);
  if public.anyen_p1_started(p_slot,p_date) then raise exception 'Phiên này đã bắt đầu, hẹn bạn phiên sau nhé'; end if;
  if s.therapist_id=me then raise exception 'Đây là phiên bạn dẫn'; end if;
  e:=public.anyen_p1_run_end(s.id);
  c:=public.anyen_p1_clash(me,p_date,s.start_min,e);
  if c is not null then raise exception 'Bạn đã có lịch % cùng giờ. Muốn đổi, hãy hủy lịch đó trước.', c; end if;
  if exists(select 1 from public.anyen_bookings o join public.anyen_slots x on x.id=o.slot_id
      where o.guest_id=me and o.session_date=p_date and o.status='pending' and o.direction='request' and o.slot_id<>p_slot
        and x.start_min < e and s.start_min < public.anyen_p1_run_end(x.id)) then
    raise exception 'Bạn đã xin tham gia một phiên khác cùng giờ. Mỗi khung giờ chỉ xin một phiên, hủy lời xin kia trước nhé.';
  end if;
  insert into public.anyen_bookings(slot_id,session_date,guest_id,direction,message,created_by) values (p_slot,p_date,me,'request',left(p_message,300),me)
    on conflict (slot_id,session_date,guest_id) do update set status='pending',direction='request',message=excluded.message,created_by=excluded.created_by,created_at=now(),responded_at=null
    where public.anyen_bookings.status<>'accepted'
    returning * into b;
  if b.id is null then raise exception 'Bạn đã khớp lịch phiên này rồi'; end if;
  return b;
end $$;

-- Trả lời: lời mời do khách trả lời, yêu cầu do Healer trả lời. Rà soát trước khi khớp: không trùng giờ, tối đa 5 khách.
create or replace function public.anyen_booking_respond(p_booking bigint, p_accept boolean)
returns public.anyen_bookings language plpgsql security definer set search_path = '' as $$
declare b public.anyen_bookings; s public.anyen_slots; n int; c text;
begin
  select * into b from public.anyen_bookings where id=p_booking for update;
  if b.id is null or b.status<>'pending' then raise exception 'Lịch không còn chờ trả lời'; end if;
  select * into s from public.anyen_slots where id=b.slot_id;
  if (b.direction='invite' and b.guest_id<>auth.uid()) or (b.direction='request' and s.therapist_id<>auth.uid()) then raise exception 'Bạn không có quyền trả lời lịch này'; end if;
  if s.status<>'approved' then raise exception 'Healer đã đóng khung giờ này'; end if;
  if public.anyen_p1_started(b.slot_id,b.session_date) then raise exception 'Phiên đã bắt đầu, lời mời này đã hết hạn'; end if;
  if p_accept then
    perform 1 from public.anyen_slots where id=s.id for update;   -- khóa để đếm chính xác khi nhiều người cùng bấm
    perform pg_advisory_xact_lock(hashtextextended('anyen:guest:'||b.guest_id||b.session_date,0));
    c:=public.anyen_p1_clash(b.guest_id,b.session_date,s.start_min,public.anyen_p1_run_end(s.id),b.id);
    if c is not null then
      if b.direction='invite' then raise exception 'Bạn đã có lịch % cùng giờ. Muốn nhận lời này, hãy hủy lịch đó trước.', c;
      else raise exception 'Bạn này đã khớp một phiên khác cùng giờ'; end if;
    end if;
    select count(*) into n from public.anyen_bookings where slot_id=b.slot_id and session_date=b.session_date and status='accepted';
    if n>=5 then raise exception 'Phiên đã đủ 5 khách'; end if;
  end if;
  update public.anyen_bookings set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=b.id returning * into b;
  return b;
end $$;

-- Hủy: khách hoặc Healer, bất cứ lúc nào trước khi phiên bắt đầu
create or replace function public.anyen_booking_cancel(p_booking bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.anyen_bookings;
begin
  select * into b from public.anyen_bookings x where x.id=p_booking and x.status in ('pending','accepted')
     and (x.guest_id=auth.uid() or exists(select 1 from public.anyen_slots s where s.id=x.slot_id and s.therapist_id=auth.uid())) for update;
  if b.id is null then raise exception 'Không hủy được lịch này'; end if;
  if public.anyen_p1_started(b.slot_id,b.session_date) then raise exception 'Phiên đã bắt đầu. Bạn cứ rời phiên lúc nào cũng được.'; end if;
  update public.anyen_bookings set status='cancelled',responded_at=now() where id=b.id;
end $$;

-- ===== Lịch cho giao diện (thêm: dọn hết hạn, ẩn phiên đã bắt đầu với người ngoài) =====
create or replace function public.anyen_sched_open(p_days int default 14, p_venue text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare n record; out jsonb := '[]'::jsonb; s record; dd date; i int; e int; me uuid := auth.uid();
begin
  perform public.anyen_p1_expire();
  select * into n from public.anyen_p1_now_vn();
  for s in select x.*, v.name venue_name, p.display_name, p.specialty, p.bio from public.anyen_slots x
      join public.anyen_venues v on v.id=x.venue_id left join public.anyen_profiles p on p.id=x.therapist_id
      where x.status='approved' and (p_venue is null or x.venue_id=p_venue)
        and not exists(select 1 from public.anyen_slots y where y.therapist_id=x.therapist_id and y.venue_id=x.venue_id and y.weekday=x.weekday and y.start_min=x.start_min-30 and y.status='approved')
  loop
    e:=public.anyen_p1_run_end(s.id);
    for i in 0..least(greatest(coalesce(p_days,14),1),28)-1 loop
      dd:=n.d+i;
      continue when extract(isodow from dd)::int<>s.weekday;
      continue when dd=n.d and e<=n.mins;
      continue when dd=n.d and s.start_min<=n.mins and s.therapist_id is distinct from me
        and not exists(select 1 from public.anyen_bookings b where b.slot_id=s.id and b.session_date=dd and b.guest_id=me and b.status='accepted');
      out:=out||jsonb_build_object('slot',s.id,'venue',s.venue_id,'venue_name',s.venue_name,'therapist',s.therapist_id,'therapist_name',coalesce(s.display_name,'Healer'),
        'specialty',s.specialty,'bio',s.bio,'note',s.note,'date',dd,'weekday',s.weekday,'start',s.start_min,'end',e,
        'accepted',(select count(*) from public.anyen_bookings b where b.slot_id=s.id and b.session_date=dd and b.status='accepted'),
        'mine',s.therapist_id=me,
        'my_status',(select b.status from public.anyen_bookings b where b.slot_id=s.id and b.session_date=dd and b.guest_id=me),
        'my_booking',(select b.id from public.anyen_bookings b where b.slot_id=s.id and b.session_date=dd and b.guest_id=me),
        'my_direction',(select b.direction from public.anyen_bookings b where b.slot_id=s.id and b.session_date=dd and b.guest_id=me));
    end loop;
  end loop;
  return coalesce((select jsonb_agg(x order by x->>'date', (x->>'start')::int) from jsonb_array_elements(out) x),'[]'::jsonb);
end $$;

create or replace function public.anyen_my_schedule() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if me is null then return jsonb_build_object('role','guest'); end if;
  perform public.anyen_p1_expire();
  return jsonb_build_object(
    'role', public.anyen_my_role(),
    'therapist', public.anyen_p1_is_therapist(me),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'venue',x.venue_id,'venue_name',v.name,'weekday',x.weekday,'start',x.start_min,'note',x.note,'run',public.anyen_p1_run_start(x.id)) order by x.weekday,x.start_min)
      from public.anyen_slots x join public.anyen_venues v on v.id=x.venue_id where x.therapist_id=me and x.status='approved'),'[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'slot',b.slot_id,'date',b.session_date,'status',b.status,'direction',b.direction,'message',b.message,
        'guest_name',coalesce(p.display_name,'Thành viên'),'venue_name',v.name,'start',x.start_min,'end',public.anyen_p1_run_end(x.id)) order by b.session_date,x.start_min)
      from public.anyen_bookings b join public.anyen_slots x on x.id=b.slot_id join public.anyen_venues v on v.id=x.venue_id left join public.anyen_profiles p on p.id=b.guest_id
      where x.therapist_id=me and b.session_date>=today and b.status in ('pending','accepted')),'[]'::jsonb),
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'slot',b.slot_id,'date',b.session_date,'status',b.status,'direction',b.direction,'message',b.message,
        'venue',x.venue_id,'venue_name',v.name,'therapist_name',coalesce(p.display_name,'Healer'),'start',x.start_min,'end',public.anyen_p1_run_end(x.id)) order by b.session_date,x.start_min)
      from public.anyen_bookings b join public.anyen_slots x on x.id=b.slot_id join public.anyen_venues v on v.id=x.venue_id left join public.anyen_profiles p on p.id=x.therapist_id
      where b.guest_id=me and b.session_date>=today),'[]'::jsonb));
end $$;

-- ===== Quyền =====
revoke all on function public.anyen_p1_started(bigint,date) from public, anon, authenticated;
revoke all on function public.anyen_p1_expire() from public, anon, authenticated;
revoke all on function public.anyen_p1_clash(uuid,date,int,int,bigint) from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['anyen_booking_invite(bigint,date,uuid,text)','anyen_booking_request(bigint,date,text)','anyen_booking_respond(bigint,boolean)',
    'anyen_booking_cancel(bigint)','anyen_sched_open(int,text)','anyen_my_schedule()'] loop
    execute 'revoke all on function public.'||f||' from public, anon';
    execute 'grant execute on function public.'||f||' to authenticated';
  end loop;
end $$;

notify pgrst, 'reload schema';
