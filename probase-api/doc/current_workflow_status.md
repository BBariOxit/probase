# Luồng Hoạt Động Vận Hành Thực Tế Hiện Tại Của ProBase
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)

> **Mục đích tài liệu:** Ghi chép đầy đủ, chi tiết và trực quan **toàn bộ luồng hoạt động thực tế của ứng dụng hiện tại từ đầu đến cuối chu trình**: Bắt đầu từ khâu khởi tạo của Khoa, đi qua từng tác nhân (Giáo vụ, Giảng viên, Tổ trưởng Bộ môn, Sinh viên), ở mỗi bước từng tác nhân **làm gì, được làm những gì trên màn hình giao diện**, hệ thống kiểm soát ràng buộc gì và tự động xử lý những gì ở hậu trường. Ban Chủ nhiệm Khoa không sử dụng tài khoản riêng trên hệ thống mà thực hiện ký duyệt văn bản giấy (ngoài hệ thống) dựa trên danh sách/tờ trình do Giáo vụ xuất từ hệ thống.
>
> ⚠️ **Nguyên tắc bất biến:** Tài liệu này **CHỈ GHI NHẬN NHỮNG TÍNH NĂNG ĐÃ LÀM XONG 100%, ĐÃ CÓ CODE, ĐÃ TEST VÀ ĐANG CHẠY ỔN ĐỊNH TRÊN HỆ THỐNG**. Các phân hệ tiếp theo (Nhật ký tuần, Chấm điểm tiến độ 1 & 2, Hội đồng bảo vệ...) chưa xong nên tuyệt đối chưa ghi vào đây.

---

## 1. CÁC NGUYÊN TẮC NGHIỆP VỤ CỐT LÕI (KHOA CNTT - DLU)

1. **Lộ trình đào tạo & 2 Chuyên ngành chính thức:**
   - Trường Đại học Đà Lạt tuyển sinh 1 ngành chung: **Công nghệ Thông tin** (Mã ngành: `7480201`).
   - **Năm 1 & Năm 2 (ví dụ khóa K48, K49):** Toàn bộ sinh viên học chung khung đại cương và cơ sở ngành. Lớp sinh hoạt chưa phân nhánh chuyên ngành (mã lớp dạng `CTK48`, `CTK47`).
     - Khi làm **Đồ án cơ sở (ĐACS)** ở cuối năm 2: Dành cho lớp đại trà (ví dụ `CTK48`), sinh viên chưa có chuyên ngành (`majorId = null`), làm chung ngân hàng đề tài cơ sở.
   - **Đầu năm thứ 3:** Khoa tổ chức tư vấn và sinh viên đăng ký phân vào đúng **2 Chuyên ngành**:
     - `KTPM` (mã hệ thống `CNPM`): **Kỹ thuật phần mềm** (mã lớp tách thành dạng `CTK46PM`, `CTK47PM`).
     - `MMT`: **Mạng máy tính** (mã lớp tách thành dạng `CTK46MMT`, `CTK47MMT`).
   - **Năm 3 (ĐACN) và Năm 4 (KLTN):** Hệ thống bắt buộc lọc đề tài và thẩm định chuyên môn đúng theo Chuyên ngành của sinh viên và giảng viên phụ trách.

2. **Cách Khoa phân phối Kế hoạch & Quản lý Đợt đồ án theo Khóa/Lớp:**
   - Khoa **không gộp chung một lịch** cho tất cả loại đồ án mà chia theo từng kế hoạch riêng lẻ gắn với **Mã lớp học (Khóa)**:
     - Kế hoạch ĐACS cho lớp `CTK48`.
     - Kế hoạch ĐACN cho lớp `CTK47` (nhánh `CTK47PM` và `CTK47MMT`).
     - Kế hoạch KLTN cho lớp `CTK46` (nhánh `CTK46PM` và `CTK46MMT`).
   - **Thời gian làm chính thức là 3 tháng** (ví dụ: từ 10/08 đến 10/11).
   - **Quản lý cuốn chiếu:** Trước ngày bắt đầu chính thức khoảng 2 tuần, Khoa mở cổng cho sinh viên chọn đề tài và liên hệ giảng viên.

3. **Quy mô nhóm đồ án:** Mỗi nhóm đồ án cho phép từ **1 đến 3 sinh viên**.

4. **Chữ ký thẩm định Đề cương M03:** Ban hành theo mẫu chuẩn của Khoa CNTT - DLU. Sinh viên in bản giấy, **gặp trực tiếp GVHD để xin chữ ký sống**, sau đó scan/chụp thành 1 file PDF duy nhất để nộp lên hệ thống.

5. **Cơ chế đánh giá phân biệt ĐACS/ĐACN vs KLTN:**
   - **Với ĐACS & ĐACN:** TĐ1 do GVHD tự chấm (50%). TĐ2 là buổi đánh giá của **Hội đồng nhỏ gồm (GVHD + GVPB) chấm 50% số điểm tổng** (kết thúc môn, không cần lập Hội đồng lớn bảo vệ).
   - **Với KLTN:** TĐ1 (20% GVHD) ➔ TĐ2 (30% GVHD + GVPB, cổng điều kiện ≥ 50%) ➔ Nộp báo cáo cuối kỳ & Nhận xét M02/M05 ➔ Hội đồng bảo vệ lớn (50%).

---

## 2. SƠ ĐỒ LUỒNG ĐI QUA CÁC TÁC NHÂN (TỪ ĐẦU ĐẾN HIỆN TẠI)

```
[BƯỚC 0: Admin / Giáo vụ Khoa]
   │ Tạo Năm học, Học kỳ (Active) & Khởi tạo Đợt đồ án (ĐACS / ĐACN / KLTN)
   ▼
[BƯỚC 1: Trợ lý Giáo vụ Khoa (TLGV)]
   │ Nhận danh sách từ PĐT ➔ Import Excel SV đủ ĐK ➔ Tự động cấp tài khoản 2-in-1
   ▼
[BƯỚC 2: Toàn bộ GV & Sinh viên]
   │ Đăng nhập Google SSO DLU (@dlu.edu.vn) ➔ Hệ thống phân luồng & cấp cờ Đủ ĐK
   ▼
[BƯỚC 3: GVHD ➔ TTBM ➔ Giáo vụ Khoa]
   │ GVHD soạn đề tài ➔ TTBM duyệt chuyên môn (`APPROVED`) ➔ Giáo vụ tổng hợp in trình ký giấy (Lần 1) & mở cổng đăng ký (`OPEN`)
   ▼
[BƯỚC 4: Sinh viên đủ điều kiện]
   │ Tra cứu đề tài theo ngành ➔ Đăng ký đề tài ➔ Lập nhóm 1–3 bạn qua Join Code
   ▼
[BƯỚC 5: Nhóm SV ➔ GVHD ➔ Giáo vụ Khoa]
   │ Tải mẫu M03 ➔ Xin chữ ký sống GVHD ➔ Nộp PDF scan ➔ GVHD duyệt ➔ Giáo vụ xuất Tờ trình trình ký Quyết định giao đề tài (Lần 2 - văn bản giấy)
   ▼
[BƯỚC 6: Giai đoạn Thực hiện đồ án & Đánh giá tiến độ (DLU Real-world)]
   │ • Phân hệ 1 (Nội bộ): Sổ tay tiến độ tuần/sprint (SV log ➔ GVHD xác nhận & góp ý)
   │ • Phân hệ 2 (Khoa): 2 đợt kiểm tra tập trung (Đợt 1: Tuần 5-6 [20%], Đợt 2: Tuần 9-10 [30% + Cổng ≥ 50%])
   ▼
[BƯỚC 7: TTBM / Giáo vụ phân công Giảng viên phản biện (GVPB - BR-13)]
   │ • 3 nguyên tắc: Không trùng GVHD, Đúng chuyên môn/Bộ môn, Cân bằng tải (HD: x | PB: y)
   │ • 2 chế độ: Chọn thủ công & Phân công tự động (Min-load Balancer) ➔ Mở menu Đề tài phản biện cho GVPB
   ▼
[BƯỚC 8: Nộp Báo cáo Cuối kỳ, Nhận xét M02/M04 & M05 và Cổng Thẩm định Bảo vệ (BR-16, BR-17)]
   │ • SV nộp báo cáo toàn văn, slide, link source/demo ➔ GVHD nhận xét M02/M04 ➔ GVPB nhận xét M05
   │ • Cổng Thẩm định ra Hội đồng: TĐ2 ≥ 50% + Cả 2 GV đồng ý cho phép bảo vệ ➔ Xuất danh sách đối soát
   ▼
[BƯỚC 9: Thành lập Hội đồng, Xếp lịch & Chấm điểm Bảo vệ 50% (BR-18)]
   │ • Giáo vụ/Admin tạo Hội đồng theo Bộ môn (3–5 GV: Chủ tịch, Thư ký, GVPB, Ủy viên)
   │ • Xếp lịch bảo vệ cho nhóm đủ điều kiện (phòng thi, ngày, ca/thứ tự bảo vệ)
   │ • Thành viên Hội đồng chấm điểm độc lập (thang 10) ➔ Tự động tính TB Hội đồng
   │ • Tự động tính Điểm Tổng Kết: (20% * TĐ1) + (30% * TĐ2) + (50% * TB Hội đồng) ➔ Đồng bộ StudentGrade
   │ • (Nâng cao / Roadmap): Bàn làm việc Thư ký (Secretary Console) ghi chép biên bản chi tiết
   ▼
[GIAI ĐOẠN TIẾP THEO: Nộp gói lưu trữ số hóa 3 thành phần (SOURCE, DB, THESIS) & Thư viện số]
```

---

## 3. CHI TIẾT TỪNG BƯỚC VẬN HÀNH TRÊN HỆ THỐNG

---

### BƯỚC 0: THIẾT LẬP HỌC KỲ, ĐỢT ĐỒ ÁN & DANH MỤC NỀN TẢNG

* **Ai thực hiện:** Quản trị viên hệ thống / Trợ lý Giáo vụ Khoa (Admin / TLGV).
* **Màn hình giao diện trên Web:**
  - Quản lý Học kỳ: `/admin/semesters`
  - Quản lý Đợt đồ án chi tiết: `/admin/semesters/[id]`
  - Quản lý Tài khoản & Giảng viên: `/admin/accounts`, `/admin/catalogues`
* **Người dùng được làm những gì:**
  1. **Khởi tạo Học kỳ:**
     - Bấm **"Thêm học kỳ mới"**: Nhập tên học kỳ (ví dụ: *Học kỳ 1 - Năm học 2026-2027*), mã học kỳ (`HK1-2026-2027`), ngày bắt đầu và kết thúc học kỳ.
     - Bấm nút **"Kích hoạt học kỳ"** (Active): Xác định học kỳ đang chạy thực tế trên toàn trường để mọi dữ liệu đồ án mới tự động gắn vào học kỳ này.
  2. **Cấu hình các Đợt làm đồ án trong học kỳ (`RegistrationRound`):**
     - Tại trang chi tiết học kỳ, cấu hình từng đợt tương ứng với từng đối tượng:
       - **Đợt 1:** Đồ án cơ sở – ĐACS (dành cho sinh viên năm 2, khóa K48 đại trà).
       - **Đợt 2:** Đồ án chuyên ngành – ĐACN (dành cho sinh viên năm 3, khóa K47 CNPM & MMT).
       - **Đợt 3:** Khóa luận tốt nghiệp – KLTN (dành cho sinh viên năm 4, khóa K46 CNPM & MMT).
     - Thiết lập timeline cho từng đợt: Ngày bắt đầu mở đăng ký, ngày kết thúc đăng ký, hạn chót nộp Đề cương M03.
     - Chuyển trạng thái đợt: `PREP` (Chuẩn bị) $\rightarrow$ `OPEN` (Mở cổng).
  3. **Quản lý Giảng viên & Bộ môn:**
     - Khai báo danh sách Giảng viên cơ hữu trong Khoa, phân bổ về 2 Chuyên ngành / Bộ môn: **Bộ môn Công nghệ phần mềm (CNPM)** hoặc **Bộ môn Mạng máy tính (MMT)**.
     - Gán vai trò chức vụ kiêm nhiệm cho giảng viên: Giảng viên hướng dẫn (`GVHD`), Tổ trưởng bộ môn (`TTBM`), Trợ lý Giáo vụ (`TLGV`). (Ban Chủ nhiệm Khoa chỉ ký duyệt văn bản giấy ngoài hệ thống ở 2 mốc hành chính, không có vai trò đăng nhập duyệt trực tuyến trên app).
* **Hệ thống kiểm soát:**
  - Mỗi thời điểm chỉ cho phép duy nhất **1 Học kỳ đang Active**.
  - Không cho phép xóa Học kỳ hoặc Đợt đồ án nếu đã có đề tài hoặc sinh viên đăng ký gắn liền.

---

### BƯỚC 1: TIẾP NHẬN DANH SÁCH PĐT & IMPORT SV ĐỦ ĐIỀU KIỆN (BR-02)

* **Ai thực hiện:** Trợ lý Giáo vụ Khoa (TLGV).
* **Nguồn dữ liệu:** File Excel danh sách sinh viên đủ điều kiện làm đồ án do **Phòng Đào tạo (PĐT)** thẩm định gửi về Khoa (tiêu chí: tích lũy tín chỉ $\ge 100$, không nợ môn tiên quyết, đã nộp học phí).
* **Màn hình giao diện trên Web:** Trang **Quản lý Sinh viên** (`/admin/students`).
* **Giáo vụ được làm những gì:**
  1. Bấm nút **"Import SV đủ ĐK"** trên thanh công cụ để mở hộp thoại Import.
  2. Chọn Đợt đồ án tương ứng (ví dụ: *Khóa luận tốt nghiệp – HK1 2026-2027*).
  3. Bấm nút **"Tải file mẫu Excel"** (`Mau_DS_SV_Du_Dieu_Kien.xlsx`) để lấy khung cột chuẩn gồm: `STT`, `Mã SV`, `Họ và tên`, `Lớp`, `Email`, `Số điện thoại`, `Ghi chú`.
  4. Kéo thả file Excel/CSV từ máy tính vào khung tải lên và bấm **"Bắt đầu Import"**.
  5. **Xem thống kê đối soát trực tiếp:** Tổng số hàng xử lý, số SV đủ điều kiện, số tài khoản mới được tạo, danh sách các hàng lỗi cú pháp kèm nguyên nhân cụ thể.
  6. **Tra cứu & Quản lý danh sách sinh viên:**
     - Lọc nhanh theo **Mã lớp sinh hoạt**: Hỗ trợ cả lớp đại trà năm 1-2 (`CTK48`) và lớp chuyên ngành năm 3-4 (`CTK46PM`, `CTK46MMT`).
     - Lọc theo **Đợt làm đồ án** (ĐACS / ĐACN / KLTN).
     - Lọc theo **Tình trạng nhóm**: Xem bạn nào *Đã có nhóm/đề tài*, bạn nào *Chưa có nhóm*.
     - Bấm nút **"Xuất Excel"** để xuất danh sách sinh viên hiện tại kèm tình trạng đối soát với Phòng Đào tạo.
* **Hệ thống tự động xử lý ở hậu trường (Cơ chế 2-trong-1):**
  - **Tự động nhận diện lớp & Chuyên ngành:**
    - Sinh viên năm 1–2 (mã lớp `CTK48`, `CTK47`): Hệ thống tự động bóc tách khóa nhập học (cohort 48, 47) và gán `majorId = null` (chưa chia ngành).
    - Sinh viên năm 3–4 (mã lớp có hậu tố `CTK46PM`, `CTK46MMT`): Hệ thống tự động nhận diện và gán sang Chuyên ngành CNPM hoặc MMT.
  - **Cơ chế tài khoản 2-trong-1:**
    - *Sinh viên chưa có tài khoản:* Tự động tạo bản ghi `User` (email `<MSSV>@dlu.edu.vn`) và `StudentProfile`. Cấp mật khẩu dự phòng `Dlu@<MSSV>`.
    - *Sinh viên đã có tài khoản:* Tự động kích hoạt cờ đủ điều kiện `RoundStudentEligibility` trong đợt đó.
  - **Thông báo đa kênh:** Tự động phát thông báo in-app `STUDENT_ELIGIBILITY_CONFIRMED` và gửi email thông báo chúc mừng về hòm thư `@dlu.edu.vn` của sinh viên.

---

### BƯỚC 2: TOÀN BỘ GIẢNG VIÊN & SINH VIÊN ĐĂNG NHẬP (GOOGLE SSO DLU)

* **Ai thực hiện:** Tất cả người dùng trong Khoa (Sinh viên, Giảng viên, TTBM, TLGV / Giáo vụ).
* **Màn hình giao diện trên Web:** Trang **Đăng nhập** (`/login`).
* **Người dùng được làm những gì:**
  - Bấm duy nhất nút: **"Đăng nhập bằng tài khoản Google DLU"**.
  - Chọn tài khoản Google có đuôi `@dlu.edu.vn` do trường cấp. Không cần nhớ mật khẩu riêng.
* **Hệ thống kiểm soát & Phân luồng trải nghiệm:**
  1. *Kiểm tra tên miền:* Chặn ngay các tài khoản cá nhân `@gmail.com` hoặc email ngoài DLU.
  2. *Kiểm tra Whitelist hồ sơ trong CSDL:*
     - Nếu email chưa từng được Giáo vụ nạp vào CSDL: Hệ thống từ chối đăng nhập với thông báo *"Email chưa được cập nhật vào danh sách của Khoa CNTT"*.
     - Nếu email đã có: Tự động cấp Token JWT, cập nhật avatar Google.
  3. **Phân luồng màn hình tự động:**
     - **Giảng viên / Giáo vụ (Admin):** Điều hướng sang Dashboard Giảng viên (`/lecturer`) hoặc Quản trị (`/admin`).
     - **Sinh viên:** Điều hướng sang Dashboard Sinh viên (`/student`) với giao diện phân hóa:
       - *Sinh viên ĐỦ ĐIỀU KIỆN:* Hiển thị **Banner màu xanh ngọc**: *"🎉 Bạn đủ điều kiện đăng ký đồ án học kỳ này. Hạn nộp Đề cương M03: [Ngày/Tháng]"* kèm nút tắt chuyển nhanh vào Nhóm, đồng thời mở toàn quyền đăng ký đề tài.
       - *Sinh viên CHƯA ĐỦ ĐIỀU KIỆN:* Hiển thị **Banner màu cam cảnh báo**: *"⚠️ Tài khoản của bạn chưa nằm trong danh sách đủ điều kiện làm đồ án đợt này. Vui lòng liên hệ Giáo vụ Khoa nếu có thắc mắc."* và **bị khóa cứng nút đăng ký đề tài/tạo nhóm**.

---

### BƯỚC 3: XÂY DỰNG & PHÊ DUYỆT NGÂN HÀNG ĐỀ TÀI (DUYỆT CHUYÊN MÔN CẤP BỘ MÔN)

* **Ai thực hiện:** Giảng viên hướng dẫn (GVHD) $\rightarrow$ Tổ trưởng Bộ môn (TTBM) $\rightarrow$ Trợ lý Giáo vụ Khoa (TLGV / Admin).
* **Quy trình đi qua từng tác nhân:**
  1. **Giảng viên hướng dẫn (GVHD):**
     - Vào trang **Đề tài của tôi** (`/lecturer`) $\rightarrow$ Bấm **"Thêm đề tài mới"** (`/lecturer/topics/new`).
     - Soạn thảo đề tài: Tên đề tài, chọn Chuyên ngành (**Công nghệ phần mềm** hoặc **Mạng máy tính**), Mục tiêu nghiên cứu, Mô tả nội dung yêu cầu, Yêu cầu đầu ra, Công nghệ sử dụng, Số lượng sinh viên tối đa (**1 đến 3 SV**).
     - GVHD có thể lưu ở trạng thái bản nháp (`DRAFT`), sau đó bấm **"Gửi duyệt"** để chuyển sang `PENDING_DEPARTMENT` (Chờ Bộ môn thẩm định).
  2. **Tổ trưởng Bộ môn (TTBM - Tổ CNPM hoặc Tổ MMT):**
     - Truy cập mục **Thẩm định đề tài** (`/lecturer/topic-reviews`) trên giao diện Giảng viên.
     - Thẩm định chuyên môn các đề tài thuộc chuyên ngành mình phụ trách (kiểm tra độ khó, tính thực tiễn và cảnh báo trùng lặp tương đồng).
     - TTBM (hoặc Admin) thực hiện 1 trong 3 hành động:
       - **Chấp thuận (`APPROVE`)**: Đề tài chuyển thẳng sang trạng thái **Đã duyệt** (`APPROVED`), sẵn sàng để Giáo vụ mở cổng đăng ký.
       - **Yêu cầu chỉnh sửa (`REQUEST_REVISION`)**: Trả về trạng thái `DRAFT` kèm lời nhắn nhận xét để GVHD chỉnh sửa.
       - **Từ chối (`REJECT`)**: Chuyển đề tài sang `REJECTED`.
  3. **Trợ lý Giáo vụ Khoa (TLGV / Admin) & Ký duyệt Lần 1 (ngoài hệ thống):**
     - Giáo vụ Khoa theo dõi toàn bộ danh mục đề tài ở trạng thái `APPROVED` tại `/admin/topic-registry`.
     - Giáo vụ tổng hợp/in danh mục đề tài gửi BCN Khoa xem và ký thông qua bản giấy **Lần 1 (Duyệt danh mục đề tài nội bộ)** ngoài hệ thống, sau đó bấm **"Mở đăng ký"** / **"Mở đăng ký đồng loạt"** (`APPROVED` $\rightarrow$ `OPEN`) để sinh viên tra cứu và chọn đề tài.

---

### BƯỚC 4: SINH VIÊN CHỌN ĐỀ TÀI & THÀNH LẬP NHÓM (1–3 BẠN)

* **Ai thực hiện:** Sinh viên có trạng thái Đủ điều kiện.
* **Màn hình giao diện trên Web:**
  - Tra cứu đề tài: `/student/topics`
  - Quản lý nhóm đồ án: `/student/groups`
  - Gia nhập nhóm qua link/mã: `/join/[code]`
* **Sinh viên được làm những gì:**
  1. **Tra cứu đề tài:**
     - Xem danh sách đề tài đã mở theo đúng chuyên ngành của mình (sinh viên chuyên ngành CNPM chỉ thấy đề tài CNPM; sinh viên MMT thấy đề tài MMT; sinh viên năm 2 thấy đề tài ĐACS).
     - Tìm kiếm theo từ khóa tên đề tài, lọc theo Giảng viên hướng dẫn.
     - Xem chi tiết: Nhiệm vụ, công nghệ, số lượng thành viên yêu cầu.
  2. **Đăng ký đề tài & Lập nhóm (Trưởng nhóm):**
     - Bấm nút **"Đăng ký đề tài"**: Sinh viên đăng ký trở thành **Trưởng nhóm**.
     - Hệ thống tự sinh ra **Mã tham gia nhóm (Join Code)** và đường link mời tham gia.
     - Trưởng nhóm gửi Join Code hoặc link `/join/[code]` cho bạn cùng lớp.
  3. **Gia nhập nhóm (Thành viên):**
     - Thành viên truy cập link hoặc vào trang Nhóm nhập Join Code để vào nhóm.
     - Quy mô nhóm được hệ thống chốt cứng từ **1 đến 3 sinh viên**.
  4. *Trường hợp Sinh viên tự đề xuất đề tài:*
     - Sinh viên vào mục Đề xuất (`/student/proposals`), nhập tên đề tài mong muốn và chọn GVHD nguyện vọng để gửi yêu cầu phê duyệt trực tiếp đến giảng viên.
* **Hệ thống kiểm soát:**
  - Sinh viên chưa đủ điều kiện bị chặn ngay từ API, không thể đăng ký hay join nhóm.
  - Chặn sinh viên tham gia từ 2 nhóm trở lên hoặc đăng ký nhiều đề tài trong cùng một đợt.
  - Chặn gia nhập nếu nhóm đã đạt tối đa số lượng thành viên quy định (1–3 SV).

---

### BƯỚC 5: LẬP, XIN CHỮ KÝ SỐNG & PHÊ DUYỆT ĐỀ CƯƠNG M03 (VÀO GIAI ĐOẠN THỰC HIỆN)

* **Ai thực hiện:** Nhóm Sinh viên $\rightarrow$ Giảng viên hướng dẫn (GVHD) $\rightarrow$ Giáo vụ Khoa (TLGV).
* **Quy trình thực tế tại Khoa CNTT - DLU được số hóa trên Web:**
  1. **Sinh viên chuẩn bị đề cương:**
     - Nhóm vào trang **Nhóm của tôi** (`/student/groups`).
     - Bấm nút **"Tải biểu mẫu M03 (.pdf)"** ([`M03_Mau_De_Cuong.pdf`](file:///d:/bao/workspace/probase/probase-app/public/templates/M03_Mau_De_Cuong.pdf) chuẩn quy định Khoa CNTT – DLU).
     - Nhóm điền nội dung đề cương, in ra bản giấy, **đến gặp trực tiếp GVHD để bảo vệ ý tưởng và xin chữ ký sống của GVHD vào bản giấy**.
  2. **Sinh viên nộp bản scan lên Web:**
     - Nhóm scan/chụp bản giấy đã có đầy đủ chữ ký sống thành 1 file PDF duy nhất.
     - Upload file PDF lên hệ thống tại `/student/groups` trước hạn chót tuần 1 của đợt.
  3. **GVHD thẩm định & Phê duyệt trực tiếp trên Web:**
     - GVHD vào trang **Đề cương M03** (`/lecturer/outlines`).
     - Mở xem trực tiếp file PDF scan của nhóm sinh viên ngay trên trình duyệt.
     - Nhập nhận xét, hướng dẫn chỉnh sửa chuyên môn.
     - GVHD bấm chọn 1 trong 2 hành động:
       - **"Phê duyệt đề cương"**: Đề cương đạt yêu cầu, đề tài chuyển trạng thái sang `IN_PROGRESS` (Chính thức bước vào giai đoạn thực hiện). Hệ thống khóa quyền nộp lại của nhóm.
       - **"Yêu cầu chỉnh sửa"**: Đề cương chuyển sang `REVISION_REQUESTED`. Hệ thống mở lại quyền nộp file mới cho nhóm SV và gửi thông báo kèm nhận xét của GVHD.
  4. **Giáo vụ Khoa theo dõi & Xuất Tờ trình ký Quyết định Lần 2 (ngoài hệ thống):**
     - Giáo vụ (TLGV / Admin) vào trang **Đề cương M03 toàn khoa** (`/admin/outlines`).
     - Xem Dashboard tiến độ: Tổng số nhóm, số nhóm đã duyệt, chờ duyệt, yêu cầu sửa, chưa nộp.
     - Bấm nút **"Xuất Tờ trình danh sách chính thức (CSV)"**: Tự động kết xuất danh sách đầy đủ (Tên đề tài – GVHD – Tên SV – MSSV) đã được GVHD duyệt đề cương để Giáo vụ in Tờ trình, trình BCN Khoa / Lãnh đạo ký Quyết định giao đề tài chính thức bằng văn bản giấy ngoài hệ thống (**Lần 2 – Ký hành chính**).

---

### BƯỚC 6: GIAI ĐOẠN THỰC HIỆN ĐỒ ÁN & ĐÁNH GIÁ TIẾN ĐỘ TẬP TRUNG (BR-11, BR-12, BR-14)

* **Ai thực hiện:** Nhóm Sinh viên $\longleftrightarrow$ Giảng viên hướng dẫn (GVHD) $\longleftrightarrow$ Hội đồng Bộ môn (GVHD + GVPB).
* **Màn hình giao diện trên Web:**
  - Nhóm sinh viên: `/student/groups` (Phần **Tiến độ thực hiện đồ án**)
  - Giảng viên hướng dẫn: `/lecturer/groups/[id]` (Tab **Đánh giá tiến độ đồ án**)
* **Nguyên tắc thực tế Khoa CNTT – DLU:**
  - Khoa **không bắt buộc** nộp nhật ký hành chính hàng tuần lên văn phòng Khoa (tránh thủ tục hình thức rườm rà).
  - Hoạt động tuần là **thỏa thuận nội bộ** giữa GVHD và nhóm SV nhằm bám sát tiến độ.
  - Khoa quản lý chất lượng qua **2 đợt kiểm tra tiến độ tập trung bắt buộc**:
    - **Đợt 1 (Tuần 5–6):** Báo cáo phân tích thiết kế, mô hình CSDL, giao diện mẫu (prototype). GVHD chấm trực tiếp, chiếm **20%** trọng số.
    - **Đợt 2 (Tuần 9–10):** Báo cáo tập trung trước Hội đồng Bộ môn (GVHD + GVPB), chiếm **30%** trọng số. Yêu cầu sản phẩm đạt **tối thiểu 50% khối lượng**. Nếu < 50%, kích hoạt cảnh báo đình chỉ, **không được phép bảo vệ chính thức**.

* **Quy trình chi tiết trên Web:**
  1. **Phân hệ 1: Sổ tay tiến độ nội bộ (Weekly Log / Sprint Tracking - BR-11):**
     - **Sinh viên:**
       - Bấm **"Ghi nhận tiến độ"** trên thanh công cụ.
       - Chọn Tuần (1–15), nhập Tiêu đề ngắn gọn, Tỷ lệ hoàn thành ước tính (%), Link Git Commit / PR, tóm tắt công việc đã làm và khó khăn/vướng mắc (Blockers).
       - Có thể cập nhật hoặc xóa nhật ký tuần của chính mình nếu GVHD chưa khóa.
     - **Giảng viên hướng dẫn (GVHD):**
       - Xem dòng thời gian nhật ký tuần của nhóm, click mở trực tiếp link Git Commit.
       - Bấm **"Xác nhận & Nhận xét"** để tích chọn *Đã xem xét / Đồng ý tiến độ* và gửi phản hồi định hướng cho nhóm.
       - Hệ thống tự động gửi thông báo in-app `PROGRESS_LOG_FEEDBACK` đến toàn bộ thành viên nhóm.

  2. **Phân hệ 2: Hai đợt kiểm tra tiến độ tập trung (Stage 1 & Stage 2 - BR-12, BR-14):**
     - **Sinh viên nộp báo cáo tập trung:**
       - Tại thẻ **Đợt 1 (Tuần 5–6)** hoặc **Đợt 2 (Tuần 9–10)**, bấm nút **"Nộp báo cáo"**.
       - Đính kèm file tài liệu báo cáo (.pdf/.docx/.zip) và cung cấp Link kho mã nguồn / Bản demo.
       - Hệ thống tự động gửi thông báo in-app `PROGRESS_REPORT_SUBMITTED` đến GVHD.
     - **GVHD & Bộ môn đánh giá & Chấm điểm:**
       - **Đợt 1 (20%):** GVHD bấm **"Chấm điểm Đợt 1"**, nhập điểm (thang 10) và nhận xét chuyên môn. Điểm được tự động đồng bộ vào bảng điểm tích lũy `StudentGrade.midtermScore` (trọng số 20%).
       - **Đợt 2 (30% + Cổng điều kiện ≥ 50%):**
         - GVHD/Hội đồng bấm **"Chấm điểm Đợt 2"**, nhập điểm thang 10, nhận xét và **xác nhận Tỷ lệ khối lượng sản phẩm hoàn thành (%)**.
         - *Cổng kiểm soát:* Nếu tỷ lệ đạt $\ge 50\%$, hệ thống ghi nhận `isPassed = true` và đồng bộ điểm (trọng số 30%). Nếu $< 50\%$, hệ thống ghi nhận `isPassed = false`, kích hoạt cảnh báo đỏ đình chỉ bảo vệ chính thức trên cả giao diện SV và GVHD.
       - Hệ thống tự động gửi thông báo in-app `PROGRESS_REPORT_GRADED` đến sinh viên.

---

### BƯỚC 7: PHÂN CÔNG GIẢNG VIÊN PHẢN BIỆN (GVPB - BR-13)

* **Ai thực hiện:** Tổ trưởng Bộ môn (TTBM Tổ CNPM & Tổ MMT), Trợ lý Giáo vụ Khoa (TLGV / Admin).
* **Màn hình giao diện trên Web:**
  - TTBM & Ban quản lý: `/admin/reviewers` (**Phân công Giảng viên phản biện**)
  - Giảng viên được phân công: `/lecturer/reviews` (**Đề tài phản biện của tôi**)
* **3 Nguyên tắc nghiệp vụ bất di bất dịch (DLU):**
  1. ❌ **Không được vừa hướng dẫn vừa phản biện:** GVHD tuyệt đối không được làm phản biện cho chính đề tài mình hướng dẫn.
  2. 🎯 **Đúng chuyên môn / Tổ Bộ môn:** Đề tài thuộc Chuyên ngành nào (CNPM/MMT) thì GVPB bắt buộc phải là Giảng viên thuộc Bộ môn đó.
  3. ⚖️ **Cân bằng tải công việc:** Hiển thị trực tiếp chỉ số tải công việc `(HD: x | PB: y)` cạnh tên giảng viên. Giới hạn trần phản biện tối đa (mặc định 5–7 đề tài/GV).

* **Quy trình chi tiết trên Web:**
  1. **Thẩm định & Phân công phía Quản trị / TTBM (`/admin/reviewers`):**
     - Dashboard thống kê: Tổng số đề tài, Số đề tài đã phân công GVPB, Số đề tài chưa phân công.
     - Bộ lọc thông minh: Lọc theo Bộ môn (CNPM/MMT), theo Trạng thái (Chưa phân công / Đã phân công), tìm kiếm từ khóa.
     - **Chế độ 1 (Chọn thủ công):** Tại mỗi dòng đề tài, bấm Dropdown Select chọn GVPB. Dropdown tự động lọc bỏ GVHD của nhóm và hiển thị chỉ số tải `Thầy/Cô [Họ tên] (HD: x | PB: y)`.
     - **Chế độ 2 (Phân công tự động - Min-load Balancer):** Bấm nút **"Phân công tự động"** $\rightarrow$ Thiết lập trần tải tối đa $\rightarrow$ Hệ thống tự động ghép cặp ưu tiên giảng viên có số lượng phản biện ít nhất trong bộ môn $\rightarrow$ Hiển thị bảng đối soát xem trước $\rightarrow$ Bấm lưu và gửi thông báo hàng loạt.
     - Hỗ trợ nút **Hủy phân công** nhanh để thay đổi khi có phát sinh.
  2. **Quyền truy cập & Theo dõi phía Giảng viên phản biện (`/lecturer/reviews`):**
     - Nhận thông báo in-app `REVIEWER_ASSIGNED` ngay khi được phân công.
     - Mở trang **Đề tài phản biện của tôi** để xem toàn bộ danh sách nhóm phụ trách.
     - Xem thông tin nhóm sinh viên, thông tin GVHD.
     - Tải file PDF scan Đề cương M03 có chữ ký sống để nắm phạm vi nghiên cứu.
     - Tải file báo cáo tiến độ Đợt 1 (20%) và Đợt 2 (30%), click xem trực tiếp Kho mã nguồn / Link Demo dự án của nhóm.
     - Sẵn sàng bước vào khâu đọc bản thảo toàn văn và lập Phiếu nhận xét phản biện M05.

---


---

### BƯỚC 8: NỘP BÁO CÁO CUỐI KỲ, LẬP PHIẾU NHẬN XÉT M02/M04 & M05 VÀ CỔNG THẨM ĐỊNH BẢO VỆ (BR-16, BR-17)

* **Ai thực hiện:** Nhóm Sinh viên $\longrightarrow$ Giảng viên hướng dẫn (GVHD) & Giảng viên phản biện (GVPB) $\longrightarrow$ Trợ lý Giáo vụ (TLGV) & Tổ trưởng Bộ môn (TTBM).
* **Màn hình giao diện trên Web:**
  - Nhóm sinh viên: `/student/groups` (Mục **Hồ sơ Cuối kỳ & Thẩm định ra Hội đồng**) & `/student/submissions`
  - Giảng viên hướng dẫn: `/lecturer/groups/[id]` (Mục **Phiếu nhận xét GVHD & Thẩm định Bảo vệ**)
  - Giảng viên phản biện: `/lecturer/reviews` (Nút **Phiếu nhận xét M05**)
  - Quản trị / Giáo vụ: `/admin/reviewers` (Tab **Thẩm định Điều kiện Bảo vệ**) hoặc `/admin/defense-eligibility`
* **Quy trình chi tiết trên Web:**
  1. **Sinh viên nộp hồ sơ kết quả cuối kỳ (BR-16):**
     - Sinh viên nộp quyển báo cáo toàn văn (.pdf), slide thuyết trình (.pptx/.pdf) và link kho mã nguồn Git + bản sao lưu CSDL trước tuần bảo vệ.
     - Hệ thống phát thông báo in-app cho cả GVHD và GVPB vào đọc duyệt.
  2. **GVHD lập Phiếu nhận xét M02 / M04 (BR-17):**
     - GVHD vào trang nhóm hướng dẫn (`/lecturer/groups/[id]`), bấm **"Lập / Cập nhật Phiếu nhận xét (M02/M04)"**.
     - Hệ thống tự động nhận diện loại đề tài: `M04` cho Khóa luận tốt nghiệp (KLTN), `M02` cho Đồ án cơ sở/chuyên ngành (ĐACS/ĐACN).
     - Điền barem tiêu chí: Tinh thần thái độ, khối lượng hoàn thành, chất lượng sản phẩm thực nghiệm, bố cục quyển báo cáo.
     - Nhập nhận xét chung và chọn kết luận then chốt: **"Đồng ý cho phép bảo vệ"** hoặc **"Không đồng ý"** (`isDefenseAllowed`).
     - Hỗ trợ tab **"Xem biểu mẫu DLU"** để in hoặc xem trước văn bản chuẩn theo mẫu hành chính Trường Đại học Đà Lạt.
  3. **GVPB lập Phiếu nhận xét M05 (BR-17):**
     - GVPB vào trang `/lecturer/reviews`, bấm **"Phiếu nhận xét M05"**.
     - Đánh giá barem: Tính cấp thiết, phương pháp nghiên cứu, chất lượng mã nguồn/demo, kết cấu quyển báo cáo.
     - **Nhập các câu hỏi chất vấn trước Hội đồng:** GVPB đặt 1–3 câu hỏi để nhóm sinh viên đọc trước và chuẩn bị trả lời khi bảo vệ.
     - Chọn kết luận: **"Đồng ý cho phép bảo vệ"** hoặc **"Không đồng ý"** (`isDefenseAllowed`).
  4. **Cổng kiểm soát điều kiện ra Hội đồng (Defense Eligibility Gate):**
     - Quy tắc cứng: Một nhóm chỉ đạt trạng thái **"ĐỦ ĐIỀU KIỆN BẢO VỆ"** khi đồng thời thỏa mãn:
       + Điểm kiểm tra Tiến độ 2 đạt $\ge 50\%$ khối lượng (không bị cờ cảnh báo đỏ).
       + GVHD tích chọn: `isDefenseAllowed = true`.
       + GVPB tích chọn: `isDefenseAllowed = true`.
     - Nếu 1 trong 2 giảng viên từ chối: Nhóm chuyển sang trạng thái **"TỪ CHỐI / ĐÌNH CHỈ BẢO VỆ"**.
  5. **Giáo vụ Khoa & TTBM rà soát và xuất danh sách đối soát:**
     - Tại `/admin/defense-eligibility` hoặc tab Thẩm định trên `/admin/reviewers`, Giáo vụ theo dõi Dashboard thống kê: Tổng số nhóm, Đủ điều kiện, Chờ duyệt, Đình chỉ.
     - Bấm nút **"Xuất danh sách đối soát (CSV)"** để kết xuất danh sách chính thức phục vụ thành lập Hội đồng (BR-18).

### BƯỚC 9: THÀNH LẬP HỘI ĐỒNG, XẾP LỊCH BẢO VỆ & CHẤM ĐIỂM CUỐI KỲ (BR-18)

* **Ai thực hiện:** Trợ lý Giáo vụ Khoa (TLGV) / Admin $\longleftrightarrow$ Thành viên Hội đồng (Chủ tịch, Thư ký, GVPB, Ủy viên) $\longleftrightarrow$ Sinh viên.
* **Màn hình giao diện trên Web:**
  - Quản trị / Giáo vụ: `/admin/councils` (**Quản lý Hội đồng & Xếp lịch bảo vệ**)
  - Giảng viên Hội đồng: `/lecturer/councils` (**Hội đồng bảo vệ của tôi**)
  - Nhóm sinh viên: `/student/groups` (Phần **Lịch bảo vệ & Bảng điểm tổng kết**)
* **Quy trình chi tiết trên Web:**
  1. **Thành lập Hội đồng & Xếp lịch (`/admin/councils`):**
     - Giáo vụ/Admin tạo Hội đồng: Tên hội đồng (ví dụ: *Hội đồng KLTN 01 - Chuyên ngành Phần mềm*), chọn Học kỳ, chọn Chuyên ngành (CNPM/MMT), địa điểm (Phòng bảo vệ, ví dụ: *A11.204*), ngày bảo vệ.
     - Gán thành viên Hội đồng (3–5 giảng viên): Chủ tịch (`PRESIDENT`), Thư ký (`SECRETARY`), Ủy viên (`MEMBER`).
     - **Xếp lịch bảo vệ:** Chọn các nhóm đồ án đã đạt trạng thái **"ĐỦ ĐIỀU KIỆN BẢO VỆ"** từ Bước 8, gán vào Hội đồng, phân bổ ca bảo vệ (`timeSlot`, ví dụ: *08:00 - 08:45*) và thứ tự bảo vệ (`defenseOrder`).
  2. **Chấm điểm bảo vệ độc lập phía Giảng viên Hội đồng (`/lecturer/councils`):**
     - Giảng viên thấy danh sách Hội đồng mình tham gia và các nhóm trong buổi bảo vệ.
     - Bấm vào nhóm để xem thông tin đề tài, xem file báo cáo cuối kỳ, link mã nguồn/demo.
     - **Chấm điểm độc lập (Chấm thầm):** Mỗi thành viên nhập điểm đánh giá của riêng mình (thang 10, bước nhảy 0.1) và nhận xét.
     - **Bảo mật điểm số:** Các giảng viên không nhìn thấy điểm của nhau trước khi có kết quả chính thức.
  3. **Hệ thống tự động tính điểm & Đồng bộ bảng điểm chuẩn DLU:**
     - **Điểm Hội đồng (50%):** Tự động tính điểm trung bình cộng của các thành viên trong Hội đồng đã chấm:
       $$\text{Điểm HĐ} = \frac{\sum \text{Điểm thành viên}}{N}$$
     - **Điểm Tổng Kết toàn diện:** Tự động tính theo công thức chuẩn Khoa CNTT - DLU:
       $$\text{Điểm TK} = (20\% \times \text{Điểm TĐ1}) + (30\% \times \text{Điểm TĐ2}) + (50\% \times \text{Điểm HĐ})$$
     - Tự động quy đổi sang Điểm chữ (A, B+, B, C+, C, D+, D, F) và đồng bộ vào `StudentGrade`.
     - Hỗ trợ nút **"Khóa & Chốt điểm"** để đóng băng bảng điểm của nhóm sau khi hoàn thành buổi bảo vệ.
  4. **📌 TÍNH NĂNG NÂNG CAO (Roadmap tương lai):**
     - Bàn làm việc Thư ký (Secretary Console): Thư ký theo dõi real-time trạng thái nộp điểm của từng thành viên, gõ tóm tắt Biên bản chất vấn & Yêu cầu chỉnh sửa của Hội đồng, và xuất file PDF Biên bản họp bảo vệ chuẩn DLU. *(Tạm thời để ở roadmap, ưu tiên xử lý luồng cốt lõi trước).*

---

## 4. BẢNG TỔNG HỢP PHÂN QUYỀN VÀ THAO TÁC CỦA TỪNG VAI TRÒ HIỆN TẠI

| Vai trò | Màn hình truy cập | Những việc ĐƯỢC LÀM trên giao diện hiện tại | Ràng buộc hệ thống |
| :--- | :--- | :--- | :--- |
| **Trợ lý Giáo vụ Khoa (TLGV) / Admin** | `/admin`<br>`/admin/topic-registry`<br>`/admin/allocations`<br>`/admin/semesters`<br>`/admin/students`<br>`/admin/outlines`<br>`/admin/reviewers`<br>`/admin/defense-eligibility`<br>`/admin/councils` | • Tạo & kích hoạt Học kỳ, thiết lập Đợt đồ án (ĐACS/ĐACN/KLTN)<br>• Tải mẫu Excel & Import danh sách SV đủ điều kiện từ PĐT<br>• Lọc sinh viên theo mã lớp (`CTK48`, `CTK46PM`...), theo đợt, theo tình trạng nhóm<br>• Xuất Excel sinh viên đối soát với PĐT<br>• Quản lý danh mục đề tài, mở đăng ký từng đề tài hoặc đồng loạt (`APPROVED` $\rightarrow$ `OPEN`)<br>• Xuất file CSV Tờ trình giao đề tài chính thức để trình BCN Khoa ký văn bản giấy ngoài hệ thống<br>• Phân công GVPB thủ công hoặc chạy phân công tự động toàn khoa<br>• Thẩm định điều kiện ra bảo vệ và xuất danh sách đối soát<br>• **Thành lập Hội đồng bảo vệ, gán thành viên và xếp lịch bảo vệ cho nhóm đủ ĐK** | • Không xóa học kỳ đã có dữ liệu<br>• Không thể xóa sinh viên đủ điều kiện nếu sinh viên đó đã lập nhóm đồ án<br>• Không chọn GVPB trùng GVHD<br>• Chỉ xếp lịch cho nhóm đã đủ điều kiện bảo vệ |
| **Giảng viên hướng dẫn (GVHD)** | `/lecturer`<br>`/lecturer/outlines`<br>`/lecturer/groups`<br>`/lecturer/groups/[id]` | • Tạo đề tài mới, chọn tổ CNPM/MMT, chọn số lượng 1–3 SV, gửi Bộ môn thẩm định<br>• Xem file PDF scan Đề cương M03 có chữ ký sống của SV, bấm Phê duyệt/Yêu cầu sửa<br>• Duyệt đề tài SV đề xuất<br>• **Tiến độ:** Xem dòng thời gian nhật ký tuần của nhóm, bấm xác nhận & nhận xét<br>• **Đợt 1:** Chấm điểm tiến độ 1 (thang 10, trọng số 20%)<br>• **Đợt 2:** Chấm điểm tiến độ 2 (thang 10, trọng số 30%) và đánh giá khối lượng hoàn thành (≥ 50% đạt, < 50% cảnh báo đình chỉ)<br>• **Lập phiếu nhận xét GVHD M02/M04**, kết luận cho phép bảo vệ | • Chỉ thao tác trên các nhóm do chính mình hướng dẫn |
| **Giảng viên phản biện (GVPB)** | `/lecturer/reviews` | • Nhận thông báo khi được phân công phản biện<br>• Xem danh sách nhóm được phân công phản biện<br>• Xem đề cương M03, tải báo cáo Đợt 1 & Đợt 2, xem repo source code/demo của nhóm SV<br>• **Lập phiếu nhận xét GVPB M05**, đặt câu hỏi chất vấn, kết luận cho phép bảo vệ | • Chỉ xem các đề tài do Bộ môn phân công mình phản biện |
| **Thành viên Hội đồng bảo vệ** | `/lecturer/councils` | • Xem danh sách các Hội đồng bảo vệ mình tham gia (Chủ tịch / Thư ký / Ủy viên)<br>• Xem hồ sơ, báo cáo cuối kỳ, link demo của nhóm trong buổi bảo vệ<br>• **Nhập điểm đánh giá bảo vệ độc lập (thang 10)** cho từng nhóm | • Không thấy điểm của giảng viên khác trước khi công bố |
| **Tổ trưởng Bộ môn (TTBM)** | `/lecturer/topic-reviews`<br>`/admin/reviewers`<br>`/admin/defense-eligibility`<br>`/admin/councils` | • Thẩm định chuyên môn đề tài thuộc tổ bộ môn: Chấp thuận (chuyển thẳng sang `APPROVED`), Yêu cầu sửa, hoặc Từ chối<br>• **Phân công GVPB:** Phân công thủ công hoặc chạy phân công tự động min-load balancer cho toàn bộ đề tài trong tổ bộ môn mình phụ trách<br>• Rà soát điều kiện bảo vệ và danh sách Hội đồng bảo vệ theo Chuyên ngành | • Chỉ thấy và thao tác trên đề tài thuộc đúng chuyên ngành/tổ mình quản lý (CNPM hoặc MMT)<br>• Ràng buộc không trùng GVHD |
| **Sinh viên (Đủ điều kiện)** | `/student`<br>`/student/topics`<br>`/student/groups`<br>`/join/[code]` | • Thấy Banner xanh báo đủ điều kiện kèm mốc hạn M03<br>• Tra cứu đề tài theo đúng chuyên ngành của mình<br>• Đăng ký đề tài (làm Trưởng nhóm), nhận Join Code mời bạn<br>• Nhập Join Code gia nhập nhóm (1–3 bạn)<br>• Tải mẫu M03 PDF chuẩn, nộp file PDF scan có chữ ký sống của GVHD<br>• **Tiến độ tuần:** Tạo/sửa/xóa nhật ký tuần (tiến độ %, git commit, blockers)<br>• **Báo cáo Đợt 1 & 2:** Nộp file báo cáo + link mã nguồn/demo, theo dõi điểm và phản hồi của GVHD/Hội đồng<br>• **Cuối kỳ:** Nộp báo cáo toàn văn, slide thuyết trình, link source demo<br>• **Lịch bảo vệ & Điểm tổng kết:** Xem ca thi, phòng bảo vệ và bảng điểm tổng kết chính thức | • Chỉ được tham gia tối đa 1 nhóm/đợt<br>• Nhóm tối đa 3 thành viên<br>• Bị khóa nộp lại M03 khi GVHD đã duyệt<br>• Không thể xóa nhật ký tuần khi GVHD đã xác nhận |
| **Sinh viên (Chưa đủ điều kiện)** | `/student` | • Đăng nhập xem thông tin tài khoản<br>• Thấy Banner màu cam cảnh báo chưa đủ điều kiện | • **Bị chặn toàn bộ**: Không thể tạo nhóm, không thể đăng ký đề tài, không thể nộp đề cương |

---

## 5. TỔNG KẾT & ĐIỂM DỪNG KỸ THUẬT HIỆN TẠI

* **Trạng thái kỹ thuật hiện tại:** Toàn bộ chu trình từ **Bước 0 đến Bước 8** đã được lập trình hoàn chỉnh, đồng bộ 100% giữa Database PostgreSQL, Backend NestJS (`probase-api`) và Frontend Next.js (`probase-app`).
* **Phân hệ đang triển khai tiếp theo:**
  * **BR-18 (Thành lập Hội đồng, Xếp lịch bảo vệ & Chấm điểm cuối kỳ 50%):** Hoàn thiện API `councils` và giao diện `/admin/councils`, `/lecturer/councils`.
* **Các phân hệ tiếp theo (Roadmap):**
  1. **BR-19 & BR-20 (Gói nộp lưu trữ số hóa 3 thành phần & Thư viện số đồ án):** Nộp `SOURCE`, `DATABASE`, `THESIS` sau bảo vệ và mở kho tra cứu khóa sau.
  2. **BR-15 (Quản lý thay đổi trong quá trình thực hiện - TopicChangeRequest):** Đổi tên đề tài, đổi thành viên nhóm, xin gia hạn nộp báo cáo.
  3. **BR-21 (Thống kê & Xuất báo cáo giáo vụ toàn diện):** Định mức giờ GV, phổ điểm A/B/C/D/F.



