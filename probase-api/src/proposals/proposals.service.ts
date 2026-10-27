import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  Prisma,
  RegistrationGroupStatus,
  Role,
  TopicProposalStatus,
  TopicStatus,
} from '../../generated/prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MentoringLoadService } from '../lecturers/mentoring-load.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { RoundsService } from '../rounds/rounds.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import {
  AcceptProposalDto,
  RejectProposalDto,
  RequestChangesProposalDto,
} from './dto/answer-proposal.dto';
import { QueryProposalsDto } from './dto/query-proposals.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';

const PROPOSAL_SELECT = {
  id: true,
  status: true,
  title: true,
  description: true,
  expectedOutcomes: true,
  lecturerFeedback: true,
  createdAt: true,
  updatedAt: true,
  semester: { select: { id: true, name: true, code: true } },
  projectType: { select: { id: true, name: true, code: true } },
  student: {
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      class: true,
      user: { select: { avatarUrl: true } },
    },
  },
  requestedLecturer: {
    select: { id: true, fullName: true, academicTitle: true },
  },
  acceptedByLecturer: {
    select: { id: true, fullName: true, academicTitle: true },
  },
  attachments: {
    select: {
      id: true,
      fileUrl: true,
      filePublicId: true,
      fileName: true,
      fileSize: true,
      fileType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  // What the yes turned into. Its status matters as much as its id: a topic
  // accepted by a lecturer still waits on the faculty office, and a student
  // staring at a register button that is not there deserves to know which of the
  // two is holding it up.
  convertedTopic: { select: { id: true, title: true, status: true } },
} satisfies Prisma.TopicProposalSelect;

type ProposalRow = Prisma.TopicProposalGetPayload<{
  select: typeof PROPOSAL_SELECT;
}>;

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rounds: RoundsService,
    private readonly phases: RoundPhaseService,
    private readonly notifications: NotificationsService,
    private readonly mentoring: MentoringLoadService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateProposalDto, userId: number) {
    const student = await this.requireStudent(userId);
    const semester = await this.requireActiveSemester();
    const round = await this.rounds.requireRoundFor(
      semester.id,
      dto.projectTypeId,
    );

    const eligible = await this.rounds.eligibleRoundIds(userId, [semester.id]);
    if (!eligible.includes(round.id)) {
      throw new ForbiddenException(
        'Khoá của bạn không mở loại đồ án này trong học kỳ hiện tại',
      );
    }

    await this.phases.requireCanPropose(round.id, student.id);
    await this.requireNoGroup(student.id, semester.id);
    await this.requireNoPendingProposal(student.id);

    const lecturer = await this.requireLecturer(dto.requestedLecturerId);

    const proposal = await this.prisma.topicProposal.create({
      data: {
        semesterId: semester.id,
        studentId: student.id,
        projectTypeId: dto.projectTypeId,
        requestedLecturerId: lecturer.id,
        title: dto.title,
        description: dto.description,
        expectedOutcomes: dto.expectedOutcomes,
      },
      select: PROPOSAL_SELECT,
    });

    await this.notifications.notify([
      {
        userId: lecturer.userId,
        type: 'PROPOSAL_SUBMITTED',
        title: 'Có đề xuất đề tài mới',
        content: `${student.fullName} đề xuất đề tài "${proposal.title}" và đang chờ bạn trả lời.`,
        targetId: proposal.id,
      },
    ]);

    return render(proposal);
  }

  async findAll(query: QueryProposalsDto, userId: number, role: Role) {
    const where: Prisma.TopicProposalWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.semesterId && { semesterId: query.semesterId }),
    };

    if (role === Role.STUDENT) {
      where.studentId = (await this.requireStudent(userId)).id;
    } else if (role === Role.LECTURER) {
      where.requestedLecturerId = (
        await this.requireOwnLecturerProfile(userId)
      ).id;
    }

    const [items, total] = await Promise.all([
      this.prisma.topicProposal.findMany({
        where,
        select: PROPOSAL_SELECT,
        // Pending first, then newest: a lecturer opens this screen to answer
        // what is waiting, not to browse what they answered last month.
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.topicProposal.count({ where }),
    ]);

    return {
      items: items.map(render),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number, userId: number, role: Role) {
    const proposal = await this.requireProposal(id);

    if (!(await this.canView(proposal.id, userId, role))) {
      throw new NotFoundException('Không tìm thấy đề xuất');
    }

    return render(proposal);
  }

  async update(id: number, dto: UpdateProposalDto, userId: number) {
    const student = await this.requireStudent(userId);
    const proposal = await this.requireProposal(id);

    await this.requireOwnPending(id, student.id, proposal.status);

    const updated = await this.prisma.topicProposal.update({
      where: { id },
      data: dto,
      select: PROPOSAL_SELECT,
    });

    return render(updated);
  }

  async remove(id: number, userId: number) {
    const student = await this.requireStudent(userId);
    const proposal = await this.requireProposal(id);

    await this.requireOwnPending(id, student.id, proposal.status);

    const attachments = await this.prisma.proposalAttachment.findMany({
      where: { proposalId: id },
    });

    for (const att of attachments) {
      await this.cloudinary.destroy(
        att.filePublicId,
        att.fileType === 'IMAGE' ? 'image' : 'raw',
      );
    }

    await this.prisma.$transaction([
      this.prisma.notification.deleteMany({
        where: {
          type: {
            in: [
              'PROPOSAL_SUBMITTED',
              'PROPOSAL_RESUBMITTED',
              'PROPOSAL_REVISION_REQUESTED',
            ],
          },
          targetId: id,
        },
      }),
      this.prisma.topicProposal.delete({ where: { id } }),
    ]);

    return { message: 'Đã rút lại đề xuất' };
  }

  async accept(id: number, dto: AcceptProposalDto, userId: number) {
    const lecturer = await this.requireOwnLecturerProfile(userId);
    const proposal = await this.requireAnswerable(id, lecturer.id);

    const round = await this.rounds.requireRoundFor(
      proposal.semesterId,
      proposal.projectTypeId,
    );
    await this.phases.requireCanAcceptProposal(round.id);

    // Last of the three gates, and the only one about the lecturer rather than
    // the calendar. Checked here rather than when the student registers: the
    // ceiling is the faculty's arrangement with this lecturer, and a student
    // turned away at the register button for it would be paying for a
    // conversation they were never part of.
    await this.mentoring.requireRoomForOneMore(lecturer, proposal.semesterId);

    const topic = await this.prisma.$transaction(async (tx) => {
      const created = await tx.topic.create({
        data: {
          semesterId: proposal.semesterId,
          roundId: round.id,
          lecturerId: lecturer.id,
          sourceProposalId: proposal.id,
          title: proposal.title,
          description: proposal.description,
          expectedOutcomes: proposal.expectedOutcomes,
          maxStudents: dto.maxStudents,
          status: TopicStatus.PENDING,
        },
        select: { id: true, title: true },
      });

      await tx.topicProposal.update({
        where: { id, status: TopicProposalStatus.PENDING },
        data: {
          status: TopicProposalStatus.ACCEPTED,
          acceptedByLecturerId: lecturer.id,
        },
      });

      return created;
    });

    await this.notifications.notify([
      {
        userId: proposal.student.userId,
        type: 'PROPOSAL_ACCEPTED',
        title: 'Đề xuất của bạn đã được nhận',
        content: `${lecturerName(lecturer)} nhận hướng dẫn đề tài "${topic.title}". Đề tài đang chờ khoa phê duyệt, sau đó bạn đăng ký để giữ chỗ.`,
        targetId: topic.id,
      },
    ]);

    return this.findOne(id, userId, Role.LECTURER);
  }

  async reject(id: number, dto: RejectProposalDto, userId: number) {
    const lecturer = await this.requireOwnLecturerProfile(userId);
    const proposal = await this.requireAnswerable(id, lecturer.id);

    const updated = await this.prisma.topicProposal.update({
      where: { id, status: TopicProposalStatus.PENDING },
      data: {
        status: TopicProposalStatus.REJECTED,
        acceptedByLecturerId: null,
        lecturerFeedback: dto.feedback,
      },
      select: PROPOSAL_SELECT,
    });

    await this.notifications.notify([
      {
        userId: proposal.student.userId,
        type: 'PROPOSAL_REJECTED',
        title: 'Đề xuất chưa được nhận',
        content: `${lecturerName(lecturer)} chưa nhận đề tài "${proposal.title}". Mở đề xuất để đọc nhận xét.`,
        targetId: proposal.id,
      },
    ]);

    return render(updated);
  }

  async requestChanges(
    id: number,
    dto: RequestChangesProposalDto,
    userId: number,
  ) {
    const lecturer = await this.requireOwnLecturerProfile(userId);
    const proposal = await this.requireAnswerable(id, lecturer.id);

    const updated = await this.prisma.topicProposal.update({
      where: { id, status: TopicProposalStatus.PENDING },
      data: {
        status: TopicProposalStatus.NEEDS_REVISION,
        lecturerFeedback: dto.feedback,
      },
      select: PROPOSAL_SELECT,
    });

    await this.notifications.notify([
      {
        userId: proposal.student.userId,
        type: 'PROPOSAL_REVISION_REQUESTED',
        title: 'Giảng viên yêu cầu chỉnh sửa đề xuất',
        content: `${lecturerName(lecturer)} đã gửi góp ý và yêu cầu bạn chỉnh sửa đề tài "${proposal.title}". Nhấn để xem và cập nhật.`,
        targetId: proposal.id,
      },
    ]);

    return render(updated);
  }

  async resubmit(id: number, dto: UpdateProposalDto, userId: number) {
    const student = await this.requireStudent(userId);
    const proposal = await this.requireProposal(id);

    await this.requireOwnPending(id, student.id, proposal.status);

    const updated = await this.prisma.topicProposal.update({
      where: { id },
      data: {
        ...dto,
        status: TopicProposalStatus.PENDING,
      },
      select: PROPOSAL_SELECT,
    });

    if (updated.requestedLecturer) {
      const lecturer = await this.prisma.lecturerProfile.findUnique({
        where: { id: updated.requestedLecturer.id },
        select: { userId: true },
      });

      if (lecturer) {
        await this.notifications.notify([
          {
            userId: lecturer.userId,
            type: 'PROPOSAL_RESUBMITTED',
            title: 'Sinh viên đã gửi lại đề xuất',
            content: `${student.fullName} đã cập nhật lại đề xuất "${updated.title}" sau khi nhận góp ý. Vui lòng kiểm tra lại.`,
            targetId: updated.id,
          },
        ]);
      }
    }

    return render(updated);
  }

  async uploadAttachment(
    id: number,
    file: Express.Multer.File,
    userId: number,
  ) {
    const student = await this.requireStudent(userId);
    const proposal = await this.requireProposal(id);

    await this.requireOwnPending(id, student.id, proposal.status);

    const count = await this.prisma.proposalAttachment.count({
      where: { proposalId: id },
    });
    if (count >= 5) {
      throw new BadRequestException('Mỗi đề xuất chỉ được đính kèm tối đa 5 tệp.');
    }

    const stored = await this.cloudinary.uploadProposalAttachment(file);

    return this.prisma.proposalAttachment.create({
      data: {
        proposalId: id,
        fileUrl: stored.url,
        filePublicId: stored.publicId,
        fileName: stored.fileName,
        fileSize: stored.bytes,
        fileType: stored.fileType,
      },
      select: {
        id: true,
        fileUrl: true,
        filePublicId: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        createdAt: true,
      },
    });
  }

  async removeAttachment(id: number, attachmentId: number, userId: number) {
    const student = await this.requireStudent(userId);
    const proposal = await this.requireProposal(id);

    await this.requireOwnPending(id, student.id, proposal.status);

    const attachment = await this.prisma.proposalAttachment.findFirst({
      where: { id: attachmentId, proposalId: id },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }

    await this.cloudinary.destroy(
      attachment.filePublicId,
      attachment.fileType === 'IMAGE' ? 'image' : 'raw',
    );

    await this.prisma.proposalAttachment.delete({
      where: { id: attachmentId },
    });

    return { message: 'Đã xoá tệp đính kèm' };
  }

  // ── guards ────────────────────────────────────────────────

  private async requireStudent(userId: number) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, fullName: true, cohort: true },
    });

    if (!student) {
      throw new ForbiddenException('Tài khoản này không có hồ sơ sinh viên');
    }

    return student;
  }

  private async requireOwnLecturerProfile(userId: number) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
      // The quota comes along because accepting is the one action that has to
      // weigh it, and this is the only read of the profile that action makes.
      select: {
        id: true,
        fullName: true,
        academicTitle: true,
        maxMentoringQuota: true,
      },
    });

    if (!lecturer) {
      throw new ForbiddenException('Tài khoản này không có hồ sơ giảng viên');
    }

    return lecturer;
  }

  private async requireLecturer(lecturerProfileId: number) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { id: lecturerProfileId },
      select: { id: true, userId: true, user: { select: { isActive: true } } },
    });

    if (!lecturer || !lecturer.user.isActive) {
      throw new NotFoundException('Không tìm thấy giảng viên này');
    }

    return lecturer;
  }

  private async requireActiveSemester() {
    const semester = await this.prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!semester) {
      throw new ConflictException('Chưa có học kỳ nào đang mở');
    }

    return semester;
  }

  private async requireProposal(id: number) {
    const proposal = await this.prisma.topicProposal.findUnique({
      where: { id },
      select: {
        ...PROPOSAL_SELECT,
        semesterId: true,
        projectTypeId: true,
        studentId: true,
        requestedLecturerId: true,
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            class: true,
            userId: true,
            user: { select: { avatarUrl: true } },
          },
        },
      },
    });

    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất');

    return proposal;
  }

  private async canView(id: number, userId: number, role: Role) {
    if (role === Role.ADMIN) return true;

    const proposal = await this.prisma.topicProposal.findFirst({
      where: {
        id,
        ...(role === Role.STUDENT
          ? { student: { userId } }
          : { requestedLecturer: { userId } }),
      },
      select: { id: true },
    });

    return proposal !== null;
  }

  private async requireOwnPending(
    id: number,
    studentId: number,
    status: TopicProposalStatus,
  ) {
    const owned = await this.prisma.topicProposal.findFirst({
      where: { id, studentId },
      select: { id: true },
    });

    if (!owned) throw new NotFoundException('Không tìm thấy đề xuất');

    if (
      status !== TopicProposalStatus.PENDING &&
      status !== TopicProposalStatus.NEEDS_REVISION
    ) {
      throw new ConflictException(
        'Đề xuất đã được chốt (nhận hoặc từ chối) nên không sửa hay rút lại được nữa.',
      );
    }
  }

  private async requireAnswerable(id: number, lecturerProfileId: number) {
    const proposal = await this.requireProposal(id);

    if (proposal.requestedLecturerId !== lecturerProfileId) {
      throw new NotFoundException('Không tìm thấy đề xuất');
    }

    if (proposal.status !== TopicProposalStatus.PENDING) {
      throw new ConflictException('Đề xuất này đã được trả lời rồi');
    }

    return proposal;
  }

  private async requireNoGroup(studentId: number, semesterId: number) {
    const membership = await this.prisma.registrationGroupMember.findFirst({
      where: {
        studentId,
        semesterId,
        status: GroupMemberStatus.ACCEPTED,
        group: { status: { not: RegistrationGroupStatus.REJECTED } },
      },
      select: { id: true },
    });

    if (membership) {
      throw new ConflictException(
        'Bạn đã có đề tài trong học kỳ này. Rời nhóm trước nếu muốn đề xuất đề tài khác.',
      );
    }
  }

  private async requireNoPendingProposal(studentId: number) {
    const pending = await this.prisma.topicProposal.findFirst({
      where: {
        studentId,
        status: {
          in: [TopicProposalStatus.PENDING, TopicProposalStatus.NEEDS_REVISION],
        },
      },
      select: { id: true },
    });

    if (pending) {
      throw new ConflictException(
        'Bạn đang có một đề xuất đang chờ phản hồi hoặc cần chỉnh sửa. Hãy hoàn thiện hoặc rút lại đề xuất đó trước khi gửi cái mới.',
      );
    }
  }
}

function render(proposal: ProposalRow) {
  const { student, ...rest } = proposal;
  const { user, ...studentRest } = student;

  return { ...rest, student: { ...studentRest, avatarUrl: user.avatarUrl } };
}

function lecturerName(lecturer: {
  fullName: string;
  academicTitle: string | null;
}) {
  return lecturer.academicTitle
    ? `${lecturer.academicTitle} ${lecturer.fullName}`
    : lecturer.fullName;
}
