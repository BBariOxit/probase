# BỘ NGUYÊN TẮC THIẾT KẾ GIAO DIỆN CHUẨN PROBASE (UI/UX DESIGN SYSTEM)
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)

> **Mục tiêu:** Xóa bỏ hoàn toàn cảm giác "giao diện sặc mùi AI / CRUD thô / bài tập lớn", chuyển đổi ProBase thành **Hệ thống Quản lý Đào tạo cấp Khoa chuẩn Enterprise & SaaS hiện đại** (tương tự chuẩn mực thiết kế của Linear, Vercel, Supabase, GitHub Enterprise). Sẵn sàng phục vụ nghiệm thu, báo cáo Hội đồng Khoa và triển khai thực tế.

---

## 1. NGUYÊN TẮC 1: DỌN DẸP THÔNG TIN THỪA (GIẢM TẢI NHẬN THỨC)

Giao diện quản lý nội bộ chuyên nghiệp **tuyệt đối không "kể lể" hay giải thích cho người dùng những điều hiển nhiên**.

### 1.1. Cắt bỏ hoàn toàn câu văn hướng dẫn hiển nhiên
* ❌ **CẤM:** 
  - `"Chưa có ghi nhận tiến độ nào. Bấm nút 'Ghi nhận tiến độ' ở trên để cập nhật công việc đã làm."`
  - `"Tài khoản của bạn đủ điều kiện tham gia đợt đồ án theo khóa 2022. Vui lòng chọn đề tài trước thời hạn."`
  - `"Nộp bản scan Đề cương chi tiết có chữ ký xác nhận của GVHD để hoàn tất thủ tục giao đề tài (BR-08)"`
* ✅ **CHUẨN HÓA:**
  - Dùng **Empty State tối giản**: 1 icon xám nhạt mờ (`text-muted-foreground/40`), 1 tiêu đề súc tích (`Chưa có dữ liệu tiến độ`), và 1 nút hành động đặt ngay bên dưới nếu cần. Không viết câu chỉ dẫn bấm ở đâu.
  - Rút gọn thành **Badge nhỏ ở góc**: `Khóa 2022 • Đủ điều kiện`. Bỏ toàn bộ lời nhắc nhở chung chung.

### 1.2. Tuyệt đối không phơi bày mã quy định nội bộ ra màn hình
* ❌ **CẤM:** Hiển thị mã `(BR-08)`, `(BR-16, BR-17)`, `(M02/M04/M05)` tràn lan trên các thẻ tiêu đề. Đây là mã tài liệu kỹ thuật dành cho lập trình viên/đặc tả, người dùng cuối (Sinh viên, Giảng viên) không quan tâm và thấy rối mắt.
* ✅ **CHUẨN HÓA:**
  - Tiêu đề chỉ nêu đúng việc cần làm: `Đề cương đồ án (M03)`, `Tiến độ thực hiện`, `Hồ sơ bảo vệ`.
  - Áp dụng **Progressive Disclosure (Tiết lộ dần)**: Chỉ hiển thị `Tên việc cần làm + Trạng thái + Người phụ trách + Hạn chót`. Chi tiết quy định hay mô tả dài thì đưa vào Slide-over panel (Drawer), modal khi bấm vào, hoặc icon tooltip `(?)` nhỏ.

### 1.3. Thay văn xuôi bằng cặp dữ liệu (Key - Value)
* ❌ **CẤM:** `"ThS. Chu Định (Tổ trưởng BM Mạng máy tính) - Giảng viên hướng dẫn"`
* ✅ **CHUẨN HÓA:** Dùng nhãn súc tích `GVHD:` bên cạnh tên `ThS. Chu Định` kèm avatar hoặc tag chức vụ nhỏ xám `MMT`.

---

## 2. NGUYÊN TẮC 2: MÀU SẮC & DARK MODE CHUẨN SAAS

Tránh lỗi dùng màu bão hòa cao hoặc nền màu đặc làm chữ bị chìm và giao diện xỉn màu/chói mắt.

### 2.1. Công thức tỷ lệ 60 – 30 – 10
* **60% Nền chủ đạo:** Dùng xám chì, đen xám lạnh (`#09090b` hoặc `#0f172a`), không dùng màu đen tuyền `#000000`.
* **30% Bề mặt & Phân cách:** Nền của card, bảng, menu bên hông (`#18181b` hoặc `#1e293b`), viền mờ `border-white/5` đến `border-white/10`.
* **10% Màu nhấn (Accent):** Một màu thương hiệu duy nhất (xanh dương đại học `#2563eb` hoặc xanh chàm `#4f46e5`) cho các nút hành động chính (Primary Button).

### 2.2. Quy tắc pha màu trạng thái (Semantic Colors)
* ❌ **CẤM:** Dùng khối nền vàng đất đặc hoặc xanh lá cây sẫm làm khối thông báo chói lòa hoặc xỉn màu.
* ✅ **CHUẨN HÓA (Chữ sáng + Nền trong suốt có độ mờ):**
  - **Cảnh báo / Chờ duyệt:** Chữ `text-amber-400`, nền `bg-amber-500/10`, viền `border border-amber-500/20`.
  - **Thành công / Đã nộp / Đạt:** Chữ `text-emerald-400`, nền `bg-emerald-500/10`, viền `border border-emerald-500/20`.
  - **Chưa mở / Vô hiệu hóa:** Chữ `text-zinc-400`, nền `bg-zinc-800/50`.
  - **Từ chối / Vi phạm:** Chữ `text-rose-400`, nền `bg-rose-500/10`, viền `border border-rose-500/20`.

### 2.3. Quy tắc 1 trang – 1 nút chính (Primary CTA)
* Trên một khung nhìn (viewport), chỉ nên có **duy nhất 1 nút có màu nền nổi bật** (Primary).
* Các nút còn lại bắt buộc là **nút thứ cấp** (Secondary - viền mờ nền rỗng) hoặc **nút dạng chữ** (Ghost button).

---

## 3. NGUYÊN TẮC 3: BỐ CỤC & NHỊP ĐIỆU THỊ GIÁC (VISUAL RHYTHM)

### 3.1. Chữa dứt điểm "Hội chứng bọc Card"
* ❌ **CẤM:** Không lồng một chiếc hộp có viền vào trong một chiếc hộp khác có viền (Card in Card in Card).
* ✅ **CHUẨN HÓA:** Thay vì tạo card con, dùng khoảng trống (`gap-4`, `p-4`) hoặc các đường kẻ phân cách cực mảnh (`border-b border-border/40` hoặc `border-white/5`) để phân định các hàng.

### 3.2. Kiểm soát cỡ chữ (Type Scale 4 cấp độ)
1. **Tiêu đề trang:** 20px – 24px (`text-xl` đến `text-2xl`, `font-semibold text-zinc-100`).
2. **Tiêu đề khối/phần:** 14px – 16px (`text-sm` đến `text-base`, `font-medium text-zinc-200`).
3. **Nội dung thường / Nhãn:** 13px – 14px (`text-xs` đến `text-sm`, `font-normal text-zinc-300`).
4. **Metadata / Chú thích:** 11px – 12px (`text-xs`, `text-zinc-500`).

### 3.3. Bỏ viết hoa toàn bộ (ALL CAPS) & Bỏ Emoji
* ❌ **CẤM:** 
  - `ĐANG THẨM ĐỊNH HỒ SƠ BẢO VỆ CUỐI KỲ` $\rightarrow$ Đổi sang Sentence case: `Đang thẩm định hồ sơ bảo vệ`.
  - Không dùng các emoji cảm xúc: ⏳, ⚖️, 📌, ✍️, 🎉, ⚠️ trong các thẻ dữ liệu nghiệp vụ.
* ✅ **CHUẨN HÓA:** Dùng icon vector **Lucide Icons** mảnh (`stroke-width={1.5}` hoặc `1.75`, kích thước `size-4` hoặc `size-4.5`).

---

## 4. BỘ MÃ NGUỒN MỞ & THƯ VIỆN CHUẨN SỬ DỤNG
* **shadcn/ui:** Cốt lõi cho Button, Tabs, Badge, Dialog, Drawer, Dropdown.
* **Lucide React:** Toàn bộ icon hệ thống đồng bộ stroke 1.5.
* **Sonner:** Thông báo toast tinh tế góc màn hình.
* **Progressive Disclosure:** Sheet / Drawer / Tooltip cho các thông tin hướng dẫn chi tiết.
