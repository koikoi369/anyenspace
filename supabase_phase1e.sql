-- LÀNG YÊN · Giai đoạn 1e — Lịch hẹn v3.9 (đợt 2): Chủ nhà mời bạn tới Tư Gia (Rừng Yên) hoặc Đảo Yên (Vịnh Yên).
-- Chạy SAU supabase_phase1.sql, 1b, 1c, 1d. Chạy lại nhiều lần vẫn an toàn.
--   1. Thành viên trở lên mở một buổi hẹn đơn lẻ (không lặp tuần): chọn Tư Gia hoặc Đảo Yên, ngày (trong 1 năm tới), 1–6 khung 30 phút liền nhau.
--   2. Chủ nhà mời bạn bằng email; bạn bấm Đồng ý / Từ chối. Tối đa 6 người = Chủ nhà + 5 bạn đã khớp.
--      Ai từ chối hay hủy thì Chủ nhà mời người khác bù vào.
--   3. Rà soát trước khi khớp như phiên trị liệu: không trùng giờ với lịch đã khớp (cả lịch trị liệu và lịch Tư Gia), tối đa 5 bạn.
--   4. Lời mời chưa khớp tự hết hạn khi buổi hẹn bắt đầu; hủy được bất cứ lúc nào trước giờ hẹn.
--   5. Đến giờ, Chủ nhà và bạn đã khớp vào Tư Gia / Đảo Yên của mình là cùng một kênh (trò chuyện, thấy nhau có mặt).
--      Ngoài giờ hẹn, Tư Gia vẫn là không gian riêng như cũ.
-- Giờ tính theo Asia/Ho_Chi_Minh.

-- ===== 1. Bảng =====
create table if not exists public.anyen_home_sessions (
  id bigint generated always as identity primary key,
  host_id uuid not null references auth.users(id) on delete cascade,
  place text not null check (place in ('tu_gia','tu_dao')),
  session_date date not null,
  start_min smallint not null check (start_min between 0 and 1410 and start_min % 30 = 0),
  end_min smallint not null check (end_min % 30 = 0 and end_min > start_min and end_min <= 1440 and end_min - start_min <= 180),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists anyen_home_sessions_host on public.anyen_home_sessions(host_id, session_date);
create index if not exists anyen_home_sessions_now on public.anyen_home_sessions(place, session_date) where status='open';

create table if not exists public.anyen_home_invites (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.anyen_home_sessions(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  message text check (message is null or char_length(message) <= 300),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (session_id, guest_id)
);
create index if not exists anyen_home_invites_guest on public.anyen_home_invites(guest_id);

alter table public.anyen_home_sessions enable row level security;
alter table public.anyen_home_invites enable row level security;
-- Đọc thẳng bảng: Chủ nhà thấy buổi hẹn của mình, bạn thấy lời mời của mình (giao diện đọc qua anyen_my_schedule).
do $$ begin
  if not exists (select 1 from pg_policies where tablename='anyen_home_sessions' and policyname='home_host') then
    create policy home_host on public.anyen_home_sessions for select to authenticated using (host_id=(select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename='anyen_home_invites' and policyname='home_guest') then
    create policy home_guest on public.anyen_home_invites for select to authenticated using (guest_id=(select auth.uid()));
  end if;
end $$;
grant select on public.anyen_home_sessions, public.anyen_home_invites to authenticated;

-- ===== 2. Hàm phụ =====
create or replace function public.anyen_p1_home_started(p_session bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (h.session_date + make_interval(mins => h.start_min)) <= (now() at time zone 'Asia/Ho_Chi_Minh')
    from public.anyen_home_sessions h where h.id=p_session), true)
$$;

create or replace function public.anyen_p1_place_name(p_place text) returns text
language sql immutable set search_path = '' as $$
  select case p_place when 'tu_gia' then 'Tư Gia' when 'tu_dao' then 'Đảo Yên' else p_place end
$$;

-- Hết hạn: lịch trị liệu (như 1d) + lời mời Tư Gia / Đảo Yên
create or replace function public.anyen_p1_expire() returns void
language sql volatile security definer set search_path = '' as $$
  update public.anyen_bookings b set status='expired', responded_at=now()
   where b.status='pending' and b.session_date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
     and public.anyen_p1_started(b.slot_id, b.session_date);
  update public.anyen_home_invites i set status='expired', responded_at=now()
    from public.anyen_home_sessions h
   where h.id=i.session_id and i.status='pending' and h.session_date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
     and (h.session_date + make_interval(mins => h.start_min)) <= (now() at time zone 'Asia/Ho_Chi_Minh');
$$;

-- Trùng giờ đã khớp. p_except > 0: bỏ qua lịch trị liệu có id này; p_except < 0: bỏ qua lời mời Tư Gia có id = -p_except.
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
  select public.anyen_p1_place_name(h.place)||' lúc '||lpad((h.start_min/60)::text,2,'0')||':'||lpad((h.start_min%60)::text,2,'0')||' (bạn mời bạn bè)' as name into r
    from public.anyen_home_sessions h
   where h.host_id=p_uid and h.status='open' and h.session_date=p_date and h.start_min < p_end and p_start < h.end_min
   order by h.start_min limit 1;
  if found then return r.name; end if;
  select public.anyen_p1_place_name(h.place)||' của '||coalesce(p.display_name,'bạn')||' lúc '||lpad((h.start_min/60)::text,2,'0')||':'||lpad((h.start_min%60)::text,2,'0') as name into r
    from public.anyen_home_invites i join public.anyen_home_sessions h on h.id=i.session_id left join public.anyen_profiles p on p.id=h.host_id
   where i.guest_id=p_uid and i.status='accepted' and h.status='open' and h.session_date=p_date and h.start_min < p_end and p_start < h.end_min
     and i.id is distinct from -p_except
   order by h.start_min limit 1;
  if found then return r.name; end if;
  return null;
end $$;

-- ===== 3. Chủ nhà mở buổi hẹn =====
create or replace function public.anyen_home_open(p_place text, p_date date, p_starts int[], p_note text default null)
returns public.anyen_home_sessions language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); a int[]; s int; e int; i int; c text; h public.anyen_home_sessions; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.anyen_p1_is_member() then raise exception 'Cần là thành viên để mời bạn bè'; end if;
  if p_place is null or p_place not in ('tu_gia','tu_dao') then raise exception 'Chọn Tư Gia hoặc Đảo Yên'; end if;
  if p_date is null or p_date < today then raise exception 'Ngày đã qua'; end if;
  if p_date > today + 365 then raise exception 'Chỉ hẹn trước tối đa 1 năm'; end if;
  select array_agg(distinct x order by x) into a from unnest(p_starts) x;
  if coalesce(array_length(a,1),0) not between 1 and 6 then raise exception 'Chọn từ 1 đến 6 khung 30 phút'; end if;
  for i in 1..array_length(a,1) loop
    if a[i] is null or a[i] not between 0 and 1410 or a[i]%30<>0 then raise exception 'Khung giờ không hợp lệ'; end if;
    if i>1 and a[i]<>a[i-1]+30 then raise exception 'Các khung 30 phút cần liền nhau'; end if;
  end loop;
  s:=a[1]; e:=a[array_length(a,1)]+30;
  if (p_date + make_interval(mins => s)) <= (now() at time zone 'Asia/Ho_Chi_Minh') then raise exception 'Giờ này đã qua'; end if;
  perform pg_advisory_xact_lock(hashtextextended('anyen:guest:'||me||p_date,0));
  c:=public.anyen_p1_clash(me,p_date,s,e);
  if c is not null then raise exception 'Bạn đã có lịch % cùng giờ', c; end if;
  insert into public.anyen_home_sessions(host_id,place,session_date,start_min,end_min,note) values (me,p_place,p_date,s,e,left(nullif(btrim(coalesce(p_note,'')),''),300)) returning * into h;
  return h;
end $$;

-- Chủ nhà hủy buổi hẹn (trước giờ hẹn): lời mời của bạn bè hủy theo
create or replace function public.anyen_home_cancel(p_session bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.anyen_p1_home_started(p_session) then raise exception 'Buổi hẹn đã bắt đầu. Bạn cứ rời đi lúc nào cũng được.'; end if;
  update public.anyen_home_sessions set status='cancelled' where id=p_session and host_id=auth.uid() and status='open';
  if not found then raise exception 'Không hủy được buổi hẹn này'; end if;
  update public.anyen_home_invites set status='cancelled',responded_at=now() where session_id=p_session and status in ('pending','accepted');
end $$;

-- Chủ nhà mời bạn bằng email
create or replace function public.anyen_home_invite_email(p_session bigint, p_email text, p_message text default null)
returns public.anyen_home_invites language plpgsql security definer set search_path = '' as $$
declare h public.anyen_home_sessions; g uuid; v public.anyen_home_invites; n int;
begin
  select * into h from public.anyen_home_sessions where id=p_session;
  if h.id is null or h.host_id<>auth.uid() then raise exception 'Chỉ Chủ nhà mới gửi lời mời'; end if;
  if h.status<>'open' then raise exception 'Buổi hẹn đã hủy'; end if;
  if public.anyen_p1_home_started(p_session) then raise exception 'Buổi hẹn đã bắt đầu, không mời thêm được'; end if;
  select u.id into g from auth.users u where lower(u.email)=lower(btrim(coalesce(p_email,''))) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) limit 1;
  if g is null then raise exception 'Chưa có thành viên nào dùng email này'; end if;
  if g=auth.uid() then raise exception 'Không tự mời chính mình được'; end if;
  if not public.anyen_p1_is_member(g) then raise exception 'Người được mời cần là thành viên'; end if;
  select count(*) into n from public.anyen_home_invites where session_id=p_session and status='accepted';
  if n>=5 then raise exception 'Buổi hẹn đã đủ 5 bạn'; end if;
  select count(*) into n from public.anyen_home_invites where session_id=p_session and status in ('pending','accepted');
  if n>=20 then raise exception 'Bạn đã mời 20 người cho buổi này. Chờ mọi người trả lời trước nhé.'; end if;
  insert into public.anyen_home_invites(session_id,guest_id,message) values (p_session,g,left(nullif(btrim(coalesce(p_message,'')),''),300))
    on conflict (session_id,guest_id) do update set status='pending',message=excluded.message,created_at=now(),responded_at=null
    where public.anyen_home_invites.status<>'accepted'
    returning * into v;
  if v.id is null then raise exception 'Bạn này đã nhận lời rồi'; end if;
  return v;
end $$;

-- Bạn trả lời lời mời. Rà soát trước khi khớp: không trùng giờ, tối đa 5 bạn.
create or replace function public.anyen_home_respond(p_invite bigint, p_accept boolean)
returns public.anyen_home_invites language plpgsql security definer set search_path = '' as $$
declare v public.anyen_home_invites; h public.anyen_home_sessions; n int; c text;
begin
  select * into v from public.anyen_home_invites where id=p_invite for update;
  if v.id is null or v.guest_id<>auth.uid() then raise exception 'Không có lời mời này'; end if;
  if v.status<>'pending' then raise exception 'Lời mời không còn chờ trả lời'; end if;
  select * into h from public.anyen_home_sessions where id=v.session_id for update;
  if h.status<>'open' then raise exception 'Chủ nhà đã hủy buổi hẹn'; end if;
  if public.anyen_p1_home_started(h.id) then raise exception 'Buổi hẹn đã bắt đầu, lời mời này đã hết hạn'; end if;
  if p_accept then
    perform pg_advisory_xact_lock(hashtextextended('anyen:guest:'||v.guest_id||h.session_date,0));
    c:=public.anyen_p1_clash(v.guest_id,h.session_date,h.start_min,h.end_min,-v.id);
    if c is not null then raise exception 'Bạn đã có lịch % cùng giờ. Muốn nhận lời này, hãy hủy lịch đó trước.', c; end if;
    select count(*) into n from public.anyen_home_invites where session_id=h.id and status='accepted';
    if n>=5 then raise exception 'Buổi hẹn đã đủ 5 bạn'; end if;
  end if;
  update public.anyen_home_invites set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=v.id returning * into v;
  return v;
end $$;

-- Hủy lời mời / hủy khớp (bạn hoặc Chủ nhà), trước giờ hẹn
create or replace function public.anyen_home_invite_cancel(p_invite bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.anyen_home_invites;
begin
  select i.* into v from public.anyen_home_invites i join public.anyen_home_sessions h on h.id=i.session_id
   where i.id=p_invite and i.status in ('pending','accepted') and (i.guest_id=auth.uid() or h.host_id=auth.uid()) for update of i;
  if v.id is null then raise exception 'Không hủy được lời mời này'; end if;
  if public.anyen_p1_home_started(v.session_id) then raise exception 'Buổi hẹn đã bắt đầu. Bạn cứ rời đi lúc nào cũng được.'; end if;
  update public.anyen_home_invites set status='cancelled',responded_at=now() where id=v.id;
end $$;

-- ===== 4. Lịch của tôi (thêm buổi hẹn tôi mời và lời mời tôi nhận) =====
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
      where b.guest_id=me and b.session_date>=today),'[]'::jsonb),
    'homes', coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'place',h.place,'place_name',public.anyen_p1_place_name(h.place),'date',h.session_date,'start',h.start_min,'end',h.end_min,'note',h.note,
        'started',public.anyen_p1_home_started(h.id),
        'accepted',(select count(*) from public.anyen_home_invites i where i.session_id=h.id and i.status='accepted'),
        'guests',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',coalesce(p.display_name,'Thành viên'),'status',i.status) order by i.status,i.created_at)
           from public.anyen_home_invites i left join public.anyen_profiles p on p.id=i.guest_id where i.session_id=h.id and i.status in ('pending','accepted','declined')),'[]'::jsonb))
        order by h.session_date,h.start_min)
      from public.anyen_home_sessions h where h.host_id=me and h.status='open' and h.session_date>=today),'[]'::jsonb),
    'home_invites', coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'status',i.status,'message',i.message,'place',h.place,'place_name',public.anyen_p1_place_name(h.place),
        'host_name',coalesce(p.display_name,'Thành viên'),'date',h.session_date,'start',h.start_min,'end',h.end_min,'note',h.note,
        'accepted',(select count(*) from public.anyen_home_invites j where j.session_id=h.id and j.status='accepted')) order by h.session_date,h.start_min)
      from public.anyen_home_invites i join public.anyen_home_sessions h on h.id=i.session_id left join public.anyen_profiles p on p.id=h.host_id
      where i.guest_id=me and h.session_date>=today),'[]'::jsonb));
end $$;

-- ===== 5. Vào đúng giờ hẹn =====
-- Buổi hẹn đang diễn ra ở p_place mà p_uid được vào (Chủ nhà hoặc bạn đã khớp)
create or replace function public.anyen_p1_home_now(p_place text, p_uid uuid default auth.uid()) returns bigint
language sql stable security definer set search_path = '' as $$
  select h.id from public.anyen_home_sessions h, public.anyen_p1_now_vn() n
   where h.place=p_place and h.status='open' and h.session_date=n.d and h.start_min<=n.mins and n.mins<h.end_min
     and (h.host_id=p_uid or exists(select 1 from public.anyen_home_invites i where i.session_id=h.id and i.guest_id=p_uid and i.status='accepted'))
   order by (h.host_id=p_uid) desc, h.id limit 1
$$;

create or replace function public.anyen_space_enter(p_venue text, p_tab text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v public.anyen_venues; r text; n int; me uuid:=auth.uid(); run bigint; key text; s public.anyen_slots; hs public.anyen_home_sessions; d date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if me is null then return jsonb_build_object('ok',false,'reason','auth'); end if;
  -- Tư Gia / Đảo Yên: không gian riêng, chỉ thành kênh chung trong giờ hẹn (Chủ nhà + tối đa 5 bạn đã khớp)
  if p_venue in ('tu_gia_me','tu_dao_me') then
    if not public.anyen_p1_is_member(me) then return jsonb_build_object('ok',false,'reason','solo','capacity',1); end if;
    run:=public.anyen_p1_home_now(case p_venue when 'tu_gia_me' then 'tu_gia' else 'tu_dao' end, me);
    if run is null then return jsonb_build_object('ok',false,'reason','solo','capacity',1); end if;
    key:=p_venue||'__h'||run;
    perform pg_advisory_xact_lock(hashtextextended('anyen:sp:'||key,0));
    select count(*) into n from public.anyen_active_session a where a.space=key and a.user_id<>me and a.seen_at>now()-interval '45 seconds';
    if n>=6 then return jsonb_build_object('ok',false,'reason','full','count',n,'capacity',6); end if;
    insert into public.anyen_active_session(user_id,tab_id,space,seen_at) values (me,coalesce(left(p_tab,64),'space'),key,now())
      on conflict (user_id) do update set space=excluded.space, seen_at=now();
    select * into hs from public.anyen_home_sessions where id=run;
    return jsonb_build_object('ok',true,'count',n+1,'capacity',6,'topic','anyen:sp:'||key,'home',run,'instance','h'||run||'-'||to_char(d,'YYYYMMDD'),
      'host',hs.host_id,'ends',hs.end_min);
  end if;
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

create or replace function public.anyen_space_beat(p_venue text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare sp text; run bigint;
begin
  select a.space into sp from public.anyen_active_session a where a.user_id=auth.uid() and a.seen_at>now()-interval '45 seconds';
  if p_venue in ('tu_gia_me','tu_dao_me') then
    run:=public.anyen_p1_home_now(case p_venue when 'tu_gia_me' then 'tu_gia' else 'tu_dao' end);
    if sp is null or run is null or sp<>p_venue||'__h'||run then return false; end if;
    update public.anyen_active_session set seen_at=now() where user_id=auth.uid();
    return true;
  end if;
  if sp is null or not (sp=p_venue or left(sp,length(p_venue)+3)=p_venue||'__s') then return false; end if;
  if sp<>p_venue then
    run:=public.anyen_p1_my_run_now(p_venue);
    if run is null or sp<>p_venue||'__s'||run then return false; end if;
  elsif public.anyen_p1_any_run_now(p_venue) and public.anyen_p1_my_run_now(p_venue) is not null then
    return false;
  end if;
  update public.anyen_active_session set seen_at=now() where user_id=auth.uid();
  return true;
end $$;

-- Nhắc giờ: phiên trị liệu hoặc buổi hẹn Tư Gia / Đảo Yên đang diễn ra hoặc bắt đầu trong 15 phút tới
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
  for r in
    select h.id, h.place, h.start_min, h.end_min, h.host_id=me as host, coalesce(p.display_name,'bạn') host_name
      from public.anyen_home_sessions h left join public.anyen_profiles p on p.id=h.host_id
     where h.status='open' and h.session_date=n.d
       and (h.host_id=me or exists(select 1 from public.anyen_home_invites i where i.session_id=h.id and i.guest_id=me and i.status='accepted'))
     order by h.start_min
  loop
    if r.start_min-15<=n.mins and n.mins<r.end_min then
      return jsonb_build_object('slot',-r.id,'kind','home','venue',r.place,
        'venue_name',public.anyen_p1_place_name(r.place)||case when r.host then ' của bạn' else ' của '||r.host_name end,
        'start',r.start_min,'end',r.end_min,'host',r.host,'now',n.mins,
        'guests',(select count(*) from public.anyen_home_invites i where i.session_id=r.id and i.status='accepted'));
    end if;
  end loop;
  return null;
end $$;

-- ===== Quyền =====
revoke all on function public.anyen_p1_home_started(bigint) from public, anon, authenticated;
revoke all on function public.anyen_p1_home_now(text,uuid) from public, anon, authenticated;
revoke all on function public.anyen_p1_expire() from public, anon, authenticated;
revoke all on function public.anyen_p1_clash(uuid,date,int,int,bigint) from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['anyen_home_open(text,date,int[],text)','anyen_home_cancel(bigint)','anyen_home_invite_email(bigint,text,text)',
    'anyen_home_respond(bigint,boolean)','anyen_home_invite_cancel(bigint)','anyen_my_schedule()','anyen_space_enter(text,text)','anyen_space_beat(text)','anyen_my_next_session()'] loop
    execute 'revoke all on function public.'||f||' from public, anon';
    execute 'grant execute on function public.'||f||' to authenticated';
  end loop;
end $$;

notify pgrst, 'reload schema';
