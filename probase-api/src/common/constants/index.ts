/**
 * System-wide Constants and Business Defaults
 */

export const APP_DEFAULTS = {
  PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

export const REGEX_PATTERNS = {
  // DLU Student Code format: 7 digits (e.g. 2110123)
  STUDENT_CODE: /^\d{7}$/,
  // DLU Email domains
  DLU_EMAIL: /^.+@(dlu\.edu\.vn|st\.dlu\.edu\.vn)$/,
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  VALIDATION_ERROR: 'Dữ liệu gửi lên không đúng định dạng.',
  INTERNAL_ERROR: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
} as const;
