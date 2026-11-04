# LÀNG YÊN 3.1 · Realtime + phòng riêng

## Cập nhật
- Sửa trạng thái `CLOSED` / mất kết nối: bỏ kênh cũ trước khi kết nối mới, cấp JWT cho Realtime, tự thử lại sau lỗi tạm thời và khi thiết bị có mạng trở lại.
- iPhone: bảng Trực tuyến thu gọn, khi mở thành bottom sheet; thanh Cá nhân hóa chuyển lên trên để tránh che nút.
- 3D: góc nhìn theo sau nhân vật (third-person), hiển thị chính mình với màu áo và nickname; người khác cũng có nickname trên đầu.
- Phòng Riêng: tạo mã mời ngẫu nhiên, thành viên nhập mã để tham gia. Supabase RLS chỉ cho thành viên của phòng truy cập Presence/Broadcast.
- Nghi thức cộng đồng: Chào nhau, Ngồi thiền, Thiền hành, Gõ chuông, mời cùng thiền 5 phút và kết thúc phiên. **Âm thanh chuông vẫn chỉ phát trên thiết bị người gõ.**

## Triển khai GitHub → Netlify
1. Sao lưu commit đang chạy trên `main`.
2. Upload `index.html` và `multiplayer.js` từ ZIP lên repository root. Giữ nguyên `config.js` hiện có Publishable Key thật. Không upload lại `config.js` mẫu.
3. **Bắt buộc:** Mở Supabase SQL Editor của project `tgaigagmkrkwnzcyfoir`, chạy `supabase_policies.sql` trong ZIP. Không chạy khi chưa rà soát các policy Realtime cũ.
4. Commit, đợi Netlify triển khai. Kiểm tra trên hai thiết bị, trong đó một máy mở chế độ ẩn danh để có guest ID khác.
5. Phòng Riêng: một người chọn Phòng Riêng, bấm `Tạo phòng riêng`, gửi mã mời cho người kia; cả hai chọn Phòng Riêng, nhập cùng mã, bấm `Kết nối`.

## Lưu ý bảo mật & giới hạn
- Chỉ dùng `sb_publishable_` trong client; không đưa service role / secret key lên GitHub.
- Phòng riêng là phòng *theo mã mời*, không phải phòng mã hóa đầu cuối. Người có mã có thể tham gia; chưa có thu hồi mã, hết hạn, chặn khách, giới hạn tốc độ, hoặc giới hạn số người phía máy chủ. Không dùng cho thông tin nhạy cảm.
- Kiểm tra các policy khác trên `realtime.messages`: policy permissive có thể cộng quyền. RLS ở đây bảo vệ private channels chỉ khi không có policy rộng khác.
- Mã phòng được tạo qua RPC `security definer`, bảng không cấp quyền truy cập trực tiếp cho khách. Trước khi công bố nên thêm CAPTCHA/Turnstile, rate limiting và cơ chế quản lý phòng.
- Thiền hành di chuyển nhân vật theo một vòng an toàn gần sân vườn; animation nhân vật vẫn đơn giản. Nút Gõ chuông gửi trạng thái, không truyền âm thanh giữa các thiết bị.
- Bản này đã kiểm tra cú pháp JavaScript, chưa kiểm thử realtime trên Supabase thật hoặc Safari iPhone.
