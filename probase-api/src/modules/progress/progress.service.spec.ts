import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GroupMemberStatus,
  NotificationType,
} from '../../../generated/prisma/client';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let prisma: any;
  let cloudinary: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      studentProfile: {
        findUnique: jest.fn(),
      },
      lecturerProfile: {
        findUnique: jest.fn(),
      },
      registrationGroupMember: {
        findFirst: jest.fn(),
      },
      registrationGroup: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      weeklyLog: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      progressReport: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      studentGrade: {
        upsert: jest.fn(),
      },
    };

    cloudinary = {
      uploadDocument: jest.fn(),
    };

    notifications = {
      notify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  describe('getMyGroupProgress', () => {
    it('should return hasGroup: false when student has no accepted group', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 10,
        userId: 100,
      });
      prisma.registrationGroupMember.findFirst.mockResolvedValue(null);

      const result = await service.getMyGroupProgress(100);
      expect(result.hasGroup).toBe(false);
      expect(result.group).toBeNull();
    });

    it('should return group progress and latest percentage when student has group and topic', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 10,
        userId: 100,
      });
      prisma.registrationGroupMember.findFirst.mockResolvedValue({
        groupId: 20,
      });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 20,
        name: 'Nhóm 1',
        topic: {
          id: 30,
          title: 'Hệ thống Quản lý',
          lecturer: { fullName: 'Thầy A' },
        },
        members: [{ student: { fullName: 'SV 1' } }],
      });
      prisma.weeklyLog.findMany.mockResolvedValue([
        { id: 1, weekNumber: 2, completionPercentage: 25 },
        { id: 2, weekNumber: 1, completionPercentage: 10 },
      ]);
      prisma.progressReport.findMany.mockResolvedValue([
        { stage: 'STAGE_1', supervisorGrade: 8.5 },
      ]);

      const result = await service.getMyGroupProgress(100);
      expect(result.hasGroup).toBe(true);
      expect(result.hasTopic).toBe(true);
      expect(result.currentPercentage).toBe(25);
      expect(result.progressReports.stage1).toBeDefined();
    });
  });

  describe('createWeeklyLog', () => {
    it('should create log and send notification to supervisor', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({
        id: 10,
        userId: 100,
      });
      prisma.registrationGroupMember.findFirst.mockResolvedValue({
        group: {
          id: 20,
          name: 'Nhóm 1',
          topic: {
            id: 30,
            title: 'Hệ thống',
            lecturer: { userId: 50 },
          },
        },
      });
      prisma.weeklyLog.findFirst.mockResolvedValue(null);
      prisma.weeklyLog.create.mockResolvedValue({
        id: 1,
        weekNumber: 1,
        completionPercentage: 15,
      });

      const result = await service.createWeeklyLog(100, {
        weekNumber: 1,
        completionPercentage: 15,
        summaryNotes: 'Hoàn thành DB schema',
      });

      expect(prisma.weeklyLog.create).toHaveBeenCalled();
      expect(notifications.notify).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 50,
          type: NotificationType.PROGRESS_LOG_SUBMITTED,
        }),
      ]);
      expect(result.completionPercentage).toBe(15);
    });
  });

  describe('feedbackWeeklyLog', () => {
    it('should throw ForbiddenException if lecturer is not supervisor', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({ id: 5 });
      prisma.weeklyLog.findUnique.mockResolvedValue({
        id: 1,
        group: {
          topic: { lecturerId: 99 },
          members: [],
        },
      });

      await expect(
        service.feedbackWeeklyLog(100, 1, { lecturerComment: 'Tốt' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should acknowledge log and notify members', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 5,
        fullName: 'GV A',
      });
      prisma.weeklyLog.findUnique.mockResolvedValue({
        id: 1,
        weekNumber: 2,
        group: {
          id: 20,
          topic: { lecturerId: 5 },
          members: [{ student: { userId: 201 } }],
        },
      });
      prisma.weeklyLog.update.mockResolvedValue({
        id: 1,
        isAcknowledged: true,
      });

      const result = await service.feedbackWeeklyLog(100, 1, {
        isAcknowledged: true,
        lecturerComment: 'Làm tốt lắm!',
      });

      expect(prisma.weeklyLog.update).toHaveBeenCalled();
      expect(notifications.notify).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 201,
          type: NotificationType.PROGRESS_LOG_FEEDBACK,
        }),
      ]);
      expect(result.isAcknowledged).toBe(true);
    });
  });

  describe('gradeProgressReport', () => {
    it('should grade STAGE_1 and sync to StudentGrade', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({ id: 5 });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 20,
        topic: { lecturerId: 5 },
        members: [{ studentId: 10, student: { userId: 201 } }],
      });
      prisma.progressReport.findUnique.mockResolvedValue(null);
      prisma.progressReport.upsert.mockResolvedValue({
        id: 1,
        stage: 'STAGE_1',
        finalStageGrade: 9.0,
      });

      const result = await service.gradeProgressReport(100, 20, 'STAGE_1', {
        grade: 9.0,
        feedback: 'Báo cáo chi tiết',
      });

      expect(prisma.studentGrade.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId_studentId: { groupId: 20, studentId: 10 } },
          update: { progress1Grade: 9.0 },
        }),
      );
      expect(result.finalStageGrade).toBe(9.0);
    });

    it('should enforce >= 50% workload condition for STAGE_2 pass/fail gate', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({ id: 5 });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 20,
        topic: { lecturerId: 5 },
        members: [{ studentId: 10, student: { userId: 201 } }],
      });
      prisma.progressReport.findUnique.mockResolvedValue({
        supervisorGrade: null,
        reviewerGrade: null,
      });
      prisma.progressReport.upsert.mockResolvedValue({
        id: 2,
        stage: 'STAGE_2',
        finalStageGrade: 4.0,
        workloadPercentage: 35,
        isPassed: false,
      });

      const result = await service.gradeProgressReport(100, 20, 'STAGE_2', {
        grade: 4.0,
        workloadPercentage: 35,
        feedback: 'Sản phẩm mới chỉ làm được 35%, chưa đạt yêu cầu 50%.',
      });

      expect(result.isPassed).toBe(false);
      expect(notifications.notify).toHaveBeenCalledWith([
        expect.objectContaining({
          title: expect.stringContaining(
            'CẢNH BÁO: Chưa đạt 50% khối lượng công việc',
          ),
        }),
      ]);
    });

    it('should compute finalGradeNum and finalGradeLetter for DACS when both GVHD and GVPB grade STAGE_2', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({ id: 8 }); // Reviewer
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 20,
        topic: {
          lecturerId: 5,
          round: {
            projectType: { code: 'DACS', name: 'Đồ án cơ sở' },
          },
        },
        assignment: { reviewerId: 8 },
        members: [{ studentId: 10, student: { userId: 201 } }],
      });
      // Existing report for STAGE_2 already has supervisorGrade = 9.0
      prisma.progressReport.findUnique
        .mockResolvedValueOnce({
          supervisorGrade: 9.0,
          reviewerGrade: null,
          workloadPercentage: 80,
        })
        // Mock lookup for STAGE_1 report
        .mockResolvedValueOnce({
          finalStageGrade: 8.0,
          supervisorGrade: 8.0,
        });

      prisma.progressReport.upsert.mockResolvedValue({
        id: 2,
        stage: 'STAGE_2',
        supervisorGrade: 9.0,
        reviewerGrade: 8.0,
        finalStageGrade: 8.5,
        workloadPercentage: 80,
        isPassed: true,
      });

      await service.gradeProgressReport(108, 20, 'STAGE_2', {
        grade: 8.0,
        workloadPercentage: 80,
        feedback: 'Phản biện đánh giá tốt.',
      });

      // 0.5 * 8.0 (Stage 1) + 0.5 * 8.5 (Stage 2) = 8.25 -> Letter 'B+'
      expect(prisma.studentGrade.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            progress2Grade: 8.5,
            finalGradeNum: 8.25,
            finalGradeLetter: 'B+',
          }),
          update: expect.objectContaining({
            progress2Grade: 8.5,
            finalGradeNum: 8.25,
            finalGradeLetter: 'B+',
          }),
        }),
      );
    });
  });
});
