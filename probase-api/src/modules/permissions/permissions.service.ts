import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  PERMISSION_DEFINITIONS,
  ROLE_LABELS,
  SYSTEM_ROLES,
  SystemPermission,
  SystemRole,
} from './permissions.constants';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy ma trận quyền theo vai trò (Role Permission Matrix)
   */
  async getMatrix() {
    const rolePerms = await this.prisma.rolePermission.findMany({
      select: {
        role: true,
        permission: true,
      },
    });

    const matrix: Record<string, string[]> = {
      ADMIN: Object.values(SystemPermission),
      TTBM: [],
      GVCN: [],
      LECTURER: [],
    };

    for (const rp of rolePerms) {
      if (rp.role !== 'ADMIN') {
        if (!matrix[rp.role]) {
          matrix[rp.role] = [];
        }
        matrix[rp.role].push(rp.permission);
      }
    }

    const roles = SYSTEM_ROLES.map((role) => ({
      code: role,
      label: ROLE_LABELS[role],
      isLocked: role === 'ADMIN',
    }));

    return {
      permissions: PERMISSION_DEFINITIONS,
      roles,
      matrix,
    };
  }

  /**
   * Cập nhật danh sách quyền cho một vai trò hệ thống
   */
  async updateRolePermissions(
    role: string,
    permissions: SystemPermission[],
    _actorId: number,
  ) {
    if (role === 'ADMIN') {
      throw new ForbiddenException(
        'Không thể điều chỉnh quyền của Quản trị viên (ADMIN)',
      );
    }

    if (!SYSTEM_ROLES.includes(role as SystemRole)) {
      throw new BadRequestException(`Vai trò ${role} không hợp lệ`);
    }

    // Lọc danh sách permission hợp lệ
    const validPermissions = Object.values(SystemPermission);
    const sanitizedPermissions = Array.from(
      new Set(permissions.filter((p) => validPermissions.includes(p))),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { role },
      });

      if (sanitizedPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: sanitizedPermissions.map((permission) => ({
            role,
            permission,
          })),
        });
      }
    });

    return {
      role,
      permissions: sanitizedPermissions,
    };
  }

  /**
   * Lấy quyền tùy biến riêng (User Permission Overrides) của một người dùng
   */
  async getUserPermissions(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        lecturerProfile: {
          select: {
            fullName: true,
            isHeadOfDepartment: true,
            isHomeroomTeacher: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const [userPerms, effective] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { userId },
        select: { permission: true, grantedAt: true },
      }),
      this.getUserEffectivePermissions(userId),
    ]);

    return {
      userId: user.id,
      email: user.email,
      fullName: user.lecturerProfile?.fullName ?? '',
      customPermissions: userPerms.map((cp) => cp.permission),
      effectivePermissions: effective,
    };
  }

  /**
   * Cập nhật quyền tùy biến cho một người dùng cụ thể
   */
  async updateUserPermissions(
    userId: number,
    permissions: SystemPermission[],
    actorId: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const validPermissions = Object.values(SystemPermission);
    const sanitizedPermissions = Array.from(
      new Set(permissions.filter((p) => validPermissions.includes(p))),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({
        where: { userId },
      });

      if (sanitizedPermissions.length > 0) {
        await tx.userPermission.createMany({
          data: sanitizedPermissions.map((permission) => ({
            userId,
            permission,
            grantedById: actorId,
          })),
        });
      }
    });

    const effective = await this.getUserEffectivePermissions(userId);

    return {
      userId,
      customPermissions: sanitizedPermissions,
      effectivePermissions: effective,
    };
  }

  /**
   * Tính toán toàn bộ quyền có hiệu lực thực tế (Effective Permissions) của user
   */
  async getUserEffectivePermissions(userId: number): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        lecturerProfile: {
          select: {
            isHeadOfDepartment: true,
            isHomeroomTeacher: true,
          },
        },
      },
    });

    if (!user) return [];

    // ADMIN luôn có mọi quyền
    if (user.role === 'ADMIN') {
      return Object.values(SystemPermission);
    }

    // Tập hợp vai trò chức danh của người dùng
    const roles: string[] = [user.role];
    if (user.lecturerProfile?.isHeadOfDepartment) {
      roles.push('TTBM');
    }
    if (user.lecturerProfile?.isHomeroomTeacher) {
      roles.push('GVCN');
    }

    const [rolePerms, userPerms] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: { role: { in: roles } },
        select: { permission: true },
      }),
      this.prisma.userPermission.findMany({
        where: { userId },
        select: { permission: true },
      }),
    ]);

    const permissionSet = new Set<string>();
    for (const rp of rolePerms) {
      permissionSet.add(rp.permission);
    }
    for (const cp of userPerms) {
      permissionSet.add(cp.permission);
    }

    return Array.from(permissionSet);
  }
}

