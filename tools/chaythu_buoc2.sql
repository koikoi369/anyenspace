-- CHỈ CHẠY TRÊN SUPABASE THỬ: Langyen-chaythu (cxytckciflwcmyrvgqyc). KHÔNG chạy trên anyen-space.
-- Phần còn lại của ảnh chụp bản chính (hàm, trigger, policy, quyền, dữ liệu cấu hình) + Giai đoạn 1.
set check_function_bodies = off;

-- ===== Hàm
CREATE OR REPLACE FUNCTION public.anyen_add_lobby_offering(p_kind text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF p_kind IS NULL OR p_kind NOT IN ('incense', 'flower', 'candle') THEN RAISE EXCEPTION 'Invalid offering'; END IF;
    -- Mỗi người chỉ dâng một lễ vật trong 3 giây
    IF EXISTS (SELECT 1 FROM public.anyen_lobby_offerings WHERE owner_id = auth.uid() AND created_at > now() - interval '3 seconds') THEN
        RAISE EXCEPTION 'Please wait 3 seconds between offerings';
    END IF;
    INSERT INTO public.anyen_lobby_offerings (owner_id, kind) VALUES (auth.uid(), p_kind) RETURNING id INTO v_id;
    RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_add_admin(p_email text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare e text := lower(btrim(coalesce(p_email,'')));
begin
 if not public.anyen_is_admin() then raise exception 'Không có quyền'; end if;
 if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email không hợp lệ'; end if;
 insert into public.anyen_admins(email,is_root,added_by) values (e,false,auth.uid()) on conflict (email) do nothing;
 perform public.anyen_admin_log_add('admin_add', e, '{}'::jsonb);
 return public.anyen_admin_list_admins();
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_list_admins()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
 if not public.anyen_is_admin() then raise exception 'Không có quyền'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('email',email,'is_root',is_root,'created_at',created_at) order by is_root desc, created_at) from public.anyen_admins),'[]'::jsonb);
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_list_log(p_limit integer DEFAULT 50)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
 if not public.anyen_is_admin() then raise exception 'Không có quyền'; end if;
 return coalesce((select jsonb_agg(to_jsonb(l) order by l.at desc) from (select actor_email,action,target,detail,at from public.anyen_admin_log order by at desc limit least(greatest(p_limit,1),200)) l),'[]'::jsonb);
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_list_profiles(p_filter text DEFAULT 'all'::text, p_search text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare r jsonb;
begin
 if not public.anyen_is_admin() then raise exception 'Không có quyền'; end if;
 select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) into r from (
  select p.id,p.email,p.display_name,p.role,p.therapist_status,p.member_status,p.status_reason,p.specialty,p.bio,p.created_at,
   exists(select 1 from public.anyen_admins a where a.email=p.email) as is_admin_email
  from public.anyen_profiles p
  where (p_filter='all'
    or (p_filter='pending' and p.therapist_status='pending')
    or (p_filter='therapists' and p.therapist_status in ('approved','suspended','rejected','pending'))
    or (p_filter='restricted' and p.member_status='restricted'))
   and (p_search is null or p_search='' or p.email ilike '%'||p_search||'%' or p.display_name ilike '%'||p_search||'%')
  limit 200) x;
 return r;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_log_add(p_action text, p_target text, p_detail jsonb)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $function$
 insert into public.anyen_admin_log(actor_id,actor_email,action,target,detail) values (auth.uid(), auth.jwt()->>'email', p_action, p_target, coalesce(p_detail,'{}'::jsonb));
$function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_remove_admin(p_email text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare e text := lower(btrim(coalesce(p_email,'')));
begin
 if not public.anyen_is_admin() then raise exception 'Không có quyền'; end if;
 if exists(select 1 from public.anyen_admins where email=e and is_root) then raise exception 'Không thể gỡ admin gốc'; end if;
 delete from public.anyen_admins where email=e;
 perform public.anyen_admin_log_add('admin_remove', e, '{}'::jsonb);
 return public.anyen_admin_list_admins();
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_set_member_status(p_user uuid, p_status text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v public.anyen_profiles;
begin
 if not public.anyen_is_admin() then raise exception 'Không có quyền'; end if;
 if p_status not in ('active','restricted') then raise exception 'Trạng thái không hợp lệ'; end if;
 select * into v from public.anyen_profiles where id=p_user for update;
 if v.id is null then raise exception 'Không tìm thấy tài khoản'; end if;
 if exists(select 1 from public.anyen_admins a where a.email=v.email) then raise exception 'Không thể hạn chế tài khoản admin'; end if;
 update public.anyen_profiles set member_status=p_status, status_reason=case when p_status='restricted' then left(nullif(btrim(coalesce(p_reason,'')),''),500) else null end, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() where id=p_user;
 perform public.anyen_admin_log_add('member_'||p_status, v.email, jsonb_build_object('reason',p_reason,'user',p_user));
 return jsonb_build_object('id',p_user,'member_status',p_status);
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_admin_set_therapist_status(p_user uuid, p_status text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v public.anyen_profiles;
begin
 if not public.anyen_is_admin() then raise exception 'Không có quyền'; end if;
 if p_status not in ('pending','approved','rejected','suspended') then raise exception 'Trạng thái không hợp lệ'; end if;
 select * into v from public.anyen_profiles where id=p_user for update;
 if v.id is null then raise exception 'Không tìm thấy tài khoản'; end if;
 if exists(select 1 from public.anyen_admins a where a.email=v.email and a.is_root) then raise exception 'Không thể đổi trạng thái của admin gốc'; end if;
 update public.anyen_profiles set role='therapist', therapist_status=p_status, status_reason=left(nullif(btrim(coalesce(p_reason,'')),''),500), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() where id=p_user;
 perform public.anyen_admin_log_add('therapist_'||p_status, v.email, jsonb_build_object('reason',p_reason,'user',p_user));
 return jsonb_build_object('id',p_user,'therapist_status',p_status);
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_apply_therapist()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v public.anyen_profiles;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Cần đăng nhập bằng email'; end if;
 select * into v from public.anyen_profiles where id=v_uid for update;
 if v.id is null then raise exception 'Chưa có hồ sơ'; end if;
 if v.member_status='restricted' then raise exception 'Tài khoản đang bị hạn chế'; end if;
 if v.therapist_status not in ('none','rejected') then raise exception 'Không thể nộp đơn ở trạng thái hiện tại'; end if;
 update public.anyen_profiles set role='therapist', therapist_status='pending', status_reason=null, updated_at=now() where id=v_uid;
 return public.anyen_get_my_profile();
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_aroma_trim()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  delete from public.anyen_aroma_gifts where id not in (
    (select id from public.anyen_aroma_gifts order by seq desc limit 9)
    union (select id from public.anyen_aroma_gifts where id not in (select id from public.anyen_aroma_gifts order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_bag_trim()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  delete from public.anyen_bag_items where owner = new.owner and id not in
    (select id from public.anyen_bag_items where owner = new.owner order by added_at desc, id limit 36);
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_can_access_meditation_room(p_topic text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uuid uuid;
begin
 if auth.uid() is null then return false; end if;
 if p_topic = 'anyen:room:sen' then return true; end if;
 if p_topic !~ '^anyen:private:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
 v_uuid := substring(p_topic from 15)::uuid;
 return public.anyen_is_private_member(v_uuid);
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_create_private_room()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare code text; rid uuid;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 code:=upper(encode(gen_random_bytes(12),'hex'));
 insert into public.anyen_private_rooms(invite_hash,owner_id)
 values (encode(digest(code,'sha256'),'hex'),auth.uid()) returning id into rid;
 insert into public.anyen_private_members(room_id,user_id) values(rid,auth.uid());
 return code;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_create_private_room(p_room_name text DEFAULT NULL::text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_code TEXT; v_room_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
    -- Mã mời 32 ký tự. Không cần extension pgcrypto riêng.
    v_code := upper(md5(gen_random_uuid()::text || clock_timestamp()::text));
    INSERT INTO public.anyen_private_rooms (invite_hash, owner_id, room_name)
    VALUES (md5(v_code), auth.uid(), left(coalesce(nullif(trim(p_room_name), ''), 'Phòng của ' || left(auth.uid()::text, 8)), 50))
    RETURNING id INTO v_room_id;
    INSERT INTO public.anyen_private_members (room_id, user_id) VALUES (v_room_id, auth.uid());
    RETURN v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.anyen_end_meditation_session(p_session_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_count integer;
begin
 update public.anyen_meditation_sessions set status='ended',ended_at=now(),ends_at=now()
 where id=p_session_id and host_id=auth.uid() and status='active';
 get diagnostics v_count=row_count;
 return v_count>0;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_flower_trim()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  delete from public.anyen_flower_offerings where id not in (
    (select id from public.anyen_flower_offerings order by seq desc limit 9)
    union (select id from public.anyen_flower_offerings where id not in (select id from public.anyen_flower_offerings order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_get_meditation_session(p_topic text)
 RETURNS public.anyen_meditation_sessions LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v public.anyen_meditation_sessions;
begin
 if not public.anyen_can_access_meditation_room(p_topic) then raise exception 'Room access denied'; end if;
 select * into v from public.anyen_meditation_sessions
 where room_topic=p_topic and status='active' and ends_at>now()
 order by created_at desc limit 1;
 return v;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_get_my_profile()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v public.anyen_profiles; v_anon boolean := coalesce((auth.jwt()->>'is_anonymous')::boolean,false);
 v_admin boolean; v_root boolean; v_role text; v_ts text;
begin
 if v_uid is null then return null; end if;
 if v_anon then return jsonb_build_object('id',v_uid,'role','guest'); end if;
 select * into v from public.anyen_profiles where id=v_uid;
 if v.id is null then return jsonb_build_object('id',v_uid,'role','member','display_name',null,'email',auth.jwt()->>'email','therapist_status','none','member_status','active','is_admin',false,'is_root',false); end if;
 v_admin := public.anyen_is_admin(); v_root := public.anyen_is_root_admin();
 v_role := v.role; v_ts := v.therapist_status;
 if v_root then v_role := 'therapist'; v_ts := 'approved'; end if;
 return jsonb_build_object('id',v.id,'role',v_role,'display_name',v.display_name,'bio',v.bio,'specialty',v.specialty,'prefs',v.prefs,
  'email',auth.jwt()->>'email','therapist_status',v_ts,'member_status',v.member_status,'status_reason',v.status_reason,'is_admin',v_admin,'is_root',v_root);
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_get_world_map(p_map_id text DEFAULT 'pine_forest'::text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 select jsonb_build_object(
  'map', to_jsonb(m),
  'nature', coalesce((select jsonb_agg(to_jsonb(n) order by n.sort_order,n.id) from public.anyen_world_nature n where n.map_id=m.id),'[]'::jsonb),
  'rooms', coalesce((select jsonb_agg(to_jsonb(r) order by r.sort_order,r.id) from public.anyen_world_rooms r where r.map_id=m.id),'[]'::jsonb),
  'buildings', coalesce((select jsonb_agg(to_jsonb(b) order by b.id) from public.anyen_world_buildings b where b.map_id=m.id),'[]'::jsonb),
  'props', coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order,p.id) from public.anyen_world_props p where p.map_id=m.id),'[]'::jsonb),
  'npcs', coalesce((select jsonb_agg(to_jsonb(c) - 'ai_config' order by c.id) from public.anyen_world_npcs c where c.map_id=m.id and c.active),'[]'::jsonb)
 )
 from public.anyen_world_maps m where m.id=p_map_id and m.status='live';
$function$;

CREATE OR REPLACE FUNCTION public.anyen_gift_item(item uuid, to_user uuid, from_name text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare n int;
begin
  if to_user is null or to_user = auth.uid() then return false; end if;
  update public.anyen_bag_items set owner = to_user, source = 'gift', from_name = left(coalesce(from_name,''), 24), added_at = now()
    where id = item and owner = auth.uid();
  get diagnostics n = row_count;
  return n = 1;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_role text; v_name text; v_status text;
begin
 if coalesce(new.is_anonymous,false) then return new; end if;
 v_role := case when new.raw_user_meta_data->>'account_type' = 'therapist' then 'therapist' else 'member' end;
 v_status := case when v_role='therapist' then 'pending' else 'none' end;
 v_name := left(btrim(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''), nullif(split_part(coalesce(new.email,''),'@',1),''), 'Người Yên')),40);
 insert into public.anyen_profiles(id,role,display_name,email,therapist_status) values (new.id,v_role,v_name,lower(new.email),v_status) on conflict (id) do nothing;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_is_admin()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 select exists (select 1 from auth.users u join public.anyen_admins a on a.email=lower(u.email)
  where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false));
$function$;

CREATE OR REPLACE FUNCTION public.anyen_is_private_member(room_uuid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
    SELECT EXISTS (SELECT 1 FROM public.anyen_private_members AS m WHERE m.room_id = room_uuid AND m.user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.anyen_is_root_admin()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
 select exists (select 1 from auth.users u join public.anyen_admins a on a.email=lower(u.email)
  where u.id=auth.uid() and a.is_root and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false));
$function$;

CREATE OR REPLACE FUNCTION public.anyen_join_private_room(invite_code text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_room_id UUID; v_code TEXT;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
    v_code := upper(trim(invite_code));
    IF length(v_code) <> 32 OR v_code !~ '^[0-9A-F]{32}$' THEN RETURN NULL; END IF;
    SELECT r.id INTO v_room_id FROM public.anyen_private_rooms AS r WHERE r.invite_hash = md5(v_code);
    IF v_room_id IS NULL THEN RETURN NULL; END IF;
    INSERT INTO public.anyen_private_members (room_id, user_id) VALUES (v_room_id, auth.uid()) ON CONFLICT DO NOTHING;
    RETURN v_room_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.anyen_kathina_trim()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  delete from public.anyen_kathina_robes where id not in (
    (select id from public.anyen_kathina_robes order by seq desc limit 9)
    union (select id from public.anyen_kathina_robes where id not in (select id from public.anyen_kathina_robes order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_list_lobby_offerings()
 RETURNS TABLE(id uuid, owner_id uuid, kind text, created_at timestamp with time zone) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
    SELECT o.id, o.owner_id, o.kind, o.created_at
    FROM (SELECT id, owner_id, kind, created_at FROM public.anyen_lobby_offerings
          WHERE created_at >= now() - interval '24 hours' ORDER BY created_at DESC LIMIT 40) AS o
    ORDER BY o.created_at ASC;
$function$;

CREATE OR REPLACE FUNCTION public.anyen_pottery_trim()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  delete from public.anyen_pottery where id not in (
    (select id from public.anyen_pottery order by seq desc limit 9)
    union (select id from public.anyen_pottery where id not in (select id from public.anyen_pottery order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_protect_root_admins()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $function$
begin
 if tg_op = 'DELETE' and old.is_root then raise exception 'Không thể gỡ admin gốc'; end if;
 if tg_op = 'UPDATE' and old.is_root and (not new.is_root or new.email <> old.email) then raise exception 'Không thể đổi admin gốc'; end if;
 return case when tg_op='DELETE' then old else new end;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_start_meditation_session(p_topic text, p_minutes integer, p_host_name text)
 RETURNS public.anyen_meditation_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v public.anyen_meditation_sessions;
begin
 if not public.anyen_can_access_meditation_room(p_topic) then raise exception 'Room access denied'; end if;
 if p_minutes not in (5,10,15) then raise exception 'Invalid duration'; end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_take(kind text, item uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if kind = 'robes' then update public.anyen_kathina_robes set picks = picks + 1 where id = item;
  elsif kind = 'flowers' then update public.anyen_flower_offerings set picks = picks + 1 where id = item;
  elsif kind = 'pots' then update public.anyen_pottery set picks = picks + 1 where id = item;
  elsif kind = 'aromas' then update public.anyen_aroma_gifts set picks = picks + 1 where id = item;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.anyen_update_my_profile(p_display_name text, p_bio text DEFAULT NULL::text, p_specialty text DEFAULT NULL::text, p_prefs jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v public.anyen_profiles; v_name text := left(btrim(coalesce(p_display_name,'')),40); v_th boolean;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Cần đăng nhập bằng email'; end if;
 if v_name = '' then raise exception 'Tên hiển thị không được trống'; end if;
 select * into v from public.anyen_profiles where id=v_uid for update;
 if v.id is null then raise exception 'Chưa có hồ sơ'; end if;
 v_th := v.role='therapist' or public.anyen_is_root_admin();
 update public.anyen_profiles set
  display_name = v_name,
  bio = case when v_th then left(nullif(btrim(coalesce(p_bio,'')),''),1200) else bio end,
  specialty = case when v_th then left(nullif(btrim(coalesce(p_specialty,'')),''),200) else specialty end,
  prefs = case when p_prefs is not null and jsonb_typeof(p_prefs)='object' then p_prefs else prefs end,
  updated_at = now()
 where id=v_uid;
 return public.anyen_get_my_profile();
end $function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$
DECLARE cmd record; tbl name;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO') AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- ===== Trigger
CREATE TRIGGER anyen_flower_trim AFTER INSERT ON public.anyen_flower_offerings FOR EACH STATEMENT EXECUTE FUNCTION public.anyen_flower_trim();
CREATE TRIGGER anyen_kathina_trim AFTER INSERT ON public.anyen_kathina_robes FOR EACH STATEMENT EXECUTE FUNCTION public.anyen_kathina_trim();
CREATE TRIGGER anyen_protect_root_admins_trg BEFORE DELETE OR UPDATE ON public.anyen_admins FOR EACH ROW EXECUTE FUNCTION public.anyen_protect_root_admins();
CREATE TRIGGER anyen_pottery_trim AFTER INSERT ON public.anyen_pottery FOR EACH STATEMENT EXECUTE FUNCTION public.anyen_pottery_trim();
CREATE TRIGGER anyen_bag_trim AFTER INSERT OR UPDATE OF owner ON public.anyen_bag_items FOR EACH ROW EXECUTE FUNCTION public.anyen_bag_trim();
CREATE TRIGGER anyen_aroma_trim AFTER INSERT ON public.anyen_aroma_gifts FOR EACH STATEMENT EXECUTE FUNCTION public.anyen_aroma_trim();
drop trigger if exists anyen_on_auth_user_created on auth.users;
CREATE TRIGGER anyen_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.anyen_handle_new_user();

-- ===== Policy
create policy "anyen aroma make" on public.anyen_aroma_gifts as permissive for insert to anon,authenticated with check ((picks = 0));
create policy "anyen aroma read" on public.anyen_aroma_gifts as permissive for select to anon,authenticated using (true);
create policy "anyen bag add own" on public.anyen_bag_items as permissive for insert to authenticated with check ((owner = auth.uid()));
create policy "anyen bag read own" on public.anyen_bag_items as permissive for select to authenticated using ((owner = auth.uid()));
create policy "anyen bag remove own" on public.anyen_bag_items as permissive for delete to authenticated using ((owner = auth.uid()));
create policy "anyen flowers offer" on public.anyen_flower_offerings as permissive for insert to anon,authenticated with check (true);
create policy "anyen flowers read" on public.anyen_flower_offerings as permissive for select to anon,authenticated using (true);
create policy "anyen kathina offer" on public.anyen_kathina_robes as permissive for insert to anon,authenticated with check (true);
create policy "anyen kathina read" on public.anyen_kathina_robes as permissive for select to anon,authenticated using (true);
create policy "anyen pottery make" on public.anyen_pottery as permissive for insert to anon,authenticated with check (true);
create policy "anyen pottery read" on public.anyen_pottery as permissive for select to anon,authenticated using (true);
drop policy if exists anyen_room_read on realtime.messages;
drop policy if exists anyen_room_write on realtime.messages;
create policy anyen_room_read on realtime.messages as permissive for select to authenticated using (((extension = ANY (ARRAY['presence'::text, 'broadcast'::text])) AND ((( SELECT realtime.topic() AS topic) = ANY (ARRAY['anyen:room:lobby'::text, 'anyen:room:sen'::text, 'anyen:room:truc'::text])) OR ((( SELECT realtime.topic() AS topic) ~ '^anyen:private:[0-9a-f-]{36}$'::text) AND public.anyen_is_private_member((SUBSTRING(( SELECT realtime.topic() AS topic) FROM 15))::uuid)))));
create policy anyen_room_write on realtime.messages as permissive for insert to authenticated with check (((extension = ANY (ARRAY['presence'::text, 'broadcast'::text])) AND ((( SELECT realtime.topic() AS topic) = ANY (ARRAY['anyen:room:lobby'::text, 'anyen:room:sen'::text, 'anyen:room:truc'::text])) OR ((( SELECT realtime.topic() AS topic) ~ '^anyen:private:[0-9a-f-]{36}$'::text) AND public.anyen_is_private_member((SUBSTRING(( SELECT realtime.topic() AS topic) FROM 15))::uuid)))));

-- ===== Quyền (khớp bản chính)
revoke all on all tables in schema public from anon, authenticated;
grant all on public.anyen_aroma_gifts, public.anyen_bag_items, public.anyen_flower_offerings, public.anyen_kathina_robes, public.anyen_pottery to anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.anyen_get_world_map(text), public.anyen_take(text,uuid) to anon, authenticated;
grant execute on function
  public.anyen_add_lobby_offering(text), public.anyen_admin_add_admin(text), public.anyen_admin_list_admins(), public.anyen_admin_list_log(integer),
  public.anyen_admin_list_profiles(text,text), public.anyen_admin_remove_admin(text), public.anyen_admin_set_member_status(uuid,text,text),
  public.anyen_admin_set_therapist_status(uuid,text,text), public.anyen_apply_therapist(), public.anyen_can_access_meditation_room(text),
  public.anyen_create_private_room(), public.anyen_create_private_room(text), public.anyen_end_meditation_session(uuid),
  public.anyen_get_meditation_session(text), public.anyen_get_my_profile(), public.anyen_gift_item(uuid,uuid,text), public.anyen_is_admin(),
  public.anyen_is_private_member(uuid), public.anyen_is_root_admin(), public.anyen_join_private_room(text), public.anyen_list_lobby_offerings(),
  public.anyen_start_meditation_session(text,integer,text), public.anyen_update_my_profile(text,text,text,jsonb)
  to authenticated;

-- Sự kiện tự bật RLS (cần quyền superuser trên Supabase; nếu lỗi thì bỏ qua):
do $$ begin
  if not exists (select 1 from pg_event_trigger where evtname='ensure_rls') then
    create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') execute function public.rls_auto_enable();
  end if;
exception when others then raise notice 'Bỏ qua ensure_rls: %', sqlerrm; end $$;

-- ===== Dữ liệu cấu hình (không có dữ liệu người dùng)
alter table public.anyen_admins disable trigger anyen_protect_root_admins_trg;
insert into public.anyen_admins(email,is_root) values ('cheetahmsu@gmail.com',true),('dangvo.sg@gmail.com',true) on conflict (email) do update set is_root=excluded.is_root;
alter table public.anyen_admins enable trigger anyen_protect_root_admins_trg;
insert into public.anyen_world_maps (id,name,kind,status,sky_color,fog_color,fog_density,ground_color,hemi_sky,hemi_ground,hemi_intensity,sun_color,sun_intensity,sun_position,ambience,spawn,bounds)
values ('pine_forest','Rừng thông · Làng Yên','forest','live','#173c35','#264b42',0.022,'#234c3e','#f6dfaf','#1b4234',2.1,'#f5c78c',2.4,'[-8,19,-8]','pine_forest','{"x":0,"z":25}','{"x":34,"z_max":35,"z_min":-40}');
insert into public.anyen_world_rooms (id,map_id,name,topic,capacity,kind,palette_color,interior,sort_order) values
 ('sanh_chung','pine_forest','Sảnh chung','anyen:room:lobby',null,'public','#092d27','{}',1),
 ('phong_sen','pine_forest','Phòng Sen · 10 người','anyen:room:sen',10,'public','#263d36','{}',2),
 ('phong_truc','pine_forest','Phòng Trúc · 20 người','anyen:room:truc',20,'public','#183e30','{}',3),
 ('phong_rieng','pine_forest','Phòng Riêng',null,null,'private','#342e3e','{}',4);
insert into public.anyen_world_nature (id,map_id,kind,params,sort_order) values
 ('pine_forest.pines','pine_forest','tree_grid','{"dx":4.4,"dz":18,"z0":-29,"cols":8,"count":32,"z_remap":{"25":32.5},"leaf_color":"#47745c","clear_rects":[[-11,-15,11,7],[-9,-99,9,-25]],"trunk_color":"#654c33"}',1);
insert into public.anyen_world_buildings (id,map_id,name,kind,x,z,exterior,entry,room_id) values
 ('tuong_dai','pine_forest','Thiền viện tượng đài','sanctuary',0,-31,'{"terrace_top":0.3,"terrace_radius":8.2}',null,null),
 ('cau_ho_niem','pine_forest','Cầu vòm Hồ Niệm','bridge',0,-4,'{"rise":2.6,"arch_z":[-15.6,7.6]}',null,null);
insert into public.anyen_world_props (id,map_id,kind,name,x,z,params,activity,sort_order) values
 ('ho_sac','pine_forest','wish_lake','Sắc',-23,18,'{"color":"#547d81","sense":"SẮC","theme":"thịnh vượng"}','ném xu nhận lời nhắn',1),
 ('ho_thanh','pine_forest','wish_lake','Thanh',23,18,'{"color":"#57758b","sense":"THANH","theme":"công việc"}','ném xu nhận lời nhắn',2),
 ('ho_huong','pine_forest','wish_lake','Hương',-25,2,'{"color":"#688b78","sense":"HƯƠNG","theme":"sức khỏe"}','ném xu nhận lời nhắn',3),
 ('ho_vi','pine_forest','wish_lake','Vị',25,2,'{"color":"#947a67","sense":"VỊ","theme":"tình duyên"}','ném xu nhận lời nhắn',4),
 ('ho_cham','pine_forest','wish_lake','Chạm',-23,-19,'{"color":"#8c7188","sense":"CHẠM","theme":"kết nối"}','ném xu nhận lời nhắn',5),
 ('ho_niem','pine_forest','wish_lake','Niệm',0,-4,'{"color":"#5a9b91","sense":"NIỆM","theme":"an yên"}','ném xu nhận lời nhắn',6);

notify pgrst, 'reload schema';


-- ================= GIAI ĐOẠN 1 =================
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
  ('xong_huong','rung_yen','house','Haromy · Ngôi nhà của mùi thơm Hạnh phúc','group',6,true,1),
  ('nha_hoa_lan','rung_yen','house','Nhà Hoa Lan','group',6,true,2),
  ('xuong_gom','rung_yen','house','Nhà Gốm Bàu Trúc','group',6,true,3),
  ('quan_tra','rung_yen','house','Nhà Vị','group',6,true,4),
  ('chuong_gio','rung_yen','house','Nhà Chuông Xoay','group',6,true,5),
  ('nha_van_hoa','rung_yen','culture','Nhà Văn Hóa','community',36,false,6),
  ('tu_gia','rung_yen','home','Tư Gia','group',6,false,7),
  ('mat_vinh','vinh_yen','sea','Mặt vịnh (đi tàu riêng)','solo',1,false,10),
  ('dao_ngoc_lan','vinh_yen','island','Đảo Ngọc Lan','group',6,true,11),
  ('dao_hang_vong','vinh_yen','island','Đảo Hang Vọng','group',6,true,12),
  ('dao_gio_thom','vinh_yen','island','Đảo Gió Thơm','group',6,true,13),
  ('dao_tinh_tra','vinh_yen','island','Đảo Tĩnh Trà','group',6,true,14),
  ('dao_da_lang','vinh_yen','island','Đảo Đá Lặng','group',6,true,15),
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
