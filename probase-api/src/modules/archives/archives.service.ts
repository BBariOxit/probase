import { Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Prisma, TopicStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { QueryArchivesDto } from './dto/query-archives.dto';

@Injectable()
export class ArchivesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryArchivesDto) {
    const { semesterId, projectTypeId, majorId, status, verified, q, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const andConditions: Prisma.TopicWhereInput[] = [];

    if (semesterId) {
      andConditions.push({ semesterId });
    }

    if (projectTypeId) {
      andConditions.push({ round: { projectTypeId } });
    }

    if (majorId) {
      andConditions.push({ majorId });
    }

    if (status && status !== 'ALL') {
      andConditions.push({ status: status as TopicStatus });
    }

    if (verified !== undefined) {
      if (verified) {
        andConditions.push({
          registrationGroups: {
            some: {
              archive: { isVerifiedByAcademic: true },
            },
          },
        });
      } else {
        andConditions.push({
          OR: [
            {
              registrationGroups: {
                none: {
                  archive: { isVerifiedByAcademic: true },
                },
              },
            },
          ],
        });
      }
    }

    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { titleVi: { contains: q, mode: 'insensitive' } },
          { titleEn: { contains: q, mode: 'insensitive' } },
          { lecturer: { fullName: { contains: q, mode: 'insensitive' } } },
          {
            registrationGroups: {
              some: {
                members: {
                  some: {
                    student: {
                      OR: [
                        { fullName: { contains: q, mode: 'insensitive' } },
                        { studentCode: { contains: q, mode: 'insensitive' } },
                        { class: { contains: q, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.TopicWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const [items, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ semesterId: 'desc' }, { id: 'desc' }],
        include: {
          major: { select: { id: true, name: true, code: true } },
          semester: { select: { id: true, name: true, code: true } },
          round: {
            select: {
              id: true,
              projectType: { select: { id: true, name: true, code: true } },
            },
          },
          lecturer: {
            select: {
              id: true,
              fullName: true,
              academicTitle: true,
              lecturerCode: true,
            },
          },
          registrationGroups: {
            where: { status: { not: 'REJECTED' } },
            select: {
              id: true,
              name: true,
              status: true,
              leader: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                  class: true,
                },
              },
              members: {
                where: { status: 'ACCEPTED' },
                select: {
                  id: true,
                  status: true,
                  mentorGrade: true,
                  mentorComment: true,
                  student: {
                    select: {
                      id: true,
                      fullName: true,
                      studentCode: true,
                      class: true,
                    },
                  },
                },
              },
              outline: {
                select: {
                  id: true,
                  status: true,
                  attachmentUrl: true,
                  fileName: true,
                  fileSize: true,
                  approvedAt: true,
                },
              },
              archive: true,
              studentGrades: {
                select: {
                  id: true,
                  studentId: true,
                  progress1Grade: true,
                  progress2Grade: true,
                  defenseGrade: true,
                  finalGradeNum: true,
                  finalGradeLetter: true,
                  note: true,
                  isLocked: true,
                },
              },
              councilTopic: {
                select: {
                  id: true,
                  minuteNotes: true,
                  reviewer: {
                    select: {
                      id: true,
                      fullName: true,
                      academicTitle: true,
                    },
                  },
                  grades: {
                    select: {
                      studentId: true,
                      councilGrade: true,
                      reviewerGrade: true,
                      finalGrade: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.topic.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: number) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        major: true,
        semester: true,
        round: {
          include: {
            projectType: true,
          },
        },
        lecturer: true,
        departmentReviewer: {
          select: { id: true, fullName: true, academicTitle: true },
        },
        registrationGroups: {
          include: {
            leader: true,
            members: {
              include: {
                student: true,
              },
            },
            outline: true,
            archive: true,
            studentGrades: {
              include: {
                student: true,
              },
            },
            councilTopic: {
              include: {
                reviewer: true,
                grades: true,
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Không tìm thấy đề tài #${id}`);
    }

    return topic;
  }

  async verifyArchive(archiveId: number, isVerified: boolean) {
    const existing = await this.prisma.topicArchive.findUnique({
      where: { id: archiveId },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy bản lưu trữ #${archiveId}`);
    }

    return this.prisma.topicArchive.update({
      where: { id: archiveId },
      data: {
        isVerifiedByAcademic: isVerified,
        archivedAt: isVerified ? new Date() : existing.archivedAt,
      },
    });
  }

  async exportExcel(query: QueryArchivesDto) {
    const { items } = await this.findAll({ ...query, page: 1, limit: 1000 });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ProBase Archive System';
    wb.created = new Date();

    const ws = wb.addWorksheet('Danh_sach_luu_tru');

    ws.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã đề tài', key: 'id', width: 12 },
      { header: 'Tên đề tài', key: 'title', width: 40 },
      { header: 'Chuyên ngành', key: 'major', width: 16 },
      { header: 'Loại đồ án', key: 'projectType', width: 22 },
      { header: 'Học kỳ', key: 'semester', width: 18 },
      { header: 'GV Hướng dẫn', key: 'lecturer', width: 24 },
      { header: 'GVPB', key: 'reviewer', width: 24 },
      { header: 'Sinh viên thực hiện', key: 'students', width: 35 },
      { header: 'Điểm TK (Hệ 10)', key: 'grades', width: 18 },
      { header: 'Điểm chữ', key: 'letters', width: 14 },
      { header: 'Đề cương M03', key: 'outline', width: 16 },
      { header: 'Báo cáo luận văn (PDF)', key: 'thesis', width: 35 },
      { header: 'Mã nguồn (Source code)', key: 'source', width: 35 },
      { header: 'Cơ sở dữ liệu (DB script)', key: 'db', width: 35 },
      { header: 'Nghiệm thu lưu trữ', key: 'verified', width: 20 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 26;

    items.forEach((topic, idx) => {
      const activeGroup = topic.registrationGroups[0];
      const members = activeGroup?.members ?? [];
      const studentTexts = members
        .map((m) => `${m.student.fullName} (${m.student.studentCode} - ${m.student.class || 'N/A'})`)
        .join('\n');

      const gradesMap = new Map(
        activeGroup?.studentGrades?.map((g) => [g.studentId, g]) ?? [],
      );

      const gradeTexts = members
        .map((m) => {
          const g = gradesMap.get(m.student.id);
          return g?.finalGradeNum !== null && g?.finalGradeNum !== undefined
            ? `${g.finalGradeNum}`
            : (m.mentorGrade ? `${m.mentorGrade}` : 'Chưa có');
        })
        .join('\n');

      const letterTexts = members
        .map((m) => {
          const g = gradesMap.get(m.student.id);
          return g?.finalGradeLetter || '-';
        })
        .join('\n');

      const archive = activeGroup?.archive;
      const council = activeGroup?.councilTopic;
      const reviewerName = council?.reviewer
        ? `${council.reviewer.academicTitle ? council.reviewer.academicTitle + ' ' : ''}${council.reviewer.fullName}`
        : 'Chưa phân công';

      const lecturerName = topic.lecturer
        ? `${topic.lecturer.academicTitle ? topic.lecturer.academicTitle + ' ' : ''}${topic.lecturer.fullName}`
        : 'Chưa có';

      const row = ws.addRow({
        stt: idx + 1,
        id: `PB-${topic.id}`,
        title: topic.title,
        major: topic.major?.name || 'Chung',
        projectType: topic.round?.projectType?.name || 'N/A',
        semester: topic.semester?.name || 'N/A',
        lecturer: lecturerName,
        reviewer: reviewerName,
        students: studentTexts || 'Chưa có sinh viên',
        grades: gradeTexts || '-',
        letters: letterTexts || '-',
        outline: activeGroup?.outline?.attachmentUrl ? 'Đã nộp M03' : 'Chưa nộp',
        thesis: archive?.thesisUrl || 'Chưa nộp',
        source: archive?.sourceUrl || 'Chưa nộp',
        db: archive?.databaseUrl || 'Chưa nộp',
        verified: archive?.isVerifiedByAcademic ? 'Đã nghiệm thu' : 'Chưa nghiệm thu',
      });

      row.alignment = { vertical: 'middle', wrapText: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(16).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    return wb.xlsx.writeBuffer();
  }
}
