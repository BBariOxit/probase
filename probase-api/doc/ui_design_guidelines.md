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
  - Các khối dữ liệu con bên trong được phân tách tự nhiên bằng khoảng trống nhịp nhàng (`gap-6`, `space-y-6`) hoặc đường kẻ ngang chuẩn (`border-t border-slate-200 dark:border-white/10 my-6`), tuyệt đối không bọc thêm card con bo viền.

### 1.2. Loại bỏ Emoji & Văn phong AI kể lể
* ❌ **CẤM:**
  - Cắt bỏ 100% emoji trong trạng thái và nhãn: ⏳, 📌, ✨, ⚖️, ✍️, 🎉, ⚠️.
  - Xóa bỏ các câu chú thích văn nói trong tiêu đề: `(CUỐN CHIẾU TRƯỚC 2 TUẦN)`, `(3 THÁNG THEO KẾ HOẠCH KHOA)`.
  - Bỏ các dòng chú thích thứ ngày thừa thãi bên dưới ô Date Picker (`Thứ 7, 24/10/2026`).
  - Xóa các câu văn kể lể hướng dẫn: `"Quản lý lịch trình đăng ký, thời gian thực hiện..."`, `"Quy định các mốc tài liệu sinh viên bắt buộc phải nộp"`, `"Đang áp dụng trong học kỳ này"`.
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

### 1.4. Quy tắc Màu chủ đạo thống nhất bằng CSS Variables
* Toàn bộ các thành phần mang sắc thái nhận diện thương hiệu (Primary CTA, Tab Active, Nút thêm mốc, Icon tiêu đề, Focus Ring, Checkbox) **bắt buộc dùng biến hệ thống `--primary`** (`bg-primary`, `text-primary`, `border-primary`, `accent-primary`, `ring-primary`).
* Tuyệt đối không hardcode mã màu `#1d4ed8` hay `#2563eb` rải rác trong component để đảm bảo **chỉ cần đổi màu ở 1 chỗ duy nhất trong `globals.css` là toàn hệ thống tự động đổi màu đồng bộ**.

---

## 2. HỆ THỐNG MÀU SẮC THƯƠNG HIỆU (BRAND THEME SYSTEM)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PROBASE BRAND THEME SYSTEM                      │
├──────────────────────┬─────────────────────────────────────────────────┤
│ LIGHT MODE           │ DARK MODE (Recessed Deep Contrast)              │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Canvas: #f4f4f5      │ Canvas: Than chì sâu thẳm #09090b (bg-zinc-950) │
│ Card:   #ffffff      │ Card:   Xám than cao cấp #121215                │
│ Primary: #1d4ed8     │ Primary: #3b82f6 (DLU Blue sáng trong nền tối)  │
│ Inputs: #ffffff      │ Inputs: Recessed #000000 (Đen khoét lõm)        │
│ Text:   #0f172a      │ Text:   #fafafa (Chữ chính) / #a1a1aa (Phụ)     │
└──────────────────────┴─────────────────────────────────────────────────┘
```

### 2.1. Light Mode (Crisp & Weighted)
* **Nền Canvas (Mặt bàn):** `#f4f4f5` (`bg-zinc-100`). Tuyệt đối không dùng trắng tinh `#ffffff` cho toàn bộ màn hình.
* **Bề mặt Card / Bảng (Tờ giấy làm việc):** `#ffffff` (`bg-white`) kết hợp đổ bóng nhẹ `shadow-sm` và viền mảnh `border border-slate-200/80`.
* **Nút hành động chính (Primary CTA):** `bg-primary text-primary-foreground hover:bg-primary/90 font-bold`.
* **Chữ nội dung:** Sắc sảo, rõ nét `#0f172a` (slate-900), phụ chú `#64748b` (slate-500).

### 2.2. Dark Mode (Recessed Deep Contrast - Vercel / Linear Style)
* **Nền Canvas ngoài cùng:** Đen than chì trầm `#09090b` (`bg-zinc-950`). Khử hoàn toàn ám xanh tím Navy bão hòa đục mắt.
* **Nền Card lớn:** Xám than cao cấp `#121215`.
* **Ô Input, Select, Date:** Kỹ thuật **bề mặt khoét lõm (Recessed surface)** dùng **ĐEN TUYỀN** `#000000` (`bg-black`), tạo độ chìm so với Card cha, không tiệp màu với Card.
* **Màu chủ đạo (Primary CTA):** `bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md`.
* **Chữ nội dung:** `#fafafa` (`text-zinc-50`), nhãn trường `text-slate-100`, mô tả phụ `#a1a1aa` (`text-zinc-400`).

### 2.3. Sidebar Midnight Thống nhất
* Sidebar duy trì màu **Midnight Dark** `#090d16` đồng nhất trên cả Light Mode và Dark Mode để giữ vững thanh điều hướng thương hiệu DLU.

---

## 3. PHÂN TẦNG ĐỘ TƯƠNG PHẢN VIỀN (BORDER HIERARCHY)

* **Viền Ô Nhập liệu (Inputs, Select, Date):**
  - Light: `border border-slate-300 bg-white text-slate-900`, khi focus: `focus:border-primary focus:ring-1 focus:ring-primary`.
  - Dark: `border border-white/15 bg-black text-zinc-50`, khi focus: `dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary`.
* **Viền Thẻ Card:**
  - Light: `border border-slate-200/80`.
  - Dark: `border border-white/10`.
* **Đường phân cách (Dividers):**
  - Giữa các Giai đoạn và Danh mục bài nộp: `border-t border-slate-200 dark:border-white/10 my-6`.
* **Nút Xóa (Delete/Trash Icon):**
  - Dạng trần không viền: `p-1 text-slate-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 transition cursor-pointer`.
* **Badge Đếm số lượng (Count Badges):**
  - Dạng Pill không viền: `rounded-full bg-slate-100 dark:bg-zinc-800 text-xs px-2 py-0.5 text-slate-600 dark:text-zinc-400 font-medium`.

---

## 4. QUY CHUẨN COMPONENT NÂNG CAO

### 4.1. Segmented Control Tabs (Chọn loại đồ án)
* Container bọc ngoài: `bg-slate-200/80 dark:bg-zinc-900 border border-slate-300 dark:border-white/10 p-1.5 rounded-xl`.
* **Trạng thái Active:**
  - Nền trắng tinh / dark card, chữ màu chủ đạo thương hiệu: `bg-white text-primary font-bold shadow-sm border border-slate-200/80 dark:bg-zinc-800 dark:text-primary dark:border-white/10 dark:shadow-md`.
* **Trạng thái Inactive:** `text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition`.

### 4.2. Status Badges & Pills (Minimalist Tag)
* Bỏ hoàn toàn dấu chấm tròn, chuyển sang bo nhẹ `rounded-md`:
  - **Thành công / Đang mở (Success):** Light `bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold` / Dark `dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20 text-xs font-medium`.
  - **Chờ duyệt / Chưa mở (Waiting):** Light `bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold` / Dark `dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20 text-xs font-medium`.
  - **Đang xử lý / Gia hạn (Active):** Light `bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold` / Dark `dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/20 text-xs font-medium`.
  - **Đã chốt / Tắt (Idle):** Light `bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold` / Dark `dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 text-xs font-medium`.

### 4.3. Nút Thứ cấp & Tag Bắt buộc
* **Nút '+ Thêm mốc nộp bài':** `bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition`.
* **Tag 'Bắt buộc':** `bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-white/10 text-xs px-2.5 py-1 rounded-md`.

### 4.4. Danh mục bài nộp (Deliverables Row Layout)
* Hiển thị mỗi bài nộp trên **1 hàng ngang duy nhất (Single Row)**:
  - `[Grip Icon]` $\rightarrow$ `[Ô nhập tên bài (flex-1)]` $\rightarrow$ `[Ô chọn hạn nộp (w-40)]` $\rightarrow$ `[Pill Bắt buộc/Tùy chọn]` $\rightarrow$ `[Trash Icon trần]`.
