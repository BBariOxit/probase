import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, RoundPhase, TopicStatus } from '../../../generated/prisma/client';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { RoundsService } from '../rounds/rounds.service';
import { TopicSimilarityService } from './topic-similarity.service';
import { TopicsService } from './topics.service';

describe('TopicsService', () => {
  let service: TopicsService;
  let prisma: any;
  let phases: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      topic: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      lecturerProfile: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (arg: any) => {
        if (typeof arg === 'function') {
          return arg(prisma);
        }
        return Promise.all(arg);
      }),
    };

    phases = {
      resolveMany: jest.fn().mockResolvedValue(new Map()),
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoundPhaseService, useValue: phases },
        {
          provide: RoundsService,
          useValue: {
            requireRoundFor: jest.fn(),
            eligibleRoundIds: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: TopicSimilarityService,
          useValue: { checkTopicSimilarity: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<TopicsService>(TopicsService);
  });

  describe('findAll', () => {
    it('queries PENDING_DEPARTMENT & PENDING with department-scoped majorId fallback and search without clobbering OR', async () => {
      await service.findAll(
        {
          semesterId: 5,
          reviewStage: 'DEPARTMENT',
          majorId: 1,
          q: 'Computer Vision',
          mine: false,
          forMyCohort: false,
          page: 1,
          limit: 10,
        },
        10,
        Role.LECTURER,
      );

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            semesterId: 5,
            status: { in: [TopicStatus.PENDING_DEPARTMENT, TopicStatus.PENDING] },
            AND: [
              {
                OR: [
                  { title: { contains: 'Computer Vision', mode: 'insensitive' } },
                  {
                    description: {
                      contains: 'Computer Vision',
                      mode: 'insensitive',
                    },
                  },
                ],
              },
              {
                OR: [
                  { majorId: 1 },
                  { majorId: null, lecturer: { majorId: 1 } },
                  { majorId: null, lecturer: { majorId: null } },
                ],
              },
            ],
          },
        }),
      );
    });

    it('returns non-draft topics when reviewStage is ALL', async () => {
      await service.findAll(
        {
          reviewStage: 'ALL',
          mine: false,
          forMyCohort: false,
          page: 1,
          limit: 10,
        },
        10,
        Role.LECTURER,
      );

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: TopicStatus.DRAFT },
          }),
        }),
      );
    });

    it('throws ForbiddenException when ADMIN requests reviewStage queue', async () => {
      await expect(
        service.findAll(
          {
            reviewStage: 'DEPARTMENT',
            mine: false,
            forMyCohort: false,
            page: 1,
            limit: 10,
          },
          1,
          Role.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns APPROVED topics for ADMIN topic registry without reviewStage', async () => {
      await service.findAll(
        {
          status: TopicStatus.APPROVED,
          mine: false,
          forMyCohort: false,
          page: 1,
          limit: 15,
        },
        1,
        Role.ADMIN,
      );

      expect(prisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { equals: TopicStatus.APPROVED },
          }),
        }),
      );
    });
  });

  describe('reviewDepartment', () => {
    it('throws ForbiddenException when caller is a regular lecturer (not TTBM)', async () => {
      await expect(
        service.reviewDepartment(
          38,
          { action: 'APPROVE' },
          {
            id: 5,
            role: Role.LECTURER,
            lecturerProfile: { id: 5, isHeadOfDepartment: false, majorId: 1 },
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when caller is ADMIN (Giáo vụ cannot review topics)', async () => {
      await expect(
        service.reviewDepartment(
          38,
          { action: 'APPROVE' },
          {
            id: 1,
            role: Role.ADMIN,
            lecturerProfile: null,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when TTBM tries to review a topic of another department (including null topic.majorId owned by other major lecturer)', async () => {
      prisma.topic.findUnique.mockResolvedValue({
        id: 38,
        title: 'CV Topic',
        status: TopicStatus.PENDING_DEPARTMENT,
        majorId: null,
        lecturer: { id: 5, userId: 50, fullName: 'Phan Bửu', majorId: 1 },
        major: null,
      });

      await expect(
        service.reviewDepartment(
          38,
          { action: 'APPROVE' },
          {
            id: 4,
            role: Role.LECTURER,
            lecturerProfile: { id: 4, isHeadOfDepartment: true, majorId: 2 },
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if topic is not pending department review', async () => {
      prisma.topic.findUnique.mockResolvedValue({
        id: 38,
        title: 'CV Topic',
        status: TopicStatus.APPROVED,
        majorId: 1,
        lecturer: { id: 5, userId: 50, fullName: 'Phan Bửu', majorId: 1 },
        major: { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
      });

      await expect(
        service.reviewDepartment(
          38,
          { action: 'APPROVE' },
          {
            id: 3,
            role: Role.LECTURER,
            lecturerProfile: { id: 3, isHeadOfDepartment: true, majorId: 1 },
          },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('transitions topic directly to APPROVED when TTBM approves', async () => {
      prisma.topic.findUnique.mockResolvedValue({
        id: 38,
        title: 'CV Topic',
        status: TopicStatus.PENDING_DEPARTMENT,
        majorId: 1,
        lecturer: { id: 5, userId: 50, fullName: 'Phan Bửu', majorId: 1 },
        major: { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
      });
      prisma.topic.update.mockResolvedValue({
        id: 38,
        title: 'CV Topic',
        maxStudents: 3,
        status: TopicStatus.APPROVED,
        majorId: 1,
        major: { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
        departmentFeedback: 'Đạt chuẩn',
        departmentReviewer: { id: 3, fullName: 'An Bình', academicTitle: 'TS.' },
        round: {
          id: 8,
          phase: RoundPhase.PREP,
          registrationStart: new Date(),
          registrationEnd: new Date(),
          projectType: { id: 3, name: 'Khóa luận tốt nghiệp', code: 'DATN' },
        },
        lecturer: {
          id: 5,
          fullName: 'Phan Bửu',
          lecturerCode: 'GVPB',
          academicTitle: 'ThS.',
        },
        semester: { id: 5, name: 'HK1', code: 'HK1-2026-2027' },
        registrationGroups: [],
        sourceProposal: { studentId: 1, attachments: [] },
      });

      const result = await service.reviewDepartment(
        38,
        { action: 'APPROVE', feedback: 'Đạt chuẩn' },
        {
          id: 3,
          role: Role.LECTURER,
          lecturerProfile: { id: 3, isHeadOfDepartment: true, majorId: 1 },
        },
      );

      expect(prisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 38 },
          data: expect.objectContaining({
            status: TopicStatus.APPROVED,
            departmentReviewerId: 3,
            departmentFeedback: 'Đạt chuẩn',
          }),
        }),
      );
      expect(notifications.notify).toHaveBeenCalled();
      expect(result.status).toBe(TopicStatus.APPROVED);
    });
  });

  describe('submit & submitDrafts (TTBM auto-approval)', () => {
    const presentedTopic = (id: number, status: TopicStatus) => ({
      id,
      title: `Topic ${id}`,
      maxStudents: 3,
      status,
      majorId: 1,
      major: { id: 1, name: 'Kỹ thuật phần mềm', code: 'CNPM' },
      departmentFeedback: null,
      departmentReviewer: { id: 3, fullName: 'An Bình', academicTitle: 'TS.' },
      round: {
        id: 8,
        phase: RoundPhase.PREP,
        registrationStart: new Date(),
        registrationEnd: new Date(),
        projectType: { id: 3, name: 'Khóa luận tốt nghiệp', code: 'DATN' },
      },
      lecturer: {
        id: 3,
        fullName: 'An Bình',
        lecturerCode: 'GVAB',
        academicTitle: 'TS.',
      },
      semester: { id: 5, name: 'HK1', code: 'HK1-2026-2027' },
      registrationGroups: [],
      sourceProposal: { studentId: 1, attachments: [] },
    });

    it('routes regular lecturer topic submit to PENDING_DEPARTMENT', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 5,
        isHeadOfDepartment: false,
        majorId: 1,
      });
      prisma.topic.findUnique.mockResolvedValue({
        id: 40,
        status: TopicStatus.DRAFT,
        lecturerId: 5,
        majorId: 1,
        semesterId: 5,
        _count: { registrationGroups: 0 },
      });
      prisma.topic.update.mockResolvedValue(
        presentedTopic(40, TopicStatus.PENDING_DEPARTMENT),
      );

      const res = await service.submit(40, 50);

      expect(prisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 40 },
          data: { status: TopicStatus.PENDING_DEPARTMENT },
        }),
      );
      expect(res.status).toBe(TopicStatus.PENDING_DEPARTMENT);
    });

    it('auto-approves TTBM own topic straight to APPROVED on submit', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 3,
        isHeadOfDepartment: true,
        majorId: 1,
      });
      prisma.topic.findUnique.mockResolvedValue({
        id: 41,
        status: TopicStatus.DRAFT,
        lecturerId: 3,
        majorId: 1,
        semesterId: 5,
        _count: { registrationGroups: 0 },
      });
      prisma.topic.update.mockResolvedValue(
        presentedTopic(41, TopicStatus.APPROVED),
      );

      const res = await service.submit(41, 30);

      expect(prisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 41 },
          data: expect.objectContaining({
            status: TopicStatus.APPROVED,
            departmentReviewerId: 3,
            departmentFeedback: null,
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(notifications.notify).not.toHaveBeenCalled();
      expect(res.status).toBe(TopicStatus.APPROVED);
    });

    it('routes TTBM own topic of another major to PENDING_DEPARTMENT instead of auto-approving', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 3,
        isHeadOfDepartment: true,
        majorId: 1,
      });
      prisma.topic.findUnique.mockResolvedValue({
        id: 42,
        status: TopicStatus.DRAFT,
        lecturerId: 3,
        majorId: 2,
        semesterId: 5,
        _count: { registrationGroups: 0 },
      });
      prisma.topic.update.mockResolvedValue(
        presentedTopic(42, TopicStatus.PENDING_DEPARTMENT),
      );

      const res = await service.submit(42, 30);

      expect(prisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          data: { status: TopicStatus.PENDING_DEPARTMENT },
        }),
      );
      expect(res.status).toBe(TopicStatus.PENDING_DEPARTMENT);
    });

    it('auto-approves TTBM own-department drafts and routes other-major drafts on submitDrafts', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 3,
        isHeadOfDepartment: true,
        majorId: 1,
      });
      prisma.topic.findMany.mockResolvedValue([
        { id: 101, title: 'Same Major', majorId: 1 },
        { id: 102, title: 'Null Major', majorId: null },
        { id: 103, title: 'Other Major', majorId: 2 },
      ]);

      const res = await service.submitDrafts(30);

      expect(prisma.topic.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [101, 102] } },
        data: {
          status: TopicStatus.APPROVED,
          departmentReviewerId: 3,
          departmentFeedback: null,
        },
      });
      expect(prisma.topic.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [103] } },
        data: { status: TopicStatus.PENDING_DEPARTMENT },
      });
      expect(res).toEqual(
        expect.objectContaining({
          count: 3,
          approvedCount: 2,
          pendingCount: 1,
        }),
      );
    });
  });

  describe('update', () => {
    it('throws ConflictException when lecturer attempts to edit a REJECTED topic', async () => {
      prisma.topic.findUnique.mockResolvedValue({
        id: 45,
        status: TopicStatus.REJECTED,
        lecturerId: 5,
        majorId: 1,
        semesterId: 5,
        _count: { registrationGroups: 0 },
      });
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 5,
        isHeadOfDepartment: false,
        majorId: 1,
      });

      await expect(
        service.update(45, { title: 'Edited Title' }, 50, Role.LECTURER),
      ).rejects.toThrow(ConflictException);
      expect(prisma.topic.update).not.toHaveBeenCalled();
    });
  });
});

