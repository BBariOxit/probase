import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  NotificationType,
  Prisma,
  Role,
  TopicStatus,
} from '../../generated/prisma/client';
import { recordAudit } from '../audit/audit-entry';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryOutlinesDto } from './dto/query-outlines.dto';
import { OutlineReviewAction, ReviewOutlineDto } from './dto/review-outline.dto';

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
      },
      select: { groupId: true },
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
      },
      select: { groupId: true },
    });

    if (!membership) {
      throw new BadRequestException('Bạn chưa là thành viên chính thức của nhóm nào.');
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: membership.groupId },
      include: {
        topic: {
          include: {
            lecturer: true,
          },
        },
        outline: true,
      },
    });

    if (!group || !group.topic) {
      throw new BadRequestException('Nhóm chưa có đề tài được phê duyệt để nộp đề cương.');
    }

    if (group.outline?.status === 'APPROVED_BY_LECTURER') {
      throw new BadRequestException(
        'Đề cương M03 đã được Giảng viên hướng dẫn phê duyệt. Không thể nộp lại bản khác.',
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
          title: `Đề cương M03 mới cần duyệt: ${group.topic.title}`,
          content: `Nhóm sinh viên "${group.name ?? `Nhóm ${group.id}`}" đã nộp bản scan Đề cương M03. Vui lòng vào kiểm tra và duyệt.`,
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
      throw new ForbiddenException('Chỉ giảng viên mới có quyền xem danh sách này.');
    }

    const where: Prisma.RegistrationGroupWhereInput = {
      topic: {
        lecturerId: lecturer.id,
        ...(query.semesterId && { semesterId: query.semesterId }),
      },
      ...(query.status && {
        outline: query.status === 'NOT_SUBMITTED'
          ? null
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
                    { fullName: { contains: query.search, mode: 'insensitive' } },
                    { studentCode: { contains: query.search, mode: 'insensitive' } },
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
    if (user.role === Role.LECTURER && outline.topic.lecturer.userId !== user.id) {
      throw new ForbiddenException(
        'Bạn không phải là Giảng viên hướng dẫn của đề tài này.',
      );
    }

    if (outline.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Đề cương hiện đang ở trạng thái "${outline.status}", không thể xử lý.`,
      );
    }

    if (dto.action === OutlineReviewAction.REQUEST_REVISION && !dto.feedback?.trim()) {
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

      // Nếu duyệt đề cương, cập nhật Topic sang IN_PROGRESS nếu đang là APPROVED/OPEN/ASSIGNED
      if (isApproved) {
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
    // Chỉ Admin hoặc GV có cờ kiêm nhiệm (TLGV, TTBM, BCN Khoa) mới được truy cập
    if (user.role === Role.LECTURER) {
      const lecturer = await this.prisma.lecturerProfile.findUnique({
        where: { userId: user.id },
      });
      if (
        !lecturer ||
        (!lecturer.isAcademicAssistant &&
          !lecturer.isHeadOfDepartment &&
          !lecturer.isFacultyBoard)
      ) {
        throw new ForbiddenException(
          'Chỉ Trợ lý Giáo vụ, Tổ trưởng Bộ môn hoặc Ban Chủ nhiệm Khoa mới có quyền xem báo cáo này.',
        );
      }
    }

    const where: Prisma.RegistrationGroupWhereInput = {
      ...(query.semesterId && {
        topic: { semesterId: query.semesterId },
      }),
      ...(query.status && {
        outline: query.status === 'NOT_SUBMITTED'
          ? null
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
        ],
      }),
    };

    const [groups, total, totalWithTopic, approvedCount, submittedCount, needsRevisionCount] =
      await this.prisma.$transaction([
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
        this.prisma.registrationGroup.count({
          where: {
            ...(query.semesterId && { topic: { semesterId: query.semesterId } }),
          },
        }),
        this.prisma.topicOutline.count({
          where: {
            status: 'APPROVED_BY_LECTURER',
            ...(query.semesterId && { topic: { semesterId: query.semesterId } }),
          },
        }),
        this.prisma.topicOutline.count({
          where: {
            status: 'SUBMITTED',
            ...(query.semesterId && { topic: { semesterId: query.semesterId } }),
          },
        }),
        this.prisma.topicOutline.count({
          where: {
            status: 'NEEDS_REVISION',
            ...(query.semesterId && { topic: { semesterId: query.semesterId } }),
          },
        }),
      ]);

    const notSubmittedCount = Math.max(
      0,
      totalWithTopic - (approvedCount + submittedCount + needsRevisionCount),
    );

    return {
      items: groups,
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
}
