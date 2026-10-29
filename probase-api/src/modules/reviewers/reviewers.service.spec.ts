import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, Role } from '../../../generated/prisma/client';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ReviewersService } from './reviewers.service';

describe('ReviewersService', () => {
  let service: ReviewersService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      registrationGroup: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      lecturerProfile: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      topicAssignment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<ReviewersService>(ReviewersService);
  });

  describe('assignReviewer', () => {
    const adminUser: any = {
      id: 1,
      role: Role.ADMIN,
      isActive: true,
    };

    it('should throw NotFoundException if group does not exist', async () => {
      prisma.registrationGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.assignReviewer(adminUser, { groupId: 10, reviewerId: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if reviewer is the supervisor (BR-13 Rule 1)', async () => {
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 10,
        topicId: 20,
        topic: {
          id: 20,
          title: 'Hệ thống Quản lý',
          lecturerId: 5, // Thầy A hướng dẫn
          majorId: 1,
        },
      });

      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 5, // Thầy A
        fullName: 'Nguyễn Văn A',
        majorId: 1,
        user: { id: 50 },
      });

      await expect(
        service.assignReviewer(adminUser, { groupId: 10, reviewerId: 5 }),
      ).rejects.toThrow(
        new BadRequestException(
          'Giảng viên hướng dẫn không được phân công làm phản biện cho chính đề tài này.',
        ),
      );
    });

    it('should throw BadRequestException if reviewer is in different major/department (BR-13 Rule 2)', async () => {
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 10,
        topicId: 20,
        topic: {
          id: 20,
          title: 'Hệ thống phần mềm',
          lecturerId: 5,
          majorId: 1, // CNPM
          major: { name: 'Công nghệ phần mềm' },
        },
      });

      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 6,
        fullName: 'Trần Văn B',
        majorId: 2, // MMT
        major: { name: 'Mạng máy tính' },
        user: { id: 60 },
      });

      await expect(
        service.assignReviewer(adminUser, { groupId: 10, reviewerId: 6 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully assign reviewer and notify the lecturer', async () => {
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 10,
        topicId: 20,
        topic: {
          id: 20,
          title: 'Hệ thống phần mềm',
          lecturerId: 5, // GVHD: Thầy A (id 5)
          majorId: 1, // CNPM
          major: { name: 'Công nghệ phần mềm' },
        },
      });

      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 7, // GVPB: Thầy C (id 7)
        fullName: 'Lê Văn C',
        majorId: 1, // CNPM
        user: { id: 70 },
      });

      prisma.topicAssignment.upsert.mockResolvedValue({
        id: 1,
        groupId: 10,
        topicId: 20,
        supervisorId: 5,
        reviewerId: 7,
      });

      const result = await service.assignReviewer(adminUser, {
        groupId: 10,
        reviewerId: 7,
      });

      expect(prisma.topicAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: 10 },
          create: expect.objectContaining({
            groupId: 10,
            reviewerId: 7,
            supervisorId: 5,
          }),
        }),
      );

      expect(notifications.notify).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 70,
          type: NotificationType.REVIEWER_ASSIGNED,
        }),
      ]);

      expect(result.reviewerId).toBe(7);
    });
  });

  describe('autoAssign', () => {
    const adminUser: any = {
      id: 1,
      role: Role.ADMIN,
      isActive: true,
    };

    it('should distribute unassigned topics evenly using min-load balancing', async () => {
      // 2 unassigned groups (both CNPM majorId: 1)
      prisma.registrationGroup.findMany.mockResolvedValue([
        {
          id: 101,
          topic: { id: 11, title: 'Đề tài 1', lecturerId: 1, majorId: 1 },
        },
        {
          id: 102,
          topic: { id: 12, title: 'Đề tài 2', lecturerId: 2, majorId: 1 },
        },
      ]);

      // 2 available candidate lecturers in CNPM
      // Lecturer 1: already has 1 review
      // Lecturer 2: has 0 reviews
      prisma.lecturerProfile.findMany.mockResolvedValue([
        {
          id: 1,
          fullName: 'Thầy A',
          majorId: 1,
          user: { id: 10 },
          topics: [{ id: 11 }],
          reviewerAssignments: [{ id: 50 }], // 1 review
        },
        {
          id: 2,
          fullName: 'Thầy B',
          majorId: 1,
          user: { id: 20 },
          topics: [{ id: 12 }],
          reviewerAssignments: [], // 0 reviews
        },
      ]);

      prisma.topicAssignment.upsert.mockResolvedValue({ id: 1 });

      const result = await service.autoAssign(adminUser, {
        majorId: 1,
        maxReviewsPerLecturer: 5,
      });

      expect(result.assignedCount).toBe(2);
      expect(result.unassignedCount).toBe(0);

      // Group 101 (supervisor: Thầy A / id 1): cannot be Thầy A, must be Thầy B
      const assignGroup101 = result.assignments.find((a) => a.groupId === 101);
      expect(assignGroup101?.reviewerId).toBe(2);

      // Group 102 (supervisor: Thầy B / id 2): cannot be Thầy B, must be Thầy A
      const assignGroup102 = result.assignments.find((a) => a.groupId === 102);
      expect(assignGroup102?.reviewerId).toBe(1);

      expect(notifications.notify).toHaveBeenCalled();
    });
  });

  describe('getMyReviewAssignments', () => {
    it('should return review assignments for the logged-in lecturer', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 7,
        userId: 70,
      });

      prisma.topicAssignment.findMany.mockResolvedValue([
        {
          id: 1,
          groupId: 10,
          topic: { id: 20, title: 'Đề tài phản biện 1' },
          group: { id: 10, members: [] },
        },
      ]);

      const result = await service.getMyReviewAssignments(70);
      expect(result.length).toBe(1);
      expect(result[0].topic.title).toBe('Đề tài phản biện 1');
    });
  });
});
