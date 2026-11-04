export type SemesterTerm = '1' | '2' | 'summer';

/**
 * Pure function to build semester name and code from academicYear and term.
 *
 * Rules:
 * - name: "Học kỳ 1 năm học 2026-2027" / "Học kỳ 2 năm học ..." / "Học kỳ hè năm học ..."
 * - code: "HK1-2026-2027" / "HK2-2026-2027" / "HE-2026-2027"
 */
export function buildSemester(
  academicYear: string,
  term: string,
  customName?: string | null,
): { name: string; code: string } {
  const termCodeMap: Record<string, string> = {
    '1': 'HK1',
    '2': 'HK2',
    summer: 'HE',
  };

  const termNameMap: Record<string, string> = {
    '1': 'Học kỳ 1',
    '2': 'Học kỳ 2',
    summer: 'Học kỳ hè',
  };

  const codePrefix = termCodeMap[term] ?? `HK${term}`;
  const namePrefix = termNameMap[term] ?? `Học kỳ ${term}`;

  const defaultName = `${namePrefix} năm học ${academicYear.trim()}`;
  const code = `${codePrefix}-${academicYear.trim()}`;

  return {
    name: customName && customName.trim() !== '' ? customName.trim() : defaultName,
    code,
  };
}

/**
 * Returns default start, end and grade deadline dates for a semester term in an academic year
 * based on the University of Da Lat (DLU) academic calendar:
 * - HK1 (Mùa Thu):   01/09/Y      -> 15/01/(Y+1)
 * - HK2 (Mùa Xuân):  15/02/(Y+1)  -> 30/06/(Y+1)
 * - HK3 (Hè):        01/07/(Y+1)  -> 31/08/(Y+1)
 */
export function getDefaultSemesterDates(
  academicYear: string,
  term: SemesterTerm | string,
): { startDate: string; endDate: string; gradeDeadline: string } {
  const match = academicYear.trim().match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  const startY = match ? parseInt(match[1], 10) : new Date().getFullYear();
  const endY = match ? parseInt(match[2], 10) : startY + 1;

  if (term === '2') {
    return {
      startDate: `${endY}-02-15`,
      endDate: `${endY}-06-30`,
      gradeDeadline: `${endY}-06-30`,
    };
  }

  if (term === 'summer') {
    return {
      startDate: `${endY}-07-01`,
      endDate: `${endY}-08-31`,
      gradeDeadline: `${endY}-08-31`,
    };
  }

  // Default is Term 1 ('1')
  return {
    startDate: `${startY}-09-01`,
    endDate: `${endY}-01-15`,
    gradeDeadline: `${endY}-01-15`,
  };
}

/**
 * Parses academicYear and term from code formatted as HK1-YYYY-YYYY, HK2-YYYY-YYYY, HE-YYYY-YYYY.
 */
export function parseSemesterCode(code: string): {
  academicYear: string;
  term: SemesterTerm;
} | null {
  const match = code.trim().toUpperCase().match(/^(HK1|HK2|HE)-(\d{4}-\d{4})$/);
  if (!match) return null;
  const termMap: Record<string, SemesterTerm> = {
    HK1: '1',
    HK2: '2',
    HE: 'summer',
  };
  return {
    term: termMap[match[1]] ?? '1',
    academicYear: match[2],
  };
}

/**
 * Returns the start year of the academic year for a given date.
 * If month >= 8 (August to December), academic year is Y-(Y+1), so start year is Y.
 * Otherwise (January to July), academic year is (Y-1)-Y, so start year is Y-1.
 */
export function getAcademicYearFromDate(today: Date = new Date()): number {
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1 to 12
  return month >= 8 ? year : year - 1;
}

/**
 * Returns a list of academic years from (current - 1) to (current + 2).
 */
export function getAcademicYearOptions(today: Date = new Date()): string[] {
  const currentStartYear = getAcademicYearFromDate(today);
  const years: string[] = [];
  for (let y = currentStartYear - 1; y <= currentStartYear + 2; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
}

/**
 * Suggests the next uncreated semester term starting from today and existing semesters.
 * Sequence: HK1 -> HK2 -> hè -> HK1 of next academic year.
 */
export function suggestNextTerm(
  today: Date = new Date(),
  existing: { code: string }[] = [],
): { academicYear: string; term: SemesterTerm } {
  const month = today.getMonth() + 1;
  let startYear = month >= 8 ? today.getFullYear() : today.getFullYear() - 1;

  let termIndex = 0;
  if (month >= 8 && month <= 12) {
    termIndex = 0; // '1'
  } else if (month >= 1 && month <= 5) {
    termIndex = 1; // '2'
  } else {
    termIndex = 2; // 'summer'
  }

  const terms: SemesterTerm[] = ['1', '2', 'summer'];
  const existingCodes = new Set(
    existing.map((s) => s.code.trim().toUpperCase()),
  );

  for (let i = 0; i < 30; i++) {
    const term = terms[termIndex];
    const academicYear = `${startYear}-${startYear + 1}`;
    const { code } = buildSemester(academicYear, term);

    if (!existingCodes.has(code.toUpperCase())) {
      return { academicYear, term };
    }

    termIndex++;
    if (termIndex >= terms.length) {
      termIndex = 0;
      startYear++;
    }
  }

  return {
    academicYear: `${startYear}-${startYear + 1}`,
    term: terms[termIndex],
  };
}
