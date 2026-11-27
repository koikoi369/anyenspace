-- LÀNG YÊN · Haromy (Ngôi nhà của mùi thơm Hạnh phúc): Lọ Ước tinh dầu và Túi thảo mộc khô khách làm.
-- Kệ Lưu Hương bày 9 món mới nhất; kho giữ 69 món (9 mới nhất + 60 món được mang về túi nhiều nhất).
create table if not exists public.anyen_aroma_gifts (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  created_at timestamptz not null default now(),
  form text not null,
  method text not null default 'drip',
  aromas text[] not null,
  drops smallint[] not null,
  title text not null,
  wish text not null default '',
  name text not null default 'Khách Yên',
  picks integer not null default 0,
  constraint anyen_aroma_form check (form in ('lo','tui')),
  constraint anyen_aroma_method check (method in ('drip','burn')),
  constraint anyen_aroma_count check (cardinality(aromas) between 1 and 3 and cardinality(drops) = cardinality(aromas)),
  constraint anyen_aroma_kinds check (aromas <@ array['sa_chanh','bac_ha','vo_buoi','cam_ngot','chanh_xanh','bach_dan','oai_huong','hoa_sen','hoa_nhai','hoa_hong','huong_thao','ngai_cuu','tram_huong','go_thong','dan_huong','que','hoa_hoi','gung_kho']::text[]),
  constraint anyen_aroma_text check (char_length(title) between 1 and 40 and char_length(wish) <= 80 and char_length(name) <= 24)
);
create index if not exists anyen_aroma_seq on public.anyen_aroma_gifts (seq desc);
alter table public.anyen_aroma_gifts enable row level security;
drop policy if exists "anyen aroma read" on public.anyen_aroma_gifts;
create policy "anyen aroma read" on public.anyen_aroma_gifts for select to anon, authenticated using (true);
drop policy if exists "anyen aroma make" on public.anyen_aroma_gifts;
create policy "anyen aroma make" on public.anyen_aroma_gifts for insert to anon, authenticated with check (picks = 0);
grant select, insert on public.anyen_aroma_gifts to anon, authenticated;
create or replace function public.anyen_aroma_trim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_aroma_gifts where id not in (
    (select id from public.anyen_aroma_gifts order by seq desc limit 9)
    union (select id from public.anyen_aroma_gifts where id not in (select id from public.anyen_aroma_gifts order by seq desc limit 9) order by picks desc, seq desc limit 60));
  return null;
end $$;
drop trigger if exists anyen_aroma_trim on public.anyen_aroma_gifts;
create trigger anyen_aroma_trim after insert on public.anyen_aroma_gifts for each statement execute function public.anyen_aroma_trim();
revoke execute on function public.anyen_aroma_trim() from public, anon, authenticated;
create or replace function public.anyen_take(kind text, item uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if kind = 'robes' then update public.anyen_kathina_robes set picks = picks + 1 where id = item;
  elsif kind = 'flowers' then update public.anyen_flower_offerings set picks = picks + 1 where id = item;
  elsif kind = 'pots' then update public.anyen_pottery set picks = picks + 1 where id = item;
  elsif kind = 'aromas' then update public.anyen_aroma_gifts set picks = picks + 1 where id = item;
  end if;
end $$;
revoke execute on function public.anyen_take(text, uuid) from public;
grant execute on function public.anyen_take(text, uuid) to anon, authenticated;
-- Túi An Yên nhận thêm loại vật phẩm 'aroma'.
alter table public.anyen_bag_items drop constraint if exists anyen_bag_kind;
alter table public.anyen_bag_items add constraint anyen_bag_kind check (kind in ('thinh','robe','flower','pot','aroma'));
