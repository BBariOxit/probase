import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationType,
  RegistrationGroupStatus,
} from '../../../generated/prisma/client';
import { MailService } from '../../core/mail/mail.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SupervisedAnnouncementsService } from './supervised-announcements.service';

describe('SupervisedAnnouncementsService', () => {
  let service: SupervisedAnnouncementsService;
  let prisma: {
    lecturerProfile: { findUnique: jest.Mock };
    registrationGroup: { findMany: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let notifications: { notify: jest.Mock };
  let mail: { sendLecturerAnnouncement: jest.Mock };

  beforeEach(async () => {
    prisma = {
      lecturerProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 5,
          fullName: 'Phan Bửu',
          academicTitle: 'ThS.',
          user: { email: 'gvpb@dlu.edu.vn', isActive: true },
        }),
      },
      registrationGroup: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };

    notifications = {
      notify: jest.fn().mockResolvedValue(2),
    };

    mail = {
      sendLecturerAnnouncement: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisedAnnouncementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(SupervisedAnnouncementsService);
  });

  it('rejects non-lecturer callers', async () => {
    prisma.lecturerProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.send(
        {
          groupIds: [1],
          title: 'Lịch họp tuần này',
          content: 'Thứ 5 lúc 14h gặp tại phòng A31.',
          sendNotification: true,
          sendEmail: true,
        },
        99,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects if any selected group is not supervised by the lecturer (IDOR guard)', async () => {
    prisma.registrationGroup.findMany.mockResolvedValue([
      {
        id: 10,
        topic: { title: 'Đề tài của tôi' },
        members: [],
      },
    ]);

    await expect(
      service.send(
        {
          groupIds: [10, 999],
          title: 'Nhắc tiến độ',
          content: 'Nộp báo cáo tuần này.',
          sendNotification: true,
          sendEmail: true,
        },
        50,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.registrationGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: [10, 999] },
          status: { not: RegistrationGroupStatus.REJECTED },
          topic: { lecturerId: 5 },
        }),
      }),
    );
    expect(notifications.notify).not.toHaveBeenCalled();
    expect(mail.sendLecturerAnnouncement).not.toHaveBeenCalled();
  });

  it('throws ConflictException when selected groups have zero active members', async () => {
    prisma.registrationGroup.findMany.mockResolvedValue([
      { id: 10, topic: { title: 'Đề tài trống' }, members: [] },
    ]);

    await expect(
      service.send(
        {
          groupIds: [10],
          title: 'Nhắc lịch',
          content: 'Nội dung test.',
          sendNotification: true,
          sendEmail: true,
        },
        50,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('sends in-app notifications and personalized emails with replyTo, reporting partial failures', async () => {
    prisma.registrationGroup.findMany.mockResolvedValue([
      {
        id: 10,
        topic: { title: 'Hệ thống ProBase' },
        members: [
          {
            student: {
              fullName: 'Nguyễn Văn A',
              user: { id: 101, email: '2266666@dlu.edu.vn' },
            },
          },
          {
            student: {
              fullName: 'Phạm Thị B',
              user: { id: 102, email: '2277777@dlu.edu.vn' },
            },
          },
        ],
      },
    ]);

    mail.sendLecturerAnnouncement
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const summary = await service.send(
      {
        groupIds: [10, 10],
        title: 'Hẹn lịch gặp tuần 5',
        content: '14h thứ 5 gặp tại phòng A31.204.',
        sendNotification: true,
        sendEmail: true,
      },
      50,
    );

    expect(summary).toEqual({
      groupCount: 1,
      recipientCount: 2,
      notificationsSent: 2,
      emailsSent: 1,
      emailsFailed: 1,
    });

    expect(notifications.notify).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 101,
        type: NotificationType.DEADLINE_REMINDER,
        title: 'Hẹn lịch gặp tuần 5',
        targetId: 10,
      }),
      expect.objectContaining({
        userId: 102,
        type: NotificationType.DEADLINE_REMINDER,
        title: 'Hẹn lịch gặp tuần 5',
        targetId: 10,
      }),
    ]);

    expect(mail.sendLecturerAnnouncement).toHaveBeenCalledTimes(2);
    expect(mail.sendLecturerAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '2266666@dlu.edu.vn',
        studentName: 'Nguyễn Văn A',
        lecturerName: 'ThS. Phan Bửu',
        lecturerEmail: 'gvpb@dlu.edu.vn',
        topicTitle: 'Hệ thống ProBase',
      }),
    );
  });

  it('skips email delivery when sendEmail is false', async () => {
    prisma.registrationGroup.findMany.mockResolvedValue([
      {
        id: 10,
        topic: { title: 'Hệ thống ProBase' },
        members: [
          {
            student: {
              fullName: 'Nguyễn Văn A',
              user: { id: 101, email: '2266666@dlu.edu.vn' },
            },
          },
        ],
      },
    ]);
    notifications.notify.mockResolvedValue(1);

    const summary = await service.send(
      {
        groupIds: [10],
        title: 'Chỉ gửi app',
        content: 'Nhớ cập nhật đề cương.',
        sendNotification: true,
        sendEmail: false,
      },
      50,
    );

    expect(mail.sendLecturerAnnouncement).not.toHaveBeenCalled();
    expect(summary.emailsSent).toBe(0);
    expect(summary.notificationsSent).toBe(1);
  });
});
