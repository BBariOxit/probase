# Luồng Hoạt Động Vận Hành Thực Tế Hiện Tại Của ProBase
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)

> **Mục đích tài liệu:** Ghi nhận đầy đủ và chính xác **toàn bộ luồng nghiệp vụ đang vận hành thực tế trên hệ thống ProBase**: từ khâu khởi tạo học kỳ, phân quyền, nạp danh sách sinh viên, xây dựng và thẩm định ngân hàng đề tài (3 tab), đăng ký/phân bổ đề tài, duyệt đề cương M03, theo dõi tiến độ, tiếp nhận bài nộp đến lưu trữ số hóa và thống kê báo cáo.
>
> **Phạm vi thực tế:** Tài liệu chỉ phản ánh đúng các chức năng đang triển khai và vận hành ổn định trên mã nguồn hiện tại. Các phân hệ **Báo cáo & Nhận xét (M02/M04/M05)**, **Chấm điểm tiến độ/Hội đồng bảo vệ**, và **Phân công Giảng viên phản biện (GVPB)** đã được loại bỏ khỏi phạm vi xử lý của hệ thống.

---

## 1. CÁC NGUYÊN TẮC NGHIỆP VỤ CỐT LÕI (KHOA CNTT - DLU)

1. **Lộ trình đào tạo & 2 Chuyên ngành chính thức:**
   - Khoa CNTT – DLU tuyển sinh 1 ngành chung: **Công nghệ Thông tin** (`7480201`).
   - **Năm 1 & Năm 2 (ví dụ khóa K48, K49):** Sinh viên học chung đại cương và cơ sở ngành (`majorId = null`), làm **Đồ án cơ sở (`ĐACS`)** chung ngân hàng đề tài cơ sở.
   - **Từ năm thứ 3:** Sinh viên phân vào đúng **2 Chuyên ngành**:
     - `KTPM`: **Kỹ thuật phần mềm** (mã lớp dạng `CTK46PM`, `CTK47PM`).
     - `MMT`: **Mạng máy tính** (mã lớp dạng `CTK46MMT`, `CTK47MMT`).
   - **Năm 3 (`ĐACN`) và Năm 4 (`KLTN`):** Lọc đề tài, thẩm định chuyên môn và phân bổ đúng theo chuyên ngành của sinh viên và giảng viên phụ trách.

2. **Quản lý Đợt đồ án theo Học kỳ × Loại đồ án (`RegistrationRound`):**
   - Mỗi học kỳ rút gọn theo định dạng chuẩn (`HKI-2026-2027`, `HKII-2025-2026`) có các đợt riêng biệt: `ĐACS`, `ĐACN`, `KLTN` gắn với các khóa áp dụng.
   - Thời gian thực hiện chuẩn 3 tháng, mở cổng đăng ký cuốn chiếu trước thời điểm bắt đầu.

3. **Quy mô nhóm đồ án:** Mỗi nhóm đồ án gồm từ **1 đến 3 sinh viên**.

4. **Chữ ký thẩm định Đề cương M03:** Sinh viên tải mẫu M03 chuẩn Khoa CNTT – DLU, in bản giấy xin chữ ký sống trực tiếp của GVHD, sau đó scan thành 1 file PDF duy nhất để nộp lên hệ thống.

5. **Phân quyền vai trò linh hoạt (RBAC & Quyền kiêm nhiệm):**
   - Ngoài 3 vai trò gốc (`ADMIN`, `LECTURER`, `STUDENT`), giảng viên có thể đảm nhiệm chức vụ kiêm nhiệm: **Tổ trưởng Bộ môn (`TTBM`)**, **Giáo viên chủ nhiệm (`GVCN`)**, **Trợ lý Giáo vụ (`TLGV`)** cùng ma trận phân quyền chi tiết (`RolePermission` & `UserPermission`).
   - Ban Chủ nhiệm Khoa ký duyệt hành chính trên văn bản giấy ngoài hệ thống dựa trên danh sách/tờ trình do Giáo vụ xuất từ hệ thống.

---

## 2. SƠ ĐỒ LUỒNG ĐI QUA CÁC TÁC NHÂN

```
[BƯỚC 0: Admin / Giáo vụ Khoa]
   │ Tạo Học kỳ (Active), Đợt đồ án (ĐACS / ĐACN / KLTN), Danh mục & Phân quyền (TTBM / GVCN)
   ▼
[BƯỚC 1: Giáo vụ Khoa (TLGV / Admin)]
   │ Import Excel SV đủ ĐK từ PĐT ➔ Tự động cấp tài khoản & gắn cờ RoundStudentEligibility
   ▼
[BƯỚC 2: Toàn bộ GV & Sinh viên]
   │ Đăng nhập hệ thống (Google SSO @dlu.edu.vn / tài khoản cấp sẵn) ➔ Phân luồng theo vai trò
   ▼
[BƯỚC 3: GVHD ➔ TTBM ➔ Giáo vụ / GVCN]
   │ • GVHD soạn đề tài mới hoặc nhân bản từ Kho đề tài cũ, tham khảo Đề tài đồng nghiệp (kể cả Draft)
   │ • TTBM thẩm định chuyên môn (APPROVED) ➔ Giáo vụ / GVCN mở cổng đăng ký (OPEN)
   ▼
[BƯỚC 4: Sinh viên ➔ GVHD / Giáo vụ / GVCN]
   │ • SV chọn đề tài mở & lập nhóm (1–3 SV qua Join Code) hoặc gửi Đề xuất đề tài mới cho GVHD
   │ • Giáo vụ / GVCN phân bổ đề tài cho các sinh viên còn chưa có nhóm (/admin/allocations)
   ▼
[BƯỚC 5: Nhóm SV ➔ GVHD ➔ Giáo vụ Khoa]
   │ Tải mẫu M03 ➔ Xin chữ ký sống GVHD ➔ Nộp PDF scan ➔ GVHD duyệt ➔ Giáo vụ xuất Tờ trình
   ▼
[BƯỚC 6: Giai đoạn Thực hiện đồ án & Bài nộp]
   │ • SV cập nhật Sổ tay tiến độ (/student/progress) và nộp các mốc tài liệu (/student/submissions)
   │ • GVHD theo dõi nhóm hướng dẫn (/lecturer/groups); Giáo vụ quản lý bài nộp (/admin/submissions)
   ▼
[BƯỚC 7: Lưu trữ số hóa & Thống kê báo cáo]
   │ • Quản lý & kiểm duyệt Kho lưu trữ số hóa 3 thành phần (/admin/archives)
   │ • Thống kê báo cáo tổng hợp (/admin/reports) & Nhật ký kiểm toán hệ thống (/admin/audit)
```

---

## 3. CHI TIẾT TỪNG BƯỚC VẬN HÀNH TRÊN HỆ THỐNG

### BƯỚC 0: THIẾT LẬP HỌC KỲ, ĐỢT ĐỒ ÁN, DANH MỤC & PHÂN QUYỀN

* **Ai thực hiện:** Quản trị viên / Trợ lý Giáo vụ Khoa (`ADMIN`).
* **Màn hình giao diện:**
  - Quản lý Học kỳ & Đợt đồ án: `/admin/semesters`, `/admin/semesters/[id]`
  - Danh mục nền tảng (Chuyên ngành `KTPM`/`MMT`, Loại đồ án `ĐACS`/`ĐACN`/`KLTN`): `/admin/catalogues`
  - Quản lý Tài khoản: `/admin/accounts`
  - Quản lý Giảng viên & Phân quyền vai trò: `/admin/lecturers` (2 tab: **Giảng viên** | **Vai trò & Quyền hạn**)
* **Chức năng chính:**
  1. Khởi tạo và kích hoạt duy nhất 1 học kỳ đang hoạt động (`isActive = true`).
  2. Cấu hình các Đợt đồ án (`RegistrationRound`) theo từng loại (`ĐACS`, `ĐACN`, `KLTN`), khóa áp dụng, mốc thời gian đăng ký, hạn nộp M03 và danh sách yêu cầu bài nộp (`SubmissionRequirement`).
  3. Phân bổ giảng viên vào tổ chuyên môn (`KTPM` / `MMT`), gán vai trò kiêm nhiệm (`TTBM`, `GVCN`, `GVHD`) và tùy chỉnh quyền hạn chi tiết qua Ma trận phân quyền (`RolePermission`, `UserPermission`).

---

### BƯỚC 1: TIẾP NHẬN DANH SÁCH PĐT & IMPORT SV ĐỦ ĐIỀU KIỆN

* **Ai thực hiện:** Trợ lý Giáo vụ Khoa (`ADMIN`).
* **Màn hình giao diện:** `/admin/students` (**Quản lý Sinh viên**).
* **Chức năng chính:**
  1. Tải file mẫu Excel và Import danh sách sinh viên đủ điều kiện theo từng đợt (`RoundStudentEligibility`).
  2. Tự động nhận diện khóa nhập học và chuyên ngành từ mã lớp (`CTK48` → chưa chia ngành; `CTK46PM` → `KTPM`; `CTK46MMT` → `MMT`), tự động khởi tạo tài khoản nếu chưa tồn tại.
  3. Tìm kiếm & lọc nâng cao bằng **Bộ lọc gộp (`AdvancedFilterPopover`)** kết hợp **Active Filter Chips** (`Đang lọc: ... ↺ Xóa hết`) theo Mã lớp, Tình trạng đề tài, Đợt đăng ký, Chuyên ngành, Giảng viên hướng dẫn.
  4. Thêm sinh viên thủ công hoặc Xuất Excel đối soát với Phòng Đào tạo.

---

### BƯỚC 2: ĐĂNG NHẬP & PHÂN LUỒNG TRẢI NGHIỆM

* **Ai thực hiện:** Toàn bộ người dùng (`ADMIN`, `LECTURER`, `GVCN`, `STUDENT`).
* **Màn hình giao diện:** `/login`, `/profile`, `/change-password`, `/notifications`.
* **Chức năng chính:**
  - Đăng nhập qua Google Workspace DLU (`@dlu.edu.vn`) hoặc tài khoản mật khẩu nội bộ (kèm luồng đổi mật khẩu / quên mật khẩu).
  - Sinh viên đủ điều kiện được mở toàn quyền đăng ký đề tài và lập nhóm; sinh viên chưa có trong danh sách đợt bị khóa thao tác đăng ký.

---

### BƯỚC 3: QUẢN LÝ ĐỀ TÀI GIẢNG VIÊN (3 TAB), THẨM ĐỊNH BỘ MÔN & MỞ CỔNG

* **Ai thực hiện:** Giảng viên (`GVHD`) → Tổ trưởng Bộ môn (`TTBM`) → Giáo vụ (`ADMIN`) / Giáo viên chủ nhiệm (`GVCN`).
* **Màn hình giao diện:**
  - Giảng viên: `/lecturer` (**Quản lý đề tài — Kiến trúc 3 Tab**), `/lecturer/topics/new`, `/lecturer/topics/[id]`
  - Tổ trưởng Bộ môn: `/lecturer/topic-reviews` (**Duyệt đề tài**)
  - Giáo vụ / GVCN: `/admin/topic-registry` (**Quản lý đề tài toàn khoa**)
* **Quy trình chi tiết:**
  1. **Kiến trúc 3 Tab tại trang Giảng viên (`/lecturer`):**
     - **Tab 1 — Đề tài của tôi:** Quản lý đề tài học kỳ hiện tại của chính giảng viên. Hỗ trợ tạo mới, lưu nháp (`DRAFT`), gửi duyệt lẻ hoặc gửi duyệt hàng loạt (`POST /topics/submit-drafts`, tự động duyệt `APPROVED` nếu người gửi là TTBM cùng chuyên ngành), sửa, xóa, thu hồi bản nháp.
     - **Tab 2 — Kho đề tài cũ:** Tra cứu đề tài từ các học kỳ trước (`excludeSemesterId`). Mặc định lọc theo bản thân, cho phép chuyển sang *"Tất cả giảng viên"* hoặc chọn một đồng nghiệp cụ thể để tham khảo. Tích hợp tính năng **Nhân bản sang kỳ này** (`POST /topics/:id/clone`) nằm gọn trong menu ba chấm (`...`) giúp sao chép bất kỳ đề tài cũ nào thành bản nháp mới trong học kỳ hiện tại (cho phép tinh chỉnh tên đề tài, loại đồ án, chuyên ngành, số SV tối đa).
     - **Tab 3 — Đề tài đồng nghiệp:** Tra cứu đề tài học kỳ hiện tại của các giảng viên khác (`excludeLecturerId`). **Hiển thị cả đề tài ở trạng thái `Bản nháp` (`includeDrafts=true`)** để giảng viên sớm nắm bắt hướng đề tài đồng nghiệp đang soạn và tránh trùng lặp. Chế độ chỉ xem chi tiết (`TopicDetailSheet`).
     - Cả 3 tab dùng chung **Bộ lọc nâng cao (`AdvancedFilterPopover`)** + hàng chip lọc, bảng chuẩn header navy với các cột rút gọn (`HKI-2026-2027`, `KLTN`/`ĐACN`/`ĐACS`, `KTPM`/`MMT`).
  2. **Tổ trưởng Bộ môn thẩm định (`/lecturer/topic-reviews`):**
     - Rà soát chuyên môn và kiểm tra mức độ tương đồng/trùng lặp (`Similarity Check`) cho các đề tài thuộc chuyên ngành mình phụ trách (`KTPM` hoặc `MMT`).
     - Thực hiện: **Chấp thuận (`APPROVED`)**, **Yêu cầu chỉnh sửa (`DRAFT` kèm góp ý)**, hoặc **Từ chối (`REJECTED`)**.
  3. **Giáo vụ / GVCN công bố (`/admin/topic-registry`):**
     - Theo dõi toàn bộ danh mục đề tài, xuất file trình ký giấy (Lần 1 — ngoài hệ thống), mở/đóng đăng ký đơn lẻ hoặc mở đăng ký đồng loạt (`APPROVED` → `OPEN`).

---

### BƯỚC 4: SINH VIÊN CHỌN ĐỀ TÀI, ĐỀ XUẤT, LẬP NHÓM & PHÂN BỔ ĐỀ TÀI

* **Ai thực hiện:** Sinh viên, GVHD, Giáo vụ (`ADMIN`), GVCN.
* **Màn hình giao diện:**
  - Sinh viên: `/student` (Tra cứu & Đăng ký), `/student/proposals` (Đề xuất đề tài mới), `/student/groups` (Nhóm của tôi), `/join/[code]` (Tham gia nhóm)
  - Giảng viên: `/lecturer/proposals` (**Đề xuất từ SV** — nhận hướng dẫn, nhận xét hoặc từ chối)
  - Giáo vụ / GVCN: `/admin/allocations` (**Phân bổ đề tài** cho sinh viên còn chưa có nhóm/đề tài)
* **Quy trình chi tiết:**
  - Sinh viên chọn đề tài đang mở đúng chuyên ngành, lập nhóm 1–3 thành viên qua Join Code/Link mời; hoặc gửi đề xuất đề tài mới đến GVHD nguyện vọng.
  - Sau khi đóng cổng đăng ký, Giáo vụ hoặc GVCN sử dụng màn hình `/admin/allocations` để rà soát sinh viên chưa có nhóm và xếp vào các đề tài còn chỗ trống, sau đó chốt đợt (`FINALIZED`).

---

### BƯỚC 5: NỘP & PHÊ DUYỆT ĐỀ CƯƠNG CHI TIẾT (MẪU M03)

* **Ai thực hiện:** Nhóm Sinh viên → GVHD → Giáo vụ Khoa (`ADMIN`).
* **Màn hình giao diện:** `/student/groups`, `/lecturer/outlines`, `/admin/outlines`.
* **Quy trình chi tiết:**
  1. Sinh viên tải biểu mẫu chuẩn M03, in giấy xin chữ ký sống của GVHD và upload file PDF scan lên hệ thống.
  2. GVHD xem trực tiếp PDF tại `/lecturer/outlines`, chọn **Phê duyệt** (chuyển đề tài sang `IN_PROGRESS` và khóa nộp lại) hoặc **Yêu cầu chỉnh sửa** kèm nhận xét.
  3. Giáo vụ theo dõi tiến độ nộp M03 toàn khoa tại `/admin/outlines` và xuất danh sách chính thức trình ký Quyết định giao đề tài (Lần 2 — văn bản giấy ngoài hệ thống).

---

### BƯỚC 6: THEO DÕI TIẾN ĐỘ NHÓM & QUẢN LÝ BÀI NỘP

* **Ai thực hiện:** Nhóm Sinh viên, GVHD, Giáo vụ Khoa (`ADMIN`).
* **Màn hình giao diện:**
  - Sinh viên: `/student/progress` (Nhật ký tiến độ tuần), `/student/submissions` (Nộp tài liệu theo mốc yêu cầu của đợt)
  - Giảng viên: `/lecturer/groups`, `/lecturer/groups/[id]` (Theo dõi danh sách nhóm hướng dẫn, thành viên và tiến độ thực hiện)
  - Giáo vụ: `/admin/submissions` (Theo dõi tình hình nộp tài liệu toàn khoa theo các mốc `SubmissionRequirement`)

---

### BƯỚC 7: KHO LƯU TRỮ SỐ HÓA, BÁO CÁO THỐNG KÊ & NHẬT KÝ HỆ THỐNG

* **Ai thực hiện:** Giáo vụ Khoa / Quản trị hệ thống (`ADMIN`).
* **Màn hình giao diện:**
  - `/admin/archives`: Quản lý kho lưu trữ số hóa các học kỳ trước (`SOURCE`, `DATABASE`, `THESIS`), kiểm duyệt xác nhận lưu trữ và xuất Excel.
  - `/admin/reports`: Dashboard thống kê và xuất báo cáo tổng hợp theo học kỳ.
  - `/admin/audit`: Nhật ký lịch sử thao tác hệ thống (`AuditLog`).

---

## 4. BẢNG TỔNG HỢP PHÂN QUYỀN VÀ MÀN HÌNH THEO VAI TRÒ

| Vai trò | Màn hình truy cập thực tế | Chức năng chính |
| :--- | :--- | :--- |
| **Giáo vụ Khoa (`ADMIN`)** | `/admin/topic-registry`, `/admin/allocations`, `/admin/submissions`, `/admin/outlines`, `/admin/archives`, `/admin/lecturers`, `/admin/students`, `/admin/accounts`, `/admin/semesters`, `/admin/catalogues`, `/admin/reports`, `/admin/audit` | Quản lý học kỳ/đợt, danh mục, tài khoản, ma trận phân quyền, import SV đủ ĐK, mở đăng ký đề tài, phân bổ SV, theo dõi đề cương M03 & bài nộp, kiểm duyệt kho lưu trữ số hóa, xuất báo cáo và xem audit log. |
| **Giảng viên hướng dẫn (`LECTURER`)** | `/lecturer`, `/lecturer/groups`, `/lecturer/outlines`, `/lecturer/proposals`, `/lecturers` | Quản lý đề tài 3 tab (Đề tài của tôi, Kho đề tài cũ & Nhân bản, Đề tài đồng nghiệp kể cả Draft), quản lý nhóm hướng dẫn, duyệt đề cương M03, tiếp nhận/từ chối đề xuất từ SV, tra cứu danh bạ giảng viên. |
| **Tổ trưởng Bộ môn (`TTBM`)** | Toàn bộ quyền `LECTURER` + `/lecturer/topic-reviews` | Thẩm định chuyên môn đề tài thuộc tổ bộ môn (`KTPM` / `MMT`), kiểm tra trùng lặp, duyệt thẳng đề tài tự đề xuất cùng chuyên ngành. |
| **Giáo viên chủ nhiệm (`GVCN`)** | Toàn bộ quyền `LECTURER` + `/admin/topic-registry`, `/admin/allocations` | Hỗ trợ theo dõi danh mục đề tài và thực hiện phân bổ sinh viên chưa có nhóm vào đề tài còn chỗ trong đợt. |
| **Sinh viên (`STUDENT`)** | `/student`, `/student/proposals`, `/student/groups`, `/student/submissions`, `/student/progress`, `/join/[code]` | Tra cứu & đăng ký đề tài theo chuyên ngành, gửi đề xuất đề tài mới, quản lý nhóm 1–3 bạn, nộp đề cương M03, cập nhật nhật ký tiến độ và nộp bài theo các mốc yêu cầu. |
