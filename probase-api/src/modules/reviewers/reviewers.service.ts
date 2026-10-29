import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  NotificationType,
  Prisma,
  Role,
} from '../../../generated/prisma/client';
import type { RequestUser } from '../auth/guards/roles.guard';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AssignReviewerDto } from './dto/assign-reviewer.dto';
import { AutoAssignReviewersDto } from './dto/auto-assign-reviewers.dto';
import { QueryReviewAssignmentsDto } from './dto/query-review-assignments.dto';

@Injectable()
export class ReviewersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // 1. TỔNG QUAN PHÂN CÔNG (TTBM & ADMIN)
  // ─────────────────────────────────────────────────────────

  async getAssignmentsOverview(
    user: RequestUser,
    query: QueryReviewAssignmentsDto,
  ) {
    const isHodOnly =
      user.role === Role.LECTURER &&
      user.lecturerProfile?.isHeadOfDepartment &&
      !user.lecturerProfile?.isFacultyBoard &&
      !user.lecturerProfile?.isAcademicAssistant;

    // Giới hạn phạm vi theo Bộ môn của TTBM
    const targetMajorId = isHodOnly
      ? user.lecturerProfile?.majorId ?? undefined
      : query.majorId;

    // Điều kiện lọc nhóm đồ án
    const whereGroup: Prisma.RegistrationGroupWhereInput = {
      ...(targetMajorId ? { topic: { majorId: targetMajorId } } : {}),
      ...(query.roundId ? { topic: { roundId: query.roundId } } : {}),
    };

    if (query.status === 'ASSIGNED') {
      whereGroup.assignment = { isNot: null };
    } else if (query.status === 'UNASSIGNED') {
      whereGroup.assignment = null;
    }

    if (query.q) {
      whereGroup.OR = [
        { topic: { title: { contains: query.q, mode: 'insensitive' } } },
        { name: { contains: query.q, mode: 'insensitive' } },
        {
          topic: {
            lecturer: { fullName: { contains: query.q, mode: 'insensitive' } },
          },
        },
      ];
    }

    // 1. Truy vấn danh sách các nhóm đồ án
    const groups = await this.prisma.registrationGroup.findMany({
      where: whereGroup,
      include: {
        topic: {
          include: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
                lecturerCode: true,
                majorId: true,
              },
            },
            major: true,
            round: {
              select: {
                id: true,
                semesterId: true,
                semester: { select: { id: true, name: true } },
                projectType: { select: { id: true, name: true } },
              },
            },
          },
        },
        assignment: {
          include: {
            reviewer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
                lecturerCode: true,
                majorId: true,
                major: { select: { id: true, name: true, code: true } },
              },
            },
            assignedBy: {
              select: { id: true, email: true },
            },
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
        outline: {
          select: {
            id: true,
            status: true,
            attachmentUrl: true,
            fileName: true,
          },
        },
        progressReports: {
          select: {
            id: true,
            stage: true,
            finalStageGrade: true,
            workloadPercentage: true,
            isPassed: true,
            reportFileUrl: true,
            reportFileName: true,
            sourceCodeUrl: true,
            submittedAt: true,
          },
        },
      },
      orderBy: [{ topic: { majorId: 'asc' } }, { id: 'asc' }],
    });

    // 2. Truy vấn danh sách Giảng viên khả dụng để chọn phản biện
    const candidateLecturers = await this.prisma.lecturerProfile.findMany({
      where: {
        user: { isActive: true },
        ...(targetMajorId ? { majorId: targetMajorId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        academicTitle: true,
        lecturerCode: true,
        majorId: true,
        major: { select: { id: true, name: true, code: true } },
        isHeadOfDepartment: true,
        topics: {
          select: { id: true },
        },
        reviewerAssignments: {
          select: { id: true },
        },
      },
      orderBy: [{ majorId: 'asc' }, { fullName: 'asc' }],
    });

    const candidates = candidateLecturers.map((lecturer) => ({
      id: lecturer.id,
      fullName: lecturer.fullName,
      academicTitle: lecturer.academicTitle,
      lecturerCode: lecturer.lecturerCode,
      majorId: lecturer.majorId,
      major: lecturer.major,
      isHeadOfDepartment: lecturer.isHeadOfDepartment,
      supervisedCount: lecturer.topics.length,
      reviewingCount: lecturer.reviewerAssignments.length,
    }));

    const totalGroups = groups.length;
    const assignedCount = groups.filter((g) => g.assignment !== null).length;
    const unassignedCount = totalGroups - assignedCount;

    return {
      stats: {
        totalGroups,
        assignedCount,
        unassignedCount,
      },
      groups,
      candidates,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 2. PHÂN CÔNG THỦ CÔNG (MANUAL ASSIGN)
  // ─────────────────────────────────────────────────────────

  async assignReviewer(user: RequestUser, dto: AssignReviewerDto) {
    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: dto.groupId },
      include: {
        topic: {
          include: {
            lecturer: true,
            major: true,
          },
        },
        assignment: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm đồ án.');
    }

    // Kiểm tra quyền TTBM theo chuyên môn
    const isHodOnly =
      user.role === Role.LECTURER &&
      user.lecturerProfile?.isHeadOfDepartment &&
      !user.lecturerProfile?.isFacultyBoard &&
      !user.lecturerProfile?.isAcademicAssistant;

    if (
      isHodOnly &&
      group.topic.majorId &&
      user.lecturerProfile?.majorId &&
      group.topic.majorId !== user.lecturerProfile.majorId
    ) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền phân công cho các đề tài thuộc Tổ bộ môn mình phụ trách.',
      );
    }

    const reviewer = await this.prisma.lecturerProfile.findUnique({
      where: { id: dto.reviewerId },
      include: { user: true, major: true },
    });

    if (!reviewer) {
      throw new NotFoundException('Không tìm thấy Giảng viên phản biện.');
    }

    // RÀNG BUỘC 1: Không được vừa hướng dẫn vừa phản biện
    if (group.topic.lecturerId === reviewer.id) {
      throw new BadRequestException(
        'Giảng viên hướng dẫn không được phân công làm phản biện cho chính đề tài này.',
      );
    }

    // RÀNG BUỘC 2: Đúng chuyên môn / Bộ môn
    if (
      group.topic.majorId &&
      reviewer.majorId &&
      group.topic.majorId !== reviewer.majorId
    ) {
      throw new BadRequestException(
        `Giảng viên phản biện phải thuộc cùng Chuyên ngành / Bộ môn với đề tài (${group.topic.major?.name ?? 'Bộ môn'}).`,
      );
    }

    // Thực hiện lưu phân công
    const assignment = await this.prisma.topicAssignment.upsert({
      where: { groupId: dto.groupId },
      create: {
        groupId: dto.groupId,
        topicId: group.topicId,
        supervisorId: group.topic.lecturerId,
        reviewerId: reviewer.id,
        assignedById: user.id,
        assignedAt: new Date(),
      },
      update: {
        reviewerId: reviewer.id,
        assignedById: user.id,
        assignedAt: new Date(),
      },
      include: {
        reviewer: {
          select: {
            id: true,
            fullName: true,
            academicTitle: true,
            majorId: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            topic: { select: { title: true } },
          },
        },
      },
    });

    // Bắn thông báo in-app cho Giảng viên phản biện
    await this.notifications.notify([
      {
        userId: reviewer.user.id,
        type: NotificationType.REVIEWER_ASSIGNED,
        title: 'Phân công Giảng viên phản biện',
        content: `Thầy/Cô đã được phân công phản biện đề tài "${group.topic.title}".`,
        targetId: dto.groupId,
      },
    ]);

    return assignment;
  }

  // ─────────────────────────────────────────────────────────
  // 3. HỦY PHÂN CÔNG (UNASSIGN)
  // ─────────────────────────────────────────────────────────

  async unassignReviewer(user: RequestUser, groupId: number) {
    const assignment = await this.prisma.topicAssignment.findUnique({
      where: { groupId },
      include: {
        topic: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Nhóm này chưa được phân công phản biện.');
    }

    const isHodOnly =
      user.role === Role.LECTURER &&
      user.lecturerProfile?.isHeadOfDepartment &&
      !user.lecturerProfile?.isFacultyBoard &&
      !user.lecturerProfile?.isAcademicAssistant;

    if (
      isHodOnly &&
      assignment.topic.majorId &&
      user.lecturerProfile?.majorId &&
      assignment.topic.majorId !== user.lecturerProfile.majorId
    ) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền hủy phân công của các đề tài thuộc Tổ bộ môn mình phụ trách.',
      );
    }

    await this.prisma.topicAssignment.delete({
      where: { groupId },
    });

    return {
      success: true,
      message: 'Đã hủy phân công Giảng viên phản biện thành công.',
    };
  }

  // ─────────────────────────────────────────────────────────
  // 4. PHÂN CÔNG TỰ ĐỘNG (GREEDY MIN-LOAD BALANCER)
  // ─────────────────────────────────────────────────────────

  async autoAssign(user: RequestUser, dto: AutoAssignReviewersDto) {
    const maxReviews = dto.maxReviewsPerLecturer ?? 7;

    const isHodOnly =
      user.role === Role.LECTURER &&
      user.lecturerProfile?.isHeadOfDepartment &&
      !user.lecturerProfile?.isFacultyBoard &&
      !user.lecturerProfile?.isAcademicAssistant;

    const targetMajorId = isHodOnly
      ? user.lecturerProfile?.majorId ?? undefined
      : dto.majorId;

    const whereUnassigned: Prisma.RegistrationGroupWhereInput = {
      assignment: null,
      ...(targetMajorId ? { topic: { majorId: targetMajorId } } : {}),
      ...(dto.roundId ? { topic: { roundId: dto.roundId } } : {}),
    };

    // 1. Tìm các nhóm chưa có phân công phản biện
    const unassignedGroups = await this.prisma.registrationGroup.findMany({
      where: whereUnassigned,
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            lecturerId: true,
            majorId: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (unassignedGroups.length === 0) {
      return {
        assignedCount: 0,
        unassignedCount: 0,
        message: 'Tất cả các đề tài đã được phân công phản biện.',
        assignments: [],
        unassigned: [],
      };
    }

    // 2. Lấy danh sách giảng viên khả dụng
    const candidates = await this.prisma.lecturerProfile.findMany({
      where: {
        user: { isActive: true },
        ...(targetMajorId ? { majorId: targetMajorId } : {}),
      },
      include: {
        user: { select: { id: true } },
        topics: { select: { id: true } },
        reviewerAssignments: { select: { id: true } },
      },
    });

    if (candidates.length === 0) {
      throw new BadRequestException(
        'Không có giảng viên nào trong bộ môn để phân công phản biện.',
      );
    }

    const candidatePool = candidates.map((c) => ({
      id: c.id,
      userId: c.user.id,
      fullName: c.fullName,
      majorId: c.majorId,
      supervisedCount: c.topics.length,
      reviewingCount: c.reviewerAssignments.length,
    }));

    const assignmentsToCreate: Array<{
      groupId: number;
      topicId: number;
      supervisorId: number;
      reviewerId: number;
      reviewerUserId: number;
      topicTitle: string;
      reviewerName: string;
    }> = [];

    const unassignedList: Array<{
      groupId: number;
      topicTitle: string;
      reason: string;
    }> = [];

    // 3. Ghép cặp tối ưu tải (Min-load Balancer)
    for (const group of unassignedGroups) {
      const eligible = candidatePool.filter((c) => {
        // RÀNG BUỘC 1: Không trùng GVHD
        if (c.id === group.topic.lecturerId) return false;
        // RÀNG BUỘC 2: Đúng chuyên môn
        if (
          group.topic.majorId &&
          c.majorId &&
          group.topic.majorId !== c.majorId
        )
          return false;
        // RÀNG BUỘC 3: Chưa vượt quá tải tối đa
        if (c.reviewingCount >= maxReviews) return false;
        return true;
      });

      if (eligible.length === 0) {
        unassignedList.push({
          groupId: group.id,
          topicTitle: group.topic.title,
          reason:
            'Không còn giảng viên thỏa mãn (đã đạt ngưỡng tối đa hoặc trùng GVHD).',
        });
        continue;
      }

      // Ưu tiên giảng viên có số đề tài phản biện ít nhất, sau đó ít đề tài hướng dẫn nhất
      eligible.sort((a, b) => {
        if (a.reviewingCount !== b.reviewingCount) {
          return a.reviewingCount - b.reviewingCount;
        }
        return a.supervisedCount - b.supervisedCount;
      });

      const chosen = eligible[0];
      chosen.reviewingCount += 1;

      assignmentsToCreate.push({
        groupId: group.id,
        topicId: group.topic.id,
        supervisorId: group.topic.lecturerId,
        reviewerId: chosen.id,
        reviewerUserId: chosen.userId,
        topicTitle: group.topic.title,
        reviewerName: chosen.fullName,
      });
    }

    // 4. Lưu đồng loạt vào Database
    if (assignmentsToCreate.length > 0) {
      await this.prisma.$transaction(
        assignmentsToCreate.map((item) =>
          this.prisma.topicAssignment.upsert({
            where: { groupId: item.groupId },
            create: {
              groupId: item.groupId,
              topicId: item.topicId,
              supervisorId: item.supervisorId,
              reviewerId: item.reviewerId,
              assignedById: user.id,
              assignedAt: new Date(),
            },
            update: {
              reviewerId: item.reviewerId,
              assignedById: user.id,
              assignedAt: new Date(),
            },
          }),
        ),
      );

      // Gửi thông báo đến các Giảng viên được phân công
      const notices = assignmentsToCreate.map((item) => ({
        userId: item.reviewerUserId,
        type: NotificationType.REVIEWER_ASSIGNED,
        title: 'Phân công Giảng viên phản biện (Tự động)',
        content: `Thầy/Cô đã được phân công phản biện đề tài "${item.topicTitle}".`,
        targetId: item.groupId,
      }));

      await this.notifications.notify(notices);
    }

    return {
      assignedCount: assignmentsToCreate.length,
      unassignedCount: unassignedList.length,
      assignments: assignmentsToCreate,
      unassigned: unassignedList,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 5. PHÍA GIẢNG VIÊN PHẢN BIỆN (LECTURER MY REVIEWS)
  // ─────────────────────────────────────────────────────────

  async getMyReviewAssignments(userId: number) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
    });

    if (!lecturer) {
      throw new NotFoundException('Hồ sơ giảng viên không tồn tại.');
    }

    const assignments = await this.prisma.topicAssignment.findMany({
      where: { reviewerId: lecturer.id },
      include: {
        topic: {
          include: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
                lecturerCode: true,
              },
            },
            major: true,
            round: {
              select: {
                id: true,
                semesterId: true,
                semester: { select: { id: true, name: true } },
                projectType: { select: { id: true, name: true } },
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
                  select: {
                    id: true,
                    fullName: true,
                    studentCode: true,
                    class: true,
                  },
                },
              },
            },
            outline: {
              select: {
                id: true,
                status: true,
                attachmentUrl: true,
                fileName: true,
                approvedAt: true,
              },
            },
            progressReports: {
              select: {
                id: true,
                stage: true,
                reportFileUrl: true,
                reportFileName: true,
                sourceCodeUrl: true,
                workloadPercentage: true,
                isPassed: true,
                supervisorGrade: true,
                reviewerGrade: true,
                finalStageGrade: true,
                submittedAt: true,
              },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments;
  }
}
