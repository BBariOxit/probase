# BỘ NGUYÊN TẮC THIẾT KẾ GIAO DIỆN CHUẨN PROBASE (UI/UX DESIGN SYSTEM)
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)
### Phong cách: Matte Obsidian & Neutral Stone (Raycast, Craft, Linear — Tối ấm cao cấp)

> **Mục tiêu:** Khắc phục triệt để hiện tượng giao diện bị bệt màu, lạm dụng màu xanh tím Navy ở Dark mode, lóa mắt ở Light mode, lạm dụng hộp viền lồng hộp (Card-in-card) và các chi tiết mang "vibe AI sinh code thô". Chuyển đổi toàn diện ProBase sang **chuẩn mực Matte Obsidian & Neutral Stone** sang trọng, ấm áp, sâu sắc và sắc nét.

---

## 1. NGUYÊN TẮC CỐT LÕI & TẨY "MÙI AI" (DE-AI POLISH)

### 1.1. Xóa bỏ hoàn toàn hội chứng "Hộp lồng Hộp" (No Card-in-Card)
* ❌ **CẤM:** Tuyệt đối không bọc mọi thứ vào các thẻ có viền độc lập lồng nhau (`Card > Card > Card`). Hiện tượng này gây ngột ngạt thị giác và phân mảnh không gian.
* ✅ **CHUẨN HÓA:**
  - Trên một màn hình/phân đoạn chỉ có **duy nhất 1 khung làm việc chính (Primary Surface Card)**.
  - Các khối dữ liệu con bên trong được phân tách tự nhiên bằng khoảng trống nhịp nhàng (`gap-6`, `space-y-6`) hoặc đường kẻ ngang chuẩn (`border-t border-slate-200 dark:border-neutral-800 my-6`), tuyệt đối không bọc thêm card con bo viền.

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
* Toàn bộ các thành phần mang sắc thái nhận diện thương hiệu (Primary CTA, Tab Active, Nút thêm mốc, Icon tiêu đề, Focus Ring, Checkbox) **dùng biến hệ thống `--primary: #3b82f6`** (`bg-primary`, `text-primary`, `border-primary`, `accent-primary`, `ring-primary`) đồng nhất cho cả Light và Dark mode.
* Đổi màu ở 1 chỗ duy nhất trong `globals.css` là toàn hệ thống tự động đổi màu đồng bộ.

---

## 2. HỆ THỐNG MÀU SẮC MATTE OBSIDIAN & NEUTRAL STONE

```
┌────────────────────────────────────────────────────────────────────────┐
│               MATTE OBSIDIAN & NEUTRAL STONE SYSTEM                    │
├──────────────────────┬─────────────────────────────────────────────────┤
│ LIGHT MODE           │ DARK MODE (Raycast / Craft — Tối ấm cao cấp)    │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Canvas: #f8fafc      │ Canvas: #121212 (bg-[#121212] — Đen nhám lì)    │
│ Card:   #ffffff      │ Card:   #1e1e1e (bg-[#1e1e1e] — Xám đen phẳng)  │
│ Primary: #3b82f6     │ Primary: #3b82f6 (Đồng nhất Light & Dark)       │
│ Inputs: #ffffff      │ Inputs: #141414 (bg-[#141414], viền neutral-700)│
│ Empty:  #f8fafc      │ Empty:  #181818 (bg-[#181818], viền neutral-600)│
│ Text:   #0f172a      │ Text:   #f5f5f5 (neutral-100) / #d4d4d4 (Label) │
└──────────────────────┴─────────────────────────────────────────────────┘
```

### 2.1. Phân tầng bề mặt Dark Mode (Surface Elevation)
1. **Nền ngoài Canvas:** `#121212` (`bg-[#121212]`). Không dùng xanh navy, không dùng đen bóng.
2. **Khối Card nội dung chính:** `#1e1e1e` (`bg-[#1e1e1e]`), viền `border border-neutral-800`.
3. **Ô Input / Select / Date:** `#141414` (`bg-[#141414]`), viền `border border-neutral-700`, chữ người dùng nhập `text-neutral-100`.
4. **Khối nộp bài nét đứt (Empty State):** `#181818` (`bg-[#181818]`), viền `border border-dashed border-neutral-600`.
5. **Đường kẻ phân cách các giai đoạn:** `border-t border-neutral-800`.
6. **Nhãn trường (Label):** `text-neutral-300`.
7. **Chữ người dùng nhập:** `text-neutral-100`.

### 2.2. Sidebar Midnight Thống nhất
* Sidebar duy trì màu **Midnight Dark** `#090d16` đồng nhất trên cả Light Mode và Dark Mode để giữ vững thanh điều hướng thương hiệu DLU.

---

## 3. PHÂN TẦNG ĐỘ TƯƠNG PHẢN VIỀN (BORDER HIERARCHY)

* **Viền Ô Nhập liệu (Inputs, Select, Date):**
  - Light: `border border-slate-300 bg-white text-slate-900`, focus: `focus:border-primary focus:ring-1 focus:ring-primary`.
  - Dark: `border border-neutral-700 bg-[#141414] text-neutral-100`, focus: `dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary`.
* **Viền Thẻ Card:**
  - Light: `border border-slate-200/80`.
  - Dark: `border border-neutral-800`.
* **Đường phân cách (Dividers):**
  - Giữa các Giai đoạn và Danh mục bài nộp: `border-t border-slate-200 dark:border-neutral-800 my-6`.
* **Nút Xóa (Delete/Trash Icon):**
  - Dạng trần không viền: `p-1 text-slate-400 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition cursor-pointer`.
* **Badge Đếm số lượng (Count Badges):**
  - Dạng Pill không viền: `rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold`.

---

## 4. QUY CHUẨN COMPONENT NÂNG CAO

### 4.1. Segmented Control Tabs (Chọn loại đồ án)
* Container bọc ngoài:
  - Light: `bg-slate-200/80 border border-slate-300 p-1.5 rounded-xl`.
  - Dark: `bg-[#141414] border border-neutral-800 p-1.5 rounded-xl`.
* **Trạng thái Active:**
  - Đồng nhất cả Light & Dark: **Nền màu chủ đạo Solid `bg-primary` + chữ trắng `text-primary-foreground` font-bold shadow-sm**, cho hiệu ứng nhận diện nổi bật, sắc nét và dứt khoát như nút CTA chính.
* **Trạng thái Inactive:**
  - Light: `text-slate-600 hover:text-slate-900 hover:bg-slate-300/40`.
  - Dark: `text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40`.

### 4.2. Status Badges & Pills (Minimalist Tag)
* Bỏ hoàn toàn dấu chấm tròn, chuyển sang bo nhẹ `rounded-md`:
  - **Thành công / Đang mở (Success):** Light `bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold` / Dark `dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-600/30 text-xs font-semibold`.
  - **Chờ duyệt / Chưa mở (Waiting):** Light `bg-amber-50 text-amber-700 border border-amber-300 text-xs font-semibold` / Dark `dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-600/30 text-xs font-semibold`.
  - **Đang xử lý / Gia hạn (Active):** Light `bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold` / Dark `dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-600/30 text-xs font-semibold`.
  - **Đã chốt / Tắt (Idle):** Light `bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold` / Dark `dark:bg-[#262626] dark:text-neutral-300 dark:border-neutral-700 text-xs font-medium`.

### 4.3. Loại bỏ các Pill Viền Mờ / Tránh Hội chứng "Card-in-Card Mini"
* **Triệt tiêu các badge viền mờ rải rác:**
  - Bỏ hoàn toàn badge `Thời lượng: 90 ngày` (tính toán ngày đã hiển thị rõ ở các mốc bắt đầu/kết thúc).
  - Bỏ badge `Khóa: CTK...` lặp lại ở đầu thẻ (đã có trường nhập liệu chính thức `Mã Lớp / Khóa áp dụng` bên dưới).
  - Hạn chế tối đa kiểu pill nền mờ viền mờ (`bg-primary/15 border-primary/30`) gây rối mắt trên nền Dark Mode.
* **Nút '+ Thêm mốc nộp bài':** `bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition`.
* **Tag 'Bắt buộc':** `bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#262626] dark:text-neutral-200 dark:border-neutral-700 text-xs px-2.5 py-1 rounded-md`.

### 4.4. Danh mục bài nộp (Deliverables Row Layout)
* Hiển thị mỗi bài nộp trên **1 hàng ngang duy nhất (Single Row)**:
  - `[Grip Icon]` $\rightarrow$ `[Ô nhập tên bài (#141414 flex-1)]` $\rightarrow$ `[Ô chọn hạn nộp (#141414 w-40)]` $\rightarrow$ `[Pill Bắt buộc/Tùy chọn]` $\rightarrow$ `[Trash Icon trần]`.

---

## 5. HƯỚNG DẪN THAY ĐỔI MÀU CHỦ ĐẠO TOÀN DỰ ÁN (SINGLE SOURCE OF TRUTH)

Màu chủ đạo được cấu hình tập trung tại **duy nhất 1 tệp tin**: `probase-app/src/app/globals.css`.

Để thay đổi màu chủ đạo (ví dụ: chuyển từ xanh dương `#3b82f6` sang tím Indigo, xanh ngọc, hoặc cam):
1. Mở file [globals.css](file:///d:/bao/workspace/probase/probase-app/src/app/globals.css).
2. Tìm đến 2 dòng `--primary`:
   - Dòng 87 (trong `:root` - Light Mode): `--primary: #3b82f6;`
   - Dòng 148 (trong `.dark` - Dark Mode): `--primary: #3b82f6;`
3. Đổi giá trị `#3b82f6` thành mã màu mong muốn (ví dụ: `#6366f1` cho Indigo, `#10b981` cho Emerald).
4. Ngay lập tức, tất cả các thành phần sau sẽ tự động cập nhật:
   - Chữ tab được chọn & viền tab (`text-primary`, `border-primary/40`)
   - Badge Khóa sinh viên `Khóa: CTK...` (`text-primary`, icon `text-primary`, viền `border-primary/30`)
   - Tag Thời lượng (`text-primary`, `bg-primary/15`)
   - Nút `+ Thêm mốc nộp bài` (`bg-primary`, `hover:bg-primary/90`)
   - Nút `Lưu cấu hình` (`bg-primary`, `hover:bg-primary/90`)
   - Checkbox kích hoạt đợt đồ án (`accent-primary`)
   - Viền xanh khi focus vào ô input (`focus:border-primary`, `focus:ring-primary`)
   - Các icon mốc thời gian (`text-primary`)
