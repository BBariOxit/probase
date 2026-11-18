import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Role } from '../../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_DOCUMENT_BYTES } from '../../core/cloudinary/cloudinary.service';
import { BulkOutlineGroupIdsDto } from './dto/bulk-outlines.dto';
import { QueryOutlinesDto } from './dto/query-outlines.dto';
import { ReviewOutlineDto } from './dto/review-outline.dto';
import { OutlinesService } from './outlines.service';

@Controller('outlines')
export class OutlinesController {
  constructor(private readonly outlinesService: OutlinesService) {}

  @Roles(Role.STUDENT)
  @Get('my-outline')
  getMyGroupOutline(@GetUser('id') userId: number) {
    return this.outlinesService.getMyGroupOutline(userId);
  }

  @Roles(Role.STUDENT)
  @Post('submit')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
    }),
  )
  submitOutline(
    @UploadedFile() file: Express.Multer.File | undefined,
    @GetUser('id') userId: number,
  ) {
    return this.outlinesService.submitOutline(userId, file);
  }

  @Roles(Role.LECTURER)
  @Get('lecturer')
  getLecturerOutlines(
    @Query() query: QueryOutlinesDto,
    @GetUser('id') userId: number,
  ) {
    return this.outlinesService.getLecturerOutlines(userId, query);
  }

  @Roles(Role.LECTURER, Role.ADMIN)
  @Patch(':id/review')
  reviewOutline(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewOutlineDto,
    @GetUser() user: { id: number; role: Role },
  ) {
    return this.outlinesService.reviewOutline(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.LECTURER)
  @Get('faculty')
  getFacultyOutlines(
    @GetUser() user: { id: number; role: Role },
    @Query() query: QueryOutlinesDto,
  ) {
    return this.outlinesService.getFacultyOutlines(user, query);
  }

  @Roles(Role.ADMIN, Role.LECTURER)
  @Post('faculty/download-zip')
  async downloadFacultyOutlinesZip(
    @GetUser() user: { id: number; role: Role },
    @Body() dto: BulkOutlineGroupIdsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer } = await this.outlinesService.downloadFacultyOutlinesZip(
      dto,
      user,
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="de-cuong-m03.zip"',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return new StreamableFile(buffer);
  }

  @Roles(Role.ADMIN, Role.LECTURER)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('faculty/remind')
  remindFacultyOutlines(
    @GetUser() user: { id: number; role: Role },
    @Body() dto: BulkOutlineGroupIdsDto,
  ) {
    return this.outlinesService.remindFacultyOutlines(dto, user);
  }

  @Roles(Role.ADMIN, Role.LECTURER)
  @Get('faculty/:id/download')
  async downloadFacultyOutlineFile(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number; role: Role },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, fileName } =
      await this.outlinesService.downloadFacultyOutlineFile(id, user);
    const asciiName = fileName.replace(/[^\x20-\x7e"]/g, '_');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return new StreamableFile(buffer);
  }
}
