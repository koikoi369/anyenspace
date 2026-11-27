-- Ảnh chụp lược đồ public của Supabase chính (anyen-space) — 22/11/2026.
-- Chỉ dùng để dựng Supabase THỬ (Langyen-chaythu). Không chạy lên Supabase chính.
-- Không chứa dữ liệu người dùng; chỉ có admin gốc + cấu hình thế giới (world_*).
set check_function_bodies = off;

-- ===== Bảng
create table public.anyen_admin_log (id bigint generated always as identity not null, actor_id uuid not null, actor_email text, action text not null, target text, detail jsonb default '{}'::jsonb not null, at timestamp with time zone default now() not null);
create table public.anyen_admins (email text not null, is_root boolean default false not null, added_by uuid, created_at timestamp with time zone default now() not null);
create table public.anyen_aroma_gifts (id uuid default gen_random_uuid() not null, seq bigint generated always as identity not null, created_at timestamp with time zone default now() not null, form text not null, method text default 'drip'::text not null, aromas text[] not null, drops smallint[] not null, title text not null, wish text default ''::text not null, name text default 'Khách Yên'::text not null, picks integer default 0 not null);
create table public.anyen_bag_items (id uuid default gen_random_uuid() not null, owner uuid default auth.uid() not null, kind text not null, item jsonb default '{}'::jsonb not null, source text default 'self'::text not null, from_name text default ''::text not null, added_at timestamp with time zone default now() not null);
create table public.anyen_flower_offerings (id uuid default gen_random_uuid() not null, seq bigint generated always as identity not null, created_at timestamp with time zone default now() not null, flowers text[] not null, layout text default 'tron'::text not null, name text default 'Khách Yên'::text not null, yaw smallint default 0 not null, picks integer default 0 not null);
create table public.anyen_kathina_robes (id uuid default gen_random_uuid() not null, seq bigint generated always as identity not null, created_at timestamp with time zone default now() not null, color text not null, dieu smallint not null, name text default 'Khách Yên'::text not null, pieces text default ''::text not null, wish text default ''::text not null, picks integer default 0 not null);
create table public.anyen_lobby_offerings (id uuid default gen_random_uuid() not null, owner_id uuid not null, kind text not null, created_at timestamp with time zone default now() not null);
create table public.anyen_meditation_sessions (id uuid default gen_random_uuid() not null, room_topic text not null, host_id uuid not null, host_name text not null, minutes integer not null, starts_at timestamp with time zone default now() not null, ends_at timestamp with time zone not null, status text default 'active'::text not null, created_at timestamp with time zone default now() not null, ended_at timestamp with time zone);
create table public.anyen_pottery (id uuid default gen_random_uuid() not null, seq bigint generated always as identity not null, created_at timestamp with time zone default now() not null, shape smallint not null, pattern smallint not null, seed integer not null, name text default 'Khách Yên'::text not null, picks integer default 0 not null);
create table public.anyen_private_members (room_id uuid not null, user_id uuid not null, joined_at timestamp with time zone default now() not null);
create table public.anyen_private_rooms (id uuid default gen_random_uuid() not null, invite_hash text not null, owner_id uuid not null, created_at timestamp with time zone default now() not null, room_name text default 'Phòng Yên Riêng'::text not null);
create table public.anyen_profiles (id uuid not null, role text not null, display_name text not null, bio text, specialty text, prefs jsonb default '{}'::jsonb not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, email text, therapist_status text default 'none'::text not null, member_status text default 'active'::text not null, status_reason text, reviewed_by uuid, reviewed_at timestamp with time zone);
create table public.anyen_world_buildings (id text not null, map_id text not null, name text not null, kind text not null, x numeric not null, z numeric not null, exterior jsonb default '{}'::jsonb not null, entry jsonb, room_id text);
create table public.anyen_world_maps (id text not null, name text not null, kind text not null, status text default 'draft'::text not null, sky_color text not null, fog_color text not null, fog_density numeric not null, ground_color text not null, hemi_sky text not null, hemi_ground text not null, hemi_intensity numeric not null, sun_color text not null, sun_intensity numeric not null, sun_position jsonb not null, ambience text, spawn jsonb not null, bounds jsonb not null, updated_at timestamp with time zone default now() not null);
create table public.anyen_world_nature (id text not null, map_id text not null, kind text not null, params jsonb default '{}'::jsonb not null, sort_order integer default 0 not null);
create table public.anyen_world_npcs (id text not null, map_id text not null, name text not null, role text not null, x numeric not null, z numeric not null, facing numeric default 0 not null, greet_radius numeric default 4 not null, greeting text, dialogue jsonb default '[]'::jsonb not null, ai_enabled boolean default false not null, ai_config jsonb, active boolean default false not null);
create table public.anyen_world_props (id text not null, map_id text not null, kind text not null, name text not null, x numeric not null, z numeric not null, params jsonb default '{}'::jsonb not null, activity text, sort_order integer default 0 not null);
create table public.anyen_world_rooms (id text not null, map_id text not null, name text not null, topic text, capacity integer, kind text default 'public'::text not null, palette_color text not null, interior jsonb default '{}'::jsonb not null, sort_order integer default 0 not null);

-- ===== Ràng buộc
alter table public.anyen_admin_log add constraint anyen_admin_log_pkey PRIMARY KEY (id);
alter table public.anyen_admins add constraint anyen_admins_pkey PRIMARY KEY (email);
alter table public.anyen_aroma_gifts add constraint anyen_aroma_gifts_pkey PRIMARY KEY (id);
alter table public.anyen_bag_items add constraint anyen_bag_items_pkey PRIMARY KEY (id);
alter table public.anyen_flower_offerings add constraint anyen_flower_offerings_pkey PRIMARY KEY (id);
alter table public.anyen_kathina_robes add constraint anyen_kathina_robes_pkey PRIMARY KEY (id);
alter table public.anyen_lobby_offerings add constraint anyen_lobby_offerings_pkey PRIMARY KEY (id);
alter table public.anyen_meditation_sessions add constraint anyen_meditation_sessions_pkey PRIMARY KEY (id);
alter table public.anyen_pottery add constraint anyen_pottery_pkey PRIMARY KEY (id);
alter table public.anyen_private_members add constraint anyen_private_members_pkey PRIMARY KEY (room_id, user_id);
alter table public.anyen_private_rooms add constraint anyen_private_rooms_pkey PRIMARY KEY (id);
alter table public.anyen_profiles add constraint anyen_profiles_pkey PRIMARY KEY (id);
alter table public.anyen_world_buildings add constraint anyen_world_buildings_pkey PRIMARY KEY (id);
alter table public.anyen_world_maps add constraint anyen_world_maps_pkey PRIMARY KEY (id);
alter table public.anyen_world_nature add constraint anyen_world_nature_pkey PRIMARY KEY (id);
alter table public.anyen_world_npcs add constraint anyen_world_npcs_pkey PRIMARY KEY (id);
alter table public.anyen_world_props add constraint anyen_world_props_pkey PRIMARY KEY (id);
alter table public.anyen_world_rooms add constraint anyen_world_rooms_pkey PRIMARY KEY (id);
alter table public.anyen_private_rooms add constraint anyen_private_rooms_invite_hash_key UNIQUE (invite_hash);
alter table public.anyen_admins add constraint anyen_admins_email_check CHECK (((email = lower(email)) AND (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)));
alter table public.anyen_aroma_gifts add constraint anyen_aroma_count CHECK ((((cardinality(aromas) >= 1) AND (cardinality(aromas) <= 3)) AND (cardinality(drops) = cardinality(aromas))));
alter table public.anyen_aroma_gifts add constraint anyen_aroma_form CHECK ((form = ANY (ARRAY['lo'::text, 'tui'::text])));
alter table public.anyen_aroma_gifts add constraint anyen_aroma_kinds CHECK ((aromas <@ ARRAY['sa_chanh'::text, 'bac_ha'::text, 'vo_buoi'::text, 'cam_ngot'::text, 'chanh_xanh'::text, 'bach_dan'::text, 'oai_huong'::text, 'hoa_sen'::text, 'hoa_nhai'::text, 'hoa_hong'::text, 'huong_thao'::text, 'ngai_cuu'::text, 'tram_huong'::text, 'go_thong'::text, 'dan_huong'::text, 'que'::text, 'hoa_hoi'::text, 'gung_kho'::text]));
alter table public.anyen_aroma_gifts add constraint anyen_aroma_method CHECK ((method = ANY (ARRAY['drip'::text, 'burn'::text])));
alter table public.anyen_aroma_gifts add constraint anyen_aroma_text CHECK ((((char_length(title) >= 1) AND (char_length(title) <= 40)) AND (char_length(wish) <= 80) AND (char_length(name) <= 24)));
alter table public.anyen_bag_items add constraint anyen_bag_from CHECK ((char_length(from_name) <= 24));
alter table public.anyen_bag_items add constraint anyen_bag_item_size CHECK ((pg_column_size(item) < 4000));
alter table public.anyen_bag_items add constraint anyen_bag_kind CHECK ((kind = ANY (ARRAY['thinh'::text, 'robe'::text, 'flower'::text, 'pot'::text, 'aroma'::text])));
alter table public.anyen_bag_items add constraint anyen_bag_source CHECK ((source = ANY (ARRAY['self'::text, 'own'::text, 'store'::text, 'gift'::text])));
alter table public.anyen_flower_offerings add constraint anyen_flower_count CHECK (((cardinality(flowers) >= 1) AND (cardinality(flowers) <= 9)));
alter table public.anyen_flower_offerings add constraint anyen_flower_kinds CHECK ((flowers <@ ARRAY['hong'::text, 'cam_tu_cau'::text, 'nhai'::text, 'cuc'::text, 'lan'::text, 'sen'::text]));
alter table public.anyen_flower_offerings add constraint anyen_flower_layout CHECK ((layout = ANY (ARRAY['tron'::text, 'thap'::text, 'quat'::text])));
alter table public.anyen_flower_offerings add constraint anyen_flower_name CHECK ((char_length(name) <= 24));
alter table public.anyen_flower_offerings add constraint anyen_flower_yaw CHECK (((yaw >= 0) AND (yaw <= 359)));
alter table public.anyen_kathina_robes add constraint anyen_kathina_color CHECK ((color = ANY (ARRAY['#c98a1c'::text, '#d4772a'::text, '#8a5a32'::text, '#8e3b26'::text])));
alter table public.anyen_kathina_robes add constraint anyen_kathina_dieu CHECK ((dieu = ANY (ARRAY[5, 7, 9])));
alter table public.anyen_kathina_robes add constraint anyen_kathina_name CHECK ((char_length(name) <= 24));
alter table public.anyen_kathina_robes add constraint anyen_kathina_pieces CHECK ((pieces ~ '^[0-3]{0,27}$'::text));
alter table public.anyen_kathina_robes add constraint anyen_kathina_wish CHECK ((char_length(wish) <= 80));
alter table public.anyen_lobby_offerings add constraint anyen_lobby_offerings_kind_check CHECK ((kind = ANY (ARRAY['incense'::text, 'flower'::text, 'candle'::text])));
alter table public.anyen_meditation_sessions add constraint anyen_meditation_sessions_minutes_check CHECK ((minutes = ANY (ARRAY[5, 10, 15])));
alter table public.anyen_meditation_sessions add constraint anyen_meditation_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'ended'::text])));
alter table public.anyen_pottery add constraint anyen_pottery_name CHECK ((char_length(name) <= 24));
alter table public.anyen_pottery add constraint anyen_pottery_pattern CHECK (((pattern >= 0) AND (pattern <= 2)));
alter table public.anyen_pottery add constraint anyen_pottery_seed CHECK (((seed >= 0) AND (seed <= 9999)));
alter table public.anyen_pottery add constraint anyen_pottery_shape CHECK (((shape >= 0) AND (shape <= 3)));
alter table public.anyen_profiles add constraint anyen_profiles_bio_check CHECK (((bio IS NULL) OR (char_length(bio) <= 1200)));
alter table public.anyen_profiles add constraint anyen_profiles_display_name_check CHECK (((char_length(display_name) >= 1) AND (char_length(display_name) <= 40)));
alter table public.anyen_profiles add constraint anyen_profiles_member_status_check CHECK ((member_status = ANY (ARRAY['active'::text, 'restricted'::text])));
alter table public.anyen_profiles add constraint anyen_profiles_prefs_check CHECK ((pg_column_size(prefs) <= 8192));
alter table public.anyen_profiles add constraint anyen_profiles_role_check CHECK ((role = ANY (ARRAY['member'::text, 'therapist'::text])));
alter table public.anyen_profiles add constraint anyen_profiles_specialty_check CHECK (((specialty IS NULL) OR (char_length(specialty) <= 200)));
alter table public.anyen_profiles add constraint anyen_profiles_status_reason_check CHECK (((status_reason IS NULL) OR (char_length(status_reason) <= 500)));
alter table public.anyen_profiles add constraint anyen_profiles_therapist_status_check CHECK ((therapist_status = ANY (ARRAY['none'::text, 'pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])));
alter table public.anyen_world_maps add constraint anyen_world_maps_fog_density_check CHECK ((fog_density >= (0)::numeric));
alter table public.anyen_world_maps add constraint anyen_world_maps_kind_check CHECK ((kind = ANY (ARRAY['forest'::text, 'bay'::text])));
alter table public.anyen_world_maps add constraint anyen_world_maps_status_check CHECK ((status = ANY (ARRAY['live'::text, 'draft'::text])));
alter table public.anyen_world_rooms add constraint anyen_world_rooms_kind_check CHECK ((kind = ANY (ARRAY['public'::text, 'private'::text])));
alter table public.anyen_lobby_offerings add constraint anyen_lobby_offerings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.anyen_meditation_sessions add constraint anyen_meditation_sessions_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.anyen_private_members add constraint anyen_private_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.anyen_private_rooms(id) ON DELETE CASCADE;
alter table public.anyen_private_members add constraint anyen_private_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.anyen_private_rooms add constraint anyen_private_rooms_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.anyen_profiles add constraint anyen_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.anyen_world_buildings add constraint anyen_world_buildings_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.anyen_world_maps(id) ON DELETE CASCADE;
alter table public.anyen_world_buildings add constraint anyen_world_buildings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.anyen_world_rooms(id) ON DELETE SET NULL;
alter table public.anyen_world_nature add constraint anyen_world_nature_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.anyen_world_maps(id) ON DELETE CASCADE;
alter table public.anyen_world_npcs add constraint anyen_world_npcs_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.anyen_world_maps(id) ON DELETE CASCADE;
alter table public.anyen_world_props add constraint anyen_world_props_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.anyen_world_maps(id) ON DELETE CASCADE;
alter table public.anyen_world_rooms add constraint anyen_world_rooms_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.anyen_world_maps(id) ON DELETE CASCADE;

-- ===== Chỉ mục
CREATE INDEX anyen_bag_owner ON public.anyen_bag_items USING btree (owner, added_at DESC);
CREATE INDEX anyen_world_rooms_map_idx ON public.anyen_world_rooms USING btree (map_id);
CREATE INDEX anyen_meditation_sessions_room_idx ON public.anyen_meditation_sessions USING btree (room_topic, ends_at DESC);
CREATE INDEX anyen_aroma_seq ON public.anyen_aroma_gifts USING btree (seq DESC);
CREATE INDEX anyen_world_props_map_idx ON public.anyen_world_props USING btree (map_id);
CREATE INDEX anyen_world_buildings_map_idx ON public.anyen_world_buildings USING btree (map_id);
CREATE UNIQUE INDEX anyen_one_active_session_per_room ON public.anyen_meditation_sessions USING btree (room_topic) WHERE (status = 'active'::text);
CREATE INDEX anyen_kathina_robes_seq ON public.anyen_kathina_robes USING btree (seq DESC);
CREATE INDEX anyen_pottery_seq ON public.anyen_pottery USING btree (seq DESC);
CREATE INDEX anyen_world_buildings_room_idx ON public.anyen_world_buildings USING btree (room_id);
CREATE INDEX anyen_flower_offerings_seq ON public.anyen_flower_offerings USING btree (seq DESC);
CREATE INDEX anyen_world_nature_map_idx ON public.anyen_world_nature USING btree (map_id);
CREATE INDEX anyen_world_npcs_map_idx ON public.anyen_world_npcs USING btree (map_id);
CREATE INDEX anyen_lobby_offerings_created_idx ON public.anyen_lobby_offerings USING btree (created_at DESC);

-- ===== RLS
alter table public.anyen_meditation_sessions enable row level security;
alter table public.anyen_world_maps enable row level security;
alter table public.anyen_world_nature enable row level security;
alter table public.anyen_world_rooms enable row level security;
alter table public.anyen_world_buildings enable row level security;
alter table public.anyen_world_props enable row level security;
alter table public.anyen_world_npcs enable row level security;
alter table public.anyen_kathina_robes enable row level security;
alter table public.anyen_bag_items enable row level security;
alter table public.anyen_admin_log enable row level security;
alter table public.anyen_admins enable row level security;
alter table public.anyen_aroma_gifts enable row level security;
alter table public.anyen_lobby_offerings enable row level security;
alter table public.anyen_private_rooms enable row level security;
alter table public.anyen_private_members enable row level security;
alter table public.anyen_profiles enable row level security;
alter table public.anyen_pottery enable row level security;
alter table public.anyen_flower_offerings enable row level security;

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
