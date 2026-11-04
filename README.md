# LÀNG YÊN · GitHub + Netlify + Supabase Realtime

## 1. Những gì đã thay đổi
- Khôi phục biểu tượng nến kiểu trước (🕯) trong nghi thức Thắp nến.
- Người dùng có thể kết nối thực qua Supabase: nickname, màu trang phục, danh sách người cùng phòng, avatar 3D và di chuyển, lời chào.
- Avatar mô phỏng được ẩn khi kết nối thành công, tránh nhầm với khách thật.
- Phòng Riêng chưa được mở vì chưa có cơ chế xác thực lời mời. Phòng Sen/Trúc chưa thực thi giới hạn số người.
- Không đồng bộ Nhật ký hoặc thông tin đóng góp.

## 2. GitHub → Netlify
1. Tạo nhánh `realtime-beta` trên GitHub (không cập nhật `main` trước khi thử).
2. Upload toàn bộ file trong thư mục này vào **gốc repo** (nếu site đang dùng thư mục khác, đặt vào đúng Publish directory hiện tại).
3. Netlify > Project configuration > Build & deploy > Continuous deployment: xác nhận repo GitHub đã kết nối.
4. Netlify > Deploys: tạo branch deploy cho `realtime-beta` hoặc deploy preview để kiểm thử. Nếu đang dùng site chính `www.anyen.space`, không merge `main` cho đến khi test đạt.
5. File `netlify.toml` dành cho site tĩnh; không cần npm build.

## 3. Supabase
1. Tạo project tại https://supabase.com/dashboard
2. Authentication > Providers > Anonymous Sign-Ins: Enable.
3. Realtime Settings: Disable `Allow public access`.
4. SQL Editor: chạy `supabase_policies.sql`.
5. Project Settings > API Keys (hoặc Connect): lấy Project URL và Publishable key.
6. Điền `config.js` theo mẫu `window.ANYEN_CONFIG = { supabaseUrl: "https://YOURPROJECT.supabase.co", publishableKey: "sb_publishable_..." };`
7. Commit và push. Publishable key là public; **không đưa service_role, sb_secret, password hoặc database connection string lên GitHub**.

## 4. Kiểm thử 2 thiết bị
- Mở cùng URL HTTPS trên iPhone và laptop, 2 trình duyệt hoặc tab độc lập.
- Chọn 2 nickname khác nhau, cùng phòng Sảnh chung, bấm Kết nối trên cả hai.
- Kiểm tra danh sách 2 người, vào 3D, di chuyển, gửi lời chào, đổi phòng, ngắt kết nối.
- Chuyển sang Phòng Sen/Trúc: người khác phòng không hiển thị.
- Kiểm tra Thắp nến, Dâng hoa sen, Gõ Chuông, Tràng hạt, âm thanh iPhone.

## 5. Giới hạn Beta
- Phòng Sen (10) / Phòng Trúc (20) hiện là nhãn thiết kế, **chưa có giới hạn cứng**.
- Người dùng có thể tự khai nickname/vị trí; chưa có hệ thống kiểm duyệt, chặn quấy rối hoặc xác minh danh tính.
- Phòng Riêng chưa được bảo mật theo lời mời, nên bị khóa kết nối.
- Không thể kiểm thử realtime thật nếu chưa cung cấp cấu hình Supabase và deploy lên HTTPS.
- Có thể rollback bằng Netlify > Deploys > chọn deploy trước đó > Publish deploy.
