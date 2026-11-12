import ExcelJS from 'exceljs';

export type EligibleField =
  | 'studentCode'
  | 'fullName'
  | 'surname'
  | 'givenName'
  | 'class'
  | 'email'
  | 'note';

export type EligibleNameMode = 'full' | 'split';

export type MatchReason =
  'exact' | 'synonym' | 'phrase' | 'fuzzy' | 'content' | 'none';

export interface EligibleColumnMapping {
  studentCodeCol: number | null;
  fullNameCol: number | null;
  surnameCol: number | null;
  givenNameCol: number | null;
  classCol: number | null;
  emailCol: number | null;
  noteCol: number | null;
}

export interface EligibleColumnDescriptor {
  index: number;
  letter: string;
  header: string;
  samples: string[];
}

export interface EligibleFieldSuggestion {
  columnIndex: number | null;
  fileHeader: string | null;
  confidence: number;
  matchReason: MatchReason;
}

export interface CandidateHeaderRow {
  rowIndex: number;
  preview: string[];
}

export interface SheetColumnAnalysis {
  headerRowIndex: number;
  totalDataRows: number;
  columns: EligibleColumnDescriptor[];
  nameMode: EligibleNameMode;
  suggestions: Record<EligibleField, EligibleFieldSuggestion>;
  candidateHeaderRows: CandidateHeaderRow[];
}

export type RowCellsMap = Record<number, string>;

export interface RawSheetRow {
  rowNumber: number;
  cells: RowCellsMap;
}

export const ALL_ELIGIBLE_FIELDS: EligibleField[] = [
  'studentCode',
  'fullName',
  'surname',
  'givenName',
  'class',
  'email',
  'note',
];

const HEADER_SCAN_LIMIT = 15;
const CONTENT_SAMPLE_LIMIT = 30;
const HEADER_MATCH_THRESHOLD = 0.72;
const FUZZY_MIN_LENGTH = 4;

const STUDENT_CODE_VALUE_RE = /^\d{7}$/;
const EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DLU_EMAIL_VALUE_RE = /^\d{7}@dlu\.edu\.vn$/i;
const CLASS_CODE_VALUE_RE =
  /^(?:CT[\s-]*K\d{2}[\s-]*[A-Za-z0-9]*|(?:DHK|CTK|K)?\d{2}[A-Za-z]{1,6}\d?)$/i;
const SMALL_INT_VALUE_RE = /^\d{1,4}$/;
const UNICODE_LETTER_RE = /\p{L}/u;

interface FieldSynonyms {
  canonical: string[];
  extended: string[];
  allowTokenPhrase: boolean;
  blockedTokens?: string[];
}

const FIELD_SYNONYMS: Record<EligibleField, FieldSynonyms> = {
  studentCode: {
    canonical: [
      'mssv',
      'ma sv',
      'masv',
      'ma sinh vien',
      'masinhvien',
      'ma so sinh vien',
      'ma so sv',
      'student code',
      'studentcode',
      'student id',
      'studentid',
    ],
    extended: [
      'ma so',
      'maso',
      'ma svien',
      'masvien',
      'ma hoc vien',
      'mahv',
      'so hieu sv',
      'id sv',
      'sv id',
      'student no',
      'student number',
    ],
    allowTokenPhrase: true,
    blockedTokens: ['email', 'mail', 'lop', 'class'],
  },
  fullName: {
    canonical: [
      'ho va ten',
      'ho ten',
      'hovaten',
      'hoten',
      'ho va ten sv',
      'ho ten sv',
      'ho va ten sinh vien',
      'ho ten sinh vien',
      'full name',
      'fullname',
      'ten sinh vien',
      'ten sv',
    ],
    extended: [
      'ho ten day du',
      'ho va ten day du',
      'ten day du',
      'ten day du sv',
      'ho ten svien',
      'ho ten hoc vien',
      'student name',
      'sinh vien',
    ],
    allowTokenPhrase: true,
    blockedTokens: ['lop', 'class', 'email', 'mail', 'nganh', 'de tai'],
  },
  surname: {
    canonical: [
      'ho',
      'ho dem',
      'hodem',
      'ho lot',
      'holot',
      'ho va ten lot',
      'surname',
    ],
    extended: [
      'ho va dem',
      'ho va ten dem',
      'ho sv',
      'ho sinh vien',
      'last name',
      'lastname',
      'family name',
      'middle name',
    ],
    allowTokenPhrase: false,
  },
  givenName: {
    canonical: ['ten', 'ten goi', 'name', 'given name'],
    extended: [
      'tengoi',
      'ten chinh',
      'ten rieng',
      'first name',
      'firstname',
      'givenname',
    ],
    allowTokenPhrase: false,
    blockedTokens: ['lop', 'nganh', 'khoa', 'de tai', 'truong', 'mon'],
  },
  class: {
    canonical: [
      'lop',
      'ma lop',
      'malop',
      'ten lop',
      'lop sinh hoat',
      'lop sh',
      'class',
      'class code',
      'classcode',
    ],
    extended: [
      'tenlop',
      'lop hoc',
      'lophoc',
      'lop quan ly',
      'lop ql',
      'lopql',
      'lopsh',
      'lop chuyen nganh',
      'lop nganh',
      'nhom lop',
      'class name',
      'classname',
      'chi doan',
    ],
    allowTokenPhrase: true,
    blockedTokens: ['email', 'mail', 'ghi chu'],
  },
  email: {
    canonical: [
      'email',
      'e mail',
      'mail',
      'thu dien tu',
      'dia chi email',
      'email dlu',
      'email sinh vien',
      'email sv',
      'email truong',
      'gmail',
    ],
    extended: [
      'mail sv',
      'mail sinh vien',
      'mail dlu',
      'gmail dlu',
      'email ca nhan',
      'email lien he',
      'dia chi mail',
      'hop thu',
      'email address',
      'e mail address',
    ],
    allowTokenPhrase: true,
  },
  note: {
    canonical: ['ghi chu', 'ghichu', 'note', 'notes'],
    extended: [
      'chu thich',
      'chuthich',
      'ghi chu pdt',
      'ghi chu dao tao',
      'ghi chu them',
      'ghi chu khac',
      'nhan xet',
      'ly do',
      'tinh trang',
      'trang thai',
      'dieu kien',
      'ket qua xet',
      'remark',
      'remarks',
      'comment',
      'comments',
    ],
    allowTokenPhrase: true,
  },
};

export function columnLetterFromIndex(colIndex: number): string {
  let n = colIndex;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || 'A';
}

export function normalizeCellValue(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    // Strip ASCII control characters and zero-width characters
    if (
      code >= 0x20 &&
      code !== 0x7f &&
      code !== 0x200b &&
      code !== 0x200c &&
      code !== 0x200d &&
      code !== 0xfeff
    ) {
      result += code === 0x00a0 ? ' ' : input[i];
    }
  }
  return result.normalize('NFC').trim();
}

export function cellToCleanString(val: ExcelJS.CellValue): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();

  if (typeof val === 'object') {
    if ('richText' in val && Array.isArray(val.richText)) {
      return normalizeCellValue(
        val.richText.map((fragment) => fragment.text).join(''),
      );
    }
    if ('text' in val) {
      return typeof val.text === 'object' && val.text !== null
        ? cellToCleanString(val.text)
        : normalizeCellValue(String(val.text ?? ''));
    }
    if ('result' in val) {
      const { result } = val;
      if (typeof result === 'string' || typeof result === 'number') {
        return normalizeCellValue(String(result));
      }
      return '';
    }
    return '';
  }

  return normalizeCellValue(String(val));
}

export function extractWorksheetRows(sheet: ExcelJS.Worksheet): {
  rows: RawSheetRow[];
  maxCol: number;
} {
  const rows: RawSheetRow[] = [];
  let maxCol = 0;

  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cells: RowCellsMap = {};
    let hasValue = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellToCleanString(cell.value);
      if (text) {
        cells[colNumber] = text;
        hasValue = true;
        if (colNumber > maxCol) {
          maxCol = colNumber;
        }
      }
    });

    if (hasValue) {
      rows.push({ rowNumber, cells });
    }
  }

  return { rows, maxCol };
}

export function normalizeHeaderLabel(raw: string): string {
  const cleaned = normalizeCellValue(raw);
  if (!cleaned) return '';

  const withoutParens = cleaned.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').trim();
  const base = withoutParens.length > 0 ? withoutParens : cleaned;

  const ascii = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

  return ascii
    .replace(/^(?:cot\s*[a-z0-9]+\s*[:.-]\s*|\d+\s*[.):-]\s*)/, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Optimal String Alignment (restricted Damerau-Levenshtein) distance.
 * Adjacent character swaps (e.g. "emial" <-> "email", "msvs" <-> "mssv")
 * count as 1 edit instead of 2.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (a === b) return 0;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array<number>(lenB + 1).fill(0),
  );

  for (let i = 0; i <= lenA; i += 1) dp[i][0] = i;
  for (let j = 0; j <= lenB; j += 1) dp[0][j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + cost);
      }
      dp[i][j] = val;
    }
  }

  return dp[lenA][lenB];
}

interface ColumnProfile {
  sampleCount: number;
  mssvRate: number;
  emailRate: number;
  dluEmailRate: number;
  classRate: number;
  multiWordTextRate: number;
  singleWordTextRate: number;
  sttRate: number;
}

function profileColumnSamples(samples: string[]): ColumnProfile {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      mssvRate: 0,
      emailRate: 0,
      dluEmailRate: 0,
      classRate: 0,
      multiWordTextRate: 0,
      singleWordTextRate: 0,
      sttRate: 0,
    };
  }

  let mssvCount = 0;
  let emailCount = 0;
  let dluEmailCount = 0;
  let classCount = 0;
  let multiWordCount = 0;
  let singleWordCount = 0;
  let sttCount = 0;

  for (const raw of samples) {
    const val = raw.trim();
    const compact = val.replace(/\s+/g, '');

    if (STUDENT_CODE_VALUE_RE.test(compact)) {
      mssvCount += 1;
      continue;
    }

    if (EMAIL_VALUE_RE.test(compact)) {
      emailCount += 1;
      if (DLU_EMAIL_VALUE_RE.test(compact)) {
        dluEmailCount += 1;
      }
      continue;
    }

    if (SMALL_INT_VALUE_RE.test(compact)) {
      sttCount += 1;
      continue;
    }

    if (CLASS_CODE_VALUE_RE.test(val) && compact.length <= 16) {
      classCount += 1;
      continue;
    }

    if (UNICODE_LETTER_RE.test(val) && !val.includes('@')) {
      const words = val.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 6 && !/\d{4,}/.test(val)) {
        multiWordCount += 1;
      } else if (words.length === 1 && !/\d/.test(val) && val.length <= 20) {
        singleWordCount += 1;
      }
    }
  }

  const total = samples.length;
  return {
    sampleCount: total,
    mssvRate: mssvCount / total,
    emailRate: emailCount / total,
    dluEmailRate: dluEmailCount / total,
    classRate: classCount / total,
    multiWordTextRate: multiWordCount / total,
    singleWordTextRate: singleWordCount / total,
    sttRate: sttCount / total,
  };
}

function hasBlockedToken(
  normalizedHeader: string,
  blockedTokens?: string[],
): boolean {
  if (!blockedTokens || blockedTokens.length === 0) return false;
  const padded = ` ${normalizedHeader} `;
  return blockedTokens.some((tok) => padded.includes(` ${tok} `));
}

function scoreHeaderForField(
  normalizedHeader: string,
  field: EligibleField,
): { score: number; reason: MatchReason } {
  if (!normalizedHeader) return { score: 0, reason: 'none' };

  const spec = FIELD_SYNONYMS[field];

  // Exact canonical synonym match
  for (const syn of spec.canonical) {
    if (normalizedHeader === syn) {
      return { score: 1.0, reason: 'exact' };
    }
  }

  // Exact extended synonym match
  for (const syn of spec.extended) {
    if (normalizedHeader === syn) {
      return { score: 0.96, reason: 'synonym' };
    }
  }

  if (hasBlockedToken(normalizedHeader, spec.blockedTokens)) {
    return { score: 0, reason: 'none' };
  }

  // Phrase / token boundary match (e.g. "ma so sv dlu", "lop quan ly")
  if (spec.allowTokenPhrase) {
    const paddedHeader = ` ${normalizedHeader} `;
    const allSyns = [...spec.canonical, ...spec.extended];
    for (const syn of allSyns) {
      if (syn.length < 3) continue;
      if (paddedHeader.includes(` ${syn} `)) {
        return { score: 0.89, reason: 'phrase' };
      }
    }
  }

  // Damerau-Levenshtein fuzzy match on labels of length >= 4
  const compactHeader = normalizedHeader.replace(/\s+/g, '');
  if (compactHeader.length < FUZZY_MIN_LENGTH) {
    return { score: 0, reason: 'none' };
  }

  let bestFuzzy = 0;
  const allSyns = [...spec.canonical, ...spec.extended];
  for (const syn of allSyns) {
    const compactSyn = syn.replace(/\s+/g, '');
    if (compactSyn.length < FUZZY_MIN_LENGTH) continue;

    const spacedDist = damerauLevenshtein(normalizedHeader, syn);
    const spacedMax = Math.max(normalizedHeader.length, syn.length);
    const spacedSim = spacedMax > 0 ? 1 - spacedDist / spacedMax : 0;

    const compactDist = damerauLevenshtein(compactHeader, compactSyn);
    const compactMax = Math.max(compactHeader.length, compactSyn.length);
    const compactSim = compactMax > 0 ? 1 - compactDist / compactMax : 0;

    const sim = Math.max(spacedSim, compactSim);
    if (sim > bestFuzzy) {
      bestFuzzy = sim;
    }
  }

  if (bestFuzzy >= HEADER_MATCH_THRESHOLD) {
    return { score: Math.min(0.92, bestFuzzy), reason: 'fuzzy' };
  }

  return { score: 0, reason: 'none' };
}

function scoreFieldWithContent(
  normalizedHeader: string,
  field: EligibleField,
  profile: ColumnProfile,
): { score: number; reason: MatchReason } {
  const headerMatch = scoreHeaderForField(normalizedHeader, field);
  let score = headerMatch.score;
  let reason = headerMatch.reason;

  // Guard against confusing an STT index column or mismatched data type
  if (profile.sampleCount > 0) {
    if (field === 'studentCode') {
      const mssvMatches = Math.round(profile.mssvRate * profile.sampleCount);
      if (profile.sttRate >= 0.8 && profile.mssvRate === 0) {
        score *= 0.3;
      } else if (score >= HEADER_MATCH_THRESHOLD && profile.mssvRate >= 0.6) {
        score = Math.min(0.99, Math.max(score, 0.92));
      } else if (
        score === 0 &&
        ((mssvMatches >= 2 && profile.mssvRate >= 0.6) ||
          profile.mssvRate >= 0.8)
      ) {
        score =
          profile.mssvRate >= 0.8 && profile.sampleCount >= 2 ? 0.79 : 0.74;
        reason = 'content';
      }
    } else if (field === 'email') {
      const emailMatches = Math.round(profile.emailRate * profile.sampleCount);
      if (score >= HEADER_MATCH_THRESHOLD && profile.emailRate >= 0.6) {
        score = Math.min(0.99, Math.max(score, 0.94));
      } else if (
        score >= HEADER_MATCH_THRESHOLD &&
        score < 0.95 &&
        profile.mssvRate >= 0.6 &&
        profile.emailRate === 0
      ) {
        score *= 0.3;
      } else if (
        score === 0 &&
        ((emailMatches >= 2 && profile.emailRate >= 0.6) ||
          profile.emailRate >= 0.8)
      ) {
        score = profile.dluEmailRate >= 0.6 ? 0.85 : 0.79;
        reason = 'content';
      }
    } else if (field === 'class') {
      const classMatches = Math.round(profile.classRate * profile.sampleCount);
      if (score >= HEADER_MATCH_THRESHOLD && profile.classRate >= 0.5) {
        score = Math.min(0.98, Math.max(score, 0.92));
      } else if (
        score === 0 &&
        ((classMatches >= 2 && profile.classRate >= 0.6) ||
          (profile.classRate >= 0.8 && profile.sampleCount >= 2))
      ) {
        score = 0.75;
        reason = 'content';
      }
    } else if (field === 'fullName') {
      if (
        score >= HEADER_MATCH_THRESHOLD &&
        score < 0.95 &&
        (profile.mssvRate >= 0.7 ||
          profile.emailRate >= 0.7 ||
          profile.sttRate >= 0.8)
      ) {
        score *= 0.35;
      } else if (
        score >= HEADER_MATCH_THRESHOLD &&
        profile.multiWordTextRate >= 0.7
      ) {
        score = Math.min(0.99, score + 0.03);
      }
    } else if (field === 'givenName') {
      if (
        score >= HEADER_MATCH_THRESHOLD &&
        profile.singleWordTextRate >= 0.7
      ) {
        score = Math.min(0.99, score + 0.03);
      }
    }
  }

  if (score < HEADER_MATCH_THRESHOLD) {
    return { score: 0, reason: 'none' };
  }

  return { score: Number(score.toFixed(3)), reason };
}

function rowLooksLikeStudentData(row: RawSheetRow): boolean {
  for (const val of Object.values(row.cells)) {
    const compact = val.replace(/\s+/g, '');
    if (
      STUDENT_CODE_VALUE_RE.test(compact) ||
      DLU_EMAIL_VALUE_RE.test(compact) ||
      EMAIL_VALUE_RE.test(compact)
    ) {
      return true;
    }
  }
  return false;
}

function buildColumnDescriptors(
  rows: RawSheetRow[],
  maxCol: number,
  headerRowIndex: number,
): {
  columns: EligibleColumnDescriptor[];
  profilesByCol: Map<number, ColumnProfile>;
  totalDataRows: number;
} {
  const headerRow =
    headerRowIndex > 0
      ? rows.find((r) => r.rowNumber === headerRowIndex)
      : undefined;

  const dataRows = rows.filter((r) => r.rowNumber > headerRowIndex);
  const columns: EligibleColumnDescriptor[] = [];
  const profilesByCol = new Map<number, ColumnProfile>();

  for (let colIdx = 1; colIdx <= maxCol; colIdx += 1) {
    const headerText = headerRow?.cells[colIdx]?.trim() ?? '';
    const samples: string[] = [];
    const previewSamples: string[] = [];
    let hasAnyData = false;

    for (const dataRow of dataRows) {
      const val = dataRow.cells[colIdx];
      if (!val) continue;
      hasAnyData = true;
      if (samples.length < CONTENT_SAMPLE_LIMIT) {
        samples.push(val);
      }
      if (previewSamples.length < 3 && !previewSamples.includes(val)) {
        previewSamples.push(val);
      }
      if (
        samples.length >= CONTENT_SAMPLE_LIMIT &&
        previewSamples.length >= 3
      ) {
        break;
      }
    }

    if (!headerText && !hasAnyData) continue;

    const letter = columnLetterFromIndex(colIdx);
    const displayHeader = headerText || `(Cột ${letter} - Không tiêu đề)`;
    columns.push({
      index: colIdx,
      letter,
      header: displayHeader,
      samples: previewSamples,
    });
    profilesByCol.set(colIdx, profileColumnSamples(samples));
  }

  return {
    columns,
    profilesByCol,
    totalDataRows: dataRows.length,
  };
}

function assignFieldsForHeaderRow(
  columns: EligibleColumnDescriptor[],
  profilesByCol: Map<number, ColumnProfile>,
  hasHeaderRow: boolean,
): {
  suggestions: Record<EligibleField, EligibleFieldSuggestion>;
  nameMode: EligibleNameMode;
  totalScore: number;
} {
  const candidates: Array<{
    field: EligibleField;
    col: EligibleColumnDescriptor;
    score: number;
    reason: MatchReason;
  }> = [];

  for (const col of columns) {
    const normalizedHeader = hasHeaderRow
      ? normalizeHeaderLabel(col.header)
      : '';
    const profile = profilesByCol.get(col.index) ?? profileColumnSamples([]);

    for (const field of ALL_ELIGIBLE_FIELDS) {
      const { score, reason } = scoreFieldWithContent(
        normalizedHeader,
        field,
        profile,
      );
      if (score >= HEADER_MATCH_THRESHOLD) {
        candidates.push({ field, col, score, reason });
      }
    }
  }

  // Sort descending by score; prefer exact/synonym over fuzzy/content on ties
  const reasonPriority: Record<MatchReason, number> = {
    exact: 5,
    synonym: 4,
    phrase: 3,
    fuzzy: 2,
    content: 1,
    none: 0,
  };
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (reasonPriority[b.reason] !== reasonPriority[a.reason]) {
      return reasonPriority[b.reason] - reasonPriority[a.reason];
    }
    return a.col.index - b.col.index;
  });

  // Resolve fullName vs (surname + givenName) thoughtfully:
  // If both surname and givenName matched separate columns, we allow them alongside
  // fullName evaluation, then decide nameMode below and clear the unused mode's conflicts.
  const assignedFields = new Set<EligibleField>();
  const usedCols = new Set<number>();
  const rawSuggestions = {} as Record<EligibleField, EligibleFieldSuggestion>;

  for (const candidate of candidates) {
    if (assignedFields.has(candidate.field)) continue;
    if (usedCols.has(candidate.col.index)) continue;

    rawSuggestions[candidate.field] = {
      columnIndex: candidate.col.index,
      fileHeader: candidate.col.header,
      confidence: candidate.score,
      matchReason: candidate.reason,
    };
    assignedFields.add(candidate.field);
    usedCols.add(candidate.col.index);
  }

  for (const field of ALL_ELIGIBLE_FIELDS) {
    if (!rawSuggestions[field]) {
      rawSuggestions[field] = {
        columnIndex: null,
        fileHeader: null,
        confidence: 0,
        matchReason: 'none',
      };
    }
  }

  // Decide between merged fullName vs split (surname + givenName)
  const hasFull = rawSuggestions.fullName.columnIndex !== null;
  const hasSurname = rawSuggestions.surname.columnIndex !== null;
  const hasGiven = rawSuggestions.givenName.columnIndex !== null;

  let nameMode: EligibleNameMode = 'full';
  if (hasSurname && hasGiven) {
    const splitScore =
      rawSuggestions.surname.confidence + rawSuggestions.givenName.confidence;
    if (
      !hasFull ||
      (rawSuggestions.fullName.confidence < 0.95 &&
        splitScore >= rawSuggestions.fullName.confidence * 1.5)
    ) {
      nameMode = 'split';
    }
  } else if (!hasFull && !hasSurname && hasGiven) {
    // Only a "Tên" column exists (no "Họ") — treat it as fullName
    rawSuggestions.fullName = { ...rawSuggestions.givenName };
    rawSuggestions.givenName = {
      columnIndex: null,
      fileHeader: null,
      confidence: 0,
      matchReason: 'none',
    };
  }

  let totalScore = 0;
  for (const field of ALL_ELIGIBLE_FIELDS) {
    const s = rawSuggestions[field];
    if (s.columnIndex !== null) {
      totalScore += s.confidence;
    }
  }

  if (rawSuggestions.studentCode.columnIndex !== null) {
    totalScore += 2;
  }
  if (
    (nameMode === 'full' && rawSuggestions.fullName.columnIndex !== null) ||
    (nameMode === 'split' &&
      rawSuggestions.surname.columnIndex !== null &&
      rawSuggestions.givenName.columnIndex !== null)
  ) {
    totalScore += 2;
  }

  return { suggestions: rawSuggestions, nameMode, totalScore };
}

export function analyzeSheetRows(
  rows: RawSheetRow[],
  maxCol: number,
  explicitHeaderRowIndex?: number,
): SheetColumnAnalysis {
  const firstStudentDataRow = rows.find((r) => rowLooksLikeStudentData(r));
  const maxHeaderRowNumber = firstStudentDataRow
    ? Math.min(HEADER_SCAN_LIMIT, firstStudentDataRow.rowNumber - 1)
    : HEADER_SCAN_LIMIT;

  const candidateRows = rows.filter(
    (r) => r.rowNumber <= maxHeaderRowNumber && !rowLooksLikeStudentData(r),
  );
  if (
    explicitHeaderRowIndex &&
    explicitHeaderRowIndex > 0 &&
    !candidateRows.some((r) => r.rowNumber === explicitHeaderRowIndex)
  ) {
    const explicitRow = rows.find(
      (r) => r.rowNumber === explicitHeaderRowIndex,
    );
    if (explicitRow && !rowLooksLikeStudentData(explicitRow)) {
      candidateRows.push(explicitRow);
      candidateRows.sort((a, b) => a.rowNumber - b.rowNumber);
    }
  }

  const candidateHeaderRows: CandidateHeaderRow[] = candidateRows.map((r) => ({
    rowIndex: r.rowNumber,
    preview: Object.entries(r.cells)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(0, 5)
      .map(([, v]) => v),
  }));

  if (explicitHeaderRowIndex !== undefined) {
    const { columns, profilesByCol, totalDataRows } = buildColumnDescriptors(
      rows,
      maxCol,
      explicitHeaderRowIndex,
    );
    const { suggestions, nameMode } = assignFieldsForHeaderRow(
      columns,
      profilesByCol,
      explicitHeaderRowIndex > 0,
    );
    return {
      headerRowIndex: explicitHeaderRowIndex,
      totalDataRows,
      columns,
      nameMode,
      suggestions,
      candidateHeaderRows,
    };
  }

  // Auto-detect the highest scoring header row within HEADER_SCAN_LIMIT.
  // A valid table header must appear before the first student-data row and
  // must have at least one data row beneath it (when the sheet has > 1 row).
  const scanRows = rows.filter(
    (r) =>
      r.rowNumber <= maxHeaderRowNumber &&
      Object.keys(r.cells).length >= 2 &&
      !rowLooksLikeStudentData(r),
  );

  let bestAnalysis: (SheetColumnAnalysis & { _score: number }) | null = null;

  for (const candidateRow of scanRows) {
    const { columns, profilesByCol, totalDataRows } = buildColumnDescriptors(
      rows,
      maxCol,
      candidateRow.rowNumber,
    );
    if (rows.length > 1 && totalDataRows === 0) continue;

    const { suggestions, nameMode, totalScore } = assignFieldsForHeaderRow(
      columns,
      profilesByCol,
      true,
    );

    const hasHeaderSignal = ALL_ELIGIBLE_FIELDS.some(
      (f) =>
        suggestions[f].columnIndex !== null &&
        suggestions[f].matchReason !== 'content',
    );
    if (!hasHeaderSignal) continue;

    if (!bestAnalysis || totalScore > bestAnalysis._score) {
      bestAnalysis = {
        headerRowIndex: candidateRow.rowNumber,
        totalDataRows,
        columns,
        nameMode,
        suggestions,
        candidateHeaderRows,
        _score: totalScore,
      };
    }
  }

  if (bestAnalysis) {
    return {
      headerRowIndex: bestAnalysis.headerRowIndex,
      totalDataRows: bestAnalysis.totalDataRows,
      columns: bestAnalysis.columns,
      nameMode: bestAnalysis.nameMode,
      suggestions: bestAnalysis.suggestions,
      candidateHeaderRows: bestAnalysis.candidateHeaderRows,
    };
  }

  // Fallback for files with unrecognized headers or headerless data:
  // If row 1 looks like student data (e.g. contains 7-digit MSSV / email),
  // default to headerless mode (headerRowIndex = 0) so row 1 is not lost!
  const firstRow = rows[0];
  const fallbackHeaderRow =
    firstRow && rowLooksLikeStudentData(firstRow)
      ? 0
      : (firstRow?.rowNumber ?? 1);

  const { columns, profilesByCol, totalDataRows } = buildColumnDescriptors(
    rows,
    maxCol,
    fallbackHeaderRow,
  );
  const { suggestions, nameMode } = assignFieldsForHeaderRow(
    columns,
    profilesByCol,
    fallbackHeaderRow > 0,
  );

  return {
    headerRowIndex: fallbackHeaderRow,
    totalDataRows,
    columns,
    nameMode,
    suggestions,
    candidateHeaderRows,
  };
}

export function toColumnMappingFromSuggestions(
  suggestions: Record<EligibleField, EligibleFieldSuggestion>,
  nameMode: EligibleNameMode,
): EligibleColumnMapping {
  return {
    studentCodeCol: suggestions.studentCode.columnIndex,
    fullNameCol: nameMode === 'full' ? suggestions.fullName.columnIndex : null,
    surnameCol: nameMode === 'split' ? suggestions.surname.columnIndex : null,
    givenNameCol:
      nameMode === 'split' ? suggestions.givenName.columnIndex : null,
    classCol: suggestions.class.columnIndex,
    emailCol: suggestions.email.columnIndex,
    noteCol: suggestions.note.columnIndex,
  };
}
