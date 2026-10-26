import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client';

export enum AppActor {
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  TTBM = 'TTBM',               // Tổ trưởng Bộ môn (CNPM / MMT)
  BCN_KHOA = 'BCN_KHOA',       // Ban Chủ nhiệm Khoa
  TLGV = 'TLGV',               // Trợ lý Giáo vụ Khoa
  ADMIN = 'ADMIN',             // Quản trị viên
}

export type RequiredRole = Role | AppActor | string;

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RequiredRole[]) => SetMetadata(ROLES_KEY, roles);

