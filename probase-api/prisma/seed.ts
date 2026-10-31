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

// ─────────────────────────────────────────────────────────
// 1. DANH SÁCH SINH VIÊN (CTK46 - KHÓA 2022)
// ─────────────────────────────────────────────────────────
const DEMO_STUDENTS = [
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
];

// ─────────────────────────────────────────────────────────
// 2. DANH SÁCH GIẢNG VIÊN & CÁN BỘ KHOA CNTT - DLU
// Đầy đủ cờ các chức vụ: TLGV, BCN Khoa, TTBM CNPM, TTBM MMT, GVHD/GVPB
// ─────────────────────────────────────────────────────────
const DEMO_STAFF = [
  {
    email: 'gvgvk@dlu.edu.vn',
    role: 'ADMIN' as const,
    lecturerCode: 'GVGVK',
    fullName: 'ThS. Nguyễn Thị GVK (Trợ lý Giáo vụ Khoa)',
    academicTitle: 'ThS',
    majorCode: 'CNPM',
    researchInterests: 'Quản lý đào tạo, Cơ sở dữ liệu',
    isAcademicAssistant: true, // Trợ lý Giáo vụ Khoa (TLGV)
    isFacultyBoard: false,
    isHeadOfDepartment: false,
  },
  {
    email: 'gvcnk@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVCNK',
    fullName: 'TS. Trần Văn CNK (Ban Chủ nhiệm Khoa)',
    academicTitle: 'TS',
    majorCode: 'CNPM',
    researchInterests: 'Trí tuệ nhân tạo, Khai phá dữ liệu',
    isAcademicAssistant: false,
    isFacultyBoard: true, // Ban Chủ nhiệm Khoa (BCN Khoa)
    isHeadOfDepartment: false,
  },
  {
    email: 'gvab@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVAB',
    fullName: 'TS. An Bình (Tổ trưởng BM Phần mềm)',
    academicTitle: 'TS',
    majorCode: 'CNPM',
    researchInterests: 'Kỹ thuật phần mềm, Kiến trúc hệ thống phân tán',
    isAcademicAssistant: false,
    isFacultyBoard: false,
    isHeadOfDepartment: true, // Tổ trưởng Bộ môn (TTBM) Kỹ thuật phần mềm
  },
  {
    email: 'gvcd@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVCD',
    fullName: 'ThS. Chu Đình (Tổ trưởng BM Mạng máy tính)',
    academicTitle: 'ThS',
    majorCode: 'MMT',
    researchInterests: 'Mạng máy tính, An toàn và Bảo mật thông tin, IoT',
    isAcademicAssistant: false,
    isFacultyBoard: false,
    isHeadOfDepartment: true, // Tổ trưởng Bộ môn (TTBM) Mạng máy tính
  },
  {
    email: 'gvpb@dlu.edu.vn',
    role: 'LECTURER' as const,
    lecturerCode: 'GVPB',
    fullName: 'ThS. Phan Bửu (Giảng viên Hướng dẫn & Phản biện)',
    academicTitle: 'ThS',
    majorCode: 'CNPM',
    researchInterests: 'Kỹ thuật phần mềm, Phát triển ứng dụng Web & Mobile',
    isAcademicAssistant: false,
    isFacultyBoard: false,
    isHeadOfDepartment: false, // Giảng viên hướng dẫn & phản biện chính
  },
];

// ─────────────────────────────────────────────────────────
// 3. DANH MỤC CHUYÊN NGÀNH CHUẨN KHOA CNTT - DLU
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

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);

async function main() {
  console.log('Seeding ProBase DLU database…');

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
  console.log(`  [✓] Chuyên ngành: ${MAJORS.length} (CNPM, MMT)`);

  // 2. Seed Loại đồ án (Project Types)
  for (const type of PROJECT_TYPES) {
    await prisma.projectType.upsert({
      where: { code: type.code },
      create: type,
      update: { name: type.name },
    });
  }
  console.log(`  [✓] Loại đồ án: ${PROJECT_TYPES.length} (DACS, DACN, DATN)`);

  // 3. Seed Học kỳ hiện tại
  const now = new Date();
  const currentYear = now.getFullYear();
  const semesterCode = `HK1-${currentYear}-${currentYear + 1}`;

  const semester = await prisma.semester.upsert({
    where: { code: semesterCode },
    create: {
      code: semesterCode,
      name: `Học kỳ 1 năm học ${currentYear}-${currentYear + 1}`,
      startDate: daysFromNow(-30),
      endDate: daysFromNow(120),
      gradeSubmissionDeadline: daysFromNow(110),
      isActive: true,
      mentorWeight: 0.2,   // Tiến độ 1: 20%
      reviewerWeight: 0.3, // Tiến độ 2: 30%
      councilWeight: 0.5,  // Bảo vệ: 50%
    },
    update: {
      isActive: true,
      mentorWeight: 0.2,
      reviewerWeight: 0.3,
      councilWeight: 0.5,
    },
  });
  console.log(`  [✓] Học kỳ: ${semesterCode} (Trọng số DLU: 20% - 30% - 50%)`);

  // 4. Seed các Đợt đồ án (Registration Rounds)
  const ROUNDS = [
    { code: 'DACS', cohort: '2024', closesInDays: 21 }, // Năm 2 (CTK48) làm ĐACS
    { code: 'DACN', cohort: '2023', closesInDays: 21 }, // Năm 3 (CTK47) làm ĐACN
    { code: 'DATN', cohort: '2022', closesInDays: 30 }, // Năm 4 (CTK46) làm KLTN
  ];

  for (const { code, cohort, closesInDays } of ROUNDS) {
    const projectType = await prisma.projectType.findUniqueOrThrow({
      where: { code },
    });

    const round = await prisma.registrationRound.upsert({
      where: {
        semesterId_projectTypeId: {
          semesterId: semester.id,
          projectTypeId: projectType.id,
        },
      },
      create: {
        semesterId: semester.id,
        projectTypeId: projectType.id,
        registrationStart: daysFromNow(-7),
        registrationEnd: daysFromNow(closesInDays),
        phase: 'OPEN',
      },
      update: {},
    });

    await prisma.roundEligibility.deleteMany({ where: { roundId: round.id } });
    await prisma.roundEligibility.create({
      data: { roundId: round.id, cohort },
    });
  }
  console.log(`  [✓] Đợt đồ án: ${ROUNDS.length} đợt (Khóa CTK46 làm KLTN)`);

  // 5. Seed Giảng viên & Cán bộ Khoa CNTT - DLU
  for (const staff of DEMO_STAFF) {
    const { email, role, lecturerCode, fullName, academicTitle, majorCode, researchInterests, isAcademicAssistant, isFacultyBoard, isHeadOfDepartment } = staff;
    const majorId = majorCode ? majorIdByCode.get(majorCode) : null;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: hashedPassword,
        role,
        mustChangePassword: false, // Dùng ngay không cần đổi mật khẩu
      },
      update: {
        password: hashedPassword,
        role,
        mustChangePassword: false,
      },
    });

    await prisma.lecturerProfile.upsert({
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

    console.log(`  [✓] Cán bộ/GV: ${email} (${fullName}) [${role}]`);
  }

  // 6. Seed Sinh viên Demo (2266666, 2277777, 2288888)
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

    await prisma.studentProfile.upsert({
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

    console.log(`  [✓] Sinh viên: ${student.email} (${student.name} - Lớp ${student.class})`);
  }

  // 7. Seed Đề tài mẫu cho Khoa CNTT - DLU
  const pbUser = await prisma.user.findUnique({
    where: { email: 'gvpb@dlu.edu.vn' },
    include: { lecturerProfile: true },
  });

  const abUser = await prisma.user.findUnique({
    where: { email: 'gvab@dlu.edu.vn' },
    include: { lecturerProfile: true },
  });

  const cdUser = await prisma.user.findUnique({
    where: { email: 'gvcd@dlu.edu.vn' },
    include: { lecturerProfile: true },
  });

  const datnRound = await prisma.registrationRound.findFirst({
    where: {
      semesterId: semester.id,
      projectType: { code: 'DATN' },
    },
  });

  if (datnRound && pbUser?.lecturerProfile && abUser?.lecturerProfile && cdUser?.lecturerProfile) {
    // Làm mới đề tài mẫu để luôn liên kết đúng với giảng viên seed hiện tại
    await prisma.topic.deleteMany({
      where: { semesterId: semester.id },
    });

    const sampleTopics = [
      {
        title: 'Hệ thống Quản lý Đồ án Tốt nghiệp cho Khoa CNTT - Đại học Đà Lạt',
        description: 'Xây dựng hệ thống web toàn diện phục vụ quản lý đồ án từ khâu ra đề, duyệt đề cương M03, theo dõi tiến độ 20%-30% đến chấm bảo vệ 50% và nộp gói lưu trữ số hóa 3 thư mục.',
        expectedOutcomes: 'Hệ thống web hoàn chỉnh (Frontend Next.js, Backend NestJS), CSDL PostgreSQL, tài liệu thuyết minh và báo cáo.',
        lecturerId: pbUser.lecturerProfile.id,
        majorId: majorIdByCode.get('CNPM'),
        maxStudents: 3,
      },
      {
        title: 'Ứng dụng Di động Hỗ trợ Học tập Cá nhân hóa Tích hợp Trí tuệ Nhân tạo',
        description: 'Phát triển ứng dụng di động cho sinh viên theo dõi lịch học, tài liệu và gợi ý bài tập theo năng lực dựa trên mô hình học máy.',
        expectedOutcomes: 'Source code ứng dụng di động React Native/Flutter, Backend API và tài liệu kiểm thử.',
        lecturerId: abUser.lecturerProfile.id,
        majorId: majorIdByCode.get('CNPM'),
        maxStudents: 3,
      },
      {
        title: 'Thiết kế và Triển khai Hệ thống Giám sát & Phát hiện Xâm nhập Mạng (NIDS)',
        description: 'Nghiên cứu kiến trúc mạng an toàn, triển khai hệ thống phát hiện xâm nhập mã nguồn mở (Snort/Suricata) kết hợp phân tích lưu lượng bất thường.',
        expectedOutcomes: 'Mô hình mạng thử nghiệm, cấu hình NIDS, kịch bản tấn công/phòng thủ và báo cáo đánh giá hiệu năng.',
        lecturerId: cdUser.lecturerProfile.id,
        majorId: majorIdByCode.get('MMT'),
        maxStudents: 3,
      },
    ];

    for (const t of sampleTopics) {
      await prisma.topic.create({
        data: {
          title: t.title,
          description: t.description,
          expectedOutcomes: t.expectedOutcomes,
          maxStudents: t.maxStudents,
          status: 'OPEN',
          semesterId: semester.id,
          roundId: datnRound.id,
          lecturerId: t.lecturerId,
          majorId: t.majorId,
        },
      });
    }
    console.log(`  [✓] Đề tài mẫu KLTN: Đã tạo ${sampleTopics.length} đề tài`);
  }

  // 8. Seed Đề xuất mẫu từ sinh viên 2266666 gửi Thầy Phan Bửu (gvpb)
  const studentA = await prisma.user.findUnique({
    where: { email: '2266666@dlu.edu.vn' },
    include: { studentProfile: true },
  });

  const datnType = await prisma.projectType.findUnique({ where: { code: 'DATN' } });

  if (studentA?.studentProfile && pbUser?.lecturerProfile && datnType) {
    await prisma.topicProposal.deleteMany({ where: { semesterId: semester.id } });

    await prisma.topicProposal.create({
      data: {
        title: 'Nghiên cứu ứng dụng Computer Vision trong nhận diện khuôn mặt sinh viên tại giảng đường DLU',
        description: 'Đề tài nhằm tự động hóa quy trình điểm danh bằng camera nhận diện gương mặt. Nhóm em đã tìm hiểu thư viện OpenCV và mô hình YOLO.',
        expectedOutcomes: 'Ứng dụng điểm danh chạy thử nghiệm, báo cáo độ chính xác nhận diện.',
        semesterId: semester.id,
        studentId: studentA.studentProfile.id,
        projectTypeId: datnType.id,
        requestedLecturerId: pbUser.lecturerProfile.id,
        status: 'PENDING',
      },
    });
    console.log(`  [✓] Đề xuất mẫu: Sinh viên 2266666 gửi GVHD (gvpb@dlu.edu.vn)`);
  }

  console.log('\n============================================================');
  console.log('🎉 SEED DỮ LIỆU CHUẨN KHOA CNTT - ĐẠI HỌC ĐÀ LẠT HOÀN TẤT!');
  console.log('============================================================');
  console.log(`MẬT KHẨU CHUNG CHO TẤT CẢ TÀI KHOẢN: ${DEFAULT_PASSWORD}\n`);

  console.log('1. DANH SÁCH GIẢNG VIÊN & CÁN BỘ:');
  console.log('   - gvgvk@dlu.edu.vn   | Vai trò: Trợ lý Giáo vụ Khoa (TLGV / ADMIN)');
  console.log('   - gvcnk@dlu.edu.vn   | Vai trò: Ban Chủ nhiệm Khoa (BCN Khoa)');
  console.log('   - gvab@dlu.edu.vn    | Vai trò: Tổ trưởng BM Kỹ thuật phần mềm (TTBM KTPM/CNPM)');
  console.log('   - gvcd@dlu.edu.vn    | Vai trò: Tổ trưởng BM Mạng máy tính (TTBM MMT)');
  console.log('   - gvpb@dlu.edu.vn    | Vai trò: Giảng viên Hướng dẫn & Phản biện\n');

  console.log('2. DANH SÁCH SINH VIÊN (CTK46 - Năm cuối làm KLTN):');
  console.log('   - 2266666@dlu.edu.vn | Nguyễn Văn A (Lớp CTK46PM - Chuyên ngành Kỹ thuật phần mềm)');
  console.log('   - 2277777@dlu.edu.vn | Phạm Thị B   (Lớp CTK46PM - Chuyên ngành Kỹ thuật phần mềm)');
  console.log('   - 2288888@dlu.edu.vn | Lê Văn C     (Lớp CTK46MMT - Chuyên ngành Mạng)');
  console.log('============================================================\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
