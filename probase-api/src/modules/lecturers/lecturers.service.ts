import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '../../../generated/prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { QueryLecturersDto } from './dto/query-lecturers.dto';
import {
  MentoringLoadService,
  type MentoringLoad,
} from './mentoring-load.service';

const DIRECTORY_SELECT = {
  id: true,
  fullName: true,
  academicTitle: true,
  researchInterests: true,
  maxMentoringQuota: true,
  user: { select: { avatarUrl: true } },
} satisfies Prisma.LecturerProfileSelect;

type DirectoryRow = Prisma.LecturerProfileGetPayload<{
  select: typeof DIRECTORY_SELECT;
}>;

@Injectable()
export class LecturersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mentoring: MentoringLoadService,
  ) {}

  async findAll(query: QueryLecturersDto) {
    const where: Prisma.LecturerProfileWhereInput = {
      // Chỉ lấy giảng viên thực thụ tham gia hướng dẫn (loại trừ tài khoản Giáo vụ / ADMIN và tài khoản bị khóa)
      user: { isActive: true, role: Role.LECTURER },
      isAcademicAssistant: false,
      ...(query.q && {
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { lecturerCode: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total, semesterId] = await Promise.all([
      this.prisma.lecturerProfile.findMany({
        where,
        select: DIRECTORY_SELECT,
        orderBy: { fullName: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.lecturerProfile.count({ where }),
      this.mentoring.activeSemesterId(),
    ]);

    const load = await this.mentoring.loadFor(rows, semesterId);

    return {
      items: rows.map((row) => render(row, load(row))),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(
    lecturerProfileId: number,
    viewer: { userId: number; role: Role },
  ) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { id: lecturerProfileId },
      select: {
        ...DIRECTORY_SELECT,
        bio: true,
        phone: true,
        user: { select: { email: true, avatarUrl: true, isActive: true } },
      },
    });

    if (!lecturer || !lecturer.user.isActive) {
      throw new NotFoundException('Không tìm thấy giảng viên');
    }

    const [maySeeContact, load] = await Promise.all([
      this.maySeeContact(lecturerProfileId, viewer),
      this.mentoring
        .activeSemesterId()
        .then((semesterId) => this.mentoring.loadForOne(lecturer, semesterId)),
    ]);

    const { phone, bio, user } = lecturer;

    return {
      ...render({ ...lecturer, user: { avatarUrl: user.avatarUrl } }, load),
      bio,
      email: maySeeContact ? user.email : null,
      phone: maySeeContact ? phone : null,
    };
  }

  private async maySeeContact(
    lecturerProfileId: number,
    viewer: { userId: number; role: Role },
  ): Promise<boolean> {
    if (viewer.role !== 'STUDENT') return true;

    const supervised = await this.prisma.registrationGroupMember.count({
      where: {
        student: { userId: viewer.userId },
        group: { topic: { lecturerId: lecturerProfileId } },
      },
    });

    return supervised > 0;
  }
}

function render(lecturer: DirectoryRow, mentoring: MentoringLoad) {
  return {
    id: lecturer.id,
    fullName: lecturer.fullName,
    academicTitle: lecturer.academicTitle,
    researchInterests: lecturer.researchInterests,
    avatarUrl: lecturer.user.avatarUrl,
    mentoring,
  };
}
