import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EligibleStudentsService } from './eligible-students.service';

describe('EligibleStudentsService', () => {
  let service: EligibleStudentsService;
  let prisma: any;
  let notifications: any;

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
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      roundStudentEligibility: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      registrationGroupMember: {
        findFirst: jest.fn(),
      },
      major: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, name: 'Công nghệ phần mềm', code: 'CNPM' },
          { id: 2, name: 'Mạng máy tính', code: 'MMT' },
        ]),
      },
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
            user: { id: 20, email: '2212345@dlu.edu.vn', isActive: true, avatarUrl: null },
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

      await expect(service.removeEligible(1, 50)).rejects.toThrow(ConflictException);
    });

    it('deletes student from round eligibility if no group exists', async () => {
      prisma.registrationRound.findUnique.mockResolvedValue({
        id: 1,
        semesterId: 10,
      });
      prisma.registrationGroupMember.findFirst.mockResolvedValue(null);
      prisma.roundStudentEligibility.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.removeEligible(1, 50);
      expect(res.message).toContain('Đã xóa');
    });
  });

  describe('getStudentEligibilityStatus', () => {
    it('returns isEligible: true when student has specific eligibility in active semester', async () => {
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

      const res = await service.getStudentEligibilityStatus(20);
      expect(res.isEligible).toBe(true);
      expect(res.rounds.length).toBe(1);
      expect(res.rounds[0].projectTypeName).toBe('Khóa luận tốt nghiệp');
    });

    it('returns isEligible: false when student has no eligibility record and semester is active', async () => {
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
      prisma.registrationRound.findMany.mockResolvedValue([]);

      const res = await service.getStudentEligibilityStatus(20);
      expect(res.isEligible).toBe(false);
      expect(res.message).toContain('chưa nằm trong danh sách đủ điều kiện');
    });
  });
});
