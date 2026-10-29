# Phân tích Thiết kế Cơ sở dữ liệu: Hệ thống Quản lý Đồ án CNTT
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)

Tài liệu này định nghĩa chi tiết kiến trúc cơ sở dữ liệu quan hệ (PostgreSQL / Prisma ORM) được chuẩn hóa theo đúng thực tế hoạt động, cơ cấu tổ chức và 23 yêu cầu nghiệp vụ (BR-01 đến BR-23) của Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt.

---

## 1. NGUYÊN TẮC THIẾT KẾ DỮ LIỆU CỐT LÕI (DLU DOMAIN RULES)

1. **Ngành đào tạo & Lộ trình phân Chuyên ngành thực tế:**
   - Trường chỉ tuyển sinh một ngành: **Công nghệ Thông tin**.
   - **Năm 1 và Năm 2:** Sinh viên học chung các môn đại cương và cơ sở ngành (mã lớp đại trà dạng `CTK48`, `CTK47` – chưa phân chuyên ngành, `specialization_id` là `NULL`). Sinh viên làm **Đồ án cơ sở (ĐACS)** ở giai đoạn này với đề tài nền tảng chung, không phân biệt chuyên ngành.
   - **Đầu năm thứ 3:** Sinh viên chính thức đăng ký phân vào đúng **2 Chuyên ngành (hướng chuyên sâu)**:
     - `CNPM`: **Công nghệ phần mềm** (mã lớp tách thành dạng `CTK46PM`, `CTK47PM`).
     - `MMT`: **Mạng máy tính** (mã lớp tách thành dạng `CTK46MMT`, `CTK47MMT`).
   - Hai chuyên ngành này đồng thời là hai **Tổ chuyên môn** quản lý đề tài và phân công giảng viên cho **Đồ án chuyên ngành (ĐACN)** và **Khóa luận tốt nghiệp (KLTN)**.

2. **Cơ cấu Giảng viên & 6 Tác nhân (Actors):**
   - Không tạo các bảng role rời rạc gây phân mảnh. Hệ thống sử dụng bảng `lecturer_profiles` có các cờ chức vụ kiêm nhiệm trong Khoa:
     - `is_head_of_department` (Tổ trưởng Bộ môn - TTBM phụ trách Tổ CNPM hoặc Tổ MMT).
     - `is_faculty_board` (Ban Chủ nhiệm Khoa - BCN Khoa).
     - `is_academic_assistant` (Trợ lý Giáo vụ Khoa - TLGV).
     - Đồng thời mỗi giảng viên đều có thể đóng vai trò `GVHD` (hướng dẫn) hoặc `GVPB` (phản biện) tùy theo từng đề tài.

3. **Cơ cấu điểm 3 cột chuẩn DLU:**
   $$\text{Điểm TK} = (20\% \times \text{Điểm TĐ1}) + (30\% \times \text{Điểm TĐ2}) + (50\% \times \text{Điểm BV})$$
   - Tiến độ 1 (20%): Do GVHD chấm.
   - Tiến độ 2 (30%): Do GVHD và GVPB cùng đánh giá.
   - Bảo vệ cuối kỳ (50%): Do Hội đồng hoặc Tiểu ban chấm.

4. **Số hóa trọn vẹn các Biểu mẫu hành chính của Khoa:**
   - Bảng `topic_outlines`: Lưu trữ nội dung **Đề cương Mẫu M03**.
   - Bảng `topic_reviews`: Lưu trữ nội dung **Nhận xét GVHD (Mẫu M02/M04)** và **Nhận xét GVPB (Mẫu M05)**.
   - Bảng `topic_archives`: Quản lý **Gói nộp lưu trữ 3 thư mục** (`SOURCE`, `DATABASE`, `THESIS`).

---

## 2. CHI TIẾT CÁC BẢNG DỮ LIỆU (DATABASE SCHEMA)

### NHÓM 1: Người dùng, Hồ sơ & Phân quyền (Authentication & Profiles)

#### 1. `users`
Tài khoản đăng nhập hệ thống, hỗ trợ Google OAuth 2.0 theo 2 domain trường DLU và cơ chế dự phòng cho môi trường kiểm thử.
- `id` (INT, PK, Auto Increment)
- `email` (VARCHAR(100), Unique, Not Null):
  - Sinh viên: định dạng `<MSSV>@dlu.edu.vn` (VD: `2212345@dlu.edu.vn`).
  - Giảng viên / Cán bộ: định dạng `<Ten><ChuCaiDauHoDem>@dlu.edu.vn` (VD: `linhttp@dlu.edu.vn`).
- **Luồng xử lý SSO Google Workspace:**
  - Google trả về thông tin (Email, Họ tên, Avatar).
  - Tách Role theo định dạng email/domain (chỉ dùng duy nhất domain `@dlu.edu.vn`):
    - Bắt đầu bằng 7 số MSSV (VD: `2212345@dlu.edu.vn`) ➔ Map vào `Role.STUDENT` (`student_profiles`).
    - Email giảng viên/cán bộ `@dlu.edu.vn` ➔ Map vào `Role.LECTURER` (`lecturer_profiles`) và các cờ kiêm nhiệm.
  - Kiểm tra email/MSSV đã có trong danh sách import/khai báo ➔ Cấp cặp mã JWT Token (Access & Refresh Token).
- `password_hash` (VARCHAR(255), Not Null): Băm bằng Bcrypt/Argon2 (dùng cho tài khoản quản trị hệ thống và kiểm thử).
- `role` (ENUM: `'ADMIN'`, `'LECTURER'`, `'STUDENT'`): Phân loại người dùng cơ sở.
- `is_active` (BOOLEAN, Default: true): Khóa/mở khóa tài khoản.
- `must_change_password` (BOOLEAN, Default: false): Bắt buộc đổi mật khẩu lần đầu (nếu dùng mật khẩu cấp sẵn).
- `created_at`, `updated_at` (TIMESTAMP)

#### 2. `specializations`
Danh mục 2 Chuyên ngành đào tạo cố định của Khoa CNTT - DLU.
- `id` (INT, PK, Auto Increment)
- `name` (VARCHAR(100), Not Null): *"Công nghệ phần mềm"* hoặc *"Mạng máy tính"*.
- `code` (VARCHAR(20), Unique, Not Null): `'CNPM'` hoặc `'MMT'`.
- `description` (TEXT, Nullable)

#### 3. `student_profiles`
Hồ sơ sinh viên do Giáo vụ Khoa (TLGV) import từ file Excel đầu kỳ.
- `id` (INT, PK, Auto Increment)
- `user_id` (INT, FK → `users.id`, Unique, Cascade Delete)
- `student_code` (VARCHAR(20), Unique, Not Null): 7 chữ số (VD: `2212345`).
- `full_name` (VARCHAR(100), Not Null)
- `class` (VARCHAR(50), Not Null): Tên lớp sinh hoạt (VD: `CTK48` cho SV năm 1-2 chưa chia ngành, `CTK46PM` / `CTK46MMT` cho SV năm 3-4).
- `specialization_id` (INT, FK → `specializations.id`, Nullable): Tự động map từ mã lớp có hậu tố chuyên ngành; bằng `NULL` nếu là sinh viên năm 1-2 học chung đại trà.
- `cohort` (VARCHAR(10), Not Null): Năm nhập học (VD: `"2022"` cho CTK46).
- `phone` (VARCHAR(20), Nullable)
- `bio` (TEXT, Nullable)
- `note` (TEXT, Nullable): Ghi chú riêng của Giáo vụ ("bảo lưu", "đã nộp đơn").

#### 4. `lecturer_profiles`
Hồ sơ cán bộ giảng viên thuộc Khoa CNTT - DLU.
- `id` (INT, PK, Auto Increment)
- `user_id` (INT, FK → `users.id`, Unique, Cascade Delete)
- `lecturer_code` (VARCHAR(20), Unique, Not Null): Mã giảng viên (VD: `GV012`).
- `full_name` (VARCHAR(100), Not Null): Họ và tên giảng viên.
- `academic_title` (VARCHAR(50), Nullable): Học hàm, học vị (ThS., TS., PGS.TS.).
- `specialization_id` (INT, FK → `specializations.id`, Nullable): Tổ chuyên môn phụ trách (CNPM hoặc MMT).
- `phone` (VARCHAR(20), Nullable)
- `bio` (TEXT, Nullable)
- `research_interests` (TEXT, Nullable): Hướng nghiên cứu để SV tìm kiếm.
- `max_mentoring_quota` (INT, Default: 5): Hạn mức số lượng đề tài tối đa nhận hướng dẫn trong kỳ.
- **Cờ chức vụ kiêm nhiệm (Role Flags):**
  - `is_head_of_department` (BOOLEAN, Default: false): Là **Tổ trưởng Bộ môn (TTBM)**.
  - `is_faculty_board` (BOOLEAN, Default: false): Là **Ban Chủ nhiệm Khoa (BCN Khoa)**.
  - `is_academic_assistant` (BOOLEAN, Default: false): Là **Trợ lý Giáo vụ Khoa (TLGV)**.

---

### NHÓM 2: Quản lý Danh mục & Đợt làm đồ án (Master Data & Timeline)

#### 5. `semesters`
Học kỳ đào tạo của trường.
- `id` (INT, PK, Auto Increment)
- `name` (VARCHAR(100), Not Null): Tên học kỳ (VD: *"Học kỳ 1 năm học 2026-2027"*).
- `code` (VARCHAR(50), Unique, Not Null): Mã học kỳ (VD: `"HK1_2026_2027"`).
- `start_date`, `end_date` (DATE, Not Null)
- `grade_submission_deadline` (TIMESTAMP, Nullable): Hạn chót khóa bảng điểm toàn kỳ.
- `is_active` (BOOLEAN, Default: false): Học kỳ đang diễn ra.
- **Trọng số điểm mặc định của Khoa:**
  - `progress1_weight` (FLOAT, Default: 0.2): Trọng số Tiến độ 1 (**20%**).
  - `progress2_weight` (FLOAT, Default: 0.3): Trọng số Tiến độ 2 (**30%**).
  - `defense_weight` (FLOAT, Default: 0.5): Trọng số Bảo vệ (**50%**).

#### 6. `project_types`
Ba loại đồ án đào tạo tại Khoa CNTT - DLU.
- `id` (INT, PK, Auto Increment)
- `name` (VARCHAR(100), Not Null): *"Đồ án cơ sở"*, *"Đồ án chuyên ngành"*, *"Khóa luận tốt nghiệp"*.
- `code` (VARCHAR(20), Unique, Not Null): `'DACS'`, `'DACN'`, `'KLTN'`.

#### 7. `registration_rounds`
Một đợt làm đồ án cụ thể = Cặp (Học kỳ × Loại đồ án).
- `id` (INT, PK, Auto Increment)
- `semester_id` (INT, FK → `semesters.id`, Not Null)
- `project_type_id` (INT, FK → `project_types.id`, Not Null)
- `phase` (ENUM: `'PREP'`, `'OPEN'`, `'RECONCILING'`, `'EXTENDED'`, `'FINALIZED'`): 5 pha trạng thái đợt đăng ký.
- **Timeline 7 mốc thời gian tự động (BR-01):**
  - `topic_submission_start`, `topic_submission_end` (TIMESTAMP): Hạn GV nộp & TTBM duyệt đề tài.
  - `registration_start`, `registration_end` (TIMESTAMP): Cửa sổ SV chọn đề tài & lập nhóm.
  - `outline_deadline` (TIMESTAMP): Hạn nộp Đề cương chi tiết M03.
  - `progress1_deadline` (TIMESTAMP): Hạn nộp & chấm Tiến độ 1 (20%).
  - `reviewer_assignment_deadline` (TIMESTAMP): Hạn TTBM phân công GVPB.
  - `progress2_deadline` (TIMESTAMP): Hạn nộp & chấm Tiến độ 2 (30%).
  - `final_submission_deadline` (TIMESTAMP): Hạn nộp báo cáo cuối kỳ & nhận xét M02/M05.
  - `defense_start_date`, `defense_end_date` (TIMESTAMP): Thời gian tổ chức Hội đồng bảo vệ (50%).
  - `archive_deadline` (TIMESTAMP): Hạn nộp gói lưu trữ 3 thư mục.
- `finalised_at` (TIMESTAMP, Nullable)
- `finalised_by_id` (INT, FK → `users.id`, Nullable)
- `UNIQUE(semester_id, project_type_id)`

#### 8. `round_eligibilities`
Quy định Khóa sinh viên được tham gia đợt đồ án nào (BR-02) (Quy tắc chung theo năm tuyển sinh).
- `id` (INT, PK, Auto Increment)
- `round_id` (INT, FK → `registration_rounds.id`, Cascade Delete)
- `cohort` (VARCHAR(10), Not Null): Năm nhập học (VD: `"2022"` cho CTK46).
- `UNIQUE(round_id, cohort)`

#### 8.1. `round_student_eligibilities`
Danh sách chi tiết từng sinh viên chính thức đủ điều kiện tham gia đợt đồ án (BR-02) do Trợ lý Giáo vụ Khoa import từ file Excel của Phòng Đào tạo (PĐT).
- `id` (INT, PK, Auto Increment)
- `round_id` (INT, FK → `registration_rounds.id`, Cascade Delete): Đợt đồ án cụ thể (Học kỳ × Loại đồ án).
- `student_id` (INT, FK → `student_profiles.id`, Cascade Delete): Hồ sơ sinh viên.
- `note` (VARCHAR(255), Nullable): Ghi chú thẩm định từ PĐT (VD: *"Đủ 100 tín chỉ"*, *"Học vượt"*, *"Trả nợ K45"*).
- `created_at` (TIMESTAMP, Default: now())
- `UNIQUE(round_id, student_id)`
- `INDEX(round_id)`
- `INDEX(student_id)`

---

### NHÓM 3: Đề tài & Quy trình Xét duyệt 2 cấp (Topics & Approval)

#### 9. `topics`
Ngân hàng đề tài đồ án của Khoa.
- `id` (INT, PK, Auto Increment)
- `semester_id` (INT, FK → `semesters.id`, Not Null)
- `round_id` (INT, FK → `registration_rounds.id`, Not Null)
- `lecturer_id` (INT, FK → `lecturer_profiles.id`, Not Null): Giảng viên đề xuất / GVHD.
- `specialization_id` (INT, FK → `specializations.id`, Not Null): Thuộc Chuyên ngành CNPM hoặc MMT.
- `title_vi` (VARCHAR(255), Not Null): Tên đề tài tiếng Việt.
- `title_en` (VARCHAR(255), Nullable): Tên đề tài tiếng Anh.
- `description` (TEXT, Not Null): Mô tả nội dung yêu cầu.
- `objectives` (TEXT, Not Null): Mục tiêu cần đạt được.
- `expected_outcomes` (TEXT, Not Null): Sản phẩm dự kiến hoàn thành.
- `tech_stack` (VARCHAR(255), Nullable): Công nghệ, công cụ dự kiến (VD: React, NestJS, Docker).
- `max_students` (INT, Default: 3): Tối đa từ 1 đến 3 sinh viên.
- `status` (ENUM):
  - `'PENDING_DEPARTMENT'`: Chờ Tổ trưởng Bộ môn (TTBM) thẩm định chuyên môn.
  - `'PENDING_FACULTY'`: TTBM đã duyệt, chờ BCN Khoa phê duyệt.
  - `'APPROVED_OPEN'`: Đã phê duyệt, mở cổng cho SV đăng ký.
  - `'ASSIGNED'`: Đã có nhóm nhận hoặc được Khoa phân công.
  - `'IN_PROGRESS'`: Đang thực hiện (đã nộp đề cương M03).
  - `'COMPLETED'`: Đã hoàn thành bảo vệ và lưu trữ.
  - `'REJECTED'`: Bị từ chối.
- **Thông tin thẩm định cấp Bộ môn & Khoa (BR-05):**
  - `department_reviewer_id` (INT, FK → `lecturer_profiles.id`, Nullable): TTBM thẩm định.
  - `department_feedback` (TEXT, Nullable): Ý kiến chuyên môn của TTBM.
  - `faculty_approver_id` (INT, FK → `lecturer_profiles.id`, Nullable): Đại diện BCN Khoa ký duyệt.
  - `faculty_feedback` (TEXT, Nullable)
- `source_proposal_id` (INT, Nullable, Unique): Trỏ về đề xuất gốc nếu bắt nguồn từ ý tưởng của SV.
- `created_at`, `updated_at` (TIMESTAMP)

#### 10. `topic_similarity_checks`
Bảng lưu kết quả kiểm tra tương đồng văn bản để chống trùng lặp đề tài (BR-04).
- `id` (INT, PK, Auto Increment)
- `topic_id` (INT, FK → `topics.id`, Cascade Delete)
- `matched_topic_id` (INT, FK → `topics.id`, Cascade Delete): Đề tài cũ bị trùng.
- `similarity_score` (FLOAT, Not Null): Tỷ lệ tương đồng (0.00 – 1.00).
- `matched_fields` (JSON, Nullable): Chi tiết trùng tên hay trùng mục tiêu/nội dung.
- `created_at` (TIMESTAMP, Default: now())

---

### NHÓM 4: Sinh viên Đề xuất & Nhóm đăng ký (Proposals & Groups)

#### 11. `topic_proposals`
Bảng tiếp nhận các đề tài do Sinh viên tự đề xuất (BR-06).
- `id` (INT, PK, Auto Increment)
- `round_id` (INT, FK → `registration_rounds.id`, Not Null)
- `student_id` (INT, FK → `student_profiles.id`, Not Null): Sinh viên đề xuất.
- `specialization_id` (INT, FK → `specializations.id`, Not Null): CNPM hoặc MMT.
- `title` (VARCHAR(255), Not Null)
- `description`, `objectives`, `expected_outcomes` (TEXT, Not Null)
- `requested_lecturer_id` (INT, FK → `lecturer_profiles.id`, Nullable): GVHD mong muốn.
- `accepted_by_lecturer_id` (INT, FK → `lecturer_profiles.id`, Nullable): GVHD chính thức nhận.
- `status` (ENUM: `'PENDING'`, `'ACCEPTED'`, `'REJECTED'`)
- `lecturer_feedback` (TEXT, Nullable)
- `created_at`, `updated_at` (TIMESTAMP)

#### 12. `registration_groups`
Nhóm sinh viên thực hiện đề tài (BR-06).
- `id` (INT, PK, Auto Increment)
- `topic_id` (INT, FK → `topics.id`, Not Null, Unique): Mỗi đề tài chỉ gắn với 1 nhóm sống.
- `semester_id` (INT, FK → `semesters.id`, Not Null)
- `leader_id` (INT, FK → `student_profiles.id`, Not Null): Trưởng nhóm.
- `max_size` (INT, Default: 3): Tối đa từ 1 đến 3 SV.
- `status` (ENUM: `'FORMING'`, `'PENDING_APPROVAL'`, `'APPROVED'`, `'REJECTED'`)
- `join_code` (VARCHAR(50), Unique, Nullable): Mã mời thành viên trong nhóm.
- `hold_until` (TIMESTAMP, Nullable): Giữ chỗ 24h cho các thành viên còn lại.
- `created_at`, `updated_at` (TIMESTAMP)

#### 13. `registration_group_members`
Thành viên trong nhóm đề tài.
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete)
- `semester_id` (INT, FK → `semesters.id`, Not Null)
- `student_id` (INT, FK → `student_profiles.id`, Not Null)
- `join_source` (ENUM: `'SELF'`, `'LINK'`, `'ASSIGNED'`): Tự đăng ký, qua link mời hay do Giáo vụ gán.
- `joined_at` (TIMESTAMP, Default: now())
- `UNIQUE(student_id, semester_id)`: **Quy tắc cứng: 1 SV chỉ tham gia duy nhất 1 nhóm trong 1 học kỳ**.

---

### NHÓM 5: Đề cương chi tiết Mẫu M03 (Topic Outline M03)

#### 14. `topic_outlines`
Quản lý nộp và xét duyệt **Đề cương thực hiện đồ án (Mẫu M03)** theo chuẩn Khoa CNTT - DLU (BR-08, BR-09).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete, Unique)
- `topic_id` (INT, FK → `topics.id`, Not Null)
- **Tài liệu nộp thực tế (Bản scan có chữ ký sống):**
  - `attachment_url` (VARCHAR(255), Not Null): Đường dẫn file scan M03 đã có chữ ký GVHD (.pdf, .docx).
  - `file_name` (VARCHAR(255), Nullable): Tên file gốc do sinh viên nộp.
  - `file_size` (INT, Nullable): Dung lượng file tính bằng bytes.
  - `submitted_by_id` (INT, FK → `users.id`, Nullable): Sinh viên đại diện nhóm nộp bài.
  - `submitted_at` (TIMESTAMP, Nullable): Thời điểm nộp file.
- **Trạng thái & Đánh giá của GVHD:**
  - `status` (ENUM / VARCHAR: `'DRAFT'`, `'SUBMITTED'`, `'NEEDS_REVISION'`, `'APPROVED_BY_LECTURER'`): Trạng thái xét duyệt đề cương.
  - `lecturer_feedback` (TEXT, Nullable): Nhận xét / yêu cầu chỉnh sửa từ GVHD.
  - `approved_at` (TIMESTAMP, Nullable): Thời điểm GVHD bấm phê duyệt.
- **Các trường nội dung dự phòng cho tính năng nâng cao (Lộ trình tương lai):**
  - `objectives`, `scope_and_content`, `tools_and_tech`, `expected_results`, `references` (TEXT, Nullable).
  - `weekly_plans` (JSON, Nullable): Bảng kế hoạch tuần.
  - `pdf_export_url` (VARCHAR(255), Nullable): Link PDF xuất có dấu mộc điện tử (E-Signature roadmap).

---

### NHÓM 6: Tiến độ & Đánh giá định kỳ 20% - 30% (Progress & Interim Evaluations)

#### 15. `weekly_logs`
Nhật ký làm việc và theo dõi task hàng tuần giữa SV và GVHD (BR-11).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete)
- `week_number` (INT, Not Null): Tuần thứ mấy (Tuần 1 – 15).
- `completion_percentage` (INT, Default: 0): Tiến độ hoàn thành (0 – 100%).
- `git_commit_url` (VARCHAR(255), Nullable): Link commit mã nguồn minh chứng.
- `summary_notes` (TEXT, Not Null): Các việc đã làm trong tuần.
- `blockers` (TEXT, Nullable): Khó khăn vướng mắc cần GVHD hỗ trợ.
- `lecturer_comment` (TEXT, Nullable): Phản hồi của GVHD.
- `feedback_at` (TIMESTAMP, Nullable)

#### 16. `progress_reports`
Lưu trữ bài nộp và kết quả đánh giá 2 đợt tiến độ: TĐ1 (20%) và TĐ2 (30%) (BR-12, BR-14).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete)
- `stage` (ENUM: `'STAGE_1'`, `'STAGE_2'`): Tiến độ 1 hoặc Tiến độ 2.
- `report_file_url` (VARCHAR(255), Nullable): File báo cáo (.pdf/.docx).
- `source_code_url` (VARCHAR(255), Nullable): Link repository mã nguồn.
- `submitted_at` (TIMESTAMP, Default: now())
- **Đánh giá Tiến độ 1 (Trọng số 20% - Chỉ GVHD chấm):**
  - `supervisor_grade` (FLOAT, Nullable): Điểm do GVHD chấm (thang 10).
  - `supervisor_feedback` (TEXT, Nullable): Nhận xét của GVHD.
- **Đánh giá Tiến độ 2 (Trọng số 30% - GVHD + GVPB cùng chấm):**
  - `reviewer_grade` (FLOAT, Nullable): Điểm do GVPB chấm (thang 10).
  - `reviewer_feedback` (TEXT, Nullable): Nhận xét của GVPB.
- `final_stage_grade` (FLOAT, Nullable): Điểm chốt của giai đoạn (TĐ1 = GVHD; TĐ2 = trung bình GVHD và GVPB).
- `finalised_at` (TIMESTAMP, Nullable)
- `UNIQUE(group_id, stage)`

---

### NHÓM 7: Phản biện, Nhận xét M02/M05 & Hội đồng Bảo vệ 50% (Defense & Reviews)

#### 17. `topic_assignments`
Bảng ghi nhận phân công Giảng viên phản biện (GVPB) do TTBM thực hiện trước TĐ2 (BR-13).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete, Unique)
- `topic_id` (INT, FK → `topics.id`, Not Null)
- `supervisor_id` (INT, FK → `lecturer_profiles.id`, Not Null): GVHD.
- `reviewer_id` (INT, FK → `lecturer_profiles.id`, Not Null): GVPB (khác GVHD, cùng Chuyên ngành CNPM/MMT).
- `assigned_by_id` (INT, FK → `users.id`, Not Null): TTBM/BCN phân công.
- `assigned_at` (TIMESTAMP, Default: now())

#### 18. `topic_reviews`
Biểu mẫu nhận xét chính thức: **Mẫu M02/M04 (GVHD)** và **Mẫu M05 (GVPB)** trước khi ra Hội đồng (BR-17).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete)
- `reviewer_type` (ENUM: `'SUPERVISOR'`, `'REVIEWER'`): Nhận xét của GVHD hay GVPB.
- `lecturer_id` (INT, FK → `lecturer_profiles.id`, Not Null)
- `template_code` (VARCHAR(20), Not Null): `'M02'` (Đồ án GVHD), `'M04'` (KLTN GVHD), `'M05'` (GVPB).
- `evaluation_criteria` (JSON, Not Null): Đánh giá theo barem chuẩn (Ý thức, Nội dung, Tính ứng dụng, Báo cáo).
- `general_comment` (TEXT, Not Null): Nhận xét chung.
- `is_defense_allowed` (BOOLEAN, Not Null): **"Được phép bảo vệ"** (true) hoặc **"Không được bảo vệ"** (false).
- `pdf_export_url` (VARCHAR(255), Nullable): Link file PDF trang nhận xét hoàn chỉnh xuất tự động.
- `signed_at` (TIMESTAMP, Default: now())
- `UNIQUE(group_id, reviewer_type)`

#### 19. `councils` & `council_members`
Hội đồng bảo vệ đồ án tốt nghiệp / Tiểu ban chấm bảo vệ (BR-18).
- **`councils`**:
  - `id` (INT, PK, Auto Increment)
  - `semester_id` (INT, FK → `semesters.id`, Not Null)
  - `specialization_id` (INT, FK → `specializations.id`, Not Null): Hội đồng Chuyên ngành CNPM hoặc MMT.
  - `name` (VARCHAR(100), Not Null): Tên hội đồng (VD: *"Hội đồng KLTN 01 - Chuyên ngành Phần mềm"*).
  - `location` (VARCHAR(100), Nullable): Phòng bảo vệ (VD: *"Phòng A11.204"*).
  - `defense_date` (TIMESTAMP, Not Null): Ngày giờ bảo vệ.
- **`council_members`**:
  - `id` (INT, PK, Auto Increment)
  - `council_id` (INT, FK → `councils.id`, Cascade Delete)
  - `lecturer_id` (INT, FK → `lecturer_profiles.id`, Not Null)
  - `role` (ENUM: `'PRESIDENT'`, `'SECRETARY'`, `'REVIEWER'`, `'MEMBER'`)
  - `UNIQUE(council_id, lecturer_id)`

#### 20. `council_topics`
Danh sách đề tài được xếp lịch bảo vệ trong hội đồng (BR-18).
- `id` (INT, PK, Auto Increment)
- `council_id` (INT, FK → `councils.id`, Cascade Delete)
- `group_id` (INT, FK → `registration_groups.id`, Unique, Not Null)
- `topic_id` (INT, FK → `topics.id`, Not Null)
- `time_slot` (VARCHAR(50), Nullable): Ca bảo vệ (VD: *"08:00 - 08:45"*).
- `defense_order` (INT, Default: 1): Thứ tự bảo vệ trong buổi.

#### 21. `student_grades`
Bảng điểm tổng hợp chính thức của từng sinh viên theo công thức chuẩn DLU (BR-18).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete)
- `student_id` (INT, FK → `student_profiles.id`, Not Null)
- **3 cột điểm thành phần:**
  - `progress1_grade` (FLOAT, Nullable): Điểm Tiến độ 1 (**20%**).
  - `progress2_grade` (FLOAT, Nullable): Điểm Tiến độ 2 (**30%**).
  - `defense_grade` (FLOAT, Nullable): Điểm Hội đồng bảo vệ (**50%**).
- **Điểm tổng kết (Final Grade):**
  - `final_grade_num` (FLOAT, Nullable): $0.2 \times \text{TĐ1} + 0.3 \times \text{TĐ2} + 0.5 \times \text{BV}$ (Thang điểm 10).
  - `final_grade_letter` (VARCHAR(5), Nullable): Điểm chữ (A, B+, B, C+, C, D+, D, F).
- `note` (TEXT, Nullable)
- `is_locked` (BOOLEAN, Default: false): Đóng băng khi hết hạn chốt điểm.
- `UNIQUE(group_id, student_id)`

---

### NHÓM 8: Gói lưu trữ số 3 thành phần & Quản lý thay đổi (Archive & Change Requests)

#### 22. `topic_archives`
Số hóa gói nộp lưu trữ 3 thành phần chuẩn Khoa CNTT - DLU sau khi bảo vệ (BR-19, BR-20).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete, Unique)
- `topic_id` (INT, FK → `topics.id`, Not Null)
- **Ba thành phần bắt buộc:**
  - `source_url` (VARCHAR(255), Not Null): Đường dẫn thư mục `SOURCE` (Mã nguồn hoàn chỉnh, cấu hình).
  - `database_url` (VARCHAR(255), Not Null): Đường dẫn thư mục `DATABASE` (Script SQL, file sao lưu CSDL).
  - `thesis_url` (VARCHAR(255), Not Null): Đường dẫn thư mục `THESIS` (Báo cáo PDF hoàn chỉnh lồng M03, M02/M05 đã ký + HDSD).
- `abstract_vi`, `abstract_en` (TEXT, Nullable): Tóm tắt đồ án phục vụ tra cứu số.
- `keywords` (VARCHAR(255), Nullable): Từ khóa tìm kiếm.
- `is_verified_by_supervisor` (BOOLEAN, Default: false): GVHD xác nhận đủ 3 thành phần.
- `is_verified_by_academic` (BOOLEAN, Default: false): TLGV xác nhận đóng băng học phần.
- `archived_at` (TIMESTAMP, Nullable)

#### 23. `topic_change_requests`
Xử lý các phát sinh điều chỉnh đề tài trong quá trình thực hiện (BR-15).
- `id` (INT, PK, Auto Increment)
- `group_id` (INT, FK → `registration_groups.id`, Cascade Delete)
- `request_type` (ENUM: `'CHANGE_TITLE'`, `'CHANGE_MEMBER'`, `'EXTEND_DEADLINE'`, `'CANCEL_TOPIC'`)
- `reason` (TEXT, Not Null): Lý do xin thay đổi.
- `old_value` (TEXT, Nullable): Giá trị cũ (tên đề tài cũ, thành viên cũ).
- `new_value` (TEXT, Nullable): Giá trị mới mong muốn.
- `status` (ENUM: `'PENDING_SUPERVISOR'`, `'PENDING_FACULTY'`, `'APPROVED'`, `'REJECTED'`)
- `supervisor_comment` (TEXT, Nullable)
- `faculty_comment` (TEXT, Nullable)
- `created_at`, `updated_at` (TIMESTAMP)

---

### NHÓM 9: Thông báo & Nhật ký kiểm toán (Notifications & Audit Logs)

#### 24. `notifications`
Thông báo in-app và đẩy email theo mốc Timeline (BR-23).
- `id` (INT, PK, Auto Increment)
- `user_id` (INT, FK → `users.id`, Cascade Delete)
- `type` (VARCHAR(50), Not Null): Mã loại thông báo (VD: `TOPIC_APPROVED`, `SUBMISSION_DUE_SOON`, `M03_APPROVED`, `GRADE_PUBLISHED`).
- `title` (VARCHAR(255), Not Null)
- `content` (TEXT, Not Null)
- `target_url` (VARCHAR(255), Nullable): Đường dẫn trang khi click vào.
- `is_read` (BOOLEAN, Default: false)
- `created_at` (TIMESTAMP, Default: now())

#### 25. `audit_logs`
Ghi vết lịch sử thao tác hành chính và dữ liệu nhạy cảm (Sửa điểm, Duyệt đề tài, Thay đổi thành viên).
- `id` (INT, PK, Auto Increment)
- `user_id` (INT, FK → `users.id`, Restrict Delete)
- `action` (VARCHAR(50), Not Null): Hành động (VD: `UPDATE_GRADE`, `APPROVE_M03`, `LOCK_SEMESTER`).
- `target_table` (VARCHAR(50), Not Null)
- `target_id` (VARCHAR(50), Not Null)
- `old_value` (JSON, Nullable): Dữ liệu trước thay đổi.
- `new_value` (JSON, Nullable): Dữ liệu sau thay đổi.
- `created_at` (TIMESTAMP, Default: now())
