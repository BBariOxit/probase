import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GroupMemberStatus, Role } from '../../generated/prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
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
      registrationGroup: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      topicOutline: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), count: jest.fn() },
      topic: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
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
      prisma.registrationGroupMember.findFirst.mockResolvedValue({ groupId: 5 });
      prisma.registrationGroup.findUnique.mockResolvedValue({
        id: 5,
        name: 'Nhóm 01',
        topic: { id: 2, title: 'Đồ án Quản lý' },
        outline: { status: 'SUBMITTED', attachmentUrl: 'https://res.cloudinary.com/doc.pdf' },
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
      const mockFile = { originalname: 'de_cuong.pdf', buffer: Buffer.from('%PDF-1.4') } as any;
      prisma.studentProfile.findUnique.mockResolvedValue({ id: 1, userId: 10 });
      prisma.registrationGroupMember.findFirst.mockResolvedValue({ groupId: 5 });
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
        service.reviewOutline(1, { action: OutlineReviewAction.APPROVE }, { id: 88, role: Role.LECTURER }),
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
      expect(notifications.notify).toHaveBeenCalled();
    });
  });
});
