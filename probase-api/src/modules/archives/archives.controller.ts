import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '../../../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ArchivesService } from './archives.service';
import { QueryArchivesDto } from './dto/query-archives.dto';
import { VerifyArchiveDto } from './dto/verify-archive.dto';

@Roles(Role.ADMIN)
@Controller('archives')
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get('export')
  async exportExcel(
    @Query() query: QueryArchivesDto,
    @Res() res: Response,
  ) {
    const buffer = await this.archivesService.exportExcel(query);
    const filename = `danh-sach-luu-tru-do-an-${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }

  @Get()
  findAll(@Query() query: QueryArchivesDto) {
    return this.archivesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.archivesService.findOne(id);
  }

  @Patch(':archiveId/verify')
  verifyArchive(
    @Param('archiveId', ParseIntPipe) archiveId: number,
    @Body() dto: VerifyArchiveDto,
  ) {
    return this.archivesService.verifyArchive(archiveId, dto.isVerified);
  }
}
