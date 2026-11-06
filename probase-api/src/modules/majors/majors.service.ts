import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateMajorDto } from './dto/create-major.dto';
import { UpdateMajorDto } from './dto/update-major.dto';

@Injectable()
export class MajorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.major.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { students: true } } },
    });
  }

  async findOne(id: number) {
    const major = await this.prisma.major.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });

    if (!major) throw new NotFoundException('Không tìm thấy chuyên ngành.');

    return major;
  }

  async create(dto: CreateMajorDto) {
    await this.checkDuplicateCode(dto.code);

    return this.prisma.major.create({
      data: { name: dto.name, code: dto.code },
    });
  }

  async update(id: number, dto: UpdateMajorDto) {
    await this.findOne(id);

    if (dto.code) {
      await this.checkDuplicateCode(dto.code, id);
    }

    return this.prisma.major.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const major = await this.prisma.major.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });

    if (!major) throw new NotFoundException('Không tìm thấy chuyên ngành.');

    if (major._count.students > 0) {
      throw new ConflictException('Không thể xóa chuyên ngành đã có sinh viên theo học.');
    }

    return this.prisma.major.delete({ where: { id } });
  }

  private async checkDuplicateCode(code: string, excludeId?: number) {
    const existing = await this.prisma.major.findUnique({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Mã chuyên ngành "${code}" đã tồn tại.`);
    }
  }
}
