export enum SystemPermission {
  TOPIC_REGISTRY = 'TOPIC_REGISTRY',
  STUDENT_ALLOCATION = 'STUDENT_ALLOCATION',
  TOPIC_REVIEW_DEPT = 'TOPIC_REVIEW_DEPT',
  TOPIC_SIGN_OFF = 'TOPIC_SIGN_OFF',
  LECTURER_ROLE_ASSIGN = 'LECTURER_ROLE_ASSIGN',
}

export interface PermissionDefinition {
  code: SystemPermission;
  name: string;
  category: string;
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    code: SystemPermission.TOPIC_REGISTRY,
    name: 'Quản lý đợt đăng ký đề tài',
    category: 'Đợt đăng ký & Phân bổ',
    description: 'Mở, đóng, gia hạn thời gian và thiết lập cấu hình đợt đăng ký',
  },
  {
    code: SystemPermission.STUDENT_ALLOCATION,
    name: 'Phân bổ sinh viên & Chốt đợt',
    category: 'Đợt đăng ký & Phân bổ',
    description: 'Xử lý sinh viên rớt nguyện vọng, phân vào nhóm và chốt đợt',
  },
  {
    code: SystemPermission.TOPIC_REVIEW_DEPT,
    name: 'Thẩm định đề tài cấp Bộ môn',
    category: 'Quản lý đề tài',
    description: 'Xét duyệt học thuật và thẩm định đề tài của giảng viên thuộc bộ môn',
  },
  {
    code: SystemPermission.TOPIC_SIGN_OFF,
    name: 'Phê duyệt & Công bố đề tài Khoa',
    category: 'Quản lý đề tài',
    description: 'Duyệt mở đề tài hàng loạt cho sinh viên đăng ký cấp Khoa',
  },
  {
    code: SystemPermission.LECTURER_ROLE_ASSIGN,
    name: 'Quản trị vai trò & Phân quyền',
    category: 'Quản trị hệ thống',
    description: 'Chỉ định vai trò và cấp quyền tùy biến cho nhân sự giảng viên',
  },
];

export const SYSTEM_ROLES = ['ADMIN', 'TTBM', 'GVCN', 'LECTURER'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLE_LABELS: Record<SystemRole, string> = {
  ADMIN: 'Giáo vụ Khoa',
  TTBM: 'Tổ trưởng Bộ môn',
  GVCN: 'Giáo viên chủ nhiệm',
  LECTURER: 'Giảng viên',
};
