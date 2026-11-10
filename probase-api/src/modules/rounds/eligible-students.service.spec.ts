import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { Role } from '../../../generated/prisma/client';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EligibleStudentsService } from './eligible-students.service';

interface MockPrisma {
  registrationRound: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  semester: {
    findFirst: jest.Mock;
  };
  studentProfile: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  user: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
  };
  roundStudentEligibility: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  registrationGroupMember: {
    findFirst: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  major: {
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

interface CreatedUserCallArg {
  data: {
    email: string;
    role: Role;
    mustChangePassword: boolean;
    password: string;
    studentProfile: {
      create: {
        studentCode: string;
        fullName: string;
        class: string;
        cohort: string;
        majorId: number;
      };
    };
  };
}

interface AuditCallArg {
  data: {
    userId: number;
    action: string;
    targetId: string;
  };
}

async function buildXlsxFile(
  rows: unknown[][],
  originalname = 'eligible.xlsx',
): Promise<Express.Multer.File> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  for (const row of rows) {
    sheet.addRow(row);
  }
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    buffer,
    stream: undefined as unknown as Express.Multer.File['stream'],
    destination: '',
    filename: originalname,
    path: '',
  };
}

function buildCsvFile(
  csvText: string,
  originalname = 'eligible.csv',
  withBom = true,
): Express.Multer.File {
  const content = withBom ? `\uFEFF${csvText}` : csvText;
  const buffer = Buffer.from(content, 'utf8');
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype: 'text/csv',
    size: buffer.length,
    buffer,
    stream: undefined as unknown as Express.Multer.File['stream'],
    destination: '',
    filename: originalname,
    path: '',
  };
}

describe('EligibleStudentsService', () => {
  let service: EligibleStudentsService;
  let prisma: MockPrisma;
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      registrationRound: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      semester: {
        findFirst: jest.fn(),
      },
      studentProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      roundStudentEligibility: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      registrationGroupMember: {
        findFirst: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      major: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
          { id: 2, name: 'Mạng máy tính', code: 'MMT' },
        ]),
      },
      $transaction: jest.fn(
        (cb: (tx: MockPrisma) => Promise<unknown>): Promise<unknown> =>
          cb(prisma),
      ),
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EligibleStudentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<EligibleStudentsService>(EligibleStudentsService);
  });

  describe('getTemplate', () => {
    it('generates an excel buffer successfully', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue({
        id: 1,
        semester: { name: 'HK1 2026-2027' },
        projectType: { name: 'Khóa luận tốt nghiệp' },
      });

      const buffer = await service.getTemplate(1);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('importFile', () => {
    const activeRound = {
      id: 1,
      semesterId: 10,
      semester: { id: 10, name: 'HK1 2026-2027' },
      projectType: { id: 2, name: 'Khóa luận tốt nghiệp' },
    };

    it('throws NotFoundException if round does not exist', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue(null);
      const file = await buildXlsxFile([
        ['MSSV', 'Họ và tên'],
        ['2212345', 'Nguyễn Văn An'],
      ]);

      await expect(service.importFile(999, file, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects unsupported file extensions and fake xlsx payloads', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue(activeRound);

      const badExt = buildCsvFile('MSSV,Họ và tên\n2212345,An', 'list.txt');
      await expect(service.importFile(1, badExt, 1)).rejects.toThrow(
        BadRequestException,
      );

      const fakeXlsx = buildCsvFile(
        'not a zip archive',
        'malicious.xlsx',
        false,
      );
      await expect(service.importFile(1, fakeXlsx, 1)).rejects.toThrow(
        'Nội dung file không đúng định dạng Excel (.xlsx)',
      );
    });

    it('rejects spreadsheets missing required MSSV or name headers', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue(activeRound);
      const file = await buildXlsxFile([
        ['STT', 'Tên lớp', 'Ghi chú'],
        [1, 'CTK46PM', 'Không có cột MSSV'],
      ]);

      await expect(service.importFile(1, file, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates student accounts for DLU SSO without predictable default passwords', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue(activeRound);

      let nextUserId = 100;
      let nextProfileId = 200;
      prisma.user.create.mockImplementation(({ data }: CreatedUserCallArg) => {
        const userId = nextUserId++;
        const profileId = nextProfileId++;
        return Promise.resolve({
          id: userId,
          email: data.email,
          role: data.role,
          mustChangePassword: data.mustChangePassword,
          password: data.password,
          studentProfile: { id: profileId },
        });
      });

      // Custom column layout without Email column and with split Họ lót + Tên:
      // verifies Lớp is never misinterpreted as email.
      const file = await buildXlsxFile([
        ['DANH SÁCH SINH VIÊN ĐỦ ĐIỀU KIỆN'],
        ['STT', 'MSSV', 'Họ lót', 'Tên', 'Lớp', 'Ghi chú'],
        [1, '2212345', 'Nguyễn Văn', 'An', 'CTK46PM', 'Đủ điều kiện'],
        [2, '2212346', 'Trần Thị', 'Bình', 'CTK46MMT', ''],
      ]);

      const res = await service.importFile(1, file, 99);

      expect(res.totalRows).toBe(2);
      expect(res.importedCount).toBe(2);
      expect(res.createdAccountsCount).toBe(2);
      expect(res.errorCount).toBe(0);

      expect(prisma.user.create).toHaveBeenCalledTimes(2);
      const createCalls = prisma.user.create.mock.calls as [
        [CreatedUserCallArg],
      ];
      const firstCall = createCalls[0][0].data;
      expect(firstCall.email).toBe('2212345@dlu.edu.vn');
      expect(firstCall.role).toBe(Role.STUDENT);
      expect(firstCall.mustChangePassword).toBe(false);
      expect(firstCall.studentProfile.create).toMatchObject({
        studentCode: '2212345',
        fullName: 'Nguyễn Văn An',
        class: 'CTK46PM',
        cohort: '2022',
        majorId: 1,
      });

      // Security invariant: never hash predictable Dlu@<MSSV> as password.
      await expect(
        bcrypt.compare('Dlu@2212345', firstCall.password),
      ).resolves.toBe(false);

      expect(notifications.notify).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 100,
            dedupeKey: 'STUDENT_ELIGIBILITY_CONFIRMED:round=1:user=100',
          }),
        ]),
      );

      const auditCalls = prisma.auditLog.create.mock.calls as [[AuditCallArg]];
      expect(auditCalls[0][0].data).toMatchObject({
        userId: 99,
        action: 'ELIGIBLE_STUDENTS_IMPORTED',
        targetId: '1',
      });
    });

    it('parses UTF-8 BOM CSV files and rejects invalid emails, duplicates, non-students, and inactive accounts', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue(activeRound);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 50,
          email: '2212345@dlu.edu.vn',
          role: Role.STUDENT,
          isActive: true,
          studentProfile: { id: 500, studentCode: '2212345' },
        },
        {
          id: 51,
          email: '2212999@dlu.edu.vn',
          role: Role.LECTURER,
          isActive: true,
          studentProfile: null,
        },
        {
          id: 52,
          email: '2212888@dlu.edu.vn',
          role: Role.STUDENT,
          isActive: false,
          studentProfile: { id: 502, studentCode: '2212888' },
        },
      ]);
      prisma.studentProfile.findMany.mockResolvedValue([
        {
          id: 500,
          studentCode: '2212345',
          user: {
            id: 50,
            email: '2212345@dlu.edu.vn',
            role: Role.STUDENT,
            isActive: true,
            studentProfile: { id: 500, studentCode: '2212345' },
          },
        },
        {
          id: 502,
          studentCode: '2212888',
          user: {
            id: 52,
            email: '2212888@dlu.edu.vn',
            role: Role.STUDENT,
            isActive: false,
            studentProfile: { id: 502, studentCode: '2212888' },
          },
        },
      ]);

      const csv = [
        'MSSV,Họ và tên,Lớp,Email',
        '2212345,Nguyễn Văn An,CTK46PM,2212345@dlu.edu.vn',
        '2212345,Nguyễn Văn An Trùng,CTK46PM,',
        '2212111,Sai Tên Miền,CTK46PM,2212111@gmail.com',
        '2212112,Sai MSSV Email,CTK46PM,other@dlu.edu.vn',
        '2212999,Tài Khoản Giảng Viên,CTK46PM,',
        '2212888,Tài Khoản Bị Khóa,CTK46PM,',
        'abc,MSSV Sai,CTK46PM,',
      ].join('\n');

      const res = await service.importFile(1, buildCsvFile(csv), 1);

      expect(res.totalRows).toBe(7);
      expect(res.importedCount).toBe(1);
      expect(res.createdAccountsCount).toBe(0);
      expect(res.errorCount).toBe(6);
      expect(prisma.studentProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 500 },
        }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('listEligible', () => {
    it('throws NotFoundException if round does not exist', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue(null);

      await expect(
        service.listEligible(999, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns paginated eligible students with group details', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue({
        id: 1,
        semesterId: 10,
        semester: { name: 'HK1 2026-2027' },
        projectTypeId: 2,
        projectType: { name: 'Khóa luận tốt nghiệp' },
      });

      prisma.roundStudentEligibility.findMany.mockResolvedValue([
        {
          id: 101,
          roundId: 1,
          studentId: 50,
          note: 'Đủ điều kiện tín chỉ',
          createdAt: new Date(),
          student: {
            studentCode: '2212345',
            fullName: 'Nguyễn Văn An',
            class: 'CTK46PM',
            cohort: '2022',
            major: { id: 1, name: 'CNPM', code: 'CNPM' },
            user: {
              id: 20,
              email: '2212345@dlu.edu.vn',
              isActive: true,
              avatarUrl: null,
            },
            groupMemberships: [],
          },
        },
      ]);
      prisma.roundStudentEligibility.count.mockResolvedValue(1);

      const result = await service.listEligible(1, { page: 1, limit: 10 });
      expect(result.items.length).toBe(1);
      expect(result.items[0].studentCode).toBe('2212345');
      expect(result.items[0].hasGroup).toBe(false);
      expect(result.totalEligible).toBe(1);
    });
  });

  describe('removeEligible', () => {
    it('throws ConflictException if student has accepted group in round', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue({
        id: 1,
        semesterId: 10,
      });

      prisma.registrationGroupMember.findFirst.mockResolvedValue({
        id: 99,
        studentId: 50,
      });

      await expect(service.removeEligible(1, 50, 99)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deletes student from round eligibility and records audit if no group exists', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue({
        id: 1,
        semesterId: 10,
      });
      prisma.registrationGroupMember.findFirst.mockResolvedValue(null);
      prisma.roundStudentEligibility.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.removeEligible(1, 50, 99);
      expect(res.message).toContain('Đã xóa');

      const auditCalls = prisma.auditLog.create.mock.calls as [[AuditCallArg]];
      expect(auditCalls[0][0].data).toMatchObject({
        userId: 99,
        action: 'ELIGIBLE_STUDENT_REMOVED',
        targetId: '1',
      });
    });
  });

  describe('getStudentEligibilityStatus', () => {
    it('evaluates eligibility per round including cohort fallback only on rounds without imported roster', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 50,
        userId: 20,
        cohort: '2022',
        user: { email: '2212345@dlu.edu.vn' },
      });

      prisma.semester.findFirst.mockResolvedValue({
        id: 10,
        name: 'Học kỳ 1 2026-2027',
      });

      prisma.roundStudentEligibility.findMany.mockResolvedValue([
        {
          id: 101,
          note: 'Đủ điều kiện tín chỉ',
          round: {
            id: 1,
            projectTypeId: 2,
            projectType: { name: 'Khóa luận tốt nghiệp' },
            semester: { name: 'Học kỳ 1 2026-2027' },
            requirements: [{ dueAt: new Date('2026-11-15') }],
          },
        },
      ]);

      prisma.registrationRound.findMany.mockResolvedValue([
        {
          id: 2,
          projectTypeId: 3,
          projectType: { name: 'Đồ án chuyên ngành' },
          semester: { name: 'Học kỳ 1 2026-2027' },
          requirements: [],
          _count: { eligibleStudents: 0 },
        },
        {
          // Round 3 already has an imported whitelist that excluded this student
          id: 3,
          projectTypeId: 4,
          projectType: { name: 'Đồ án cơ sở' },
          semester: { name: 'Học kỳ 1 2026-2027' },
          requirements: [],
          _count: { eligibleStudents: 25 },
        },
      ]);

      const res = await service.getStudentEligibilityStatus(20);
      expect(res.isEligible).toBe(true);
      expect(res.rounds.map((r) => r.roundId)).toEqual([1, 2]);
      expect(res.rounds[0].projectTypeName).toBe('Khóa luận tốt nghiệp');
    });

    it('returns isEligible: false when student is absent from imported roster and cohort fallback has no eligible round', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 50,
        userId: 20,
        cohort: '2022',
        user: { email: '2212345@dlu.edu.vn' },
      });

      prisma.semester.findFirst.mockResolvedValue({
        id: 10,
        name: 'Học kỳ 1 2026-2027',
      });

      prisma.roundStudentEligibility.findMany.mockResolvedValue([]);
      prisma.registrationRound.findMany.mockResolvedValue([
        {
          id: 1,
          projectTypeId: 2,
          projectType: { name: 'Khóa luận tốt nghiệp' },
          semester: { name: 'Học kỳ 1 2026-2027' },
          requirements: [],
          _count: { eligibleStudents: 40 },
        },
      ]);

      const res = await service.getStudentEligibilityStatus(20);
      expect(res.isEligible).toBe(false);
      expect(res.message).toContain('chưa nằm trong danh sách đủ điều kiện');
    });
  });
});
