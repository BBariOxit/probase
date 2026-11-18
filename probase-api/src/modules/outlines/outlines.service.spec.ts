import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GroupMemberStatus,
  RegistrationGroupStatus,
  Role,
  RoundPhase,
} from '../../../generated/prisma/client';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OutlineReviewAction } from './dto/review-outline.dto';
import { OutlinesService } from './outlines.service';

describe('OutlinesService', () => {
  let service: OutlinesService;
  let prisma: any;
  let cloudinary: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      studentProfile: { findUnique: jest.fn() },
      lecturerProfile: { findUnique: jest.fn() },
      registrationGroupMember: { findFirst: jest.fn() },
      registrationGroup: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      topicOutline: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      topic: {
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return Promise.all(callback);
      }),
    };

    cloudinary = {
      uploadDocument: jest.fn(),
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutlinesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<OutlinesService>(OutlinesService);
  });

  describe('getMyGroupOutline', () => {
    it('returns hasGroup: false when student has no accepted group', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({ id: 1, userId: 10 });
      prisma.registrationGroupMember.findFirst.mockResolvedValue(null);

      const result = await service.getMyGroupOutline(10);
      expect(result.hasGroup).toBe(false);
      expect(result.group).toBeNull();
    });

    it('returns group and outline details when student is in a group with topic', async () => {
      prisma.studentProfile.findUnique.mockResolvedValue({ id: 1, userId: 10 });
      prisma.registrationGroupMember.findFirst.mockResolvedValue({
        groupId: 5,
      });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 5,
        name: 'Nhóm 01',
        topic: { id: 2, title: 'Đồ án Quản lý' },
        outline: {
          status: 'SUBMITTED',
          attachmentUrl: 'https://res.cloudinary.com/doc.pdf',
        },
      });

      const result = await service.getMyGroupOutline(10);
      expect(result.hasGroup).toBe(true);
      expect(result.hasTopic).toBe(true);
      expect(result.outline?.status).toBe('SUBMITTED');
    });
  });

  describe('submitOutline', () => {
    it('throws BadRequestException if no file is uploaded', async () => {
      await expect(service.submitOutline(10, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully uploads file, upserts TopicOutline and notifies lecturer', async () => {
      const mockFile = {
        originalname: 'de_cuong.pdf',
        buffer: Buffer.from('%PDF-1.4'),
      } as any;
      prisma.studentProfile.findUnique.mockResolvedValue({ id: 1, userId: 10 });
      prisma.registrationGroupMember.findFirst.mockResolvedValue({
        groupId: 5,
      });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 5,
        name: 'Nhóm 01',
        topic: { id: 2, title: 'Đồ án Quản lý', lecturer: { userId: 20 } },
        outline: null,
      });

      cloudinary.uploadDocument.mockResolvedValue({
        url: 'https://res.cloudinary.com/test.pdf',
        fileName: 'de_cuong.pdf',
        bytes: 1024,
        publicId: 'probase/submissions/test',
      });

      prisma.topicOutline.upsert.mockResolvedValue({
        id: 1,
        groupId: 5,
        status: 'SUBMITTED',
      });

      const result = await service.submitOutline(10, mockFile);
      expect(result.status).toBe('SUBMITTED');
      expect(prisma.topicOutline.upsert).toHaveBeenCalled();
      expect(notifications.notify).toHaveBeenCalled();
    });
  });

  describe('reviewOutline', () => {
    it('throws ForbiddenException if non-supervisor lecturer tries to review', async () => {
      prisma.topicOutline.findUnique.mockResolvedValue({
        id: 1,
        status: 'SUBMITTED',
        topic: { lecturer: { userId: 99 } },
        group: { members: [] },
      });

      await expect(
        service.reviewOutline(
          1,
          { action: OutlineReviewAction.APPROVE },
          { id: 88, role: Role.LECTURER },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if request revision has no feedback', async () => {
      prisma.topicOutline.findUnique.mockResolvedValue({
        id: 1,
        status: 'SUBMITTED',
        topic: { lecturer: { userId: 20 } },
        group: { members: [] },
      });

      await expect(
        service.reviewOutline(
          1,
          { action: OutlineReviewAction.REQUEST_REVISION, feedback: '' },
          { id: 20, role: Role.LECTURER },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves outline, updates status to APPROVED_BY_LECTURER and notifies members', async () => {
      prisma.topicOutline.findUnique.mockResolvedValue({
        id: 1,
        topicId: 2,
        groupId: 5,
        status: 'SUBMITTED',
        topic: { id: 2, title: 'Hệ thống Quản lý', lecturer: { userId: 20 } },
        group: {
          members: [
            { student: { user: { id: 10 } } },
            { student: { user: { id: 11 } } },
          ],
        },
      });

      prisma.topicOutline.update.mockResolvedValue({
        id: 1,
        status: 'APPROVED_BY_LECTURER',
      });

      const result = await service.reviewOutline(
        1,
        { action: OutlineReviewAction.APPROVE, feedback: 'Đồng ý duyệt' },
        { id: 20, role: Role.LECTURER },
      );

      expect(result.status).toBe('APPROVED_BY_LECTURER');
      expect(prisma.topicOutline.update).toHaveBeenCalled();
      expect(prisma.topic.updateMany).not.toHaveBeenCalled();
      expect(notifications.notify).toHaveBeenCalled();
    });

    it('keeps topic OPEN when approving outline while round is still OPEN', async () => {
      prisma.topicOutline.findUnique.mockResolvedValue({
        id: 1,
        topicId: 2,
        groupId: 5,
        status: 'SUBMITTED',
        topic: {
          id: 2,
          title: 'Hệ thống Quản lý',
          lecturer: { userId: 20 },
          round: {
            phase: RoundPhase.OPEN,
            registrationStart: new Date(Date.now() - 86_400_000),
            registrationEnd: new Date(Date.now() + 86_400_000),
          },
        },
        group: {
          members: [{ student: { user: { id: 10 } } }],
        },
      });
      prisma.topicOutline.update.mockResolvedValue({
        id: 1,
        status: 'APPROVED_BY_LECTURER',
      });

      await service.reviewOutline(
        1,
        { action: OutlineReviewAction.APPROVE },
        { id: 20, role: Role.LECTURER },
      );

      expect(prisma.topic.updateMany).not.toHaveBeenCalled();
    });

    it('moves topic to IN_PROGRESS when approving outline after round is FINALIZED', async () => {
      prisma.topicOutline.findUnique.mockResolvedValue({
        id: 1,
        topicId: 2,
        groupId: 5,
        status: 'SUBMITTED',
        topic: {
          id: 2,
          title: 'Hệ thống Quản lý',
          lecturer: { userId: 20 },
          round: {
            phase: RoundPhase.FINALIZED,
            registrationStart: new Date(Date.now() - 86_400_000 * 10),
            registrationEnd: new Date(Date.now() - 86_400_000),
          },
        },
        group: {
          members: [{ student: { user: { id: 10 } } }],
        },
      });
      prisma.topicOutline.update.mockResolvedValue({
        id: 1,
        status: 'APPROVED_BY_LECTURER',
      });

      await service.reviewOutline(
        1,
        { action: OutlineReviewAction.APPROVE },
        { id: 20, role: Role.LECTURER },
      );

      expect(prisma.topic.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 2 }),
          data: { status: 'IN_PROGRESS' },
        }),
      );
    });
  });

  describe('getFacultyOutlines', () => {
    it('throws ForbiddenException for regular lecturer without TLGV or TTBM role', async () => {
      prisma.lecturerProfile.findUnique.mockResolvedValue({
        id: 5,
        userId: 30,
        isAcademicAssistant: false,
        isHeadOfDepartment: false,
      });

      await expect(
        service.getFacultyOutlines(
          { id: 30, role: Role.LECTURER },
          { page: 1, limit: 20 },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('filters by semesterId, roundId, majorId, search and computes scoped stats excluding REJECTED', async () => {
      prisma.topic.findMany.mockResolvedValue([
        { id: 10, semesterId: 2 },
        { id: 11, semesterId: 2 },
        { id: 12, semesterId: 2 },
      ]);
      prisma.registrationGroup.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Nhóm 01',
          topicId: 12,
          semesterId: 2,
          topic: { id: 12, title: 'Đề tài A', semesterId: 2 },
          outline: null,
        },
      ]);
      prisma.registrationGroup.count
        .mockResolvedValueOnce(1) // filtered total
        .mockResolvedValueOnce(10) // totalWithTopic (baseGroupWhere)
        .mockResolvedValueOnce(4) // approved
        .mockResolvedValueOnce(2) // submitted
        .mockResolvedValueOnce(1); // needsRevision

      const result = await service.getFacultyOutlines(
        { id: 1, role: Role.ADMIN },
        {
          page: 1,
          limit: 20,
          semesterId: 2,
          roundId: 5,
          majorId: 3,
          status: 'NOT_SUBMITTED',
          search: '2266666',
        },
      );

      expect(prisma.registrationGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: RegistrationGroupStatus.REJECTED },
            semesterId: 2,
            topic: { semesterId: 2, roundId: 5, majorId: 3 },
            outline: null,
            OR: expect.arrayContaining([
              expect.objectContaining({
                members: expect.objectContaining({
                  some: expect.objectContaining({
                    status: GroupMemberStatus.ACCEPTED,
                  }),
                }),
              }),
            ]),
          }),
        }),
      );

      // Summary stats use baseGroupWhere with REJECTED excluded (not unfiltered topicOutline)
      expect(prisma.registrationGroup.count).toHaveBeenNthCalledWith(2, {
        where: {
          status: { not: RegistrationGroupStatus.REJECTED },
          semesterId: 2,
          topic: { semesterId: 2, roundId: 5, majorId: 3 },
        },
      });
      expect(result.total).toBe(1);
      expect(result.items[0].topicOrder).toBe(3);
      expect(prisma.topic.findMany).toHaveBeenCalledWith({
        where: { semesterId: { in: [2] } },
        select: { id: true, semesterId: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(result.stats).toEqual({
        totalGroups: 10,
        approved: 4,
        submitted: 2,
        needsRevision: 1,
        notSubmitted: 3,
      });
    });
  });

  describe('downloadFacultyOutlinesZip', () => {
    it('throws BadRequestException when selected groups have no scan files', async () => {
      prisma.registrationGroup.findMany.mockResolvedValue([
        { id: 1, topicId: 1, semesterId: 2, outline: null },
      ]);

      await expect(
        service.downloadFacultyOutlinesZip(
          { groupIds: [1] },
          { id: 1, role: Role.ADMIN },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-Cloudinary URLs to guard against SSRF', async () => {
      prisma.registrationGroup.findMany.mockResolvedValue([
        {
          id: 1,
          topicId: 1,
          semesterId: 2,
          outline: {
            id: 5,
            attachmentUrl: 'http://169.254.169.254/latest/meta-data',
            fileName: 'evil.pdf',
          },
        },
      ]);

      await expect(
        service.downloadFacultyOutlinesZip(
          { groupIds: [1] },
          { id: 1, role: Role.ADMIN },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('downloads allowed scans and packages them into a ZIP archive', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          arrayBuffer: async () => Buffer.from('%PDF-1.4 sample').buffer,
        } as unknown as Response);

      prisma.registrationGroup.findMany.mockResolvedValue([
        {
          id: 1,
          topicId: 10,
          semesterId: 2,
          outline: {
            id: 5,
            attachmentUrl: 'https://res.cloudinary.com/demo/raw/upload/m03.pdf',
            fileName: 'De cuong.pdf',
          },
        },
      ]);
      prisma.topic.findMany.mockResolvedValue([{ id: 10, semesterId: 2 }]);

      try {
        const res = await service.downloadFacultyOutlinesZip(
          { groupIds: [1] },
          { id: 1, role: Role.ADMIN },
        );
        expect(res.fileCount).toBe(1);
        expect(res.buffer.subarray(0, 4)).toEqual(
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        );
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  describe('remindFacultyOutlines', () => {
    it('throws ConflictException if all selected groups already submitted', async () => {
      prisma.registrationGroup.findMany.mockResolvedValue([]);

      await expect(
        service.remindFacultyOutlines(
          { groupIds: [1, 2] },
          { id: 1, role: Role.ADMIN },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('sends reminders to unique active members of missing-outline groups', async () => {
      prisma.registrationGroup.findMany.mockResolvedValue([
        {
          id: 1,
          topic: { title: 'Đề tài A' },
          members: [
            { student: { user: { id: 101 } } },
            { student: { user: { id: 102 } } },
          ],
        },
      ]);

      const result = await service.remindFacultyOutlines(
        { groupIds: [1] },
        { id: 1, role: Role.ADMIN },
      );

      expect(result).toEqual({ remindedGroups: 1, recipientCount: 2 });
      expect(notifications.notify).toHaveBeenCalledTimes(1);
    });
  });
});
