import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  AppActor,
  ROLES_KEY,
  RequiredRole,
} from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../../permissions/require-permissions.decorator';

export interface RequestLecturerProfile {
  id: number;
  lecturerCode: string;
  fullName: string;
  academicTitle?: string | null;
  majorId?: number | null;
  isHeadOfDepartment: boolean;
  isAcademicAssistant: boolean;
  isHomeroomTeacher?: boolean;
}

export interface RequestStudentProfile {
  id: number;
  studentCode: string;
  fullName: string;
  majorId?: number | null;
  class?: string | null;
  cohort?: string | null;
}

export interface RequestUser {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  lecturerProfile?: RequestLecturerProfile | null;
  studentProfile?: RequestStudentProfile | null;
  customPermissions?: Array<{ permission: string }>;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private rolePermsCache: Map<string, Set<string>> | null = null;
  private cacheExpiresAt = 0;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private async getRolePermissions(): Promise<Map<string, Set<string>>> {
    const now = Date.now();
    if (this.rolePermsCache && now < this.cacheExpiresAt) {
      return this.rolePermsCache;
    }
    const records = await this.prisma.rolePermission.findMany({
      select: { role: true, permission: true },
    });
    const map = new Map<string, Set<string>>();
    for (const r of records) {
      if (!map.has(r.role)) {
        map.set(r.role, new Set());
      }
      map.get(r.role)!.add(r.permission);
    }
    this.rolePermsCache = map;
    this.cacheExpiresAt = now + 15_000;
    return map;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RequiredRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Không có decorator @Roles() hoặc @RequirePermissions() → cho phép truy cập
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user || !user.isActive) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    // ADMIN luôn có toàn quyền truy cập
    if (user.role === Role.ADMIN) {
      return true;
    }

    // 1. Kiểm tra Granular Permissions nếu route yêu cầu
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPerms = await this.prisma.userPermission.findMany({
        where: { userId: user.id },
        select: { permission: true },
      });
      const userCustomPerms = new Set(userPerms.map((cp) => cp.permission));

      // 1.1. Khớp quyền tùy biến riêng cấp cho tài khoản
      const hasCustom = requiredPermissions.some((p) =>
        userCustomPerms.has(p),
      );
      if (hasCustom) {
        return true;
      }

      // 1.2. Khớp quyền được cấu hình cho vai trò/chức vụ
      const roles: string[] = [user.role];
      if (user.lecturerProfile?.isHeadOfDepartment) {
        roles.push('TTBM');
      }
      if (user.lecturerProfile?.isHomeroomTeacher) {
        roles.push('GVCN');
      }

      const rolePerms = await this.getRolePermissions();
      const hasRolePerm = roles.some((r) => {
        const perms = rolePerms.get(r);
        return perms && requiredPermissions.some((p) => perms.has(p));
      });

      if (hasRolePerm) {
        return true;
      }
    }

    // 2. Kiểm tra Role cơ bản nếu route yêu cầu
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((reqRole) => {
        if (reqRole === 'ADMIN' || reqRole === Role.ADMIN) {
          return user.role === Role.ADMIN;
        }

        if (reqRole === 'LECTURER' || reqRole === Role.LECTURER) {
          return user.role === Role.LECTURER;
        }

        if (reqRole === 'STUDENT' || reqRole === Role.STUDENT) {
          return user.role === Role.STUDENT;
        }

        if (
          reqRole === 'GVCN' ||
          reqRole === (Role as any).GVCN ||
          reqRole === AppActor.GVCN
        ) {
          return (
            user.role === Role.ADMIN ||
            (user.role as string) === 'GVCN' ||
            (user.role === Role.LECTURER &&
              (!!user.lecturerProfile?.isHomeroomTeacher ||
                !!user.lecturerProfile?.isAcademicAssistant))
          );
        }

        if (reqRole === AppActor.TTBM || reqRole === 'TTBM') {
          return (
            user.role === Role.LECTURER &&
            !!user.lecturerProfile?.isHeadOfDepartment
          );
        }

        if (reqRole === AppActor.TLGV || reqRole === 'TLGV') {
          return (
            user.role === Role.ADMIN ||
            (user.role === Role.LECTURER &&
              !!user.lecturerProfile?.isAcademicAssistant)
          );
        }

        return false;
      });

      if (hasRole) {
        return true;
      }
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
  }
}
