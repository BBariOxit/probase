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
import { recordAudit } from '../../core/audit/audit-entry';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { RequestUser } from '../auth/guards/roles.guard';
import { QueryDefenseEligibilityDto } from './dto/query-defense-eligibility.dto';
import { SubmitTopicReviewDto } from './dto/submit-topic-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Giảng viên (GVHD hoặc GVPB) nộp hoặc cập nhật Phiếu nhận xét (M02/M04 hoặc M05).
   * Hệ thống tự động xác định vai trò, kiểm tra quyền và lưu cờ isDefenseAllowed.
   */
  async submitReview(user: RequestUser, dto: SubmitTopicReviewDto) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!lecturer) {
      throw new ForbiddenException('Hồ sơ giảng viên không tồn tại.');
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: dto.groupId },
      include: {
        topic: {
          include: {
            round: {
              include: {
                projectType: true,
              },
            },
            lecturer: true,
          },
        },
        assignment: {
          include: {
            reviewer: true,
          },
        },
        members: {
          where: { status: GroupMemberStatus.ACCEPTED },
          include: { student: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Nhóm đồ án không tồn tại.');
    }

    if (!group.topic) {
      throw new BadRequestException('Nhóm chưa được gán đề tài.');
    }

    // Xác định vai trò: GVHD (SUPERVISOR) hay GVPB (REVIEWER)
    let reviewerType: 'SUPERVISOR' | 'REVIEWER';
    const isSupervisor = group.topic.lecturerId === lecturer.id;
    const isReviewer = group.assignment?.reviewerId === lecturer.id;

    if (isSupervisor) {
      reviewerType = 'SUPERVISOR';
      // Kiểm tra loại mẫu biểu: KLTN -> M04; ĐACS/ĐACN -> M02
      const projectTypeCode = group.topic.round?.projectType?.code;
      const expectedTemplate = projectTypeCode === 'KLTN' ? 'M04' : 'M02';
      if (dto.templateCode !== expectedTemplate) {
        dto.templateCode = expectedTemplate;
      }
    } else if (isReviewer) {
      reviewerType = 'REVIEWER';
      if (dto.templateCode !== 'M05') {
        dto.templateCode = 'M05';
      }
    } else {
      throw new ForbiddenException(
        'Bạn không phải là Giảng viên hướng dẫn hoặc Giảng viên phản biện của nhóm này.',
      );
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.topicReview.upsert({
        where: {
          groupId_reviewerType: {
            groupId: group.id,
            reviewerType,
          },
        },
        update: {
          lecturerId: lecturer.id,
          templateCode: dto.templateCode,
          evaluationCriteria: dto.evaluationCriteria as Prisma.InputJsonValue,
          generalComment: dto.generalComment,
          isDefenseAllowed: dto.isDefenseAllowed,
          signedAt: new Date(),
        },
        create: {
          groupId: group.id,
          lecturerId: lecturer.id,
          reviewerType,
          templateCode: dto.templateCode,
          evaluationCriteria: dto.evaluationCriteria as Prisma.InputJsonValue,
          generalComment: dto.generalComment,
          isDefenseAllowed: dto.isDefenseAllowed,
          signedAt: new Date(),
        },
        include: {
          lecturer: {
            select: {
              id: true,
              fullName: true,
              academicTitle: true,
              lecturerCode: true,
            },
          },
        },
      });

      await recordAudit(tx, {
        userId: user.id,
        action: 'SUBMIT_TOPIC_REVIEW',
        targetTable: 'topic_reviews',
        targetId: saved.id,
        newValue: {
          groupId: group.id,
          reviewerType,
          templateCode: dto.templateCode,
          isDefenseAllowed: dto.isDefenseAllowed,
        },
      });

      return saved;
    });

    // Phát thông báo in-app cho toàn bộ thành viên nhóm sinh viên
    const roleTitle = reviewerType === 'SUPERVISOR' ? 'GVHD' : 'GVPB';
    const resultText = dto.isDefenseAllowed
      ? 'ĐỒNG Ý CHO PHÉP BẢO VỆ'
      : 'KHÔNG ĐỒNG Ý CHO PHÉP BẢO VỆ';

    const notices = group.members.map((m) => ({
      userId: m.student.userId,
      type: NotificationType.SUBMISSION_FEEDBACK,
      title: `${roleTitle} đã gửi Phiếu nhận xét (${dto.templateCode})`,
      content: `Thầy/Cô ${lecturer.fullName} (${roleTitle}) đã hoàn tất Phiếu nhận xét cho đề tài "${group.topic.title}". Kết luận: ${resultText}.`,
      targetId: group.id,
    }));

    if (notices.length > 0) {
      await this.notifications.notify(notices);
    }

    return review;
  }

  /**
   * Lấy chi tiết các phiếu nhận xét và trạng thái điều kiện bảo vệ của một nhóm.
   */
  async getGroupReviews(groupId: number, user: RequestUser) {
    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: groupId },
      include: {
        topic: {
          include: {
            round: {
              include: {
                projectType: true,
              },
            },
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
                lecturerCode: true,
              },
            },
            major: true,
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
              },
            },
          },
        },
        members: {
          where: { status: GroupMemberStatus.ACCEPTED },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                fullName: true,
                class: true,
                userId: true,
              },
            },
          },
        },
        reviews: {
          include: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
                lecturerCode: true,
              },
            },
          },
        },
        progressReports: {
          where: { stage: 'STAGE_2' },
          select: {
            id: true,
            stage: true,
            isPassed: true,
            workloadPercentage: true,
            supervisorGrade: true,
            reviewerGrade: true,
            finalStageGrade: true,
            reportFileUrl: true,
            sourceCodeUrl: true,
          },
        },
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            submissionUrl: true,
            submittedAt: true,
            requirement: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Nhóm đồ án không tồn tại.');
    }

    // Kiểm tra phân quyền truy cập
    if (user.role === Role.STUDENT) {
      const isMember = group.members.some((m) => m.student.userId === user.id);
      if (!isMember) {
        throw new ForbiddenException('Bạn không phải là thành viên của nhóm này.');
      }
    } else if (
      user.role === Role.LECTURER &&
      !user.lecturerProfile?.isHeadOfDepartment &&
      !user.lecturerProfile?.isAcademicAssistant
    ) {
      const lecturerId = user.lecturerProfile?.id;
      const isSupervisor = group.topic?.lecturerId === lecturerId;
      const isReviewer = group.assignment?.reviewerId === lecturerId;
      if (!isSupervisor && !isReviewer) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập phiếu nhận xét của nhóm này.',
        );
      }
    }

    const supervisorReview =
      group.reviews.find((r) => r.reviewerType === 'SUPERVISOR') ?? null;
    const reviewerReview =
      group.reviews.find((r) => r.reviewerType === 'REVIEWER') ?? null;

    const stage2 = group.progressReports[0] ?? null;
    const stage2Passed = stage2 ? (stage2.isPassed ?? false) : false;

    const hasSupervisorReview = supervisorReview !== null;
    const hasReviewerReview = reviewerReview !== null;

    const isSupervisorAllowed = supervisorReview?.isDefenseAllowed ?? false;
    const isReviewerAllowed = reviewerReview?.isDefenseAllowed ?? false;

    // Cổng điều kiện bảo vệ (Defense Eligibility Gate):
    // Đạt khi CẢ 2 GV đồng ý và Tiến độ 2 đạt >= 50%
    const isDefenseEligible =
      hasSupervisorReview &&
      hasReviewerReview &&
      isSupervisorAllowed &&
      isReviewerAllowed &&
      stage2Passed;

    let eligibilityStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING';
    if (isDefenseEligible) {
      eligibilityStatus = 'ELIGIBLE';
    } else if (
      (hasSupervisorReview && !isSupervisorAllowed) ||
      (hasReviewerReview && !isReviewerAllowed) ||
      (stage2 && !stage2Passed)
    ) {
      eligibilityStatus = 'NOT_ELIGIBLE';
    } else {
      eligibilityStatus = 'PENDING';
    }

    return {
      group: {
        id: group.id,
        name: group.name,
        topic: group.topic,
        supervisor: group.topic?.lecturer ?? null,
        reviewer: group.assignment?.reviewer ?? null,
        members: group.members.map((m) => m.student),
      },
      stage2,
      stage2Passed,
      supervisorReview,
      reviewerReview,
      hasSupervisorReview,
      hasReviewerReview,
      isSupervisorAllowed,
      isReviewerAllowed,
      isDefenseEligible,
      eligibilityStatus,
      recentSubmissions: group.submissions,
    };
  }

  /**
   * Danh sách các đề tài mà Giảng viên hiện tại cần lập Phiếu nhận xét (hướng dẫn hoặc phản biện).
   */
  async getMyReviews(lecturerUserId: number) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerUserId },
    });
    if (!lecturer) {
      throw new ForbiddenException('Hồ sơ giảng viên không tồn tại.');
    }

    // Lấy nhóm mà giảng viên là GVHD
    const supervisorGroups = await this.prisma.registrationGroup.findMany({
      where: {
        topic: {
          lecturerId: lecturer.id,
        },
      },
      include: {
        topic: {
          include: {
            round: {
              include: { projectType: true },
            },
          },
        },
        members: {
          where: { status: GroupMemberStatus.ACCEPTED },
          include: { student: true },
        },
        assignment: {
          include: {
            reviewer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
              },
            },
          },
        },
        reviews: {
          include: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
              },
            },
          },
        },
        progressReports: {
          where: { stage: 'STAGE_2' },
          select: {
            id: true,
            isPassed: true,
            workloadPercentage: true,
            finalStageGrade: true,
            reportFileUrl: true,
            sourceCodeUrl: true,
          },
        },
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'desc' },
    });

    // Lấy nhóm mà giảng viên được phân công làm GVPB
    const reviewerAssignments = await this.prisma.topicAssignment.findMany({
      where: {
        reviewerId: lecturer.id,
      },
      include: {
        group: {
          include: {
            topic: {
              include: {
                round: {
                  include: { projectType: true },
                },
                lecturer: {
                  select: {
                    id: true,
                    fullName: true,
                    academicTitle: true,
                  },
                },
              },
            },
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              include: { student: true },
            },
            reviews: {
              include: {
                lecturer: {
                  select: {
                    id: true,
                    fullName: true,
                    academicTitle: true,
                  },
                },
              },
            },
            progressReports: {
              where: { stage: 'STAGE_2' },
              select: {
                id: true,
                isPassed: true,
                workloadPercentage: true,
                finalStageGrade: true,
                reportFileUrl: true,
                sourceCodeUrl: true,
              },
            },
            submissions: {
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const items: Array<{
      groupId: number;
      groupName: string | null;
      role: 'SUPERVISOR' | 'REVIEWER';
      expectedTemplate: 'M02' | 'M04' | 'M05';
      topic: any;
      supervisor: any;
      reviewer: any;
      members: any[];
      stage2: any;
      myReview: any;
      partnerReview: any;
      latestSubmission: any;
    }> = [];

    // Map supervisor groups
    for (const g of supervisorGroups) {
      if (!g.topic) continue;
      const projectTypeCode = g.topic.round?.projectType?.code;
      const expectedTemplate = projectTypeCode === 'KLTN' ? 'M04' : 'M02';
      const myReview = g.reviews.find((r) => r.reviewerType === 'SUPERVISOR') ?? null;
      const partnerReview = g.reviews.find((r) => r.reviewerType === 'REVIEWER') ?? null;

      items.push({
        groupId: g.id,
        groupName: g.name,
        role: 'SUPERVISOR',
        expectedTemplate,
        topic: g.topic,
        supervisor: {
          id: lecturer.id,
          fullName: lecturer.fullName,
          academicTitle: lecturer.academicTitle,
        },
        reviewer: g.assignment?.reviewer ?? null,
        members: g.members.map((m) => m.student),
        stage2: g.progressReports[0] ?? null,
        myReview,
        partnerReview,
        latestSubmission: g.submissions[0] ?? null,
      });
    }

    // Map reviewer groups
    for (const a of reviewerAssignments) {
      const g = a.group;
      if (!g?.topic) continue;
      const myReview = g.reviews.find((r) => r.reviewerType === 'REVIEWER') ?? null;
      const partnerReview = g.reviews.find((r) => r.reviewerType === 'SUPERVISOR') ?? null;

      items.push({
        groupId: g.id,
        groupName: g.name,
        role: 'REVIEWER',
        expectedTemplate: 'M05',
        topic: g.topic,
        supervisor: g.topic.lecturer,
        reviewer: {
          id: lecturer.id,
          fullName: lecturer.fullName,
          academicTitle: lecturer.academicTitle,
        },
        members: g.members.map((m) => m.student),
        stage2: g.progressReports[0] ?? null,
        myReview,
        partnerReview,
        latestSubmission: g.submissions[0] ?? null,
      });
    }

    return items;
  }

  /**
   * Bảng tổng hợp đối soát điều kiện bảo vệ toàn khoa (dành cho Giáo vụ, TTBM).
   */
  async getDefenseEligibilityOverview(
    user: RequestUser,
    query: QueryDefenseEligibilityDto,
  ) {
    const where: Prisma.RegistrationGroupWhereInput = {
      topicId: { not: undefined },
    };

    if (query.roundId) {
      where.topic = { roundId: query.roundId };
    }

    if (query.semesterId) {
      where.semesterId = query.semesterId;
    }

    // Nếu là TTBM, giới hạn theo chuyên ngành của bộ môn
    if (
      user.role === Role.LECTURER &&
      user.lecturerProfile?.isHeadOfDepartment &&
      !user.lecturerProfile?.isAcademicAssistant
    ) {
      if (user.lecturerProfile.majorId) {
        where.topic = {
          ...((where.topic as any) || {}),
          majorId: user.lecturerProfile.majorId,
        };
      }
    } else if (query.majorId) {
      where.topic = {
        ...((where.topic as any) || {}),
        majorId: query.majorId,
      };
    }

    if (query.search) {
      where.OR = [
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
      ];
    }

    const groups = await this.prisma.registrationGroup.findMany({
      where,
      include: {
        topic: {
          include: {
            major: true,
            round: {
              include: { projectType: true },
            },
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
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
              },
            },
          },
        },
        members: {
          where: { status: GroupMemberStatus.ACCEPTED },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                fullName: true,
                class: true,
              },
            },
          },
        },
        reviews: {
          include: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
              },
            },
          },
        },
        progressReports: {
          where: { stage: 'STAGE_2' },
          select: {
            id: true,
            isPassed: true,
            workloadPercentage: true,
            finalStageGrade: true,
          },
        },
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            submissionUrl: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    // Xử lý tính toán trạng thái thẩm định cho từng nhóm
    const processed = groups.map((g) => {
      const supervisorReview =
        g.reviews.find((r) => r.reviewerType === 'SUPERVISOR') ?? null;
      const reviewerReview =
        g.reviews.find((r) => r.reviewerType === 'REVIEWER') ?? null;
      const stage2 = g.progressReports[0] ?? null;

      const stage2Passed = stage2 ? (stage2.isPassed ?? false) : false;
      const supervisorAllowed = supervisorReview?.isDefenseAllowed ?? false;
      const reviewerAllowed = reviewerReview?.isDefenseAllowed ?? false;

      const hasSupervisorReview = supervisorReview !== null;
      const hasReviewerReview = reviewerReview !== null;

      const isEligible =
        hasSupervisorReview &&
        hasReviewerReview &&
        supervisorAllowed &&
        reviewerAllowed &&
        stage2Passed;

      let status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING';
      if (isEligible) {
        status = 'ELIGIBLE';
      } else if (
        (hasSupervisorReview && !supervisorAllowed) ||
        (hasReviewerReview && !reviewerAllowed) ||
        (stage2 && !stage2Passed)
      ) {
        status = 'NOT_ELIGIBLE';
      } else {
        status = 'PENDING';
      }

      return {
        id: g.id,
        name: g.name,
        topic: g.topic,
        supervisor: g.topic?.lecturer ?? null,
        reviewer: g.assignment?.reviewer ?? null,
        members: g.members.map((m) => m.student),
        stage2: {
          isPassed: stage2Passed,
          workloadPercentage: stage2?.workloadPercentage ?? null,
          finalStageGrade: stage2?.finalStageGrade ?? null,
        },
        supervisorReview: supervisorReview
          ? {
              id: supervisorReview.id,
              templateCode: supervisorReview.templateCode,
              isDefenseAllowed: supervisorReview.isDefenseAllowed,
              signedAt: supervisorReview.signedAt,
              lecturer: supervisorReview.lecturer,
            }
          : null,
        reviewerReview: reviewerReview
          ? {
              id: reviewerReview.id,
              templateCode: reviewerReview.templateCode,
              isDefenseAllowed: reviewerReview.isDefenseAllowed,
              signedAt: reviewerReview.signedAt,
              lecturer: reviewerReview.lecturer,
            }
          : null,
        latestSubmission: g.submissions[0] ?? null,
        status,
      };
    });

    // Thống kê toàn bộ trước khi lọc status
    const totalGroups = processed.length;
    const eligibleCount = processed.filter((p) => p.status === 'ELIGIBLE').length;
    const notEligibleCount = processed.filter((p) => p.status === 'NOT_ELIGIBLE').length;
    const pendingCount = processed.filter((p) => p.status === 'PENDING').length;

    // Lọc theo status nếu có yêu cầu
    let filtered = processed;
    if (query.status && query.status !== 'ALL') {
      filtered = processed.filter((p) => p.status === query.status);
    }

    // Phân trang
    const page = query.page || 1;
    const limit = query.limit || 20;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      stats: {
        totalGroups,
        eligibleCount,
        notEligibleCount,
        pendingCount,
      },
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
      items,
    };
  }

  /**
   * Lấy chi tiết một phiếu nhận xét (để xem trước hoặc in biểu mẫu DLU).
   */
  async getReviewDetail(reviewId: number, _user: RequestUser) {
    const review = await this.prisma.topicReview.findUnique({
      where: { id: reviewId },
      include: {
        lecturer: {
          include: {
            major: true,
          },
        },
        group: {
          include: {
            topic: {
              include: {
                major: true,
                round: {
                  include: {
                    projectType: true,
                    semester: true,
                  },
                },
                lecturer: true,
              },
            },
            assignment: {
              include: {
                reviewer: true,
              },
            },
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              include: {
                student: {
                  include: {
                    major: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Phiếu nhận xét không tồn tại.');
    }

    return review;
  }
}
