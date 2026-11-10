import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Prisma, TopicStatus } from '../../../generated/prisma/client';
import {
  sanitizeExportFilename,
  sanitizeSpreadsheetText,
} from '../../common/utils/spreadsheet.util';
import { recordAudit } from '../../core/audit/audit-entry';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ExportTopicsDto, type ExportTopicsMode } from './dto/export-topics.dto';

const EXPORT_MAX_ROWS = 2000;
const HEADER_ROW_INDEX = 5;
const LAST_COL_LETTER = 'I';

const VN_DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

const TOPIC_STATUS_LABELS: Partial<Record<TopicStatus, string>> &
  Record<string, string> = {
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ duyệt',
  PENDING_DEPARTMENT: 'Chờ Bộ môn duyệt',
  PENDING_FACULTY: 'Chờ Khoa duyệt',
  APPROVED_OPEN: 'Đã duyệt mở',
  APPROVED: 'Đã duyệt — chờ mở',
  OPEN: 'Đang mở đăng ký',
  ASSIGNED: 'Đã giao nhóm',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Bị từ chối',
};

const TITLE_PREFIX_PATTERN =
  /^(PGS\.TS|GS\.TS|ThS\.|TS\.|PGS\.|GS\.|ThS|TS|PGS|GS|Ths|Ts)\s+/i;

const EXPORT_SELECT = {
  id: true,
  title: true,
  maxStudents: true,
  status: true,
  createdAt: true,
  sourceProposalId: true,
  major: { select: { id: true, name: true } },
  round: {
    select: {
      projectType: { select: { id: true, name: true } },
    },
  },
  lecturer: {
    select: {
      id: true,
      fullName: true,
      academicTitle: true,
      major: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.TopicSelect;

type ExportTopicRow = Prisma.TopicGetPayload<{ select: typeof EXPORT_SELECT }>;

export interface ExportWorkbookResult {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class TopicsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportWorkbook(
    query: ExportTopicsDto,
    userId: number,
  ): Promise<ExportWorkbookResult> {
    const mode: ExportTopicsMode = query.mode ?? 'FILTERED';
    const semester = await this.resolveSemester(query.semesterId);
    const where = this.buildWhereClause(mode, semester.id, query);

    const topics = await this.prisma.topic.findMany({
      where,
      select: EXPORT_SELECT,
      orderBy:
        mode === 'SIGN_OFF'
          ? [
              { round: { projectType: { name: 'asc' } } },
              { major: { name: 'asc' } },
              { lecturer: { fullName: 'asc' } },
              { title: 'asc' },
            ]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
      take: EXPORT_MAX_ROWS,
    });

    if (topics.length === 0) {
      throw new BadRequestException(
        mode === 'SIGN_OFF'
          ? 'Chưa có đề tài nào ở trạng thái Đã duyệt — chờ mở trong học kỳ này để xuất trình ký.'
          : 'Không có đề tài nào phù hợp điều kiện lọc để xuất Excel.',
      );
    }

    const buffer = await this.buildWorkbook(topics, semester.name, mode);
    const filenamePrefix =
      mode === 'SIGN_OFF' ? 'trinh-ky-de-tai' : 'danh-sach-de-tai';
    const filename = sanitizeExportFilename(
      `${filenamePrefix}-${semester.code}`,
    );

    await recordAudit(this.prisma, {
      userId,
      action: 'TOPIC_LIST_EXPORTED',
      targetTable: 'topics',
      targetId: semester.id,
      newValue: {
        mode,
        semesterId: semester.id,
        count: topics.length,
        ...(mode === 'FILTERED' && {
          status: query.status ?? null,
          lecturerId: query.lecturerId ?? null,
          projectTypeId: query.projectTypeId ?? null,
          majorId: query.majorId ?? null,
          q: query.q ?? null,
        }),
      },
    });

    return { buffer, filename };
  }

  private async resolveSemester(semesterId?: number) {
    if (semesterId !== undefined) {
      const semester = await this.prisma.semester.findUnique({
        where: { id: semesterId },
        select: { id: true, name: true, code: true },
      });
      if (!semester) {
        throw new NotFoundException(`Không tìm thấy học kỳ mã #${semesterId}.`);
      }
      return semester;
    }

    const active = await this.prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
    });
    if (!active) {
      throw new BadRequestException(
        'Chưa có học kỳ nào đang mở để xuất danh sách đề tài.',
      );
    }
    return active;
  }

  private buildWhereClause(
    mode: ExportTopicsMode,
    semesterId: number,
    query: ExportTopicsDto,
  ): Prisma.TopicWhereInput {
    // Sign-off mode enforces APPROVED server-side regardless of client params so
    // unapproved or rejected topics cannot be slipped into a BCN sign-off file.
    if (mode === 'SIGN_OFF') {
      return {
        semesterId,
        status: TopicStatus.APPROVED,
      };
    }

    const where: Prisma.TopicWhereInput = { semesterId };

    // Admin exports must never expose lecturer DRAFT topics.
    if (query.status) {
      where.status =
        query.status === TopicStatus.DRAFT ? { in: [] } : { equals: query.status };
    } else {
      where.status = { not: TopicStatus.DRAFT };
    }

    if (query.projectTypeId) {
      where.round = { projectTypeId: query.projectTypeId };
    }

    if (query.lecturerId) {
      where.lecturerId = query.lecturerId;
    }

    if (query.majorId) {
      where.majorId = query.majorId;
    }

    if (query.q) {
      where.AND = [
        {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return where;
  }

  private async buildWorkbook(
    topics: ExportTopicRow[],
    semesterName: string,
    mode: ExportTopicsMode,
  ): Promise<Buffer> {
    const isSignOff = mode === 'SIGN_OFF';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ProBase';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(
      isSignOff ? 'Trình ký đề tài' : 'Danh sách đề tài',
      {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
        },
      },
    );

    const widths = [6, 48, 24, 22, 22, 9, 16, 20, 13];
    widths.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });

    this.writeDocumentHeader(sheet, semesterName, topics.length, isSignOff);
    this.writeTableHeader(sheet, isSignOff);
    this.writeTopicRows(sheet, topics);

    if (isSignOff) {
      this.writeSignOffFooter(sheet, HEADER_ROW_INDEX + topics.length + 2);
    }

    sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW_INDEX }];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private writeDocumentHeader(
    sheet: ExcelJS.Worksheet,
    semesterName: string,
    totalCount: number,
    isSignOff: boolean,
  ) {
    sheet.mergeCells(`A1:${LAST_COL_LETTER}1`);
    const orgCell = sheet.getCell('A1');
    orgCell.value = 'TRƯỜNG ĐẠI HỌC ĐÀ LẠT — KHOA CÔNG NGHỆ THÔNG TIN';
    orgCell.font = { name: 'Times New Roman', size: 11, bold: true };
    orgCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 20;

    sheet.mergeCells(`A2:${LAST_COL_LETTER}2`);
    const titleCell = sheet.getCell('A2');
    titleCell.value = isSignOff
      ? 'DANH SÁCH ĐỀ TÀI TRÌNH KÝ BAN CHỦ NHIỆM KHOA'
      : 'DANH SÁCH ĐỀ TÀI ĐỒ ÁN / KHÓA LUẬN';
    titleCell.font = { name: 'Times New Roman', size: 13, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 24;

    sheet.mergeCells(`A3:${LAST_COL_LETTER}3`);
    const metaCell = sheet.getCell('A3');
    metaCell.value = `Học kỳ: ${sanitizeSpreadsheetText(semesterName)}   |   Số lượng: ${totalCount} đề tài   |   Ngày xuất: ${VN_DATE_FORMAT.format(new Date())}`;
    metaCell.font = { name: 'Times New Roman', size: 10, italic: true };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(3).height = 18;

    sheet.getRow(4).height = 8;
  }

  private writeTableHeader(sheet: ExcelJS.Worksheet, isSignOff: boolean) {
    const headers = [
      'STT',
      'Tên đề tài',
      'Giảng viên hướng dẫn',
      'Chuyên ngành',
      'Loại đồ án',
      'SL SV',
      'Nguồn gốc',
      'Trạng thái',
      'Ngày tạo',
    ];

    const headerRow = sheet.getRow(HEADER_ROW_INDEX);
    headerRow.height = 26;
    headerRow.values = headers;

    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Times New Roman',
        size: 11,
        bold: true,
        color: { argb: 'FF0F172A' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF64748B' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });

    if (!isSignOff) {
      sheet.autoFilter = `A${HEADER_ROW_INDEX}:${LAST_COL_LETTER}${HEADER_ROW_INDEX}`;
    }
  }

  private writeTopicRows(sheet: ExcelJS.Worksheet, topics: ExportTopicRow[]) {
    topics.forEach((topic, index) => {
      const row = sheet.getRow(HEADER_ROW_INDEX + 1 + index);
      const majorName =
        topic.major?.name ?? topic.lecturer.major?.name ?? '—';

      row.values = [
        index + 1,
        sanitizeSpreadsheetText(topic.title),
        sanitizeSpreadsheetText(
          formatLecturerDisplayName(
            topic.lecturer.fullName,
            topic.lecturer.academicTitle,
          ),
        ),
        sanitizeSpreadsheetText(majorName),
        sanitizeSpreadsheetText(topic.round.projectType.name),
        topic.maxStudents,
        topic.sourceProposalId ? 'Từ đề xuất SV' : 'GV đề xuất',
        TOPIC_STATUS_LABELS[topic.status] ?? topic.status,
        VN_DATE_FORMAT.format(topic.createdAt),
      ];

      const isEven = index % 2 === 1;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = {
          name: 'Times New Roman',
          size: 11,
          color: { argb: 'FF0F172A' },
        };
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal:
            colNumber === 1 || colNumber === 6 || colNumber === 7 || colNumber === 9
              ? 'center'
              : 'left',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });
    });
  }

  private writeSignOffFooter(sheet: ExcelJS.Worksheet, startRow: number) {
    sheet.mergeCells(`F${startRow}:${LAST_COL_LETTER}${startRow}`);
    const dateCell = sheet.getCell(`F${startRow}`);
    dateCell.value = 'Đà Lạt, ngày ..... tháng ..... năm 20....';
    dateCell.font = { name: 'Times New Roman', size: 11, italic: true };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const roleRow = startRow + 1;
    sheet.mergeCells(`B${roleRow}:D${roleRow}`);
    const leftTitle = sheet.getCell(`B${roleRow}`);
    leftTitle.value = 'NGƯỜI LẬP BIỂU';
    leftTitle.font = { name: 'Times New Roman', size: 11, bold: true };
    leftTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`F${roleRow}:${LAST_COL_LETTER}${roleRow}`);
    const rightTitle = sheet.getCell(`F${roleRow}`);
    rightTitle.value = 'BAN CHỦ NHIỆM KHOA';
    rightTitle.font = { name: 'Times New Roman', size: 11, bold: true };
    rightTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const noteRow = startRow + 2;
    sheet.mergeCells(`B${noteRow}:D${noteRow}`);
    const leftNote = sheet.getCell(`B${noteRow}`);
    leftNote.value = '(Ký và ghi rõ họ tên)';
    leftNote.font = { name: 'Times New Roman', size: 10, italic: true };
    leftNote.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`F${noteRow}:${LAST_COL_LETTER}${noteRow}`);
    const rightNote = sheet.getCell(`F${noteRow}`);
    rightNote.value = '(Ký, duyệt và đóng dấu)';
    rightNote.font = { name: 'Times New Roman', size: 10, italic: true };
    rightNote.alignment = { horizontal: 'center', vertical: 'middle' };
  }
}

function formatLecturerDisplayName(
  fullName: string,
  academicTitle?: string | null,
): string {
  let raw = fullName.replace(/\(.*?\)/g, '').trim();
  let detectedTitle = (academicTitle ?? '').trim();

  while (TITLE_PREFIX_PATTERN.test(raw)) {
    const match = raw.match(TITLE_PREFIX_PATTERN);
    if (match && !detectedTitle) {
      detectedTitle = match[1].replace(/\.?$/, '.');
    }
    raw = raw.replace(TITLE_PREFIX_PATTERN, '').trim();
  }

  if (detectedTitle && !detectedTitle.endsWith('.')) {
    detectedTitle += '.';
  }

  return detectedTitle ? `${detectedTitle} ${raw}` : raw;
}
