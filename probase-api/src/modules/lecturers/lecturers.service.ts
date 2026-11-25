import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, TopicStatus } from '../../../generated/prisma/client';
import { recordAudit } from '../../core/audit/audit-entry';
import { PrismaService } from '../../core/prisma/prisma.service';
import { resolveUserPermissionRoles } from '../permissions/permissions.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { QueryAdminLecturersDto } from './dto/query-admin-lecturers.dto';
import { QueryLecturersDto } from './dto/query-lecturers.dto';
import { UpdateLecturerRoleDto } from './dto/update-lecturer-role.dto';
import {
  MentoringLoadService,
  type MentoringLoad,
} from './mentoring-load.service';

export interface LecturerTopicStats {
  currentCount: number;
  openCount: number;
  pastCount: number;
}

const STUDENT_VISIBLE_TOPIC_STATUSES: TopicStatus[] = [
  TopicStatus.OPEN,
  TopicStatus.IN_PROGRESS,
  TopicStatus.COMPLETED,
];

const DIRECTORY_SELECT = {
  id: true,
  lecturerCode: true,
  fullName: true,
  academicTitle: true,
  researchInterests: true,
  maxMentoringQuota: true,
  isHeadOfDepartment: true,
  isHomeroomTeacher: true,
  major: { select: { id: true, name: true, code: true } },
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
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(query: QueryLecturersDto, role: Role = Role.STUDENT) {
    const academicTitleVariants = query.academicTitle
      ? [
          query.academicTitle.replace(/\.+$/, ''),
          `${query.academicTitle.replace(/\.+$/, '')}.`,
        ]
      : undefined;

    const where: Prisma.LecturerProfileWhereInput = {
      // Chỉ lấy giảng viên thực thụ tham gia hướng dẫn (loại trừ tài khoản Giáo vụ / ADMIN và tài khoản bị khóa)
      user: { isActive: true, role: { in: [Role.LECTURER, Role.GVCN] } },
      isAcademicAssistant: false,
      ...(query.majorId && { majorId: query.majorId }),
      ...(academicTitleVariants && {
        OR: academicTitleVariants.map((variant) => ({
          academicTitle: { equals: variant, mode: 'insensitive' as const },
        })),
      }),
      ...(query.q && {
        AND: [
          {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { lecturerCode: { contains: query.q, mode: 'insensitive' } },
              { researchInterests: { contains: query.q, mode: 'insensitive' } },
            ],
          },
        ],
      }),
    };

    const availability = query.availability ?? 'ALL';
    const semesterId = await this.mentoring.activeSemesterId();

    let pagedRows: DirectoryRow[];
    let total: number;
    let load: (lecturer: DirectoryRow) => MentoringLoad;

    if (availability === 'ALL') {
      const [rows, count] = await Promise.all([
        this.prisma.lecturerProfile.findMany({
          where,
          select: DIRECTORY_SELECT,
          orderBy: { fullName: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.lecturerProfile.count({ where }),
      ]);
      pagedRows = rows;
      total = count;
      load = await this.mentoring.loadFor(rows, semesterId);
    } else {
      const allRows = await this.prisma.lecturerProfile.findMany({
        where,
        select: DIRECTORY_SELECT,
        orderBy: { fullName: 'asc' },
      });
      load = await this.mentoring.loadFor(allRows, semesterId);
      const filtered = allRows.filter((row) =>
        availability === 'AVAILABLE' ? !load(row).atQuota : load(row).atQuota,
      );
      total = filtered.length;
      const start = (query.page - 1) * query.limit;
      pagedRows = filtered.slice(start, start + query.limit);
    }

    const topicStats = await this.topicStatsFor(
      pagedRows.map((r) => r.id),
      semesterId,
      role,
    );

    return {
      items: pagedRows.map((row) =>
        render(row, load(row), topicStats.get(row.id)),
      ),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
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

    const semesterId = await this.mentoring.activeSemesterId();
    const [maySeeContact, load, topicStats] = await Promise.all([
      this.maySeeContact(lecturerProfileId, viewer),
      this.mentoring.loadForOne(lecturer, semesterId),
      this.topicStatsFor([lecturerProfileId], semesterId, viewer.role),
    ]);

    const { phone, bio, user } = lecturer;

    return {
      ...render(
        { ...lecturer, user: { avatarUrl: user.avatarUrl } },
        load,
        topicStats.get(lecturerProfileId),
      ),
      bio,
      email: maySeeContact ? user.email : null,
      phone: maySeeContact ? phone : null,
    };
  }

  private async topicStatsFor(
    lecturerIds: number[],
    activeSemesterId: number | undefined,
    role: Role,
  ): Promise<Map<number, LecturerTopicStats>> {
    const result = new Map<number, LecturerTopicStats>();
    if (lecturerIds.length === 0) return result;

    const statusFilter: Prisma.EnumTopicStatusFilter =
      role === Role.STUDENT
        ? { in: STUDENT_VISIBLE_TOPIC_STATUSES }
        : { not: TopicStatus.DRAFT };

    const grouped = await this.prisma.topic.groupBy({
      by: ['lecturerId', 'semesterId', 'status'],
      where: {
        lecturerId: { in: lecturerIds },
        status: statusFilter,
      },
      _count: { _all: true },
    });

    for (const id of lecturerIds) {
      result.set(id, { currentCount: 0, openCount: 0, pastCount: 0 });
    }

    for (const row of grouped) {
      const entry = result.get(row.lecturerId);
      if (!entry) continue;
      const count = row._count._all;
      if (activeSemesterId !== undefined && row.semesterId === activeSemesterId) {
        entry.currentCount += count;
        if (row.status === TopicStatus.OPEN) {
          entry.openCount += count;
        }
      } else {
        entry.pastCount += count;
      }
    }

    return result;
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
        where.OR = [{ isHomeroomTeacher: true }, { user: { role: Role.GVCN } }];
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

    const userIds = rows.map((r) => r.userId);
    const [userPerms, rolePerms] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, permission: true },
      }),
      this.prisma.rolePermission.findMany({
        select: { role: true, permission: true },
      }),
    ]);

    const rolePermMap = new Map<string, Set<string>>();
    for (const rp of rolePerms) {
      if (!rolePermMap.has(rp.role)) {
        rolePermMap.set(rp.role, new Set());
      }
      rolePermMap.get(rp.role)!.add(rp.permission);
    }

    const permMap = new Map<number, string[]>();
    for (const up of userPerms) {
      if (!permMap.has(up.userId)) {
        permMap.set(up.userId, []);
      }
      permMap.get(up.userId)!.push(up.permission);
    }

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

        const subjectRoles = resolveUserPermissionRoles({
          role: r.user.role,
          lecturerProfile: {
            isHeadOfDepartment: r.isHeadOfDepartment,
            isHomeroomTeacher: r.isHomeroomTeacher,
            isAcademicAssistant: r.isAcademicAssistant,
          },
        });
        const inherited = new Set<string>();
        for (const roleKey of subjectRoles) {
          for (const perm of rolePermMap.get(roleKey) ?? []) {
            inherited.add(perm);
          }
        }
        const customPermissions = (permMap.get(r.userId) ?? []).filter(
          (perm) => !inherited.has(perm),
        );

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
          customPermissions,
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

    if (targetUser.role === Role.ADMIN) {
      throw new ForbiddenException(
        'Không thể thay đổi vai trò hoặc chức vụ của Giáo vụ Khoa.',
      );
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
      let isHomeroomTeacher = false;

      if (dto.assignedRole === 'TTBM') {
        isHeadOfDepartment = true;
      } else if (dto.assignedRole === 'GVCN') {
        isHomeroomTeacher = true;
      }
      // LECTURER: cả 2 cờ đều false

      const updatedProfile = await tx.lecturerProfile.update({
        where: { userId: targetUserId },
        data: {
          isHeadOfDepartment,
          isAcademicAssistant: false,
          isHomeroomTeacher,
          ...(dto.majorId !== undefined && { majorId: dto.majorId }),
        },
        include: {
          major: true,
        },
      });

      await tx.user.update({
        where: { id: targetUserId },
        data: { role: Role.LECTURER },
      });

      // 3. Cập nhật & loại bỏ quyền bổ sung đã có sẵn trong vai trò mới
      const updatedSubject = {
        role: Role.LECTURER,
        lecturerProfile: {
          isHeadOfDepartment,
          isHomeroomTeacher,
          isAcademicAssistant: false,
        },
      };
      const updatedCustomPermissions =
        dto.customPermissions !== undefined
          ? await this.permissionsService.syncUserCustomPermissions(
              tx,
              targetUserId,
              updatedSubject,
              dto.customPermissions,
              currentAdminId,
            )
          : await this.permissionsService.pruneRedundantUserPermissionsForUser(
              tx,
              targetUserId,
              updatedSubject,
            );

      await recordAudit(tx, {
        userId: currentAdminId,
        action: 'UPDATE_LECTURER_ROLE',
        targetTable: 'lecturer_profiles',
        targetId: updatedProfile.id,
        oldValue: {
          role: targetUser.role,
          isHeadOfDepartment:
            targetUser.lecturerProfile?.isHeadOfDepartment ?? false,
          isAcademicAssistant:
            targetUser.lecturerProfile?.isAcademicAssistant ?? false,
          isHomeroomTeacher:
            targetUser.lecturerProfile?.isHomeroomTeacher ?? false,
          majorId: targetUser.lecturerProfile?.majorId ?? null,
        },
        newValue: {
          assignedRole: dto.assignedRole,
          role: Role.LECTURER,
          isHeadOfDepartment,
          isAcademicAssistant: false,
          isHomeroomTeacher,
          majorId: dto.majorId,
          customPermissions: updatedCustomPermissions,
        },
      });

      return {
        success: true,
        assignedRole: dto.assignedRole,
        major: updatedProfile.major,
        customPermissions: updatedCustomPermissions,
      };
    });
  }
}

function render(
  lecturer: DirectoryRow,
  mentoring: MentoringLoad,
  topicStats: LecturerTopicStats = { currentCount: 0, openCount: 0, pastCount: 0 },
) {
  return {
    id: lecturer.id,
    lecturerCode: lecturer.lecturerCode,
    fullName: lecturer.fullName,
    academicTitle: lecturer.academicTitle,
    researchInterests: lecturer.researchInterests,
    major: lecturer.major,
    isHeadOfDepartment: lecturer.isHeadOfDepartment,
    isHomeroomTeacher: lecturer.isHomeroomTeacher,
    avatarUrl: lecturer.user.avatarUrl,
    mentoring,
    topicStats,
  };
}
