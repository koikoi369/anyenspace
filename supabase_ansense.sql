-- LÀNG YÊN · AnSense 36 câu (4 bộ luân phiên): lưu tiến độ và lịch sử bộ câu hỏi theo tài khoản.
-- Dán vào SQL Editor của Supabase rồi bấm Run. Chạy lại nhiều lần cũng không sao.
-- Trang thử cheetahmsu.github.io dùng dự án thử (Langyen-chaythu); anyen.space dùng dự án chính: dán vào cả hai.
-- Chưa chạy SQL này thì AnSense vẫn chạy, tiến độ chỉ lưu trên máy.
create table if not exists public.anyen_ansense_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb check (jsonb_typeof(state)='object' and pg_column_size(state) <= 65536),
 updated_at timestamptz not null default now()
);
alter table public.anyen_ansense_progress enable row level security;
revoke all on table public.anyen_ansense_progress from anon, authenticated;

create or replace function public.anyen_ansense_get()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v jsonb;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then return null; end if;
 select state into v from public.anyen_ansense_progress where user_id=v_uid;
 return v;
end $$;

create or replace function public.anyen_ansense_save(p_state jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_now timestamptz := now();
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Cần đăng nhập bằng email'; end if;
 if p_state is null or jsonb_typeof(p_state) <> 'object' then raise exception 'Dữ liệu không hợp lệ'; end if;
 if pg_column_size(p_state) > 65536 then raise exception 'Dữ liệu quá lớn'; end if;
 insert into public.anyen_ansense_progress(user_id,state,updated_at) values (v_uid,p_state,v_now)
 on conflict (user_id) do update set state=excluded.state, updated_at=v_now;
 return v_now;
end $$;

revoke all on function public.anyen_ansense_get() from public, anon;
revoke all on function public.anyen_ansense_save(jsonb) from public, anon;
grant execute on function public.anyen_ansense_get() to authenticated;
grant execute on function public.anyen_ansense_save(jsonb) to authenticated;
