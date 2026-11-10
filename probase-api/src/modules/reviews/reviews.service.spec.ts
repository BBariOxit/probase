import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GroupMemberStatus, Role } from '../../../generated/prisma/client';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { RequestUser } from '../auth/guards/roles.guard';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      lecturerProfile: {
        findUnique: jest.fn(),
      },
      registrationGroup: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      topicAssignment: {
        findMany: jest.fn(),
      },
      topicReview: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  const mockUser: RequestUser = {
    id: 10,
    email: 'gv@dlu.edu.vn',
    role: Role.LECTURER,
    isActive: true,
  };

  const mockLecturer = {
    id: 5,
    userId: 10,
    fullName: 'TS. Nguyễn Văn A',
    lecturerCode: 'GV005',
    academicTitle: 'TS.',
  };

  describe('submitReview', () => {
    it('should throw ForbiddenException if lecturer profile does not exist', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.submitReview(mockUser, {
          groupId: 1,
          templateCode: 'M04',
          generalComment: 'Đạt yêu cầu',
          isDefenseAllowed: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if group does not exist', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue(mockLecturer);
      prisma.registrationGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.submitReview(mockUser, {
          groupId: 999,
          templateCode: 'M04',
          generalComment: 'Đạt',
          isDefenseAllowed: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if lecturer is neither supervisor nor reviewer', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue(mockLecturer);
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 1,
        topic: { lecturerId: 99 }, // not mockLecturer.id
        assignment: { reviewerId: 88 },
        members: [],
      });

      await expect(
        service.submitReview(mockUser, {
          groupId: 1,
          templateCode: 'M04',
          generalComment: 'Đạt',
          isDefenseAllowed: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully submit review as SUPERVISOR and notify students', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue(mockLecturer);
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 1,
        topic: {
          id: 101,
          title: 'Hệ thống Quản lý Đồ án',
          lecturerId: mockLecturer.id,
          round: { projectType: { code: 'KLTN' } },
        },
        assignment: { reviewerId: 99 },
        members: [
          { student: { userId: 201 }, status: GroupMemberStatus.ACCEPTED },
        ],
      });

      const savedReview = {
        id: 1,
        groupId: 1,
        lecturerId: mockLecturer.id,
        reviewerType: 'SUPERVISOR',
        templateCode: 'M04',
        generalComment: 'Rất tốt',
        isDefenseAllowed: true,
        signedAt: new Date(),
        lecturer: mockLecturer,
      };
      prisma.topicReview.upsert.mockResolvedValue(savedReview);

      const result = await service.submitReview(mockUser, {
        groupId: 1,
        templateCode: 'M04',
        generalComment: 'Rất tốt',
        isDefenseAllowed: true,
      });

      expect(result).toEqual(savedReview);
      expect(prisma.topicReview.upsert).toHaveBeenCalled();
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 201,
            title: expect.stringContaining('GVHD'),
          }),
        ]),
      );
    });

    it('should successfully submit review as REVIEWER and enforce M05', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue(mockLecturer);
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 1,
        topic: {
          id: 101,
          title: 'Hệ thống Quản lý Đồ án',
          lecturerId: 99,
          round: { projectType: { code: 'KLTN' } },
        },
        assignment: { reviewerId: mockLecturer.id },
        members: [
          { student: { userId: 201 }, status: GroupMemberStatus.ACCEPTED },
        ],
      });

      const savedReview = {
        id: 2,
        groupId: 1,
        lecturerId: mockLecturer.id,
        reviewerType: 'REVIEWER',
        templateCode: 'M05',
        generalComment: 'Phản biện tốt',
        isDefenseAllowed: true,
        signedAt: new Date(),
        lecturer: mockLecturer,
      };
      prisma.topicReview.upsert.mockResolvedValue(savedReview);

      const result = await service.submitReview(mockUser, {
        groupId: 1,
        templateCode: 'M05',
        generalComment: 'Phản biện tốt',
        isDefenseAllowed: true,
      });

      expect(result).toEqual(savedReview);
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 201,
            title: expect.stringContaining('GVPB'),
          }),
        ]),
      );
    });
  });

  describe('getGroupReviews', () => {
    it('should compute isDefenseEligible=true when both supervisor and reviewer approve and stage2 passed', async () => {
      const mockGroup = {
        id: 1,
        name: 'Nhóm 1',
        topic: { id: 101, title: 'Đề tài 1', lecturer: mockLecturer },
        assignment: { reviewer: { id: 6, fullName: 'GVPB' } },
        members: [{ student: { userId: 10, studentCode: '2212345' } }],
        reviews: [
          { reviewerType: 'SUPERVISOR', isDefenseAllowed: true },
          { reviewerType: 'REVIEWER', isDefenseAllowed: true },
        ],
        progressReports: [{ stage: 'STAGE_2', isPassed: true }],
        submissions: [],
      };
      prisma.registrationGroup.findUnique.mockResolvedValue(mockGroup);

      const result = await service.getGroupReviews(1, {
        ...mockUser,
        role: Role.ADMIN,
      });

      expect(result.isDefenseEligible).toBe(true);
      expect(result.eligibilityStatus).toBe('ELIGIBLE');
    });

    it('should compute eligibilityStatus=NOT_ELIGIBLE when reviewer rejects defense', async () => {
      const mockGroup = {
        id: 1,
        name: 'Nhóm 1',
        topic: { id: 101, title: 'Đề tài 1', lecturer: mockLecturer },
        assignment: { reviewer: { id: 6, fullName: 'GVPB' } },
        members: [{ student: { userId: 10, studentCode: '2212345' } }],
        reviews: [
          { reviewerType: 'SUPERVISOR', isDefenseAllowed: true },
          { reviewerType: 'REVIEWER', isDefenseAllowed: false },
        ],
        progressReports: [{ stage: 'STAGE_2', isPassed: true }],
        submissions: [],
      };
      prisma.registrationGroup.findUnique.mockResolvedValue(mockGroup);

      const result = await service.getGroupReviews(1, {
        ...mockUser,
        role: Role.ADMIN,
      });

      expect(result.isDefenseEligible).toBe(false);
      expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
    });

    it('should compute eligibilityStatus=PENDING when stage2 report is submitted but not yet graded (isPassed=null)', async () => {
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 1,
        name: 'Nhóm 1',
        topic: { id: 101, title: 'Đề tài 1', lecturer: mockLecturer },
        assignment: { reviewer: { id: 6, fullName: 'GVPB' } },
        members: [{ student: { userId: 10, studentCode: '2212345' } }],
        reviews: [],
        progressReports: [{ stage: 'STAGE_2', isPassed: null }],
        submissions: [],
      });

      const result = await service.getGroupReviews(1, {
        ...mockUser,
        role: Role.ADMIN,
      });

      expect(result.isDefenseEligible).toBe(false);
      expect(result.eligibilityStatus).toBe('PENDING');
    });

    it('should compute eligibilityStatus=NOT_ELIGIBLE when stage2 is explicitly failed (isPassed=false)', async () => {
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 1,
        name: 'Nhóm 1',
        topic: { id: 101, title: 'Đề tài 1', lecturer: mockLecturer },
        assignment: { reviewer: { id: 6, fullName: 'GVPB' } },
        members: [{ student: { userId: 10, studentCode: '2212345' } }],
        reviews: [],
        progressReports: [{ stage: 'STAGE_2', isPassed: false }],
        submissions: [],
      });

      const result = await service.getGroupReviews(1, {
        ...mockUser,
        role: Role.ADMIN,
      });

      expect(result.isDefenseEligible).toBe(false);
      expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
    });
  });
});
