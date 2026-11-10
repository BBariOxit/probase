import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRecentCohorts(
  count = 5,
): { label: string; value: string }[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const year = currentYear - i;
    return {
      label: year.toString().slice(-2),
      value: year.toString(),
    };
  });
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export interface SanitizedLecturer {
  fullName: string;
  title: string;
  displayName: string;
  departmentRole: string | null;
}

/**
 * Chuẩn hóa tên giảng viên:
 * - Tách chức danh/bộ môn trong ngoặc đơn (ví dụ: "Tổ trưởng BM Mạng máy tính")
 * - Loại bỏ học vị bị duplicate ở đầu chuỗi (ví dụ: "ThS. ThS. Chu Định" -> "ThS. Chu Định")
 * - Trả về displayName gọn gàng cho dropdown và 2 dòng chi tiết cho bảng
 */
export function sanitizeLecturerName(
  fullName: string = '',
  academicTitle?: string | null,
): SanitizedLecturer {
  let raw = (fullName ?? '').trim();
  let departmentRole: string | null = null;

  // Tách chức danh trong ngoặc đơn
  const roleMatch = raw.match(/\((.*?)\)/);
  if (roleMatch) {
    departmentRole = roleMatch[1].trim();
    raw = raw.replace(/\(.*?\)/, '').trim();
  }

  // Tách học vị ở đầu tên nếu có (dùng vòng lặp để bóc tách triệt để nếu bị duplicate: "ThS. ThS.")
  const titlePattern =
    /^(PGS\.TS|GS\.TS|ThS\.|TS\.|PGS\.|GS\.|ThS|TS|PGS|GS|Ths|Ts)\s+/i;
  let detectedTitle = (academicTitle ?? '').trim();

  while (titlePattern.test(raw)) {
    const match = raw.match(titlePattern);
    if (match && !detectedTitle) {
      detectedTitle = match[1].replace(/\.?$/, '.');
    }
    raw = raw.replace(titlePattern, '').trim();
  }

  if (detectedTitle && !detectedTitle.endsWith('.')) {
    detectedTitle += '.';
  }

  const displayName = detectedTitle ? `${detectedTitle} ${raw}` : raw;

  return {
    fullName: raw,
    title: detectedTitle,
    displayName,
    departmentRole,
  };
}

export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>,
) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const csvContent = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
