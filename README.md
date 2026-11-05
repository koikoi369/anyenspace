# LÀNG YÊN 3.5 · Zen Mode

## Cập nhật GitHub → Netlify

1. Sao lưu commit hiện tại của nhánh `main`.
2. Thay **chỉ** `index.html` và `multiplayer.js` trong repository `koikoi369/anyenspace`.
3. **Giữ nguyên** `config.js`, SQL Supabase, hai mã QR và các file khác.
4. Commit và đợi Netlify triển khai, sau đó thử trên iPhone (Safari) và laptop.

## Tính năng
- Thanh công cụ iPhone chỉ có: **Ngồi thiền · Thiền hành · Gõ chuông · Menu**.
- Menu mở các tương tác và đường dẫn chọn phòng. Các bảng khác được ẩn trong chế độ 3D trên mobile.
- **Chạm mặt đất** để đi theo đường thẳng tới điểm được chọn, dừng trước hồ và khu điện chính. Chưa có thuật toán tìm đường vòng chướng ngại.
- **Chạm tọa cụ** để ngồi thiền; **chạm nhân vật khác** để gửi lời chào cho phòng đang kết nối.
- 3 kiểu trang phục có silhouette khác nhau: áo thiền dài, linen có áo khoác ngắn, thường ngày có quần riêng; màu cá nhân vẫn được đồng bộ qua Supabase.
- Giữ ngồi thiền/thiền hành khi gõ chuông.

## Lưu ý
- Đây là bản beta; chưa được kiểm thử trực tiếp trên iPhone và nhiều thiết bị thật.
- Thiền đường cộng hưởng vẫn sử dụng SQL của phiên bản 3.4. Không chạy lại SQL nếu đã cấu hình.
- Không đưa `service_role` hoặc secret key vào GitHub.
