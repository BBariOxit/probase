# Phân tích Thiết kế Cơ sở dữ liệu: Hệ thống Quản lý Đồ án CNTT
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)

Tài liệu này mô tả kiến trúc cơ sở dữ liệu quan hệ (PostgreSQL / Prisma ORM) khớp với schema hiện tại và phạm vi nghiệp vụ đang vận hành của hệ thống ProBase.

> **Phạm vi dữ liệu đang sử dụng:** Tập trung vào người dùng & phân quyền RBAC, học kỳ/đợt đồ án, ngân hàng đề tài (kèm nhân bản đề tài cũ & kiểm tra tương đồng), đề xuất từ sinh viên, nhóm đăng ký, đề cương M03, sổ tay tiến độ, bài nộp tài liệu, kho lưu trữ số hóa, thông báo và nhật ký kiểm toán. Các phần **Báo cáo & Nhận xét (M02/M04/M05)**, **Chấm điểm tiến độ / Hội đồng bảo vệ**, và **Phân công phản biện** không còn nằm trong phạm vi xử lý của ứng dụng.

---

## 1. NGUYÊN TẮC THIẾT KẾ DỮ LIỆU CỐT LÕI

1. **Chuyên ngành (`majors`) & Mã viết tắt chuẩn:**
   - Sinh viên năm 1–2 học chung đại trà (`major_id = NULL`), làm **Đồ án cơ sở (`DACS`)**.
   - Từ năm 3 chia thành **2 Chuyên ngành** lưu cả tên đầy đủ (`name`) và mã viết tắt (`code`):
     - `KTPM`: **Kỹ thuật phần mềm** (lớp dạng `CTK46PM`).
     - `MMT`: **Mạng máy tính** (lớp dạng `CTK46MMT`).
2. **Loại đồ án (`project_types`):**
   - Lưu cả `name` đầy đủ và `code` viết tắt: `DACS` (*Đồ án cơ sở*), `DACN` (*Đồ án chuyên ngành*), `DATN` (*Khóa luận tốt nghiệp* — hiển thị rút gọn `KLTN`).
3. **Phân quyền đa lớp (RBAC + Chức vụ kiêm nhiệm):**
   - Bảng `lecturer_profiles` lưu các cờ chức vụ kiêm nhiệm: `is_head_of_department` (TTBM), `is_academic_assistant` (TLGV), `is_homeroom_teacher` (GVCN).
   - Kết hợp `role_permissions` và `user_permissions` cho phép cấu hình quyền chi tiết từng chức năng ngay trên màn hình `/admin/lecturers`.

---

## 2. CHI TIẾT CÁC NHÓM BẢNG DỮ LIỆU ĐANG VẬN HÀNH

### NHÓM 1: Người dùng, Hồ sơ & Phân quyền

1. **`users`**: Tài khoản đăng nhập (`id`, `email` unique `@dlu.edu.vn`, `password_hash`, `role` ENUM `ADMIN | LECTURER | STUDENT`, `is_active`, `must_change_password`, `created_at`, `updated_at`).
2. **`majors`**: Danh mục chuyên ngành (`id`, `name`, `code` unique: `'KTPM'` | `'MMT'`, `description`).
3. **`student_profiles`**: Hồ sơ sinh viên (`id`, `user_id`, `student_code` unique, `full_name`, `class`, `major_id` nullable FK → `majors.id`, `cohort`, `phone`, `bio`, `note`).
4. **`lecturer_profiles`**: Hồ sơ giảng viên (`id`, `user_id`, `lecturer_code` unique, `full_name`, `academic_title`, `major_id` FK → `majors.id`, `phone`, `bio`, `research_interests`, `max_mentoring_quota`, `is_head_of_department`, `is_academic_assistant`, `is_homeroom_teacher`).
5. **`role_permissions` & `user_permissions`**: Ma trận phân quyền theo vai trò (`role`, `permission_code`) và ghi đè quyền riêng lẻ theo từng người dùng (`user_id`, `permission_code`).
6. **`refresh_tokens` & `password_reset_tokens`**: Quản lý phiên đăng nhập JWT và khôi phục mật khẩu.

---

### NHÓM 2: Học kỳ, Đợt đồ án & Sinh viên đủ điều kiện

7. **`semesters`**: Quản lý học kỳ (`id`, `name`, `code` unique, `start_date`, `end_date`, `is_active` — mỗi thời điểm chỉ có duy nhất 1 học kỳ active).
8. **`project_types`**: Danh mục 3 loại đồ án (`id`, `name`, `code` unique: `DACS`, `DACN`, `DATN`).
9. **`registration_rounds`**: Đợt đồ án = `(semester_id, project_type_id)` unique, gồm `phase` (`PREP | OPEN | RECONCILING | EXTENDED | FINALIZED`) và các mốc thời gian (`topic_submission_start/end`, `registration_start/end`, `outline_deadline`, `final_submission_deadline`, `archive_deadline`, `finalised_at`).
10. **`round_eligibilities`**: Quy định khóa (`cohort`) được tham gia từng đợt.
11. **`round_student_eligibilities`**: Danh sách sinh viên chính thức đủ điều kiện theo đợt do Giáo vụ import từ file Excel PĐT (`round_id`, `student_id`, `note`, unique `(round_id, student_id)`).
12. **`round_lecturer_quotas`**: Cấu hình định mức hướng dẫn của giảng viên theo từng đợt (`round_id`, `lecturer_id`, `max_topics`).

---

### NHÓM 3: Ngân hàng Đề tài & Thẩm định Bộ môn

13. **`topics`**: Lưu trữ toàn bộ đề tài của các học kỳ:
    - Khóa ngoại: `semester_id`, `round_id`, `lecturer_id`, `major_id` (nullable cho ĐACS).
    - Nội dung: `title`, `title_vi`, `title_en`, `description`, `objectives`, `expected_outcomes`, `tech_stack`, `max_students` (1–3 SV).
    - Trạng thái (`status`): `DRAFT`, `PENDING_DEPARTMENT`, `APPROVED`, `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`.
    - Thẩm định Bộ môn: `department_reviewer_id`, `department_feedback`.
    - Liên kết đề xuất: `source_proposal_id` (unique nullable).
    - Hỗ trợ nghiệp vụ 3 tab giảng viên:
      * Lọc đề tài các học kỳ trước qua `excludeSemesterId` và nhân bản đề tài cũ (`POST /topics/:id/clone`) tạo bản ghi mới ở trạng thái `DRAFT` thuộc học kỳ hiện tại.
      * Lọc đề tài đồng nghiệp qua `excludeLecturerId` kết hợp `includeDrafts=true` (chỉ mở cho `LECTURER` / `ADMIN`).
14. **`topic_similarity_checks`**: Kết quả đối chiếu độ tương đồng văn bản (`topic_id`, `matched_topic_id`, `similarity_score`, `matched_fields`).

---

### NHÓM 4: Đề xuất từ Sinh viên & Nhóm đăng ký

15. **`topic_proposals`**: Đề tài do sinh viên tự đề xuất (`round_id`, `student_id`, `major_id`, `title`, `description`, `objectives`, `expected_outcomes`, `requested_lecturer_id`, `accepted_by_lecturer_id`, `status`: `PENDING | ACCEPTED | REJECTED`, `lecturer_feedback`).
16. **`proposal_attachments`, `proposal_comments`, `proposal_comment_reactions`**: Tệp đính kèm và luồng trao đổi nhận xét giữa sinh viên và giảng viên trên từng đề xuất.
17. **`registration_groups`**: Nhóm đồ án (`topic_id`, `semester_id`, `leader_id`, `max_size` 1–3, `status`, `join_code` unique, `open_for_join`, `declared_size`, `hold_until`).
18. **`registration_group_members`**: Thành viên nhóm (`group_id`, `semester_id`, `student_id`, `join_source`: `SELF | LINK | ASSIGNED`, unique `(student_id, semester_id)` đảm bảo 1 SV chỉ thuộc tối đa 1 nhóm trong một học kỳ).

---

### NHÓM 5: Đề cương M03, Tiến độ, Bài nộp & Kho lưu trữ số hóa

19. **`topic_outlines`**: Quản lý bản scan Đề cương M03 có chữ ký sống GVHD (`group_id` unique, `topic_id`, `attachment_url`, `file_name`, `file_size`, `submitted_by_id`, `submitted_at`, `status`: `DRAFT | SUBMITTED | REVISION_REQUESTED | APPROVED`, `lecturer_feedback`, `approved_at`).
20. **`weekly_logs`**: Sổ tay theo dõi tiến độ hàng tuần của nhóm (`group_id`, `week_number`, `completion_percentage`, `git_commit_url`, `summary_notes`, `blockers`, `lecturer_comment`, `feedback_at`).
21. **`submission_requirements` & `submissions`**: Cấu hình các mốc tài liệu yêu cầu theo đợt (`round_id`, `title`, `due_date`, `is_required`) và bài nộp thực tế của từng nhóm (`requirement_id`, `group_id`, `file_url`, `submitted_at`).
22. **`topic_archives`**: Gói lưu trữ số hóa 3 thành phần sau khi hoàn thành đồ án (`group_id` unique, `topic_id`, `source_url`, `database_url`, `thesis_url`, `abstract_vi`, `keywords`, `is_verified_by_supervisor`, `is_verified_by_academic`, `archived_at`).

---

### NHÓM 6: Thông báo & Nhật ký kiểm toán

23. **`notifications`**: Thông báo in-app (`user_id`, `type`, `title`, `content`, `target_url`, `is_read`, `created_at`).
24. **`audit_logs`**: Ghi vết toàn bộ thao tác quản trị và nghiệp vụ quan trọng (`user_id`, `action`, `target_table`, `target_id`, `old_value`, `new_value`, `created_at`).
