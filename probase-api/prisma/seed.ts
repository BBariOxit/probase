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
      title: 'Hệ thống Quản lý Đồ án Tốt nghiệp cho Khoa CNTT - Đại học Đà Lạt',
      description: 'Xây dựng hệ thống web toàn diện phục vụ quản lý đồ án từ khâu ra đề, duyệt đề cương M03, theo dõi tiến độ 20%-30% đến chấm bảo vệ 50% và nộp gói lưu trữ số hóa 3 thư mục.',
      expectedOutcomes: 'Hệ thống web hoàn chỉnh (Frontend Next.js, Backend NestJS), CSDL PostgreSQL, tài liệu thuyết minh và báo cáo.',
      lecturerId: pbProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Ứng dụng Di động Hỗ trợ Học tập Cá nhân hóa Tích hợp Trí tuệ Nhân tạo',
      description: 'Phát triển ứng dụng di động cho sinh viên theo dõi lịch học, tài liệu và gợi ý bài tập theo năng lực dựa trên mô hình học máy.',
      expectedOutcomes: 'Source code ứng dụng di động React Native/Flutter, Backend API và tài liệu kiểm thử.',
      lecturerId: abProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'OPEN' as const,
    },
    {
      title: 'Thiết kế và Triển khai Hệ thống Giám sát & Phát hiện Xâm nhập Mạng (NIDS)',
      description: 'Nghiên cứu kiến trúc mạng an toàn, triển khai hệ thống phát hiện xâm nhập mã nguồn mở (Snort/Suricata) kết hợp phân tích lưu lượng bất thường.',
      expectedOutcomes: 'Mô hình mạng thử nghiệm, cấu hình NIDS, kịch bản tấn công/phòng thủ và báo cáo đánh giá hiệu năng.',
      lecturerId: cdProfile.id,
      majorId: majorIdByCode.get('MMT'),
      roundId: datnRound.id,
      maxStudents: 3,
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Xây dựng Hệ thống IoT Giám sát Vi khí hậu và Tưới tự động cho Vườn Dâu tây Đà Lạt',
      description: 'Thiết kế trạm cảm biến thu thập nhiệt độ, độ ẩm đất, ánh sáng và điều khiển tưới nước nhỏ giọt thông minh qua ứng dụng di động.',
      expectedOutcomes: 'Mạch phần cứng IoT ESP32, ứng dụng Flutter và máy chủ lưu trữ dữ liệu cảm biến.',
      lecturerId: cdProfile.id,
      majorId: majorIdByCode.get('MMT'),
      roundId: dacnRound?.id ?? datnRound.id,
      maxStudents: 2,
      status: 'OPEN' as const,
    },
    {
      title: 'Nền tảng Quản lý và Khai thác Dữ liệu Du lịch Thông minh Tỉnh Lâm Đồng',
      description: 'Hệ sinh thái gợi ý lộ trình tham quan, phân tích đánh giá của du khách bằng xử lý ngôn ngữ tự nhiên tiếng Việt.',
      expectedOutcomes: 'Hệ thống web portal, mô hình AI phân loại cảm xúc (Sentiment Analysis) và tài liệu API.',
      lecturerId: cnkProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: dacnRound?.id ?? datnRound.id,
      maxStudents: 3,
      status: 'OPEN' as const,
    },
    {
      title: 'Xây dựng Ứng dụng Quản lý Thư viện Số Trường Đại học Đà Lạt',
      description: 'Ứng dụng quản lý mượn trả sách, tra cứu tài liệu học thuật và phân quyền sinh viên, giảng viên.',
      expectedOutcomes: 'Ứng dụng Web hoàn chỉnh, CSDL thiết kế chuẩn và tài liệu hướng dẫn sử dụng.',
      lecturerId: pbProfile.id,
      majorId: majorIdByCode.get('CNPM'),
      roundId: dacsRound?.id ?? datnRound.id,
      maxStudents: 2,
      status: 'OPEN' as const,
    },
  ];

  const createdTopics: any[] = [];
  for (const t of topicsData) {
    const topic = await prisma.topic.create({
      data: {
        title: t.title,
        description: t.description,
        expectedOutcomes: t.expectedOutcomes,
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
  console.log(`[✓] 8. Đề tài: Đã tạo ${createdTopics.length} đề tài phong phú các đợt`);

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
        title: 'Thông báo về việc mở đợt đăng ký đồ án',
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
