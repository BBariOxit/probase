# Luồng Hoạt Động Vận Hành Thực Tế Hiện Tại Của ProBase
## Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt (DLU)

> **Mục đích tài liệu:** Ghi chép đầy đủ, chi tiết và trực quan **toàn bộ luồng hoạt động thực tế của ứng dụng hiện tại từ đầu đến cuối chu trình**: Bắt đầu từ khâu khởi tạo của Khoa, đi qua từng tác nhân (Giáo vụ, Giảng viên, Bộ môn, Ban Chủ nhiệm, Sinh viên), ở mỗi bước từng tác nhân **làm gì, được làm những gì trên màn hình giao diện**, hệ thống kiểm soát ràng buộc gì và tự động xử lý những gì ở hậu trường.
>
> ⚠️ **Nguyên tắc bất biến:** Tài liệu này **CHỈ GHI NHẬN NHỮNG TÍNH NĂNG ĐÃ LÀM XONG 100%, ĐÃ CÓ CODE, ĐÃ TEST VÀ ĐANG CHẠY ỔN ĐỊNH TRÊN HỆ THỐNG**. Các phân hệ tiếp theo (Nhật ký tuần, Chấm điểm tiến độ 1 & 2, Hội đồng bảo vệ...) chưa xong nên tuyệt đối chưa ghi vào đây.

---

## 1. CÁC NGUYÊN TẮC NGHIỆP VỤ CỐT LÕI (DLU)

1. **Lộ trình đào tạo & Chuyên ngành (Tổ bộ môn):**
   - Trường Đại học Đà Lạt tuyển sinh 1 ngành chung: **Công nghệ Thông tin**.
   - **Năm 1 & Năm 2 (ví dụ khóa K48, K49):** Toàn bộ sinh viên học chung khung đại trà (đại cương và cơ sở ngành). Lớp sinh hoạt chưa phân nhánh chuyên ngành (mã lớp dạng `CTK48`, `CTK47`).
     - Khi làm **Đồ án cơ sở (ĐACS)** ở cuối năm 2: Sinh viên chưa có chuyên ngành (`majorId = null`), làm chung ngân hàng đề tài cơ sở.
   - **Đầu năm thứ 3:** Khoa tổ chức tư vấn và sinh viên đăng ký phân về 2 Chuyên ngành chính (tương ứng với 2 Tổ bộ môn chuyên môn):
     - `CNPM`: **Công nghệ phần mềm** (mã lớp tách thành dạng `CTK46PM`, `CTK47PM`).
     - `MMT`: **Mạng máy tính và Truyền thông dữ liệu** (mã lớp tách thành dạng `CTK46MMT`, `CTK47MMT`).
   - **Năm 3 (ĐACN) và Năm 4 (KLTN):** Hệ thống bắt buộc lọc đề tài và thẩm định chuyên môn đúng theo Chuyên ngành của sinh viên và Bộ môn phụ trách.

2. **Quy mô nhóm đồ án:** Mỗi nhóm đồ án cho phép từ **1 đến 3 sinh viên**.

3. **Chữ ký thẩm định Đề cương M03:** Ban hành theo mẫu chuẩn của Khoa CNTT - DLU. Sinh viên in bản giấy, **gặp trực tiếp GVHD để xin chữ ký sống**, sau đó scan/chụp thành 1 file PDF duy nhất để nộp lên hệ thống.

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
[BƯỚC 3: GVHD ➔ TTBM ➔ Ban Chủ nhiệm Khoa]
   │ GVHD soạn đề tài ➔ TTBM duyệt cấp 1 ➔ BCN Khoa phê duyệt cấp 2 (Mở cổng)
   ▼
[BƯỚC 4: Sinh viên đủ điều kiện]
   │ Tra cứu đề tài theo ngành ➔ Đăng ký đề tài ➔ Lập nhóm 1–3 bạn qua Join Code
   ▼
[BƯỚC 5: Nhóm SV ➔ GVHD ➔ Giáo vụ & BCN Khoa]
   │ Tải mẫu M03 ➔ Xin chữ ký sống GVHD ➔ Nộp PDF scan ➔ GVHD duyệt ➔ Khoa ra Tờ trình
   ▼
[BƯỚC VÀO GIAI ĐOẠN THỰC HIỆN ĐỒ ÁN]
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
     - Khai báo danh sách Giảng viên cơ hữu trong Khoa, phân bổ về 2 Tổ bộ môn: **Bộ môn Công nghệ phần mềm (CNPM)** hoặc **Bộ môn Mạng máy tính (MMT)**.
     - Gán vai trò chức vụ kiêm nhiệm cho giảng viên: Giảng viên hướng dẫn (`GVHD`), Tổ trưởng bộ môn (`TTBM`), Ban Chủ nhiệm Khoa (`BCN Khoa` / Dean / Vice-Dean), Trợ lý Giáo vụ (`TLGV`).
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

* **Ai thực hiện:** Tất cả người dùng trong Khoa (Sinh viên, Giảng viên, TTBM, BCN Khoa).
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
     - **Giảng viên / Ban Chủ nhiệm:** Điều hướng sang Dashboard Giảng viên (`/lecturer`) hoặc Quản trị (`/admin`).
     - **Sinh viên:** Điều hướng sang Dashboard Sinh viên (`/student`) với giao diện phân hóa:
       - *Sinh viên ĐỦ ĐIỀU KIỆN:* Hiển thị **Banner màu xanh ngọc**: *"🎉 Bạn đủ điều kiện đăng ký đồ án học kỳ này. Hạn nộp Đề cương M03: [Ngày/Tháng]"* kèm nút tắt chuyển nhanh vào Nhóm, đồng thời mở toàn quyền đăng ký đề tài.
       - *Sinh viên CHƯA ĐỦ ĐIỀU KIỆN:* Hiển thị **Banner màu cam cảnh báo**: *"⚠️ Tài khoản của bạn chưa nằm trong danh sách đủ điều kiện làm đồ án đợt này. Vui lòng liên hệ Giáo vụ Khoa nếu có thắc mắc."* và **bị khóa cứng nút đăng ký đề tài/tạo nhóm**.

---

### BƯỚC 3: XÂY DỰNG & PHÊ DUYỆT NGÂN HÀNG ĐỀ TÀI (QUY TRÌNH 2 CẤP)

* **Ai thực hiện:** Giảng viên hướng dẫn (GVHD) $\rightarrow$ Tổ trưởng Bộ môn (TTBM) $\rightarrow$ Ban Chủ nhiệm Khoa (BCN Khoa).
* **Quy trình đi qua từng tác nhân:**
  1. **Giảng viên hướng dẫn (GVHD):**
     - Vào trang **Đề tài của tôi** $\rightarrow$ Bấm **"Thêm đề tài mới"** (`/lecturer/topics/new`).
     - Soạn thảo đề tài: Tên đề tài (Tiếng Việt & Tiếng Anh), chọn Chuyên ngành (**Công nghệ phần mềm** hoặc **Mạng máy tính**), Mục tiêu nghiên cứu, Nội dung yêu cầu kỹ thuật, Công nghệ sử dụng, Số lượng sinh viên tối đa (**1 đến 3 SV**).
     - GVHD có thể nhân bản từ đề tài các học kỳ trước để cập nhật nhanh.
     - Bấm nộp: Đề tài mang trạng thái `PENDING_DEPARTMENT` (Chờ Bộ môn thẩm định).
  2. **Tổ trưởng Bộ môn (TTBM - Tổ CNPM hoặc Tổ MMT):**
     - Đăng nhập với quyền TTBM vào màn hình Duyệt đề tài (`/admin/topics`).
     - Hệ thống chỉ lọc hiển thị các đề tài thuộc Chuyên ngành/Tổ bộ môn mà TTBM đó phụ trách.
     - Thẩm định độ khó, tính thực tiễn và tính trùng lặp.
     - TTBM được làm 3 hành động:
       - **Chấp thuận**: Đề tài được chuyển lên cấp Khoa (`PENDING_FACULTY`).
       - **Yêu cầu chỉnh sửa**: Trả về cho GVHD kèm lời nhắn nhận xét.
       - **Từ chối**: Hủy đề tài không đạt yêu cầu.
  3. **Ban Chủ nhiệm Khoa (BCN Khoa):**
     - Rà soát toàn bộ đề tài đã được 2 Bộ môn thông qua.
     - Bấm **"Phê duyệt chính thức"** (`APPROVED_OPEN`): Đề tài chính thức mở cổng trên hệ thống để sinh viên toàn khoa tra cứu và đăng ký.

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

* **Ai thực hiện:** Nhóm Sinh viên $\rightarrow$ Giảng viên hướng dẫn (GVHD) $\rightarrow$ Giáo vụ & Ban Chủ nhiệm Khoa.
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
  4. **Giáo vụ & Ban Chủ nhiệm Khoa theo dõi & Ra Quyết định:**
     - Giáo vụ và BCN Khoa vào trang **Đề cương M03 toàn khoa** (`/admin/outlines`).
     - Xem Dashboard tiến độ: Tổng số nhóm, số nhóm đã duyệt, chờ duyệt, yêu cầu sửa, chưa nộp.
     - Bấm nút **"Xuất Tờ trình CSV"**: Tự động kết xuất file CSV danh sách đề tài và đề cương đã được GVHD phê duyệt để Giáo vụ lập Tờ trình trình Ban Chủ nhiệm Khoa ký Quyết định giao đề tài chính thức.

---

## 4. BẢNG TỔNG HỢP PHÂN QUYỀN VÀ THAO TÁC CỦA TỪNG VAI TRÒ HIỆN TẠI

| Vai trò | Màn hình truy cập | Những việc ĐƯỢC LÀM trên giao diện hiện tại | Ràng buộc hệ thống |
| :--- | :--- | :--- | :--- |
| **Trợ lý Giáo vụ Khoa (TLGV) / Admin** | `/admin/semesters`<br>`/admin/students`<br>`/admin/outlines` | • Tạo & kích hoạt Học kỳ, thiết lập Đợt đồ án (ĐACS/ĐACN/KLTN)<br>• Tải mẫu Excel & Import danh sách SV đủ điều kiện từ PĐT<br>• Lọc sinh viên theo mã lớp (`CTK48`, `CTK46PM`...), theo đợt, theo tình trạng nhóm<br>• Xuất Excel sinh viên đối soát với PĐT<br>• Xuất file CSV Tờ trình giao đề tài chính thức | • Không xóa học kỳ đã có dữ liệu<br>• Không thể xóa sinh viên đủ điều kiện nếu sinh viên đó đã lập nhóm đồ án |
| **Giảng viên hướng dẫn (GVHD)** | `/lecturer/topics`<br>`/lecturer/outlines`<br>`/lecturer/groups` | • Tạo đề tài mới, nhân bản đề tài cũ, chọn tổ CNPM/MMT, chọn số lượng 1–3 SV<br>• Xem file PDF scan Đề cương M03 có chữ ký sống của SV<br>• Nhập nhận xét văn bản, bấm **Phê duyệt** hoặc **Yêu cầu chỉnh sửa** Đề cương M03<br>• Duyệt đề tài do sinh viên tự đề xuất | • Chỉ duyệt đề cương của các nhóm do chính mình hướng dẫn |
| **Tổ trưởng Bộ môn (TTBM)** | `/admin/topics` | • Xem danh sách đề tài do các GV trong tổ bộ môn soạn thảo<br>• Bấm **Chấp thuận** (chuyển cấp Khoa), **Yêu cầu sửa**, hoặc **Từ chối** | • Chỉ thấy và duyệt đề tài thuộc đúng chuyên ngành/tổ mình quản lý (CNPM hoặc MMT) |
| **Ban Chủ nhiệm Khoa (BCN Khoa)** | `/admin/topics`<br>`/admin/outlines` | • Phê duyệt chính thức đề tài cấp Khoa để mở cổng đăng ký cho sinh viên<br>• Xem báo cáo tổng quan tiến độ duyệt Đề cương M03 toàn khoa | • Thẩm định sau khi TTBM đã chấp thuận |
| **Sinh viên (Đủ điều kiện)** | `/student`<br>`/student/topics`<br>`/student/groups`<br>`/join/[code]` | • Thấy Banner xanh báo đủ điều kiện kèm mốc hạn M03<br>• Tra cứu đề tài theo đúng chuyên ngành của mình<br>• Đăng ký đề tài (làm Trưởng nhóm), nhận Join Code mời bạn<br>• Nhập Join Code gia nhập nhóm (1–3 bạn)<br>• Tải mẫu M03 PDF chuẩn, nộp file PDF scan có chữ ký sống của GVHD<br>• Xem nhận xét của GVHD khi bị yêu cầu sửa đề cương | • Chỉ được tham gia tối đa 1 nhóm/đợt<br>• Nhóm tối đa 3 thành viên<br>• Bị khóa nộp lại khi GVHD đã duyệt |
| **Sinh viên (Chưa đủ điều kiện)** | `/student` | • Đăng nhập xem thông tin tài khoản<br>• Thấy Banner màu cam cảnh báo chưa đủ điều kiện | • **Bị chặn toàn bộ**: Không thể tạo nhóm, không thể đăng ký đề tài, không thể nộp đề cương |

---

## 5. TỔNG KẾT & ĐIỂM DỪNG KỸ THUẬT HIỆN TẠI

* **Trạng thái kỹ thuật hiện tại:** Toàn bộ chu trình từ **Bước 0 đến Bước 5** đã được lập trình hoàn chỉnh, đồng bộ 100% giữa Database PostgreSQL, Backend NestJS (`probase-api`) và Frontend Next.js (`probase-app`).
* **Các phân hệ tiếp theo (Giai đoạn thực hiện & Bảo vệ đồ án - SẼ LÀM TIẾP THEO):**
  1. **BR-11 (Nhật ký tuần - WeeklyLog):** Sinh viên báo cáo tiến độ hàng tuần (commit Git, công việc hoàn thành), GVHD phản hồi nhận xét.
  2. **BR-12 (Báo cáo Tiến độ 1 - 20%):** Nhóm nộp báo cáo đợt 1, GVHD chấm điểm trọng số 20%.
  3. **BR-13 (Phân công Giảng viên phản biện - GVPB):** Giáo vụ/Bộ môn phân công GVPB cùng chuyên môn CNPM/MMT.
  4. **BR-14 (Báo cáo Tiến độ 2 - 30%):** Báo cáo tiến độ đợt 2, GVHD chấm điểm trọng số 30%.
  5. **BR-16 $\rightarrow$ BR-21 (Đánh giá cuối kỳ & Hội đồng bảo vệ - 50%):** Nhận xét M02 (GVHD), M05 (GVPB), chấm điểm Hội đồng và lưu trữ số khóa luận.

