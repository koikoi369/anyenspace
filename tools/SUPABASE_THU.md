# Supabase THỬ cho trang cheetahmsu.github.io

Mục đích: thử tính năng mới cần cơ sở dữ liệu (phân quyền, khung 30 phút, đặt lịch 2 chiều, khóa 1 hoạt động giữa nhiều thiết bị) mà không đụng dữ liệu thật của anyen.space.

- **Trang thử** `cheetahmsu.github.io/anyenspace-cheetah` → tự dùng Supabase THỬ (khi đã điền `ANYEN_TEST_CONFIG` trong `config.js`).
- **anyen.space** → luôn dùng Supabase CHÍNH.
- Muốn trang thử dùng tạm Supabase chính: thêm `?supabase=main` vào địa chỉ.

## 1. Tạo dự án Supabase thử (làm 1 lần)

1. Vào https://supabase.com/dashboard → **New project**.
2. Tên: `langyen-thu`, Region: **Southeast Asia (Singapore)**, đặt mật khẩu cơ sở dữ liệu (ghi lại).
3. Chờ dự án tạo xong (1–2 phút).
4. **Authentication › Sign In / Providers**: bật **Allow anonymous sign-ins** và **Email** (giống dự án chính).
5. **Authentication › URL Configuration**: Site URL = `https://cheetahmsu.github.io/anyenspace-cheetah/`.

## 2. Lấy thông tin kết nối

- **Project Settings › API Keys**: chép **Project URL** và **Publishable key** của dự án THỬ.
- **Connect** (nút trên cùng) › **Session pooler**: chép chuỗi kết nối của cả dự án CHÍNH và dự án THỬ, thay `[YOUR-PASSWORD]` bằng mật khẩu cơ sở dữ liệu của từng dự án.

## 3. Điền vào repo (làm 1 lần)

- `config.js`: điền Project URL và Publishable key của dự án THỬ vào `ANYEN_TEST_CONFIG`. Hai giá trị này công khai được (giống key đang có của dự án chính).
- GitHub repo `cheetahmsu/anyenspace-cheetah` › **Settings › Secrets and variables › Actions › New repository secret**:
  - `PROD_DB_URL` = chuỗi kết nối Session pooler của dự án CHÍNH
  - `TEST_DB_URL` = chuỗi kết nối Session pooler của dự án THỬ
  - Đây là mật khẩu: **chỉ** để trong Secrets, không gửi qua chat, không ghi vào file.

## 4. Đồng bộ tự động mỗi lần chạy thử

Workflow `.github/workflows/supabase-test-sync.yml` tự chạy mỗi khi có thay đổi được đẩy lên nhánh `main`:

1. Chép **cấu trúc** schema `public` của Supabase CHÍNH (bảng, hàm, RLS, quyền) sang Supabase THỬ.
2. Chép danh sách Admin / Admin Gốc.
3. Chạy các file SQL mới chưa đưa lên chính (hiện tại: `supabase_phase1.sql`, `supabase_phase1b.sql`, `supabase_phase1c.sql`).

Không chép dữ liệu và tài khoản thật. Người thử tự đăng ký tài khoản trên trang thử. Muốn chạy tay: tab **Actions › Đồng bộ Supabase thử › Run workflow**.

Chạy trên máy (cần `pg_dump`, `psql` bản 17):
```
PROD_DB_URL='...' TEST_DB_URL='...' bash tools/supabase-test-sync.sh
```

## 5. Khi đưa lên anyen.space

1. Merge code vào `koikoi369/anyenspace`.
2. Chạy `supabase_phase1.sql` trên Supabase CHÍNH (SQL Editor › dán nội dung › Run). File chạy lại nhiều lần vẫn an toàn.
3. Bỏ `supabase_phase1.sql` khỏi danh sách mặc định trong `tools/supabase-test-sync.sh` (vì Supabase chính đã có).

## Trạng thái (22/11/2026)
- Dự án thử **Langyen-chaythu** (`cxytckciflwcmyrvgqyc`) đã dựng xong: 24 bảng, 47 hàm, 19 policy, 7 trigger, 2 admin gốc, cấu hình Rừng Yên, Giai đoạn 1.
- `config.js` đã điền URL + publishable key thử → trang `cheetahmsu.github.io` tự dùng bản thử; `anyen.space` vẫn dùng bản chính.
- Mỗi lần chạy thử: Claude đọc lại lược đồ bản chính (chỉ đọc) và cập nhật bản thử qua MCP. Ảnh chụp: `tools/prod_schema_snapshot.sql`.
