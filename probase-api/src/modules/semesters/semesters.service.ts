import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { recordAudit } from '../../core/audit/audit-entry';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundsService } from '../rounds/rounds.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { buildSemester, getDefaultSemesterDates } from './semester-utils';

@Injectable()
export class SemestersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rounds: RoundsService,
  ) {}

  findAll() {
    return this.prisma.semester.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { rounds: true, topics: true, registrationGroups: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rounds: true,
            topics: true,
            topicProposals: true,
            registrationGroups: true,
            councils: true,
          },
        },
      },
    });

    if (!semester) throw new NotFoundException('Semester not found');

    // The plan comes along with the term, because "what is open this semester"
    // is the first thing anyone opening it wants to know, and the phases are
    // brought up to date on the way out.
    return { ...semester, rounds: await this.rounds.findForSemester(id) };
  }

  async create(dto: CreateSemesterDto, actorId: number) {
    let finalCode = dto.code;
    let finalName = dto.name;
    let finalStartDate = dto.startDate;
    let finalEndDate = dto.endDate;
    let finalGradeDeadline = dto.gradeSubmissionDeadline;

    if (dto.academicYear && dto.term) {
      const generated = buildSemester(dto.academicYear, dto.term, dto.name);
      finalCode = generated.code;
      finalName = generated.name;

      if (!finalStartDate || !finalEndDate) {
        const defaults = getDefaultSemesterDates(dto.academicYear, dto.term);
        if (!finalStartDate) finalStartDate = new Date(defaults.startDate);
        if (!finalEndDate) finalEndDate = new Date(defaults.endDate);
        if (!finalGradeDeadline && defaults.gradeDeadline) {
          finalGradeDeadline = new Date(defaults.gradeDeadline);
        }
      }
    }

    if (!finalCode || !finalName || !finalStartDate || !finalEndDate) {
      throw new BadRequestException('Thông tin học kỳ không hợp lệ');
    }

    if (finalEndDate <= finalStartDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    await this.checkDuplicateCode(finalCode);

    return this.prisma.$transaction(async (tx) => {
      const semester = await tx.semester.create({
        data: {
          name: finalName,
          code: finalCode,
          startDate: finalStartDate!,
          endDate: finalEndDate!,
          gradeSubmissionDeadline: finalGradeDeadline,
        },
      });

      await recordAudit(tx, {
        userId: actorId,
        action: 'CREATE_SEMESTER',
        targetTable: 'semesters',
        targetId: semester.id,
        newValue: { code: semester.code, name: semester.name },
      });

      return semester;
    });
  }

  async update(id: number, dto: UpdateSemesterDto, actorId: number) {
    const semester = await this.requireSemester(id);

    let finalCode = dto.code;
    let finalName = dto.name;

    if (dto.academicYear && dto.term) {
      const generated = buildSemester(dto.academicYear, dto.term, dto.name);
      finalCode = generated.code;
      finalName = generated.name;
    }

    if (finalCode) {
      await this.checkDuplicateCode(finalCode, id);
    }

    // Checked against the merged row rather than the payload. A PATCH that sends
    // only one of the two dates cannot be validated against itself, and a schema
    // refinement never sees the value it is being compared with — so moving a
    // start date past an untouched end date used to be accepted in silence.
    const startDate = dto.startDate ?? semester.startDate;
    const endDate = dto.endDate ?? semester.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    const updateData: {
      name?: string;
      code?: string;
      startDate?: Date;
      endDate?: Date;
      gradeSubmissionDeadline?: Date | null;
    } = {};
    if (finalName !== undefined) updateData.name = finalName;
    if (finalCode !== undefined) updateData.code = finalCode;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate;
    if (dto.gradeSubmissionDeadline !== undefined)
      updateData.gradeSubmissionDeadline = dto.gradeSubmissionDeadline;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.semester.update({ where: { id }, data: updateData });

      await recordAudit(tx, {
        userId: actorId,
        action: 'UPDATE_SEMESTER',
        targetTable: 'semesters',
        targetId: id,
        oldValue: {
          startDate: semester.startDate.toISOString(),
          endDate: semester.endDate.toISOString(),
        },
        newValue: {
          startDate: updated.startDate.toISOString(),
          endDate: updated.endDate.toISOString(),
          ...(finalCode !== undefined && { code: updated.code }),
          ...(finalName !== undefined && { name: updated.name }),
        },
      });

      return updated;
    });
  }

  async remove(id: number, actorId: number) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: {
        _count: { select: { topics: true, registrationGroups: true } },
      },
    });

    if (!semester) throw new NotFoundException('Semester not found');

    if (semester._count.topics > 0 || semester._count.registrationGroups > 0) {
      throw new ConflictException(
        'Cannot delete semester with existing topics or registration groups',
      );
    }

    // Destructive and irreversible, which is the whole reason it is recorded:
    // the row is gone, so the log is the only thing left that says it existed.
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.semester.delete({ where: { id } });

      await recordAudit(tx, {
        userId: actorId,
        action: 'DELETE_SEMESTER',
        targetTable: 'semesters',
        targetId: id,
        oldValue: { code: deleted.code, name: deleted.name },
      });

      return deleted;
    });
  }

  async activate(id: number, actorId: number) {
    await this.requireSemester(id);

    await this.prisma.$transaction(async (tx) => {
      // Which term was open before, captured inside the transaction that closes
      // it — this is the one action here that silently changes what every other
      // screen in the product defaults to.
      const previous = await tx.semester.findFirst({
        where: { isActive: true },
        select: { id: true, code: true },
      });

      // Deactivate all semesters, then activate the selected one
      await tx.semester.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      await tx.semester.update({ where: { id }, data: { isActive: true } });

      await recordAudit(tx, {
        userId: actorId,
        action: 'ACTIVATE_SEMESTER',
        targetTable: 'semesters',
        targetId: id,
        ...(previous && {
          oldValue: { activeSemesterId: previous.id, code: previous.code },
        }),
        newValue: { activeSemesterId: id },
      });
    });

    return this.prisma.semester.findUnique({ where: { id } });
  }

  async deactivate(id: number, actorId: number) {
    await this.requireSemester(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.semester.update({ where: { id }, data: { isActive: false } });

      await recordAudit(tx, {
        userId: actorId,
        action: 'DEACTIVATE_SEMESTER',
        targetTable: 'semesters',
        targetId: id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
      });
    });

    return this.prisma.semester.findUnique({ where: { id } });
  }

  private async requireSemester(id: number) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!semester) throw new NotFoundException('Semester not found');

    return semester;
  }

  private async checkDuplicateCode(code: string, excludeId?: number) {
    const existing = await this.prisma.semester.findUnique({
      where: { code },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Semester code "${code}" already exists`);
    }
  }
}
