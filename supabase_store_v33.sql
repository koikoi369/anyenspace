-- LÀNG YÊN · Quy tắc kho 69/9 theo Quy hoạch tổng thể v3.3 (áp dụng cho 4 kho: May Y, Hoa Dâng Phật, Bình Gốm, Lọ Hương & Túi Thơm).
-- Giữ 69 món: 9 món trưng bày = 6 món được chọn nhiều nhất + 3 món mới nhất (ngoài 6 món trên);
-- 60 món trong kho = 6 món mới nhất + 54 món được chọn nhiều nhất (ngoài các món đã giữ).
-- "Được chọn" = số lượt mang về túi (cột picks). Bằng nhau thì món mới hơn được giữ. Món nằm ngoài tỷ lệ này rời kho trước.
-- Chạy sau supabase_store.sql và supabase_aroma.sql (thay hàm trim cũ, trigger giữ nguyên).
create or replace function public.anyen_store_trim_tbl(t regclass) returns void language plpgsql security definer set search_path = public as $$
declare a uuid[]; b uuid[]; c uuid[]; d uuid[];
begin
  execute format('select coalesce(array_agg(id), ''{}'') from (select id from %s order by picks desc, seq desc limit 6) s', t) into a;
  execute format('select coalesce(array_agg(id), ''{}'') from (select id from %s where not (id = any($1)) order by seq desc limit 3) s', t) into b using a;
  execute format('select coalesce(array_agg(id), ''{}'') from (select id from %s where not (id = any($1)) order by seq desc limit 6) s', t) into c using a || b;
  execute format('select coalesce(array_agg(id), ''{}'') from (select id from %s where not (id = any($1)) order by picks desc, seq desc limit 54) s', t) into d using a || b || c;
  execute format('delete from %s where not (id = any($1))', t) using a || b || c || d;
end $$;
revoke execute on function public.anyen_store_trim_tbl(regclass) from public, anon, authenticated;

create or replace function public.anyen_kathina_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.anyen_store_trim_tbl('public.anyen_kathina_robes'); return null; end $$;
create or replace function public.anyen_flower_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.anyen_store_trim_tbl('public.anyen_flower_offerings'); return null; end $$;
create or replace function public.anyen_pottery_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.anyen_store_trim_tbl('public.anyen_pottery'); return null; end $$;
create or replace function public.anyen_aroma_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.anyen_store_trim_tbl('public.anyen_aroma_gifts'); return null; end $$;
revoke execute on function public.anyen_kathina_trim() from public, anon, authenticated;
revoke execute on function public.anyen_flower_trim() from public, anon, authenticated;
revoke execute on function public.anyen_pottery_trim() from public, anon, authenticated;
revoke execute on function public.anyen_aroma_trim() from public, anon, authenticated;
