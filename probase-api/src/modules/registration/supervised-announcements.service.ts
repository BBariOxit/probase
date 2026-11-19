import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  NotificationType,
  RegistrationGroupStatus,
} from '../../../generated/prisma/client';
import { mapWithConcurrency } from '../../common/utils/concurrency.util';
import { recordAudit } from '../../core/audit/audit-entry';
import { MailService } from '../../core/mail/mail.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotifySupervisedGroupsDto } from './dto/notify-supervised-groups.dto';

const EMAIL_CONCURRENCY = 5;

export interface AnnouncementRecipient {
  userId: number;
  email: string;
  fullName: string;
  groupId: number;
  topicTitle: string;
}

export interface AnnouncementDeliverySummary {
  groupCount: number;
  recipientCount: number;
  notificationsSent: number;
  emailsSent: number;
  emailsFailed: number;
}

@Injectable()
export class SupervisedAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Sends an announcement (in-app notification and/or email) from a lecturer
   * to active members of their selected supervised groups.
   */
  async send(
    dto: NotifySupervisedGroupsDto,
    userId: number,
  ): Promise<AnnouncementDeliverySummary> {
    const lecturer = await this.requireActiveLecturer(userId);
    const uniqueGroupIds = [...new Set(dto.groupIds)];

    const groups = await this.prisma.registrationGroup.findMany({
      where: {
        id: { in: uniqueGroupIds },
        status: { not: RegistrationGroupStatus.REJECTED },
        topic: { lecturerId: lecturer.id },
      },
      select: {
        id: true,
        topic: { select: { title: true } },
        members: {
          where: {
            status: GroupMemberStatus.ACCEPTED,
            student: { user: { isActive: true } },
          },
          select: {
            student: {
              select: {
                fullName: true,
                user: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (groups.length !== uniqueGroupIds.length) {
      throw new ForbiddenException(
        'Bạn chỉ có thể gửi thông báo đến các nhóm do mình hướng dẫn.',
      );
    }

    const recipients = collectRecipients(groups);
    if (recipients.length === 0) {
      throw new ConflictException(
        'Các nhóm được chọn hiện chưa có sinh viên tham gia.',
      );
    }

    const lecturerDisplay = formatLecturerDisplay(
      lecturer.fullName,
      lecturer.academicTitle,
    );

    const notificationsSent = dto.sendNotification
      ? await this.sendInAppNotifications(recipients, lecturerDisplay, dto)
      : 0;

    const { emailsSent, emailsFailed } = dto.sendEmail
      ? await this.sendEmails(
          recipients,
          lecturerDisplay,
          lecturer.user.email,
          dto,
        )
      : { emailsSent: 0, emailsFailed: 0 };

    await recordAudit(this.prisma, {
      userId,
      action: 'LECTURER_GROUP_ANNOUNCEMENT',
      targetTable: 'registration_groups',
      targetId: uniqueGroupIds.join(','),
      newValue: {
        title: dto.title,
        groupIds: uniqueGroupIds,
        recipientCount: recipients.length,
        sendNotification: dto.sendNotification,
        sendEmail: dto.sendEmail,
        notificationsSent,
        emailsSent,
        emailsFailed,
      },
    }).catch(() => undefined);

    return {
      groupCount: groups.length,
      recipientCount: recipients.length,
      notificationsSent,
      emailsSent,
      emailsFailed,
    };
  }

  private async requireActiveLecturer(userId: number) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        academicTitle: true,
        user: { select: { email: true, isActive: true } },
      },
    });

    if (!lecturer || !lecturer.user.isActive) {
      throw new ForbiddenException(
        'Chỉ giảng viên đang hoạt động mới có quyền gửi thông báo.',
      );
    }

    return lecturer;
  }

  private async sendInAppNotifications(
    recipients: AnnouncementRecipient[],
    lecturerDisplay: string,
    dto: NotifySupervisedGroupsDto,
  ): Promise<number> {
    const sent = await this.notifications.notify(
      recipients.map((recipient) => ({
        userId: recipient.userId,
        type: NotificationType.DEADLINE_REMINDER,
        title: dto.title,
        content: `Từ ${lecturerDisplay} (${recipient.topicTitle}):\n\n${dto.content}`,
        targetId: recipient.groupId,
      })),
    );

    return typeof sent === 'number' ? sent : recipients.length;
  }

  private async sendEmails(
    recipients: AnnouncementRecipient[],
    lecturerDisplay: string,
    lecturerEmail: string,
    dto: NotifySupervisedGroupsDto,
  ): Promise<{ emailsSent: number; emailsFailed: number }> {
    const results = await mapWithConcurrency(
      recipients,
      EMAIL_CONCURRENCY,
      (recipient) =>
        this.mail
          .sendLecturerAnnouncement({
            to: recipient.email,
            studentName: recipient.fullName,
            lecturerName: lecturerDisplay,
            lecturerEmail,
            topicTitle: recipient.topicTitle,
            subject: dto.title,
            message: dto.content,
          })
          .catch(() => false),
    );

    const emailsSent = results.filter(Boolean).length;
    return {
      emailsSent,
      emailsFailed: results.length - emailsSent,
    };
  }
}

function collectRecipients(
  groups: Array<{
    id: number;
    topic: { title: string };
    members: Array<{
      student: { fullName: string; user: { id: number; email: string } };
    }>;
  }>,
): AnnouncementRecipient[] {
  const byUserId = new Map<number, AnnouncementRecipient>();

  for (const group of groups) {
    for (const member of group.members) {
      const userId = member.student.user.id;
      if (byUserId.has(userId)) continue;
      byUserId.set(userId, {
        userId,
        email: member.student.user.email,
        fullName: member.student.fullName,
        groupId: group.id,
        topicTitle: group.topic.title,
      });
    }
  }

  return [...byUserId.values()];
}

function formatLecturerDisplay(
  fullName: string,
  academicTitle?: string | null,
): string {
  const cleanTitle = (academicTitle ?? '').trim();
  const cleanName = fullName.trim();
  if (!cleanTitle) return cleanName;
  if (cleanName.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
    return cleanName;
  }
  return `${cleanTitle} ${cleanName}`;
}
