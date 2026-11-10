import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CouncilMemberRole,
  RegistrationGroupStatus,
  Role,
} from '../../../generated/prisma/client';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { RequestUser } from '../auth/guards/roles.guard';
import { CouncilsService } from './councils.service';

describe('CouncilsService', () => {
  let service: CouncilsService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      council: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      councilMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      councilTopic: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      councilTopicGrade: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      studentGrade: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      semester: {
        findUnique: jest.fn(),
      },
      major: {
        findUnique: jest.fn(),
      },
      lecturerProfile: {
        findUnique: jest.fn(),
      },
      registrationGroup: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouncilsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<CouncilsService>(CouncilsService);
  });

  const mockAdmin: RequestUser = {
    id: 1,
    email: 'admin@dlu.edu.vn',
    role: Role.ADMIN,
    isActive: true,
  };

  const mockLecturerUser: RequestUser = {
    id: 2,
    email: 'gv@dlu.edu.vn',
    role: Role.LECTURER,
    isActive: true,
  };

  describe('create', () => {
    it('should create a council successfully', async () => {
      prisma.semester.findUnique.mockResolvedValue({ id: 1, name: 'HK1' });
      prisma.major.findUnique.mockResolvedValue({ id: 1, code: 'CNPM' });
      prisma.council.create.mockResolvedValue({
        id: 10,
        name: 'Hội đồng KLTN 01',
        semesterId: 1,
        location: 'A11.204',
      });

      const res = await service.create(
        {
          name: 'Hội đồng KLTN 01',
          semesterId: 1,
          majorId: 1,
          location: 'A11.204',
          defenseDate: '2026-11-20T08:00:00.000Z',
        },
        mockAdmin,
      );

      expect(res.id).toBe(10);
      expect(prisma.council.create).toHaveBeenCalled();
    });
  });

  describe('scheduleTopic', () => {
    it('should schedule an eligible group and send notifications', async () => {
      prisma.council.findUnique.mockResolvedValue({
        id: 5,
        name: 'Hội đồng KLTN 01',
        location: 'A11.204',
      });

      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 100,
        topicId: 200,
        assignment: { reviewerId: 30 },
        councilTopic: null,
        members: [
          {
            student: { userId: 50 },
          },
        ],
      });

      prisma.councilTopic.create.mockResolvedValue({
        id: 1,
        councilId: 5,
        groupId: 100,
        topicId: 200,
        reviewerId: 30,
        status: 'SCHEDULED',
      });

      const res = await service.scheduleTopic(
        5,
        { groupId: 100, timeSlot: '08:00 - 08:45', defenseOrder: 1 },
        mockAdmin,
      );

      expect(res.id).toBe(1);
      expect(notifications.notify).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 50,
          title: expect.stringContaining('Lịch bảo vệ'),
        }),
      ]);
    });

    it('should throw BadRequestException if group already scheduled', async () => {
      prisma.council.findUnique.mockResolvedValue({ id: 5 });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 100,
        topicId: 200,
        assignment: { reviewerId: 30 },
        councilTopic: { id: 99 },
      });

      await expect(
        service.scheduleTopic(5, { groupId: 100 }, mockAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject REJECTED group, cross-semester group, and ineligible group', async () => {
      prisma.council.findUnique.mockResolvedValue({
        id: 5,
        semesterId: 1,
        topics: [{ defenseOrder: 2 }],
      });

      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 100,
        topicId: 200,
        semesterId: 1,
        status: RegistrationGroupStatus.REJECTED,
        assignment: { reviewerId: 30 },
        councilTopic: null,
      });
      await expect(
        service.scheduleTopic(5, { groupId: 100 }, mockAdmin),
      ).rejects.toThrow(BadRequestException);

      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 100,
        topicId: 200,
        semesterId: 2,
        status: RegistrationGroupStatus.APPROVED,
        assignment: { reviewerId: 30 },
        councilTopic: null,
      });
      await expect(
        service.scheduleTopic(5, { groupId: 100 }, mockAdmin),
      ).rejects.toThrow(BadRequestException);

      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 100,
        topicId: 200,
        semesterId: 1,
        status: RegistrationGroupStatus.APPROVED,
        assignment: { reviewerId: 30 },
        councilTopic: null,
        progressReports: [{ isPassed: false }],
        reviews: [
          { reviewerType: 'SUPERVISOR', isDefenseAllowed: true },
          { reviewerType: 'REVIEWER', isDefenseAllowed: true },
        ],
      });
      await expect(
        service.scheduleTopic(5, { groupId: 100 }, mockAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-increment defenseOrder from existing council topics when omitted', async () => {
      prisma.council.findUnique.mockResolvedValue({
        id: 5,
        name: 'HĐ 01',
        semesterId: 1,
        location: 'A11',
        topics: [{ defenseOrder: 1 }, { defenseOrder: 3 }],
      });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 100,
        topicId: 200,
        semesterId: 1,
        status: RegistrationGroupStatus.APPROVED,
        assignment: { reviewerId: 30 },
        councilTopic: null,
        progressReports: [{ isPassed: true }],
        reviews: [
          { reviewerType: 'SUPERVISOR', isDefenseAllowed: true },
          { reviewerType: 'REVIEWER', isDefenseAllowed: true },
        ],
        members: [],
      });
      prisma.councilTopic.create.mockResolvedValue({ id: 2, defenseOrder: 4 });

      const res = await service.scheduleTopic(5, { groupId: 100 }, mockAdmin);
      expect(res.defenseOrder).toBe(4);
      expect(prisma.councilTopic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            defenseOrder: 4,
          }),
        }),
      );
    });
  });

  describe('getEligibleGroups', () => {
    it('excludes REJECTED groups and keeps only Stage 2 passed + both defense allowed', async () => {
      prisma.registrationGroup.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Đủ điều kiện',
          topic: { id: 10, lecturer: { id: 1, fullName: 'GV A' } },
          assignment: { reviewer: { id: 2, fullName: 'GV B' } },
          members: [],
          councilTopic: null,
          progressReports: [{ isPassed: true }],
          reviews: [
            { reviewerType: 'SUPERVISOR', isDefenseAllowed: true },
            { reviewerType: 'REVIEWER', isDefenseAllowed: true },
          ],
        },
        {
          id: 2,
          name: 'Chưa cho bảo vệ',
          topic: { id: 11, lecturer: { id: 1, fullName: 'GV A' } },
          assignment: { reviewer: { id: 2, fullName: 'GV B' } },
          members: [],
          councilTopic: null,
          progressReports: [{ isPassed: true }],
          reviews: [
            { reviewerType: 'SUPERVISOR', isDefenseAllowed: true },
            { reviewerType: 'REVIEWER', isDefenseAllowed: false },
          ],
        },
      ]);

      const eligible = await service.getEligibleGroups(1, 2);
      expect(prisma.registrationGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { not: RegistrationGroupStatus.REJECTED },
            semesterId: 1,
            topic: { majorId: 2 },
          },
        }),
      );
      expect(eligible).toHaveLength(1);
      expect(eligible[0].id).toBe(1);
    });
  });

  describe('evaluateTopic', () => {
    it('should allow council member to submit score and calculate average + final grade', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 20,
        fullName: 'TS. An Bình',
      });

      prisma.councilTopic.findUnique.mockResolvedValue({
        id: 1,
        councilId: 5,
        groupId: 100,
        isLocked: false,
        evaluations: [
          {
            lecturerId: 21,
            lecturerName: 'ThS. Chu Đình',
            role: CouncilMemberRole.PRESIDENT,
            score: 8.0,
            submittedAt: new Date().toISOString(),
          },
        ],
        council: {
          members: [
            { lecturerId: 20, councilRole: CouncilMemberRole.MEMBER },
            { lecturerId: 21, councilRole: CouncilMemberRole.PRESIDENT },
          ],
        },
        group: {
          members: [{ studentId: 10 }],
          studentGrades: [
            {
              studentId: 10,
              progress1Grade: 8.0,
              progress2Grade: 9.0,
            },
          ],
        },
      });

      prisma.councilTopic.update.mockResolvedValue({
        id: 1,
        status: 'DEFENDING',
      });

      // Member 20 submits 9.0 -> average = (8.0 + 9.0) / 2 = 8.5
      // Final Grade = 0.2*8.0 + 0.3*9.0 + 0.5*8.5 = 1.6 + 2.7 + 4.25 = 8.55 -> Letter 'A'
      const res = await service.evaluateTopic(
        1,
        { score: 9.0, feedback: 'Bảo vệ tốt, trả lời lưu loát' },
        mockLecturerUser,
      );

      expect(res.evaluationSummary.avgScore).toBe(8.5);
      expect(prisma.studentGrade.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            defenseGrade: 8.5,
            finalGradeNum: 8.55,
            finalGradeLetter: 'A',
          }),
        }),
      );
    });

    it('should throw ForbiddenException if lecturer is not in council', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 99,
        fullName: 'Người ngoài',
      });

      prisma.councilTopic.findUnique.mockResolvedValue({
        id: 1,
        councilId: 5,
        isLocked: false,
        council: {
          members: [{ lecturerId: 20 }],
        },
      });

      await expect(
        service.evaluateTopic(1, { score: 8.0 }, mockLecturerUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('finalizeTopic', () => {
    it('should lock topic and student grades and notify students', async () => {
      prisma.councilTopic.findUnique.mockResolvedValue({
        id: 1,
        groupId: 100,
        council: {
          members: [{ lecturerId: 20 }],
        },
        group: {
          members: [{ student: { userId: 50 } }],
        },
      });

      prisma.councilTopic.update.mockResolvedValue({
        id: 1,
        isLocked: true,
        status: 'COMPLETED',
      });

      const res = await service.finalizeTopic(
        1,
        { isLocked: true, minuteNotes: 'Hội đồng đồng ý thông qua' },
        mockAdmin,
      );

      expect(res.councilTopic.isLocked).toBe(true);
      expect(prisma.studentGrade.updateMany).toHaveBeenCalledWith({
        where: { groupId: 100 },
        data: { isLocked: true },
      });
      expect(notifications.notify).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 50,
          title: expect.stringContaining('Hoàn thành'),
        }),
      ]);
    });
  });
});
