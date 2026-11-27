#!/usr/bin/env bash
# Đồng bộ Supabase THỬ theo Supabase CHÍNH rồi chạy các file SQL chưa đưa lên chính.
#   1. Sao chép cấu trúc schema public của Supabase chính (bảng, hàm, chính sách RLS, quyền) sang Supabase thử.
#      Dữ liệu và tài khoản KHÔNG sao chép (dữ liệu thật ở lại Supabase chính; người thử tự đăng ký trên trang thử).
#   2. Chạy các file SQL mới (mặc định: supabase_phase1.sql, supabase_phase1b.sql, supabase_phase1c.sql) lên Supabase thử.
# Cần: PROD_DB_URL, TEST_DB_URL (chuỗi kết nối Postgres, lấy ở Supabase › Project Settings › Database › Connection string · Session pooler)
# Dùng: PROD_DB_URL=... TEST_DB_URL=... bash tools/supabase-test-sync.sh [file.sql ...]
set -euo pipefail
: "${PROD_DB_URL:?Thiếu PROD_DB_URL}"; : "${TEST_DB_URL:?Thiếu TEST_DB_URL}"
cd "$(dirname "$0")/.."
FILES=("$@"); [ ${#FILES[@]} -eq 0 ] && FILES=(supabase_phase1.sql supabase_phase1b.sql supabase_phase1c.sql)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
echo "› Lấy cấu trúc schema public từ Supabase chính…"
pg_dump "$PROD_DB_URL" --schema-only --schema=public --no-owner --no-comments > "$tmp/schema.sql"
echo "› Làm mới schema public trên Supabase thử…"
psql "$TEST_DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
SQL
# dòng "CREATE SCHEMA public" trong bản dump trùng với schema vừa tạo
sed -i.bak '/^CREATE SCHEMA public;/d' "$tmp/schema.sql"
psql "$TEST_DB_URL" -v ON_ERROR_STOP=1 -q -f "$tmp/schema.sql"
echo "› Chép danh sách Admin / Admin Gốc (chỉ email)…"
pg_dump "$PROD_DB_URL" --data-only --table=public.anyen_admins --no-owner > "$tmp/admins.sql" 2>/dev/null && psql "$TEST_DB_URL" -q -f "$tmp/admins.sql" >/dev/null 2>&1 || true
for f in "${FILES[@]}"; do echo "› Chạy $f trên Supabase thử…"; psql "$TEST_DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"; done
psql "$TEST_DB_URL" -q -c "notify pgrst, 'reload schema';"
echo "✓ Supabase thử đã giống Supabase chính + ${FILES[*]}"
