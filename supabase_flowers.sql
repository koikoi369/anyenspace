-- LÀNG YÊN · Rừng Yên: hoa dâng trước tượng Phật.
-- Bệ có 9 chỗ: trang web hiện 9 bó mới nhất, chỗ đặt = (seq - 1) % 9 (bó mới thay bó cũ nhất ở cùng chỗ).
-- Hoa không tự mất theo thời gian. Sổ giữ 66 bó gần nhất, đầy thì xoá dần bó cũ nhất.
create table if not exists public.anyen_flower_offerings (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  created_at timestamptz not null default now(),
  flowers text[] not null,
  layout text not null default 'tron',
  name text not null default 'Khách Yên',
  constraint anyen_flower_count check (cardinality(flowers) between 1 and 9),
  constraint anyen_flower_kinds check (flowers <@ array['hong','cam_tu_cau','nhai','cuc','lan','sen']::text[]),
  constraint anyen_flower_layout check (layout in ('tron','thap','quat')),
  constraint anyen_flower_name check (char_length(name) <= 24)
);
create index if not exists anyen_flower_offerings_seq on public.anyen_flower_offerings (seq desc);

alter table public.anyen_flower_offerings enable row level security;
drop policy if exists "anyen flowers read" on public.anyen_flower_offerings;
create policy "anyen flowers read" on public.anyen_flower_offerings for select to anon, authenticated using (true);
drop policy if exists "anyen flowers offer" on public.anyen_flower_offerings;
create policy "anyen flowers offer" on public.anyen_flower_offerings for insert to anon, authenticated with check (true);
grant select, insert on public.anyen_flower_offerings to anon, authenticated;

-- Keep the table small: after each offering, drop everything older than the newest 200.
create or replace function public.anyen_flower_trim() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.anyen_flower_offerings
  where seq < (select min(seq) from (select seq from public.anyen_flower_offerings order by seq desc limit 66) t);
  return null;
end $$;
drop trigger if exists anyen_flower_trim on public.anyen_flower_offerings;
create trigger anyen_flower_trim after insert on public.anyen_flower_offerings
  for each statement execute function public.anyen_flower_trim();

-- Hàm dọn bảng chỉ chạy qua trigger, không gọi được từ ngoài.
revoke execute on function public.anyen_flower_trim() from public, anon, authenticated;
-- Góc xoay bó hoa người dâng chọn (độ, 0–359): bó hoa trên bệ quay đúng mặt này ra trước.
alter table public.anyen_flower_offerings add column if not exists yaw smallint not null default 0;
alter table public.anyen_flower_offerings drop constraint if exists anyen_flower_yaw;
alter table public.anyen_flower_offerings add constraint anyen_flower_yaw check (yaw between 0 and 359);
