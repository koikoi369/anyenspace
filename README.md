# LÀNG YÊN 2.4 · Netlify Beta

## Triển khai
Giải nén ZIP và deploy **toàn bộ nội dung thư mục** lên site Beta trên Netlify. Không thay thế site chính nếu chưa kiểm thử. Giữ `config.js` và các file multiplayer đi kèm. Dùng HTTPS trên iPhone Safari, tải lại không dùng cache.

## Thay đổi
- Kinh Dịch: https://thuanthoi.com.
- Nút `✕ Đóng` trên mỗi tab nội dung, trở về trang chủ; chạm tab đang mở cũng trở về Home.
- Âm thanh một nguồn tại một thời điểm trong các nguồn **được ứng dụng kiểm soát**: nhạc Home, nhạc thở, mưa, chuông Tây Tạng và YouTube iframe. Chuyển tab sẽ dừng âm đang phát. Video YouTube chỉ có thể kiểm soát qua việc dỡ iframe; phát từ ứng dụng YouTube ở tab ngoài không thể bị website dừng.
- Nhạc nền Home là âm tổng hợp không lời (không lấy trực tiếp âm thanh YouTube). Phải chạm để bật theo chính sách iOS. Có link InWellness.
- Nghi thức thêm `Dâng hoa` mang ý nghĩa tượng trưng và `Tùy tâm đóng góp` dẫn tới Quỹ Quý Nhân. Chưa có credit, cổng thanh toán, xác nhận ngân hàng, sổ cái hoặc hoa đã mua; **không** xác nhận giao dịch đã thành công. Để triển khai credit thật cần backend, đối tác thanh toán, webhook có xác thực và cơ chế hoàn tiền/minh bạch.

## Kiểm thử
Trên iPhone Safari: bật Home music, chuyển sang Tĩnh Tâm, thử nhạc thở, mở YouTube, thử Gõ Chuông, chuyển trang và kiểm tra âm nguồn cũ dừng. Dâng hoa chỉ là biểu tượng, không thanh toán. Chưa kiểm thử trực tiếp trên iPhone.
