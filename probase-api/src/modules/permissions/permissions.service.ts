import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '../../../generated/prisma/client';
import { recordAudit } from '../../core/audit/audit-entry';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  PERMISSION_DEFINITIONS,
  type PermissionSubjectUser,
  resolveUserPermissionRoles,
  ROLE_LABELS,
  SYSTEM_ROLES,
  SystemPermission,
  SystemRole,
} from './permissions.constants';

const USER_PERMISSION_SUBJECT_SELECT = {
  id: true,
  email: true,
  role: true,
  lecturerProfile: {
    select: {
      fullName: true,
      isHeadOfDepartment: true,
      isHomeroomTeacher: true,
      isAcademicAssistant: true,
    },
  },
} as const;

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAssignableSubject(
    user:
      | (PermissionSubjectUser & { id: number })
      | null,
  ): asserts user is PermissionSubjectUser & { id: number } {
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    if (user.role === Role.ADMIN || user.lecturerProfile?.isAcademicAssistant) {
      throw new ForbiddenException(
        'Không thể điều chỉnh quyền của Giáo vụ Khoa (ADMIN)',
      );
    }
    if (user.role === Role.STUDENT) {
      throw new ForbiddenException(
        'Không thể cấp quyền quản trị cho tài khoản sinh viên',
      );
    }
  }

  /**
   * Lấy tập quyền mặc định theo tất cả vai trò của người dùng.
   */
  async getUserRolePermissionSet(
    user: PermissionSubjectUser,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Set<string>> {
    if (user.role === Role.ADMIN || user.lecturerProfile?.isAcademicAssistant) {
      return new Set(Object.values(SystemPermission));
    }

    const roles = resolveUserPermissionRoles(user);
    const rolePerms = await tx.rolePermission.findMany({
      where: { role: { in: roles } },
      select: { permission: true },
    });

    return new Set(rolePerms.map((rp) => rp.permission));
  }

  /**
   * Xóa các bản ghi UserPermission đã có sẵn trong vai trò của user.
   */
  async pruneRedundantUserPermissionsForUser(
    tx: Prisma.TransactionClient,
    userId: number,
    user: PermissionSubjectUser,
  ): Promise<string[]> {
    const rolePerms = await this.getUserRolePermissionSet(user, tx);
    const existing = await tx.userPermission.findMany({
      where: { userId },
      select: { permission: true },
    });

    const redundant = existing
      .map((cp) => cp.permission)
      .filter((perm) => rolePerms.has(perm));

    if (redundant.length > 0) {
      await tx.userPermission.deleteMany({
        where: {
          userId,
          permission: { in: redundant },
        },
      });
    }

    return existing
      .map((cp) => cp.permission)
      .filter((perm) => !rolePerms.has(perm));
  }

  /**
   * Đồng bộ quyền bổ sung cho user, tự động loại bỏ các quyền đã có ở vai trò.
   */
  async syncUserCustomPermissions(
    tx: Prisma.TransactionClient,
    userId: number,
    user: PermissionSubjectUser,
    permissions: SystemPermission[],
    actorId: number,
  ): Promise<string[]> {
    const validPermissions = Object.values(SystemPermission);
    const rolePerms = await this.getUserRolePermissionSet(user, tx);
    const dedupedPermissions = Array.from(
      new Set(
        permissions.filter(
          (p) => validPermissions.includes(p) && !rolePerms.has(p),
        ),
      ),
    );

    await tx.userPermission.deleteMany({
      where: { userId },
    });

    if (dedupedPermissions.length > 0) {
      await tx.userPermission.createMany({
        data: dedupedPermissions.map((permission) => ({
          userId,
          permission,
          grantedById: actorId,
        })),
      });
    }

    return dedupedPermissions;
  }

  private buildRoleHolderWhere(role: SystemRole): Prisma.UserWhereInput | null {
    switch (role) {
      case 'LECTURER':
        return { role: Role.LECTURER };
      case 'TTBM':
        return { lecturerProfile: { isHeadOfDepartment: true } };
      case 'GVCN':
        return {
          OR: [
            { role: Role.GVCN },
            { lecturerProfile: { isHomeroomTeacher: true } },
          ],
        };
      default:
        return null;
    }
  }

  /**
   * Lấy ma trận quyền theo vai trò (Role Permission Matrix) kèm danh sách phân quyền đặc biệt
   */
  async getMatrix() {
    const [rolePerms, userPerms] = await Promise.all([
      this.prisma.rolePermission.findMany({
        select: {
          role: true,
          permission: true,
        },
      }),
      this.prisma.userPermission.findMany({
        select: {
          id: true,
          userId: true,
          permission: true,
          grantedAt: true,
          user: {
            select: {
              email: true,
              role: true,
              lecturerProfile: {
                select: {
                  fullName: true,
                  lecturerCode: true,
                  isHeadOfDepartment: true,
                  isHomeroomTeacher: true,
                  isAcademicAssistant: true,
                  major: { select: { name: true, code: true } },
                },
              },
            },
          },
        },
        orderBy: { grantedAt: 'asc' },
      }),
    ]);

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

    const customAssignments = userPerms
      .filter((up) => {
        const subjectRoles = resolveUserPermissionRoles(up.user);
        const inherited = new Set(
          subjectRoles.flatMap((r) => matrix[r] ?? []),
        );
        return !inherited.has(up.permission);
      })
      .map((up) => ({
        id: up.id,
        userId: up.userId,
        permission: up.permission,
        fullName: up.user.lecturerProfile?.fullName ?? up.user.email,
        email: up.user.email,
        lecturerCode: up.user.lecturerProfile?.lecturerCode ?? '',
        majorName: up.user.lecturerProfile?.major?.name ?? '',
      }));

    return {
      permissions: PERMISSION_DEFINITIONS,
      roles,
      matrix,
      customAssignments,
    };
  }

  /**
   * Cấp một quyền đặc biệt cho giảng viên cụ thể
   */
  async grantPermission(
    userId: number,
    permission: SystemPermission,
    actorId: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PERMISSION_SUBJECT_SELECT,
    });

    this.assertAssignableSubject(user);

    const rolePerms = await this.getUserRolePermissionSet(user);
    if (rolePerms.has(permission)) {
      throw new BadRequestException(
        'Quyền này đã có sẵn trong vai trò hiện tại của giảng viên.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.upsert({
        where: {
          userId_permission: {
            userId,
            permission,
          },
        },
        update: {},
        create: {
          userId,
          permission,
          grantedById: actorId,
        },
      });

      await recordAudit(tx, {
        userId: actorId,
        action: 'GRANT_USER_PERMISSION',
        targetTable: 'user_permissions',
        targetId: userId,
        newValue: { permission },
      });
    });

    return { success: true, userId, permission };
  }

  /**
   * Thu hồi một quyền đặc biệt từ giảng viên
   */
  async revokePermission(
    userId: number,
    permission: SystemPermission,
    actorId?: number,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.userPermission.deleteMany({
        where: {
          userId,
          permission,
        },
      });

      if (deleted.count > 0 && actorId) {
        await recordAudit(tx, {
          userId: actorId,
          action: 'REVOKE_USER_PERMISSION',
          targetTable: 'user_permissions',
          targetId: userId,
          oldValue: { permission },
        });
      }

      return deleted;
    });

    return { success: true, userId, permission, revoked: result.count > 0 };
  }

  /**
   * Cập nhật danh sách quyền cho một vai trò hệ thống
   */
  async updateRolePermissions(
    role: string,
    permissions: SystemPermission[],
    actorId: number,
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
      const previous = await tx.rolePermission.findMany({
        where: { role },
        select: { permission: true },
      });

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

        // Dọn các bản ghi UserPermission bị trùng khi vai trò vừa được cấp thêm quyền này
        const holderWhere = this.buildRoleHolderWhere(role as SystemRole);
        if (holderWhere) {
          await tx.userPermission.deleteMany({
            where: {
              permission: { in: sanitizedPermissions },
              user: holderWhere,
            },
          });
        }
      }

      await recordAudit(tx, {
        userId: actorId,
        action: 'UPDATE_ROLE_PERMISSIONS',
        targetTable: 'role_permissions',
        targetId: role,
        oldValue: { permissions: previous.map((p) => p.permission) },
        newValue: { permissions: sanitizedPermissions },
      });
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
      select: USER_PERMISSION_SUBJECT_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const [userPerms, rolePerms, effective] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { userId },
        select: { permission: true, grantedAt: true },
      }),
      this.getUserRolePermissionSet(user),
      this.getUserEffectivePermissions(userId),
    ]);

    return {
      userId: user.id,
      email: user.email,
      fullName: user.lecturerProfile?.fullName ?? '',
      customPermissions: userPerms
        .map((cp) => cp.permission)
        .filter((perm) => !rolePerms.has(perm)),
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
      select: USER_PERMISSION_SUBJECT_SELECT,
    });

    this.assertAssignableSubject(user);

    const savedCustomPermissions = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.userPermission.findMany({
        where: { userId },
        select: { permission: true },
      });

      const next = await this.syncUserCustomPermissions(
        tx,
        userId,
        user,
        permissions,
        actorId,
      );

      await recordAudit(tx, {
        userId: actorId,
        action: 'UPDATE_USER_PERMISSIONS',
        targetTable: 'user_permissions',
        targetId: userId,
        oldValue: { customPermissions: previous.map((p) => p.permission) },
        newValue: { customPermissions: next },
      });

      return next;
    });

    const effective = await this.getUserEffectivePermissions(userId);

    return {
      userId,
      customPermissions: savedCustomPermissions,
      effectivePermissions: effective,
    };
  }

  /**
   * Tính toán toàn bộ quyền có hiệu lực thực tế (Effective Permissions) của user
   */
  async getUserEffectivePermissions(userId: number): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PERMISSION_SUBJECT_SELECT,
    });

    if (!user) return [];

    // ADMIN luôn có mọi quyền
    if (user.role === Role.ADMIN) {
      return Object.values(SystemPermission);
    }

    const roles = resolveUserPermissionRoles(user);

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
