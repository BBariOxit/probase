# Phân tích Yêu cầu Chức năng (FR) và Phi Chức năng (NFR)
## Hệ thống Quản lý Đồ án - Khoa Công nghệ Thông tin (Trường Đại học Đà Lạt - DLU)

Tài liệu này định nghĩa chi tiết các yêu cầu nghiệp vụ, vai trò tác nhân và quy tắc kiểm tra (Business Rules) đang được áp dụng và vận hành thực tế trên hệ thống ProBase tại Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt.

> **Phạm vi xử lý:** Hệ thống tập trung trọn vẹn vào quy trình tổ chức đợt đồ án, nạp sinh viên đủ điều kiện, xây dựng & thẩm định ngân hàng đề tài, đăng ký/phân bổ đề tài, duyệt đề cương M03, theo dõi tiến độ, thu nhận bài nộp, lưu trữ số hóa và báo cáo giáo vụ. Các phân hệ **Báo cáo & Nhận xét (M02/M04/M05)**, **Chấm điểm tiến độ / Hội đồng bảo vệ**, và **Phân công Giảng viên phản biện (GVPB)** không thuộc phạm vi xử lý của hệ thống.

---

## 1. BỐI CẢNH & MÔ HÌNH TỔ CHỨC KHOA CNTT - DLU

1. **Ngành đào tạo chung:**
   - Khoa CNTT – Đại học Đà Lạt tuyển sinh ngành **Công nghệ Thông tin** (`7480201`).
   - Khóa sinh viên định danh theo năm nhập học: `CTK44`, `CTK45`, `CTK46`, `CTK47`, `CTK48`...
   - Hai năm đầu học chung đại cương & cơ sở ngành (mã lớp chưa phân chuyên ngành).

2. **Hai Chuyên ngành đào tạo (từ năm thứ 3):**
   - **Kỹ thuật phần mềm** (Mã viết tắt: `KTPM`, mã lớp dạng `CTK46PM`).
   - **Mạng máy tính** (Mã viết tắt: `MMT`, mã lớp dạng `CTK46MMT`).
   - Tương ứng với 2 tổ bộ môn chuyên trách do **Tổ trưởng Bộ môn (`TTBM`)** phụ trách.

3. **Ba loại đồ án:**
   - **Đồ án cơ sở (`ĐACS`)**: Dành cho sinh viên năm 2.
   - **Đồ án chuyên ngành (`ĐACN`)**: Dành cho sinh viên năm 3 theo chuyên ngành `KTPM` hoặc `MMT`.
   - **Khóa luận tốt nghiệp (`KLTN`)**: Dành cho sinh viên năm cuối.

---

## 2. XÁC ĐỊNH 5 TÁC NHÂN TRÊN HỆ THỐNG (ACTORS)

> **Lưu ý về Ban Chủ nhiệm Khoa:** BCN Khoa không sử dụng tài khoản riêng trên hệ thống. Việc ký duyệt hành chính thực hiện trên văn bản giấy ngoài hệ thống ở 2 mốc (Danh mục đề tài & Quyết định giao đề tài sau Đề cương M03) từ file xuất của Giáo vụ Khoa.

| STT | Tác nhân (Actor) | Vai trò và trách nhiệm trên hệ thống |
| :---: | :--- | :--- |
| **1** | **Trợ lý Giáo vụ Khoa (`ADMIN` / `TLGV`)** | Thiết lập học kỳ, đợt đồ án (`ĐACS`/`ĐACN`/`KLTN`) và mốc yêu cầu bài nộp; quản lý tài khoản, giảng viên và ma trận phân quyền RBAC; import Excel sinh viên đủ điều kiện; mở cổng đăng ký đề tài; phân bổ SV chưa có nhóm; quản lý đề cương M03, bài nộp, kho lưu trữ số hóa, báo cáo thống kê và nhật ký hệ thống. |
| **2** | **Tổ trưởng Bộ môn (`TTBM`)** | Phụ trách chuyên môn 1 trong 2 tổ (`KTPM` hoặc `MMT`); thẩm định đề tài giảng viên đề xuất (`PENDING_DEPARTMENT` → `APPROVED` / `DRAFT` / `REJECTED`), kiểm tra trùng lặp; đề tài do chính TTBM tạo cùng chuyên ngành được tự động phê duyệt khi gửi duyệt. |
| **3** | **Giáo viên chủ nhiệm (`GVCN`)** | Có đầy đủ quyền của giảng viên, đồng thời được cấp quyền quản lý danh mục đề tài (`/admin/topic-registry`) và hỗ trợ phân bổ đề tài cho sinh viên còn chưa có nhóm (`/admin/allocations`). |
| **4** | **Giảng viên hướng dẫn (`LECTURER` / `GVHD`)** | Quản lý đề tài theo 3 tab (Đề tài của tôi, Kho đề tài cũ có nhân bản, Đề tài đồng nghiệp có xem bản nháp); duyệt đề xuất đề tài từ sinh viên; quản lý nhóm hướng dẫn; xem và phê duyệt Đề cương M03. |
| **5** | **Sinh viên (`STUDENT` / Nhóm 1–3 SV)** | Đăng nhập, tra cứu và đăng ký đề tài đúng chuyên ngành; lập nhóm 1–3 bạn qua Join Code; gửi đề xuất đề tài mới cho GVHD; nộp bản scan Đề cương M03; cập nhật sổ tay tiến độ và nộp tài liệu theo các mốc quy định của đợt. |

---

## 3. CHI TIẾT CÁC YÊU CẦU NGHIỆP VỤ (BUSINESS REQUIREMENTS)

### Phân hệ 1: Quản trị Học kỳ, Danh mục, Phân quyền & Sinh viên đủ điều kiện

#### BR-01: Quản lý Học kỳ, Đợt đồ án & Yêu cầu bài nộp
- Tạo/kích hoạt duy nhất 1 học kỳ đang diễn ra (hiển thị rút gọn `HKI-2026-2027`).
- Cấu hình từng Đợt đồ án (`RegistrationRound`) theo cặp `(Học kỳ × Loại đồ án)`, gán khóa áp dụng (`RoundEligibility`), thiết lập cửa sổ đăng ký, hạn nộp đề cương M03 và danh sách mốc tài liệu cần nộp (`SubmissionRequirement`).

#### BR-02: Phân quyền Vai trò & Quyền tùy biến (RBAC Matrix)
- Quản trị viên quản lý danh sách giảng viên theo chuyên ngành (`KTPM`/`MMT`), phân vai trò kiêm nhiệm (`GVHD`, `TTBM`, `GVCN`).
- Cấu hình chi tiết quyền hạn theo vai trò (`RolePermission`) và ghi đè quyền riêng lẻ theo từng cá nhân (`UserPermission`) ngay tại màn hình `/admin/lecturers`.

#### BR-03: Import & Quản lý Danh sách Sinh viên đủ điều kiện
- Giáo vụ chọn Đợt đồ án, tải mẫu và import file Excel/CSV từ Phòng Đào tạo.
- Tự động tách khóa, nhận diện chuyên ngành (`KTPM`/`MMT`) theo hậu tố mã lớp, tự động tạo tài khoản sinh viên mới và kích hoạt `RoundStudentEligibility`.
- Hỗ trợ thêm SV thủ công, xuất Excel đối soát và tìm kiếm qua **Bộ lọc gộp nâng cao (`AdvancedFilterPopover`)** kèm **Active Filter Chips**.

---

### Phân hệ 2: Quản lý Ngân hàng Đề tài, Thẩm định & Đăng ký

#### BR-04: Quản lý Đề tài Giảng viên (Kiến trúc 3 Tab) & Nhân bản đề tài cũ
- **Tab 1 — Đề tài của tôi:** Soạn mới (tên, mô tả, mục tiêu, kết quả dự kiến, công nghệ, loại đồ án, chuyên ngành `KTPM`/`MMT`, số SV tối đa 1–3), lưu nháp (`DRAFT`), gửi duyệt từng đề tài hoặc gửi duyệt hàng loạt (`POST /topics/submit-drafts`), sửa/xóa/thu hồi bản nháp.
- **Tab 2 — Kho đề tài cũ:** Tra cứu đề tài các học kỳ trước (`excludeSemesterId`), mặc định lọc theo chính mình nhưng cho phép mở rộng sang *"Tất cả giảng viên"* hoặc một đồng nghiệp bất kỳ. Tích hợp chức năng **Nhân bản sang kỳ này (`POST /topics/:id/clone`)** giúp sao chép bất kỳ đề tài cũ nào thành bản nháp mới trong học kỳ hiện tại và tinh chỉnh tiêu đề/loại đồ án/chuyên ngành/số lượng SV.
- **Tab 3 — Đề tài đồng nghiệp:** Tra cứu đề tài học kỳ hiện tại của các giảng viên khác (`excludeLecturerId`), **hiển thị cả các đề tài đang ở trạng thái `Bản nháp` (`includeDrafts=true`)** để hạn chế trùng lặp ý tưởng ngay từ giai đoạn ra đề. Chế độ chỉ đọc.

#### BR-05: Kiểm tra tương đồng đề tài & Thẩm định cấp Bộ môn (TTBM)
- Hệ thống đối chiếu độ tương đồng nội dung đề tài (`GET /topics/:id/similarity`) giúp TTBM phát hiện đề tài trùng lặp.
- TTBM thẩm định các đề tài thuộc chuyên ngành mình phụ trách (`KTPM` hoặc `MMT`): Chấp thuận (`APPROVED`), Yêu cầu chỉnh sửa (`DRAFT` kèm góp ý), hoặc Từ chối (`REJECTED`).
- Giáo vụ / GVCN quản lý danh mục đề tài đã duyệt tại `/admin/topic-registry`, xuất danh sách trình ký giấy (Lần 1) và mở đăng ký lẻ hoặc đồng loạt (`APPROVED` → `OPEN`).

#### BR-06: Sinh viên đăng ký đề tài, Lập nhóm (1–3 SV) & Đề xuất đề tài
- **Đăng ký đề tài có sẵn:** Sinh viên đủ điều kiện chọn đề tài đang mở đúng chuyên ngành, trở thành trưởng nhóm và chia sẻ Join Code / link `/join/[code]` mời thành viên (tối đa 3 SV/nhóm, mỗi SV tối đa 1 nhóm/đợt).
- **Sinh viên tự đề xuất đề tài:** Sinh viên tạo đề xuất kèm mô tả & chọn GVHD nguyện vọng (`/student/proposals`). GVHD xem tại `/lecturer/proposals` để nhận hướng dẫn, trao đổi nhận xét hoặc từ chối.

#### BR-07: Phân bổ đề tài cho Sinh viên chưa có nhóm
- Sau khi hết hạn đăng ký, Giáo vụ hoặc GVCN vào `/admin/allocations` để xem danh sách sinh viên chưa có nhóm và xếp vào các đề tài còn chỗ trống, sau đó chốt đợt.

---

### Phân hệ 3: Đề cương M03, Tiến độ, Bài nộp & Lưu trữ số hóa

#### BR-08: Nộp & Phê duyệt Đề cương chi tiết (Mẫu M03)
- Sinh viên tải biểu mẫu chuẩn M03, xin chữ ký sống GVHD trên bản giấy và upload bản scan PDF tại `/student/groups`.
- GVHD kiểm tra trực tiếp file PDF tại `/lecturer/outlines` để **Phê duyệt** (đề tài chuyển sang `IN_PROGRESS` và khóa nộp lại) hoặc **Yêu cầu chỉnh sửa** kèm nhận xét.
- Giáo vụ theo dõi toàn khoa tại `/admin/outlines` và xuất danh sách trình ký Quyết định giao đề tài (Lần 2).

#### BR-09: Theo dõi Tiến độ thực hiện & Quản lý Bài nộp
- Sinh viên ghi nhận nhật ký tiến độ công việc hàng tuần (`/student/progress`) và nộp các mốc tài liệu theo cấu hình đợt (`/student/submissions`).
- GVHD theo dõi danh sách nhóm hướng dẫn và tiến độ tại `/lecturer/groups`.
- Giáo vụ theo dõi tình hình nộp tài liệu toàn khoa tại `/admin/submissions`.

#### BR-10: Kho Lưu trữ số hóa & Thống kê Báo cáo
- Quản lý gói lưu trữ số hóa các học kỳ trước tại `/admin/archives` (`SOURCE`, `DATABASE`, `THESIS`), kiểm duyệt xác nhận lưu trữ và xuất Excel.
- Dashboard thống kê và xuất báo cáo tổng hợp tại `/admin/reports`.
- Theo dõi nhật ký kiểm toán các thao tác hệ thống tại `/admin/audit`.

---

### Phân hệ 4: Xác thực & Thông báo

#### BR-11: Xác thực & Quản lý Tài khoản
- Hỗ trợ đăng nhập Google OAuth2 (`@dlu.edu.vn`) và tài khoản mật khẩu nội bộ, cấp phát JWT Access/Refresh Token an toàn, đổi mật khẩu và khôi phục mật khẩu.

#### BR-12: Thông báo in-app
- Gửi thông báo tự động cho các sự kiện nghiệp vụ (duyệt/góp ý đề tài, đề xuất từ sinh viên, nộp/duyệt đề cương M03, đủ điều kiện đợt đồ án).

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NFR)

1. **Hiệu năng:** Thời gian phản hồi danh sách có phân trang và bộ lọc gộp dưới 1 giây; tối ưu caching phía client qua React Query và tìm kiếm debounce.
2. **Bảo mật & Toàn vẹn:** Kiểm soát phân quyền RBAC chặt chẽ tại cả API Guard (`@Roles`, phân quyền theo tổ chuyên môn/sở hữu) và giao diện; lưu vết các hành động quan trọng trong `audit_logs`; chỉ giảng viên/quản trị mới được phép xem bản nháp (`includeDrafts`) của đồng nghiệp.
3. **Giao diện & Trải nghiệm (UX):** Tuân thủ chuẩn thiết kế *Matte Obsidian & Neutral Stone* (`ui_design_guidelines.md`), độ tương phản cao, cỡ chữ tối thiểu `text-sm`, sử dụng đồng bộ `AdvancedFilterPopover` và hệ thống viết tắt chuẩn (`HKI-2026-2027`, `KLTN`/`ĐACN`/`ĐACS`, `KTPM`/`MMT`).
