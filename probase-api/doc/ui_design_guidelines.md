# BỘ NGUYÊN TẮC THIẾT KẾ GIAO DIỆN CHUẨN PROBASE (UI/UX DESIGN SYSTEM)
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)
### Phong cách: Matte Obsidian & Neutral Stone (Enterprise Clean UI)

> **Mục tiêu:** Xây dựng giao diện ProBase đồng nhất, sắc nét, có độ tương phản cao, tập trung vào nghiệp vụ thực tế, loại bỏ hoàn toàn các chi tiết rườm rà kiểu "AI sinh code thô" (badge lòe loẹt, hộp lồng hộp, văn phong kể lể, chữ quá nhỏ).

---

## 1. NGUYÊN TẮC CỐT LÕI & TẨY "MÙI AI" (DE-AI POLISH)

### 1.1. Không "Hộp lồng Hộp" (No Card-in-Card)
* Không bọc các thành phần lồng nhau nhiều lớp viền (`Card > Card > Card`).
* Mỗi màn hình/khu vực chỉ có 1 khung bề mặt chính; các nhóm thông tin phân tách tự nhiên bằng khoảng trống (`gap-6`, `space-y-6`) hoặc đường kẻ mảnh (`border-t border-slate-200 dark:border-neutral-800`).

### 1.2. Loại bỏ Emoji, Badge AI thừa & Văn phong kể lể
* Không dùng emoji trong nhãn/trạng thái; sử dụng 100% vector icon từ `lucide-react`.
* Không viết mô tả hướng dẫn dài dòng, các câu văn nói kiểu chatbot hoặc khung thông tin lặp lại (ví dụ: không hiện lại khung tên đề tài cũ trong modal nhân bản, không gắn nhãn `(Tôi)` sau tên giảng viên, không hiện banner thừa).
* Hạn chế tối đa các pill/badge bo viền mờ rải rác: ưu tiên hiển thị trạng thái bằng **chữ màu sạch** (`StatusPill variant="text"`) để giảm nhiễu thị giác.

### 1.3. Chuẩn hóa dữ liệu & Rút gọn hiển thị trong bảng (`lib/utils.ts`)
* **Tên giảng viên (`sanitizeLecturerName`):** Tự động loại bỏ học vị trùng lặp (`ThS. ThS.`) và tách riêng chức vụ bộ môn.
* **Học kỳ (`formatSemesterShort`):** Rút gọn tên học kỳ dài thành định dạng ngắn gọn `HKI-2026-2027`, `HKII-2023-2024` để tránh tràn cột.
* **Loại đồ án (`formatProjectTypeShort`):** Hiển thị viết tắt `KLTN`, `ĐACN`, `ĐACS` (hover tooltip hiện tên đầy đủ).
* **Chuyên ngành (`formatMajorShort`):** Hiển thị viết tắt `KTPM` (*Kỹ thuật phần mềm*), `MMT` (*Mạng máy tính*), `Chung` (hover tooltip hiện tên đầy đủ).

### 1.4. Màu chủ đạo thống nhất bằng CSS Variables
* Toàn bộ thành phần nhận diện thương hiệu (CTA chính, Tab gạch chân active, trạng thái `Hoàn thành` / `Đang thực hiện`, Focus Ring, Checkbox) dùng biến `--primary` tại `probase-app/src/app/globals.css`.

---

## 2. HỆ THỐNG MÀU SẮC MATTE OBSIDIAN & NEUTRAL STONE

```
┌────────────────────────────────────────────────────────────────────────┐
│               MATTE OBSIDIAN & NEUTRAL STONE SYSTEM                    │
├──────────────────────┬─────────────────────────────────────────────────┤
│ LIGHT MODE           │ DARK MODE                                       │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Canvas: #f8fafc      │ Canvas: #121212 (bg-[#121212])                  │
│ Card:   #ffffff      │ Card:   #1e1e1e / #18181b                       │
│ Primary: #3b82f6     │ Primary: #3b82f6 (Đồng nhất Light & Dark)       │
│ Inputs: #ffffff      │ Inputs: #141414 (viền neutral-700)              │
│ Text:   #0f172a      │ Text:   #f5f5f5 (neutral-100) / #d4d4d4 (Label) │
└──────────────────────┴─────────────────────────────────────────────────┘
```

* **Sidebar Midnight:** Duy trì nền tối `#090d16` đồng nhất trên cả Light và Dark mode.
* **Viền ô nhập liệu:** Light `border-[1.5px] border-slate-300 bg-white`, Dark `border-[1.5px] border-neutral-700 bg-[#141414]`, focus `focus:border-primary focus:ring-1 focus:ring-primary`.

---

## 3. QUY CHUẨN CÁC COMPONENT DÙNG CHUNG

### 3.1. Thanh Điều hướng Tabs cấp trang (Underline Page Tabs)
Áp dụng đồng nhất cho trang **Phân quyền (`/admin/lecturers`)** và **Quản lý đề tài Giảng viên (`/lecturer`)**:
* Container: `flex items-center gap-8 border-b border-border/60 pb-3`.
* Nút Tab: chữ to, đậm (`text-xl font-bold tracking-tight`), không bọc khung bubble.
* Trạng thái Active: `text-foreground` kèm thanh gạch chân 3px màu primary (`after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-primary`).
* Count badge (nếu có): `px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary`.

### 3.2. Bộ lọc Gộp Nâng cao (`AdvancedFilterPopover`) & Active Filter Chips
Áp dụng thống nhất trên `/admin/students`, `/admin/archives`, và cả 3 tab `/lecturer`:
* **Hàng công cụ chính:** Ô tìm kiếm từ khóa (`h-9.5 text-sm`) + Nút **Bộ lọc** (`AdvancedFilterPopover` kèm badge đếm số bộ lọc đang bật) + Tổng số bản ghi & các nút CTA bên phải. Không dàn trải quá nhiều dropdown ngang làm chật màn hình.
* **Bên trong Popover (`w-96 p-5 space-y-4`):**
  * Tiêu đề `text-base font-bold`.
  * Toàn bộ nhãn trường lọc (`Label`): `text-sm font-semibold text-slate-800 dark:text-neutral-200`.
  * Toàn bộ ô nhập (`Input`, `SelectTrigger`, `Combobox`): đồng bộ chiều cao `h-9.5` và cỡ chữ `text-sm`, item bên trong `text-sm`.
  * Nút **Xem kết quả**: `w-full h-9.5 text-sm font-semibold bg-primary text-white`.
* **Hàng Active Filter Chips:** Khi có bộ lọc đang kích hoạt, hiển thị ngay bên dưới thanh công cụ:
  `Đang lọc: [ Kỳ: HKII-2023-2024 ✕ ] [ GV: TS. An Bình ✕ ] ↺ Xóa hết`.

### 3.3. Bảng dữ liệu chuẩn (`components/ui/table.tsx`)
* **Header bảng:** Luôn sử dụng `<TableHeader sticky>` mặc định (nền đậm `bg-slate-900 text-slate-100` ở Light mode, `dark:bg-neutral-100 dark:text-neutral-900` ở Dark mode). Không tự override nền sáng trên từng trang.
* **Typography & Căn lề:**
  * Nội dung ô bảng dùng cỡ chữ chuẩn `text-sm` để dễ đọc; số liệu sĩ số/chỗ dùng `font-mono font-semibold text-sm`.
  * Cột dữ liệu ngắn (`Chỗ`, `Nguồn gốc`, gạch ngang `—`) căn giữa rõ ràng.
  * Tên đề tài dài giới hạn `line-clamp-2` kèm thuộc tính `title` để xem đầy đủ khi hover.
* **Thao tác dòng (`RowActions`):** Gom các hành động (Xem chi tiết, Nhân bản sang kỳ này, Sửa, Thu hồi, Xóa) vào menu ba chấm (`MoreHorizontal` + `DropdownMenu`). Giữ nguyên cỡ chữ chuẩn `text-sm` của `DropdownMenuItem`, không thu nhỏ xuống `text-xs`.

### 3.4. Trạng thái (`StatusPill` / `TopicStatusBadge`)
* Ưu tiên `variant="text"` (chữ màu sạch, không đóng khung badge nặng nề) trong bảng và thẻ đề xuất:
  * **Hoàn thành / Đang thực hiện (`active`):** Màu `text-primary font-medium`.
  * **Đang mở / Đã duyệt (`success`):** Màu xanh ngọc `text-green-600 dark:text-green-400`.
  * **Chờ duyệt (`waiting`):** Màu hổ phách `text-amber-600 dark:text-amber-400`.
  * **Bị từ chối (`danger`):** Màu đỏ `text-rose-600 dark:text-rose-400`.
  * **Bản nháp (`idle`):** Màu trung tính `text-slate-500 dark:text-neutral-400`.

### 3.5. Hộp thoại Form (`Dialog`)
* Bề rộng thoáng (`sm:max-w-xl p-6 gap-5`), trường tiêu đề dài dùng `Textarea` (2 dòng) thay vì `Input` 1 dòng bị khuất chữ.
* Nhãn `text-sm font-semibold`, ô nhập `h-10 text-sm`, nút bấm `h-10 px-4 text-sm`.
* Footer căn khít sát viền hộp thoại (`-mx-6 -mb-6 px-6 py-4 gap-2.5`).
