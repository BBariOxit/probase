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

/**
 * Rút gọn tên học kỳ thành định dạng ngắn gọn: HKII-2023-2024 hoặc HKI-2024-2025
 */
export function formatSemesterShort(
  semester?: { name?: string; code?: string } | null,
): string {
  if (!semester) return '—';
  const name = (semester.name || '').trim();
  const match = name.match(
    /Học kỳ\s*([0-9IVX]+)(?:\s*năm học\s*(\d{4})[-–/](\d{4}))?/i,
  );
  if (match) {
    const termNum = match[1].toUpperCase();
    const roman =
      termNum === '1' || termNum === 'I'
        ? 'HKI'
        : termNum === '2' || termNum === 'II'
          ? 'HKII'
          : termNum === '3' || termNum === 'III'
            ? 'HKIII'
            : `HK${termNum}`;
    if (match[2] && match[3]) {
      return `${roman}-${match[2]}-${match[3]}`;
    }
    return roman;
  }
  return semester.code || name;
}

/**
 * Rút gọn loại đồ án: KLTN, ĐACN, ĐACS (tận dụng trường code trong DB)
 */
export function formatProjectTypeShort(
  projectType?: { name?: string; code?: string } | null,
): { short: string; full: string } {
  if (!projectType) return { short: '—', full: '' };
  const code = (projectType.code ?? '').toUpperCase();
  const name = projectType.name ?? '';

  if (
    code === 'DATN' ||
    code === 'KLTN' ||
    name.toLowerCase().includes('khóa luận') ||
    name.toLowerCase().includes('tốt nghiệp')
  ) {
    return { short: 'KLTN', full: name || 'Khóa luận tốt nghiệp' };
  }
  if (code === 'DACN' || name.toLowerCase().includes('chuyên ngành')) {
    return { short: 'ĐACN', full: name || 'Đồ án chuyên ngành' };
  }
  if (code === 'DACS' || name.toLowerCase().includes('cơ sở')) {
    return { short: 'ĐACS', full: name || 'Đồ án cơ sở' };
  }
  return { short: projectType.code || name || '—', full: name };
}

/**
 * Rút gọn chuyên ngành: KTPM, MMT (tận dụng trường code trong DB)
 */
export function formatMajorShort(
  major?: { name?: string; code?: string } | null,
): { short: string; full: string } {
  if (!major) return { short: 'Chung', full: 'Chung cho khoa' };
  const code = (major.code ?? '').toUpperCase();
  const name = major.name ?? '';
  if (
    code === 'CNPM' ||
    code === 'KTPM' ||
    code === 'PM' ||
    name.toLowerCase().includes('kỹ thuật phần mềm')
  ) {
    return { short: 'KTPM', full: name || 'Kỹ thuật phần mềm' };
  }
  if (code === 'MMT' || name.toLowerCase().includes('mạng máy tính')) {
    return { short: 'MMT', full: name || 'Mạng máy tính' };
  }
  return {
    short: major.code || name || '—',
    full: name || major.code || '',
  };
}


