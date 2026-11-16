import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '../../../generated/prisma/client';
import { recordAudit } from '../../core/audit/audit-entry';
import { PrismaService } from '../../core/prisma/prisma.service';
import { QueryAdminLecturersDto } from './dto/query-admin-lecturers.dto';
import { QueryLecturersDto } from './dto/query-lecturers.dto';
import { UpdateLecturerRoleDto } from './dto/update-lecturer-role.dto';
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

  async findAdminRoster(query: QueryAdminLecturersDto) {
    const where: Prisma.LecturerProfileWhereInput = {
      ...(query.majorId && { majorId: query.majorId }),
      ...(query.q && {
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { lecturerCode: { contains: query.q, mode: 'insensitive' } },
          { user: { email: { contains: query.q, mode: 'insensitive' } } },
        ],
      }),
    };

    if (query.role && query.role !== 'ALL') {
      if (query.role === 'ADMIN') {
        where.OR = [
          { isAcademicAssistant: true },
          { user: { role: Role.ADMIN } },
        ];
      } else if (query.role === 'TTBM') {
        where.isHeadOfDepartment = true;
      } else if (query.role === 'GVCN') {
        where.OR = [
          { isHomeroomTeacher: true },
          { user: { role: (Role as any).GVCN } },
        ];
      } else if (query.role === 'LECTURER') {
        where.isHeadOfDepartment = false;
        where.isAcademicAssistant = false;
        where.isHomeroomTeacher = false;
        where.user = { role: Role.LECTURER };
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.lecturerProfile.findMany({
        where,
        select: {
          id: true,
          userId: true,
          lecturerCode: true,
          fullName: true,
          academicTitle: true,
          phone: true,
          isHeadOfDepartment: true,
          isAcademicAssistant: true,
          isHomeroomTeacher: true,
          majorId: true,
          major: { select: { id: true, name: true, code: true } },
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { isAcademicAssistant: 'desc' },
          { isHeadOfDepartment: 'desc' },
          { isHomeroomTeacher: 'desc' },
          { fullName: 'asc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.lecturerProfile.count({ where }),
    ]);

    return {
      items: rows.map((r) => {
        let assignedRole: 'ADMIN' | 'TTBM' | 'GVCN' | 'LECTURER' = 'LECTURER';
        if (r.isAcademicAssistant || r.user.role === Role.ADMIN) {
          assignedRole = 'ADMIN';
        } else if (r.isHeadOfDepartment) {
          assignedRole = 'TTBM';
        } else if (r.isHomeroomTeacher || (r.user.role as string) === 'GVCN') {
          assignedRole = 'GVCN';
        }

        return {
          id: r.id,
          userId: r.userId,
          lecturerCode: r.lecturerCode,
          fullName: r.fullName,
          academicTitle: r.academicTitle,
          phone: r.phone,
          email: r.user.email,
          avatarUrl: r.user.avatarUrl,
          isActive: r.user.isActive,
          userRole: r.user.role,
          major: r.major,
          assignedRole,
          isHeadOfDepartment: r.isHeadOfDepartment,
          isAcademicAssistant: r.isAcademicAssistant,
          isHomeroomTeacher: r.isHomeroomTeacher,
        };
      }),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async updateRole(
    targetUserId: number,
    dto: UpdateLecturerRoleDto,
    currentAdminId: number,
  ) {
    if (targetUserId === currentAdminId) {
      throw new ForbiddenException(
        'Bạn không thể tự thay đổi vai trò hoặc chức vụ của chính mình.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { lecturerProfile: true },
    });

    if (!targetUser || !targetUser.lecturerProfile) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên.');
    }

    if (dto.assignedRole === 'TTBM' && !dto.majorId) {
      throw new BadRequestException(
        'Vui lòng chọn Bộ môn khi bổ nhiệm chức vụ Tổ trưởng Bộ môn.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Nếu bổ nhiệm TTBM, chuyển TTBM cũ của bộ môn này về Giảng viên thường
      if (dto.assignedRole === 'TTBM' && dto.majorId) {
        await tx.lecturerProfile.updateMany({
          where: {
            majorId: dto.majorId,
            isHeadOfDepartment: true,
            userId: { not: targetUserId },
          },
          data: { isHeadOfDepartment: false },
        });
      }

      // 2. Cập nhật cờ quyền theo vai trò được chọn
      let isHeadOfDepartment = false;
      let isAcademicAssistant = false;
      let isHomeroomTeacher = false;
      let targetUserRole: Role = Role.LECTURER;

      if (dto.assignedRole === 'ADMIN') {
        isAcademicAssistant = true;
        targetUserRole = Role.ADMIN;
      } else if (dto.assignedRole === 'TTBM') {
        isHeadOfDepartment = true;
        targetUserRole = Role.LECTURER;
      } else if (dto.assignedRole === 'GVCN') {
        isHomeroomTeacher = true;
        targetUserRole = Role.LECTURER;
      } else {
        // LECTURER
        targetUserRole = Role.LECTURER;
      }

      const updatedProfile = await tx.lecturerProfile.update({
        where: { userId: targetUserId },
        data: {
          isHeadOfDepartment,
          isAcademicAssistant,
          isHomeroomTeacher,
          ...(dto.majorId !== undefined && { majorId: dto.majorId }),
        },
        include: {
          major: true,
        },
      });

      await tx.user.update({
        where: { id: targetUserId },
        data: { role: targetUserRole },
      });

      await recordAudit(tx, {
        userId: currentAdminId,
        action: 'UPDATE_LECTURER_ROLE',
        targetTable: 'lecturer_profiles',
        targetId: targetUser.lecturerProfile.id,
        oldValue: {
          role: targetUser.role,
          isHeadOfDepartment: targetUser.lecturerProfile.isHeadOfDepartment,
          isAcademicAssistant: targetUser.lecturerProfile.isAcademicAssistant,
          isHomeroomTeacher: targetUser.lecturerProfile.isHomeroomTeacher,
          majorId: targetUser.lecturerProfile.majorId,
        },
        newValue: {
          assignedRole: dto.assignedRole,
          role: targetUserRole,
          isHeadOfDepartment,
          isAcademicAssistant,
          isHomeroomTeacher,
          majorId: dto.majorId,
        },
      });

      return {
        success: true,
        assignedRole: dto.assignedRole,
        major: updatedProfile.major,
      };
    });
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
