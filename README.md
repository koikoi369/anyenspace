# LÀNG YÊN · Bản cập nhật nghi thức

## Thay đổi
- Bỏ Thắp nến bình an và mọi nút/logic liên quan.
- Trong Nghi thức: Thắp hương chánh niệm, Dâng hoa sen (có hoa sen hiển thị), Gõ Chuông Tây Tạng (hình bát chuông).
- Tràng hạt: bỏ lựa chọn 9 âm, mỗi lần chạm gọi chung bộ tổng hợp tiếng chuông Tây Tạng đang dùng ở Gõ Chuông.
- Bỏ số phiên bản khỏi tiêu đề tab trình duyệt và footer.
- Giữ cấu trúc Netlify, các liên kết, và các file cấu hình Supabase hiện có.

## Đưa lên www.anyen.space
1. Giữ bản sao website hiện tại trong Netlify Deploys trước khi thay đổi.
2. Kiểm tra `config.js`: giữ cấu hình Supabase nếu đã có, không đưa service_role key vào mã client.
3. Deploy thư mục này lên đúng site Netlify đang phục vụ www.anyen.space.
4. Thử trên Safari iPhone: Nghi thức, Dâng hoa sen, Gõ Chuông và Tràng hạt; kiểm tra chỉ một nguồn âm thanh hoạt động tại một thời điểm.

**Lưu ý:** Tiếng chuông là âm thanh tổng hợp mô phỏng chuông Tây Tạng, không phải bản ghi chuông thật. Chưa kiểm thử trên iPhone thực tế. Multiplayer thực tế vẫn cần cấu hình Supabase riêng.
