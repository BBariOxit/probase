/**
 * Utility functions for user account creation and form auto-fill.
 */

const COHORT_EPOCH = 1976;

/**
 * Derives institutional email from student code (e.g. 2299998 -> 2299998@dlu.edu.vn)
 */
export function deriveEmailFromStudentCode(code: string): string {
  const clean = code.trim();
  return clean ? `${clean}@dlu.edu.vn` : '';
}

/**
 * Derives cohort class prefix from the first 2 digits of a student code.
 * e.g. "2299998" -> 22 -> Year 2022 -> Intake 46 (2022 - 1976) -> "CTK46"
 */
export function deriveClassPrefixFromStudentCode(code: string): string | null {
  const trimmed = code.trim();
  const match = /^(\d{2})/.exec(trimmed);
  if (!match) return null;

  const twoDigitYear = parseInt(match[1], 10);
  const fullYear = 2000 + twoDigitYear;
  const khoa = fullYear - COHORT_EPOCH;
  return `CTK${khoa}`;
}

/**
 * Formats full name with proper title case and trimmed whitespace.
 * e.g. "  phan   thai  bao " -> "Phan Thai Bao"
 */
export function normalizeFullName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  return trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
