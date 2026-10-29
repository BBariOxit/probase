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
} from '../../../generated/prisma/client';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateWeeklyLogDto } from './dto/create-weekly-log.dto';
import { FeedbackWeeklyLogDto } from './dto/feedback-weekly-log.dto';
import { GradeProgressReportDto } from './dto/grade-progress-report.dto';
import { QueryLecturerProgressDto } from './dto/query-progress.dto';
import { SubmitProgressReportDto } from './dto/submit-progress-report.dto';
import { UpdateWeeklyLogDto } from './dto/update-weekly-log.dto';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // PHÂN HỆ 1: SỔ TAY TIẾN ĐỘ NỘI BỘ (WEEKLY LOG / SPRINT FEED)
  // ─────────────────────────────────────────────────────────

  async getMyGroupProgress(userId: number) {
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
        weeklyLogs: [],
        progressReports: { stage1: null, stage2: null },
      };
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: membership.groupId },
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
          },
        },
        leader: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            class: true,
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
      },
    });

    if (!group) {
      return {
        hasGroup: false,
        message: 'Nhóm không tồn tại.',
        group: null,
        weeklyLogs: [],
        progressReports: { stage1: null, stage2: null },
      };
    }

    if (!group.topic) {
      return {
        hasGroup: true,
        hasTopic: false,
        message: 'Nhóm của bạn chưa có đề tài được duyệt.',
        group: {
          id: group.id,
          name: group.name,
          members: group.members,
        },
        weeklyLogs: [],
        progressReports: { stage1: null, stage2: null },
      };
    }

    // Query weekly logs
    const weeklyLogs = await this.prisma.weeklyLog.findMany({
      where: { groupId: group.id },
      include: {
        submittedBy: {
          select: {
            id: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
                studentCode: true,
              },
            },
          },
        },
      },
      orderBy: [{ weekNumber: 'desc' }, { createdAt: 'desc' }],
    });

    // Query progress reports (Stage 1 & Stage 2)
    const reports = await this.prisma.progressReport.findMany({
      where: { groupId: group.id },
      include: {
        submittedBy: {
          select: {
            id: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    const stage1 = reports.find((r) => r.stage === 'STAGE_1') ?? null;
    const stage2 = reports.find((r) => r.stage === 'STAGE_2') ?? null;

    // Latest completion percentage
    const latestLog = weeklyLogs[0];
    const currentPercentage = latestLog?.completionPercentage ?? 0;

    return {
      hasGroup: true,
      hasTopic: true,
      group: {
        id: group.id,
        name: group.name,
        joinCode: group.joinCode,
        topic: group.topic,
        leader: group.leader,
        members: group.members,
        reviewer: group.assignment?.reviewer ?? null,
      },
      currentPercentage,
      weeklyLogs,
      progressReports: {
        stage1,
        stage2,
      },
    };
  }

  async createWeeklyLog(userId: number, dto: CreateWeeklyLogDto) {
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
      include: {
        group: {
          include: {
            topic: {
              include: {
                lecturer: true,
              },
            },
          },
        },
      },
    });

    if (!membership?.group?.topic) {
      throw new BadRequestException('Bạn chưa có nhóm hoặc đề tài để cập nhật tiến độ.');
    }

    const group = membership.group;

    // Check if log for this week already exists
    const existing = await this.prisma.weeklyLog.findFirst({
      where: {
        groupId: group.id,
        weekNumber: dto.weekNumber,
      },
    });

    let log;
    if (existing) {
      log = await this.prisma.weeklyLog.update({
        where: { id: existing.id },
        data: {
          title: dto.title ?? `Báo cáo Tuần ${dto.weekNumber}`,
          completionPercentage: dto.completionPercentage,
          gitCommitUrl: dto.gitCommitUrl,
          summaryNotes: dto.summaryNotes,
          blockers: dto.blockers,
          submittedById: userId,
          isAcknowledged: false, // reset ack on update
        },
      });
    } else {
      log = await this.prisma.weeklyLog.create({
        data: {
          groupId: group.id,
          weekNumber: dto.weekNumber,
          title: dto.title ?? `Báo cáo Tuần ${dto.weekNumber}`,
          completionPercentage: dto.completionPercentage,
          gitCommitUrl: dto.gitCommitUrl,
          summaryNotes: dto.summaryNotes,
          blockers: dto.blockers,
          submittedById: userId,
        },
      });
    }

    // Gửi thông báo đến GVHD
    const lecturerUserId = group.topic.lecturer?.userId;
    if (lecturerUserId) {
      await this.notifications.notify([
        {
          userId: lecturerUserId,
          type: NotificationType.PROGRESS_LOG_SUBMITTED,
          title: `Cập nhật tiến độ Tuần ${dto.weekNumber} - ${group.name}`,
          content: `Nhóm "${group.name}" (Đề tài: ${group.topic.title}) vừa cập nhật tiến độ Tuần ${dto.weekNumber} (${dto.completionPercentage}%).`,
          targetId: group.id,
        },
      ]);
    }

    return log;
  }

  async updateWeeklyLog(userId: number, logId: number, dto: UpdateWeeklyLogDto) {
    const log = await this.prisma.weeklyLog.findUnique({
      where: { id: logId },
      include: {
        group: {
          include: {
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              include: { student: true },
            },
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Nhật ký không tồn tại.');
    }

    const isMember = log.group.members.some(
      (m) => m.student.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Bạn không thuộc nhóm sở hữu nhật ký này.');
    }

    return this.prisma.weeklyLog.update({
      where: { id: logId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.completionPercentage !== undefined && {
          completionPercentage: dto.completionPercentage,
        }),
        ...(dto.gitCommitUrl !== undefined && { gitCommitUrl: dto.gitCommitUrl }),
        ...(dto.summaryNotes !== undefined && { summaryNotes: dto.summaryNotes }),
        ...(dto.blockers !== undefined && { blockers: dto.blockers }),
        submittedById: userId,
      },
    });
  }

  async deleteWeeklyLog(userId: number, logId: number) {
    const log = await this.prisma.weeklyLog.findUnique({
      where: { id: logId },
      include: {
        group: {
          include: {
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              include: { student: true },
            },
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Nhật ký không tồn tại.');
    }

    const isMember = log.group.members.some(
      (m) => m.student.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Bạn không thuộc nhóm sở hữu nhật ký này.');
    }

    if (log.isAcknowledged || log.lecturerComment) {
      throw new BadRequestException(
        'Không thể xóa nhật ký đã được Giảng viên hướng dẫn xác nhận hoặc nhận xét.',
      );
    }

    await this.prisma.weeklyLog.delete({ where: { id: logId } });
    return { success: true, message: 'Đã xóa nhật ký tiến độ.' };
  }

  async feedbackWeeklyLog(
    lecturerUserId: number,
    logId: number,
    dto: FeedbackWeeklyLogDto,
  ) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerUserId },
    });
    if (!lecturer) {
      throw new NotFoundException('Hồ sơ giảng viên không tồn tại.');
    }

    const log = await this.prisma.weeklyLog.findUnique({
      where: { id: logId },
      include: {
        group: {
          include: {
            topic: true,
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              include: { student: true },
            },
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Nhật ký không tồn tại.');
    }

    if (log.group.topic?.lecturerId !== lecturer.id) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền nhận xét nhật ký của các nhóm do bạn hướng dẫn.',
      );
    }

    const updated = await this.prisma.weeklyLog.update({
      where: { id: logId },
      data: {
        isAcknowledged: dto.isAcknowledged ?? true,
        lecturerComment: dto.lecturerComment,
        feedbackAt: new Date(),
      },
    });

    // Bắn thông báo cho các thành viên trong nhóm
    const notices = log.group.members.map((member) => ({
      userId: member.student.userId,
      type: NotificationType.PROGRESS_LOG_FEEDBACK,
      title: `GVHD đã phản hồi tiến độ Tuần ${log.weekNumber}`,
      content: `Thầy/Cô ${lecturer.fullName} đã xác nhận và phản hồi nhận xét cho báo cáo Tuần ${log.weekNumber} của nhóm bạn.`,
      targetId: log.group.id,
    }));

    if (notices.length > 0) {
      await this.notifications.notify(notices);
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────
  // PHÂN HỆ 2: HAI ĐỢT KIỂM TRA TIẾN ĐỘ TẬP TRUNG CỦA KHOA
  // ─────────────────────────────────────────────────────────

  async submitProgressReport(
    userId: number,
    stage: 'STAGE_1' | 'STAGE_2',
    dto: SubmitProgressReportDto,
    file?: Express.Multer.File,
  ) {
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
      include: {
        group: {
          include: {
            topic: {
              include: {
                lecturer: true,
              },
            },
            assignment: {
              include: {
                reviewer: true,
              },
            },
          },
        },
      },
    });

    if (!membership?.group?.topic) {
      throw new BadRequestException('Nhóm của bạn chưa có đề tài để nộp báo cáo tiến độ.');
    }

    const group = membership.group;

    let fileUrl = dto.reportFileUrl;
    let fileName = dto.reportFileName;
    let fileSize: number | undefined;

    if (file) {
      const uploaded = await this.cloudinary.uploadDocument(file);
      fileUrl = uploaded.url;
      fileName = uploaded.fileName;
      fileSize = uploaded.bytes;
    }

    const report = await this.prisma.progressReport.upsert({
      where: {
        groupId_stage: {
          groupId: group.id,
          stage,
        },
      },
      create: {
        groupId: group.id,
        stage,
        reportFileUrl: fileUrl,
        reportFileName: fileName,
        reportFileSize: fileSize,
        sourceCodeUrl: dto.sourceCodeUrl,
        submittedById: userId,
        submittedAt: new Date(),
      },
      update: {
        ...(fileUrl && { reportFileUrl: fileUrl }),
        ...(fileName && { reportFileName: fileName }),
        ...(fileSize && { reportFileSize: fileSize }),
        ...(dto.sourceCodeUrl !== undefined && { sourceCodeUrl: dto.sourceCodeUrl }),
        submittedById: userId,
        submittedAt: new Date(),
      },
    });

    // Thông báo cho GVHD
    const stageName = stage === 'STAGE_1' ? 'Tiến độ 1' : 'Tiến độ 2';
    const lecturerUserId = group.topic.lecturer?.userId;
    if (lecturerUserId) {
      await this.notifications.notify([
        {
          userId: lecturerUserId,
          type: NotificationType.PROGRESS_REPORT_SUBMITTED,
          title: `Bài nộp ${stageName} - ${group.name}`,
          content: `Nhóm "${group.name}" đã nộp báo cáo ${stageName} (Đề tài: ${group.topic.title}). Vui lòng vào kiểm tra và đánh giá.`,
          targetId: group.id,
        },
      ]);
    }

    // Nếu là Tiến độ 2, thông báo thêm cho Giảng viên phản biện (nếu đã phân công)
    if (stage === 'STAGE_2' && group.assignment?.reviewer?.userId) {
      await this.notifications.notify([
        {
          userId: group.assignment.reviewer.userId,
          type: NotificationType.PROGRESS_REPORT_SUBMITTED,
          title: `Bài nộp Tiến độ 2 (Phản biện) - ${group.name}`,
          content: `Nhóm "${group.name}" (Đề tài: ${group.topic.title}) do bạn làm GVPB đã nộp sản phẩm Tiến độ 2.`,
          targetId: group.id,
        },
      ]);
    }

    return report;
  }

  async gradeProgressReport(
    lecturerUserId: number,
    groupId: number,
    stage: 'STAGE_1' | 'STAGE_2',
    dto: GradeProgressReportDto,
  ) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerUserId },
    });
    if (!lecturer) {
      throw new NotFoundException('Hồ sơ giảng viên không tồn tại.');
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: groupId },
      include: {
        topic: true,
        assignment: true,
        members: {
          where: { status: GroupMemberStatus.ACCEPTED },
          include: { student: true },
        },
      },
    });

    if (!group || !group.topic) {
      throw new NotFoundException('Nhóm hoặc đề tài không tồn tại.');
    }

    const isSupervisor = group.topic.lecturerId === lecturer.id;
    const isReviewer = group.assignment?.reviewerId === lecturer.id;

    if (!isSupervisor && !isReviewer) {
      throw new ForbiddenException(
        'Bạn không phải là Giảng viên hướng dẫn hoặc Phản biện của nhóm này.',
      );
    }

    // Existing report
    const existing = await this.prisma.progressReport.findUnique({
      where: {
        groupId_stage: {
          groupId,
          stage,
        },
      },
    });

    if (stage === 'STAGE_1') {
      if (!isSupervisor) {
        throw new ForbiddenException(
          'Chỉ Giảng viên hướng dẫn mới có quyền chấm điểm Tiến độ lần 1.',
        );
      }

      const updated = await this.prisma.progressReport.upsert({
        where: { groupId_stage: { groupId, stage } },
        create: {
          groupId,
          stage,
          supervisorGrade: dto.grade,
          supervisorFeedback: dto.feedback,
          finalStageGrade: dto.grade,
          finalisedAt: new Date(),
        },
        update: {
          supervisorGrade: dto.grade,
          supervisorFeedback: dto.feedback,
          finalStageGrade: dto.grade,
          finalisedAt: new Date(),
        },
      });

      // Sync to StudentGrade (progress1Grade)
      const notices = [];
      for (const member of group.members) {
        await this.prisma.studentGrade.upsert({
          where: {
            groupId_studentId: {
              groupId,
              studentId: member.studentId,
            },
          },
          create: {
            groupId,
            studentId: member.studentId,
            progress1Grade: dto.grade,
          },
          update: {
            progress1Grade: dto.grade,
          },
        });

        notices.push({
          userId: member.student.userId,
          type: NotificationType.PROGRESS_REPORT_GRADED,
          title: `Đã có điểm Tiến độ lần 1 (${dto.grade}/10)`,
          content: `GVHD đã hoàn tất chấm điểm Tiến độ lần 1 cho nhóm của bạn. Điểm: ${dto.grade}/10.`,
          targetId: groupId,
        });
      }

      if (notices.length > 0) {
        await this.notifications.notify(notices);
      }

      return updated;
    }

    // STAGE_2: Hội đồng Bộ môn gồm GVHD + GVPB
    let supervisorGrade = existing?.supervisorGrade;
    let reviewerGrade = existing?.reviewerGrade;

    if (isSupervisor) {
      supervisorGrade = dto.grade;
    }
    if (isReviewer) {
      reviewerGrade = dto.grade;
    }

    // Tính điểm trung bình cộng nếu có cả 2, hoặc lấy điểm hiện tại
    let finalStageGrade = dto.grade;
    if (supervisorGrade !== undefined && supervisorGrade !== null &&
        reviewerGrade !== undefined && reviewerGrade !== null) {
      finalStageGrade = Number(((supervisorGrade + reviewerGrade) / 2).toFixed(2));
    }

    // Tiêu chí sống còn: Đạt >= 50% khối lượng công việc
    const workload = dto.workloadPercentage ?? existing?.workloadPercentage;
    let isPassed = dto.isPassed;
    if (isPassed === undefined && workload !== undefined && workload !== null) {
      isPassed = workload >= 50;
    }

    const updated = await this.prisma.progressReport.upsert({
      where: { groupId_stage: { groupId, stage } },
      create: {
        groupId,
        stage,
        supervisorGrade: isSupervisor ? dto.grade : null,
        supervisorFeedback: isSupervisor ? dto.feedback : null,
        reviewerGrade: isReviewer ? dto.grade : null,
        reviewerFeedback: isReviewer ? dto.feedback : null,
        finalStageGrade,
        workloadPercentage: workload,
        isPassed,
        finalisedAt: new Date(),
      },
      update: {
        ...(isSupervisor && {
          supervisorGrade: dto.grade,
          supervisorFeedback: dto.feedback,
        }),
        ...(isReviewer && {
          reviewerGrade: dto.grade,
          reviewerFeedback: dto.feedback,
        }),
        finalStageGrade,
        ...(workload !== undefined && { workloadPercentage: workload }),
        ...(isPassed !== undefined && { isPassed }),
        finalisedAt: new Date(),
      },
    });

    // Sync to StudentGrade (progress2Grade)
    const notices = [];
    for (const member of group.members) {
      await this.prisma.studentGrade.upsert({
        where: {
          groupId_studentId: {
            groupId,
            studentId: member.studentId,
          },
        },
        create: {
          groupId,
          studentId: member.studentId,
          progress2Grade: finalStageGrade,
        },
        update: {
          progress2Grade: finalStageGrade,
        },
      });

      const statusText = isPassed === false
        ? 'CẢNH BÁO: Chưa đạt 50% khối lượng công việc'
        : `Điểm chốt: ${finalStageGrade}/10`;

      notices.push({
        userId: member.student.userId,
        type: NotificationType.PROGRESS_REPORT_GRADED,
        title: `Kết quả đánh giá Tiến độ 2 - ${statusText}`,
        content: `Hội đồng đã đánh giá Tiến độ 2 cho nhóm bạn. Điểm: ${finalStageGrade}/10.${
          isPassed === false
            ? ' Cảnh báo: Khối lượng chưa đạt 50%, có nguy cơ bị đình chỉ bảo vệ!'
            : ' Chúc mừng bạn đủ điều kiện hoàn thiện quyển để ra bảo vệ.'
        }`,
        targetId: groupId,
      });
    }

    if (notices.length > 0) {
      await this.notifications.notify(notices);
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────
  // PHÍA GIẢNG VIÊN: THEO DÕI TOÀN BỘ CÁC NHÓM
  // ─────────────────────────────────────────────────────────

  async getLecturerGroupsProgress(
    lecturerUserId: number,
    query: QueryLecturerProgressDto,
  ) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerUserId },
    });
    if (!lecturer) {
      throw new NotFoundException('Hồ sơ giảng viên không tồn tại.');
    }

    const whereClause: Prisma.RegistrationGroupWhereInput = {
      OR: [
        { topic: { lecturerId: lecturer.id } },
        { assignment: { reviewerId: lecturer.id } },
      ],
      ...(query.semesterId && { semesterId: query.semesterId }),
      ...(query.roundId && { topic: { roundId: query.roundId } }),
    };

    const groups = await this.prisma.registrationGroup.findMany({
      where: whereClause,
      include: {
        topic: {
          include: {
            round: {
              include: {
                projectType: true,
              },
            },
          },
        },
        leader: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            class: true,
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
        weeklyLogs: {
          orderBy: [{ weekNumber: 'desc' }, { createdAt: 'desc' }],
          take: 1, // latest log
        },
        progressReports: true,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return groups.map((g) => {
      const isSupervisor = g.topic?.lecturerId === lecturer.id;
      const isReviewer = g.assignment?.reviewerId === lecturer.id;
      const latestLog = g.weeklyLogs[0] ?? null;
      const stage1 = g.progressReports.find((r) => r.stage === 'STAGE_1') ?? null;
      const stage2 = g.progressReports.find((r) => r.stage === 'STAGE_2') ?? null;

      return {
        id: g.id,
        name: g.name,
        topic: g.topic,
        leader: g.leader,
        membersCount: g.members.length,
        members: g.members.map((m) => m.student),
        isSupervisor,
        isReviewer,
        reviewer: g.assignment?.reviewer ?? null,
        latestLog: latestLog
          ? {
              id: latestLog.id,
              weekNumber: latestLog.weekNumber,
              title: latestLog.title,
              completionPercentage: latestLog.completionPercentage,
              isAcknowledged: latestLog.isAcknowledged,
              hasComment: !!latestLog.lecturerComment,
              createdAt: latestLog.createdAt,
            }
          : null,
        stage1Status: stage1
          ? {
              submitted: true,
              submittedAt: stage1.submittedAt,
              grade: stage1.supervisorGrade,
              feedback: stage1.supervisorFeedback,
              isFinalised: stage1.finalStageGrade !== null,
            }
          : { submitted: false },
        stage2Status: stage2
          ? {
              submitted: true,
              submittedAt: stage2.submittedAt,
              supervisorGrade: stage2.supervisorGrade,
              reviewerGrade: stage2.reviewerGrade,
              finalGrade: stage2.finalStageGrade,
              workloadPercentage: stage2.workloadPercentage,
              isPassed: stage2.isPassed,
              isFinalised: stage2.finalStageGrade !== null,
            }
          : { submitted: false },
      };
    });
  }

  async getLecturerGroupDetail(lecturerUserId: number, groupId: number) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerUserId },
    });
    if (!lecturer) {
      throw new NotFoundException('Hồ sơ giảng viên không tồn tại.');
    }

    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: groupId },
      include: {
        topic: {
          include: {
            round: {
              include: { projectType: true },
            },
          },
        },
        leader: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            class: true,
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
        weeklyLogs: {
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
          orderBy: [{ weekNumber: 'desc' }, { createdAt: 'desc' }],
        },
        progressReports: {
          include: {
            submittedBy: {
              select: {
                id: true,
                email: true,
                studentProfile: {
                  select: { fullName: true },
                },
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
      },
    });

    if (!group) {
      throw new NotFoundException('Nhóm không tồn tại.');
    }

    const isSupervisor = group.topic?.lecturerId === lecturer.id;
    const isReviewer = group.assignment?.reviewerId === lecturer.id;

    if (!isSupervisor && !isReviewer) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập thông tin nhóm này.',
      );
    }

    const stage1 = group.progressReports.find((r) => r.stage === 'STAGE_1') ?? null;
    const stage2 = group.progressReports.find((r) => r.stage === 'STAGE_2') ?? null;

    return {
      group: {
        id: group.id,
        name: group.name,
        topic: group.topic,
        leader: group.leader,
        members: group.members,
        reviewer: group.assignment?.reviewer ?? null,
      },
      isSupervisor,
      isReviewer,
      weeklyLogs: group.weeklyLogs,
      progressReports: {
        stage1,
        stage2,
      },
    };
  }
}
