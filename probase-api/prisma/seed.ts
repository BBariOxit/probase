import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { cohortFromStudentCode } from '../src/modules/users/student-code.util';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

// Driver adapter Prisma Client
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Mật khẩu chung cực kỳ đơn giản để dễ nhớ và demo
const DEFAULT_PASSWORD = '123456';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);

// ─────────────────────────────────────────────────────────
// 1. DANH MỤC CHUYÊN NGÀNH CHUẨN KHOA CNTT - DLU
// ─────────────────────────────────────────────────────────
const MAJORS = [
  { code: 'CNPM', name: 'Kỹ thuật phần mềm' },
  { code: 'MMT', name: 'Mạng máy tính' },
];

const PROJECT_TYPES = [
  { code: 'DACS', name: 'Đồ án cơ sở' },
  { code: 'DACN', name: 'Đồ án chuyên ngành' },
  { code: 'DATN', name: 'Khóa luận tốt nghiệp' },
];

// ─────────────────────────────────────────────────────────
// 2. DANH SÁCH GIẢNG VIÊN & CÁN BỘ KHOA CNTT - DLU
// ─────────────────────────────────────────────────────────
const DEMO_STAFF = [
  {
    email: 'gvgvk@dlu.edu.vn',
    role: 'ADMIN' as const,
    lecturerCode: 'GVGVK',
    fullName: 'Nguyễn Thị GVK',
    academicTitle: 'ThS.',
    majorCode: 'CNPM',
    researchInterests: 'Quản lý đào tạo, Cơ sở dữ liệu và Hệ thống thông tin',
    isAcademicAssistant: true, // Trợ lý Giáo vụ Khoa (TLGV)
    isFacultyBoard: false,
    isHeadOfDepartment: false,
  },
  {
    email: 'gvcnk@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVCNK',
    fullName: 'Trần Văn CNK',
    academicTitle: 'TS.',
    majorCode: 'CNPM',
    researchInterests: 'Trí tuệ nhân tạo, Khai phá dữ liệu, Xử lý ngôn ngữ tự nhiên',
    isAcademicAssistant: false,
    isFacultyBoard: true, // Ban Chủ nhiệm Khoa (Trưởng/Phó khoa)
    isHeadOfDepartment: false,
  },
  {
    email: 'gvab@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVAB',
    fullName: 'An Bình',
    academicTitle: 'TS.',
    majorCode: 'CNPM',
    researchInterests: 'Kỹ thuật phần mềm, Kiến trúc hệ thống phân tán, Microservices',
    isAcademicAssistant: false,
    isFacultyBoard: false,
    isHeadOfDepartment: true, // Tổ trưởng Bộ môn Kỹ thuật phần mềm (TTBM)
  },
  {
    email: 'gvcd@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVCD',
    fullName: 'Chu Đình',
    academicTitle: 'ThS.',
    majorCode: 'MMT',
    researchInterests: 'Mạng máy tính, An toàn và Bảo mật thông tin, Mạng cảm biến IoT',
    isAcademicAssistant: false,
    isFacultyBoard: false,
    isHeadOfDepartment: true, // Tổ trưởng Bộ môn Mạng máy tính (TTBM)
  },
  {
    email: 'gvpb@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVPB',
    fullName: 'Phan Bửu',
    academicTitle: 'ThS.',
    majorCode: 'CNPM',
    researchInterests: 'Kỹ thuật phần mềm, Phát triển ứng dụng Web & Mobile hiện đại',
    isAcademicAssistant: false,
    isFacultyBoard: false,
    isHeadOfDepartment: false,
  },
  {
    email: 'gvln@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVLN',
    fullName: 'Lê Ngân',
    academicTitle: 'TS.',
    majorCode: 'CNPM',
    researchInterests: 'Thị giác máy tính, Học sâu, Trí tuệ nhân tạo biên (Edge AI)',
    isAcademicAssistant: false,
    isFacultyBoard: false,
    isHeadOfDepartment: false,
  },
];

// ─────────────────────────────────────────────────────────
// 3. DANH SÁCH SINH VIÊN (CTK46, CTK47, CTK48)
// ─────────────────────────────────────────────────────────
const DEMO_STUDENTS = [
  // Khóa 2022 (CTK46 - Năm 4 làm KLTN)
  {
    code: '2266666',
    email: '2266666@dlu.edu.vn',
    name: 'Nguyễn Văn A',
    class: 'CTK46PM',
    majorCode: 'CNPM',
  },
  {
    code: '2277777',
    email: '2277777@dlu.edu.vn',
    name: 'Phạm Thị B',
    class: 'CTK46PM',
    majorCode: 'CNPM',
  },
  {
    code: '2288888',
    email: '2288888@dlu.edu.vn',
    name: 'Lê Văn C',
    class: 'CTK46MMT',
    majorCode: 'MMT',
  },
  {
    code: '2299999',
    email: '2299999@dlu.edu.vn',
    name: 'Đỗ Minh D',
    class: 'CTK46MMT',
    majorCode: 'MMT',
  },
  // Khóa 2023 (CTK47 - Năm 3 làm ĐACN)
  {
    code: '2311111',
    email: '2311111@dlu.edu.vn',
    name: 'Trần Thị Mai',
    class: 'CTK47PM',
    majorCode: 'CNPM',
  },
  {
    code: '2322222',
    email: '2322222@dlu.edu.vn',
    name: 'Hoàng Gia Bảo',
    class: 'CTK47MMT',
    majorCode: 'MMT',
  },
  // Khóa 2024 (CTK48 - Năm 2 làm ĐACS)
  {
    code: '2411111',
    email: '2411111@dlu.edu.vn',
    name: 'Võ Quốc Huy',
    class: 'CTK48PM',
    majorCode: 'CNPM',
  },
];

async function main() {
  console.log('============================================================');
  console.log('🌱 KHỞI TẠO DỮ LIỆU ĐẦY ĐỦ CHO HỆ THỐNG PROBASE - DLU TECH');
  console.log('============================================================\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Seed Chuyên ngành (Majors)
  const majorIdByCode = new Map<string, number>();
  for (const major of MAJORS) {
    const saved = await prisma.major.upsert({
      where: { code: major.code },
      create: major,
      update: { name: major.name },
    });
    majorIdByCode.set(saved.code, saved.id);
  }
  console.log(`[✓] 1. Chuyên ngành: ${MAJORS.length} ngành (CNPM, MMT)`);

  // 2. Seed Loại đồ án (Project Types)
  const projectTypeIdByCode = new Map<string, number>();
  for (const type of PROJECT_TYPES) {
    const saved = await prisma.projectType.upsert({
      where: { code: type.code },
      create: type,
      update: { name: type.name },
    });
    projectTypeIdByCode.set(saved.code, saved.id);
  }
  console.log(`[✓] 2. Loại đồ án: ${PROJECT_TYPES.length} loại (DACS, DACN, DATN)`);

  // 3. Seed Học kỳ hiện tại
  const now = new Date();
  const currentYear = now.getFullYear();
  const semesterCode = `HK1-${currentYear}-${currentYear + 1}`;

  const semester = await prisma.semester.upsert({
    where: { code: semesterCode },
    create: {
      code: semesterCode,
      name: `Học kỳ 1 năm học ${currentYear}–${currentYear + 1}`,
      startDate: daysFromNow(-30),
      endDate: daysFromNow(120),
      gradeSubmissionDeadline: daysFromNow(110),
      isActive: true,
      mentorWeight: 0.2,   // Tiến độ 1: 20%
      reviewerWeight: 0.3, // Tiến độ 2: 30%
      councilWeight: 0.5,  // Bảo vệ hội đồng: 50%
      progress1Weight: 0.2,
      progress2Weight: 0.3,
      defenseWeight: 0.5,
    },
    update: {
      name: `Học kỳ 1 năm học ${currentYear}–${currentYear + 1}`,
      isActive: true,
      mentorWeight: 0.2,
      reviewerWeight: 0.3,
      councilWeight: 0.5,
      progress1Weight: 0.2,
      progress2Weight: 0.3,
      defenseWeight: 0.5,
    },
  });
  console.log(`[✓] 3. Học kỳ chuẩn DLU: ${semesterCode} (Trọng số 20% - 30% - 50%)`);

  // 4. Seed các Đợt đồ án (Registration Rounds) với 7 mốc thời gian chuẩn Khoa CNTT - DLU
  const ROUNDS = [
    {
      code: 'DATN',
      cohort: '2022',
      targetCohort: 'CTK46',
      name: 'Khóa luận tốt nghiệp',
      regClosesIn: 25,
    },
    {
      code: 'DACN',
      cohort: '2023',
      targetCohort: 'CTK47',
      name: 'Đồ án chuyên ngành',
      regClosesIn: 21,
    },
    {
      code: 'DACS',
      cohort: '2024',
      targetCohort: 'CTK48',
      name: 'Đồ án cơ sở',
      regClosesIn: 21,
    },
  ];

  const roundByCode = new Map<string, any>();

  for (const r of ROUNDS) {
    const projectTypeId = projectTypeIdByCode.get(r.code)!;

    const round = await prisma.registrationRound.upsert({
      where: {
        semesterId_projectTypeId: {
          semesterId: semester.id,
          projectTypeId,
        },
      },
      create: {
        semesterId: semester.id,
        projectTypeId,
        targetCohort: r.targetCohort,
        phase: 'OPEN',
        allocationMode: 'FIRST_COME',
        registrationStart: daysFromNow(-10),
        registrationEnd: daysFromNow(r.regClosesIn),
        officialStartDate: daysFromNow(7),
        officialEndDate: daysFromNow(97),
        topicSubmissionStart: daysFromNow(-20),
        topicSubmissionEnd: daysFromNow(5),
        outlineDeadline: daysFromNow(21),
        progress1Deadline: daysFromNow(45),
        reviewerAssignmentDeadline: daysFromNow(60),
        progress2Deadline: daysFromNow(75),
        finalSubmissionDeadline: daysFromNow(90),
        defenseStartDate: daysFromNow(95),
        defenseEndDate: daysFromNow(97),
        archiveDeadline: daysFromNow(105),
      },
      update: {
        targetCohort: r.targetCohort,
        phase: 'OPEN',
        registrationStart: daysFromNow(-10),
        registrationEnd: daysFromNow(r.regClosesIn),
        officialStartDate: daysFromNow(7),
        officialEndDate: daysFromNow(97),
        outlineDeadline: daysFromNow(21),
        progress1Deadline: daysFromNow(45),
        reviewerAssignmentDeadline: daysFromNow(60),
        progress2Deadline: daysFromNow(75),
        finalSubmissionDeadline: daysFromNow(90),
        defenseStartDate: daysFromNow(95),
        defenseEndDate: daysFromNow(97),
        archiveDeadline: daysFromNow(105),
      },
    });

    roundByCode.set(r.code, round);

    // Cập nhật điều kiện khóa (RoundEligibility)
    await prisma.roundEligibility.deleteMany({ where: { roundId: round.id } });
    await prisma.roundEligibility.create({
      data: { roundId: round.id, cohort: r.cohort },
    });
  }
  console.log(`[✓] 4. Đợt đăng ký: ${ROUNDS.length} đợt (DATN - CTK46, DACN - CTK47, DACS - CTK48) với 7 mốc thời gian`);

  // 5. Seed Yêu cầu nộp bài (Submission Requirements)
  const datnRound = roundByCode.get('DATN');
  if (datnRound) {
    await prisma.submissionRequirement.deleteMany({ where: { roundId: datnRound.id } });
    const requirements = [
      {
        name: 'Đề cương chi tiết (Mẫu M03)',
        dueAt: daysFromNow(21),
        sortOrder: 1,
        isRequired: true,
      },
      {
        name: 'Báo cáo Tiến độ 1 (20% - GVHD)',
        dueAt: daysFromNow(45),
        sortOrder: 2,
        isRequired: true,
      },
      {
        name: 'Báo cáo Tiến độ 2 (30% - GVHD & GVPB)',
        dueAt: daysFromNow(75),
        sortOrder: 3,
        isRequired: true,
      },
      {
        name: 'Quyển Báo cáo Toàn văn & Slide bảo vệ (50%)',
        dueAt: daysFromNow(90),
        sortOrder: 4,
        isRequired: true,
      },
      {
        name: 'Gói Lưu trữ Số hóa 3 Thư mục (Source, DB, Thesis)',
        dueAt: daysFromNow(105),
        sortOrder: 5,
        isRequired: true,
      },
    ];

    for (const req of requirements) {
      await prisma.submissionRequirement.create({
        data: {
          roundId: datnRound.id,
          name: req.name,
          dueAt: req.dueAt,
          sortOrder: req.sortOrder,
          isRequired: req.isRequired,
        },
      });
    }
    console.log(`[✓] 5. Yêu cầu nộp bài: Đã tạo ${requirements.length} mốc nộp bài cho Đợt Khóa luận tốt nghiệp`);
  }

  // 6. Seed Giảng viên & Cán bộ Khoa CNTT - DLU
  const staffProfileByEmail = new Map<string, any>();
  for (const staff of DEMO_STAFF) {
    const { email, role, lecturerCode, fullName, academicTitle, majorCode, researchInterests, isAcademicAssistant, isFacultyBoard, isHeadOfDepartment } = staff;
    const majorId = majorCode ? majorIdByCode.get(majorCode) : null;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: hashedPassword,
        role,
        mustChangePassword: false,
      },
      update: {
        password: hashedPassword,
        role,
        mustChangePassword: false,
      },
    });

    const profile = await prisma.lecturerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        lecturerCode,
        fullName,
        academicTitle,
        majorId,
        researchInterests,
        isAcademicAssistant,
        isFacultyBoard,
        isHeadOfDepartment,
        maxMentoringQuota: 5,
      },
      update: {
        lecturerCode,
        fullName,
        academicTitle,
        majorId,
        researchInterests,
        isAcademicAssistant,
        isFacultyBoard,
        isHeadOfDepartment,
      },
    });

    staffProfileByEmail.set(email, { user, profile });
  }
  console.log(`[✓] 6. Cán bộ & Giảng viên: ${DEMO_STAFF.length} tài khoản`);

  // 7. Seed Sinh viên Demo
  const studentProfileByEmail = new Map<string, any>();
  for (const student of DEMO_STUDENTS) {
    const user = await prisma.user.upsert({
      where: { email: student.email },
      create: {
        email: student.email,
        password: hashedPassword,
        role: 'STUDENT',
        mustChangePassword: false,
      },
      update: {
        password: hashedPassword,
        role: 'STUDENT',
        mustChangePassword: false,
      },
    });

    const majorId = majorIdByCode.get(student.majorCode);
    const cohort = cohortFromStudentCode(student.code) ?? '2022';

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        studentCode: student.code,
        fullName: student.name,
        class: student.class,
        cohort,
        majorId,
      },
      update: {
        studentCode: student.code,
        fullName: student.name,
        class: student.class,
        cohort,
        majorId,
      },
    });

    studentProfileByEmail.set(student.email, { user, profile });

    // Đánh dấu đủ điều kiện cho sinh viên CTK46 tham gia DATN
    if (student.class.includes('CTK46') && datnRound) {
      await prisma.roundStudentEligibility.upsert({
        where: {
          roundId_studentId: {
            roundId: datnRound.id,
            studentId: profile.id,
          },
        },
        create: {
          roundId: datnRound.id,
          studentId: profile.id,
          note: 'Đủ điều kiện làm Khóa luận tốt nghiệp (Tích lũy >= 120 tín chỉ, CPA >= 2.8)',
        },
        update: {},
      });
    }
  }
  console.log(`[✓] 7. Sinh viên: ${DEMO_STUDENTS.length} tài khoản các khóa CTK46, CTK47, CTK48`);

  // 8. Seed Danh sách Đề tài mẫu cho Khoa CNTT - DLU
  const pbProfile = staffProfileByEmail.get('gvpb@dlu.edu.vn')?.profile;
  const abProfile = staffProfileByEmail.get('gvab@dlu.edu.vn')?.profile;
  const cdProfile = staffProfileByEmail.get('gvcd@dlu.edu.vn')?.profile;
  const cnkProfile = staffProfileByEmail.get('gvcnk@dlu.edu.vn')?.profile;

  const dacnRound = roundByCode.get('DACN');
  const dacsRound = roundByCode.get('DACS');

  // Dọn dẹp dữ liệu phụ thuộc của học kỳ hiện tại trước khi tạo mới
  await prisma.councilTopicGrade.deleteMany({ where: { councilTopic: { council: { semesterId: semester.id } } } });
  await prisma.councilTopic.deleteMany({ where: { council: { semesterId: semester.id } } });
  await prisma.councilMember.deleteMany({ where: { council: { semesterId: semester.id } } });
  await prisma.council.deleteMany({ where: { semesterId: semester.id } });
  await prisma.topicReview.deleteMany({ where: { group: { semesterId: semester.id } } });
  await prisma.topicAssignment.deleteMany({ where: { group: { semesterId: semester.id } } });
  await prisma.topicOutline.deleteMany({ where: { group: { semesterId: semester.id } } });
  await prisma.submission.deleteMany({ where: { group: { semesterId: semester.id } } });
  await prisma.progressReport.deleteMany({ where: { group: { semesterId: semester.id } } });
  await prisma.registrationGroupMember.deleteMany({ where: { semesterId: semester.id } });
  await prisma.registrationGroup.deleteMany({ where: { semesterId: semester.id } });
  await prisma.topicProposal.deleteMany({ where: { semesterId: semester.id } });
  await prisma.topic.deleteMany({ where: { semesterId: semester.id } });

  const topicsData = [
    {
      title: 'Hệ thống Quản lý Đồ án và Khóa luận Tốt nghiệp ProBase cho Khoa CNTT',
      titleEn: 'ProBase - Capstone Project and Thesis Management System for Faculty of Information Technology',
      description: 'Khoa Công nghệ Thông tin - Trường Đại học Đà Lạt hàng năm quản lý hàng trăm sinh viên thuộc các hệ đào tạo tham gia làm Đồ án cơ sở (DACS), Đồ án chuyên ngành (DACN) và Khóa luận tốt nghiệp (DATN). Hiện tại, quy trình từ khâu công bố đề tài, ghép nhóm sinh viên, duyệt đề cương mẫu M03, theo dõi tiến độ hai giai đoạn (20% - 30%) đến phân công phản biện, tổ chức hội đồng chấm bảo vệ (50%) và lưu trữ số hóa 3 thư mục hồ sơ còn phân tán và tốn nhiều công sức tổng hợp báo cáo thủ công.\n\nĐề tài tập trung xây dựng nền tảng web ProBase toàn diện, chuẩn hóa toàn bộ vòng đời đồ án theo quy chế đào tạo tín chỉ của Trường Đại học Đà Lạt. Hệ thống hỗ trợ đa tác tử, phân quyền chặt chẽ giữa Trưởng khoa, Trợ lý giáo vụ, Trưởng bộ môn, Giảng viên hướng dẫn, Giảng viên phản biện, Thành viên hội đồng và Sinh viên.',
      objectives: '- Khảo sát, phân tích nghiệp vụ và chuẩn hóa quy trình quản lý đồ án tốt nghiệp tại Khoa CNTT - Đại học Đà Lạt theo đúng các biểu mẫu chuẩn (M01 đến M10).\n- Thiết kế kiến trúc phần mềm hướng module với độ bảo mật cao, kiểm soát truy cập dựa trên vai trò (RBAC) và vòng đời trạng thái đồ án nghiêm ngặt (State Machine).\n- Xây dựng các phân hệ cốt lõi: Quản lý đợt & hạn nộp, Đăng ký & ghép nhóm theo mã bảo mật (Join Code), Duyệt đề cương trực tuyến, Giám sát tiến độ & chấm điểm theo trọng số (20% - 30% - 50%), Phân công hội đồng bảo vệ và Lưu trữ số hóa hồ sơ tốt nghiệp.',
      expectedOutcomes: '- Mã nguồn hoàn chỉnh gồm Web Frontend (Next.js 14 App Router, TypeScript, TailwindCSS, Shadcn UI) và Backend API (NestJS, Prisma ORM, PostgreSQL).\n- Hệ thống cơ sở dữ liệu quan hệ được thiết kế chuẩn hóa 3NF với hơn 20 bảng thực thể, xử lý ràng buộc toàn vẹn và giao dịch an toàn (ACID Transactions).\n- Bộ tài liệu đặc tả kiến trúc hệ thống, API Documentation chuẩn OpenAPI/Swagger và tài liệu hướng dẫn triển khai bằng Docker Compose.\n- Quyển báo cáo toàn văn Khóa luận tốt nghiệp định dạng PDF đạt chuẩn quy cách trình bày của Trường Đại học Đà Lạt.',
      techStack: 'Next.js 14, TypeScript, NestJS, Prisma ORM, PostgreSQL, TailwindCSS, Shadcn UI, Docker, Redis',
      lecturerId: pbProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Ứng dụng Di động Hỗ trợ Học tập Cá nhân hóa Tích hợp Trí tuệ Nhân tạo (SmartStudy AI)',
      titleEn: 'SmartStudy AI - Personalized Mobile Learning Assistant Integrated with Artificial Intelligence',
      description: 'Trong kỷ nguyên giáo dục số hóa, sinh viên thường gặp khó khăn trong việc tổ chức lộ trình tự học, cân đối thời gian biểu và tìm kiếm nguồn tài liệu ôn tập phù hợp với năng lực cá nhân. Đề tài tập trung nghiên cứu và phát triển giải pháp di động thông minh tích hợp mô hình ngôn ngữ lớn (LLM) và thuật toán gợi ý học tập thích ứng (Adaptive Learning).\n\nỨng dụng cho phép sinh viên số hóa tài liệu học tập, tự động trích xuất kiến thức cốt lõi, tạo câu hỏi trắc nghiệm ôn tập (Flashcard & Quiz) theo phương pháp lặp lại ngắt quãng (Spaced Repetition), đồng thời đóng vai trò trợ lý học tập ảo giải đáp thắc mắc chuyên sâu 24/7.',
      objectives: '- Nghiên cứu cơ chế gợi ý thích ứng (Adaptive Recommendation Engine) dựa trên lịch sử làm bài và mức độ tiếp thu của từng sinh viên.\n- Ứng dụng mô hình ngôn ngữ lớn (Gemini / OpenAI API) kết hợp kỹ thuật RAG (Retrieval-Augmented Generation) để trả lời câu hỏi dựa trên giáo trình bài giảng.\n- Xây dựng ứng dụng di động đa nền tảng tối ưu trải nghiệm người dùng, hỗ trợ đồng bộ dữ liệu thời gian thực và chế độ học ngoại tuyến (Offline mode).',
      expectedOutcomes: '- Ứng dụng di động hoàn chỉnh đa nền tảng (Flutter / React Native) chạy mượt mà trên cả iOS và Android.\n- Hệ thống máy chủ Backend RESTful API & WebSocket hỗ trợ xác thực OAuth2, đồng bộ tiến độ học và tích hợp RAG pipeline.\n- Báo cáo kết quả thử nghiệm thực tế trên nhóm 50 sinh viên Khoa CNTT với các chỉ số đánh giá độ chính xác của câu trả lời AI và mức độ gắn kết học tập.',
      techStack: 'Flutter, Dart, Python, FastAPI, PostgreSQL, LangChain, Gemini API, Qdrant Vector DB, Docker',
      lecturerId: abProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'OPEN' as const,
    },
    {
      title: 'Thiết kế và Triển khai Hệ thống Giám sát & Phát hiện Xâm nhập Mạng (NIDS) Ứng dụng Học máy',
      titleEn: 'Design and Deployment of Network Intrusion Detection System (NIDS) Powered by Machine Learning',
      description: 'Các cuộc tấn công mạng ngày càng trở nên tinh vi với các kỹ thuật né tránh phát hiện dựa trên chữ ký truyền thống. Đề tài hướng tới việc xây dựng một hệ thống phòng thủ mạng tích hợp đa tầng kết hợp công cụ giám sát mã nguồn mở hiệu năng cao (Suricata / Zeek) với các giải thuật học máy (Machine Learning) nhằm phát hiện sớm các dị thường lưu lượng mạng và cuộc tấn công Zero-day.\n\nHệ thống được thiết kế theo mô hình phân tán, có khả năng bắt gói tin mạng thời gian thực, trích xuất đặc trưng luồng dữ liệu (Flow Features), phân loại lưu lượng độc hại và phát cảnh báo tự động về trung tâm giám sát an ninh (SOC).',
      objectives: '- Thu thập, tiền xử lý và gắn nhãn tập dữ liệu lưu lượng mạng chuẩn (CIC-IDS2017, NSL-KDD) kết hợp lưu lượng thực tế tại phòng lab mạng.\n- Huấn luyện và tối ưu hóa các mô hình phân loại học máy (Random Forest, XGBoost, Autoencoder) nhằm giảm thiểu tỷ lệ báo động giả (False Positive Rate).\n- Đóng gói và triển khai đường ống phân tích dữ liệu trực tuyến (Real-time Pipeline) trên nền tảng Elasticsearch, Logstash, Kibana (ELK Stack) kết hợp Suricata engine.',
      expectedOutcomes: '- Mô hình mạng thử nghiệm giả lập tấn công (DDoS, Port Scanning, SQL Injection, Brute Force) bằng Kali Linux.\n- Bộ chương trình trích xuất đặc trưng và module suy luận học máy thời gian thực với độ chính xác F1-score đạt trên 94%.\n- Bảng điều khiển (Dashboard) trực quan hóa các mối đe dọa mạng thời gian thực trên Kibana / Grafana.\n- Báo cáo phân tích chuyên sâu về hiệu năng xử lý gói tin và độ trễ phát hiện xâm nhập dưới tải cao.',
      techStack: 'Python, Suricata, Zeek, Scikit-learn, XGBoost, ELK Stack, Docker, Kafka, Bash Script',
      lecturerId: cdProfile.id,
      majorId: majorIdByCode.get('MMT'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Xây dựng Hệ thống IoT Giám sát Vi khí hậu và Tưới tự động cho Vườn Dâu tây Đà Lạt',
      titleEn: 'Development of Smart IoT Microclimate Monitoring and Automated Irrigation System for Da Lat Strawberry Farms',
      description: 'Đà Lạt là thủ phủ nông nghiệp công nghệ cao của cả nước với các mô hình canh tác dâu tây trong nhà kính. Tuy nhiên, sự biến đổi thất thường của vi khí hậu (nhiệt độ chênh lệch ngày đêm lớn, độ ẩm sương mù cao) dễ tạo điều kiện cho nấm bệnh phát triển và ảnh hưởng đến năng suất cây trồng.\n\nĐề tài nghiên cứu chế tạo mạng lưới cảm biến không dây IoT thu thập các thông số môi trường sinh trưởng của cây dâu (nhiệt độ, độ ẩm không khí, độ ẩm giá thể xơ dừa, cường độ ánh sáng Lux, độ pH và chỉ số EC của dung dịch dinh dưỡng), từ đó tính toán nhu cầu nước và tự động kích hoạt van tưới nhỏ giọt thông minh kết hợp hệ thống quạt thông gió và phun sương làm mát.',
      objectives: '- Thiết kế và gia công bo mạch vi điều khiển tiết kiệm năng lượng (ESP32) giao tiếp với các cảm biến công nghiệp chuẩn RS485 / Modbus.\n- Xây dựng giao thức truyền thông không dây tin cậy dựa trên MQTT / LoRaWAN đảm bảo khả năng truyền tín hiệu ổn định trong môi trường nhà kính diện tích rộng.\n- Phát triển ứng dụng điều khiển di động và Dashboard quản lý giúp nhà nông theo dõi thông số vi khí hậu theo thời gian thực và cài đặt kịch bản tưới tự động theo từng giai đoạn phát triển của cây dâu.',
      expectedOutcomes: '- 02 bộ thiết bị phần cứng (Node cảm biến vi khí hậu và Gateway điều khiển tưới 4 kênh) đóng hộp chuẩn chống nước IP65.\n- Ứng dụng di động Flutter hỗ trợ hiển thị biểu đồ môi trường, cảnh báo vượt ngưỡng qua Push Notification và điều khiển tưới từ xa.\n- Hệ thống máy chủ Node.js / Go kết hợp TimescaleDB lưu trữ chuỗi thời gian dữ liệu môi trường.\n- Báo cáo kết quả thử nghiệm thực tế tại một nhà kính dâu tây tại Phường 8, TP. Đà Lạt trong vòng 2 tuần.',
      techStack: 'C/C++, ESP32, MQTT Broker, Node.js, TimescaleDB, Flutter, Grafana, LoRaWAN',
      lecturerId: cdProfile.id,
      majorId: majorIdByCode.get('MMT'),
      roundId: dacnRound?.id ?? datnRound.id,
      maxStudents: 2,
      status: 'OPEN' as const,
    },
    {
      title: 'Nền tảng Quản lý và Khai thác Dữ liệu Du lịch Thông minh Tỉnh Lâm Đồng',
      titleEn: 'Smart Tourism Data Management and Analytics Platform for Lam Dong Province',
      description: 'Ngành du lịch Đà Lạt - Lâm Đồng đang chuyển đổi số mạnh mẽ nhằm nâng cao trải nghiệm của du khách và hiệu quả điều hành của các cơ quan quản lý. Hiện nay, dữ liệu điểm đến, cơ sở lưu trú, ẩm thực và phản hồi từ du khách đang nằm phân tán trên nhiều nền tảng mạng xã hội và kênh OTA (Google Maps, TripAdvisor, Booking, Traveloka).\n\nĐề tài xây dựng nền tảng tổng hợp dữ liệu du lịch thông minh, ứng dụng các mô hình học sâu xử lý ngôn ngữ tự nhiên (NLP) tiếng Việt để phân tích sắc thái cảm xúc (Sentiment Analysis) của du khách về các địa danh, món ăn và dịch vụ lưu trú. Nền tảng đồng thời cung cấp thuật toán đề xuất lịch trình du lịch cá nhân hóa dựa trên thời gian lưu trú, ngân sách và sở thích du khách.',
      objectives: '- Xây dựng hệ thống thu thập dữ liệu tự động (Web Scraper) an toàn, tuân thủ robots.txt từ các nguồn thông tin du lịch công khai về Đà Lạt.\n- Tinh chỉnh mô hình học sâu PhoBERT để phân loại cảm xúc tích cực / tiêu cực / trung tính và nhận diện các thực thể có tên (NER) trong các bài đánh giá tiếng Việt.\n- Thiết kế thuật toán tối ưu hóa đa mục tiêu gợi ý lịch trình di chuyển tiết kiệm thời gian và chi phí cho du khách tại thành phố Đà Lạt.',
      expectedOutcomes: '- Cổng thông tin Web Portal dành cho khách du lịch và Trung tâm điều hành dữ liệu du lịch dành cho nhà quản lý.\n- Mô hình NLP phân loại cảm xúc đánh giá tiếng Việt đạt F1-score trên 89% và công cụ gợi ý lịch trình thông minh.\n- Bộ API RESTful mở cho phép tích hợp dữ liệu với các ứng dụng du lịch bên thứ ba.\n- Báo cáo thuyết minh đồ án và mã nguồn được đóng gói hoàn chỉnh trên Docker Container.',
      techStack: 'React, TypeScript, Python FastAPI, PhoBERT, PyTorch, MongoDB, Redis, Docker, TailwindCSS',
      lecturerId: cnkProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: dacnRound?.id ?? datnRound.id,
      maxStudents: 3,
      status: 'OPEN' as const,
    },
    {
      title: 'Xây dựng Ứng dụng Quản lý Thư viện Số Trường Đại học Đà Lạt',
      titleEn: 'Digital Library Management Web Application for Dalat University',
      description: 'Thư viện Trường Đại học Đà Lạt đang trong quá trình chuyển đổi số toàn diện các tài nguyên tài liệu in và số hóa luận văn, giáo trình nội bộ. Ứng dụng Quản lý Thư viện Số hướng tới cung cấp một giải pháp web hiện đại, thân thiện, giúp sinh viên tra cứu tài liệu học thuật nhanh chóng theo chuẩn phân loại DDC (Dewey Decimal Classification), gia hạn mượn sách trực tuyến và đọc tài liệu PDF có bản quyền trực tiếp trên trình duyệt.\n\nĐối với cán bộ thư viện, hệ thống cung cấp công cụ kiểm kê kho sách bằng mã vạch (Barcode / QR Code), quản lý thẻ bạn đọc, theo dõi quá trình mượn trả và tự động tính tiền phạt quá hạn theo biểu phí quy định của Nhà trường.',
      objectives: '- Phân tích và thiết kế cơ sở dữ liệu quan hệ quản lý bạn đọc, danh mục sách, đầu sách (Copies) và giao dịch mượn trả sách theo chuẩn nghiệp vụ thư viện.\n- Xây dựng giao diện web tương thích thiết bị di động với tính năng tìm kiếm toàn văn (Full-text Search) theo nhan đề, tác giả, năm xuất bản và từ khóa.\n- Áp dụng các nguyên lý lập trình hướng đối tượng (OOP), mẫu thiết kế MVC/Clean Architecture và triển khai kiểm thử đơn vị (Unit Test).',
      expectedOutcomes: '- Ứng dụng web hoàn chỉnh chạy trên nền Node.js / React với giao diện thân thiện, hiện đại.\n- Module đọc tài liệu số PDF tích hợp giải pháp ngăn chặn tải về trái phép (Watermarking & DRM cơ bản).\n- Tài liệu phân tích thiết kế hệ thống (Use Case, Class Diagram, ERD, Sequence Diagram) và hướng dẫn sử dụng chi tiết.',
      techStack: 'React, Vite, Node.js, Express, PostgreSQL, Prisma ORM, TailwindCSS, PDF.js',
      lecturerId: pbProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: dacsRound?.id ?? datnRound.id,
      maxStudents: 2,
      status: 'OPEN' as const,
    },
    {
      title: 'Nền tảng Khám và Tư vấn Y tế Từ xa (Telemedicine) Hỗ trợ Y tế Tuyến Cơ sở',
      titleEn: 'Telemedicine Platform for Remote Health Consultation and Medical Record Management in Rural Healthcare',
      description: 'Tại các huyện vùng sâu, vùng xa của tỉnh Lâm Đồng và khu vực Tây Nguyên, việc tiếp cận các bác sĩ chuyên khoa tuyến trên còn gặp nhiều rào cản về khoảng cách địa lý và phương tiện di chuyển. Đề tài tập trung nghiên cứu, thiết kế và xây dựng nền tảng y tế từ xa (Telemedicine) tuân thủ tiêu chuẩn bảo mật dữ liệu y tế quốc tế (HIPAA).\n\nNền tảng cho phép người dân và trạm y tế xã kết nối hội chẩn trực tuyến video với bác sĩ tuyến tỉnh/trung ương với độ trễ cực thấp (WebRTC), chia sẻ hồ sơ bệnh án điện tử (EMR) có mã hóa đầu cuối (E2EE), đặt lịch khám và theo dõi chỉ số sức khỏe định kỳ.',
      objectives: '- Thiết kế kiến trúc bảo mật y tế điện tử tuân thủ quy định lưu trữ dữ liệu sức khỏe của Bộ Y tế, bảo vệ thông tin bệnh nhân bằng thuật toán mã hóa AES-256.\n- Triển khai máy chủ truyền thông WebRTC (SFU / Mediasoup) hỗ trợ cuộc gọi video HD ổn định ngay cả trong điều kiện mạng 4G băng thông thấp.\n- Xây dựng hệ thống quản lý bệnh án điện tử tương thích định dạng chuẩn FHIR (Fast Healthcare Interoperability Resources) và tích hợp nhắc lịch uống thuốc qua SMS/Zalo.',
      expectedOutcomes: '- Ứng dụng web cho bác sĩ và ứng dụng di động cho bệnh nhân (React / React Native).\n- Máy chủ truyền phát âm thanh/hình ảnh thời gian thực Mediasoup SFU có chức năng ghi hình phiên khám có sự đồng ý của bệnh nhân.\n- Báo cáo đánh giá bảo mật hệ thống (Penetration Testing) và độ trễ truyền thông WebRTC dưới các kịch bản mạng mô phỏng Packet Loss.',
      techStack: 'Next.js 14, React Native, Node.js, Mediasoup, WebRTC, PostgreSQL, Redis, Docker, AES-256',
      lecturerId: pbProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'OPEN' as const,
    },
    {
      title: 'Ứng dụng Thị giác Máy tính và Học sâu trong Phân loại và Phát hiện Sâu bệnh trên Cây Cà phê',
      titleEn: 'Deep Learning and Computer Vision for Coffee Plant Disease and Pest Detection in the Central Highlands',
      description: 'Cây cà phê là cây công nghiệp chủ lực của vùng Tây Nguyên nói chung và tỉnh Lâm Đồng nói riêng. Tuy nhiên, các loại sâu bệnh hại nguy hiểm như rỉ sắt (Hemileia vastatrix), bệnh thán thư (Colletotrichum), rệp sáp và sâu đục thân thường gây thiệt hại nặng nề về sản lượng nếu không được phát hiện và xử lý kịp thời.\n\nĐề tài nghiên cứu xây dựng giải pháp thị giác máy tính di động ứng dụng mạng nơ-ron tích chập hiện đại (Convolutional Neural Networks / YOLOv8) có khả năng định vị chính xác vùng lá hoặc quả bị tổn thương, nhận diện loại bệnh và mức độ nghiêm trọng ngay trong điều kiện thực địa ngoài nông trại, từ đó đưa ra hướng dẫn sử dụng thuốc bảo vệ thực vật sinh học phù hợp.',
      objectives: '- Xây dựng bộ dữ liệu hình ảnh sâu bệnh trên cây cà phê Robusta và Arabica tại Lâm Đồng gồm hơn 10.000 ảnh được chuyên gia nông nghiệp gán nhãn chuẩn xác.\n- Huấn luyện, nén mô hình (Model Quantization & Pruning) bằng ONNX / TensorFlow Lite để mô hình có thể suy luận trực tiếp (Offline Edge Inference) trên điện thoại thông minh mà không cần kết nối Internet.\n- Tích hợp mô hình AI vào ứng dụng di động hỗ trợ chụp ảnh trực tiếp từ camera, quét thời gian thực và lưu trữ lịch sử dịch bệnh theo tọa độ GPS của vườn rẫy.',
      expectedOutcomes: '- Mô hình Deep Learning nhận diện bệnh cà phê đạt mAP@0.5 trên 91% và thời gian suy luận dưới 150ms trên thiết bị di động.\n- Ứng dụng di động Flutter chạy trơn tru chế độ Offline, hỗ trợ nông dân tra cứu cẩm nang chăm sóc và phòng trừ sâu bệnh sinh học.\n- Bộ dữ liệu ảnh sâu bệnh cà phê Tây Nguyên mở đóng góp cho cộng đồng nghiên cứu AI nông nghiệp Việt Nam.',
      techStack: 'PyTorch, YOLOv8, OpenCV, TensorFlow Lite, Flutter, Python FastAPI, PostgreSQL, Roboflow',
      lecturerId: abProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'OPEN' as const,
    },
    {
      title: 'Thiết kế Hệ thống Trung tâm Điều hành An ninh Mạng (Mini SOC) Ứng dụng Wazuh và Suricata',
      titleEn: 'Building a Lightweight Security Operations Center (Mini SOC) Integrating Wazuh SIEM and Suricata NIDS',
      description: 'Đối với các cơ quan hành chính nhà nước, trường đại học và doanh nghiệp vừa và nhỏ (SME), việc đầu tư các giải pháp giám sát an toàn thông tin thương mại (SIEM / SOC) tốn kém hàng tỷ đồng. Đề tài nghiên cứu giải pháp xây dựng một trung tâm điều hành an toàn thông tin thu nhỏ (Mini SOC) mã nguồn mở nhưng đạt hiệu quả bảo vệ cao.\n\nHệ thống kết hợp Wazuh (Endpoint Security / HIDS) để thu thập nhật ký máy trạm, máy chủ và Suricata (Network IDS) để giám sát hạ tầng mạng, tập trung hóa dữ liệu cảnh báo về nền tảng OpenSearch / Wazuh Dashboard, đồng thời tích hợp cơ chế phản ứng sự cố tự động (Active Response) giúp ngăn chặn các đòn tấn công Ransomware, Malware và leo thang đặc quyền.',
      objectives: '- Thiết kế kiến trúc mạng phòng thủ đa vùng và triển khai Wazuh Agents trên các hệ điều hành phổ biến (Windows Server, Ubuntu, CentOS).\n- Tích hợp dữ liệu tình báo mối đe dọa (Threat Intelligence Feeds từ AlienVault OTX, AbuseIPDB) để tự động phát hiện các địa chỉ IP độc hại và mã độc đã biết.\n- Xây dựng các kịch bản phản ứng tự động (Active Response Scripts) cách ly máy tính nhiễm mã độc khỏi mạng nội bộ ngay khi phát hiện hành vi mã hóa tập tin bất thường.',
      expectedOutcomes: '- Mô hình Mini SOC hoàn chỉnh hoạt động ổn định trên môi trường máy chủ ảo hóa Proxmox / VMware ESXi.\n- Bộ quy tắc giám sát tùy biến (Custom Wazuh Rules & Suricata Signatures) tối ưu cho môi trường mạng giáo dục và doanh nghiệp vừa và nhỏ.\n- Sổ tay quy trình ứng cứu sự cố an ninh mạng (Incident Response Playbook) theo khung chuẩn NIST SP 800-61.',
      techStack: 'Wazuh SIEM, Suricata NIDS, OpenSearch, Python, Bash Script, Proxmox VE, Linux Syslog, Docker',
      lecturerId: cdProfile.id,
      majorId: majorIdByCode.get('MMT'),
      roundId: datnRound.id,
      maxStudents: 2,
      status: 'OPEN' as const,
    },
    {
      title: 'Xây dựng Hệ sinh thái Đấu thầu và Truy xuất Nguồn gốc Nông sản trên Nền tảng Blockchain',
      titleEn: 'Blockchain-based Agricultural Traceability and Decentralized Bidding Ecosystem',
      description: 'Vấn đề giả mạo thương hiệu nông sản Đà Lạt (rau củ, hoa tươi, nấm linh chi, đông trùng hạ thảo) trên thị trường là nỗi lo ngại lớn của cả người sản xuất chân chính lẫn người tiêu dùng. Các hệ thống tem QR Code thông thường dễ bị sao chép và dữ liệu lưu tập trung có nguy cơ bị chỉnh sửa trái phép.\n\nĐề tài nghiên cứu ứng dụng công nghệ chuỗi khối (Blockchain) và hợp đồng thông minh (Smart Contracts) nhằm thiết lập một sổ cái bất biến ghi nhận từng giai đoạn trong chuỗi cung ứng nông nghiệp: từ gieo trồng, sử dụng phân bón, thu hoạch, đóng gói đến vận chuyển và phân phối. Đồng thời, hệ thống cung cấp sàn đấu thầu nông sản trực tuyến minh bạch, loại bỏ trung gian thương lái và đảm bảo thanh toán an toàn cho nông hộ.',
      objectives: '- Thiết kế và kiểm toán an ninh các Hợp đồng thông minh (Solidity Smart Contracts theo chuẩn ERC-721 / ERC-1155) cho việc quản lý mã định danh nông sản số.\n- Tối ưu hóa chi phí giao dịch (Gas fee) bằng cách triển khai giải pháp Layer-2 Rollup (Polygon) kết hợp lưu trữ phi tập trung IPFS cho các chứng chỉ kiểm nghiệm chất lượng.\n- Xây dựng giao diện ứng dụng phi tập trung (DApp) trực quan cho nông dân, thương nhân và người tiêu dùng quét mã QR xác thực nguồn gốc không thể giả mạo.',
      expectedOutcomes: '- Bộ Smart Contracts được kiểm thử toàn diện trên môi trường Testnet, đạt chuẩn an toàn không có lỗ hổng Reentrancy hay Overflow.\n- Ứng dụng Web DApp (Next.js, Ethers.js, Wagmi) kết nối ví tiền điện tử Web3 (MetaMask) phục vụ sàn đấu thầu nông sản.\n- Cổng thông tin quét mã QR công khai hiển thị chi tiết dòng thời gian chuỗi cung ứng từ nông trại đến bàn ăn.',
      techStack: 'Solidity, Hardhat, Polygon L2, IPFS, Next.js 14, Ethers.js, Wagmi, TailwindCSS, PostgreSQL',
      lecturerId: cnkProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'OPEN' as const,
    },
    {
      title: 'Hệ thống Điểm danh và Nhận diện Khuôn mặt Sinh viên Ứng dụng Edge AI trên Thiết bị Nhúng',
      titleEn: 'Edge AI-based Student Attendance and Face Recognition System on Embedded Devices',
      description: 'Việc điểm danh sinh viên truyền thống tại các giảng đường lớn với 80-150 sinh viên tại Đại học Đà Lạt thường mất từ 10 đến 15 phút đầu giờ, dễ gây gián đoạn tiết học và xảy ra hiện tượng điểm danh hộ.\n\nĐề tài nghiên cứu giải pháp điểm danh thông minh triển khai trực tiếp tại cửa giảng đường bằng thiết bị phần cứng nhúng tích hợp bộ tăng tốc trí tuệ nhân tạo biên (Edge AI Accelerator như NVIDIA Jetson Nano / Raspberry Pi 5 kết hợp Coral TPU). Hệ thống có khả năng nhận diện nhiều sinh viên cùng lúc khi bước qua cửa với tốc độ cao, xác thực thời gian thực và tự động đồng bộ kết quả điểm danh về cổng thông tin quản lý đào tạo của Khoa.',
      objectives: '- Triển khai mô hình phát hiện và nhận diện khuôn mặt tối ưu hóa (RetinaFace kết hợp MobileFaceNet / ArcFace) chạy mượt mà trên phần cứng nhúng biên.\n- Tích hợp thuật toán chống giả mạo gương mặt (Face Anti-spoofing / Liveness Detection) ngăn chặn hành vi sử dụng ảnh chụp trên điện thoại hoặc video để điểm danh hộ.\n- Thiết kế kiến trúc đồng bộ dữ liệu ngoại tuyến (Offline-First): tiếp tục nhận diện và ghi nhận khi mất mạng, tự động đồng bộ về máy chủ cơ sở dữ liệu khi có kết nối trở lại.',
      expectedOutcomes: '- Thiết bị điểm danh hoàn chỉnh gồm máy tính nhúng, Camera góc rộng, màn hình LCD hiển thị phản hồi tức thì và đèn LED thông báo trạng thái.\n- Độ chính xác nhận diện đạt trên 98% với thời gian nhận diện dưới 200ms cho mỗi khuôn mặt; chống giả mạo đạt trên 95%.\n- Bảng điều khiển quản lý điểm danh dành cho giảng viên môn học với tính năng xuất báo cáo chuyên cần định dạng Excel / PDF.',
      techStack: 'Python, OpenCV, InsightFace, TensorRT, NVIDIA Jetson, Raspberry Pi, FastAPI, SQLite, Vue.js',
      lecturerId: cdProfile.id,
      majorId: majorIdByCode.get('MMT'),
      roundId: dacnRound?.id ?? datnRound.id,
      maxStudents: 2,
      status: 'OPEN' as const,
    },
  ];

  const createdTopics: any[] = [];
  for (const t of topicsData) {
    const topic = await prisma.topic.create({
      data: {
        title: t.title,
        titleEn: t.titleEn,
        description: t.description,
        objectives: t.objectives,
        expectedOutcomes: t.expectedOutcomes,
        techStack: t.techStack,
        maxStudents: t.maxStudents,
        status: t.status,
        semesterId: semester.id,
        roundId: t.roundId,
        lecturerId: t.lecturerId,
        majorId: t.majorId,
      },
    });
    createdTopics.push(topic);
  }
  console.log(`[✓] 8. Đề tài: Đã tạo ${createdTopics.length} đề tài phong phú và chi tiết cho các đợt`);

  // 9. Seed Đề xuất từ sinh viên (TopicProposal)
  const studentAProfile = studentProfileByEmail.get('2266666@dlu.edu.vn')?.profile;
  const studentCProfile = studentProfileByEmail.get('2288888@dlu.edu.vn')?.profile;
  const datnType = await prisma.projectType.findUnique({ where: { code: 'DATN' } });

  if (studentAProfile && pbProfile && datnType) {
    await prisma.topicProposal.deleteMany({ where: { semesterId: semester.id } });

    await prisma.topicProposal.create({
      data: {
        title: 'Nghiên cứu ứng dụng Computer Vision trong nhận diện khuôn mặt sinh viên tại giảng đường DLU',
        description: 'Đề tài nhằm tự động hóa quy trình điểm danh bằng camera nhận diện gương mặt. Nhóm em đã tìm hiểu thư viện OpenCV và mô hình YOLO.',
        expectedOutcomes: 'Ứng dụng điểm danh chạy thử nghiệm, báo cáo độ chính xác nhận diện.',
        semesterId: semester.id,
        studentId: studentAProfile.id,
        projectTypeId: datnType.id,
        requestedLecturerId: pbProfile.id,
        status: 'PENDING',
      },
    });

    if (studentCProfile && cdProfile) {
      await prisma.topicProposal.create({
        data: {
          title: 'Hệ thống Cảnh báo Cháy rừng Thông Đà Lạt dựa trên Mạng Cảm biến LoRa',
          description: 'Triển khai mạng cảm biến đo nhiệt độ, khói và truyền tin khoảng cách xa bằng LoRaWAN về trung tâm giám sát.',
          expectedOutcomes: 'Thiết bị cảm biến phần cứng mẫu và Dashboard web giám sát thời gian thực.',
          semesterId: semester.id,
          studentId: studentCProfile.id,
          projectTypeId: datnType.id,
          requestedLecturerId: cdProfile.id,
          status: 'ACCEPTED',
        },
      });
    }
    console.log(`[✓] 9. Đề xuất từ sinh viên: Đã tạo 2 đề xuất mẫu (1 PENDING, 1 ACCEPTED)`);
  }

  // 10. Seed Nhóm làm đồ án & Thành viên (RegistrationGroup & Member)
  const topic1 = createdTopics[0]; // Hệ thống Quản lý Đồ án Tốt nghiệp (GVHD: Thầy Phan Bửu)
  const topic3 = createdTopics[2]; // Hệ thống NIDS (GVHD: Thầy Chu Đình)
  const studentBProfile = studentProfileByEmail.get('2277777@dlu.edu.vn')?.profile;
  const studentDProfile = studentProfileByEmail.get('2299999@dlu.edu.vn')?.profile;

  if (topic1 && studentAProfile && studentBProfile) {
    // Nhóm 1: SV A (Trưởng nhóm) & SV B (Thành viên) làm Đề tài 1
    const group1 = await prisma.registrationGroup.create({
      data: {
        topicId: topic1.id,
        semesterId: semester.id,
        leaderId: studentAProfile.id,
        name: 'Nhóm 01 - KLTN KTPM',
        status: 'SUBMITTED',
        openForJoin: false,
        declaredSize: 2,
        joinCode: 'DLU-DATN-4601',
      },
    });

    await prisma.registrationGroupMember.createMany({
      data: [
        {
          groupId: group1.id,
          semesterId: semester.id,
          studentId: studentAProfile.id,
          status: 'ACCEPTED',
          joinSource: 'SELF',
          mentorGrade: 9.0,
          mentorComment: 'Sinh viên nắm vững kiến trúc hệ thống, hoàn thành xuất sắc các module được giao.',
        },
        {
          groupId: group1.id,
          semesterId: semester.id,
          studentId: studentBProfile.id,
          status: 'ACCEPTED',
          joinSource: 'LINK',
          mentorGrade: 8.5,
          mentorComment: 'Thiết kế giao diện đẹp mắt, logic frontend mượt mà, kỹ năng làm việc nhóm tốt.',
        },
      ],
    });

    // 11. Seed Đề cương M03 cho Nhóm 1 (Đã duyệt)
    await prisma.topicOutline.create({
      data: {
        groupId: group1.id,
        topicId: topic1.id,
        fileName: 'M03_De_cuong_chi_tiet_KLTN_Nhom01.pdf',
        fileSize: 1048576, // 1MB
        attachmentUrl: 'https://storage.dlu.edu.vn/outlines/m03_nhom1.pdf',
        submittedById: studentAProfile.id,
        submittedAt: daysFromNow(-15),
        status: 'APPROVED_BY_LECTURER',
        lecturerFeedback: 'Đề cương chi tiết, phương pháp nghiên cứu và phân công công việc rõ ràng. Đồng ý thông qua để nhóm triển khai.',
        approvedAt: daysFromNow(-12),
        objectives: 'Xây dựng hệ thống web ProBase phục vụ tự động hóa quản lý đồ án tốt nghiệp.',
        scopeAndContent: 'Quản lý học kỳ, đợt đăng ký, lập nhóm, duyệt đề cương M03, chấm phản biện M05 và bảo vệ hội đồng.',
      },
    });

    // 12. Seed Phân công GVPB (TopicAssignment)
    const adminUser = staffProfileByEmail.get('gvgvk@dlu.edu.vn')!.user;
    await prisma.topicAssignment.create({
      data: {
        groupId: group1.id,
        topicId: topic1.id,
        supervisorId: pbProfile.id,
        reviewerId: abProfile.id, // TS. An Bình phản biện
        assignedById: adminUser.id,
      },
    });

    // 13. Seed Phiếu nhận xét phản biện (TopicReview M04 & M05)
    await prisma.topicReview.createMany({
      data: [
        {
          groupId: group1.id,
          lecturerId: pbProfile.id,
          reviewerType: 'SUPERVISOR',
          templateCode: 'M04',
          generalComment: 'Sinh viên chăm chỉ, có tinh thần cầu tiến. Sản phẩm phần mềm hoàn thiện đạt chất lượng tốt, đề xuất cho bảo vệ trước Hội đồng.',
          isDefenseAllowed: true,
        },
        {
          groupId: group1.id,
          lecturerId: abProfile.id,
          reviewerType: 'REVIEWER',
          templateCode: 'M05',
          generalComment: 'Đề tài đáp ứng đầy đủ khối lượng của một Khóa luận tốt nghiệp cử nhân CNTT. Cấu trúc báo cáo khoa học, mã nguồn viết rõ ràng. Đủ điều kiện bảo vệ.',
          isDefenseAllowed: true,
        },
      ],
    });

    // 14. Seed Hội đồng bảo vệ & Chấm điểm (Council)
    const council = await prisma.council.create({
      data: {
        semesterId: semester.id,
        majorId: majorIdByCode.get('CNPM'),
        name: 'Hội đồng 01 - Chuyên ngành Kỹ thuật phần mềm (KLTN CTK46)',
        location: 'Phòng Hội thảo Khoa CNTT - Giảng đường A31.204',
        defenseDate: daysFromNow(95),
        status: 'PREP',
      },
    });

    await prisma.councilMember.createMany({
      data: [
        { councilId: council.id, lecturerId: cnkProfile.id, councilRole: 'PRESIDENT' },
        { councilId: council.id, lecturerId: abProfile.id, councilRole: 'SECRETARY' },
        { councilId: council.id, lecturerId: pbProfile.id, councilRole: 'MEMBER' },
      ],
    });

    const councilTopic = await prisma.councilTopic.create({
      data: {
        councilId: council.id,
        topicId: topic1.id,
        groupId: group1.id,
        reviewerId: abProfile.id,
        timeSlot: '08:00 - 09:30',
        defenseOrder: 1,
        status: 'SCHEDULED',
      },
    });

    await prisma.councilTopicGrade.createMany({
      data: [
        {
          councilTopicId: councilTopic.id,
          studentId: studentAProfile.id,
          councilGrade: 9.0,
          reviewerGrade: 9.0,
          finalGrade: 9.0,
        },
        {
          councilTopicId: councilTopic.id,
          studentId: studentBProfile.id,
          councilGrade: 8.5,
          reviewerGrade: 8.5,
          finalGrade: 8.5,
        },
      ],
    });

    console.log(`[✓] 10. Nhóm 01 (KLTN KTPM): Đã tạo nhóm, nộp đề cương M03, phân công GVPB, nhận xét M04/M05 và xếp Hội đồng`);
  }

  // Nhóm 2: SV C & SV D làm Đề tài 3 (NIDS - MMT)
  if (topic3 && studentCProfile && studentDProfile) {
    const group2 = await prisma.registrationGroup.create({
      data: {
        topicId: topic3.id,
        semesterId: semester.id,
        leaderId: studentCProfile.id,
        name: 'Nhóm 02 - An toàn Mạng CTK46',
        status: 'FORMING',
        openForJoin: true,
        declaredSize: 2,
        joinCode: 'DLU-DATN-4602',
      },
    });

    await prisma.registrationGroupMember.createMany({
      data: [
        {
          groupId: group2.id,
          semesterId: semester.id,
          studentId: studentCProfile.id,
          status: 'ACCEPTED',
          joinSource: 'SELF',
        },
        {
          groupId: group2.id,
          semesterId: semester.id,
          studentId: studentDProfile.id,
          status: 'ACCEPTED',
          joinSource: 'LINK',
        },
      ],
    });
    console.log(`[✓] 11. Nhóm 02 (KLTN MMT): Đang ở trạng thái lập nhóm (FORMING)`);
  }

  // 15. Seed Thông báo (Notifications)
  const notifUsers = [
    studentAProfile?.userId,
    pbProfile?.userId,
    abProfile?.userId,
  ].filter(Boolean) as number[];

  for (const userId of notifUsers) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'REGISTRATION_CLOSING_SOON',
        title: 'Mở đăng ký đề tài',
        content: `Học kỳ 1 năm học ${currentYear}–${currentYear + 1} đã chính thức mở đợt đăng ký đề tài.\n\nSinh viên đủ điều kiện vui lòng nhanh tay theo dõi danh sách đề tài và đăng ký trước thời hạn quy định của Khoa.`,
      },
    });
  }
  console.log(`[✓] 12. Thông báo: Đã tạo thông báo hệ thống cho sinh viên và giảng viên`);

  console.log('\n============================================================');
  console.log('🎉 SEED DỮ LIỆU ĐẦY ĐỦ CHO TẤT CẢ CÁC BẢNG THÀNH CÔNG RỰC RỠ!');
  console.log('============================================================');
  console.log(`MẬT KHẨU CHUNG CHO TẤT CẢ TÀI KHOẢN: ${DEFAULT_PASSWORD}\n`);
  console.log('Danh sách tài khoản test:');
  console.log('  1. Giáo vụ Khoa (Admin) : gvgvk@dlu.edu.vn');
  console.log('  2. BCN Khoa (Trưởng khoa): gvcnk@dlu.edu.vn');
  console.log('  3. TTBM Phần mềm        : gvab@dlu.edu.vn');
  console.log('  4. TTBM Mạng máy tính   : gvcd@dlu.edu.vn');
  console.log('  5. Giảng viên HD & PB   : gvpb@dlu.edu.vn');
  console.log('  6. Sinh viên trưởng nhóm: 2266666@dlu.edu.vn (Nhóm 1 làm KLTN)');
  console.log('  7. Sinh viên thành viên : 2277777@dlu.edu.vn (Nhóm 1)');
  console.log('  8. Sinh viên Mạng MT    : 2288888@dlu.edu.vn (Nhóm 2)');
  console.log('============================================================\n');
}

main()
  .catch((err) => {
    console.error('Lỗi khi seed dữ liệu:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
