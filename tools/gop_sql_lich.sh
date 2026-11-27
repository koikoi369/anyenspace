#!/bin/sh
# Gộp các file SQL lịch hẹn thành supabase_lich_chinh.sql (để dán một lần vào SQL Editor của Supabase chính).
cd "$(dirname "$0")/.." || exit 1
{ printf -- "-- LÀNG YÊN · Lịch hẹn cho Supabase CHÍNH (anyen-space) — gộp sẵn theo đúng thứ tự: phase1, phase1b, phase1c, phase1d, phase1e, phase1f.\n-- Dán toàn bộ vào SQL Editor của Supabase chính rồi bấm Run. Chạy lại nhiều lần vẫn an toàn.\n-- Sửa lịch thì sửa các file gốc rồi gộp lại: tools/gop_sql_lich.sh\n\n"
  for f in supabase_phase1.sql supabase_phase1b.sql supabase_phase1c.sql supabase_phase1d.sql supabase_phase1e.sql supabase_phase1f.sql; do
    printf -- "\n-- ================================ %s ================================\n" "$f"; cat "$f"; done; } > supabase_lich_chinh.sql
