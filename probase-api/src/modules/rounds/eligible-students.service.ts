import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import ExcelJS from 'exceljs';
import { extname } from 'path';
import { Readable } from 'stream';
import {
  GroupMemberStatus,
  NotificationType,
  RegistrationGroupStatus,
  Role,
} from '../../../generated/prisma/client';
import { mapWithConcurrency } from '../../common/utils/concurrency.util';
import {
  isUniqueViolation,
  uniqueConstraintFields,
} from '../../common/utils/prisma-error.util';
import { recordAudit } from '../../core/audit/audit-entry';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseClassCode } from '../users/class-code.util';
import {
  cohortFromStudentCode,
  studentCodeMatchesEmail,
} from '../users/student-code.util';
import {
  EligibleImportMappingRequestDto,
  ReanalyzeEligibleImportDto,
} from './dto/eligible-import.dto';
import { QueryEligibleStudentsDto } from './dto/query-eligible-students.dto';
import {
  analyzeSheetRows,
  CandidateHeaderRow,
  EligibleColumnDescriptor,
  EligibleColumnMapping,
  EligibleField,
  EligibleFieldSuggestion,
  EligibleNameMode,
  extractWorksheetRows,
  RawSheetRow,
  toColumnMappingFromSuggestions,
} from './eligible-column-matcher.util';
import {
  EligibleImportCommitSummary,
  EligibleImportSessionService,
} from './eligible-import-session.service';

const MAX_IMPORT_ROWS = 2000;
const PASSWORD_HASH_CONCURRENCY = 8;
const DB_WRITE_CONCURRENCY = 5;

const DLU_EMAIL_DOMAIN = 'dlu.edu.vn';
const STUDENT_CODE_RE = /^\d{7}$/;
const EMAIL_SYNTAX_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidatedRow {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  className?: string;
  cohort: string;
  majorId: number | null;
  majorCode?: string | null;
  explicitEmail?: string;
  effectiveEmail: string;
  note?: string;
  warnings: string[];
}

type ExistingUserWithProfile = {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
  studentProfile: {
    id: number;
    studentCode: string;
  } | null;
};

type RawImportPlan =
  | { kind: 'create_user'; row: ValidatedRow }
  | { kind: 'create_profile'; row: ValidatedRow; userId: number }
  | {
      kind: 'update_student';
      row: ValidatedRow;
      userId: number;
      studentProfileId: number;
    };

type ImportPlan =
  | {
      kind: 'create_user';
      row: ValidatedRow;
      passwordHash: string;
    }
  | {
      kind: 'create_profile';
      row: ValidatedRow;
      userId: number;
    }
  | {
      kind: 'update_student';
      row: ValidatedRow;
      userId: number;
      studentProfileId: number;
    };

export interface ImportResultSummary {
  totalRows: number;
  importedCount: number;
  createdAccountsCount: number;
  errorCount: number;
  errors: { row: number; reason: string }[];
}

export interface ParseEligibleImportResult {
  sessionId: string;
  fileName: string;
  round: {
    id: number;
    semesterName: string;
    projectTypeName: string;
  };
  headerRowIndex: number;
  totalDataRows: number;
  columns: EligibleColumnDescriptor[];
  nameMode: EligibleNameMode;
  suggestions: Record<EligibleField, EligibleFieldSuggestion>;
  candidateHeaderRows: CandidateHeaderRow[];
  expiresAt: Date;
}

export interface ReanalyzeEligibleImportResult {
  sessionId: string;
  headerRowIndex: number;
  totalDataRows: number;
  columns: EligibleColumnDescriptor[];
  nameMode: EligibleNameMode;
  suggestions: Record<EligibleField, EligibleFieldSuggestion>;
}

export interface PreviewEligibleImportRow {
  row: number;
  valid: boolean;
  action?: 'create_account' | 'add_to_round' | 'already_in_round';
  studentCode?: string;
  fullName?: string;
  className?: string;
  cohort?: string;
  majorCode?: string | null;
  effectiveEmail?: string;
  note?: string;
  warnings?: string[];
  reason?: string;
}

export interface PreviewEligibleImportResult {
  sessionId: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
  newAccountsCount: number;
  existingStudentsCount: number;
  alreadyEligibleCount: number;
  rows: PreviewEligibleImportRow[];
}

export interface CommitEligibleImportResult extends EligibleImportCommitSummary {
  sessionId: string;
}

@Injectable()
export class EligibleStudentsService {
  private readonly logger = new Logger(EligibleStudentsService.name);
  private readonly sessions: EligibleImportSessionService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Optional() importSessions?: EligibleImportSessionService,
  ) {
    this.sessions = importSessions ?? new EligibleImportSessionService();
  }

  /**
   * Generates a standard Excel template for eligible students import.
   */
  async getTemplate(roundId?: number): Promise<Buffer> {
    if (roundId && roundId > 0) {
      await this.prisma.registrationRound.findUnique({
        where: { id: roundId },
        select: { id: true },
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ProBase DLU';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('DS_SV_Du_Dieu_Kien');

    sheet.columns = [
      { header: 'MSSV (*)', key: 'studentCode', width: 14 },
      { header: 'Họ và tên (*)', key: 'fullName', width: 26 },
      { header: 'Lớp (*)', key: 'class', width: 14 },
      { header: 'Email (Tùy chọn)', key: 'email', width: 28 },
      { header: 'Ghi chú (PĐT)', key: 'note', width: 26 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.addRow({
      studentCode: '2212345',
      fullName: 'Nguyễn Văn An',
      class: 'CTK46PM',
      email: '2212345@dlu.edu.vn',
      note: 'Đủ điều kiện tín chỉ',
    });
    sheet.addRow({
      studentCode: '2212346',
      fullName: 'Trần Thị Bình',
      class: 'CTK46MMT',
      email: '2212346@dlu.edu.vn',
      note: 'Học vượt',
    });
    sheet.addRow({
      studentCode: '2112890',
      fullName: 'Lê Hoàng Nam',
      class: 'CTK45PM',
      email: '2112890@dlu.edu.vn',
      note: 'Trả nợ K45',
    });

    const file = await workbook.xlsx.writeBuffer();
    return Buffer.from(file);
  }

  /**
   * Step 1 (Wizard): Parse uploaded spreadsheet, run hybrid header + content
   * inference, and store raw rows in a short-lived admin-scoped session.
   */
  async parseImport(
    roundId: number,
    file: Express.Multer.File,
    actorId: number,
  ): Promise<ParseEligibleImportResult> {
    const round = await this.requireRound(roundId);
    const sheet = await this.parseUploadWorkbook(file);
    const { rows, maxCol } = extractWorksheetRows(sheet);

    if (rows.length === 0) {
      throw new BadRequestException('File không chứa hàng dữ liệu');
    }

    const analysis = analyzeSheetRows(rows, maxCol);
    if (analysis.totalDataRows === 0) {
      throw new BadRequestException(
        'File không chứa hàng dữ liệu sinh viên nào',
      );
    }

    if (analysis.totalDataRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `File vượt quá giới hạn tối đa ${MAX_IMPORT_ROWS} dòng dữ liệu mỗi lần import.`,
      );
    }

    const session = this.sessions.create({
      roundId,
      adminId: actorId,
      fileName: file.originalname || 'import.xlsx',
      rows,
      maxCol,
    });

    return {
      sessionId: session.id,
      fileName: session.fileName,
      round: {
        id: round.id,
        semesterName: round.semester.name,
        projectTypeName: round.projectType.name,
      },
      headerRowIndex: analysis.headerRowIndex,
      totalDataRows: analysis.totalDataRows,
      columns: analysis.columns,
      nameMode: analysis.nameMode,
      suggestions: analysis.suggestions,
      candidateHeaderRows: analysis.candidateHeaderRows,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Step 1b (Wizard): Re-analyze column suggestions if the user selects
   * a different header row index (or switches to headerless mode: 0).
   */
  async reanalyzeSession(
    roundId: number,
    dto: ReanalyzeEligibleImportDto,
    actorId: number,
  ): Promise<ReanalyzeEligibleImportResult> {
    await this.requireRound(roundId);
    const session = this.sessions.get(dto.sessionId, roundId, actorId);

    if (session.committed) {
      throw new ConflictException(
        'Phiên import này đã được xác nhận. Không thể phân tích lại.',
      );
    }

    const analysis = analyzeSheetRows(
      session.rows,
      session.maxCol,
      dto.headerRowIndex,
    );

    if (analysis.totalDataRows === 0) {
      throw new BadRequestException(
        'Không có dòng dữ liệu nào bên dưới dòng tiêu đề đã chọn.',
      );
    }

    if (analysis.totalDataRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `File vượt quá giới hạn tối đa ${MAX_IMPORT_ROWS} dòng dữ liệu mỗi lần import.`,
      );
    }

    return {
      sessionId: session.id,
      headerRowIndex: analysis.headerRowIndex,
      totalDataRows: analysis.totalDataRows,
      columns: analysis.columns,
      nameMode: analysis.nameMode,
      suggestions: analysis.suggestions,
    };
  }

  /**
   * Step 2 (Wizard): Dry-run validate every row under the confirmed mapping
   * and check DB conflicts / existing round eligibility. No DB writes happen.
   */
  async previewImport(
    roundId: number,
    dto: EligibleImportMappingRequestDto,
    actorId: number,
  ): Promise<PreviewEligibleImportResult> {
    await this.requireRound(roundId);
    const session = this.sessions.get(dto.sessionId, roundId, actorId);

    if (session.committed) {
      throw new ConflictException(
        'Phiên import này đã được xác nhận lưu. Không thể xem trước lại.',
      );
    }

    this.assertValidMapping(dto.mapping, dto.nameMode, session.maxCol);

    const majors = await this.prisma.major.findMany({
      select: { id: true, code: true },
    });

    const { totalDataRows, validRows, errors } =
      this.extractAndValidateRowsFromRaw(
        session.rows,
        dto.headerRowIndex,
        dto.nameMode,
        dto.mapping,
        majors,
      );

    if (totalDataRows === 0) {
      throw new BadRequestException(
        'Không có hàng dữ liệu nào bên dưới dòng tiêu đề đã chọn.',
      );
    }

    const rawPlans =
      validRows.length > 0
        ? await this.resolveImportPlans(validRows, errors)
        : [];

    const existingStudentProfileIds = rawPlans
      .filter(
        (
          p,
        ): p is {
          kind: 'update_student';
          row: ValidatedRow;
          userId: number;
          studentProfileId: number;
        } => p.kind === 'update_student',
      )
      .map((p) => p.studentProfileId);

    const existingRoundEligibilities =
      existingStudentProfileIds.length > 0
        ? ((await this.prisma.roundStudentEligibility.findMany({
            where: {
              roundId,
              studentId: { in: existingStudentProfileIds },
            },
            select: { studentId: true },
          })) ?? [])
        : [];

    const alreadyEligibleIds = new Set(
      existingRoundEligibilities.map((e) => e.studentId),
    );

    const previewRows: PreviewEligibleImportRow[] = [];
    let newAccountsCount = 0;
    let existingStudentsCount = 0;
    let alreadyEligibleCount = 0;
    let warningCount = 0;

    for (const plan of rawPlans) {
      const warnings = [...plan.row.warnings];
      let action: PreviewEligibleImportRow['action'];

      if (plan.kind === 'create_user') {
        action = 'create_account';
        newAccountsCount += 1;
      } else if (
        plan.kind === 'update_student' &&
        alreadyEligibleIds.has(plan.studentProfileId)
      ) {
        action = 'already_in_round';
        alreadyEligibleCount += 1;
        warnings.push(
          'Sinh viên đã có trong danh sách đợt này — sẽ cập nhật thông tin & ghi chú',
        );
      } else {
        action = 'add_to_round';
        existingStudentsCount += 1;
      }

      if (warnings.length > 0) {
        warningCount += 1;
      }

      previewRows.push({
        row: plan.row.rowNumber,
        valid: true,
        action,
        studentCode: plan.row.studentCode,
        fullName: plan.row.fullName,
        className: plan.row.className,
        cohort: plan.row.cohort,
        majorCode: plan.row.majorCode ?? null,
        effectiveEmail: plan.row.effectiveEmail,
        note: plan.row.note,
        ...(warnings.length > 0 && { warnings }),
      });
    }

    for (const err of errors) {
      previewRows.push({
        row: err.row,
        valid: false,
        studentCode: err.studentCode,
        fullName: err.fullName,
        effectiveEmail: err.effectiveEmail,
        reason: err.reason,
      });
    }

    previewRows.sort((a, b) => a.row - b.row);

    return {
      sessionId: session.id,
      totalRows: totalDataRows,
      validCount: rawPlans.length,
      errorCount: errors.length,
      warningCount,
      newAccountsCount,
      existingStudentsCount,
      alreadyEligibleCount,
      rows: previewRows,
    };
  }

  /**
   * Step 3 (Wizard): Commit validated rows using the confirmed mapping.
   * Idempotent per session: once committed, cannot be re-executed.
   */
  async commitImport(
    roundId: number,
    dto: EligibleImportMappingRequestDto,
    actorId: number,
  ): Promise<CommitEligibleImportResult> {
    const round = await this.requireRound(roundId);
    const session = this.sessions.get(dto.sessionId, roundId, actorId);

    if (session.committed) {
      throw new ConflictException(
        'Phiên import này đã được xác nhận lưu trước đó.',
      );
    }

    this.assertValidMapping(dto.mapping, dto.nameMode, session.maxCol);

    const majors = await this.prisma.major.findMany({
      select: { id: true, code: true },
    });

    const { totalDataRows, validRows, errors } =
      this.extractAndValidateRowsFromRaw(
        session.rows,
        dto.headerRowIndex,
        dto.nameMode,
        dto.mapping,
        majors,
      );

    if (totalDataRows === 0) {
      throw new BadRequestException(
        'File không chứa hàng dữ liệu sinh viên nào',
      );
    }

    const summary = await this.executeImportPipeline({
      round,
      totalDataRows,
      validRows,
      errors,
      actorId,
      auditExtra: {
        mode: 'wizard',
        headerRowIndex: dto.headerRowIndex,
        nameMode: dto.nameMode,
      },
    });

    this.sessions.markCommitted(session.id, summary);

    return {
      sessionId: session.id,
      ...summary,
    };
  }

  /**
   * Single-step import endpoint (backwards compatible).
   * Uses hybrid header + content inference automatically.
   */
  async importFile(
    roundId: number,
    file: Express.Multer.File,
    actorId?: number,
  ): Promise<ImportResultSummary> {
    const round = await this.requireRound(roundId);
    const sheet = await this.parseUploadWorkbook(file);
    const { rows, maxCol } = extractWorksheetRows(sheet);

    if (rows.length === 0) {
      throw new BadRequestException('File không chứa hàng dữ liệu');
    }

    const analysis = analyzeSheetRows(rows, maxCol);
    const mapping = toColumnMappingFromSuggestions(
      analysis.suggestions,
      analysis.nameMode,
    );

    const hasCode = mapping.studentCodeCol !== null;
    const hasName =
      analysis.nameMode === 'full'
        ? mapping.fullNameCol !== null
        : mapping.surnameCol !== null && mapping.givenNameCol !== null;

    if (!hasCode || !hasName || analysis.headerRowIndex === 0) {
      throw new BadRequestException(
        'Không tìm thấy cột bắt buộc (MSSV, Họ và tên) trong dòng tiêu đề file.',
      );
    }

    const majors = await this.prisma.major.findMany({
      select: { id: true, code: true },
    });

    const { totalDataRows, validRows, errors } =
      this.extractAndValidateRowsFromRaw(
        rows,
        analysis.headerRowIndex,
        analysis.nameMode,
        mapping,
        majors,
      );

    if (totalDataRows === 0) {
      throw new BadRequestException(
        'File không chứa hàng dữ liệu sinh viên nào',
      );
    }

    const summary = await this.executeImportPipeline({
      round,
      totalDataRows,
      validRows,
      errors,
      actorId,
    });

    return {
      totalRows: summary.totalRows,
      importedCount: summary.importedCount,
      createdAccountsCount: summary.createdAccountsCount,
      errorCount: summary.errorCount,
      errors: summary.errors,
    };
  }

  private async requireRound(roundId: number) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id: roundId },
      include: { semester: true, projectType: true },
    });

    if (!round) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    return round;
  }

  private assertValidMapping(
    mapping: EligibleColumnMapping,
    nameMode: EligibleNameMode,
    maxCol: number,
  ): void {
    if (mapping.studentCodeCol === null) {
      throw new BadRequestException('Vui lòng chọn cột tương ứng với MSSV.');
    }

    if (nameMode === 'full' && mapping.fullNameCol === null) {
      throw new BadRequestException(
        'Vui lòng chọn cột tương ứng với Họ và tên.',
      );
    }

    if (
      nameMode === 'split' &&
      (mapping.surnameCol === null || mapping.givenNameCol === null)
    ) {
      throw new BadRequestException(
        'Vui lòng chọn đầy đủ cả cột Họ / Họ đệm và cột Tên.',
      );
    }

    const activeCols: Array<{ field: string; col: number }> = [
      { field: 'MSSV', col: mapping.studentCodeCol },
    ];
    if (nameMode === 'full' && mapping.fullNameCol !== null) {
      activeCols.push({ field: 'Họ và tên', col: mapping.fullNameCol });
    } else if (nameMode === 'split') {
      if (mapping.surnameCol !== null) {
        activeCols.push({ field: 'Họ đệm', col: mapping.surnameCol });
      }
      if (mapping.givenNameCol !== null) {
        activeCols.push({ field: 'Tên', col: mapping.givenNameCol });
      }
    }
    if (mapping.classCol !== null) {
      activeCols.push({ field: 'Lớp', col: mapping.classCol });
    }
    if (mapping.emailCol !== null) {
      activeCols.push({ field: 'Email', col: mapping.emailCol });
    }
    if (mapping.noteCol !== null) {
      activeCols.push({ field: 'Ghi chú', col: mapping.noteCol });
    }

    const seenCol = new Map<number, string>();
    for (const item of activeCols) {
      if (item.col < 1 || item.col > maxCol) {
        throw new BadRequestException(
          `Cột ánh xạ cho trường "${item.field}" không tồn tại trong file.`,
        );
      }
      const prevField = seenCol.get(item.col);
      if (prevField) {
        throw new BadRequestException(
          `Trường "${item.field}" và "${prevField}" không thể dùng chung cùng một cột trong file.`,
        );
      }
      seenCol.set(item.col, item.field);
    }
  }

  private async executeImportPipeline(params: {
    round: {
      id: number;
      semester: { name: string };
      projectType: { name: string };
    };
    totalDataRows: number;
    validRows: ValidatedRow[];
    errors: Array<{ row: number; reason: string }>;
    actorId?: number;
    auditExtra?: Record<string, unknown>;
  }): Promise<EligibleImportCommitSummary> {
    const { round, totalDataRows, validRows, errors, actorId, auditExtra } =
      params;

    if (validRows.length === 0) {
      const sortedErrors = errors
        .map((e) => ({ row: e.row, reason: e.reason }))
        .sort((a, b) => a.row - b.row);
      return {
        totalRows: totalDataRows,
        importedCount: 0,
        createdAccountsCount: 0,
        updatedExistingCount: 0,
        errorCount: sortedErrors.length,
        errors: sortedErrors,
      };
    }

    const rawPlans = await this.resolveImportPlans(validRows, errors);
    const plans = await this.preparePasswordHashes(rawPlans);

    let createdAccountsCount = 0;
    let updatedExistingCount = 0;
    let importedCount = 0;
    const notifiedUserIds: number[] = [];

    await mapWithConcurrency(plans, DB_WRITE_CONCURRENCY, async (plan) => {
      try {
        const result = await this.persistStudentPlan(round.id, plan);
        importedCount += 1;
        if (result.createdAccount) {
          createdAccountsCount += 1;
        } else {
          updatedExistingCount += 1;
        }
        notifiedUserIds.push(result.userId);
      } catch (err) {
        this.logger.warn(
          `Error importing row ${plan.row.rowNumber} (${plan.row.studentCode}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        errors.push({
          row: plan.row.rowNumber,
          reason: formatPersistenceError(err, plan.row),
        });
      }
    });

    const formattedErrors = errors
      .map((e) => ({ row: e.row, reason: e.reason }))
      .sort((a, b) => a.row - b.row);

    if (actorId) {
      await recordAudit(this.prisma, {
        userId: actorId,
        action: 'ELIGIBLE_STUDENTS_IMPORTED',
        targetTable: 'round_student_eligibilities',
        targetId: round.id,
        newValue: {
          totalRows: totalDataRows,
          importedCount,
          createdAccountsCount,
          updatedExistingCount,
          errorCount: formattedErrors.length,
          ...auditExtra,
        },
      }).catch(() => undefined);
    }

    if (notifiedUserIds.length > 0) {
      const uniqueUserIds = [...new Set(notifiedUserIds)];
      await this.notifications.notify(
        uniqueUserIds.map((userId) => ({
          userId,
          type: NotificationType.STUDENT_ELIGIBILITY_CONFIRMED,
          title: 'Đủ điều kiện làm đồ án',
          content: `Tài khoản của bạn đã được xác nhận đủ điều kiện tham gia đợt đồ án ${round.projectType.name} (${round.semester.name}). Vui lòng chọn đề tài hoặc nộp đề cương M03 trước thời hạn.`,
          targetId: round.id,
          dedupeKey: `STUDENT_ELIGIBILITY_CONFIRMED:round=${round.id}:user=${userId}`,
        })),
      );
    }

    return {
      totalRows: totalDataRows,
      importedCount,
      createdAccountsCount,
      updatedExistingCount,
      errorCount: formattedErrors.length,
      errors: formattedErrors,
    };
  }

  private async parseUploadWorkbook(
    file: Express.Multer.File,
  ): Promise<ExcelJS.Worksheet> {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('File tải lên rỗng hoặc không hợp lệ');
    }

    const ext = extname(file.originalname || '').toLowerCase();
    if (!['.xlsx', '.csv'].includes(ext)) {
      throw new BadRequestException(
        'Chỉ chấp nhận file định dạng .xlsx hoặc .csv',
      );
    }

    const workbook = new ExcelJS.Workbook();

    try {
      if (ext === '.csv') {
        const csvBuffer = stripUtf8Bom(file.buffer);
        await workbook.csv.read(Readable.from(csvBuffer));
      } else {
        if (!hasZipSignature(file.buffer)) {
          throw new BadRequestException(
            'Nội dung file không đúng định dạng Excel (.xlsx)',
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await workbook.xlsx.load(file.buffer as any);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'Không thể đọc file Excel/CSV. Vui lòng kiểm tra lại định dạng file.',
      );
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 1) {
      throw new BadRequestException('File không chứa hàng dữ liệu');
    }

    return sheet;
  }

  private extractAndValidateRowsFromRaw(
    rows: RawSheetRow[],
    headerRowIndex: number,
    nameMode: EligibleNameMode,
    mapping: EligibleColumnMapping,
    majors: { id: number; code: string }[],
  ): {
    totalDataRows: number;
    validRows: ValidatedRow[];
    errors: Array<{
      row: number;
      reason: string;
      studentCode?: string;
      fullName?: string;
      effectiveEmail?: string;
    }>;
  } {
    const validRows: ValidatedRow[] = [];
    const errors: Array<{
      row: number;
      reason: string;
      studentCode?: string;
      fullName?: string;
      effectiveEmail?: string;
    }> = [];
    const seenCodes = new Map<string, number>();
    const seenEmails = new Map<string, number>();
    let totalDataRows = 0;

    const majorCodeById = new Map<number, string>();
    for (const m of majors) {
      majorCodeById.set(m.id, m.code);
    }

    for (const rawRow of rows) {
      if (rawRow.rowNumber <= headerRowIndex) continue;

      const rawCode = readMappedCell(rawRow, mapping.studentCodeCol);
      const rawName = readMappedFullName(rawRow, nameMode, mapping);
      const rawClass = readMappedCell(rawRow, mapping.classCol);
      const rawEmail = readMappedCell(rawRow, mapping.emailCol);
      const rawNote = readMappedCell(rawRow, mapping.noteCol);

      if (!rawCode && !rawName && !rawClass && !rawEmail && !rawNote) {
        continue;
      }

      totalDataRows += 1;
      if (totalDataRows > MAX_IMPORT_ROWS) {
        throw new BadRequestException(
          `File vượt quá giới hạn tối đa ${MAX_IMPORT_ROWS} dòng dữ liệu mỗi lần import.`,
        );
      }

      const studentCode = rawCode.replace(/\s+/g, '');
      const normalizedFullName = rawName.replace(/\s+/g, ' ').trim();

      if (!STUDENT_CODE_RE.test(studentCode)) {
        errors.push({
          row: rawRow.rowNumber,
          studentCode: rawCode || undefined,
          fullName: normalizedFullName || undefined,
          reason: `MSSV "${rawCode}" không hợp lệ (phải gồm đúng 7 chữ số)`,
        });
        continue;
      }

      const duplicateCodeRow = seenCodes.get(studentCode);
      if (duplicateCodeRow !== undefined) {
        errors.push({
          row: rawRow.rowNumber,
          studentCode,
          fullName: normalizedFullName || undefined,
          reason: `MSSV "${studentCode}" bị trùng với dòng ${duplicateCodeRow}`,
        });
        continue;
      }

      if (normalizedFullName.length < 2 || normalizedFullName.length > 150) {
        errors.push({
          row: rawRow.rowNumber,
          studentCode,
          fullName: normalizedFullName || undefined,
          reason:
            normalizedFullName.length === 0
              ? 'Họ và tên không được để trống'
              : 'Họ và tên phải có độ dài từ 2 đến 150 ký tự',
        });
        continue;
      }

      if (rawClass.length > 50) {
        errors.push({
          row: rawRow.rowNumber,
          studentCode,
          fullName: normalizedFullName,
          reason: 'Mã lớp vượt quá 50 ký tự',
        });
        continue;
      }

      if (rawNote.length > 500) {
        errors.push({
          row: rawRow.rowNumber,
          studentCode,
          fullName: normalizedFullName,
          reason: 'Ghi chú vượt quá 500 ký tự',
        });
        continue;
      }

      let explicitEmail: string | undefined;
      if (rawEmail) {
        const normalizedEmail = rawEmail.replace(/\s+/g, '').toLowerCase();
        if (
          normalizedEmail.length > 254 ||
          !EMAIL_SYNTAX_RE.test(normalizedEmail)
        ) {
          errors.push({
            row: rawRow.rowNumber,
            studentCode,
            fullName: normalizedFullName,
            effectiveEmail: rawEmail,
            reason: `Email "${rawEmail}" không đúng định dạng`,
          });
          continue;
        }

        const [, domain] = normalizedEmail.split('@');
        if (domain !== DLU_EMAIL_DOMAIN) {
          errors.push({
            row: rawRow.rowNumber,
            studentCode,
            fullName: normalizedFullName,
            effectiveEmail: normalizedEmail,
            reason: `Email "${rawEmail}" phải sử dụng tên miền @${DLU_EMAIL_DOMAIN} để đăng nhập Gmail DLU`,
          });
          continue;
        }

        if (!studentCodeMatchesEmail(studentCode, normalizedEmail)) {
          errors.push({
            row: rawRow.rowNumber,
            studentCode,
            fullName: normalizedFullName,
            effectiveEmail: normalizedEmail,
            reason: `Email "${normalizedEmail}" phải trùng phần đầu với MSSV "${studentCode}" (ví dụ: ${studentCode}@${DLU_EMAIL_DOMAIN})`,
          });
          continue;
        }

        explicitEmail = normalizedEmail;
      }

      const effectiveEmail =
        explicitEmail ?? `${studentCode}@${DLU_EMAIL_DOMAIN}`;

      const duplicateEmailRow = seenEmails.get(effectiveEmail);
      if (duplicateEmailRow !== undefined) {
        errors.push({
          row: rawRow.rowNumber,
          studentCode,
          fullName: normalizedFullName,
          effectiveEmail,
          reason: `Email "${effectiveEmail}" bị trùng với dòng ${duplicateEmailRow}`,
        });
        continue;
      }

      seenCodes.set(studentCode, rawRow.rowNumber);
      seenEmails.set(effectiveEmail, rawRow.rowNumber);

      const cohort = cohortFromStudentCode(studentCode)!;
      const warnings: string[] = [];
      let normalizedClass = rawClass ? rawClass.toUpperCase() : undefined;
      let majorId: number | null = null;

      if (rawClass) {
        const parsedClass = parseClassCode(rawClass.toUpperCase());
        if (parsedClass) {
          normalizedClass = parsedClass.normalised;
          majorId = resolveMajorId(parsedClass.majorSuffix, majors);
          if (parsedClass.cohort !== cohort) {
            warnings.push(
              `Lớp ${normalizedClass} thuộc khóa ${parsedClass.cohort}, khác khóa ${cohort} theo MSSV`,
            );
          }
          if (majorId === null && parsedClass.majorSuffix) {
            warnings.push(
              `Chưa khớp được chuyên ngành từ mã lớp "${normalizedClass}"`,
            );
          }
        } else {
          normalizedClass = rawClass;
          warnings.push(
            `Mã lớp "${rawClass}" chưa theo mẫu CTK{khóa}{ngành}, chưa tự xác định chuyên ngành`,
          );
        }
      }

      validRows.push({
        rowNumber: rawRow.rowNumber,
        studentCode,
        fullName: normalizedFullName,
        className: normalizedClass,
        cohort,
        majorId,
        majorCode:
          majorId !== null ? (majorCodeById.get(majorId) ?? null) : null,
        explicitEmail,
        effectiveEmail,
        note: rawNote || undefined,
        warnings,
      });
    }

    return { totalDataRows, validRows, errors };
  }

  private async resolveImportPlans(
    validRows: ValidatedRow[],
    errors: Array<{
      row: number;
      reason: string;
      studentCode?: string;
      fullName?: string;
      effectiveEmail?: string;
    }>,
  ): Promise<RawImportPlan[]> {
    const allCodes = validRows.map((r) => r.studentCode);
    const allEmails = validRows.map((r) => r.effectiveEmail);

    const [usersByEmailRaw, profilesByCodeRaw] = await Promise.all([
      this.prisma.user.findMany({
        where: { email: { in: allEmails } },
        include: {
          studentProfile: { select: { id: true, studentCode: true } },
        },
      }),
      this.prisma.studentProfile.findMany({
        where: { studentCode: { in: allCodes } },
        include: {
          user: {
            include: {
              studentProfile: { select: { id: true, studentCode: true } },
            },
          },
        },
      }),
    ]);

    const userMapByEmail = new Map<string, ExistingUserWithProfile>();
    for (const user of usersByEmailRaw ?? []) {
      userMapByEmail.set(user.email.toLowerCase(), user);
    }

    const profileMapByCode = new Map<
      string,
      { id: number; studentCode: string; user: ExistingUserWithProfile }
    >();
    for (const profile of profilesByCodeRaw ?? []) {
      profileMapByCode.set(profile.studentCode, profile);
    }

    const plans: RawImportPlan[] = [];

    for (const row of validRows) {
      const byEmail = userMapByEmail.get(row.effectiveEmail);
      const byCode = profileMapByCode.get(row.studentCode);

      if (byEmail && byEmail.role !== Role.STUDENT) {
        errors.push({
          row: row.rowNumber,
          studentCode: row.studentCode,
          fullName: row.fullName,
          effectiveEmail: row.effectiveEmail,
          reason: `Email "${row.effectiveEmail}" thuộc tài khoản Giảng viên/Giáo vụ, không thể import làm sinh viên`,
        });
        continue;
      }

      if (byCode && byCode.user.role !== Role.STUDENT) {
        errors.push({
          row: row.rowNumber,
          studentCode: row.studentCode,
          fullName: row.fullName,
          effectiveEmail: row.effectiveEmail,
          reason: `MSSV "${row.studentCode}" đang gắn với tài khoản không phải sinh viên`,
        });
        continue;
      }

      if (byCode && byEmail && byCode.user.id !== byEmail.id) {
        errors.push({
          row: row.rowNumber,
          studentCode: row.studentCode,
          fullName: row.fullName,
          effectiveEmail: row.effectiveEmail,
          reason: `MSSV "${row.studentCode}" và email "${row.effectiveEmail}" thuộc hai tài khoản khác nhau trong hệ thống`,
        });
        continue;
      }

      if (
        byEmail?.studentProfile &&
        byEmail.studentProfile.studentCode !== row.studentCode
      ) {
        errors.push({
          row: row.rowNumber,
          studentCode: row.studentCode,
          fullName: row.fullName,
          effectiveEmail: row.effectiveEmail,
          reason: `Email "${row.effectiveEmail}" đã thuộc về sinh viên có MSSV "${byEmail.studentProfile.studentCode}"`,
        });
        continue;
      }

      if (
        byCode &&
        row.explicitEmail &&
        byCode.user.email.toLowerCase() !== row.explicitEmail
      ) {
        errors.push({
          row: row.rowNumber,
          studentCode: row.studentCode,
          fullName: row.fullName,
          effectiveEmail: row.effectiveEmail,
          reason: `MSSV "${row.studentCode}" đã đăng ký với email "${byCode.user.email}"`,
        });
        continue;
      }

      const matchedUser = byCode?.user ?? byEmail ?? null;
      if (matchedUser && !matchedUser.isActive) {
        errors.push({
          row: row.rowNumber,
          studentCode: row.studentCode,
          fullName: row.fullName,
          effectiveEmail: row.effectiveEmail,
          reason: `Tài khoản "${matchedUser.email}" đang bị vô hiệu hoá, cần kích hoạt lại trước khi import`,
        });
        continue;
      }

      if (!matchedUser) {
        plans.push({ kind: 'create_user', row });
      } else if (!matchedUser.studentProfile) {
        plans.push({
          kind: 'create_profile',
          row,
          userId: matchedUser.id,
        });
      } else {
        plans.push({
          kind: 'update_student',
          row,
          userId: matchedUser.id,
          studentProfileId: matchedUser.studentProfile.id,
        });
      }
    }

    return plans;
  }

  private async preparePasswordHashes(
    rawPlans: RawImportPlan[],
  ): Promise<ImportPlan[]> {
    return mapWithConcurrency(
      rawPlans,
      PASSWORD_HASH_CONCURRENCY,
      async (plan): Promise<ImportPlan> => {
        if (plan.kind !== 'create_user') {
          return plan;
        }

        // Random high-entropy secret per student: Google DLU SSO is the sign-in
        // mechanism; no predictable default password is ever created.
        const unguessableSecret = randomBytes(32).toString('base64url');
        const passwordHash = await bcrypt.hash(unguessableSecret, 10);
        return { kind: 'create_user', row: plan.row, passwordHash };
      },
    );
  }

  private persistStudentPlan(
    roundId: number,
    plan: ImportPlan,
  ): Promise<{ userId: number; createdAccount: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      let userId: number;
      let studentProfileId: number;
      let createdAccount = false;

      if (plan.kind === 'create_user') {
        const created = await tx.user.create({
          data: {
            email: plan.row.effectiveEmail,
            password: plan.passwordHash,
            role: Role.STUDENT,
            mustChangePassword: false,
            studentProfile: {
              create: {
                studentCode: plan.row.studentCode,
                fullName: plan.row.fullName,
                class: plan.row.className,
                cohort: plan.row.cohort,
                majorId: plan.row.majorId,
                note: plan.row.note,
              },
            },
          },
          include: { studentProfile: { select: { id: true } } },
        });
        userId = created.id;
        studentProfileId = created.studentProfile!.id;
        createdAccount = true;
      } else if (plan.kind === 'create_profile') {
        const profile = await tx.studentProfile.create({
          data: {
            userId: plan.userId,
            studentCode: plan.row.studentCode,
            fullName: plan.row.fullName,
            class: plan.row.className,
            cohort: plan.row.cohort,
            majorId: plan.row.majorId,
            note: plan.row.note,
          },
          select: { id: true },
        });
        userId = plan.userId;
        studentProfileId = profile.id;
      } else {
        await tx.studentProfile.update({
          where: { id: plan.studentProfileId },
          data: {
            fullName: plan.row.fullName,
            cohort: plan.row.cohort,
            ...(plan.row.className && { class: plan.row.className }),
            ...(plan.row.majorId !== null && { majorId: plan.row.majorId }),
            ...(plan.row.note !== undefined && { note: plan.row.note }),
          },
        });
        userId = plan.userId;
        studentProfileId = plan.studentProfileId;
      }

      await tx.roundStudentEligibility.upsert({
        where: {
          roundId_studentId: {
            roundId,
            studentId: studentProfileId,
          },
        },
        create: {
          roundId,
          studentId: studentProfileId,
          note: plan.row.note,
        },
        update: {
          note: plan.row.note,
        },
      });

      return { userId, createdAccount };
    });
  }

  /**
   * Queries paginated list of eligible students for a round with filters.
   */
  async listEligible(roundId: number, query: QueryEligibleStudentsDto) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id: roundId },
      include: { semester: true, projectType: true },
    });

    if (!round) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    const where: Record<string, unknown> = {
      roundId,
      student: {
        user: { isActive: true },
        ...(query.class && {
          class: { contains: query.class, mode: 'insensitive' },
        }),
        ...(query.q && {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' } },
            { studentCode: { contains: query.q, mode: 'insensitive' } },
          ],
        }),
      },
    };

    const allEntries = await this.prisma.roundStudentEligibility.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
                avatarUrl: true,
              },
            },
            major: { select: { id: true, name: true, code: true } },
            groupMemberships: {
              where: {
                semesterId: round.semesterId,
                status: GroupMemberStatus.ACCEPTED,
                group: { status: { not: RegistrationGroupStatus.REJECTED } },
              },
              include: {
                group: {
                  include: {
                    topic: {
                      include: {
                        lecturer: {
                          select: {
                            id: true,
                            fullName: true,
                            academicTitle: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { student: { studentCode: 'asc' } },
    });

    const mapped = allEntries.map((entry) => {
      const activeMembership = entry.student.groupMemberships[0];
      const group = activeMembership?.group ?? null;

      return {
        id: entry.id,
        roundId: entry.roundId,
        studentId: entry.studentId,
        studentCode: entry.student.studentCode,
        fullName: entry.student.fullName,
        class: entry.student.class,
        cohort: entry.student.cohort,
        major: entry.student.major,
        email: entry.student.user.email,
        isActive: entry.student.user.isActive,
        avatarUrl: entry.student.user.avatarUrl,
        note: entry.note,
        createdAt: entry.createdAt,
        hasGroup: group !== null,
        group: group
          ? {
              id: group.id,
              name: group.name,
              topic: group.topic
                ? {
                    id: group.topic.id,
                    title: group.topic.title,
                    lecturer: group.topic.lecturer,
                  }
                : null,
            }
          : null,
      };
    });

    const withGroupCount = mapped.filter((s) => s.hasGroup).length;
    const withoutGroupCount = mapped.length - withGroupCount;

    let filtered = mapped;
    if (query.hasGroup !== undefined) {
      filtered = mapped.filter((s) => s.hasGroup === query.hasGroup);
    }

    const paginated = filtered.slice(
      (query.page - 1) * query.limit,
      query.page * query.limit,
    );

    return {
      round: {
        id: round.id,
        semesterId: round.semesterId,
        semesterName: round.semester.name,
        projectTypeId: round.projectTypeId,
        projectTypeName: round.projectType.name,
      },
      items: paginated,
      total: filtered.length,
      totalEligible: mapped.length,
      withGroupCount,
      withoutGroupCount,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(filtered.length / query.limit) || 1,
    };
  }

  /**
   * Removes a student from a round's eligible list.
   * Prevents removal if student has already joined an active group in the round.
   */
  async removeEligible(roundId: number, studentId: number, actorId?: number) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id: roundId },
    });
    if (!round) throw new NotFoundException('Không tìm thấy đợt đăng ký');

    const membership = await this.prisma.registrationGroupMember.findFirst({
      where: {
        studentId,
        semesterId: round.semesterId,
        status: GroupMemberStatus.ACCEPTED,
        group: {
          topic: { roundId },
          status: { not: RegistrationGroupStatus.REJECTED },
        },
      },
    });

    if (membership) {
      throw new ConflictException(
        'Sinh viên đã tham gia nhóm đề tài trong đợt này. Cần hủy phân nhóm trước khi xóa khỏi danh sách đủ điều kiện.',
      );
    }

    const res = await this.prisma.roundStudentEligibility.deleteMany({
      where: { roundId, studentId },
    });

    if (res.count === 0) {
      throw new NotFoundException(
        'Sinh viên không nằm trong danh sách đợt này',
      );
    }

    if (actorId) {
      await recordAudit(this.prisma, {
        userId: actorId,
        action: 'ELIGIBLE_STUDENT_REMOVED',
        targetTable: 'round_student_eligibilities',
        targetId: roundId,
        oldValue: { studentId },
      }).catch(() => undefined);
    }

    return { message: 'Đã xóa sinh viên khỏi danh sách đủ điều kiện' };
  }

  /**
   * Retrieves per-round eligibility status and banners for a logged-in student.
   */
  async getStudentEligibilityStatus(userId: number) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true } },
      },
    });

    if (!student) {
      return {
        isEligible: false,
        message: 'Tài khoản không phải là sinh viên.',
        rounds: [],
      };
    }

    const activeSemester = await this.prisma.semester.findFirst({
      where: { isActive: true },
    });

    if (!activeSemester) {
      return {
        isEligible: false,
        message: 'Hiện không có học kỳ nào đang mở.',
        rounds: [],
      };
    }

    const specificEligibilities =
      await this.prisma.roundStudentEligibility.findMany({
        where: {
          studentId: student.id,
          round: { semesterId: activeSemester.id },
        },
        include: {
          round: {
            include: {
              projectType: true,
              semester: true,
              requirements: {
                where: { name: { contains: 'Đề cương', mode: 'insensitive' } },
              },
            },
          },
        },
      });

    const roundMap = new Map<
      number,
      {
        roundId: number;
        projectTypeId: number;
        projectTypeName: string;
        semesterName: string;
        deadline: Date | null;
        note: string | null;
      }
    >();

    for (const entry of specificEligibilities) {
      roundMap.set(entry.round.id, {
        roundId: entry.round.id,
        projectTypeId: entry.round.projectTypeId,
        projectTypeName: entry.round.projectType.name,
        semesterName: entry.round.semester.name,
        deadline: entry.round.requirements[0]?.dueAt ?? null,
        note: entry.note,
      });
    }

    if (student.cohort) {
      const cohortRounds =
        (await this.prisma.registrationRound.findMany({
          where: {
            semesterId: activeSemester.id,
            eligibilities: { some: { cohort: student.cohort } },
          },
          include: {
            projectType: true,
            semester: true,
            requirements: {
              where: { name: { contains: 'Đề cương', mode: 'insensitive' } },
            },
            _count: { select: { eligibleStudents: true } },
          },
        })) ?? [];

      for (const r of cohortRounds) {
        if (roundMap.has(r.id)) continue;
        // Handle both direct _count relation and mocked test specs gracefully
        const rosterCount = r._count?.eligibleStudents ?? 0;
        if (rosterCount === 0) {
          roundMap.set(r.id, {
            roundId: r.id,
            projectTypeId: r.projectTypeId,
            projectTypeName: r.projectType.name,
            semesterName: r.semester.name,
            deadline: r.requirements[0]?.dueAt ?? null,
            note: null,
          });
        }
      }
    }

    const rounds = [...roundMap.values()];
    if (rounds.length > 0) {
      return {
        isEligible: true,
        specific: specificEligibilities.length > 0,
        message: `Tài khoản của bạn đủ điều kiện đăng ký đồ án học kỳ ${activeSemester.name}. Vui lòng chọn đề tài hoặc nộp đề cương M03 trước thời hạn.`,
        rounds,
      };
    }

    return {
      isEligible: false,
      specific: false,
      message: `Tài khoản của bạn chưa nằm trong danh sách đủ điều kiện làm đồ án học kỳ ${activeSemester.name}. Vui lòng liên hệ Giáo vụ Khoa nếu có thắc mắc.`,
      rounds: [],
    };
  }
}

function readMappedCell(rawRow: RawSheetRow, colNumber: number | null): string {
  if (colNumber === null) return '';
  return (rawRow.cells[colNumber] ?? '').trim();
}

function readMappedFullName(
  rawRow: RawSheetRow,
  nameMode: EligibleNameMode,
  mapping: EligibleColumnMapping,
): string {
  if (nameMode === 'full') {
    return readMappedCell(rawRow, mapping.fullNameCol);
  }
  const surname = readMappedCell(rawRow, mapping.surnameCol);
  const givenName = readMappedCell(rawRow, mapping.givenNameCol);
  return [surname, givenName].filter(Boolean).join(' ');
}

function hasZipSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05)
  );
}

function stripUtf8Bom(buffer: Buffer): Buffer {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.subarray(3);
  }
  return buffer;
}

function resolveMajorId(
  majorSuffix: string,
  majors: { id: number; code: string }[],
): number | null {
  const suffix = majorSuffix.trim().toUpperCase();
  if (!suffix) return null;

  const exact = majors.find((m) => m.code.toUpperCase() === suffix);
  if (exact) return exact.id;

  if (suffix === 'PM' || suffix === 'CNPM' || suffix === 'KTPM') {
    const cnpm = majors.find((m) => {
      const code = m.code.toUpperCase();
      return code === 'CNPM' || code === 'KTPM';
    });
    if (cnpm) return cnpm.id;
  }

  if (suffix.length >= 2) {
    const partial = majors.find((m) => {
      const code = m.code.toUpperCase();
      return code.endsWith(suffix) || suffix.endsWith(code);
    });
    if (partial) return partial.id;
  }

  return null;
}

function formatPersistenceError(err: unknown, row: ValidatedRow): string {
  if (isUniqueViolation(err)) {
    const fields = uniqueConstraintFields(err);
    if (fields.some((f) => f.includes('email'))) {
      return `Email "${row.effectiveEmail}" đã tồn tại trong hệ thống`;
    }
    if (fields.some((f) => f.includes('student'))) {
      return `MSSV "${row.studentCode}" đã tồn tại trong hệ thống`;
    }
    return 'Dữ liệu bị trùng lặp với tài khoản khác trong hệ thống';
  }
  return err instanceof Error ? err.message : 'Lỗi hệ thống khi lưu';
}
