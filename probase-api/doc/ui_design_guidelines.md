# BỘ NGUYÊN TẮC THIẾT KẾ GIAO DIỆN CHUẨN PROBASE (UI/UX DESIGN SYSTEM)
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)
### Phong cách: Enterprise Kỹ thuật số / High-end Developer Tool (Vercel, Linear, Supabase)

> **Mục tiêu:** Khắc phục triệt để hiện tượng giao diện bị bệt màu, lạm dụng màu xanh tím Navy ở Dark mode, lóa mắt ở Light mode, lạm dụng hộp viền lồng hộp (Card-in-card) và các chi tiết mang "vibe AI sinh code thô". Chuyển đổi toàn diện ProBase sang **chuẩn mực High-end Developer Tool & Enterprise SaaS** sắc nét, sang trọng, tinh tế.

---

## 1. NGUYÊN TẮC CỐT LÕI & TẨY "MÙI AI" (DE-AI POLISH)

### 1.1. Xóa bỏ hoàn toàn hội chứng "Hộp lồng Hộp" (No Card-in-Card)
* ❌ **CẤM:** Tuyệt đối không bọc mọi thứ vào các thẻ có viền độc lập lồng nhau (`Card > Card > Card`). Hiện tượng này gây ngột ngạt thị giác và phân mảnh không gian.
* ✅ **CHUẨN HÓA:**
  - Trên một màn hình/phân đoạn chỉ có **duy nhất 1 khung làm việc chính (Primary Surface Card)**.
  - Các khối dữ liệu con bên trong được phân tách tự nhiên bằng khoảng trống nhịp nhàng (`gap-6`, `space-y-6`) hoặc đường kẻ ngang siêu mảnh (`divide-y`, `border-t border-slate-200 dark:border-white/10`), tuyệt đối không bọc thêm card con bo viền.

### 1.2. Loại bỏ Emoji & Văn phong AI kể lể
* ❌ **CẤM:**
  - Cắt bỏ 100% emoji trong trạng thái và nhãn: ⏳, 📌, ✨, ⚖️, ✍️, 🎉, ⚠️.
  - Xóa bỏ các câu chú thích văn nói trong tiêu đề: `(CUỐN CHIẾU TRƯỚC 2 TUẦN)`, `(3 THÁNG THEO KẾ HOẠCH KHOA)`.
  - Bỏ các dòng chú thích thứ ngày thừa thãi bên dưới ô Date Picker (`Thứ 7, 24/10/2026`).
  - Xóa các placeholder kiểu chatbot: `"Chưa khai mục nào. Thường có: + Đề cương..."`, `"Gợi ý thêm:..."`, `"Bấm nút ở trên để..."`.
* ✅ **CHUẨN HÓA:**
  - Tiêu đề và nhãn form ngắn gọn chuẩn nghiệp vụ: `Giai đoạn 1: Đăng ký đề tài`, `Giai đoạn 2: Thực hiện đồ án`.
  - Dùng 100% vector SVG icon từ **lucide-react** nét mảnh (`h-4 w-4` hoặc `h-3.5 w-3.5`, `stroke-width={1.5}`).
  - Empty state tối giản: 1 icon trung tính mờ, 1 dòng thông điệp ngắn, không kể lể thao tác.

### 1.3. Chuẩn hóa logic dữ liệu & Học vị (Hàm `sanitizeLecturerName`)
* ❌ **LỖI:** Lỗi duplicate học vị do nối chuỗi tự động (`ThS. ThS. Chu Định`, `TS. TS. An Bình`).
* ✅ **CHUẨN HÓA:**
  - Hàm `sanitizeLecturerName` phải dùng vòng lặp bóc tách triệt để mọi tiền tố học vị lặp ở đầu chuỗi (`while (titlePattern.test(raw))`).
  - Tách học vị ngắn gọn và đưa chức vụ bộ môn dài vào dòng phụ hoặc tooltip, tránh làm tràn dropdown và vỡ layout bảng.

### 1.4. Quy tắc 1 Primary CTA duy nhất (1 Primary Action per View)
* Trên một khung nhìn/form chỉ có **duy nhất 1 nút hành động chính** có màu nền nổi bật (Lưu, Kích hoạt, Xác nhận).
* Tất cả các nút thao tác con bên trong (ví dụ: chuyển trạng thái Bắt buộc/Tùy chọn, Thêm mốc, Xóa) phải dùng dạng **Outline / Ghost / Pill Tag** trung tính.

---

## 2. HỆ THỐNG TƯƠNG PHẢN NGHỊCH ĐẢO (HYBRID INVERTED THEMING)

Tuyệt đối không áp dụng tư duy "Light mode toàn màu sáng, Dark mode toàn màu tối xỉn". Hệ thống dùng độ tương phản nghịch đảo sắc nét để tạo lực neo thị giác:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HYBRID INVERTED THEMING                         │
├──────────────────────┬─────────────────────────────────────────────────┤
│ LIGHT MODE (Crisp)   │ DARK MODE (Recessed Deep Contrast)              │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Canvas: #f4f4f5 /    │ Canvas: Than chì sâu thẳm #09090b (bg-zinc-950) │
│         #f1f5f9      │                                                 │
│ Card:   #ffffff      │ Card:   Xám than cao cấp #121215 (zinc-900/90)  │
│ CTA:    #000000 (Đen)│ CTA:    #ffffff (Trắng tinh)                    │
│ Inputs: #ffffff      │ Inputs: Recessed #000000 (Đen khoét lõm)        │
│ Text:   #0f172a      │ Text:   #fafafa (Chữ chính) / #a1a1aa (Phụ)     │
└──────────────────────┴─────────────────────────────────────────────────┘
```

### 2.1. Light Mode (Crisp & Weighted)
* **Nền Canvas (Mặt bàn):** `#f4f4f5` (`bg-zinc-100`) hoặc `#f1f5f9` (`bg-slate-100`). Tuyệt đối không dùng trắng tinh `#ffffff` cho toàn bộ màn hình.
* **Bề mặt Card / Bảng (Tờ giấy làm việc):** `#ffffff` (`bg-white`) kết hợp đổ bóng nhẹ `shadow-sm` và viền mảnh `border border-slate-200/80`.
* **Nút hành động chính (Primary CTA):** Dùng **ĐEN TUYỀN** `#000000` (`bg-black text-white hover:bg-zinc-800 font-medium`).
* **Chữ nội dung:** Sắc sảo, rõ nét `#0f172a` (slate-900), phụ chú `#64748b` (slate-500).

### 2.2. Dark Mode (Recessed Deep Contrast - Vercel / Linear Style)
* **Nền Canvas ngoài cùng:** Đen than chì trầm `#09090b` (`bg-zinc-950`). Khử hoàn toàn ám xanh tím Navy bão hòa đục mắt (`#0b1329/#0f172a`).
* **Nền Card lớn:** Xám than cao cấp `#121215` hoặc `bg-zinc-900/90`.
* **Ô Input, Select, Date:** Kỹ thuật **bề mặt khoét lõm (Recessed surface)** dùng **ĐEN TUYỀN** `#000000` (`bg-black`), tạo độ chìm so với Card cha, không tiệp màu với Card.
* **Nút hành động chính (Primary CTA):** Đảo sang **TRẮNG TINH** `#ffffff` (`bg-white text-black hover:bg-zinc-200 font-semibold shadow-sm`).
* **Chữ nội dung:** `#fafafa` (`text-zinc-50`), nhãn trường `text-slate-100`, mô tả phụ `#a1a1aa` (`text-zinc-400`).

### 2.3. Sidebar Midnight Thống nhất
* Sidebar duy trì màu **Midnight Dark** `#090d16` đồng nhất trên cả Light Mode và Dark Mode để giữ vững thanh điều hướng thương hiệu DLU.

---

## 3. PHÂN TẦNG ĐỘ TƯƠNG PHẢN VIỀN (BORDER HIERARCHY)

Tránh hiện tượng viền quá mờ khiến các bề mặt dính chùm vào nhau hoặc viền quá đậm gây rối mắt:

* **Viền Ô Nhập liệu (Inputs, Select, Date):**
  - Light: `border border-slate-300 bg-white text-slate-900`, khi focus: `focus:border-blue-600 focus:ring-2 focus:ring-blue-100`.
  - Dark: `border border-white/20 bg-black text-zinc-50`, khi focus: `focus:border-white focus:ring-1 focus:ring-white`.
* **Viền Thẻ Card:**
  - Light: `border border-slate-200/80`.
  - Dark: `border border-white/10`.
* **Đường phân cách (Dividers):**
  - Light: `border-t border-slate-200`.
  - Dark: `border-t border-white/10`.
* **Nút Xóa (Delete/Trash Icon):**
  - Dạng Ghost icon, tuyệt đối không đóng khung viền hình chữ nhật: `p-1.5 rounded-md text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition`.
* **Badge Đếm số lượng (Count Badges):**
  - Dạng Pill không viền: `rounded-full bg-slate-100 dark:bg-zinc-800 text-xs px-2 py-0.5 text-slate-600 dark:text-zinc-400 font-medium`.

---

## 4. QUY CHUẨN COMPONENT NÂNG CAO

### 4.1. Segmented Control Tabs
* Không đặt chấm tròn xanh Discord bên cạnh tên Tab.
* Khung bọc danh sách Tab: `bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-1 rounded-xl`.
* **Trạng thái Active:**
  - Light Mode: `bg-black text-white font-semibold shadow-sm border border-black`.
  - Dark Mode: `bg-white text-black font-semibold shadow-sm border border-white`.
* **Trạng thái Inactive:** `text-slate-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition`.

### 4.2. Status Badges & Pills
* Thiết kế thanh mảnh, tinh tế:
  - **Thành công / Đang mở (Success):** Light `bg-emerald-50 text-emerald-700 border border-emerald-200/80` / Dark `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`. Chấm tròn: `h-1.5 w-1.5 rounded-full bg-emerald-500`.
  - **Chờ duyệt / Chưa mở (Waiting):** Light `bg-amber-50 text-amber-700 border border-amber-200/80` / Dark `bg-amber-500/10 text-amber-400 border border-amber-500/20`.
  - **Đang xử lý / Gia hạn (Active):** Light `bg-blue-50 text-blue-700 border border-blue-200/80` / Dark `bg-blue-500/10 text-blue-400 border border-blue-500/20`.
  - **Đã chốt / Tắt (Idle):** Light `bg-slate-100 text-slate-700 border border-slate-200` / Dark `bg-zinc-800 dark:text-zinc-300 dark:border-white/10`.

### 4.3. Nút Thứ cấp / Toggle Pill Tag (Bắt buộc / Tùy chọn)
* Không dùng màu xanh dương đặc lặp lại nhiều lần.
* Dùng Pill Tag trung tính: `bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-zinc-700`.

### 4.4. Danh mục bài nộp (Deliverables Row Layout)
* Hiển thị mỗi bài nộp trên **1 hàng ngang duy nhất (Single Row)**:
  - `[Grip Icon]` $\rightarrow$ `[Ô nhập tên bài (flex-1)]` $\rightarrow$ `[Ô chọn hạn nộp (w-40)]` $\rightarrow$ `[Pill Bắt buộc/Tùy chọn]` $\rightarrow$ `[Ghost Trash Icon]`.
* Không bọc thẻ con cho từng dòng, không lặp lại nút Primary CTA trong danh sách.
