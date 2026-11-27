-- LÀNG YÊN · Kho vật phẩm (y, hoa dâng, gốm): bày 9 món, kho giữ 69 món.
-- 9 món mới nhất luôn được giữ; 60 chỗ còn lại dành cho món có nhiều lượt "mang về túi" nhất (bằng nhau thì món mới hơn).
-- Món ít được chọn nhất (bằng nhau thì cũ nhất) rời kho trước.
alter table public.anyen_kathina_robes add column if not exists picks integer not null default 0;
alter table public.anyen_flower_offerings add column if not exists picks integer not null default 0;
alter table public.anyen_pottery add column if not exists picks integer not null default 0;

create or replace function public.anyen_kathina_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_kathina_robes where id not in (
    (select id from public.anyen_kathina_robes order by seq desc limit 9)
    union (select id from public.anyen_kathina_robes where id not in (select id from public.anyen_kathina_robes order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $$;
create or replace function public.anyen_flower_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_flower_offerings where id not in (
    (select id from public.anyen_flower_offerings order by seq desc limit 9)
    union (select id from public.anyen_flower_offerings where id not in (select id from public.anyen_flower_offerings order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $$;
create or replace function public.anyen_pottery_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_pottery where id not in (
    (select id from public.anyen_pottery order by seq desc limit 9)
    union (select id from public.anyen_pottery where id not in (select id from public.anyen_pottery order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $$;
revoke execute on function public.anyen_kathina_trim() from public, anon, authenticated;
revoke execute on function public.anyen_flower_trim() from public, anon, authenticated;
revoke execute on function public.anyen_pottery_trim() from public, anon, authenticated;

-- Đếm một lượt "mang về túi". Khách không sửa được bảng trực tiếp; chỉ hàm này tăng picks lên 1.
create or replace function public.anyen_take(kind text, item uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if kind = 'robes' then update public.anyen_kathina_robes set picks = picks + 1 where id = item;
  elsif kind = 'flowers' then update public.anyen_flower_offerings set picks = picks + 1 where id = item;
  elsif kind = 'pots' then update public.anyen_pottery set picks = picks + 1 where id = item;
  end if;
end $$;
revoke execute on function public.anyen_take(text, uuid) from public;
grant execute on function public.anyen_take(text, uuid) to anon, authenticated;
