import { extname } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  NotificationType,
  Prisma,
  RegistrationGroupStatus,
  Role,
  RoundPhase,
  TopicStatus,
} from '../../../generated/prisma/client';
import { mapWithConcurrency } from '../../common/utils/concurrency.util';
import { buildZipArchive } from '../../common/utils/zip.util';
import { recordAudit } from '../../core/audit/audit-entry';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { duePhase } from '../rounds/round-phase.service';
import { BulkOutlineGroupIdsDto } from './dto/bulk-outlines.dto';
import { QueryOutlinesDto } from './dto/query-outlines.dto';
import {
  OutlineReviewAction,
  ReviewOutlineDto,
} from './dto/review-outline.dto';

const GROUP_OUTLINE_INCLUDE = {
  topic: {
    include: {
      lecturer: {
        include: {
          user: { select: { id: true, email: true } },
        },
      },
      round: {
        include: { projectType: true },
      },
      major: true,
      semester: true,
    },
  },
  members: {
    where: { status: GroupMemberStatus.ACCEPTED },
    include: {
      student: {
        include: {
          user: {
            select: { id: true, email: true, avatarUrl: true },
          },
        },
      },
    },
  },
  leader: {
    include: {
      user: { select: { id: true, email: true } },
    },
  },
  outline: {
    include: {
      submittedBy: {
        select: {
          id: true,
          email: true,
          studentProfile: {
            select: { fullName: true, studentCode: true },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class OutlinesService {
  private readonly logger = new Logger(OutlinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Sinh viên: Lấy thông tin nhóm & đề cương hiện tại ─────────
  async getMyGroupOutline(userId: number) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) {
      throw new NotFoundException('Hồ sơ sinh viên không tồn tại.');
    }

    const membership = await this.prisma.registrationGroupMember.findFirst({
      where: {
        studentId: student.id,
        status: GroupMemberStatus.ACCEPTED,
        group: {
          status: { not: RegistrationGroupStatus.REJECTED },
          semester: { isActive: true },
        },
      },
      select: { groupId: true },
      orderBy: { id: 'desc' },
    });

    if (!membership) {
      return {
        hasGroup: false,
        message: 'Bạn chưa tham gia nhóm nào.',
        group: null,
        outline: null,
      };
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: membership.groupId },
      include: GROUP_OUTLINE_INCLUDE,
    });

    if (!group) {
      return {
        hasGroup: false,
        message: 'Nhóm không tồn tại hoặc đã bị xóa.',
        group: null,
        outline: null,
      };
    }

    if (!group.topic) {
      return {
        hasGroup: true,
        hasTopic: false,
        message: 'Nhóm của bạn chưa được phân công hoặc đăng ký đề tài.',
        group: {
          id: group.id,
          name: group.name,
          members: group.members,
          leader: group.leader,
        },
        outline: null,
      };
    }

    return {
      hasGroup: true,
      hasTopic: true,
      group: {
        id: group.id,
        name: group.name,
        code: group.joinCode,
        topic: group.topic,
        members: group.members,
        leader: group.leader,
      },
      outline: group.outline ?? {
        status: 'NOT_SUBMITTED',
        attachmentUrl: null,
        fileName: null,
        fileSize: null,
        submittedAt: null,
        approvedAt: null,
        lecturerFeedback: null,
      },
    };
  }

  // ── Sinh viên: Upload bản scan Đề cương M03 đã có chữ ký ───────
  async submitOutline(userId: number, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Vui lòng chọn file bản scan Đề cương M03 (PDF, Word, hoặc Ảnh scan) để nộp.',
      );
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) {
      throw new NotFoundException('Hồ sơ sinh viên không tồn tại.');
    }

    const membership = await this.prisma.registrationGroupMember.findFirst({
      where: {
        studentId: student.id,
        status: GroupMemberStatus.ACCEPTED,
        group: {
          status: { not: RegistrationGroupStatus.REJECTED },
          semester: { isActive: true },
        },
      },
      select: { groupId: true },
      orderBy: { id: 'desc' },
    });

    if (!membership) {
      throw new BadRequestException(
        'Bạn chưa là thành viên chính thức của nhóm nào.',
      );
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: membership.groupId },
      include: {
        topic: {
          include: {
            lecturer: true,
            round: {
              select: {
                phase: true,
                registrationStart: true,
                registrationEnd: true,
              },
            },
          },
        },
        outline: true,
      },
    });

    if (!group || !group.topic) {
      throw new BadRequestException(
        'Nhóm chưa có đề tài được phê duyệt để nộp đề cương.',
      );
    }

    // Tải lên kho lưu trữ và validate magic bytes tài liệu
    const uploaded = await this.cloudinary.uploadDocument(file);

    return this.prisma.$transaction(async (tx) => {
      const outline = await tx.topicOutline.upsert({
        where: { groupId: group.id },
        create: {
          groupId: group.id,
          topicId: group.topic.id,
          attachmentUrl: uploaded.url,
          fileName: uploaded.fileName,
          fileSize: uploaded.bytes,
          publicId: uploaded.publicId,
          submittedById: userId,
          submittedAt: new Date(),
          status: 'SUBMITTED',
        },
        update: {
          attachmentUrl: uploaded.url,
          fileName: uploaded.fileName,
          fileSize: uploaded.bytes,
          publicId: uploaded.publicId,
          submittedById: userId,
          submittedAt: new Date(),
          status: 'SUBMITTED',
          lecturerFeedback: null,
          approvedAt: null,
        },
      });

      // Ghi audit log
      await recordAudit(tx, {
        userId,
        action: 'OUTLINE_SUBMITTED',
        targetTable: 'topic_outlines',
        targetId: outline.id,
        newValue: {
          groupId: group.id,
          topicId: group.topic.id,
          fileName: uploaded.fileName,
          fileSize: uploaded.bytes,
        },
      });

      // Thông báo cho GVHD
      const supervisorUserId = group.topic.lecturer.userId;
      await this.notifications.notify([
        {
          userId: supervisorUserId,
          type: NotificationType.OUTLINE_SUBMITTED,
          title: `Nhóm đã nộp Đề cương M03: ${group.topic.title}`,
          content: `Nhóm sinh viên "${group.name ?? `Nhóm ${group.id}`}" đã nộp bản scan Đề cương M03 lên hệ thống.`,
          targetId: group.id,
          dedupeKey: `outline_submitted_${group.id}_${Date.now()}`,
        },
      ]);

      return outline;
    });
  }

  // ── Giảng viên: Lấy danh sách đề cương các nhóm mình hướng dẫn ───
  async getLecturerOutlines(userId: number, query: QueryOutlinesDto) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
    });
    if (!lecturer) {
      throw new ForbiddenException(
        'Chỉ giảng viên mới có quyền xem danh sách này.',
      );
    }

    const where: Prisma.RegistrationGroupWhereInput = {
      topic: {
        lecturerId: lecturer.id,
        ...(query.semesterId && { semesterId: query.semesterId }),
      },
      ...(query.status && {
        outline:
          query.status === 'NOT_SUBMITTED'
            ? null
            : query.status === 'SUBMITTED'
              ? { status: { in: ['SUBMITTED', 'APPROVED_BY_LECTURER'] } }
              : { status: query.status },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { topic: { title: { contains: query.search, mode: 'insensitive' } } },
          {
            members: {
              some: {
                student: {
                  OR: [
                    {
                      fullName: { contains: query.search, mode: 'insensitive' },
                    },
                    {
                      studentCode: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      }),
    };

    const [groups, total] = await this.prisma.$transaction([
      this.prisma.registrationGroup.findMany({
        where,
        include: {
          topic: {
            include: {
              round: {
                include: { projectType: true },
              },
              major: true,
              semester: true,
            },
          },
          members: {
            where: { status: GroupMemberStatus.ACCEPTED },
            include: {
              student: {
                include: {
                  user: { select: { id: true, email: true, avatarUrl: true } },
                },
              },
            },
          },
          leader: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
          outline: {
            include: {
              submittedBy: {
                select: {
                  id: true,
                  email: true,
                  studentProfile: {
                    select: { fullName: true, studentCode: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.registrationGroup.count({ where }),
    ]);

    return {
      items: groups,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // ── Giảng viên: Phê duyệt hoặc Yêu cầu sửa Đề cương M03 ─────────
  async reviewOutline(
    outlineId: number,
    dto: ReviewOutlineDto,
    user: { id: number; role: Role },
  ) {
    const outline = await this.prisma.topicOutline.findUnique({
      where: { id: outlineId },
      include: {
        topic: {
          include: {
            lecturer: true,
            round: {
              select: {
                phase: true,
                registrationStart: true,
                registrationEnd: true,
              },
            },
          },
        },
        group: {
          include: {
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              include: {
                student: {
                  include: {
                    user: { select: { id: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!outline) {
      throw new NotFoundException('Không tìm thấy bản ghi Đề cương M03.');
    }

    // Kiểm tra quyền: Chỉ GVHD của đề tài này (hoặc Admin hệ thống) mới được duyệt
    if (
      (user.role === Role.LECTURER || user.role === Role.GVCN) &&
      outline.topic.lecturer.userId !== user.id
    ) {
      throw new ForbiddenException(
        'Bạn không phải là Giảng viên hướng dẫn của đề tài này.',
      );
    }

    if (!['SUBMITTED', 'APPROVED_BY_LECTURER'].includes(outline.status)) {
      throw new BadRequestException(
        `Đề cương hiện đang ở trạng thái "${outline.status}", không thể xử lý.`,
      );
    }

    if (
      dto.action === OutlineReviewAction.REQUEST_REVISION &&
      !dto.feedback?.trim()
    ) {
      throw new BadRequestException(
        'Vui lòng nhập lý do/góp ý khi yêu cầu sinh viên nộp lại đề cương.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const isApproved = dto.action === OutlineReviewAction.APPROVE;
      const nextStatus = isApproved ? 'APPROVED_BY_LECTURER' : 'NEEDS_REVISION';

      const updated = await tx.topicOutline.update({
        where: { id: outlineId },
        data: {
          status: nextStatus,
          approvedAt: isApproved ? new Date() : null,
          lecturerFeedback: dto.feedback?.trim() || null,
        },
      });

      // Chỉ chuyển đề tài sang IN_PROGRESS khi đợt đã chốt phân bổ (FINALIZED).
      // Nếu đợt vẫn đang mở đăng ký/điều chỉnh, giữ nguyên trạng thái OPEN để
      // không khóa chỗ trống còn lại của nhóm hoặc hiển thị nhầm "Đang làm" sớm.
      const roundPhase = outline.topic.round
        ? duePhase(outline.topic.round)
        : null;
      if (isApproved && roundPhase === RoundPhase.FINALIZED) {
        await tx.topic.updateMany({
          where: {
            id: outline.topicId,
            status: {
              in: [
                TopicStatus.APPROVED,
                TopicStatus.APPROVED_OPEN,
                TopicStatus.OPEN,
                TopicStatus.ASSIGNED,
              ],
            },
          },
          data: {
            status: TopicStatus.IN_PROGRESS,
          },
        });
      }

      // Ghi audit log
      await recordAudit(tx, {
        userId: user.id,
        action: isApproved ? 'OUTLINE_APPROVED' : 'OUTLINE_REVISION_REQUESTED',
        targetTable: 'topic_outlines',
        targetId: outline.id,
        newValue: {
          status: nextStatus,
          feedback: dto.feedback?.trim() || null,
        },
      });

      // Gửi thông báo đến tất cả thành viên trong nhóm sinh viên
      const notices = outline.group.members.map((m) => ({
        userId: m.student.user.id,
        type: isApproved
          ? NotificationType.OUTLINE_APPROVED
          : NotificationType.OUTLINE_REVISION_REQUESTED,
        title: isApproved
          ? `Đề cương M03 đã được duyệt: ${outline.topic.title}`
          : `Yêu cầu chỉnh sửa Đề cương M03: ${outline.topic.title}`,
        content: isApproved
          ? `Giảng viên hướng dẫn đã chính thức phê duyệt bản Đề cương M03 của nhóm bạn. Đề tài bắt đầu bước vào giai đoạn thực hiện!`
          : `Giảng viên hướng dẫn yêu cầu chỉnh sửa/nộp lại Đề cương M03: "${dto.feedback?.trim()}". Vui lòng kiểm tra và upload lại.`,
        targetId: outline.groupId,
        dedupeKey: `outline_review_${outline.id}_${Date.now()}_${m.student.user.id}`,
      }));

      await this.notifications.notify(notices);

      return updated;
    });
  }

  // ── Giáo vụ & Khoa: Báo cáo tổng hợp Đề cương M03 toàn Khoa ────
  async getFacultyOutlines(
    user: { id: number; role: Role },
    query: QueryOutlinesDto,
  ) {
    await this.assertFacultyReader(user);

    const topicScope: Prisma.TopicWhereInput = {
      ...(query.semesterId && { semesterId: query.semesterId }),
      ...(query.roundId && { roundId: query.roundId }),
      ...(query.majorId && { majorId: query.majorId }),
    };
    const hasTopicScope = Object.keys(topicScope).length > 0;

    const baseGroupWhere: Prisma.RegistrationGroupWhereInput = {
      status: { not: RegistrationGroupStatus.REJECTED },
      ...(query.semesterId && { semesterId: query.semesterId }),
      ...(hasTopicScope && { topic: topicScope }),
    };

    const where: Prisma.RegistrationGroupWhereInput = {
      ...baseGroupWhere,
      ...(query.status && {
        outline:
          query.status === 'NOT_SUBMITTED'
            ? null
            : query.status === 'SUBMITTED'
              ? { status: { in: ['SUBMITTED', 'APPROVED_BY_LECTURER'] } }
              : { status: query.status },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { topic: { title: { contains: query.search, mode: 'insensitive' } } },
          {
            topic: {
              lecturer: {
                fullName: { contains: query.search, mode: 'insensitive' },
              },
            },
          },
          {
            members: {
              some: {
                status: GroupMemberStatus.ACCEPTED,
                student: {
                  OR: [
                    {
                      fullName: { contains: query.search, mode: 'insensitive' },
                    },
                    {
                      studentCode: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      }),
    };

    const [
      groups,
      total,
      totalWithTopic,
      approvedCount,
      submittedCount,
      needsRevisionCount,
    ] = await this.prisma.$transaction([
      this.prisma.registrationGroup.findMany({
        where,
        include: {
          topic: {
            include: {
              lecturer: {
                select: { id: true, fullName: true, academicTitle: true },
              },
              round: {
                include: { projectType: true },
              },
              major: true,
              semester: true,
            },
          },
          members: {
            where: { status: GroupMemberStatus.ACCEPTED },
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                  class: true,
                },
              },
            },
          },
          leader: {
            select: { id: true, fullName: true, studentCode: true },
          },
          outline: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.registrationGroup.count({ where }),
      this.prisma.registrationGroup.count({ where: baseGroupWhere }),
      this.prisma.registrationGroup.count({
        where: {
          ...baseGroupWhere,
          outline: { status: 'APPROVED_BY_LECTURER' },
        },
      }),
      this.prisma.registrationGroup.count({
        where: { ...baseGroupWhere, outline: { status: 'SUBMITTED' } },
      }),
      this.prisma.registrationGroup.count({
        where: { ...baseGroupWhere, outline: { status: 'NEEDS_REVISION' } },
      }),
    ]);

    const notSubmittedCount = Math.max(
      0,
      totalWithTopic - (approvedCount + submittedCount + needsRevisionCount),
    );

    const semesterIds = [
      ...new Set(
        groups
          .map((g) => g.topic?.semesterId ?? g.semesterId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    const topicOrderMap = await this.getTopicOrderMap(semesterIds);

    return {
      items: groups.map((group) => ({
        ...group,
        topicOrder: topicOrderMap.get(group.topicId) ?? null,
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      stats: {
        totalGroups: totalWithTopic,
        approved: approvedCount,
        submitted: submittedCount,
        needsRevision: needsRevisionCount,
        notSubmitted: notSubmittedCount,
      },
    };
  }

  async downloadFacultyOutlineFile(
    outlineId: number,
    user: { id: number; role: Role },
  ): Promise<{ buffer: Buffer; fileName: string }> {
    await this.assertFacultyReader(user);

    const outline = await this.prisma.topicOutline.findUnique({
      where: { id: outlineId },
      select: { id: true, attachmentUrl: true, fileName: true, groupId: true },
    });

    if (!outline?.attachmentUrl) {
      throw new NotFoundException('Không tìm thấy tệp bản scan Đề cương M03.');
    }

    const buffer = await this.fetchAttachmentBuffer(outline.attachmentUrl);
    const fileName = sanitizeZipEntryName(
      outline.fileName || `De_cuong_M03_nhom_${outline.groupId}.pdf`,
    );
    return { buffer, fileName };
  }

  async downloadFacultyOutlinesZip(
    dto: BulkOutlineGroupIdsDto,
    user: { id: number; role: Role },
  ): Promise<{ buffer: Buffer; fileCount: number }> {
    await this.assertFacultyReader(user);

    const uniqueGroupIds = [...new Set(dto.groupIds)];
    const groups = await this.prisma.registrationGroup.findMany({
      where: {
        id: { in: uniqueGroupIds },
        status: { not: RegistrationGroupStatus.REJECTED },
      },
      select: {
        id: true,
        topicId: true,
        semesterId: true,
        outline: {
          select: { id: true, attachmentUrl: true, fileName: true },
        },
      },
    });

    const downloadable = groups.filter((g) =>
      Boolean(g.outline?.attachmentUrl),
    );
    if (downloadable.length === 0) {
      throw new BadRequestException(
        'Các nhóm đã chọn chưa có bản scan Đề cương M03 nào để tải.',
      );
    }

    const semesterIds = [...new Set(downloadable.map((g) => g.semesterId))];
    const topicOrderMap = await this.getTopicOrderMap(semesterIds);

    const usedNames = new Set<string>();
    const targets = downloadable.map((group) => {
      const order = topicOrderMap.get(group.topicId);
      const groupPrefix = order
        ? `Nhom_${String(order).padStart(2, '0')}`
        : `Nhom_${group.id}`;
      const rawName = group.outline!.fileName || 'De_cuong_M03.pdf';
      const ext = extname(rawName) || '.pdf';
      const base = sanitizeZipEntryName(rawName.replace(/\.[^/.]+$/, ''));
      let candidate = `${groupPrefix}_${base}${ext}`;
      let seq = 2;
      while (usedNames.has(candidate)) {
        candidate = `${groupPrefix}_${base}_${seq}${ext}`;
        seq += 1;
      }
      usedNames.add(candidate);

      return {
        name: candidate,
        url: group.outline!.attachmentUrl!,
      };
    });

    const entries = await mapWithConcurrency(targets, 5, async (target) => ({
      name: target.name,
      data: await this.fetchAttachmentBuffer(target.url),
    }));

    return {
      buffer: buildZipArchive(entries),
      fileCount: entries.length,
    };
  }

  async remindFacultyOutlines(
    dto: BulkOutlineGroupIdsDto,
    user: { id: number; role: Role },
  ): Promise<{ remindedGroups: number; recipientCount: number }> {
    await this.assertFacultyReader(user);

    const uniqueGroupIds = [...new Set(dto.groupIds)];
    const groups = await this.prisma.registrationGroup.findMany({
      where: {
        id: { in: uniqueGroupIds },
        status: { not: RegistrationGroupStatus.REJECTED },
        OR: [
          { outline: { is: null } },
          { outline: { is: { status: 'NEEDS_REVISION' } } },
        ],
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
              select: { user: { select: { id: true } } },
            },
          },
        },
      },
    });

    const seenUsers = new Set<number>();
    const notices: Array<{
      userId: number;
      type: NotificationType;
      title: string;
      content: string;
      targetId: number;
    }> = [];

    let remindedGroups = 0;
    for (const group of groups) {
      if (group.members.length === 0) continue;
      remindedGroups += 1;
      for (const member of group.members) {
        const memberUserId = member.student.user.id;
        if (seenUsers.has(memberUserId)) continue;
        seenUsers.add(memberUserId);
        notices.push({
          userId: memberUserId,
          type: NotificationType.SUBMISSION_DUE_SOON,
          title: 'Nhắc nộp bản scan Đề cương M03',
          content: `Giáo vụ Khoa nhắc nhóm thực hiện đề tài "${group.topic.title}" hoàn thiện và nộp bản scan Đề cương chi tiết (Mẫu M03) tại mục Bài nộp.`,
          targetId: group.id,
        });
      }
    }

    if (notices.length === 0) {
      throw new ConflictException(
        'Các nhóm đã chọn đều đã nộp bản scan Đề cương M03.',
      );
    }

    await this.notifications.notify(notices);

    await recordAudit(this.prisma, {
      userId: user.id,
      action: 'FACULTY_OUTLINE_REMINDER',
      targetTable: 'registration_groups',
      targetId: groups.map((g) => g.id).join(','),
      newValue: {
        remindedGroups,
        recipientCount: notices.length,
      },
    }).catch(() => undefined);

    return {
      remindedGroups,
      recipientCount: notices.length,
    };
  }

  private async assertFacultyReader(user: { id: number; role: Role }) {
    if (user.role === Role.LECTURER || user.role === Role.GVCN) {
      const lecturer = await this.prisma.lecturerProfile.findUnique({
        where: { userId: user.id },
      });
      if (
        !lecturer ||
        (!lecturer.isAcademicAssistant && !lecturer.isHeadOfDepartment)
      ) {
        throw new ForbiddenException(
          'Chỉ Trợ lý Giáo vụ hoặc Tổ trưởng Bộ môn mới có quyền xem báo cáo này.',
        );
      }
    }
  }

  private async getTopicOrderMap(
    semesterIds: number[],
  ): Promise<Map<number, number>> {
    const orderMap = new Map<number, number>();
    if (semesterIds.length === 0) return orderMap;

    const topics = await this.prisma.topic.findMany({
      where: { semesterId: { in: semesterIds } },
      select: { id: true, semesterId: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const perSemesterCount = new Map<number, number>();
    for (const topic of topics) {
      const next = (perSemesterCount.get(topic.semesterId) ?? 0) + 1;
      perSemesterCount.set(topic.semesterId, next);
      orderMap.set(topic.id, next);
    }

    return orderMap;
  }

  private isAllowedAttachmentUrl(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'https:') return false;
      return (
        parsed.hostname === 'res.cloudinary.com' ||
        parsed.hostname.endsWith('.cloudinary.com')
      );
    } catch {
      return false;
    }
  }

  private async fetchAttachmentBuffer(url: string): Promise<Buffer> {
    if (!this.isAllowedAttachmentUrl(url)) {
      throw new BadRequestException('Đường dẫn tài liệu không hợp lệ.');
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      this.logger.warn(
        `Failed to fetch outline attachment (${response.status}): ${url}`,
      );
      throw new BadRequestException(
        'Không thể tải bản scan từ kho lưu trữ. Vui lòng thử lại.',
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 30 * 1024 * 1024) {
      throw new BadRequestException('Tệp vượt quá giới hạn tải xuống.');
    }

    return Buffer.from(arrayBuffer);
  }
}

function sanitizeZipEntryName(raw: string): string {
  return (
    raw
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'De_cuong_M03'
  );
}
