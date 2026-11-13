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
    await prisma.submission.deleteMany({});
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
    const { email, role, lecturerCode, fullName, academicTitle, majorCode, researchInterests, isAcademicAssistant, isHeadOfDepartment } = staff;
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
  const lnProfile = staffProfileByEmail.get('gvln@dlu.edu.vn')?.profile;

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
  await prisma.weeklyLog.deleteMany({ where: { group: { semesterId: semester.id } } });
  await prisma.registrationGroupMember.deleteMany({ where: { semesterId: semester.id } });
  await prisma.registrationGroup.deleteMany({ where: { semesterId: semester.id } });
  await prisma.topicProposal.deleteMany({ where: { semesterId: semester.id } });
  await prisma.topic.deleteMany({ where: { semesterId: semester.id } });

  const topicsData = [
    {
      title: 'Hệ thống Quản lý Đồ án và Khóa luận Tốt nghiệp ProBase cho Khoa CNTT',
      titleEn: 'ProBase - Capstone Project and Thesis Management System for Faculty of Information Technology',
      description: 'Khoa Công nghệ Thông tin - Trường Đại học Đà Lạt hàng năm quản lý hàng trăm sinh viên thuộc các hệ đào tạo tham gia làm Đồ án cơ sở (DACS), Đồ án chuyên ngành (DACN) và Khóa luận tốt nghiệp (DATN). Hiện tại, quy trình từ khâu công bố đề tài, ghép nhóm sinh viên, duyệt đề cương mẫu M03, theo dõi tiến độ hai giai đoạn (20% - 30%) đến phân công phản biện, tổ chức hội đồng chấm bảo vệ (50%) và lưu trữ số hóa 3 thư mục hồ sơ còn phân tán và tốn nhiều công sức tổng hợp báo cáo thủ công.\n\nĐề tài tập trung xây dựng nền tảng web ProBase toàn diện, chuẩn hóa toàn bộ vòng đời đồ án theo quy chế đào tạo tín chỉ của Trường Đại học Đà Lạt. Hệ thống hỗ trợ đa tác tử, phân quyền chặt chẽ giữa Trợ lý giáo vụ, Tổ trưởng bộ môn, Giảng viên hướng dẫn, Giảng viên phản biện, Thành viên hội đồng và Sinh viên.',
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
      lecturerId: lnProfile.id,
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
      lecturerId: lnProfile.id,
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

  const userA = studentProfileByEmail.get('2266666@dlu.edu.vn')?.user;
  const userB = studentProfileByEmail.get('2277777@dlu.edu.vn')?.user;
  const userC = studentProfileByEmail.get('2288888@dlu.edu.vn')?.user;
  const userD = studentProfileByEmail.get('2299999@dlu.edu.vn')?.user;

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
        submittedById: userA?.id,
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
        { councilId: council.id, lecturerId: lnProfile.id, councilRole: 'PRESIDENT' },
        { councilId: council.id, lecturerId: abProfile.id, councilRole: 'SECRETARY' },
        { councilId: council.id, lecturerId: pbProfile.id, councilRole: 'MEMBER' },
        { councilId: council.id, lecturerId: cdProfile.id, councilRole: 'MEMBER' },
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

    // Submissions cho Nhóm 1
    if (datnRound) {
      const requirements = await prisma.submissionRequirement.findMany({
        where: { roundId: datnRound.id },
        orderBy: { sortOrder: 'asc' },
      });

      for (const req of requirements) {
        let fileName = 'Nop_bai_dinh_ky.pdf';
        let submissionUrl: string | null = null;
        if (req.sortOrder === 1) fileName = 'M03_De_cuong_chi_tiet_KLTN_Nhom01.pdf';
        else if (req.sortOrder === 2) fileName = 'Bao_cao_tien_do_1_Nhom01.pdf';
        else if (req.sortOrder === 3) fileName = 'Bao_cao_tien_do_2_Nhom01.pdf';
        else if (req.sortOrder === 4) fileName = 'Quyen_bao_cao_toan_van_va_slide_Nhom01.pdf';
        else if (req.sortOrder === 5) {
          fileName = 'Goi_luu_tru_3_thu_muc_Nhom01.zip';
          submissionUrl = 'https://github.com/BBariOxit/probase';
        }

        await prisma.submission.create({
          data: {
            topicId: topic1.id,
            groupId: group1.id,
            requirementId: req.id,
            fileName,
            fileSize: 1048576,
            fileUrl: `https://storage.dlu.edu.vn/submissions/${fileName}`,
            submissionUrl,
            submittedById: studentAProfile.id,
            submittedAt: daysFromNow(-15 + req.sortOrder * 2),
            lecturerFeedback: req.sortOrder <= 3 ? 'Đã duyệt nội dung bài nộp.' : null,
            feedbackAt: req.sortOrder <= 3 ? daysFromNow(-13 + req.sortOrder * 2) : null,
          },
        });
      }
    }

    // Đánh giá tiến độ (ProgressReport) cho Nhóm 1
    await prisma.progressReport.createMany({
      data: [
        {
          groupId: group1.id,
          stage: 'STAGE_1',
          reportFileName: 'Bao_cao_tien_do_1_Nhom01.pdf',
          reportFileSize: 1048576,
          sourceCodeUrl: 'https://github.com/BBariOxit/probase',
          submittedById: userA?.id,
          submittedAt: daysFromNow(-30),
          supervisorGrade: 9.0,
          supervisorFeedback: 'Tiến độ bám sát kế hoạch, module backend REST API chạy tốt.',
          finalStageGrade: 9.0,
          workloadPercentage: 45,
          isPassed: true,
        },
        {
          groupId: group1.id,
          stage: 'STAGE_2',
          reportFileName: 'Bao_cao_tien_do_2_Nhom01.pdf',
          reportFileSize: 2097152,
          sourceCodeUrl: 'https://github.com/BBariOxit/probase',
          submittedById: userA?.id,
          submittedAt: daysFromNow(-10),
          supervisorGrade: 9.0,
          supervisorFeedback: 'Giao diện mượt mà, đầy đủ các luồng nghiệp vụ.',
          reviewerGrade: 8.5,
          reviewerFeedback: 'Sản phẩm hoàn thiện đạt yêu cầu tốt nghiệp.',
          finalStageGrade: 8.75,
          workloadPercentage: 85,
          isPassed: true,
        },
      ],
    });

    // Nhật ký tiến độ (WeeklyLog) cho Nhóm 1
    await prisma.weeklyLog.createMany({
      data: [
        {
          groupId: group1.id,
          weekNumber: 1,
          title: 'Khảo sát quy trình nghiệp vụ đồ án tại Khoa CNTT',
          completionPercentage: 25,
          gitCommitUrl: 'https://github.com/BBariOxit/probase/commit/1a2b3c4',
          summaryNotes: 'Tổng hợp mẫu M01 - M10, phỏng vấn trợ lý giáo vụ và sinh viên.',
          submittedById: userA?.id,
          lecturerComment: 'Hướng nghiên cứu thực tế, bám sát nghiệp vụ Khoa.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-25),
        },
        {
          groupId: group1.id,
          weekNumber: 2,
          title: 'Thiết kế cơ sở dữ liệu và dựng khung NestJS API',
          completionPercentage: 50,
          gitCommitUrl: 'https://github.com/BBariOxit/probase/commit/5d6e7f8',
          summaryNotes: 'Hoàn thành Schema Prisma với 20+ bảng thực thể, RBAC và JWT auth.',
          submittedById: userB?.id,
          lecturerComment: 'Schema chặt chẽ, tối ưu index các khóa ngoại.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-18),
        },
        {
          groupId: group1.id,
          weekNumber: 3,
          title: 'Xây dựng giao diện Next.js và tích hợp REST API',
          completionPercentage: 75,
          gitCommitUrl: 'https://github.com/BBariOxit/probase/commit/9a0b1c2',
          summaryNotes: 'Triển khai bàn phân bổ, quản lý đề tài, nộp đề cương và form đánh giá.',
          submittedById: userA?.id,
          lecturerComment: 'Giao diện trực quan, tiếp tục tối ưu trải nghiệm người dùng.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-11),
        },
        {
          groupId: group1.id,
          weekNumber: 4,
          title: 'Kiểm thử toàn diện và đóng gói Docker',
          completionPercentage: 95,
          gitCommitUrl: 'https://github.com/BBariOxit/probase/commit/3d4e5f6',
          summaryNotes: 'Kiểm thử e2e luồng duyệt đề tài, chuẩn bị báo cáo toàn văn và slide.',
          submittedById: userB?.id,
          lecturerComment: 'Hệ thống đạt chất lượng cao, chuẩn bị tốt cho buổi bảo vệ.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-4),
        },
      ],
    });

    console.log(`[✓] 10. Nhóm 01 (KLTN KTPM): Đã tạo nhóm, nộp đề cương M03, bài nộp 5 mốc, phân công GVPB, nhận xét M04/M05 và xếp Hội đồng`);
  }

  // Nhóm 2: SV C & SV D làm Đề tài 3 (NIDS - MMT, GVHD: ThS. Chu Đình)
  if (topic3 && studentCProfile && studentDProfile) {
    const group2 = await prisma.registrationGroup.create({
      data: {
        topicId: topic3.id,
        semesterId: semester.id,
        leaderId: studentCProfile.id,
        name: 'Nhóm 02 - An toàn Mạng CTK46',
        status: 'SUBMITTED',
        openForJoin: false,
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
          mentorGrade: 9.0,
          mentorComment: 'Sinh viên nắm vững kỹ thuật bắt gói tin và phân tích luồng mạng Suricata, hoàn thành tốt nhiệm vụ.',
        },
        {
          groupId: group2.id,
          semesterId: semester.id,
          studentId: studentDProfile.id,
          status: 'ACCEPTED',
          joinSource: 'LINK',
          mentorGrade: 8.5,
          mentorComment: 'Kỹ năng tiền xử lý dữ liệu và huấn luyện mô hình XGBoost tốt, phối hợp nhóm hiệu quả.',
        },
      ],
    });

    // Đề cương M03 cho Nhóm 2 (Đã duyệt)
    await prisma.topicOutline.create({
      data: {
        groupId: group2.id,
        topicId: topic3.id,
        fileName: 'M03_De_cuong_chi_tiet_KLTN_Nhom02_NIDS.pdf',
        fileSize: 1048576,
        attachmentUrl: 'https://storage.dlu.edu.vn/outlines/m03_nhom2.pdf',
        submittedById: userC?.id,
        submittedAt: daysFromNow(-15),
        status: 'APPROVED_BY_LECTURER',
        lecturerFeedback: 'Đề cương chi tiết, phương pháp tiếp cận mô hình học máy và giám sát Suricata hợp lý. Đồng ý thông qua.',
        approvedAt: daysFromNow(-12),
        objectives: 'Thiết kế và triển khai giải pháp phát hiện xâm nhập mạng NIDS bằng Machine Learning.',
        scopeAndContent: 'Xử lý tập dữ liệu mạng, huấn luyện mô hình Random Forest/XGBoost, tích hợp Suricata và cảnh báo thời gian thực.',
      },
    });

    // Phân công GVPB cho Nhóm 2 (TS. Phan Bửu phản biện)
    const adminUser = staffProfileByEmail.get('gvgvk@dlu.edu.vn')!.user;
    await prisma.topicAssignment.create({
      data: {
        groupId: group2.id,
        topicId: topic3.id,
        supervisorId: cdProfile.id,
        reviewerId: pbProfile.id,
        assignedById: adminUser.id,
      },
    });

    // Phiếu nhận xét phản biện cho Nhóm 2 (M04 & M05)
    await prisma.topicReview.createMany({
      data: [
        {
          groupId: group2.id,
          lecturerId: cdProfile.id,
          reviewerType: 'SUPERVISOR',
          templateCode: 'M04',
          generalComment: 'Nhóm nghiên cứu nghiêm túc, triển khai hệ thống NIDS hoạt động ổn định và chính xác trên môi trường mạng lab. Đủ điều kiện bảo vệ trước Hội đồng.',
          isDefenseAllowed: true,
        },
        {
          groupId: group2.id,
          lecturerId: pbProfile.id,
          reviewerType: 'REVIEWER',
          templateCode: 'M05',
          generalComment: 'Đề tài có tính ứng dụng thực tiễn cao trong an toàn mạng. Kết quả thực nghiệm thuyết phục. Đủ điều kiện bảo vệ.',
          isDefenseAllowed: true,
        },
      ],
    });

    // Xếp Nhóm 2 vào Hội đồng 01
    const council = await prisma.council.findFirst({
      where: { semesterId: semester.id },
    });
    if (council) {
      const councilTopic2 = await prisma.councilTopic.create({
        data: {
          councilId: council.id,
          topicId: topic3.id,
          groupId: group2.id,
          reviewerId: pbProfile.id,
          timeSlot: '09:30 - 11:00',
          defenseOrder: 2,
          status: 'SCHEDULED',
        },
      });

      await prisma.councilTopicGrade.createMany({
        data: [
          {
            councilTopicId: councilTopic2.id,
            studentId: studentCProfile.id,
            councilGrade: 9.0,
            reviewerGrade: 9.0,
            finalGrade: 9.0,
          },
          {
            councilTopicId: councilTopic2.id,
            studentId: studentDProfile.id,
            councilGrade: 8.5,
            reviewerGrade: 8.5,
            finalGrade: 8.5,
          },
        ],
      });
    }

    // Đánh giá tiến độ (ProgressReport) cho Nhóm 2
    await prisma.progressReport.createMany({
      data: [
        {
          groupId: group2.id,
          stage: 'STAGE_1',
          reportFileName: 'Bao_cao_tien_do_1_Nhom02_NIDS.pdf',
          reportFileSize: 1048576,
          sourceCodeUrl: 'https://github.com/dlu-nids/nids-core',
          submittedById: userC?.id,
          submittedAt: daysFromNow(-30),
          supervisorGrade: 9.0,
          supervisorFeedback: 'Cài đặt Suricata và bắt gói tin mạng lab thành công.',
          finalStageGrade: 9.0,
          workloadPercentage: 45,
          isPassed: true,
        },
        {
          groupId: group2.id,
          stage: 'STAGE_2',
          reportFileName: 'Bao_cao_tien_do_2_Nhom02_NIDS.pdf',
          reportFileSize: 2097152,
          sourceCodeUrl: 'https://github.com/dlu-nids/nids-core',
          submittedById: userC?.id,
          submittedAt: daysFromNow(-10),
          supervisorGrade: 9.0,
          supervisorFeedback: 'Mô hình học máy phân loại lưu lượng độc hại chính xác.',
          reviewerGrade: 8.5,
          reviewerFeedback: 'Hệ thống chạy thực nghiệm tốt, đồ án đạt chất lượng.',
          finalStageGrade: 8.75,
          workloadPercentage: 80,
          isPassed: true,
        },
      ],
    });

    // Nhật ký tiến độ (WeeklyLog) cho Nhóm 2
    await prisma.weeklyLog.createMany({
      data: [
        {
          groupId: group2.id,
          weekNumber: 1,
          title: 'Khảo sát kiến trúc mạng và công cụ Suricata',
          completionPercentage: 25,
          gitCommitUrl: 'https://github.com/dlu-nids/nids-core/commit/a1b2c3d',
          summaryNotes: 'Tìm hiểu giao thức mạng, cài đặt Suricata IDS trên máy ảo Ubuntu Server.',
          submittedById: userC?.id,
          lecturerComment: 'Đã xem và đồng ý hướng tiếp cận.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-25),
        },
        {
          groupId: group2.id,
          weekNumber: 2,
          title: 'Thu thập tập dữ liệu CIC-IDS2017 và tiền xử lý',
          completionPercentage: 50,
          gitCommitUrl: 'https://github.com/dlu-nids/nids-core/commit/e4f5g6h',
          summaryNotes: 'Trích xuất 78 đặc trưng luồng mạng (Flow features) và xử lý giá trị khuyết.',
          submittedById: userD?.id,
          lecturerComment: 'Tiền xử lý tốt, chú ý chuẩn hóa dữ liệu trước khi train.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-18),
        },
        {
          groupId: group2.id,
          weekNumber: 3,
          title: 'Huấn luyện mô hình XGBoost & Random Forest',
          completionPercentage: 75,
          gitCommitUrl: 'https://github.com/dlu-nids/nids-core/commit/i7j8k9l',
          summaryNotes: 'Đánh giá độ chính xác Precision/Recall, F1-score đạt 94.2% trên tập test.',
          submittedById: userC?.id,
          lecturerComment: 'Kết quả khả quan, tiến hành tối ưu hóa độ trễ suy luận.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-11),
        },
        {
          groupId: group2.id,
          weekNumber: 4,
          title: 'Tích hợp cảnh báo thời gian thực và Dashboard',
          completionPercentage: 90,
          gitCommitUrl: 'https://github.com/dlu-nids/nids-core/commit/m0n1o2p',
          summaryNotes: 'Kết nối đường ống phân tích thời gian thực với giao diện giám sát SOC.',
          submittedById: userD?.id,
          lecturerComment: 'Hệ thống hoạt động tốt, chuẩn bị báo cáo toàn văn.',
          isAcknowledged: true,
          feedbackAt: daysFromNow(-4),
        },
      ],
    });

    // Bài nộp các mốc (Submissions) cho Nhóm 2 theo các requirements của đợt DATN
    if (datnRound) {
      const requirements = await prisma.submissionRequirement.findMany({
        where: { roundId: datnRound.id },
        orderBy: { sortOrder: 'asc' },
      });

      for (const req of requirements) {
        let fileName = 'Nop_bai_dinh_ky.pdf';
        let submissionUrl: string | null = null;
        if (req.sortOrder === 1) fileName = 'M03_De_cuong_chi_tiet_KLTN_Nhom02_NIDS.pdf';
        else if (req.sortOrder === 2) fileName = 'Bao_cao_tien_do_1_Nhom02_NIDS.pdf';
        else if (req.sortOrder === 3) fileName = 'Bao_cao_tien_do_2_Nhom02_NIDS.pdf';
        else if (req.sortOrder === 4) fileName = 'Quyen_bao_cao_toan_van_va_slide_Nhom02_NIDS.pdf';
        else if (req.sortOrder === 5) {
          fileName = 'Goi_luu_tru_3_thu_muc_Nhom02.zip';
          submissionUrl = 'https://github.com/dlu-nids/nids-core';
        }

        await prisma.submission.create({
          data: {
            topicId: topic3.id,
            groupId: group2.id,
            requirementId: req.id,
            fileName,
            fileSize: 1048576,
            fileUrl: `https://storage.dlu.edu.vn/submissions/${fileName}`,
            submissionUrl,
            submittedById: studentCProfile.id,
            submittedAt: daysFromNow(-15 + req.sortOrder * 2),
            lecturerFeedback: req.sortOrder <= 3 ? 'Đã duyệt nội dung bài nộp.' : null,
            feedbackAt: req.sortOrder <= 3 ? daysFromNow(-13 + req.sortOrder * 2) : null,
          },
        });
      }
    }

    console.log(`[✓] 11. Nhóm 02 (KLTN MMT): Đã tạo nhóm, nộp đề cương M03, bài nộp 5 mốc, phân công GVPB, nhận xét M04/M05 và xếp Hội đồng`);
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

  // ─────────────────────────────────────────────────────────
  // 13. SEED KHO LƯU TRỮ ĐỒ ÁN (20 ĐỀ TÀI ĐÃ HOÀN THÀNH - ĐỦ LOẠI ĐỒ ÁN, ĐẦY ĐỦ SINH VIÊN VÀ ĐIỂM SỐ)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- BẮT ĐẦU SEED 20 ĐỀ TÀI KHO LƯU TRỮ HOÀN THÀNH (ĐỢT ĐÃ ĐÓNG) ---');

  // A. Tạo 3 Học kỳ đã qua (isActive = false)
  const semPast1 = await prisma.semester.upsert({
    where: { code: 'HK2-2024-2025' },
    create: {
      code: 'HK2-2024-2025',
      name: 'Học kỳ 2 năm học 2024–2025',
      startDate: daysFromNow(-360),
      endDate: daysFromNow(-180),
      gradeSubmissionDeadline: daysFromNow(-190),
      isActive: false,
      mentorWeight: 0.2,
      reviewerWeight: 0.3,
      councilWeight: 0.5,
      progress1Weight: 0.2,
      progress2Weight: 0.3,
      defenseWeight: 0.5,
    },
    update: { isActive: false },
  });

  const semPast2 = await prisma.semester.upsert({
    where: { code: 'HK1-2024-2025' },
    create: {
      code: 'HK1-2024-2025',
      name: 'Học kỳ 1 năm học 2024–2025',
      startDate: daysFromNow(-540),
      endDate: daysFromNow(-370),
      gradeSubmissionDeadline: daysFromNow(-380),
      isActive: false,
      mentorWeight: 0.2,
      reviewerWeight: 0.3,
      councilWeight: 0.5,
      progress1Weight: 0.2,
      progress2Weight: 0.3,
      defenseWeight: 0.5,
    },
    update: { isActive: false },
  });

  const semPast3 = await prisma.semester.upsert({
    where: { code: 'HK2-2023-2024' },
    create: {
      code: 'HK2-2023-2024',
      name: 'Học kỳ 2 năm học 2023–2024',
      startDate: daysFromNow(-720),
      endDate: daysFromNow(-550),
      gradeSubmissionDeadline: daysFromNow(-560),
      isActive: false,
      mentorWeight: 0.2,
      reviewerWeight: 0.3,
      councilWeight: 0.5,
      progress1Weight: 0.2,
      progress2Weight: 0.3,
      defenseWeight: 0.5,
    },
    update: { isActive: false },
  });

  // B. Tạo các đợt đã đóng (phase = FINALIZED) cho các học kỳ trước
  const pastRoundsMap = new Map<string, any>();
  const pastSemConfigs = [
    { sem: semPast1, types: ['DATN', 'DACN', 'DACS'], cohort: '2021' },
    { sem: semPast2, types: ['DATN', 'DACN', 'DACS'], cohort: '2021' },
    { sem: semPast3, types: ['DATN', 'DACN'], cohort: '2020' },
  ];

  for (const cfg of pastSemConfigs) {
    for (const tCode of cfg.types) {
      const pId = projectTypeIdByCode.get(tCode)!;
      const key = `${cfg.sem.code}_${tCode}`;
      const r = await prisma.registrationRound.upsert({
        where: {
          semesterId_projectTypeId: {
            semesterId: cfg.sem.id,
            projectTypeId: pId,
          },
        },
        create: {
          semesterId: cfg.sem.id,
          projectTypeId: pId,
          targetCohort: cfg.cohort,
          phase: 'FINALIZED',
          allocationMode: 'FIRST_COME',
          registrationStart: daysFromNow(-350),
          registrationEnd: daysFromNow(-330),
          officialStartDate: daysFromNow(-320),
          officialEndDate: daysFromNow(-200),
          topicSubmissionStart: daysFromNow(-360),
          topicSubmissionEnd: daysFromNow(-335),
          defenseStartDate: daysFromNow(-210),
          defenseEndDate: daysFromNow(-200),
        },
        update: {
          phase: 'FINALIZED',
        },
      });
      pastRoundsMap.set(key, r);
    }
  }

  // C. Dọn dẹp dữ liệu cũ của các học kỳ đã qua trước khi tạo
  const pastSemesterIds = [semPast1.id, semPast2.id, semPast3.id];
  await prisma.studentGrade.deleteMany({ where: { group: { semesterId: { in: pastSemesterIds } } } });
  await prisma.registrationGroupMember.deleteMany({ where: { semesterId: { in: pastSemesterIds } } });
  await prisma.registrationGroup.deleteMany({ where: { semesterId: { in: pastSemesterIds } } });
  await prisma.topic.deleteMany({ where: { semesterId: { in: pastSemesterIds } } });

  // D. Danh sách sinh viên hoàn thành các khóa trước
  const PAST_STUDENTS_DATA = [
    { code: '2011234', name: 'Trần Văn Hải', class: 'CTK44PM', majorCode: 'CNPM', cohort: '2021' },
    { code: '2011456', name: 'Nguyễn Thị Lan', class: 'CTK44PM', majorCode: 'CNPM', cohort: '2021' },
    { code: '2011789', name: 'Đặng Quốc Tuấn', class: 'CTK44PM', majorCode: 'CNPM', cohort: '2021' },
    { code: '2011890', name: 'Lê Thu Trang', class: 'CTK44PM', majorCode: 'CNPM', cohort: '2021' },
    { code: '2112345', name: 'Võ Minh Trí', class: 'CTK45PM', majorCode: 'CNPM', cohort: '2022' },
    { code: '2112567', name: 'Phạm Đức Nam', class: 'CTK45PM', majorCode: 'CNPM', cohort: '2022' },
    { code: '2213456', name: 'Bùi Hoàng Long', class: 'CTK46PM', majorCode: 'CNPM', cohort: '2023' },
    { code: '2011342', name: 'Huỳnh Nhật Quang', class: 'CTK44PM', majorCode: 'CNPM', cohort: '2021' },
    { code: '2011998', name: 'Hoàng Gia Huy', class: 'CTK44PM', majorCode: 'CNPM', cohort: '2021' },
    { code: '2112458', name: 'Đỗ Quỳnh Anh', class: 'CTK45PM', majorCode: 'CNPM', cohort: '2022' },
    { code: '2213789', name: 'Mai Trọng Nghĩa', class: 'CTK46PM', majorCode: 'CNPM', cohort: '2023' },
    { code: '2012111', name: 'Nguyễn Tuấn Anh', class: 'CTK44MMT', majorCode: 'MMT', cohort: '2021' },
    { code: '2012222', name: 'Phan Thế Anh', class: 'CTK44MMT', majorCode: 'MMT', cohort: '2021' },
    { code: '2113111', name: 'Đặng Thành Công', class: 'CTK45MMT', majorCode: 'MMT', cohort: '2022' },
    { code: '2113222', name: 'Lương Văn Dũng', class: 'CTK45MMT', majorCode: 'MMT', cohort: '2022' },
    { code: '2214111', name: 'Trịnh Quốc Bảo', class: 'CTK46MMT', majorCode: 'MMT', cohort: '2023' },
    { code: '2012333', name: 'Vũ Hoàng Lâm', class: 'CTK44MMT', majorCode: 'MMT', cohort: '2021' },
    { code: '2012444', name: 'Cao Đình Khang', class: 'CTK44MMT', majorCode: 'MMT', cohort: '2021' },
    { code: '2113333', name: 'Hà Tiến Đạt', class: 'CTK45MMT', majorCode: 'MMT', cohort: '2022' },
    { code: '1911555', name: 'Nguyễn Quang Sáng', class: 'CTK43PM', majorCode: 'CNPM', cohort: '2020' },
    { code: '1912666', name: 'Trương Quốc Toàn', class: 'CTK43MMT', majorCode: 'MMT', cohort: '2020' },
    { code: '2011666', name: 'Dương Mỹ Linh', class: 'CTK44PM', majorCode: 'CNPM', cohort: '2021' },
    { code: '2112888', name: 'Tạ Minh Khang', class: 'CTK45PM', majorCode: 'CNPM', cohort: '2022' },
    { code: '2012777', name: 'Lâm Hải Đăng', class: 'CTK44MMT', majorCode: 'MMT', cohort: '2021' },
  ];

  const pastStudentProfiles: any[] = [];
  for (const st of PAST_STUDENTS_DATA) {
    const email = `${st.code}@dlu.edu.vn`;
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: hashedPassword,
        role: 'STUDENT',
        mustChangePassword: false,
      },
      update: {},
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        studentCode: st.code,
        fullName: st.name,
        class: st.class,
        cohort: st.cohort,
        majorId: majorIdByCode.get(st.majorCode),
      },
      update: {
        fullName: st.name,
        class: st.class,
        cohort: st.cohort,
      },
    });
    pastStudentProfiles.push(profile);
  }

  // E. 20 Đề tài lưu trữ hoàn chỉnh (10 CNPM, 10 MMT, đủ KLTN, ĐACN, ĐACS)
  const ARCHIVED_TOPICS = [
    // 1. KLTN - CNPM - HK2 24-25
    {
      title: 'Xây dựng Hệ thống Quản trị Học tập Trực tuyến (LMS) Hỗ trợ Đào tạo Theo Tín chỉ cho Đại học Đà Lạt',
      titleEn: 'Development of Credit-based Online Learning Management System (LMS) for Dalat University',
      description: 'Hệ thống hỗ trợ quản lý học tập trực tuyến tích hợp thời khóa biểu tín chỉ, nộp bài tập tự động chấm mã nguồn, và diễn đàn thảo luận thời gian thực cho sinh viên.\n\nGiải pháp áp dụng kiến trúc Microservices giúp phân tải hệ thống khi có lượng lớn sinh viên đồng thời truy cập trong kỳ thi.',
      objectives: '- Phân tích và xây dựng hệ thống LMS theo chuẩn tín chỉ Đại học Đà Lạt.\n- Triển khai máy chủ đánh giá mã nguồn tự động an toàn trong Sandbox Docker.\n- Tối ưu hóa hiệu năng chịu tải trên 1000 người dùng trực tuyến.',
      expectedOutcomes: '- Cổng thông tin web LMS hoàn chỉnh gồm phân hệ sinh viên, giảng viên và quản trị viên.\n- Hệ thống tự động chấm bài tập lập trình (Auto-grader) cho môn C/C++, Java và Python.\n- Báo cáo kết quả thử nghiệm hiệu năng và độ ổn định hệ thống.',
      techStack: 'Next.js 14, NestJS, PostgreSQL, Redis, Docker, RabbitMQ',
      majorCode: 'CNPM',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DATN',
      lecturerId: pbProfile.id,
      studentIdx: 0,
      grade: { p1: 8.5, p2: 9.0, def: 8.8, finalNum: 8.8, finalLetter: 'A' },
    },
    // 2. KLTN - CNPM - HK2 24-25
    {
      title: 'Ứng dụng Mô hình Thị giác Máy tính YOLOv8 trong Giám sát An toàn Lao động tại Công trường Xây dựng',
      titleEn: 'Application of YOLOv8 Computer Vision in Construction Site Safety Monitoring',
      description: 'Nghiên cứu ứng dụng các giải thuật học sâu phát hiện vật thể thời gian thực để nhận diện công nhân không đội mũ bảo hiểm hoặc không mặc áo phản quang tại công trường.\n\nHệ thống phát tín hiệu cảnh báo loa và gửi thông báo tức thì đến ban chỉ huy công trường.',
      objectives: '- Xây dựng tập dữ liệu hơn 8.000 hình ảnh trang thiết bị bảo hộ lao động thực tế tại Đà Lạt.\n- Huấn luyện mô hình YOLOv8 đạt độ chính xác phát hiện mAP@0.5 trên 92%.\n- Đóng gói ứng dụng giám sát video thời gian thực từ các camera IP RTSP.',
      expectedOutcomes: '- Mô hình học sâu nhận diện vi phạm an toàn lao động với độ trễ dưới 50ms.\n- Dashboard quản lý các sự kiện vi phạm an toàn và xuất báo cáo hàng tuần.\n- Luận văn tốt nghiệp và video demo hoạt động thực tế.',
      techStack: 'Python, PyTorch, YOLOv8, OpenCV, FastAPI, React, Docker',
      majorCode: 'CNPM',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DATN',
      lecturerId: lnProfile.id,
      studentIdx: 1,
      grade: { p1: 9.0, p2: 9.5, def: 9.2, finalNum: 9.3, finalLetter: 'A+' },
    },
    // 3. KLTN - CNPM - HK2 24-25
    {
      title: 'Nền tảng Hỗ trợ Khởi nghiệp Đổi mới Sáng tạo và Kết nối Vốn Đầu tư Thiên thần (StartupHub)',
      titleEn: 'StartupHub - Innovation Support and Angel Investor Matching Platform',
      description: 'Cung cấp không gian số kết nối các dự án khởi nghiệp tiềm năng của thanh niên và sinh viên với các nhà đầu tư mạo hiểm, quỹ hỗ trợ phát triển.\n\nHệ thống tích hợp quy trình pitching trực tuyến, thẩm định dự án (Due Diligence) và ký cam kết bảo mật NDA điện tử.',
      objectives: '- Xây dựng thuật toán matching dự án dựa trên lĩnh vực, giai đoạn gọi vốn và khẩu vị đầu tư.\n- Bảo mật dữ liệu tài chính của startup bằng mã hóa và phân quyền truy cập chặt chẽ.\n- Tích hợp phòng họp trực tuyến và chia sẻ tài liệu thuyết trình bảo mật.',
      expectedOutcomes: '- Nền tảng web StartupHub tương thích hoàn hảo mọi thiết bị di động.\n- Module phân tích chỉ số tài chính (Burn rate, Runway, CAC/LTV) trực quan.\n- Tài liệu đặc tả kiến trúc hệ thống và hướng dẫn sử dụng.',
      techStack: 'React, Node.js, GraphQL, PostgreSQL, TailwindCSS, WebRTC',
      majorCode: 'CNPM',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DATN',
      lecturerId: abProfile.id,
      studentIdx: 2,
      grade: { p1: 8.5, p2: 8.8, def: 8.6, finalNum: 8.6, finalLetter: 'A' },
    },
    // 4. ĐACN - CNPM - HK2 24-25
    {
      title: 'Ứng dụng Quản lý Tour Du lịch Trải nghiệm Sinh thái và Đặt Phòng Homestay Đà Lạt',
      titleEn: 'Mobile Application for Eco-tourism Experience Tour and Homestay Booking in Dalat',
      description: 'Ứng dụng di động giúp du khách tìm kiếm và đặt các tour trải nghiệm nông nghiệp công nghệ cao, hái dâu tây, săn mây và đặt phòng homestay bản địa.\n\nCho phép thanh toán qua cổng VNPay/MoMo và xem đánh giá chân thực từ cộng đồng du lịch.',
      objectives: '- Thiết kế giao diện di động thân thiện, tối ưu trải nghiệm khám phá địa điểm du lịch.\n- Xây dựng hệ thống quản lý phòng trống (Availability Calendar) đồng bộ tức thì.\n- Tích hợp bản đồ dẫn đường tương tác đến các địa điểm ngoại ô Đà Lạt.',
      expectedOutcomes: '- Ứng dụng di động chạy tốt trên Android và iOS.\n- Hệ thống Backend API RESTful quản lý đặt chỗ và thanh toán.\n- Báo cáo kiểm thử người dùng thực tế với 30 tình nguyện viên.',
      techStack: 'Flutter, Dart, Node.js, Express, MongoDB, VNPay SDK',
      majorCode: 'CNPM',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DACN',
      lecturerId: pbProfile.id,
      studentIdx: 4,
      grade: { p1: 8.0, p2: 8.5, def: 8.5, finalNum: 8.4, finalLetter: 'B+' },
    },
    // 5. ĐACN - CNPM - HK2 24-25
    {
      title: 'Hệ thống Quản lý và Tự động Hóa Quy trình Đăng ký Đề tài Nghiên cứu Khoa học Sinh viên',
      titleEn: 'Automated Student Scientific Research Project Management System',
      description: 'Chuẩn hóa quy trình từ đề xuất đề tài NCKH, xét duyệt hội đồng khoa học cơ sở, theo dõi tiến độ giải ngân kinh phí và nghiệm thu đề tài cấp trường.\n\nGiúp giảm thiểu 80% hồ sơ giấy tờ và hạn chế thất lạc biên bản đánh giá.',
      objectives: '- Số hóa quy trình xét duyệt đề tài NCKH theo quy định hiện hành của Bộ GD&ĐT.\n- Xây dựng luồng phê duyệt đa cấp (Giảng viên hướng dẫn -> Bộ môn -> Phòng QLKH).\n- Tự động sinh biên bản nghiệm thu và chứng nhận NCKH dạng PDF.',
      expectedOutcomes: '- Website ứng dụng Next.js giao diện chuyên nghiệp chuẩn nhận diện thương hiệu Nhà trường.\n- Module sinh file PDF biên bản tự động bằng thư viện Puppeteer/React-PDF.\n- Sổ tay hướng dẫn quản trị viên và sinh viên thực hiện.',
      techStack: 'Next.js 14, TypeScript, Prisma, PostgreSQL, TailwindCSS',
      majorCode: 'CNPM',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DACN',
      lecturerId: abProfile.id,
      studentIdx: 5,
      grade: { p1: 9.0, p2: 9.0, def: 9.0, finalNum: 9.0, finalLetter: 'A' },
    },
    // 6. ĐACS - CNPM - HK2 24-25
    {
      title: 'Xây dựng Website Bán Nông sản Sạch và Hoa Tươi Đà Lạt Ứng dụng Kiến trúc Hướng Dịch vụ',
      titleEn: 'Clean Agricultural Products and Fresh Flowers E-commerce Website for Dalat',
      description: 'Website thương mại điện tử chuyên cung cấp rau củ quả chuẩn VietGAP và hoa tươi cắt cành từ các nhà vườn Đà Lạt đến người tiêu dùng cả nước.\n\nHỗ trợ giỏ hàng, đặt hàng nhanh, chọn ngày giao hoa tươi hẹn giờ và tra cứu đơn hàng.',
      objectives: '- Phân tích và thiết kế cơ sở dữ liệu quan hệ cho sàn thương mại điện tử nông sản.\n- Áp dụng mô hình MVC và các nguyên lý lập trình hướng đối tượng (OOP).\n- Đảm bảo tính bảo mật trong lưu trữ mật khẩu người dùng và giỏ hàng.',
      expectedOutcomes: '- Website bán hàng chạy mượt mà trên môi trường Web Responsive.\n- Trang quản trị (Admin Dashboard) quản lý sản phẩm, đơn hàng và doanh thu.\n- Báo cáo đồ án cơ sở đạt loại Khá giỏi.',
      techStack: 'React, Express.js, MySQL, TailwindCSS, Axios',
      majorCode: 'CNPM',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DACS',
      lecturerId: pbProfile.id,
      studentIdx: 6,
      grade: { p1: 8.0, p2: 8.2, def: 8.3, finalNum: 8.2, finalLetter: 'B+' },
    },
    // 7. KLTN - CNPM - HK1 24-25
    {
      title: 'Hệ thống Phân tích Sắc thái Cảm xúc Đánh giá Khách hàng trên Sàn Thương mại Điện tử Shopee',
      titleEn: 'Customer Review Sentiment Analysis System on Shopee E-Commerce Platform Using PhoBERT',
      description: 'Xây dựng hệ thống tự động thu thập và phân loại đánh giá sản phẩm thành các nhóm cảm xúc Tích cực / Tiêu cực / Trung tính nhằm hỗ trợ nhà bán hàng cải thiện chất lượng dịch vụ.\n\nỨng dụng mô hình ngôn ngữ lớn tiếng Việt PhoBERT đã được tinh chỉnh trên tập dữ liệu thương mại điện tử.',
      objectives: '- Thu thập và gán nhãn tập dữ liệu hơn 50.000 đánh giá sản phẩm Shopee thực tế.\n- Huấn luyện mô hình PhoBERT với kỹ thuật Data Augmentation đạt F1-score trên 91%.\n- Xây dựng Dashboard trực quan hóa xu hướng hài lòng của khách hàng theo thời gian.',
      expectedOutcomes: '- Đường ống thu thập dữ liệu (Scraper) hoạt động ổn định và an toàn.\n- API phân loại cảm xúc thời gian thực cho các hệ thống CRM bên thứ ba.\n- Luận văn tốt nghiệp đạt kết quả xuất sắc.',
      techStack: 'Python, PhoBERT, PyTorch, FastAPI, Next.js, Docker, MongoDB',
      majorCode: 'CNPM',
      semKey: semPast2,
      roundKey: 'HK1-2024-2025_DATN',
      lecturerId: lnProfile.id,
      studentIdx: 7,
      grade: { p1: 9.0, p2: 9.2, def: 9.1, finalNum: 9.1, finalLetter: 'A+' },
    },
    // 8. KLTN - CNPM - HK1 24-25
    {
      title: 'Nền tảng Đặt xe Công nghệ và Tối ưu Tuyến đường Đón trả Khách cho Xe Điện Du lịch Đà Lạt',
      titleEn: 'Smart Ride-Hailing and Route Optimization Platform for Dalat Tourist Electric Shuttles',
      description: 'Giải pháp điều phối xe điện thông minh quanh khu vực Hồ Xuân Hương và các điểm tham quan trung tâm Đà Lạt.\n\nỨng dụng thuật toán tối ưu hóa định tuyến phương tiện (VRP) giúp tiết kiệm điện năng tiêu thụ và rút ngắn thời gian chờ của du khách.',
      objectives: '- Xây dựng thuật toán gom chuyến và điều phối xe điện linh hoạt theo thời gian thực.\n- Tích hợp bản đồ số OpenStreetMap và hệ thống GPS định vị phương tiện.\n- Phát triển ứng dụng tài xế và ứng dụng hành khách trên thiết bị di động.',
      expectedOutcomes: '- Bộ ứng dụng di động tài xế và hành khách hoàn chỉnh.\n- Máy chủ trung tâm điều hành trực quan hóa vị trí đội xe theo thời gian thực.\n- Báo cáo phân tích hiệu quả tiết kiệm 20% quãng đường di chuyển rỗng.',
      techStack: 'React Native, NestJS, Go, PostgreSQL, PostGIS, WebSocket, Docker',
      majorCode: 'CNPM',
      semKey: semPast2,
      roundKey: 'HK1-2024-2025_DATN',
      lecturerId: abProfile.id,
      studentIdx: 8,
      grade: { p1: 8.5, p2: 8.8, def: 8.6, finalNum: 8.6, finalLetter: 'A' },
    },
    // 9. ĐACN - CNPM - HK1 24-25
    {
      title: 'Ứng dụng Sổ tay Sức khỏe Điện tử và Đặt lịch Tiêm chủng cho Trẻ em',
      titleEn: 'Digital Child Health Record and Vaccination Scheduling Mobile Application',
      description: 'Sổ tiêm chủng điện tử giúp phụ huynh quản lý lịch tiêm phòng cho con từ lúc sơ sinh, nhắc lịch tiêm tự động và theo dõi chỉ số tăng trưởng thể chất (chiều cao, cân nặng, BMI) theo chuẩn WHO.',
      objectives: '- Xây dựng phác đồ tiêm chủng chuẩn quốc gia và thuật toán tính toán ngày tiêm kế tiếp.\n- Thiết kế giao diện sinh động, dễ sử dụng cho các bậc phụ huynh trẻ.\n- Đảm bảo an toàn bảo mật hồ sơ sức khỏe trẻ em.',
      expectedOutcomes: '- Ứng dụng di động Flutter hỗ trợ chế độ Offline và đồng bộ đám mây.\n- Báo cáo thử nghiệm tại Trung tâm Y tế Dự phòng với đánh giá tích cực.',
      techStack: 'Flutter, Firebase, Node.js, Express, MongoDB',
      majorCode: 'CNPM',
      semKey: semPast2,
      roundKey: 'HK1-2024-2025_DACN',
      lecturerId: pbProfile.id,
      studentIdx: 9,
      grade: { p1: 9.0, p2: 8.8, def: 8.9, finalNum: 8.9, finalLetter: 'A' },
    },
    // 10. ĐACS - CNPM - HK1 24-25
    {
      title: 'Xây dựng Phần mềm Quản lý Phòng khám Nha khoa Tư nhân',
      titleEn: 'Dental Clinic Management Desktop Software with Appointment Scheduling',
      description: 'Phần mềm quản lý bệnh nhân nha khoa, sơ đồ răng trực quan, lịch hẹn khám, kê đơn thuốc và quản lý thu chi tài chính của phòng khám.',
      objectives: '- Phân tích nghiệp vụ quản lý hồ sơ nha khoa chuyên khoa.\n- Xây dựng giao diện tương tác sơ đồ 32 răng trực quan.\n- Báo cáo doanh thu và quản lý kho vật tư tiêu hao.',
      expectedOutcomes: '- Phần mềm cài đặt trên máy tính Windows hoạt động ổn định.\n- Tài liệu đặc tả cơ sở dữ liệu và bản vẽ UML.',
      techStack: 'C#, .NET Core, SQL Server, WPF, MaterialDesignInXAML',
      majorCode: 'CNPM',
      semKey: semPast2,
      roundKey: 'HK1-2024-2025_DACS',
      lecturerId: abProfile.id,
      studentIdx: 10,
      grade: { p1: 8.0, p2: 8.0, def: 8.0, finalNum: 8.0, finalLetter: 'B+' },
    },
    // 11. KLTN - MMT - HK2 24-25
    {
      title: 'Nghiên cứu và Xây dựng Hệ thống Phòng thủ Mạng Doanh nghiệp Dựa trên Zero Trust Architecture',
      titleEn: 'Research and Implementation of Enterprise Network Defense Based on Zero Trust Architecture',
      description: 'Nghiên cứu và triển khai mô hình kiến trúc không tin cậy (Zero Trust - Never Trust, Always Verify) cho mạng doanh nghiệp phân tán.\n\nHệ thống kết hợp kiểm soát truy cập theo ngữ cảnh, xác thực đa yếu tố (MFA) và phân đoạn vi mô (Micro-segmentation) bằng WireGuard VPN.',
      objectives: '- Thiết kế kiến trúc phòng thủ mạng Zero Trust tuân thủ chuẩn NIST SP 800-207.\n- Triển khai giải pháp phân đoạn mạng động và xác thực danh tính tập trung Keycloak.\n- Đánh giá khả năng ngăn chặn các đòn tấn công di chuyển ngang (Lateral Movement).',
      expectedOutcomes: '- Hạ tầng mạng phòng thủ Zero Trust hoàn chỉnh trên môi trường giả lập doanh nghiệp.\n- Bộ chính sách truy cập phân quyền chi tiết cho từng vai trò nhân viên.\n- Báo cáo kiểm thử thâm nhập an toàn thông tin.',
      techStack: 'WireGuard, Keycloak, FreeIPA, OPNsense, Linux, Ansible, Docker',
      majorCode: 'MMT',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DATN',
      lecturerId: cdProfile.id,
      studentIdx: 11,
      grade: { p1: 9.2, p2: 9.4, def: 9.3, finalNum: 9.3, finalLetter: 'A+' },
    },
    // 12. KLTN - MMT - HK2 24-25
    {
      title: 'Phát hiện và Ngăn chặn Tấn công Botnet IoT Dựa trên Phân tích Lưu lượng Mạng NetFlow',
      titleEn: 'Detection and Mitigation of IoT Botnet Attacks Using NetFlow Traffic Analysis and Machine Learning',
      description: 'Các thiết bị thông minh IoT gia đình thường có cấu hình bảo mật yếu, dễ bị tin tặc biến thành mạng máy tính ma (Botnet Mirai, Mozi) phục vụ các cuộc tấn công từ chối dịch vụ phân tán (DDoS).\n\nĐề tài xây dựng giải pháp phân tích mẫu lưu lượng NetFlow/IPFIX bằng học máy để phát hiện sớm các hành vi bất thường và chặn kết nối điều khiển C&C Server.',
      objectives: '- Thu thập dữ liệu NetFlow lưu lượng tấn công IoT trong phòng thí nghiệm mạng.\n- Huấn luyện mô hình XGBoost đạt độ nhạy phát hiện trên 95% trong vòng 10 giây đầu tiên.\n- Tự động đẩy rule khóa cổng trên thiết bị tường lửa biên khi phát hiện botnet.',
      expectedOutcomes: '- Module phân tích lưu lượng thời gian thực xử lý được 10.000 flows/giây.\n- Bảng điều khiển giám sát mối đe dọa IoT trực quan trên Kibana.\n- Luận văn tốt nghiệp được hội đồng đánh giá cao.',
      techStack: 'Python, Suricata, XGBoost, Scikit-learn, Elasticsearch, Kafka, Bash',
      majorCode: 'MMT',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DATN',
      lecturerId: cdProfile.id,
      studentIdx: 12,
      grade: { p1: 8.5, p2: 8.8, def: 8.7, finalNum: 8.7, finalLetter: 'A' },
    },
    // 13. ĐACN - MMT - HK2 24-25
    {
      title: 'Thiết kế và Triển khai Hệ thống Mạng Không dây Doanh nghiệp (Enterprise WLAN) với Xác thực 802.1X',
      titleEn: 'Design and Implementation of Enterprise Wireless LAN with 802.1X and FreeRADIUS',
      description: 'Thiết kế hạ tầng mạng WiFi an toàn cho khuôn viên tòa nhà nhiều tầng, ứng dụng chuẩn xác thực EAP-TLS/PEAP kết hợp máy chủ FreeRADIUS và thư mục người dùng Active Directory.',
      objectives: '- Tính toán vùng phủ sóng RF và tránh can nhiễu kênh truyền 2.4GHz/5GHz.\n- Triển khai chuyển vùng nhanh (Fast BSS Transition 802.11r) không gián đoạn cuộc gọi.\n- Phân quyền băng thông và vùng truy cập theo phòng ban.',
      expectedOutcomes: '- Bản vẽ thiết kế mạng WiFi doanh nghiệp chi tiết và kịch bản cấu hình phần cứng.\n- Hệ thống xác thực 802.1X hoạt động trơn tru trên thiết bị di động và laptop.',
      techStack: 'Cisco Packet Tracer, FreeRADIUS, EAP-TLS, MikroTik RouterOS, Active Directory',
      majorCode: 'MMT',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DACN',
      lecturerId: cdProfile.id,
      studentIdx: 13,
      grade: { p1: 8.5, p2: 8.5, def: 8.5, finalNum: 8.5, finalLetter: 'A' },
    },
    // 14. ĐACN - MMT - HK2 24-25
    {
      title: 'Hệ thống Giám sát Cảnh báo Xâm nhập và Rò rỉ Dữ liệu Nhạy cảm (DLP) trong Mạng Nội bộ',
      titleEn: 'Intrusion Monitoring and Data Loss Prevention (DLP) System in Enterprise Local Network',
      description: 'Giám sát lưu lượng mạng nội bộ nhằm phát hiện hành vi gửi các tập tin tài liệu mật hoặc thông tin thẻ tín dụng/CCCD ra bên ngoài qua email và giao thức web không mã hóa.',
      objectives: '- Cấu hình Snort 3 và OpenDLP để quét nội dung các gói tin truyền qua mạng.\n- Phát hiện việc truyền tải các file tài liệu có chứa từ khóa nhạy cảm.\n- Gửi cảnh báo bảo mật thời gian thực đến quản trị viên qua Telegram Bot.',
      expectedOutcomes: '- Hệ thống DLP hoạt động ổn định trên máy chủ Gateway mạng nội bộ.\n- Báo cáo phân tích các lỗ hổng rò rỉ dữ liệu phổ biến.',
      techStack: 'Snort 3, OpenDLP, Graylog, Python, Docker, Telegram Bot API',
      majorCode: 'MMT',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DACN',
      lecturerId: cdProfile.id,
      studentIdx: 14,
      grade: { p1: 8.0, p2: 8.2, def: 8.1, finalNum: 8.1, finalLetter: 'B+' },
    },
    // 15. ĐACS - MMT - HK2 24-25
    {
      title: 'Thiết kế Mô hình Mạng LAN Đa Chi nhánh Cho Trường Đại học Đà Lạt Ứng dụng Kỹ thuật VLAN và OSPF',
      titleEn: 'Multi-branch Campus LAN Network Design for Dalat University Using VLANs and OSPF',
      description: 'Thiết kế sơ đồ mạng hoàn chỉnh kết nối các khu giảng đường A, B, C và khu nhà hiệu bộ Đại học Đà Lạt, chia các phân đoạn mạng ảo VLAN và định tuyến động OSPF.',
      objectives: '- Phân chia dải địa chỉ IP khoa học theo kỹ thuật VLSM.\n- Cấu hình Trunking 802.1Q, Inter-VLAN Routing và định tuyến OSPF vùng đơn.\n- Triển khai danh sách kiểm soát truy cập (ACL) giới hạn sinh viên truy cập máy chủ tài chính.',
      expectedOutcomes: '- File đồ án mô phỏng mạng hoạt động đầy đủ trên Cisco Packet Tracer/GNS3.\n- Báo cáo thuyết minh thiết kế đạt loại Giỏi.',
      techStack: 'GNS3, Cisco Packet Tracer, Wireshark, Linux DHCP/DNS, IOS',
      majorCode: 'MMT',
      semKey: semPast1,
      roundKey: 'HK2-2024-2025_DACS',
      lecturerId: cdProfile.id,
      studentIdx: 15,
      grade: { p1: 8.2, p2: 8.4, def: 8.3, finalNum: 8.3, finalLetter: 'B+' },
    },
    // 16. KLTN - MMT - HK1 24-25
    {
      title: 'Xây dựng Hệ thống Giám sát Hạ tầng Máy chủ Phân tán Ứng dụng Prometheus, Grafana và Ansible',
      titleEn: 'Distributed Infrastructure Monitoring System Using Prometheus, Grafana, and Ansible',
      description: 'Giải pháp tự động hóa triển khai và giám sát tập trung tình trạng tải CPU, RAM, Disk I/O và băng thông mạng của hàng trăm máy chủ trong trung tâm dữ liệu.',
      objectives: '- Tự động hóa cài đặt các exporter giám sát lên máy chủ Linux/Windows bằng Ansible Playbook.\n- Cấu hình Alertmanager gửi cảnh báo sự cố máy chủ qua kênh Slack/Telegram.\n- Xây dựng bảng điều khiển Grafana tùy biến theo dõi toàn diện hạ tầng.',
      expectedOutcomes: '- Hệ thống giám sát vận hành trơn tru trên cụm 20 máy chủ ảo.\n- Thời gian phản hồi cảnh báo sự cố giảm xuống dưới 30 giây.',
      techStack: 'Ansible, Prometheus, Grafana, Node Exporter, Docker Swarm, Python',
      majorCode: 'MMT',
      semKey: semPast2,
      roundKey: 'HK1-2024-2025_DATN',
      lecturerId: cdProfile.id,
      studentIdx: 16,
      grade: { p1: 9.0, p2: 9.0, def: 9.0, finalNum: 9.0, finalLetter: 'A' },
    },
    // 17. KLTN - MMT - HK1 24-25
    {
      title: 'Nghiên cứu Kỹ thuật Tấn công và Biện pháp Phòng thủ Mã độc Tống tiền (Ransomware) trên Windows Active Directory',
      titleEn: 'Analysis of Ransomware Attacks and Defense Strategies on Windows Active Directory Networks',
      description: 'Mô phỏng các chuỗi tấn công mã độc tống tiền lợi dụng lỗ hổng cấu hình Active Directory (Kerberoasting, DCSync) và xây dựng hệ thống phòng ngự nhiều lớp (Defense-in-Depth).',
      objectives: '- Thiết lập môi trường lab giả lập miền Active Directory có máy trạm và máy chủ thành viên.\n- Triển khai công cụ EDR Wazuh và cấu hình Sysmon bắt vết hành vi mã hóa tập tin bất thường.\n- Xây dựng quy trình sao lưu dữ liệu bất biến (Immutable Backup) chống ransomware.',
      expectedOutcomes: '- Báo cáo chi tiết về kỹ thuật tấn công và bản đồ ma trận MITRE ATT&CK.\n- Bộ quy tắc Sysmon/Wazuh giúp phát hiện 100% các biến thể ransomware thử nghiệm.',
      techStack: 'Windows Server 2022, Active Directory, Wazuh EDR, Sysmon, PowerShell, Proxmox',
      majorCode: 'MMT',
      semKey: semPast2,
      roundKey: 'HK1-2024-2025_DATN',
      lecturerId: cdProfile.id,
      studentIdx: 17,
      grade: { p1: 8.8, p2: 8.8, def: 8.8, finalNum: 8.8, finalLetter: 'A' },
    },
    // 18. ĐACN - MMT - HK1 24-25
    {
      title: 'Xây dựng Hệ thống Tường lửa Ứng dụng Web (WAF) Mã nguồn mở Bảo vệ Máy chủ Dịch vụ Web',
      titleEn: 'Open Source Web Application Firewall (WAF) Implementation Protecting Web Services',
      description: 'Triển khai tường lửa ứng dụng ModSecurity kết hợp bộ quy tắc OWASP Core Rule Set đứng trước hệ thống Web Server để ngăn chặn các cuộc tấn công SQL Injection, XSS và RCE.',
      objectives: '- Tích hợp ModSecurity vào Nginx Reverse Proxy làm cổng vào cho toàn bộ hệ thống web.\n- Tối ưu hóa bộ rule tránh hiện tượng chặn nhầm các truy vấn hợp lệ của người dùng (False Positive).\n- Kết hợp Fail2ban tự động khóa địa chỉ IP có hành vi quét cổng hoặc dò tìm lỗ hổng.',
      expectedOutcomes: '- Máy chủ WAF bảo vệ thành công các trang web thử nghiệm trước các công cụ kiểm thử như SQLmap và Nikto.\n- Báo cáo thống kê lưu lượng và tỷ lệ phát hiện tấn công đạt 98%.',
      techStack: 'ModSecurity, Nginx, OWASP Core Rule Set, Fail2ban, Linux, Docker',
      majorCode: 'MMT',
      semKey: semPast2,
      roundKey: 'HK1-2024-2025_DACN',
      lecturerId: cdProfile.id,
      studentIdx: 18,
      grade: { p1: 8.5, p2: 8.6, def: 8.6, finalNum: 8.6, finalLetter: 'A' },
    },
    // 19. KLTN - CNPM - HK2 23-24
    {
      title: 'Nền tảng Đấu giá Trực tuyến Thời gian thực Ứng dụng WebSocket và Kiến trúc Hướng Sự kiện (Event-Driven)',
      titleEn: 'Real-time Online Bidding Platform Using WebSocket and Event-Driven Architecture',
      description: 'Nền tảng đấu giá tài sản và vật phẩm sưu tầm với cơ chế đẩy giá thầu theo mili-giây, xử lý tranh chấp phiên đấu giá đồng thời và thanh toán tự động khi kết thúc phiên.',
      objectives: '- Thiết kế cơ chế khóa phân tán (Distributed Lock với Redis) để tránh xung đột bước giá.\n- Duy trì kết nối WebSocket ổn định cho hàng nghìn người cùng xem một phiên đấu giá.\n- Tự động hoàn tiền cọc cho những người trả giá không thành công.',
      expectedOutcomes: '- Website đấu giá trực tuyến hoạt động trơn tru với độ trễ cập nhật giá thầu dưới 100ms.\n- Báo cáo kiểm thử tải với công cụ k6 đạt 500 yêu cầu trả giá mỗi giây.',
      techStack: 'Next.js, Node.js, Redis Pub/Sub, Kafka, PostgreSQL, Docker',
      majorCode: 'CNPM',
      semKey: semPast3,
      roundKey: 'HK2-2023-2024_DATN',
      lecturerId: pbProfile.id,
      studentIdx: 19,
      grade: { p1: 8.5, p2: 8.8, def: 8.7, finalNum: 8.7, finalLetter: 'A' },
    },
    // 20. KLTN - MMT - HK2 23-24
    {
      title: 'Triển khai Mạng Riêng Ảo Đa Điểm (DMVPN) và Tối ưu Hóa Định tuyến BGP Cho Doanh nghiệp Nhiều Chi nhánh',
      titleEn: 'DMVPN Implementation and BGP Routing Optimization for Multi-Branch Enterprises',
      description: 'Giải pháp kết nối mạng bảo mật diện rộng cho tập đoàn có trụ sở chính tại TP.HCM và hàng chục chi nhánh tại các tỉnh Tây Nguyên.\n\nMô hình DMVPN Phase 3 cho phép các chi nhánh thiết lập đường hầm VPN trực tiếp với nhau (Spoke-to-Spoke) mà không cần đi vòng qua trụ sở (Hub), giảm tối đa độ trễ mạng.',
      objectives: '- Thiết kế sơ đồ mạng DMVPN Dual-Hub Dual-DMVPN tăng tính sẵn sàng cao (High Availability).\n- Cấu hình định tuyến BGP và tối ưu hóa thời gian hội tụ mạng khi xảy ra sự cố đứt cáp.\n- Đo lường hiệu năng truyền tải dữ liệu và độ trễ gói tin VoIP qua đường hầm mã hóa IPsec.',
      expectedOutcomes: '- Mô hình mạng DMVPN hoàn chỉnh chạy thực nghiệm ổn định trên thiết bị Cisco IOS.\n- Luận văn tốt nghiệp được đánh giá cao về tính khả thi ứng dụng thực tiễn.',
      techStack: 'Cisco Router IOS, IPsec, GRE, NHRP, BGP, Wireshark, GNS3',
      majorCode: 'MMT',
      semKey: semPast3,
      roundKey: 'HK2-2023-2024_DATN',
      lecturerId: cdProfile.id,
      studentIdx: 20,
      grade: { p1: 8.8, p2: 9.0, def: 8.9, finalNum: 8.9, finalLetter: 'A' },
    },
  ];

  for (let i = 0; i < ARCHIVED_TOPICS.length; i++) {
    const item = ARCHIVED_TOPICS[i];
    const round = pastRoundsMap.get(item.roundKey);
    if (!round) continue;

    const topic = await prisma.topic.create({
      data: {
        title: item.title,
        titleEn: item.titleEn,
        description: item.description,
        objectives: item.objectives,
        expectedOutcomes: item.expectedOutcomes,
        techStack: item.techStack,
        maxStudents: 2,
        status: 'COMPLETED',
        semesterId: item.semKey.id,
        roundId: round.id,
        lecturerId: item.lecturerId,
        majorId: majorIdByCode.get(item.majorCode)!,
      },
    });

    const studentProfile = pastStudentProfiles[item.studentIdx];
    if (studentProfile) {
      const group = await prisma.registrationGroup.create({
        data: {
          topicId: topic.id,
          semesterId: item.semKey.id,
          leaderId: studentProfile.id,
          name: `Nhóm ${String(i + 1).padStart(2, '0')} - ${round.targetCohort || 'Lưu trữ'}`,
          status: 'APPROVED',
          openForJoin: false,
          declaredSize: 1,
          joinCode: `DLU-ARCHIVE-${i + 1}`,
        },
      });

      await prisma.registrationGroupMember.create({
        data: {
          groupId: group.id,
          semesterId: item.semKey.id,
          studentId: studentProfile.id,
          status: 'ACCEPTED',
          joinSource: 'SELF',
          mentorGrade: item.grade.p1,
          mentorComment: 'Hoàn thành xuất sắc đồ án, đạt chất lượng nghiệm thu lưu trữ.',
        },
      });

      await prisma.studentGrade.create({
        data: {
          groupId: group.id,
          studentId: studentProfile.id,
          progress1Grade: item.grade.p1,
          progress2Grade: item.grade.p2,
          defenseGrade: item.grade.def,
          finalGradeNum: item.grade.finalNum,
          finalGradeLetter: item.grade.finalLetter,
          isLocked: true,
          note: 'Đã hoàn thành bảo vệ trước Hội đồng chấm điểm và nộp lưu trữ hồ sơ.',
        },
      });
    }
  }

  console.log(`[✓] 13. Kho lưu trữ: Đã tạo 20 đề tài hoàn chỉnh (status COMPLETED, đợt FINALIZED) cho các học kỳ trước kèm sinh viên và điểm số`);

  console.log('\n============================================================');
  console.log('🎉 SEED DỮ LIỆU ĐẦY ĐỦ CHO TẤT CẢ CÁC BẢNG THÀNH CÔNG RỰC RỠ!');
  console.log('============================================================');
  console.log(`MẬT KHẨU CHUNG CHO TẤT CẢ TÀI KHOẢN: ${DEFAULT_PASSWORD}\n`);
  console.log('Danh sách tài khoản test:');
  console.log('  1. Giáo vụ Khoa (Admin) : gvgvk@dlu.edu.vn');
  console.log('  2. TTBM Phần mềm        : gvab@dlu.edu.vn');
  console.log('  3. TTBM Mạng máy tính   : gvcd@dlu.edu.vn');
  console.log('  4. Giảng viên HD & PB   : gvpb@dlu.edu.vn');
  console.log('  5. Giảng viên (GVLN)    : gvln@dlu.edu.vn');
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
