-- LÀNG YÊN · Rừng Yên: gốm nặn trong Nhà gốm (gốm Chăm Bàu Trúc: nặn tay, nung lộ thiên).
-- Phút đầu gốm nằm trong lửa ở bãi nung (mọi khách thấy lửa khói), sau đó lên kệ cạnh bãi nung. Kệ 6 × 6 bày 36 chiếc gần nhất; sổ giữ 66 chiếc, đầy thì xoá dần chiếc cũ nhất.
create table if not exists public.anyen_pottery (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  created_at timestamptz not null default now(),
  shape smallint not null,
  pattern smallint not null,
  seed integer not null,
  name text not null default 'Khách Yên',
  constraint anyen_pottery_shape check (shape between 0 and 3),
  constraint anyen_pottery_pattern check (pattern between 0 and 2),
  constraint anyen_pottery_seed check (seed between 0 and 9999),
  constraint anyen_pottery_name check (char_length(name) <= 24)
);
create index if not exists anyen_pottery_seq on public.anyen_pottery (seq desc);
alter table public.anyen_pottery enable row level security;
drop policy if exists "anyen pottery read" on public.anyen_pottery;
create policy "anyen pottery read" on public.anyen_pottery for select to anon, authenticated using (true);
drop policy if exists "anyen pottery make" on public.anyen_pottery;
create policy "anyen pottery make" on public.anyen_pottery for insert to anon, authenticated with check (true);
grant select, insert on public.anyen_pottery to anon, authenticated;
create or replace function public.anyen_pottery_trim() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_pottery
  where seq < (select min(seq) from (select seq from public.anyen_pottery order by seq desc limit 66) t);
  return null;
end $$;
drop trigger if exists anyen_pottery_trim on public.anyen_pottery;
create trigger anyen_pottery_trim after insert on public.anyen_pottery
  for each statement execute function public.anyen_pottery_trim();
revoke execute on function public.anyen_pottery_trim() from public, anon, authenticated;
