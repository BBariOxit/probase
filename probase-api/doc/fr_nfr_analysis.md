# Phân tích Yêu cầu Chức năng (FR) và Phi Chức năng (NFR)
## Hệ thống Quản lý Đồ án - Khoa Công nghệ Thông tin (Trường Đại học Đà Lạt - DLU)

Tài liệu này định nghĩa chi tiết toàn bộ yêu cầu nghiệp vụ, quy trình hành chính và các quy tắc kiểm tra (Business Rules) bám sát thực tế hoạt động đào tạo của Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt.

---

## 1. BỐI CẢNH & MÔ HÌNH TỔ CHỨC KHOA CNTT - DLU

1. **Ngành đào tạo duy nhất:**
   - Khoa CNTT - Đại học Đà Lạt tuyển sinh một ngành duy nhất: **Ngành Công nghệ Thông tin** (Mã ngành: `7480201`).
   - Khóa sinh viên được định danh theo năm nhập học: `CTK44`, `CTK45`, `CTK46`, `CTK47`, `CTK48`...
   - Hai năm đầu sinh viên học chung khối kiến thức đại cương và cơ sở ngành.

2. **Hai Chuyên ngành đào tạo (từ năm thứ 3):**
   - Đến năm 3, sinh viên được phân vào một trong **2 Chuyên ngành (hướng chuyên sâu)**:
     1. **Công nghệ phần mềm** (Mã: `CNPM`, mã lớp: ví dụ `CTK46PM`).
     2. **Mạng máy tính** (Mã: `MMT`, mã lớp: ví dụ `CTK46MMT`).
   - Hai chuyên ngành này tương ứng với **2 Tổ chuyên môn** của Khoa, phụ trách bởi **Tổ trưởng Bộ môn (TTBM)** chuyên trách.

3. **Ba loại đồ án trong chương trình đào tạo:**
   - **Đồ án cơ sở (ĐACS)**: Thường dành cho sinh viên năm 2 (ví dụ CTK48).
   - **Đồ án chuyên ngành (ĐACN)**: Dành cho sinh viên năm 3 theo từng chuyên ngành CNPM hoặc MMT (ví dụ CTK47).
   - **Khóa luận tốt nghiệp / Đồ án tốt nghiệp (KLTN / ĐATN)**: Dành cho sinh viên năm cuối đủ điều kiện tốt nghiệp (ví dụ CTK46).

---

## 2. BẢNG XÁC ĐỊNH 6 TÁC NHÂN (ACTORS) VÀ VAI TRÒ THỰC TẾ

| STT | Tác nhân (Actor) | Vai trò và trách nhiệm thực tế tại Khoa CNTT - DLU |
| :---: | :--- | :--- |
| **1** | **Trợ lý Giáo vụ Khoa (TLGV) / Quản trị hệ thống** | - Thiết lập năm học, học kỳ, đợt làm đồ án (ĐACS, ĐACN, ĐATN) và cấu hình Timeline các mốc deadline.<br>- Import danh sách sinh viên đủ điều kiện làm đồ án theo file Excel từ Phòng Đào tạo/Giáo vụ.<br>- Tổng hợp danh sách đề tài, đề cương M03 đã được GVHD duyệt để xuất Tờ trình cho BCN Khoa ký quyết định.<br>- Quản lý kho lưu trữ đồ án số hóa, xuất bảng điểm tổng hợp và báo cáo thống kê giáo vụ. |
| **2** | **Ban Chủ nhiệm Khoa (BCN Khoa)** | - Xét duyệt danh sách đề tài toàn Khoa trước khi mở cổng cho SV đăng ký.<br>- Phê duyệt và ký Quyết định công bố danh sách chính thức (Đề tài – Sinh viên – GVHD) sau vòng duyệt Đề cương M03.<br>- Phê duyệt danh sách phân công Giảng viên phản biện (GVPB) và thành lập Hội đồng bảo vệ.<br>- Xem báo cáo thống kê toàn diện (tải hướng dẫn GV, tỷ lệ hoàn thành, phổ điểm A/B/C/D/F). |
| **3** | **Tổ trưởng Bộ môn / Trưởng nhóm chuyên môn (TTBM)** | - Phụ trách 2 tổ chuyên môn: **Công nghệ phần mềm** và **Mạng máy tính**.<br>- Rà soát, thẩm định nội dung chuyên môn các đề tài do giảng viên trong bộ môn đề xuất.<br>- Tiếp nhận và kiểm tra tập hợp đề cương nghiên cứu M03 từ GVHD thuộc bộ môn.<br>- Đề xuất phân công GVHD (đợt Khoa giao đề tài) và phân công GVPB đúng chuyên môn trước đợt Báo cáo tiến độ lần 2. |
| **4** | **Giảng viên hướng dẫn (GVHD)** | - Đề xuất danh sách đề tài mới (hoặc sao chép đề tài cũ có tinh chỉnh) theo đúng chuyên ngành.<br>- Xác nhận duyệt nhóm SV đăng ký đề tài (hoặc duyệt đề tài do SV tự đề xuất).<br>- Hướng dẫn, nhận xét và phê duyệt Đề cương chi tiết (Mẫu M03) của SV nộp lên Khoa.<br>- Theo dõi nhật ký tuần, kiểm tra và chấm điểm Báo cáo tiến độ lần 1 (trọng số **20%**).<br>- Phối hợp cùng GVPB kiểm tra, đánh giá và chấm điểm Báo cáo tiến độ lần 2 (trọng số **30%**).<br>- Đọc duyệt bản nộp cuối kỳ, viết Nhận xét của GVHD (**Mẫu M02/M04**), xác nhận cho phép SV ra bảo vệ và chấm điểm Bảo vệ cuối kỳ (trọng số **50%**). |
| **5** | **Giảng viên phản biện (GVPB) / Thành viên Hội đồng** | - Nhận danh sách đề tài được phân công phản biện từ trước đợt Báo cáo tiến độ lần 2 (cùng chuyên môn CNPM hoặc MMT, khác GVHD).<br>- Xem đề cương M03, xem sản phẩm tại Tiến độ 2 và cùng GVHD chấm điểm Tiến độ lần 2 (**30%**).<br>- Đọc quyển báo cáo toàn văn và kiểm tra source code hoàn chỉnh ở giai đoạn cuối kỳ; viết Nhận xét của GVPB (**Mẫu M05**), xác nhận đề tài đạt yêu cầu bảo vệ và tham gia chấm điểm Bảo vệ (**50%**). |
| **6** | **Sinh viên (SV / Nhóm SV 1–2 bạn)** | - Đăng nhập Google SSO `@dlu.edu.vn`, tra cứu danh sách đề tài đã được duyệt; lập nhóm (1–3 SV) để đăng ký đề tài hoặc gửi đề xuất đề tài mới cho GVHD.<br>- Soạn thảo và nộp trực tuyến Đề cương thực hiện đồ án (**Mẫu M03**) theo mẫu chuẩn của Khoa.<br>- Cập nhật nhật ký tuần (link Git, tiến độ), nộp báo cáo Tiến độ lần 1, Tiến độ lần 2 và Báo cáo cuối kỳ.<br>- Gửi yêu cầu điều chỉnh (đổi tên đề tài, gia hạn, đổi thành viên) khi phát sinh.<br>- Nộp gói lưu trữ số hóa hoàn chỉnh (**SOURCE, DATABASE, THESIS**) sau khi bảo vệ; tra cứu kho đồ án tham khảo. |

---

## 3. CHI TIẾT 23 YÊU CẦU NGHIỆP VỤ (BUSINESS REQUIREMENTS - BR)

### Phân hệ 1: Thiết lập đợt đồ án & Quản lý danh mục

#### BR-01: Quản lý đợt đồ án & Cấu hình Timeline 7 giai đoạn
- **Tác nhân:** TLGV, BCN Khoa.
- **Mô tả:** Cho phép tạo đợt đồ án theo `Học kỳ` – `Năm học` – `Khóa` – `Loại đồ án` (VD: ĐATN CTK46 HK1 2026-2027, ĐACN CTK47 HK1, ĐACS CTK48 HK2).
- Cấu hình thời gian đóng/mở tự động cho 7 giai đoạn:
  1. *Đề xuất & Duyệt đề tài* (GV ra đề, TTBM & Khoa duyệt).
  2. *SV chọn đề tài & Lập nhóm* (Mở cổng đăng ký).
  3. *Lập & Duyệt Đề cương M03* (Tuần 1 sau khi chốt đề tài).
  4. *Tiến độ lần 1 (20%)* (Tuần 4–5).
  5. *Tiến độ lần 2 (30%)* (Tuần 9–10, phân công GVPB trước 1 tuần).
  6. *Nộp kết quả cuối kỳ & Nhập nhận xét M02/M05* (Tuần 14–15).
  7. *Bảo vệ Hội đồng (50%) & Nộp gói lưu trữ*.
- **Đầu ra:** Lịch trình hiển thị trực quan dưới dạng Stepper/Timeline trên Dashboard; hệ thống tự khóa/mở cổng nộp theo hạn.

#### BR-02: Quản lý danh sách SV đủ điều kiện & Import Excel theo Đợt
- **Tác nhân:** Trợ lý Giáo vụ Khoa (TLGV) / Quản trị hệ thống (Admin).
- **Nguồn gốc dữ liệu:** File Excel danh sách sinh viên đủ điều kiện làm đồ án do Phòng Đào tạo (PĐT) thẩm định và chuyển giao cho Văn phòng Khoa sau khi kết thúc đợt đăng ký tín chỉ học phần.
- **Quy trình Import theo Đợt (Học kỳ × Loại đồ án: ĐACS / ĐACN / KLTN):**
  - Cho phép Giáo vụ chọn Đợt làm đồ án và upload file `.xlsx` hoặc `.csv`.
  - Hệ thống tự động nhận diện và đọc các cột: `MSSV` (7 số), `Họ và tên`, `Lớp` (ví dụ `CTK46PM`, `CTK46MMT`), `Email` (tùy chọn, mặc định tự sinh `<MSSV>@dlu.edu.vn`), `Ghi chú` (tùy chọn: "Đủ tín chỉ", "Học vượt", "Trả nợ K45").
  - **Cơ chế xử lý đồng bộ 2-in-1:**
    + *Nếu sinh viên chưa có tài khoản:* Hệ thống tự động khởi tạo tài khoản User (Role `STUDENT`) kèm `StudentProfile` (phân lớp, ngành, cohort tương ứng).
    + *Nếu sinh viên đã có tài khoản:* Hệ thống tự động liên kết và kích hoạt cờ "Đủ điều kiện làm đồ án" cho sinh viên trong đợt đó (`RoundStudentEligibility`).
- **Bộ lọc & Quản lý danh sách cho Giáo vụ:**
  - Bộ lọc nhanh theo **Lớp** sinh hoạt (`CTK46PM`, `CTK46MMT`, `CTK47...`).
  - Bộ lọc theo **Loại đồ án** (Cơ sở / Chuyên ngành / Tốt nghiệp) hoặc Đợt đăng ký.
  - Tìm kiếm nhanh theo MSSV, Họ tên.
  - Hiển thị trực quan tình trạng: *Đã có đề tài*, *Chưa có đề tài*, *Đang trong nhóm*.
  - Hỗ trợ xuất file Excel (Export) phục vụ đối soát và báo cáo.
- **Thông báo & Trải nghiệm phía Sinh viên:**
  - Tự động phát thông báo in-app (chuông) và gửi email kích hoạt cho sinh viên có tên trong danh sách.
  - **Banner Dashboard sinh viên:**
    + *Sinh viên đủ điều kiện:* Hiển thị banner màu xanh nổi bật chúc mừng, thông báo thời hạn chọn đề tài & nộp đề cương M03 kèm nút tắt điều hướng nhanh.
    + *Sinh viên không đủ điều kiện:* Hiển thị cảnh báo rõ ràng: *"Tài khoản của bạn chưa nằm trong danh sách đủ điều kiện làm đồ án của học kỳ này. Vui lòng liên hệ Giáo vụ Khoa nếu có thắc mắc."* và chặn hoàn toàn thao tác đăng ký đề tài/tạo nhóm.
- **Cấu hình Định mức GV & Giới hạn nhóm:**
  - Cấu hình số lượng SV trên 1 đề tài: **từ 1 đến 3 sinh viên** (theo quy định Khoa CNTT).
  - Cấu hình định mức tải hướng dẫn tối đa của mỗi GV trong một học kỳ (hạn mức quota).
- **Đầu ra:** Danh sách sinh viên chính thức đủ điều kiện theo từng đợt; bộ lọc và công cụ import Excel tối ưu; luồng kiểm soát quyền đăng ký chuẩn xác.

---

### Phân hệ 2: Đề xuất, Xét duyệt & Đăng ký đề tài

#### BR-03: Giảng viên đề xuất đề tài
- **Tác nhân:** GVHD.
- **Mô tả:** GV nhập thông tin đề tài:
  - Tên đề tài (Tiếng Việt & Tiếng Anh).
  - Loại đồ án (ĐACS, ĐACN, KLTN).
  - Chuyên ngành: **Công nghệ phần mềm** hoặc **Mạng máy tính**.
  - Mục tiêu đề tài, Nội dung yêu cầu, Công nghệ/Công cụ dự kiến.
  - Số lượng sinh viên tối đa: từ 1 đến 3 SV.
  - Hỗ trợ kế thừa/sao chép đề tài từ các học kỳ trước và tinh chỉnh nội dung.
- **Đầu ra:** Đề tài ở trạng thái `CHỜ_TỔ_TRƯỞNG_DUYỆT` (PENDING_DEPARTMENT).

#### BR-04: Kiểm tra trùng lặp đề tài tự động (Similarity Check)
- **Tác nhân:** Hệ thống, TTBM, BCN Khoa.
- **Mô tả:** Khi GV hoặc SV tạo đề tài mới, hệ thống tự động đối chiếu độ tương đồng văn bản (Cosine similarity qua TF-IDF hoặc Embeddings) với kho đề tài của Khoa trong **3–5 khóa gần nhất**.
- **Đầu ra:** Cảnh báo tỷ lệ % tương đồng kèm danh sách các đề tài cũ có nguy cơ bị trùng lặp tên/nội dung để TTBM và BCN Khoa cân nhắc khi duyệt.

#### BR-05: Xét duyệt danh sách đề tài cấp Bộ môn & Cấp Khoa
- **Tác nhân:** TTBM, BCN Khoa.
- **Quy trình duyệt 2 cấp chặt chẽ:**
  1. **Bước 1 (Cấp Bộ môn):** TTBM rà soát tính chuyên môn và độ khó của đề tài thuộc chuyên ngành mình phụ trách (CNPM hoặc Mạng máy tính). TTBM có quyền: Chấp thuận, Yêu cầu GV chỉnh sửa, hoặc Từ chối.
  2. **Bước 2 (Cấp Khoa):** BCN Khoa xem xét danh sách đã qua thẩm định của TTBM, phê duyệt danh sách chính thức trước ngày mở cổng cho sinh viên.
- **Đầu ra:** Đề tài chuyển sang trạng thái `ĐÃ_DUYỆT_MỞ_ĐĂNG_KÝ` và công bố cho SV.

#### BR-06: Sinh viên đăng ký đề tài & Lập nhóm (1–3 SV)
- **Tác nhân:** Sinh viên.
- **Mô tả hỗ trợ 2 hình thức:**
  1. *Chọn đề tài có sẵn:* SV1 chọn đề tài từ danh sách đã duyệt; nếu làm nhóm 2–3 người thì gửi lời mời qua mã SV / link mời để các thành viên còn lại đăng nhập xác nhận.
  2. *SV tự đề xuất đề tài:* Nhóm SV soạn thông tin đề tài nguyện vọng và chọn GVHD mong muốn để gửi yêu cầu.
- **Quy tắc cứng (Business Rule):**
  - Mỗi đề tài cho phép từ 1 đến 3 sinh viên.
  - Mỗi sinh viên chỉ được tham gia duy nhất 1 nhóm trong một học kỳ.
- **Đầu ra:** Bản ghi đăng ký ở trạng thái `CHỜ_GVHD_XÁC_NHẬN`.

#### BR-07: Phân công GVHD & Giao đề tài
- **Tác nhân:** GVHD, TTBM, TLGV.
- **Mô tả:**
  - *Với đề tài SV đăng ký / tự đề xuất:* GVHD xem hồ sơ nhóm SV và bấm Chấp nhận hướng dẫn (hoặc từ chối kèm phản hồi).
  - *Với hình thức Khoa/Bộ môn giao đề tài:* Đối với sinh viên chưa chọn được đề tài khi cổng đóng, TTBM và TLGV thực hiện gán đề tài còn trống và phân công GVHD trực tiếp trên hệ thống.
- **Đầu ra:** Danh sách phân công tạm thời (SV – Đề tài – GVHD) chuyển sang giai đoạn lập Đề cương M03.

---

### Phân hệ 3: Lập, Xét duyệt Đề cương (Mẫu M03) & Công bố chính thức

#### BR-08: Lập và nộp Đề cương chi tiết (Mẫu M03)
- **Tác nhân:** Sinh viên (đại diện nhóm).
- **Mô tả quy trình thực tế:**
  1. *Tải biểu mẫu:* Nhóm sinh viên tải file biểu mẫu chuẩn **Đề cương thực hiện đồ án (Mẫu M03)** định dạng `.docx` do Khoa CNTT - DLU ban hành trực tiếp từ hệ thống.
  2. *Soạn thảo & Xin chữ ký sống:* Sinh viên điền thông tin đề tài và 6 mục chuyên môn (Mục tiêu, Phạm vi, Công cụ, Kết quả dự kiến, Kế hoạch tuần, Tài liệu tham khảo). Nhóm in văn bản ra giấy và gặp Giảng viên hướng dẫn (GVHD) để trao đổi chuyên môn, xin chữ ký sống xác nhận trực tiếp của GVHD trên bản in.
  3. *Nộp bản scan lên hệ thống:* Nhóm scan hoặc chụp rõ nét bản đề cương đã có chữ ký GVHD thành file PDF (hoặc DOCX/ảnh scan) và upload nộp lên hệ thống trước hạn chót.
  4. *Tính năng nâng cao (Lộ trình Roadmap - Triển khai sau):* Hệ thống tự động điền trước thông tin đề tài/nhóm vào file Word (Auto-fill Template M03) khi sinh viên bấm tải về.
- **Đầu ra:** Bản ghi Đề cương M03 ở trạng thái `SUBMITTED` (Chờ GVHD duyệt trên hệ thống) kèm file đính kèm.

#### BR-09: GVHD duyệt đề cương và chuyển tiếp lên Giáo vụ / Bộ môn
- **Tác nhân:** GVHD.
- **Mô tả quy trình thực tế:**
  1. GVHD nhận thông báo có bài nộp M03 từ nhóm sinh viên hướng dẫn, vào hệ thống xem trước file scan đề cương và đối chiếu chữ ký xác nhận cùng nội dung.
  2. **Trường hợp chưa đạt:** (Chữ ký mờ, thiếu chữ ký, hoặc nội dung cần chỉnh sửa thêm), GVHD bấm **"Yêu cầu chỉnh sửa / Nộp lại"** kèm nhận xét góp ý cụ thể. Nhóm sinh viên nhận thông báo và upload bản thay thế.
  3. **Trường hợp đạt:** GVHD bấm **"Phê duyệt Đề cương"**. Bản ghi chuyển sang trạng thái `APPROVED_BY_LECTURER` (hoặc `APPROVED`).
  4. *Tính năng nâng cao (Lộ trình Roadmap - Triển khai sau):* Cơ chế Ký số điện tử nội bộ (E-Signature Stamp) kèm mã QR xác thực để đóng dấu mộc điện tử tự động trực tiếp trên web thay cho việc in scan giấy.
- **Đầu ra:** Đề cương ở trạng thái `APPROVED_BY_LECTURER`. Hệ thống tự động tổng hợp về danh sách quản lý của TLGV và TTBM.

#### BR-10: Trình ký & Công bố danh sách chính thức
- **Tác nhân:** TLGV, BCN Khoa, TTBM.
- **Mô tả:**
  - TLGV và TTBM theo dõi danh sách tổng hợp M03: thống kê các nhóm đã được GVHD phê duyệt, cảnh báo các nhóm chưa nộp hoặc chưa hoàn tất thủ tục đề cương.
  - TLGV xuất Tờ trình danh sách đề tài & đề cương chính thức.
  - BCN Khoa ký duyệt Quyết định công bố danh sách chính thức (Đề tài, GVHD, SV thực hiện) toàn Khoa.
  - Hệ thống chuyển trạng thái đề tài sang `IN_PROGRESS`, kích hoạt không gian làm việc theo dõi tiến độ tuần (BR-11) và đợt Báo cáo Tiến độ 1 (BR-12).
- **Đầu ra:** Quyết định giao đề tài chính thức; kích hoạt giai đoạn thực hiện đồ án.

---

### Phân hệ 4: Theo dõi tiến độ thực hiện & Quản lý thay đổi

#### BR-11: Nhật ký hướng dẫn & Theo dõi task theo tuần
- **Tác nhân:** Sinh viên, GVHD.
- **Mô tả:**
  - Dựa trên Kế hoạch thực hiện trong Đề cương M03, hệ thống tạo bảng theo dõi tiến độ hàng tuần.
  - Hàng tuần SV cập nhật: % hoàn thành, link GitHub/GitLab commit, các khó khăn vướng mắc.
  - GVHD vào kiểm tra, phản hồi và ghi nhận xét trực tiếp vào nhật ký.
- **Đầu ra:** Lịch sử làm việc (Activity / Audit Log) minh bạch làm minh chứng cho quá trình làm việc thực chất của SV khi ra Hội đồng.

#### BR-12: Báo cáo tiến độ lần 1 (Đánh giá 20%)
- **Tác nhân:** Sinh viên, GVHD.
- **Mô tả:**
  - Đến mốc Tiến độ 1 (khoảng 4–5 tuần sau khi bắt đầu), SV nộp: Báo cáo phân tích thiết kế, mô hình CSDL, giao diện mẫu (UI prototype) và link source repository.
  - GVHD kiểm tra sản phẩm, ghi nhận xét và **nhập Điểm Tiến độ lần 1 (trọng số 20%)** theo thang điểm 10.
- **Đầu ra:** Cột điểm Tiến độ 1 (20%) được ghi nhận vào bảng điểm tổng kết.

#### BR-13: Phân công Giảng viên phản biện (GVPB)
- **Tác nhân:** TTBM, BCN Khoa, TLGV.
- **Thời điểm:** Thực hiện trước đợt Báo cáo tiến độ lần 2 khoảng 1 tuần.
- **Quy tắc phân công của hệ thống:**
  - GVPB phải **khác** GVHD của đề tài đó.
  - GVPB phải **cùng Chuyên ngành** với đề tài (đề tài CNPM phân cho GV chuyên môn Phần mềm; đề tài Mạng phân cho GV chuyên môn Mạng máy tính).
  - Cân bằng số lượng đề tài phản biện giữa các GV trong bộ môn (tránh lệch tải).
- **Đầu ra:** Danh sách phân công GVPB được phê duyệt; GVPB được cấp quyền truy cập vào hồ sơ đề tài.

#### BR-14: Báo cáo tiến độ lần 2 (Đánh giá 30% bởi GVHD + GVPB)
- **Tác nhân:** Sinh viên, GVHD, GVPB.
- **Mô tả:**
  - SV nộp sản phẩm tiến độ lần 2: source code chạy được các chức năng chính, CSDL hoàn chỉnh, dự thảo quyển báo cáo.
  - GVHD và GVPB cùng vào đánh giá sản phẩm:
    + Cả hai giảng viên độc lập nhập nhận xét góp ý.
    + Nhập điểm Tiến độ 2 (thang 10).
    + Điểm Tiến độ 2 = Trung bình cộng giữa điểm GVHD và GVPB (hoặc theo cấu hình riêng của kỳ).
- **Đầu ra:** Cột điểm Tiến độ 2 (**trọng số 30%**) và Biên bản góp ý chỉnh sửa cho đợt cuối kỳ.

#### BR-15: Quản lý thay đổi trong quá trình thực hiện đề tài
- **Tác nhân:** Sinh viên, GVHD, BCN Khoa, TLGV.
- **Mô tả:** Xử lý 3 loại yêu cầu phát sinh:
  1. *Đổi tên đề tài:* Do quá trình thực hiện thu hẹp hoặc mở rộng phạm vi theo góp ý ở TĐ1/TĐ2.
  2. *Thay đổi thành viên nhóm:* Rút thành viên, tách nhóm do không phối hợp được.
  3. *Xin gia hạn thời gian hoặc Xin hủy đề tài.*
- **Quy trình:** Nhóm SV làm đơn trực tuyến ➔ GVHD xác nhận ➔ BCN Khoa/TLGV phê duyệt.
- **Đầu ra:** Lưu vết thay đổi (`topic_change_requests` & `audit_logs`) và tự động cập nhật tên mới vào biên bản bảo vệ.

---

### Phân hệ 5: Nộp báo cáo cuối kỳ & Đánh giá kết quả (Bảo vệ)

#### BR-16: Nộp kết quả đồ án cuối kỳ trước bảo vệ
- **Tác nhân:** Sinh viên.
- **Mô tả:** Trước tuần bảo vệ theo lịch của Khoa, nhóm SV upload:
  - Bản quyển báo cáo hoàn chỉnh (`.pdf`, `.docx`).
  - Slide thuyết trình (`.pptx`, `.pdf`).
  - Link kho lưu trữ mã nguồn (GitHub/GitLab) và link file sao lưu cơ sở dữ liệu.
- **Đầu ra:** Hồ sơ bảo vệ hoàn tất; thông báo tự động gửi đến GVHD và GVPB để đọc duyệt.

#### BR-17: Nhập nhận xét GVHD (Mẫu M02/M04) & Nhận xét GVPB (Mẫu M05)
- **Tác nhân:** GVHD, GVPB.
- **Mô tả:** Hai giảng viên đọc quyển, kiểm tra code và điền form nhận xét trực tuyến theo đúng biểu mẫu hành chính của Khoa CNTT - DLU:
  - **Mẫu M02:** Trang nhận xét của GVHD dành cho Đồ án cơ sở & Đồ án chuyên ngành.
  - **Mẫu M04:** Trang nhận xét của GVHD dành cho Khóa luận tốt nghiệp (KLTN).
  - **Mẫu M05:** Trang nhận xét của Giảng viên phản biện (GVPB).
  - Cả GVHD và GVPB đều phải đưa ra kết luận: **"Đề tài đạt yêu cầu và ĐƯỢC PHÉP BẢO VỆ"** hoặc **"KHÔNG ĐƯỢC PHÉP BẢO VỆ"**.
- **Đầu ra:** Tự động xuất file PDF trang nhận xét M02/M04 và M05 chuẩn format DLU; tự động chốt danh sách SV đủ điều kiện ra Hội đồng.

#### BR-18: Lập Hội đồng, Xếp lịch bảo vệ & Chấm điểm cuối kỳ (50%)
- **Tác nhân:** TLGV, BCN Khoa, GVHD, GVPB, Thành viên Hội đồng.
- **Mô tả:**
  - *Với ĐACS / ĐACN:* Bảo vệ theo tiểu ban gồm GVHD và GVPB.
  - *Với KLTN:* Thành lập Hội đồng bảo vệ gồm 3–5 thành viên (Chủ tịch, Thư ký, GVPB, Ủy viên); xếp phòng thi, ngày giờ và thứ tự bảo vệ.
  - Giảng viên nhập điểm bảo vệ (thang 10, **trọng số 50%**). Hỗ trợ chấm điểm riêng cho từng sinh viên trong nhóm dựa trên mức độ đóng góp.
  - **Công thức tính điểm tổng kết chính thức của DLU:**
    $$\text{Điểm TK} = (20\% \times \text{Điểm TĐ1}) + (30\% \times \text{Điểm TĐ2}) + (50\% \times \text{Điểm BV})$$
- **Đầu ra:** Bảng điểm tổng hợp chi tiết của từng sinh viên; Biên bản bảo vệ đồ án tự động sinh.

---

### Phân hệ 6: Lưu trữ, Tra cứu & Thống kê báo cáo

#### BR-19: Nộp gói lưu trữ số hóa sau bảo vệ (SOURCE, DATABASE, THESIS)
- **Tác nhân:** Sinh viên, GVHD, TLGV.
- **Mô tả:** Sau khi bảo vệ và chỉnh sửa báo cáo theo góp ý của Hội đồng, nhóm SV phải nộp gói lưu trữ số hóa đúng **3 thành phần chuẩn của Khoa CNTT - DLU**:
  1. **Thư mục SOURCE:** Toàn bộ mã nguồn hoàn chỉnh, cấu hình và dữ liệu kiểm thử.
  2. **Thư mục DATABASE:** File script tạo bảng (`.sql`) hoặc file sao lưu CSDL backup (`.bak`, `.dump`).
  3. **Thư mục THESIS:** File báo cáo toàn văn định dạng PDF (đã lồng trang Đề cương M03 và các trang nhận xét M02/M04, M05 đã ký) + File Hướng dẫn cài đặt/sử dụng + Thông tin liên hệ nhóm tác giả.
- **Quy tắc:** Hệ thống tự động kiểm tra đủ 3 thành phần; GVHD và TLGV bấm xác nhận thì sinh viên mới được hoàn tất thủ tục kết thúc học phần.
- **Đầu ra:** Hồ sơ đề tài được đóng băng (`ARCHIVED`) và đưa vào Kho lưu trữ số.

#### BR-20: Tra cứu kho đồ án & Tài liệu tham khảo
- **Tác nhân:** Sinh viên, Giảng viên, TLGV.
- **Mô tả:** Cung cấp bộ lọc tra cứu đồ án các khóa trước phục vụ học tập và nghiên cứu:
  - Lọc theo: Khóa học (`CTK44`, `CTK45`, `CTK46`...), Loại đồ án (`ĐACS`, `ĐACN`, `KLTN`), Chuyên ngành (`CNPM`, `Mạng máy tính`), Giảng viên hướng dẫn, Năm thực hiện, Từ khóa công nghệ.
  - **Phân quyền truy cập tài liệu:**
    + Sinh viên các khóa sau: Được đọc phần Tóm tắt (Abstract), Mục tiêu và Chương mở đầu.
    + Giảng viên và Giáo vụ: Được phép tải toàn bộ quyển báo cáo, mã nguồn và CSDL phục vụ đối chiếu và kiểm tra.
- **Đầu ra:** Giao diện Thư viện số đồ án Khoa CNTT - DLU.

#### BR-21: Thống kê & Xuất báo cáo giáo vụ
- **Tác nhân:** TLGV, TTBM, BCN Khoa.
- **Mô tả:** Cung cấp dashboard trực quan và xuất file Excel/PDF các báo cáo theo chuẩn giáo vụ:
  - Báo cáo định mức giờ hướng dẫn & phản biện của từng giảng viên trong kỳ.
  - Thống kê tình hình nộp Đề cương M03, Tiến độ 1, Tiến độ 2 (danh sách SV nộp trễ, SV bị dừng đề tài).
  - Phổ điểm tổng kết (tỷ lệ điểm A, B, C, D, F) và tỷ lệ bảo vệ thành công.
  - Thống kê xu hướng công nghệ (AI, Web, Mobile, IoT, Cloud...) qua từng năm.
- **Đầu ra:** Biểu đồ Dashboard và các file Excel xuất mẫu giáo vụ Khoa CNTT - DLU.

---

### Phân hệ 7: Xác thực & Tiện ích hệ thống

#### BR-22: Xác thực đăng nhập một chạm (Google Workspace DLU SSO)
- **Tác nhân:** Toàn bộ Actor.
- **Mô tả luồng xử lý:**
  1. Sinh viên / Giảng viên bấm nút **"Đăng nhập bằng tài khoản Google DLU"**.
  2. Hệ thống nhận thông tin người dùng từ Google OAuth2 (Email, Họ tên, Avatar).
  3. **Kiểm tra và phân quyền tự động (Tách Role theo đuôi Domain):**
     - Email sinh viên có 7 số MSSV dạng 2212345@dlu.edu.vn ➔ Định tuyến vào bảng **Sinh viên** (student_profiles).
     - Đuôi email `@dlu.edu.vn` (VD: `linhttp@dlu.edu.vn`) ➔ Định tuyến vào bảng **Giảng viên** (`lecturer_profiles`) và nạp các quyền chức vụ kiêm nhiệm (TTBM, BCN Khoa, TLGV).
     - Các domain email khác (Gmail thường `@gmail.com`, v.v.) bị từ chối truy cập ngay lập tức.
  4. **Kiểm tra hợp lệ & Cấp Token:**
     - Nếu email đã tồn tại trong hệ thống (do Giáo vụ Khoa đã import trước bằng file Excel hoặc danh sách cán bộ giảng viên đã khai báo) ➔ Hệ thống tạo cặp mã JWT (Access Token & Refresh Token) và hoàn tất đăng nhập.
     - Nếu email chưa có trong danh sách đủ điều kiện ➔ Cảnh báo: *"Tài khoản chưa nằm trong danh sách được phép làm đồ án của học kỳ này"*.
  - **Hỗ trợ Chế độ Demo / Kiểm thử (Dev Mode Role Switcher):** Cung cấp thanh chuyển đổi nhanh vai trò 1-click cho 6 Actor ở môi trường kiểm thử để Hội đồng thuận tiện đánh giá quy trình.
- **Đầu ra:** Phiên đăng nhập an toàn, loại bỏ hoàn toàn việc tạo tài khoản và quên mật khẩu thủ công.

#### BR-23: Thông báo & Nhắc hạn tự động (Notification & Email)
- **Tác nhân:** Hệ thống, Toàn bộ Actor.
- **Mô tả:**
  - Thông báo in-app (chuông thông báo) theo thời gian thực (Socket.io).
  - Gửi email nhắc nhở tự động theo Timeline:
    + Nhắc SV trước 3 ngày khi sắp đến hạn nộp Đề cương M03, Tiến độ 1, Tiến độ 2, Báo cáo cuối kỳ.
    + Thông báo cho GV khi nhóm SV nộp bài cần chấm điểm.
    + Cảnh báo danh sách đề tài trễ hạn cho TLGV và TTBM.
- **Đầu ra:** Luồng thông báo tức thời, giảm thiểu tối đa tình trạng trễ hạn.

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

### 4.1. Hiệu năng (Performance)
- Thời gian tải trang thông thường dưới 1.5 giây.
- Thời gian trích xuất file PDF (Mẫu M03, M02, M05) dưới 3 giây.
- Hệ thống chịu tải đồng thời từ 500 – 1000 người dùng trong giờ cao điểm mở cổng đăng ký đề tài.

### 4.2. Bảo mật & Toàn vẹn dữ liệu (Security & Integrity)
- Xác thực 2 lớp qua Google OAuth 2.0 `@dlu.edu.vn` + JWT Access/Refresh tokens.
- Phân quyền theo vai trò (Role-Based Access Control - RBAC) nghiêm ngặt ở cả Frontend và Backend API.
- Toàn bộ hành vi nhạy cảm (Sửa điểm, Phê duyệt đề tài, Thay đổi thành viên) đều được ghi vết tự động vào bảng `audit_logs`.
- Điểm số sau mốc chốt điểm (`grade_submission_deadline`) được đóng băng vĩnh viễn, chỉ BCN Khoa mới có quyền mở khóa có ghi log.

### 4.3. Giao diện & Bản sắc DLU (Usability & Branding)
- Giao diện mang đậm màu sắc nhận diện của **Đại học Đà Lạt**: Tone màu xanh thông (Pine Green / Emerald) kết hợp Slate và Amber.
- Tiêu đề học thuật trang trọng: **TRƯỜNG ĐẠI HỌC ĐÀ LẠT - KHOA CÔNG NGHỆ THÔNG TIN**.
- Quy trình hiển thị dưới dạng **Stepper trực quan 7 giai đoạn** trên màn hình Sinh viên, xóa bỏ hoàn toàn cảm giác "form CRUD AI nhạt nhẽo".
- Đáp ứng hiển thị hoàn hảo trên cả máy tính để bàn, máy tính bảng và điện thoại di động.
