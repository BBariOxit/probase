import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../../generated/prisma/client';
import {
  AppActor,
  ROLES_KEY,
  RequiredRole,
} from '../decorators/roles.decorator';

export interface RequestLecturerProfile {
  id: number;
  lecturerCode: string;
  fullName: string;
  academicTitle?: string | null;
  majorId?: number | null;
  isHeadOfDepartment: boolean;
  isFacultyBoard: boolean;
  isAcademicAssistant: boolean;
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
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RequiredRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Không có @Roles() decorator → cho phép truy cập
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user || !user.isActive) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    const hasPermission = requiredRoles.some((reqRole) => {
      // 1. Kiểm tra Role cơ bản
      if (reqRole === 'ADMIN' || reqRole === Role.ADMIN) {
        return user.role === Role.ADMIN;
      }

      if (reqRole === 'LECTURER' || reqRole === Role.LECTURER) {
        return user.role === Role.LECTURER;
      }

      if (reqRole === 'STUDENT' || reqRole === Role.STUDENT) {
        return user.role === Role.STUDENT;
      }

      // 2. Kiểm tra các chức vụ kiêm nhiệm Khoa CNTT - DLU
      if (reqRole === AppActor.TTBM || reqRole === 'TTBM') {
        return (
          user.role === Role.LECTURER &&
          !!user.lecturerProfile?.isHeadOfDepartment
        );
      }

      if (reqRole === AppActor.BCN_KHOA || reqRole === 'BCN_KHOA') {
        return (
          user.role === Role.LECTURER && !!user.lecturerProfile?.isFacultyBoard
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

    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    return true;
  }
}
