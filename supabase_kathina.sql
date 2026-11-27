-- LÀNG YÊN · Rừng Yên: tấm y dâng trong nghi thức Dâng y.
-- 5 phút đầu y nằm dưới chân tượng Phật (mọi khách đều thấy), sau đó vào kho y trong Tịnh thất. Kho bày 9 tấm gần nhất; sổ giữ 66 tấm, đầy thì xoá dần tấm cũ nhất.
create table if not exists public.anyen_kathina_robes (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  created_at timestamptz not null default now(),
  color text not null,
  dieu smallint not null,
  name text not null default 'Khách Yên',
  constraint anyen_kathina_color check (color in ('#c98a1c','#d4772a','#8a5a32','#8e3b26')),
  constraint anyen_kathina_dieu check (dieu in (5,7,9)),
  constraint anyen_kathina_name check (char_length(name) <= 24)
);
create index if not exists anyen_kathina_robes_seq on public.anyen_kathina_robes (seq desc);
alter table public.anyen_kathina_robes enable row level security;
drop policy if exists "anyen kathina read" on public.anyen_kathina_robes;
create policy "anyen kathina read" on public.anyen_kathina_robes for select to anon, authenticated using (true);
drop policy if exists "anyen kathina offer" on public.anyen_kathina_robes;
create policy "anyen kathina offer" on public.anyen_kathina_robes for insert to anon, authenticated with check (true);
grant select, insert on public.anyen_kathina_robes to anon, authenticated;
create or replace function public.anyen_kathina_trim() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_kathina_robes
  where seq < (select min(seq) from (select seq from public.anyen_kathina_robes order by seq desc limit 66) t);
  return null;
end $$;
drop trigger if exists anyen_kathina_trim on public.anyen_kathina_robes;
create trigger anyen_kathina_trim after insert on public.anyen_kathina_robes
  for each statement execute function public.anyen_kathina_trim();
revoke execute on function public.anyen_kathina_trim() from public, anon, authenticated;
-- Y nhiều màu: mỗi ký tự là màu của một mảnh (0–3 theo bảng màu), tối đa 27 mảnh (9 điều × 3).
alter table public.anyen_kathina_robes add column if not exists pieces text not null default '';
alter table public.anyen_kathina_robes drop constraint if exists anyen_kathina_pieces;
alter table public.anyen_kathina_robes add constraint anyen_kathina_pieces check (pieces ~ '^[0-3]{0,27}$');
-- Lời hồi hướng (không bắt buộc) gửi kèm tấm y, hiện trong sổ kho y.
alter table public.anyen_kathina_robes add column if not exists wish text not null default '';
alter table public.anyen_kathina_robes drop constraint if exists anyen_kathina_wish;
alter table public.anyen_kathina_robes add constraint anyen_kathina_wish check (char_length(wish) <= 80);
