import {
  analyzeSheetRows,
  columnLetterFromIndex,
  damerauLevenshtein,
  normalizeHeaderLabel,
  type RawSheetRow,
} from './eligible-column-matcher.util';

describe('eligible-column-matcher.util', () => {
  describe('normalizeHeaderLabel', () => {
    it('strips BOM, Vietnamese diacritics, parenthetical notes, numbering, and punctuation', () => {
      expect(normalizeHeaderLabel('\uFEFFMSSV (*)')).toBe('mssv');
      expect(normalizeHeaderLabel('1. Họ và tên (Bắt buộc)')).toBe('ho va ten');
      expect(normalizeHeaderLabel('Cột B: Mã_Sinh-Viên')).toBe('ma sinh vien');
      expect(normalizeHeaderLabel('Email (Tùy chọn)')).toBe('email');
      expect(normalizeHeaderLabel('(MSSV)')).toBe('mssv');
    });
  });

  describe('damerauLevenshtein', () => {
    it('counts adjacent transpositions as edit distance 1', () => {
      expect(damerauLevenshtein('emial', 'email')).toBe(1);
      expect(damerauLevenshtein('msvs', 'mssv')).toBe(1);
      expect(damerauLevenshtein('ho va te', 'ho va ten')).toBe(1);
    });
  });

  describe('columnLetterFromIndex', () => {
    it('converts 1-based column indices to Excel letters', () => {
      expect(columnLetterFromIndex(1)).toBe('A');
      expect(columnLetterFromIndex(2)).toBe('B');
      expect(columnLetterFromIndex(26)).toBe('Z');
      expect(columnLetterFromIndex(27)).toBe('AA');
    });
  });

  describe('analyzeSheetRows', () => {
    it('matches messy headers with typos, extra phrases, and extended synonyms', () => {
      const rows: RawSheetRow[] = [
        {
          rowNumber: 1,
          cells: {
            1: 'STT',
            2: '1. Mã số SV DLU',
            3: 'Họ và tê',
            4: 'Lớp quản lý',
            5: 'Emial',
            6: 'Chú thích PĐT',
          },
        },
        {
          rowNumber: 2,
          cells: {
            1: '1',
            2: '2212345',
            3: 'Nguyễn Văn An',
            4: 'CTK46PM',
            5: '2212345@dlu.edu.vn',
            6: 'Đủ ĐK',
          },
        },
        {
          rowNumber: 3,
          cells: {
            1: '2',
            2: '2212346',
            3: 'Trần Thị Bình',
            4: 'CTK46MMT',
            5: '2212346@dlu.edu.vn',
            6: 'Học vượt',
          },
        },
      ];

      const analysis = analyzeSheetRows(rows, 6);
      expect(analysis.headerRowIndex).toBe(1);
      expect(analysis.nameMode).toBe('full');
      expect(analysis.suggestions.studentCode.columnIndex).toBe(2);
      expect(analysis.suggestions.fullName.columnIndex).toBe(3);
      expect(analysis.suggestions.class.columnIndex).toBe(4);
      expect(analysis.suggestions.email.columnIndex).toBe(5);
      expect(analysis.suggestions.note.columnIndex).toBe(6);
    });

    it('detects split surname + givenName layout and skips multi-row banners', () => {
      const rows: RawSheetRow[] = [
        { rowNumber: 1, cells: { 1: 'TRƯỜNG ĐẠI HỌC ĐÀ LẠT' } },
        {
          rowNumber: 2,
          cells: { 1: 'KHOA CNTT', 2: 'DANH SÁCH SINH VIÊN ĐỦ ĐK' },
        },
        {
          rowNumber: 3,
          cells: {
            1: 'STT',
            2: 'MaSV',
            3: 'Họ lót',
            4: 'Tên',
            5: 'Lớp SH',
          },
        },
        {
          rowNumber: 4,
          cells: {
            1: '1',
            2: '2212345',
            3: 'Nguyễn Văn',
            4: 'An',
            5: 'CTK46PM',
          },
        },
      ];

      const analysis = analyzeSheetRows(rows, 5);
      expect(analysis.headerRowIndex).toBe(3);
      expect(analysis.nameMode).toBe('split');
      expect(analysis.suggestions.studentCode.columnIndex).toBe(2);
      expect(analysis.suggestions.surname.columnIndex).toBe(3);
      expect(analysis.suggestions.givenName.columnIndex).toBe(4);
      expect(analysis.suggestions.class.columnIndex).toBe(5);
    });

    it('uses content inference when headers are cryptic (e.g. Col_1, Col_3, Col_4)', () => {
      const rows: RawSheetRow[] = [
        {
          rowNumber: 1,
          cells: {
            1: 'Col_A',
            2: 'Họ và tên',
            3: 'Col_C',
            4: 'Col_D',
          },
        },
        {
          rowNumber: 2,
          cells: {
            1: '2212345',
            2: 'Nguyễn Văn An',
            3: 'CTK46PM',
            4: '2212345@dlu.edu.vn',
          },
        },
        {
          rowNumber: 3,
          cells: {
            1: '2212346',
            2: 'Trần Thị Bình',
            3: 'CTK46MMT',
            4: '2212346@dlu.edu.vn',
          },
        },
      ];

      const analysis = analyzeSheetRows(rows, 4);
      expect(analysis.headerRowIndex).toBe(1);
      expect(analysis.suggestions.studentCode).toMatchObject({
        columnIndex: 1,
        matchReason: 'content',
      });
      expect(analysis.suggestions.fullName).toMatchObject({
        columnIndex: 2,
        matchReason: 'exact',
      });
      expect(analysis.suggestions.class).toMatchObject({
        columnIndex: 3,
        matchReason: 'content',
      });
      expect(analysis.suggestions.email).toMatchObject({
        columnIndex: 4,
        matchReason: 'content',
      });
    });

    it('falls back to headerless mode (row 0) when row 1 already contains student data', () => {
      const rows: RawSheetRow[] = [
        {
          rowNumber: 1,
          cells: {
            1: '2212345',
            2: 'Nguyễn Văn An',
            3: 'CTK46PM',
            4: '2212345@dlu.edu.vn',
          },
        },
        {
          rowNumber: 2,
          cells: {
            1: '2212346',
            2: 'Trần Thị Bình',
            3: 'CTK46MMT',
            4: '2212346@dlu.edu.vn',
          },
        },
      ];

      const analysis = analyzeSheetRows(rows, 4);
      expect(analysis.headerRowIndex).toBe(0);
      expect(analysis.totalDataRows).toBe(2);
      expect(analysis.suggestions.studentCode.columnIndex).toBe(1);
      expect(analysis.suggestions.class.columnIndex).toBe(3);
      expect(analysis.suggestions.email.columnIndex).toBe(4);
    });

    it('never confuses Tên lớp with Tên or STT with MSSV', () => {
      const rows: RawSheetRow[] = [
        { rowNumber: 1, cells: { 1: 'STT', 2: 'Tên lớp', 3: 'Ghi chú' } },
        {
          rowNumber: 2,
          cells: { 1: '1', 2: 'CTK46PM', 3: 'Không có cột MSSV' },
        },
      ];

      const analysis = analyzeSheetRows(rows, 3);
      expect(analysis.suggestions.studentCode.columnIndex).toBeNull();
      expect(analysis.suggestions.fullName.columnIndex).toBeNull();
      expect(analysis.suggestions.givenName.columnIndex).toBeNull();
      expect(analysis.suggestions.class.columnIndex).toBe(2);
      expect(analysis.suggestions.note.columnIndex).toBe(3);
    });
  });
});
