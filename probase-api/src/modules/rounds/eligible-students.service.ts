import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import {
  GroupMemberStatus,
  NotificationType,
  RegistrationGroupStatus,
  Role,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { parseClassCode } from '../users/class-code.util';
import { cohortFromStudentCode } from '../users/student-code.util';
import { QueryEligibleStudentsDto } from './dto/query-eligible-students.dto';

interface ParsedRow {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  className?: string;
  email?: string;
  note?: string;
}

export interface ImportResultSummary {
  totalRows: number;
  importedCount: number;
  createdAccountsCount: number;
  errorCount: number;
  errors: { row: number; reason: string }[];
}

@Injectable()
export class EligibleStudentsService {
  private readonly logger = new Logger(EligibleStudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Generates a standard Excel template for eligible students import.
   */
  async getTemplate(roundId?: number): Promise<Buffer> {
    let roundLabel = 'DLU';
    if (roundId) {
      const round = await this.prisma.registrationRound.findUnique({
        where: { id: roundId },
        include: { semester: true, projectType: true },
      });
      if (round) {
        roundLabel = `${round.projectType.name} - ${round.semester.name}`;
      }
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
      fgColor: { argb: 'FF1E40AF' }, // Blue 800
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Sample data rows
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
   * Imports eligible students from Excel/CSV for a specific registration round.
   * Auto-creates user & student profile if missing (2-in-1 workflow).
   */
  async importFile(
    roundId: number,
    file: Express.Multer.File,
  ): Promise<ImportResultSummary> {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id: roundId },
      include: { semester: true, projectType: true },
    });

    if (!round) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    const ext = file.originalname
      .slice(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    if (!['.xlsx', '.csv'].includes(ext)) {
      throw new BadRequestException(
        'Chỉ chấp nhận file định dạng .xlsx hoặc .csv',
      );
    }

    const workbook = new ExcelJS.Workbook();
    if (ext === '.csv') {
      await workbook.csv.read(Readable.from(file.buffer));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await workbook.xlsx.load(file.buffer as any);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      throw new BadRequestException('File không chứa hàng dữ liệu');
    }

    // Determine header indices
    const headerRow = sheet.getRow(1);
    let mssvCol = 1;
    let nameCol = 2;
    let classCol = 3;
    let emailCol = 4;
    let noteCol = 5;

    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '')
        .trim()
        .toLowerCase();
      if (
        val.includes('mssv') ||
        val.includes('mã sv') ||
        val.includes('ma_sv') ||
        val.includes('student')
      ) {
        mssvCol = colNumber;
      } else if (
        val.includes('họ') ||
        val.includes('tên') ||
        val.includes('name')
      ) {
        nameCol = colNumber;
      } else if (val.includes('lớp') || val.includes('class')) {
        classCol = colNumber;
      } else if (val.includes('email') || val.includes('mail')) {
        emailCol = colNumber;
      } else if (val.includes('ghi chú') || val.includes('note')) {
        noteCol = colNumber;
      }
    });

    const parsedRows: ParsedRow[] = [];
    const errors: { row: number; reason: string }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rawCode = cellToString(row.getCell(mssvCol).value).trim();
      const rawName = cellToString(row.getCell(nameCol).value).trim();
      const rawClass = cellToString(row.getCell(classCol).value).trim();
      const rawEmail = cellToString(row.getCell(emailCol).value).trim();
      const rawNote = cellToString(row.getCell(noteCol).value).trim();

      if (!rawCode && !rawName) return; // Skip blank line

      if (!/^\d{7}$/.test(rawCode)) {
        errors.push({
          row: rowNumber,
          reason: `MSSV "${rawCode}" không hợp lệ (phải là dãy 7 chữ số)`,
        });
        return;
      }

      if (!rawName) {
        errors.push({
          row: rowNumber,
          reason: `Họ tên không được để trống`,
        });
        return;
      }

      parsedRows.push({
        rowNumber,
        studentCode: rawCode,
        fullName: rawName,
        className: rawClass || undefined,
        email: rawEmail || `${rawCode}@dlu.edu.vn`,
        note: rawNote || undefined,
      });
    });

    if (parsedRows.length === 0 && errors.length > 0) {
      return {
        totalRows: errors.length,
        importedCount: 0,
        createdAccountsCount: 0,
        errorCount: errors.length,
        errors,
      };
    }

    // Majors lookup
    const majors = await this.prisma.major.findMany();
    const cnpmMajor = majors.find((m) => m.code === 'CNPM' || m.code === 'KTPM');
    const mmtMajor = majors.find((m) => m.code === 'MMT');

    let createdAccountsCount = 0;
    let importedCount = 0;
    const notifiedUserIds: number[] = [];

    for (const row of parsedRows) {
      try {
        const studentCode = row.studentCode;
        const email = row.email?.toLowerCase() ?? `${studentCode}@dlu.edu.vn`;

        // Check if user exists
        let user = await this.prisma.user.findFirst({
          where: {
            OR: [{ email }, { studentProfile: { studentCode } }],
          },
          include: { studentProfile: true },
        });

        // Determine cohort & major from class code or student code
        const cohort = cohortFromStudentCode(studentCode) ?? '2022';
        let majorId: number | null = null;
        let normalizedClass = row.className;

        if (row.className) {
          const parsed = parseClassCode(row.className);
          if (parsed) {
            normalizedClass = parsed.normalised;
            if (parsed.majorSuffix.includes('PM')) {
              majorId = cnpmMajor?.id ?? null;
            } else if (parsed.majorSuffix.includes('MMT')) {
              majorId = mmtMajor?.id ?? null;
            }
          }
        }

        let studentProfileId: number;

        if (!user) {
          // Auto-create user and student profile
          const defaultPassword = `Dlu@${studentCode}`;
          const passwordHash = await bcrypt.hash(defaultPassword, 10);

          user = await this.prisma.user.create({
            data: {
              email,
              password: passwordHash,
              role: Role.STUDENT,
              mustChangePassword: true,
              studentProfile: {
                create: {
                  studentCode,
                  fullName: row.fullName,
                  class: normalizedClass,
                  cohort,
                  majorId,
                  note: row.note,
                },
              },
            },
            include: { studentProfile: true },
          });

          studentProfileId = user.studentProfile!.id;
          createdAccountsCount++;
        } else {
          // User exists, ensure student profile exists and is updated
          if (!user.studentProfile) {
            const profile = await this.prisma.studentProfile.create({
              data: {
                userId: user.id,
                studentCode,
                fullName: row.fullName,
                class: normalizedClass,
                cohort,
                majorId,
                note: row.note,
              },
            });
            studentProfileId = profile.id;
          } else {
            studentProfileId = user.studentProfile.id;
            // Update profile with newest class or name if changed
            await this.prisma.studentProfile.update({
              where: { id: studentProfileId },
              data: {
                fullName: row.fullName,
                ...(normalizedClass && { class: normalizedClass }),
                ...(row.note && { note: row.note }),
              },
            });
          }
        }

        // Upsert into RoundStudentEligibility
        await this.prisma.roundStudentEligibility.upsert({
          where: {
            roundId_studentId: {
              roundId,
              studentId: studentProfileId,
            },
          },
          create: {
            roundId,
            studentId: studentProfileId,
            note: row.note,
          },
          update: {
            note: row.note,
          },
        });

        importedCount++;
        notifiedUserIds.push(user.id);
      } catch (err) {
        this.logger.error(`Error processing row ${row.rowNumber}: ${err}`);
        errors.push({
          row: row.rowNumber,
          reason: err instanceof Error ? err.message : 'Lỗi hệ thống khi lưu',
        });
      }
    }

    // Send notifications in batch
    if (notifiedUserIds.length > 0) {
      const uniqueUserIds = [...new Set(notifiedUserIds)];
      await this.notifications.notify(
        uniqueUserIds.map((userId) => ({
          userId,
          type: NotificationType.STUDENT_ELIGIBILITY_CONFIRMED,
          title: 'Đủ điều kiện làm đồ án',
          content: `Tài khoản của bạn đã được xác nhận đủ điều kiện tham gia đợt đồ án ${round.projectType.name} (${round.semester.name}). Vui lòng chọn đề tài hoặc nộp đề cương M03 trước thời hạn.`,
          targetId: round.id,
        })),
      );
    }

    return {
      totalRows: parsedRows.length + errors.length,
      importedCount,
      createdAccountsCount,
      errorCount: errors.length,
      errors,
    };
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

    const where: any = {
      roundId,
      ...(query.class && {
        student: {
          class: { contains: query.class, mode: 'insensitive' },
        },
      }),
      ...(query.q && {
        student: {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' } },
            { studentCode: { contains: query.q, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [allEntries, total] = await Promise.all([
      this.prisma.roundStudentEligibility.findMany({
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
      }),
      this.prisma.roundStudentEligibility.count({ where }),
    ]);

    // Map rows and attach group status
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

    // Compute stats
    const withGroupCount = mapped.filter((s) => s.hasGroup).length;
    const withoutGroupCount = mapped.length - withGroupCount;

    // Apply hasGroup filter if specified
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
   * Prevents removal if student has already joined an approved group.
   */
  async removeEligible(roundId: number, studentId: number) {
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

    return { message: 'Đã xóa sinh viên khỏi danh sách đủ điều kiện' };
  }

  /**
   * Retrieves eligibility status and banners for a logged-in student.
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

    // Active semester
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

    // Check specific eligibility in current semester
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

    if (specificEligibilities.length > 0) {
      const rounds = specificEligibilities.map((e) => ({
        roundId: e.round.id,
        projectTypeId: e.round.projectTypeId,
        projectTypeName: e.round.projectType.name,
        semesterName: e.round.semester.name,
        deadline: e.round.requirements[0]?.dueAt ?? null,
        note: e.note,
      }));

      return {
        isEligible: true,
        specific: true,
        message: `Tài khoản của bạn đủ điều kiện đăng ký đồ án học kỳ ${activeSemester.name}. Vui lòng chọn đề tài hoặc nộp đề cương M03 trước thời hạn.`,
        rounds,
      };
    }

    // Fallback check cohort rule
    if (student.cohort) {
      const cohortRounds = await this.prisma.registrationRound.findMany({
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
        },
      });

      // If this round has NO specific student roster imported at all, allow cohort rule
      const allowedCohortRounds = [];
      for (const r of cohortRounds) {
        const rosterCount = await this.prisma.roundStudentEligibility.count({
          where: { roundId: r.id },
        });
        if (rosterCount === 0) {
          allowedCohortRounds.push(r);
        }
      }

      if (allowedCohortRounds.length > 0) {
        return {
          isEligible: true,
          specific: false,
          message: `Tài khoản của bạn đủ điều kiện tham gia đợt đồ án theo khóa ${student.cohort}. Vui lòng chọn đề tài trước thời hạn.`,
          rounds: allowedCohortRounds.map((r) => ({
            roundId: r.id,
            projectTypeId: r.projectTypeId,
            projectTypeName: r.projectType.name,
            semesterName: r.semester.name,
            deadline: r.requirements[0]?.dueAt ?? null,
            note: null,
          })),
        };
      }
    }

    return {
      isEligible: false,
      specific: false,
      message: `Tài khoản của bạn chưa nằm trong danh sách đủ điều kiện làm đồ án học kỳ ${activeSemester.name}. Vui lòng liên hệ Giáo vụ Khoa nếu có thắc mắc.`,
      rounds: [],
    };
  }
}

function cellToString(val: ExcelJS.CellValue): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if ('richText' in val) {
      return (val as any).richText.map((t: any) => t.text).join('');
    }
    if ('text' in val) {
      return String((val as any).text);
    }
  }
  return String(val);
}
