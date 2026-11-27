-- LÀNG YÊN · Giai đoạn 1c — Healer tự mở lịch (Quy hoạch v3.3, Phần V). Chạy SAU supabase_phase1.sql và supabase_phase1b.sql.
-- CHƯA CHẠY trên Supabase chính. Chạy lại nhiều lần vẫn an toàn.
--   1. Healer tự mở khung 30 phút, có hiệu lực ngay, không cần Admin duyệt. Sửa / hủy được.
--   2. Nhiều phiên chạy song song và tách biệt: mỗi phiên (chuỗi khung 30 phút liền nhau của một Healer tại một Nhà)
--      có session_instance_id riêng và kênh trò chuyện riêng, tối đa 6 người (1 Healer + 5 khách).
--   3. Đặt lịch hai chiều theo phiên: khách xin chỗ, Healer mời theo email. Khóa cứng 5 khách / phiên (giữ từ phase1).
--   4. Vào đúng ca: hàm cho biết phiên sắp tới / đang diễn ra của tài khoản để vào thẳng Nhà đã đăng ký.
-- Giờ tính theo Asia/Ho_Chi_Minh. weekday: 1 = Thứ 2 … 7 = Chủ nhật.

-- ===== 0. Nhà Niệm cũng là một Healing House =====
insert into public.anyen_venues(id,realm,kind,name,tier,capacity,schedulable,sort) values
  ('nha_niem','rung_yen','house','Nhà Niệm','group',6,true,6)
on conflict (id) do update set realm=excluded.realm,kind=excluded.kind,name=excluded.name,tier=excluded.tier,capacity=excluded.capacity,schedulable=excluded.schedulable,sort=excluded.sort;
update public.anyen_venues set sort=7 where id='nha_van_hoa';
update public.anyen_venues set sort=8 where id='tu_gia';

-- ===== 1. Không còn giới hạn "một Healer mỗi khung mỗi Nhà": nhiều phiên song song =====
drop index if exists public.anyen_slots_one_approved;

-- Giờ hiện tại theo Việt Nam: thứ (1–7) và phút trong ngày
create or replace function public.anyen_p1_now_vn(out wd int, out mins int, out d date)
language sql stable set search_path = '' as $$
  select extract(isodow from t)::int, (extract(hour from t)*60+extract(minute from t))::int, t::date
  from (select now() at time zone 'Asia/Ho_Chi_Minh' t) n
$$;

-- Khung đầu của chuỗi khung liền nhau (cùng Healer, cùng Nhà, cùng thứ)
create or replace function public.anyen_p1_run_start(p_slot bigint) returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare s public.anyen_slots; prev bigint;
begin
  select * into s from public.anyen_slots where id=p_slot;
  if s.id is null then return null; end if;
  loop
    select x.id into prev from public.anyen_slots x where x.therapist_id=s.therapist_id and x.venue_id=s.venue_id and x.weekday=s.weekday
      and x.start_min=s.start_min-30 and x.status='approved' limit 1;
    exit when prev is null;
    select * into s from public.anyen_slots where id=prev;prev:=null;
  end loop;
  return s.id;
end $$;

-- Phút kết thúc của chuỗi khung bắt đầu từ p_slot
create or replace function public.anyen_p1_run_end(p_slot bigint) returns int
language plpgsql stable security definer set search_path = '' as $$
declare s public.anyen_slots; e int;
begin
  select * into s from public.anyen_slots where id=p_slot;
  if s.id is null then return null; end if;
  e:=s.start_min+30;
  while exists(select 1 from public.anyen_slots x where x.therapist_id=s.therapist_id and x.venue_id=s.venue_id and x.weekday=s.weekday and x.start_min=e and x.status='approved') loop
    e:=e+30;
  end loop;
  return e;
end $$;

-- Healer mở khung: có hiệu lực ngay (approved). Ghép nhiều khung liền nhau thành một phiên 60–180 phút.
create or replace function public.anyen_slot_request(p_venue text, p_weekday int, p_starts int[], p_note text default null)
returns setof public.anyen_slots language plpgsql security definer set search_path = '' as $$
declare s int; v public.anyen_slots;
begin
  if not public.anyen_p1_is_therapist() then raise exception 'Chỉ Healer đã được xác minh mới mở được khung giờ'; end if;
  if not exists(select 1 from public.anyen_venues where id=p_venue and schedulable) then raise exception 'Nơi này không nhận lịch trị liệu'; end if;
  if p_weekday is null or p_weekday not between 1 and 7 then raise exception 'Chọn thứ trong tuần'; end if;
  if coalesce(array_length(p_starts,1),0) not between 1 and 6 then raise exception 'Chọn từ 1 đến 6 khung 30 phút'; end if;
  foreach s in array p_starts loop
    if s is null or s not between 0 and 1410 or s%30<>0 then raise exception 'Khung giờ không hợp lệ'; end if;
    if exists(select 1 from public.anyen_slots x where x.therapist_id=auth.uid() and x.weekday=p_weekday and x.start_min=s and x.status in ('pending','approved')) then
      raise exception 'Bạn đã có lịch lúc %:% thứ %', s/60, lpad((s%60)::text,2,'0'), case when p_weekday=7 then 'CN' else (p_weekday+1)::text end; end if;
    insert into public.anyen_slots(venue_id,therapist_id,weekday,start_min,status,note,reviewed_at)
      values (p_venue,auth.uid(),p_weekday,s,'approved',left(p_note,300),now()) returning * into v;
    return next v;
  end loop;
  insert into public.anyen_schedule_log(actor,action,detail) values (auth.uid(),'open',jsonb_build_object('venue',p_venue,'weekday',p_weekday,'starts',p_starts));
end $$;

-- Healer hủy khung: lịch đã đặt của các ngày sắp tới trên phiên này cũng hủy theo
create or replace function public.anyen_slot_cancel(p_slot bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare r bigint := public.anyen_p1_run_start(p_slot); today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  update public.anyen_slots set status='cancelled' where id=p_slot and therapist_id=auth.uid() and status in ('pending','approved');
  if not found then raise exception 'Không hủy được khung này'; end if;
  update public.anyen_bookings set status='cancelled',responded_at=now() where slot_id in (p_slot,r) and session_date>=today and status in ('pending','accepted');
  insert into public.anyen_schedule_log(actor,action,detail) values (auth.uid(),'cancel',jsonb_build_object('slot',p_slot));
end $$;

-- ===== 2. Phiên song song khi vào không gian =====
-- Phiên đang diễn ra tại p_venue mà p_uid được vào (là Healer, khách đã được nhận, hoặc 02 Admin Gốc chọn phiên đầu tiên)
create or replace function public.anyen_p1_my_run_now(p_venue text, p_uid uuid default auth.uid()) returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare n record; s public.anyen_slots; r bigint;
begin
  select * into n from public.anyen_p1_now_vn();
  for s in select * from public.anyen_slots x where x.venue_id=p_venue and x.status='approved' and x.weekday=n.wd and x.start_min=(n.mins/30)*30 order by x.id loop
    r:=public.anyen_p1_run_start(s.id);
    if s.therapist_id=p_uid then return r; end if;
    if exists(select 1 from public.anyen_bookings b where b.slot_id=r and b.guest_id=p_uid and b.session_date=n.d and b.status='accepted') then return r; end if;
  end loop;
  return null;
end $$;

create or replace function public.anyen_p1_any_run_now(p_venue text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.anyen_slots x, public.anyen_p1_now_vn() n where x.venue_id=p_venue and x.status='approved' and x.weekday=n.wd and x.start_min=(n.mins/30)*30)
$$;

-- Giữ chỗ trong không gian. Trả {ok, reason, count, capacity, topic, session, instance, therapist, ends}
create or replace function public.anyen_space_enter(p_venue text, p_tab text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v public.anyen_venues; r text; n int; me uuid:=auth.uid(); run bigint; key text; s public.anyen_slots; d date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if me is null then return jsonb_build_object('ok',false,'reason','auth'); end if;
  select * into v from public.anyen_venues where id=p_venue;
  if v.id is null then return jsonb_build_object('ok',false,'reason','unknown'); end if;
  if v.tier='solo' then return jsonb_build_object('ok',false,'reason','solo','capacity',v.capacity); end if;
  if not public.anyen_p1_is_member(me) then return jsonb_build_object('ok',false,'reason','guest','capacity',v.capacity); end if;
  key:=p_venue;
  if v.tier='group' then
    run:=public.anyen_p1_my_run_now(p_venue, me);
    if run is not null then key:=p_venue||'__s'||run;
    elsif public.anyen_p1_any_run_now(p_venue) and public.anyen_p1_admin_level()<2 then
      return jsonb_build_object('ok',false,'reason','session','capacity',v.capacity);
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('anyen:sp:'||key,0));
  select count(*) into n from public.anyen_active_session a where a.space=key and a.user_id<>me and a.seen_at>now()-interval '45 seconds';
  if n>=v.capacity and public.anyen_p1_admin_level()<2 then return jsonb_build_object('ok',false,'reason','full','count',n,'capacity',v.capacity); end if;
  insert into public.anyen_active_session(user_id,tab_id,space,seen_at) values (me,coalesce(left(p_tab,64),'space'),key,now())
    on conflict (user_id) do update set space=excluded.space, seen_at=now();
  if run is not null then select * into s from public.anyen_slots where id=run; end if;
  return jsonb_build_object('ok',true,'count',n+1,'capacity',v.capacity,'topic','anyen:sp:'||key,'session',run,
    'instance',case when run is null then null else run||'-'||to_char(d,'YYYYMMDD') end,
    'therapist',s.therapist_id,'ends',case when run is null then null else public.anyen_p1_run_end(run) end);
end $$;

-- Vẫn còn ở đây? false = đã mất chỗ hoặc phiên đã hết giờ (máy khách tự vào lại)
create or replace function public.anyen_space_beat(p_venue text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare sp text; run bigint;
begin
  select a.space into sp from public.anyen_active_session a where a.user_id=auth.uid() and a.seen_at>now()-interval '45 seconds';
  if sp is null or not (sp=p_venue or left(sp,length(p_venue)+3)=p_venue||'__s') then return false; end if;
  if sp<>p_venue then
    run:=public.anyen_p1_my_run_now(p_venue);
    if run is null or sp<>p_venue||'__s'||run then return false; end if;
  elsif public.anyen_p1_any_run_now(p_venue) and public.anyen_p1_my_run_now(p_venue) is not null then
    return false;  -- phiên của mình vừa bắt đầu: vào lại để sang kênh phiên
  end if;
  update public.anyen_active_session set seen_at=now() where user_id=auth.uid();
  return true;
end $$;

-- Số người theo Nhà / Đảo (gộp các phiên)
create or replace function public.anyen_space_counts() returns table(space text, n int)
language sql stable security definer set search_path = '' as $$
  select split_part(a.space,'__s',1), count(*)::int from public.anyen_active_session a where a.space is not null and a.seen_at>now()-interval '45 seconds' group by 1
$$;

-- Kênh trực tiếp: chỉ ai đang giữ chỗ trong không gian / phiên đó
create or replace function public.anyen_p1_space_seat(p_topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_topic ~ '^anyen:sp:[a-z0-9_]{1,48}$' and exists(
    select 1 from public.anyen_active_session a where a.user_id=auth.uid() and a.space=substring(p_topic from 10) and a.seen_at>now()-interval '2 minutes')
$$;
do $$ begin
  if exists (select 1 from pg_constraint where conname='anyen_active_session_space_chk') then
    alter table public.anyen_active_session drop constraint anyen_active_session_space_chk;
  end if;
  alter table public.anyen_active_session add constraint anyen_active_session_space_chk check (space is null or space ~ '^[a-z0-9_]{1,48}$');
end $$;

-- ===== 3. Lịch cho giao diện =====
-- Các phiên đã mở trong p_days ngày tới (mỗi phiên = chuỗi khung liền nhau), kèm số khách đã nhận và trạng thái của mình
create or replace function public.anyen_sched_open(p_days int default 14, p_venue text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n record; out jsonb := '[]'::jsonb; s record; dd date; i int; e int; me uuid := auth.uid();
begin
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

-- Lịch của tôi: khung đã mở (nếu là Healer), người đặt theo từng phiên, và lịch tôi đã đặt / được mời
create or replace function public.anyen_my_schedule() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if me is null then return jsonb_build_object('role','guest'); end if;
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
      where b.guest_id=me and b.session_date>=today and b.status in ('pending','accepted')),'[]'::jsonb));
end $$;

-- Healer mời một thành viên bằng email vào một phiên
create or replace function public.anyen_booking_invite_email(p_slot bigint, p_date date, p_email text, p_message text default null)
returns public.anyen_bookings language plpgsql security definer set search_path = '' as $$
declare g uuid;
begin
  select u.id into g from auth.users u where lower(u.email)=lower(btrim(p_email)) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) limit 1;
  if g is null then raise exception 'Chưa có thành viên nào dùng email này'; end if;
  if g=auth.uid() then raise exception 'Không tự mời chính mình được'; end if;
  return public.anyen_booking_invite(p_slot,p_date,g,p_message);
end $$;

-- Vào đúng ca: phiên của tôi đang diễn ra hoặc bắt đầu trong 15 phút tới (là Healer hoặc khách đã được nhận)
create or replace function public.anyen_my_next_session() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n record; me uuid := auth.uid(); r record;
begin
  if me is null then return null; end if;
  select * into n from public.anyen_p1_now_vn();
  for r in
    select x.id, x.venue_id, v.name venue_name, x.start_min, public.anyen_p1_run_end(x.id) end_min, x.therapist_id=me as host
      from public.anyen_slots x join public.anyen_venues v on v.id=x.venue_id
     where x.status='approved' and x.weekday=n.wd
       and public.anyen_p1_run_start(x.id)=x.id
       and (x.therapist_id=me or exists(select 1 from public.anyen_bookings b where b.slot_id=x.id and b.guest_id=me and b.session_date=n.d and b.status='accepted'))
     order by x.start_min
  loop
    if r.start_min-15<=n.mins and n.mins<r.end_min then
      return jsonb_build_object('slot',r.id,'venue',r.venue_id,'venue_name',r.venue_name,'start',r.start_min,'end',r.end_min,'host',r.host,'now',n.mins,
        'guests',(select count(*) from public.anyen_bookings b where b.slot_id=r.id and b.session_date=n.d and b.status='accepted'));
    end if;
  end loop;
  return null;
end $$;

-- ===== Quyền =====
revoke all on function public.anyen_p1_now_vn() from public, anon, authenticated;
revoke all on function public.anyen_p1_run_start(bigint) from public, anon, authenticated;
revoke all on function public.anyen_p1_run_end(bigint) from public, anon, authenticated;
revoke all on function public.anyen_p1_my_run_now(text,uuid) from public, anon, authenticated;
revoke all on function public.anyen_p1_any_run_now(text) from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['anyen_slot_request(text,int,int[],text)','anyen_slot_cancel(bigint)','anyen_space_enter(text,text)','anyen_space_beat(text)',
    'anyen_space_counts()','anyen_p1_space_seat(text)','anyen_sched_open(int,text)','anyen_my_schedule()','anyen_booking_invite_email(bigint,date,text,text)','anyen_my_next_session()'] loop
    execute 'revoke all on function public.'||f||' from public, anon';
    execute 'grant execute on function public.'||f||' to authenticated';
  end loop;
end $$;
