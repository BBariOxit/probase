import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { formatDate } from '../../common/utils/named-day.util';
import { ReportsService, type FacultyReport } from './reports.service';

const PHASE_LABEL: Record<string, string> = {
  PREP: 'Chưa mở',
  OPEN: 'Đang mở',
  RECONCILING: 'Đang phân bổ',
  EXTENDED: 'Đang gia hạn',
  FINALIZED: 'Đã chốt',
};

@Injectable()
export class ReportsExportService {
  constructor(private readonly reports: ReportsService) {}

  async workbook(semesterId?: number, roundId?: number): Promise<Buffer> {
    const report = await this.reports.summary(semesterId, roundId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ProBase';
    workbook.created = new Date();

    this.roundsSheet(workbook, report);
    this.supervisionSheet(workbook, report);
    this.majorsSheet(workbook, report);
    this.outlinesSheet(workbook, report);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private roundsSheet(workbook: ExcelJS.Workbook, report: FacultyReport) {
    const sheet = workbook.addWorksheet('Đợt đăng ký');

    sheet.columns = [
      { header: 'Đợt đồ án', key: 'projectType', width: 26 },
      { header: 'Trạng thái', key: 'phase', width: 15 },
      { header: 'Khóa', key: 'cohorts', width: 14 },
      { header: 'Mở ĐK', key: 'regStart', width: 13 },
      { header: 'Đóng ĐK', key: 'regEnd', width: 13 },
      { header: 'Hạn M03', key: 'outlineDue', width: 13 },
      { header: 'SV đủ ĐK', key: 'eligible', width: 11 },
      { header: 'Có nhóm', key: 'withGroup', width: 11 },
      { header: 'Chưa có', key: 'withoutGroup', width: 11 },
      { header: 'Tự ĐK', key: 'selfRegistered', width: 10 },
      { header: 'Khoa xếp', key: 'assigned', width: 10 },
      { header: 'Số nhóm', key: 'groups', width: 10 },
      { header: 'Nhóm 1 SV', key: 'size1', width: 11 },
      { header: 'Nhóm 2 SV', key: 'size2', width: 11 },
      { header: 'Nhóm 3+ SV', key: 'size3Plus', width: 12 },
      { header: 'Đề tài khả dụng', key: 'topicsUsable', width: 16 },
      { header: 'Chờ duyệt', key: 'topicsPending', width: 11 },
      { header: 'Tổng chỗ', key: 'seatCapacity', width: 11 },
      { header: 'Chênh lệch chỗ', key: 'seatBalance', width: 15 },
    ];

    for (const row of report.rounds) {
      sheet.addRow({
        projectType: row.projectType.name,
        phase: PHASE_LABEL[row.phase] ?? row.phase,
        cohorts: row.cohorts.join(', '),
        regStart: formatDate(row.registrationStart),
        regEnd: formatDate(row.registrationEnd),
        outlineDue: row.outlineDeadline ? formatDate(row.outlineDeadline) : '—',
        eligible: row.eligible,
        withGroup: row.withGroup,
        withoutGroup: row.withoutGroup,
        selfRegistered: row.selfRegistered,
        assigned: row.assigned,
        groups: row.groups.total,
        size1: row.groups.size1,
        size2: row.groups.size2,
        size3Plus: row.groups.size3Plus,
        topicsUsable: row.topics.usable,
        topicsPending: row.topics.pending,
        seatCapacity: row.topics.seatCapacity,
        seatBalance: row.topics.seatBalance,
      });
    }

    styleHeader(sheet);
  }

  private supervisionSheet(workbook: ExcelJS.Workbook, report: FacultyReport) {
    const sheet = workbook.addWorksheet('Giảng viên');

    sheet.columns = [
      { header: 'Mã GV', key: 'code', width: 14 },
      { header: 'Giảng viên', key: 'name', width: 28 },
      { header: 'Tổ CM', key: 'major', width: 10 },
      { header: 'Chỉ tiêu ĐT', key: 'target', width: 13 },
      { header: 'ĐT khả dụng', key: 'topicsUsable', width: 13 },
      { header: 'ĐT chờ duyệt', key: 'topicsPending', width: 13 },
      { header: 'Số nhóm', key: 'groups', width: 10 },
      { header: 'Số SV', key: 'students', width: 10 },
      { header: 'TB SV/nhóm', key: 'avgSize', width: 12 },
      { header: 'M03 đã duyệt', key: 'outlinesApproved', width: 14 },
      { header: 'M03 chờ duyệt', key: 'outlinesPending', width: 14 },
    ];

    for (const row of report.supervision) {
      sheet.addRow({
        code: row.lecturerCode,
        name: row.academicTitle
          ? `${row.academicTitle} ${row.fullName}`
          : row.fullName,
        major: row.majorCode ?? '—',
        target: row.isExempt
          ? 'Miễn giảm'
          : row.targetTopicQuota !== null
            ? row.targetTopicQuota
            : '—',
        topicsUsable: row.topicsUsable,
        topicsPending: row.topicsPending,
        groups: row.groups,
        students: row.students,
        avgSize: row.avgStudentsPerGroup,
        outlinesApproved: row.outlinesApproved,
        outlinesPending: row.outlinesPending,
      });
    }

    styleHeader(sheet);
  }

  private majorsSheet(workbook: ExcelJS.Workbook, report: FacultyReport) {
    const sheet = workbook.addWorksheet('Chuyên ngành');

    sheet.columns = [
      { header: 'Chuyên ngành', key: 'name', width: 32 },
      { header: 'Mã', key: 'code', width: 10 },
      { header: 'SV đủ ĐK', key: 'eligible', width: 12 },
      { header: 'Có nhóm', key: 'withGroup', width: 12 },
      { header: 'Chưa có', key: 'withoutGroup', width: 12 },
      { header: 'Số nhóm', key: 'groups', width: 11 },
      { header: 'Đề tài khả dụng', key: 'topics', width: 16 },
      { header: 'Tổng chỗ', key: 'seats', width: 12 },
      { header: 'Chênh lệch chỗ', key: 'balance', width: 15 },
    ];

    for (const row of report.majors) {
      sheet.addRow({
        name: row.name,
        code: row.code,
        eligible: row.eligibleStudents,
        withGroup: row.withGroup,
        withoutGroup: row.withoutGroup,
        groups: row.groups,
        topics: row.usableTopics,
        seats: row.seatCapacity,
        balance: row.seatBalance,
      });
    }

    styleHeader(sheet);
  }

  private outlinesSheet(workbook: ExcelJS.Workbook, report: FacultyReport) {
    const sheet = workbook.addWorksheet('Đề cương M03 & Lưu trữ');

    sheet.columns = [
      { header: 'Đợt đồ án', key: 'projectType', width: 26 },
      { header: 'Hạn nộp M03', key: 'outlineDue', width: 14 },
      { header: 'Tổng nhóm', key: 'totalGroups', width: 12 },
      { header: 'M03 đã duyệt', key: 'approved', width: 14 },
      { header: 'M03 chờ GV duyệt', key: 'pendingReview', width: 17 },
      { header: 'M03 cần sửa', key: 'needsRevision', width: 14 },
      { header: 'M03 chưa nộp', key: 'notSubmitted', width: 14 },
      { header: 'Lưu trữ đã duyệt', key: 'archVerified', width: 17 },
      { header: 'Lưu trữ chờ duyệt', key: 'archPending', width: 18 },
    ];

    for (const row of report.rounds) {
      sheet.addRow({
        projectType: row.projectType.name,
        outlineDue: row.outlineDeadline ? formatDate(row.outlineDeadline) : '—',
        totalGroups: row.outlines.totalGroups,
        approved: row.outlines.approved,
        pendingReview: row.outlines.pendingReview,
        needsRevision: row.outlines.needsRevision,
        notSubmitted: row.outlines.notSubmitted,
        archVerified: row.archives.verified,
        archPending: row.archives.pendingVerify,
      });
    }

    styleHeader(sheet);
  }
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}
