import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CouncilMemberRole,
  GroupMemberStatus,
  NotificationType,
  Prisma,
  Role,
} from '../../../generated/prisma/client';
import { recordAudit } from '../../core/audit/audit-entry';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { RequestUser } from '../auth/guards/roles.guard';
import { calculateLetterGrade } from '../progress/progress.service';
import { AddCouncilMemberDto } from './dto/add-council-member.dto';
import { CreateCouncilDto } from './dto/create-council.dto';
import { FinalizeCouncilTopicDto } from './dto/finalize-council-topic.dto';
import { QueryCouncilsDto } from './dto/query-councils.dto';
import { ScheduleCouncilTopicDto } from './dto/schedule-council-topic.dto';
import { SubmitCouncilEvaluationDto } from './dto/submit-council-evaluation.dto';
import { UpdateCouncilDto } from './dto/update-council.dto';

export interface CouncilMemberEvaluationItem {
  lecturerId: number;
  lecturerName: string;
  role: CouncilMemberRole;
  score: number;
  feedback?: string | null;
  submittedAt: string;
}

@Injectable()
export class CouncilsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Danh sách hội đồng bảo vệ theo bộ lọc (học kỳ, bộ môn, tìm kiếm).
   */
  async findAll(query: QueryCouncilsDto) {
    const where: Prisma.CouncilWhereInput = {};

    if (query.semesterId) {
      where.semesterId = query.semesterId;
    }
    if (query.majorId) {
      where.majorId = query.majorId;
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const councils = await this.prisma.council.findMany({
      where,
      include: {
        semester: {
          select: { id: true, name: true, code: true, isActive: true },
        },
        major: {
          select: { id: true, name: true, code: true },
        },
        members: {
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
          orderBy: { id: 'asc' },
        },
        topics: {
          select: {
            id: true,
            status: true,
            isLocked: true,
            timeSlot: true,
            defenseOrder: true,
          },
        },
      },
      orderBy: [{ defenseDate: 'desc' }, { id: 'desc' }],
    });

    return councils.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      defenseDate: c.defenseDate,
      status: c.status,
      semester: c.semester,
      major: c.major,
      members: c.members.map((m) => ({
        id: m.id,
        lecturerId: m.lecturerId,
        lecturer: m.lecturer,
        councilRole: m.councilRole,
      })),
      stats: {
        totalTopics: c.topics.length,
        completedTopics: c.topics.filter((t) => t.isLocked).length,
      },
    }));
  }

  /**
   * Xem chi tiết một Hội đồng (kèm danh sách nhóm bảo vệ & thành viên).
   */
  async findById(id: number) {
    const council = await this.prisma.council.findUnique({
      where: { id },
      include: {
        semester: true,
        major: true,
        members: {
          include: {
            lecturer: {
              include: {
                major: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
        topics: {
          include: {
            topic: {
              include: {
                major: true,
                lecturer: {
                  select: {
                    id: true,
                    fullName: true,
                    academicTitle: true,
                  },
                },
              },
            },
            reviewer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
              },
            },
            group: {
              include: {
                leader: {
                  select: {
                    id: true,
                    fullName: true,
                    studentCode: true,
                    class: true,
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
                studentGrades: true,
              },
            },
            grades: true,
          },
          orderBy: [{ defenseOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!council) {
      throw new NotFoundException('Hội đồng bảo vệ không tồn tại.');
    }

    const topicsWithProgress = council.topics.map((t) => {
      const evaluations = (t.evaluations as unknown as CouncilMemberEvaluationItem[]) || [];
      const totalMembers = council.members.length;
      const evaluatedCount = evaluations.length;
      const avgScore =
        evaluatedCount > 0
          ? Number(
              (
                evaluations.reduce((sum, e) => sum + e.score, 0) /
                evaluatedCount
              ).toFixed(2),
            )
          : null;

      return {
        id: t.id,
        councilId: t.councilId,
        topicId: t.topicId,
        groupId: t.groupId,
        timeSlot: t.timeSlot,
        defenseOrder: t.defenseOrder,
        status: t.status,
        isLocked: t.isLocked,
        minuteNotes: t.minuteNotes,
        topic: t.topic,
        reviewer: t.reviewer,
        group: {
          id: t.group.id,
          name: t.group.name,
          leader: t.group.leader,
          members: t.group.members.map((m) => m.student),
          latestSubmission: t.group.submissions[0] ?? null,
          studentGrades: t.group.studentGrades,
        },
        evaluationSummary: {
          totalMembers,
          evaluatedCount,
          isFullyEvaluated: evaluatedCount >= totalMembers && totalMembers > 0,
          avgScore,
        },
      };
    });

    return {
      ...council,
      topics: topicsWithProgress,
    };
  }

  /**
   * Tạo Hội đồng bảo vệ mới (Admin / TLGV).
   */
  async create(dto: CreateCouncilDto, user: RequestUser) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: dto.semesterId },
    });
    if (!semester) {
      throw new NotFoundException('Học kỳ không tồn tại.');
    }

    if (dto.majorId) {
      const major = await this.prisma.major.findUnique({
        where: { id: dto.majorId },
      });
      if (!major) {
        throw new NotFoundException('Chuyên ngành không tồn tại.');
      }
    }

    const council = await this.prisma.council.create({
      data: {
        name: dto.name,
        semesterId: dto.semesterId,
        majorId: dto.majorId ?? null,
        location: dto.location,
        defenseDate: new Date(dto.defenseDate),
        status: 'PREP',
      },
      include: {
        semester: true,
        major: true,
      },
    });

    await recordAudit(this.prisma, {
      userId: user.id,
      action: 'CREATE_COUNCIL',
      targetTable: 'councils',
      targetId: String(council.id),
      newValue: { name: council.name, location: council.location },
    });

    return council;
  }

  /**
   * Cập nhật thông tin Hội đồng (Admin / TLGV).
   */
  async update(id: number, dto: UpdateCouncilDto, user: RequestUser) {
    const existing = await this.prisma.council.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Hội đồng không tồn tại.');
    }

    const updated = await this.prisma.council.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.majorId !== undefined && { majorId: dto.majorId }),
        ...(dto.location && { location: dto.location }),
        ...(dto.defenseDate && { defenseDate: new Date(dto.defenseDate) }),
        ...(dto.status && { status: dto.status }),
      },
    });

    await recordAudit(this.prisma, {
      userId: user.id,
      action: 'UPDATE_COUNCIL',
      targetTable: 'councils',
      targetId: String(id),
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
    });

    return updated;
  }

  /**
   * Xóa Hội đồng (chỉ khi chưa có nhóm đồ án nào được xếp vào).
   */
  async delete(id: number, user: RequestUser) {
    const existing = await this.prisma.council.findUnique({
      where: { id },
      include: { topics: true },
    });
    if (!existing) {
      throw new NotFoundException('Hội đồng không tồn tại.');
    }

    if (existing.topics.length > 0) {
      throw new BadRequestException(
        'Không thể xóa Hội đồng đã được xếp lịch nhóm bảo vệ. Vui lòng gỡ các nhóm khỏi hội đồng trước.',
      );
    }

    await this.prisma.council.delete({ where: { id } });

    await recordAudit(this.prisma, {
      userId: user.id,
      action: 'DELETE_COUNCIL',
      targetTable: 'councils',
      targetId: String(id),
      oldValue: { name: existing.name },
    });

    return { message: 'Đã xóa hội đồng thành công.' };
  }

  /**
   * Gán thành viên vào Hội đồng (Chủ tịch, Thư ký, Ủy viên).
   */
  async addMember(
    councilId: number,
    dto: AddCouncilMemberDto,
    _user: RequestUser,
  ) {
    const council = await this.prisma.council.findUnique({
      where: { id: councilId },
    });
    if (!council) {
      throw new NotFoundException('Hội đồng không tồn tại.');
    }

    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { id: dto.lecturerId },
      include: { user: true },
    });
    if (!lecturer) {
      throw new NotFoundException('Hồ sơ giảng viên không tồn tại.');
    }

    const member = await this.prisma.councilMember.upsert({
      where: {
        councilId_lecturerId: {
          councilId,
          lecturerId: dto.lecturerId,
        },
      },
      create: {
        councilId,
        lecturerId: dto.lecturerId,
        councilRole: dto.councilRole,
      },
      update: {
        councilRole: dto.councilRole,
      },
      include: {
        lecturer: true,
      },
    });

    return member;
  }

  /**
   * Xóa thành viên khỏi Hội đồng.
   */
  async removeMember(
    councilId: number,
    lecturerId: number,
    _user: RequestUser,
  ) {
    const existing = await this.prisma.councilMember.findUnique({
      where: {
        councilId_lecturerId: {
          councilId,
          lecturerId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Thành viên không nằm trong hội đồng.');
    }

    await this.prisma.councilMember.delete({
      where: {
        councilId_lecturerId: {
          councilId,
          lecturerId,
        },
      },
    });

    return { message: 'Đã xóa thành viên khỏi hội đồng.' };
  }

  /**
   * Lấy danh sách nhóm sinh viên ĐỦ ĐIỀU KIỆN BẢO VỆ nhưng CHƯA ĐƯỢC XẾP LỊCH vào Hội đồng nào.
   */
  async getEligibleGroups(semesterId?: number, majorId?: number) {
    // 1. Lấy tất cả nhóm có đề tài hợp lệ
    const whereGroup: Prisma.RegistrationGroupWhereInput = {
      topicId: { not: undefined },
    };

    if (semesterId) {
      whereGroup.semesterId = semesterId;
    }
    if (majorId) {
      whereGroup.topic = { majorId };
    }

    const groups = await this.prisma.registrationGroup.findMany({
      where: whereGroup,
      include: {
        topic: {
          include: {
            major: true,
            lecturer: {
              select: {
                id: true,
                fullName: true,
                academicTitle: true,
              },
            },
            round: {
              include: { projectType: true },
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
                fullName: true,
                studentCode: true,
                class: true,
              },
            },
          },
        },
        reviews: true,
        progressReports: {
          where: { stage: 'STAGE_2' },
          select: { isPassed: true, finalStageGrade: true },
        },
        councilTopic: {
          include: {
            council: {
              select: { id: true, name: true, location: true },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    // 2. Lọc các nhóm thỏa mãn điều kiện thẩm định và chưa xếp lịch
    const eligibleUnscheduled = groups
      .filter((g) => {
        // Phải chưa được xếp lịch vào hội đồng nào
        if (g.councilTopic) return false;

        // Phải có GVPB được phân công
        if (!g.assignment?.reviewer) return false;

        const stage2 = g.progressReports[0];
        const supervisorReview = g.reviews.find(
          (r) => r.reviewerType === 'SUPERVISOR',
        );
        const reviewerReview = g.reviews.find(
          (r) => r.reviewerType === 'REVIEWER',
        );

        const stage2Passed = stage2?.isPassed ?? false;
        const supervisorAllowed = supervisorReview?.isDefenseAllowed ?? false;
        const reviewerAllowed = reviewerReview?.isDefenseAllowed ?? false;

        return (
          stage2Passed &&
          supervisorReview !== undefined &&
          reviewerReview !== undefined &&
          supervisorAllowed &&
          reviewerAllowed
        );
      })
      .map((g) => ({
        id: g.id,
        name: g.name,
        topic: g.topic,
        supervisor: g.topic?.lecturer ?? null,
        reviewer: g.assignment?.reviewer ?? null,
        members: g.members.map((m) => m.student),
      }));

    return eligibleUnscheduled;
  }

  /**
   * Xếp một nhóm đồ án vào Hội đồng bảo vệ (BR-18).
   */
  async scheduleTopic(
    councilId: number,
    dto: ScheduleCouncilTopicDto,
    _user: RequestUser,
  ) {
    const council = await this.prisma.council.findUnique({
      where: { id: councilId },
    });
    if (!council) {
      throw new NotFoundException('Hội đồng không tồn tại.');
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: dto.groupId },
      include: {
        topic: true,
        assignment: true,
        councilTopic: true,
        members: {
          where: { status: GroupMemberStatus.ACCEPTED },
          include: { student: { include: { user: true } } },
        },
      },
    });

    if (!group || !group.topicId) {
      throw new NotFoundException('Nhóm đồ án không hợp lệ hoặc chưa có đề tài.');
    }

    if (group.councilTopic) {
      throw new BadRequestException(
        'Nhóm này đã được xếp lịch vào một Hội đồng bảo vệ trước đó.',
      );
    }

    if (!group.assignment?.reviewerId) {
      throw new BadRequestException(
        'Nhóm này chưa có Giảng viên phản biện được phân công.',
      );
    }

    const councilTopic = await this.prisma.councilTopic.create({
      data: {
        councilId,
        groupId: group.id,
        topicId: group.topicId,
        reviewerId: group.assignment.reviewerId,
        timeSlot: dto.timeSlot ?? null,
        defenseOrder: dto.defenseOrder ?? 1,
        status: 'SCHEDULED',
        evaluations: [],
      },
      include: {
        council: true,
        topic: true,
      },
    });

    // Gửi thông báo đến toàn bộ thành viên nhóm
    const notices = group.members.map((m) => ({
      userId: m.student.userId,
      type: NotificationType.COUNCIL_SCHEDULED,
      title: 'Lịch bảo vệ Khóa luận tốt nghiệp chính thức',
      content: `Đề tài của nhóm bạn đã được xếp lịch bảo vệ tại ${council.name}, phòng ${council.location || 'sẽ thông báo sau'}${dto.timeSlot ? `, ca: ${dto.timeSlot}` : ''}.`,
      targetId: group.id,
    }));

    if (notices.length > 0) {
      await this.notifications.notify(notices);
    }

    return councilTopic;
  }

  /**
   * Hủy xếp lịch một nhóm khỏi Hội đồng bảo vệ.
   */
  async removeTopic(
    councilId: number,
    councilTopicId: number,
    _user: RequestUser,
  ) {
    const councilTopic = await this.prisma.councilTopic.findUnique({
      where: { id: councilTopicId },
    });

    if (!councilTopic || councilTopic.councilId !== councilId) {
      throw new NotFoundException('Đề tài không tồn tại trong hội đồng này.');
    }

    if (councilTopic.isLocked) {
      throw new BadRequestException(
        'Không thể xóa đề tài đã chốt điểm bảo vệ.',
      );
    }

    await this.prisma.councilTopic.delete({
      where: { id: councilTopicId },
    });

    return { message: 'Đã gỡ nhóm khỏi lịch bảo vệ của hội đồng.' };
  }

  /**
   * Lấy danh sách Hội đồng bảo vệ mà Giảng viên đang đăng nhập tham gia.
   */
  async getMyCouncils(user: RequestUser) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!lecturer) {
      throw new ForbiddenException('Hồ sơ giảng viên không tồn tại.');
    }

    const memberships = await this.prisma.councilMember.findMany({
      where: { lecturerId: lecturer.id },
      include: {
        council: {
          include: {
            semester: true,
            major: true,
            members: {
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
            topics: {
              include: {
                topic: {
                  include: {
                    major: true,
                    lecturer: true,
                  },
                },
                reviewer: true,
                group: {
                  include: {
                    leader: true,
                    members: {
                      where: { status: GroupMemberStatus.ACCEPTED },
                      include: { student: true },
                    },
                    submissions: {
                      orderBy: { submittedAt: 'desc' },
                      take: 1,
                    },
                  },
                },
              },
              orderBy: [{ defenseOrder: 'asc' }, { id: 'asc' }],
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return memberships.map((m) => {
      const c = m.council;
      const topics = c.topics.map((t) => {
        const evaluations =
          (t.evaluations as unknown as CouncilMemberEvaluationItem[]) || [];
        const myEval = evaluations.find((e) => e.lecturerId === lecturer.id);
        const avgScore =
          evaluations.length > 0
            ? Number(
                (
                  evaluations.reduce((sum, e) => sum + e.score, 0) /
                  evaluations.length
                ).toFixed(2),
              )
            : null;

        return {
          id: t.id,
          timeSlot: t.timeSlot,
          defenseOrder: t.defenseOrder,
          status: t.status,
          isLocked: t.isLocked,
          minuteNotes: t.minuteNotes,
          topic: t.topic,
          reviewer: t.reviewer,
          group: {
            id: t.group.id,
            name: t.group.name,
            leader: t.group.leader,
            members: t.group.members.map((mem) => mem.student),
            latestSubmission: t.group.submissions[0] ?? null,
          },
          myEvaluation: myEval
            ? {
                score: myEval.score,
                feedback: myEval.feedback,
                submittedAt: myEval.submittedAt,
              }
            : null,
          evaluationSummary: {
            totalMembers: c.members.length,
            evaluatedCount: evaluations.length,
            avgScore,
          },
        };
      });

      return {
        councilId: c.id,
        name: c.name,
        location: c.location,
        defenseDate: c.defenseDate,
        status: c.status,
        semester: c.semester,
        major: c.major,
        myRole: m.councilRole,
        members: c.members.map((mem) => ({
          lecturerId: mem.lecturerId,
          fullName: mem.lecturer.fullName,
          academicTitle: mem.lecturer.academicTitle,
          councilRole: mem.councilRole,
        })),
        topics,
      };
    });
  }

  /**
   * Giảng viên Hội đồng gửi điểm chấm độc lập (Chấm thầm) cho nhóm bảo vệ.
   */
  async evaluateTopic(
    councilTopicId: number,
    dto: SubmitCouncilEvaluationDto,
    user: RequestUser,
  ) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!lecturer) {
      throw new ForbiddenException('Chỉ giảng viên mới có quyền chấm điểm.');
    }

    const councilTopic = await this.prisma.councilTopic.findUnique({
      where: { id: councilTopicId },
      include: {
        council: {
          include: {
            members: true,
          },
        },
        group: {
          include: {
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
            },
            studentGrades: true,
          },
        },
      },
    });

    if (!councilTopic) {
      throw new NotFoundException('Lịch bảo vệ không tồn tại.');
    }

    if (councilTopic.isLocked) {
      throw new BadRequestException('Buổi bảo vệ đề tài này đã được khóa sổ.');
    }

    // Kiểm tra giảng viên có nằm trong danh sách thành viên hội đồng không
    const membership = councilTopic.council.members.find(
      (m) => m.lecturerId === lecturer.id,
    );
    if (!membership && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Bạn không phải thành viên của Hội đồng này.');
    }

    const currentEvaluations: CouncilMemberEvaluationItem[] =
      (councilTopic.evaluations as unknown as CouncilMemberEvaluationItem[]) ||
      [];

    const memberRole = membership ? membership.councilRole : CouncilMemberRole.MEMBER;

    // Cập nhật hoặc thêm mới điểm của giảng viên này
    const existingIndex = currentEvaluations.findIndex(
      (e) => e.lecturerId === lecturer.id,
    );

    const evaluationItem: CouncilMemberEvaluationItem = {
      lecturerId: lecturer.id,
      lecturerName: lecturer.fullName,
      role: memberRole,
      score: Number(dto.score.toFixed(1)),
      feedback: dto.feedback ?? null,
      submittedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      currentEvaluations[existingIndex] = evaluationItem;
    } else {
      currentEvaluations.push(evaluationItem);
    }

    // Tính điểm trung bình cộng của Hội đồng
    const totalScore = currentEvaluations.reduce((sum, e) => sum + e.score, 0);
    const avgScore = Number(
      (totalScore / currentEvaluations.length).toFixed(2),
    );

    // Cập nhật CouncilTopic
    const updated = await this.prisma.councilTopic.update({
      where: { id: councilTopicId },
      data: {
        evaluations: currentEvaluations as unknown as Prisma.InputJsonValue,
        status: 'DEFENDING',
      },
    });

    // Đồng bộ điểm bảo vệ (defenseGrade) vào StudentGrade & tính Điểm Tổng Kết DLU
    for (const member of councilTopic.group.members) {
      const existingGrade = councilTopic.group.studentGrades.find(
        (g) => g.studentId === member.studentId,
      );

      const p1 = existingGrade?.progress1Grade ?? null;
      const p2 = existingGrade?.progress2Grade ?? null;
      const bv = avgScore;

      let finalGradeNum: number | undefined = undefined;
      let finalGradeLetter: string | undefined = undefined;

      if (p1 !== null && p2 !== null) {
        finalGradeNum = Number(
          (0.2 * p1 + 0.3 * p2 + 0.5 * bv).toFixed(2),
        );
        finalGradeLetter = calculateLetterGrade(finalGradeNum);
      }

      await this.prisma.studentGrade.upsert({
        where: {
          groupId_studentId: {
            groupId: councilTopic.groupId,
            studentId: member.studentId,
          },
        },
        create: {
          groupId: councilTopic.groupId,
          studentId: member.studentId,
          defenseGrade: bv,
          ...(finalGradeNum !== undefined && { finalGradeNum }),
          ...(finalGradeLetter !== undefined && { finalGradeLetter }),
        },
        update: {
          defenseGrade: bv,
          ...(finalGradeNum !== undefined && { finalGradeNum }),
          ...(finalGradeLetter !== undefined && { finalGradeLetter }),
        },
      });

      // Đồng bộ vào CouncilTopicGrade
      await this.prisma.councilTopicGrade.upsert({
        where: {
          councilTopicId_studentId: {
            councilTopicId,
            studentId: member.studentId,
          },
        },
        create: {
          councilTopicId,
          studentId: member.studentId,
          councilGrade: bv,
          finalGrade: finalGradeNum ?? null,
        },
        update: {
          councilGrade: bv,
          finalGrade: finalGradeNum ?? null,
        },
      });
    }

    return {
      message: 'Đã ghi nhận điểm chấm độc lập thành công.',
      myEvaluation: evaluationItem,
      evaluationSummary: {
        totalMembers: councilTopic.council.members.length,
        evaluatedCount: currentEvaluations.length,
        avgScore,
      },
      councilTopic: updated,
    };
  }

  /**
   * Khóa & Chốt điểm bảo vệ Hội đồng (Admin / Chủ tịch / Thư ký).
   */
  async finalizeTopic(
    councilTopicId: number,
    dto: FinalizeCouncilTopicDto,
    user: RequestUser,
  ) {
    const councilTopic = await this.prisma.councilTopic.findUnique({
      where: { id: councilTopicId },
      include: {
        council: {
          include: { members: true },
        },
        group: {
          include: {
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              include: { student: { include: { user: true } } },
            },
            studentGrades: true,
          },
        },
      },
    });

    if (!councilTopic) {
      throw new NotFoundException('Lịch bảo vệ không tồn tại.');
    }

    // Kiểm tra quyền: Admin hoặc thành viên Hội đồng
    if (user.role !== Role.ADMIN) {
      const lecturer = await this.prisma.lecturerProfile.findUnique({
        where: { userId: user.id },
      });
      const isMember = councilTopic.council.members.some(
        (m) => m.lecturerId === lecturer?.id,
      );
      if (!isMember) {
        throw new ForbiddenException(
          'Bạn không có quyền chốt điểm cho hội đồng này.',
        );
      }
    }

    const updated = await this.prisma.councilTopic.update({
      where: { id: councilTopicId },
      data: {
        isLocked: dto.isLocked,
        status: dto.isLocked ? 'COMPLETED' : 'DEFENDING',
        ...(dto.minuteNotes !== undefined && {
          minuteNotes: dto.minuteNotes,
        }),
      },
    });

    // Nếu khóa sổ: Đánh dấu finalisedAt và gửi thông báo hoàn tất cho sinh viên
    if (dto.isLocked) {
      await this.prisma.studentGrade.updateMany({
        where: { groupId: councilTopic.groupId },
        data: { isLocked: true },
      });

      await this.prisma.councilTopicGrade.updateMany({
        where: { councilTopicId },
        data: { finalisedAt: new Date() },
      });

      const notices = councilTopic.group.members.map((m) => ({
        userId: m.student.userId,
        type: NotificationType.COUNCIL_DEFENSE_COMPLETED,
        title: 'Hoàn thành Bảo vệ Khóa luận tốt nghiệp',
        content: `Hội đồng đã hoàn tất buổi bảo vệ và công bố kết quả điểm chính thức cho nhóm bạn.`,
        targetId: councilTopic.groupId,
      }));

      if (notices.length > 0) {
        await this.notifications.notify(notices);
      }
    }

    return {
      message: dto.isLocked
        ? 'Đã chốt sổ và khóa điểm bảo vệ thành công.'
        : 'Đã mở khóa điểm bảo vệ.',
      councilTopic: updated,
    };
  }
}
