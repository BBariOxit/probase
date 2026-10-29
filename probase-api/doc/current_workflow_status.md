# Hiện trạng Luồng Nghiệp vụ Đã Xử lý và Hoàn thành
## Hệ thống Quản lý Đồ án Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (ProBase)

> **Phạm vi tài liệu:** Tài liệu này **chỉ ghi nhận những tính năng và luồng nghiệp vụ đã được triển khai hoàn chỉnh, tinh chỉnh sát thực tế, có kiểm thử (unit test) và đã được đồng bộ vào mã nguồn** (đến nhánh `feat/eligible-students-import`). Những phần chưa làm, đang làm dở hoặc chưa tinh chỉnh thực tế sẽ không được đưa vào đây.

---

## 1. THIẾT KẾ ĐẶC THÙ KHOA CNTT - ĐẠI HỌC ĐÀ LẠT (DLU DOMAIN RULES)

1. **Lộ trình phân Chuyên ngành theo năm học:**
   - Trường chỉ tuyển sinh 1 ngành chung: **Công nghệ Thông tin**.
   - **Năm 1 và Năm 2 (ví dụ khóa K48, K49):** Sinh viên học chung các môn đại cương và cơ sở ngành cốt lõi (Toán cấu trúc, Nhập môn lập trình, CSDL, CTDL&GT...).
     - Lớp sinh hoạt là **lớp đại trà chưa phân chuyên ngành** (mã lớp dạng `CTK48`, `CTK47` - không có hậu tố chuyên ngành).
     - Khi làm **Đồ án cơ sở (ĐACS)** ở cuối năm 2: Sinh viên **chưa phân chuyên ngành**, hồ sơ `StudentProfile.majorId = null`. Đề tài ĐACS là đề tài nền tảng chung cho toàn ngành, làm chung form, không bắt buộc lọc chuyên ngành.
   - **Đầu năm thứ 3:** Khoa tổ chức tư vấn hướng nghiệp và sinh viên chính thức đăng ký phân vào 2 Chuyên ngành chính (hướng chuyên sâu):
     - `CNPM`: **Công nghệ phần mềm** (mã lớp tách thành dạng `CTK46PM`, `CTK47PM`).
     - `MMT`: **Mạng máy tính** (mã lớp tách thành dạng `CTK46MMT`, `CTK47MMT`).
   - **Từ năm thứ 3 (Đồ án chuyên ngành - ĐACN) và Năm 4 (Khóa luận tốt nghiệp - KLTN):**
     - Sinh viên bắt buộc đã có chuyên ngành (`majorId` trỏ tới `CNPM` hoặc `MMT`).
     - Hệ thống bắt buộc lọc đề tài theo đúng Chuyên ngành của sinh viên để phân phối giảng viên hướng dẫn (GVHD), giảng viên phản biện (GVPB) và Tổ trưởng bộ môn (TTBM) thẩm định chuẩn xác (ví dụ: Giảng viên chuyên bộ môn Mạng sẽ không nhận hướng dẫn đề tài thuần về CNPM hay AI/Data).

2. **Cơ cấu Giảng viên & Chức vụ kiêm nhiệm:**
   - Hệ thống không tạo bảng phân quyền rời rạc mà quản lý trên `lecturer_profiles` với các cờ kiêm nhiệm:
     - `is_head_of_department`: **Tổ trưởng Bộ môn (TTBM)** phụ trách Tổ CNPM hoặc MMT.
     - `is_faculty_board`: **Ban Chủ nhiệm Khoa (BCN Khoa)**.
     - `is_academic_assistant`: **Trợ lý Giáo vụ Khoa (TLGV)**.
   - Mỗi giảng viên đều có thể đóng vai trò `GVHD` (hướng dẫn) hoặc `GVPB` (phản biện) theo từng đề tài.

3. **Quy định quy mô nhóm:**
   - Mỗi đề tài cho phép từ **1 đến 3 sinh viên** (chuẩn theo quy định Khoa CNTT).

---

## 2. CHI TIẾT CÁC PHÂN HỆ ĐÃ HOÀN THÀNH 100%

### PHÂN HỆ 1: Xác thực & Đăng nhập một chạm (Google DLU SSO)

* **Tác nhân:** Toàn bộ Sinh viên, Giảng viên, Cán bộ Khoa.
* **Cơ chế hoạt động:**
  1. Người dùng truy cập trang Đăng nhập và bấm nút **"Đăng nhập bằng tài khoản Google DLU"**.
  2. Hệ thống xác thực danh tính qua Google OAuth 2.0 và kiểm tra tên miền:
     - **Chỉ chấp nhận duy nhất domain trường:** `@dlu.edu.vn`. Các đuôi `@gmail.com` hoặc domain khác bị từ chối truy cập ngay lập tức.
     - Email sinh viên có 7 số MSSV: `<MSSV>@dlu.edu.vn` (VD: `2212345@dlu.edu.vn`).
     - Email giảng viên/cán bộ: `<Ten><ChuCaiDauHoDem>@dlu.edu.vn` (VD: `linhttp@dlu.edu.vn`).
  3. **Ràng buộc bảo mật & Đối soát CSDL Khoa:**
     - Email Google phải tồn tại trong CSDL của Khoa (do Giáo vụ import trước từ danh sách của Phòng Đào tạo hoặc danh sách cán bộ).
     - Nếu email chưa có trong CSDL: Hệ thống báo lỗi và từ chối cấp quyền truy cập.
  4. **Cấp phiên đăng nhập an toàn:**
     - Cấp cặp mã JWT (Access Token 15 phút, Refresh Token lưu trong HttpOnly Cookie).
     - Tự động bỏ cờ bắt buộc đổi mật khẩu (`mustChangePassword: false`) khi đăng nhập bằng Google.
     - Tự động đồng bộ ảnh đại diện (avatar) từ tài khoản Google nếu người dùng chưa có avatar.
  5. **Cơ chế dự phòng:** Cấp sẵn mật khẩu tạm thời mặc định dạng `Dlu@<MSSV>` phục vụ môi trường kiểm thử hoặc khi dịch vụ Google SSO gặp sự cố.

---

### PHÂN HỆ 2: Quản lý Danh sách SV Đủ điều kiện & Import Excel theo Đợt (BR-02)

* **Tác nhân:** Trợ lý Giáo vụ Khoa (TLGV) / Quản trị hệ thống (Admin).
* **Nguồn gốc dữ liệu:** File Excel danh sách sinh viên đủ điều kiện làm đồ án do **Phòng Đào tạo (PĐT)** thẩm định (điều kiện tín chỉ tích lũy, các học phần đã đạt, nghĩa vụ học phí) và chuyển giao cho Văn phòng Khoa sau khi kết thúc đợt đăng ký tín chỉ học phần của trường.
* **Quy trình thực hiện tại trang Quản lý Sinh viên (`/admin/students`):**
  1. Giáo vụ bấm nút **"Import SV đủ ĐK"** để mở hộp thoại Import.
  2. Chọn Đợt làm đồ án tương ứng (Học kỳ × Loại đồ án: *Đồ án Cơ sở / Đồ án Chuyên ngành / Khóa luận tốt nghiệp*).
  3. Có sẵn nút **"Tải file mẫu Excel"** (`Mau_DS_SV_Du_Dieu_Kien.xlsx`) gồm các cột: `MSSV` (bắt buộc, 7 số), `Họ và tên` (bắt buộc), `Lớp` (bắt buộc, ví dụ `CTK48` cho năm 2 hoặc `CTK46PM`, `CTK46MMT` cho năm 3-4), `Email` (tùy chọn, mặc định lấy `<MSSV>@dlu.edu.vn`), `Ghi chú` (tùy chọn: *"Đủ ĐK tín chỉ"*, *"Học vượt"*, *"Trả nợ K45"*).
  4. **Cơ chế xử lý tự động 2-trong-1 của Backend:**
     - *Nếu sinh viên chưa có tài khoản:* Hệ thống tự động tạo User (email `<MSSV>@dlu.edu.vn`) và `StudentProfile`:
       + **Sinh viên Năm 1-2 (lớp dạng `CTK48`, `CTK47`):** Lưu mã lớp, tính cohort, `majorId = null` (chưa phân chuyên ngành).
       + **Sinh viên Năm 3-4 (lớp có hậu tố chuyên ngành `CTK46PM`, `CTK46MMT`):** Tự động nhận diện map sang Chuyên ngành CNPM hoặc MMT tương ứng.
     - *Nếu sinh viên đã có tài khoản:* Hệ thống tự động kích hoạt và liên kết sinh viên vào danh sách đủ điều kiện của đợt đồ án đó (`RoundStudentEligibility`).
     - Tự động phát thông báo in-app `STUDENT_ELIGIBILITY_CONFIRMED` và gửi email thông báo cho sinh viên.
* **Bộ lọc và Quản lý phía Giáo vụ:**
  - Bộ lọc theo **Mã lớp** sinh hoạt (`CTK48` đại trà, `CTK46PM`, `CTK46MMT`...).
  - Bộ lọc theo **Đợt làm đồ án** (Cơ sở / Chuyên ngành / Tốt nghiệp).
  - Bộ lọc theo **Chuyên ngành** (CNPM / MMT).
  - Bộ lọc theo **Tình trạng đề tài** (*Đã có đề tài* / *Chưa có đề tài*).
  - Nút **Xuất Excel** báo cáo toàn bộ danh sách sinh viên.
* **Trải nghiệm và Kiểm soát phía Sinh viên:**
  - **Sinh viên đủ điều kiện:** Dashboard hiển thị Banner màu xanh nổi bật chúc mừng, thông báo loại đồ án được phép làm, thời hạn nộp Đề cương M03 kèm nút điều hướng nhanh.
  - **Sinh viên không đủ điều kiện:** Dashboard hiển thị Banner cảnh báo màu cam thông báo tài khoản chưa nằm trong danh sách đủ điều kiện của học kỳ này, và **hệ thống chặn cứng (`ForbiddenException`)** không cho phép đăng ký đề tài hoặc tạo nhóm.

---

### PHÂN HỆ 3: Đề xuất, Xét duyệt 2 cấp & Đăng ký đề tài, Lập nhóm (BR-03, BR-05, BR-06)

* **Tác nhân:** Giảng viên hướng dẫn (GVHD), Tổ trưởng Bộ môn (TTBM), Ban Chủ nhiệm Khoa (BCN Khoa), Sinh viên.
* **1. Giảng viên đề xuất đề tài:**
  - GVHD nhập thông tin: Tên đề tài (Tiếng Việt & Tiếng Anh), Chuyên ngành (**Công nghệ phần mềm** hoặc **Mạng máy tính**), Mục tiêu, Nội dung yêu cầu, Công nghệ/Công cụ dự kiến (Tech stack), số lượng sinh viên tối đa (**1 đến 3 sinh viên**).
  - Hỗ trợ nhân bản/kế thừa đề tài từ các học kỳ trước.
  - Đề tài tạo mới vào trạng thái: `PENDING_DEPARTMENT` (Chờ TTBM duyệt).
* **2. Quy trình thẩm định 2 cấp chặt chẽ:**
  - **Cấp 1 - Bộ môn (TTBM):** TTBM của từng tổ (CNPM hoặc MMT) rà soát nội dung chuyên môn, tính phù hợp và độ khó của đề tài. TTBM có quyền: *Chấp thuận* (chuyển lên Khoa `PENDING_FACULTY`), *Yêu cầu chỉnh sửa*, hoặc *Từ chối*.
  - **Cấp 2 - Cấp Khoa (BCN Khoa):** BCN Khoa xem xét danh sách đã qua thẩm định của Bộ môn, ký duyệt danh sách chính thức (`APPROVED_OPEN`) để công bố cho sinh viên.
* **3. Sinh viên đăng ký & Lập nhóm (1–3 SV):**
  - Sinh viên đủ điều kiện đăng nhập, xem danh sách đề tài đã mở theo đúng chuyên ngành.
  - Hỗ trợ 2 hình thức:
    1. *Chọn đề tài có sẵn:* Sinh viên chọn đề tài và gửi link mời/mã nhóm cho các thành viên khác (tối đa 3 bạn).
    2. *SV tự đề xuất nguyện vọng:* Nhóm SV soạn thông tin đề tài nguyện vọng và gửi cho GVHD thẩm định, chấp thuận.
  - Hệ thống kiểm soát tính toàn vẹn: Chặn sinh viên đăng ký nếu chưa đủ điều kiện, chặn đăng ký nhiều đề tài cùng lúc trong một học kỳ.

---

### PHÂN HỆ 4: Lập, Nộp và Phê duyệt Đề cương M03 Thực tế (BR-08, BR-09, BR-10)

* **Tác nhân:** Sinh viên, Giảng viên hướng dẫn (GVHD), Trợ lý Giáo vụ Khoa (TLGV), BCN Khoa.
* **Quy trình thực tế ngoài đời:**
  1. **Tải biểu mẫu:** Sinh viên bấm nút **"Tải biểu mẫu M03 (.pdf)"** chuẩn của Khoa CNTT – DLU (`M03_Mau_De_Cuong.pdf`) được lưu trữ trực tiếp trên hệ thống.
  2. **Soạn thảo và xin chữ ký sống:** Nhóm sinh viên điền nội dung đề cương, in ra bản giấy, gặp trực tiếp GVHD để trao đổi chuyên môn và **xin chữ ký sống của GVHD**.
  3. **Nộp trực tuyến:** Nhóm sinh viên scan/chụp bản giấy đã có chữ ký thành file PDF và upload lên hệ thống tại trang *Nhóm của tôi* (`/student/groups`) trước hạn chót tuần 1.
* **GVHD đánh giá và phê duyệt trực tiếp trên Web (`/lecturer/outlines`):**
  - GVHD mở xem trực tiếp bản scan PDF đề cương của nhóm sinh viên.
  - Nhập nhận xét/góp ý bằng văn bản.
  - Bấm chọn hành động:
    - **"Phê duyệt đề cương"**: Đề cương đạt yêu cầu, đề tài chính thức chuyển trạng thái sang `IN_PROGRESS` (Đang thực hiện), khóa quyền nộp lại của nhóm SV.
    - **"Yêu cầu chỉnh sửa"**: Đề cương chưa đạt, hệ thống chuyển trạng thái sang `REVISION_REQUESTED`, mở lại quyền upload file mới cho nhóm sinh viên và gửi thông báo nhắc nhở kèm lời nhận xét của GVHD.
* **Văn phòng Khoa & BCN Khoa (`/admin/outlines`):**
  - Màn hình tổng quan toàn khoa hiển thị thống kê trực quan: Tổng số nhóm đề tài, số lượng đã duyệt, đang chờ duyệt, bị yêu cầu sửa, chưa nộp.
  - Bộ lọc theo Đợt đồ án, Chuyên ngành (CNPM / MMT), Giảng viên hướng dẫn và Trạng thái duyệt đề cương.
  - Nút **"Xuất Tờ trình CSV"**: Tự động kết xuất file CSV danh sách đề cương đã được GVHD duyệt để Giáo vụ lập Tờ trình trình Ban Chủ nhiệm Khoa ký Quyết định giao đề tài chính thức.

---

## 3. DANH SÁCH MÃ NGUỒN & MODEL ĐÃ TRIỂN KHAI

### Cơ sở dữ liệu (Database Models)
* `User`: Quản lý tài khoản, tích hợp Google SSO DLU.
* `StudentProfile`: Hồ sơ sinh viên, lưu MSSV, lớp, chuyên ngành, khóa nhập học.
* `LecturerProfile`: Hồ sơ giảng viên kèm cờ chức vụ kiêm nhiệm (TTBM, BCN Khoa, TLGV).
* `RegistrationRound`: Đợt làm đồ án (Học kỳ × Loại đồ án).
* `RoundStudentEligibility`: Danh sách chi tiết từng sinh viên đủ điều kiện làm đồ án theo từng đợt do TLGV import.
* `Topic`: Ngân hàng đề tài với quy trình duyệt 2 cấp.
* `TopicOutline`: Lưu trữ bản nộp Đề cương M03 (URL file PDF scan có chữ ký, kích thước, trạng thái duyệt, nhận xét của GVHD, thời gian duyệt).
* `Notification`: Lưu thông báo in-app thời gian thực kèm mã định tuyến click mở đúng trang.

### Backend APIs (`probase-api`)
* `/auth/google`: Đăng nhập 1 chạm Google OAuth2 domain `@dlu.edu.vn`.
* `/rounds/:id/eligible-students/template`: Tải file Excel mẫu danh sách SV đủ điều kiện.
* `/rounds/:id/eligible-students/import`: Import Excel/CSV kích hoạt SV đủ điều kiện & tự động sinh tài khoản 2-in-1.
* `/rounds/:id/eligible-students`: Truy vấn danh sách SV đủ điều kiện có phân trang, bộ lọc lớp, trạng thái có/chưa có nhóm.
* `/rounds/eligibility/my-status`: API kiểm tra trạng thái đủ điều kiện và lấy banner cho sinh viên.
* `/outlines/my-group`: Lấy thông tin đề cương M03 của nhóm sinh viên.
* `/outlines/my-group/submit`: Nộp file PDF scan đề cương M03 (kiểm tra định dạng, kích thước, bảo mật Cloudinary).
* `/outlines/lecturer`: Danh sách đề cương các nhóm do giảng viên hướng dẫn.
* `/outlines/:id/review`: GVHD phê duyệt hoặc yêu cầu chỉnh sửa đề cương M03.
* `/outlines/admin/overview`: Báo cáo tổng quan đề cương M03 toàn khoa.
* `/outlines/admin/export`: Xuất Tờ trình CSV danh sách đề cương đã duyệt.

### Frontend UI (`probase-app`)
* Trang Quản lý Sinh viên Admin (`/admin/students`): Nút **Import SV đủ ĐK**, ô lọc **Mã lớp (CTK...)**, xuất Excel.
* Modal `EligibleStudentsImportDialog`: Kéo thả file Excel/CSV, tải file mẫu, hiển thị kết quả chi tiết.
* Component `StudentEligibilityBanner`: Banner xanh (đủ điều kiện + mốc nộp M03) và Banner cam (chưa đủ điều kiện) tại Dashboard sinh viên.
* Card nộp đề cương `StudentOutlineCard`: Tải mẫu PDF chuẩn, upload bản scan, xem nhận xét và trạng thái duyệt tại `/student/groups`.
* Trang duyệt đề cương của GVHD (`/lecturer/outlines`): Xem bản scan PDF, nhập nhận xét, phê duyệt / yêu cầu sửa.
* Trang quản lý tổng quan của Khoa (`/admin/outlines`): Thống kê tỉ lệ nộp, bộ lọc đa chiều, xuất Tờ trình CSV.
