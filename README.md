# LÀNG YÊN · GitHub → Netlify → Supabase

## Nội dung thay đổi
- Khôi phục hình **bát nến 🪔** trong Nghi thức, cả trước và sau khi nhấn Thắp nến.
- Cập nhật VietQR Quỹ Quý Nhân và QR Zalo WellNest từ ảnh người dùng cung cấp, lưu thành file JPG riêng.
- Giữ nguyên chức năng 3D, nhật ký, âm thanh và multiplayer từ bản 2.8.
- Điền sẵn Supabase Project URL trong `config.js`, **chưa có publishable key**.

## Triển khai vào repository chính
1. Mở https://github.com/koikoi369/anyenspace, sao lưu branch main hoặc tạo nhánh dự phòng trước khi sửa.
2. Upload **các file bên trong thư mục này** vào thư mục gốc repository, giữ nguyên đường dẫn `./quy-quy-nhan-vietqr.jpg` và `./wellnest-zalo-qr.jpg`.
3. Tại Supabase project `tgaigagmkrkwnzcyfoir`, bật Auth > Anonymous Sign-Ins.
4. Trong SQL Editor, chạy `supabase_policies.sql` sau khi rà soát. Tại Realtime Settings, tắt Allow public access nếu muốn private channel authorization.
5. Lấy **Publishable Key** (không phải Secret/Service Role Key) ở Project Settings > API Keys và điền vào `config.js`. Publishable Key là khóa phía trình duyệt, không phải bí mật.
6. Đảm bảo Netlify đang liên kết đúng repository, production branch main, publish directory là thư mục chứa index.html. Commit mới sẽ trigger deploy.
7. Kiểm tra QR trên website bằng điện thoại khác; xác nhận người nhận và thông tin trong app ngân hàng **trước** khi chuyển khoản.
8. Trên hai thiết bị, đặt hai nickname, chọn Sảnh chung, bấm Kết nối, thử di chuyển và gửi lời chào.

## Lưu ý an toàn
- Chưa có xác minh giao dịch, thanh toán hay quản lý credit.
- Không có giới hạn người/phòng phía máy chủ, chống spam, kiểm duyệt hay bảo mật phòng riêng.
- Không lưu nhật ký lên Supabase trong giai đoạn này.
- Đăng nhập ẩn danh tạo tài khoản Supabase nhưng không cần người dùng đăng ký; cần biện pháp chống lạm dụng trước khi công bố rộng.
- Việc đặt tên file JPG riêng giúp dễ thay QR sau này mà không phải chỉnh HTML dài.
- Không upload mật khẩu, secret key, service_role key hoặc database connection string lên GitHub.
