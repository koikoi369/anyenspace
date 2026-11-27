-- LÀNG YÊN · Túi An Yên lưu trên cơ sở dữ liệu, theo tài khoản (ẩn danh hoặc đã đăng nhập).
-- Mỗi người giữ tối đa 36 vật phẩm; đầy thì món cũ nhất (theo lúc vào túi) tự rời túi. Mọi vật phẩm đều tặng được.
create table if not exists public.anyen_bag_items (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  kind text not null,
  item jsonb not null default '{}'::jsonb,
  source text not null default 'self',
  from_name text not null default '',
  added_at timestamptz not null default now(),
  constraint anyen_bag_kind check (kind in ('thinh','robe','flower','pot','aroma')),
  constraint anyen_bag_source check (source in ('self','own','store','gift')),
  constraint anyen_bag_item_size check (pg_column_size(item) < 4000),
  constraint anyen_bag_from check (char_length(from_name) <= 24)
);
create index if not exists anyen_bag_owner on public.anyen_bag_items (owner, added_at desc);
alter table public.anyen_bag_items enable row level security;
drop policy if exists "anyen bag read own" on public.anyen_bag_items;
create policy "anyen bag read own" on public.anyen_bag_items for select to authenticated using (owner = auth.uid());
drop policy if exists "anyen bag add own" on public.anyen_bag_items;
create policy "anyen bag add own" on public.anyen_bag_items for insert to authenticated with check (owner = auth.uid());
drop policy if exists "anyen bag remove own" on public.anyen_bag_items;
create policy "anyen bag remove own" on public.anyen_bag_items for delete to authenticated using (owner = auth.uid());
grant select, insert, delete on public.anyen_bag_items to authenticated;

create or replace function public.anyen_bag_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_bag_items where owner = new.owner and id not in
    (select id from public.anyen_bag_items where owner = new.owner order by added_at desc, id limit 36);
  return null;
end $$;
drop trigger if exists anyen_bag_trim on public.anyen_bag_items;
create trigger anyen_bag_trim after insert or update of owner on public.anyen_bag_items for each row execute function public.anyen_bag_trim();
revoke execute on function public.anyen_bag_trim() from public, anon, authenticated;

-- Tặng: chuyển một vật phẩm của mình sang túi người nhận (người nhận là tài khoản đang ở cùng phòng).
create or replace function public.anyen_gift_item(item uuid, to_user uuid, from_name text) returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if to_user is null or to_user = auth.uid() then return false; end if;
  update public.anyen_bag_items set owner = to_user, source = 'gift', from_name = left(coalesce(from_name,''), 24), added_at = now()
    where id = item and owner = auth.uid();
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke execute on function public.anyen_gift_item(uuid, uuid, text) from public, anon;
grant execute on function public.anyen_gift_item(uuid, uuid, text) to authenticated;
