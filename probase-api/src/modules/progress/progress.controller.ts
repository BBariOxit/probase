import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '../../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_DOCUMENT_BYTES } from '../../core/cloudinary/cloudinary.service';
import { CreateWeeklyLogDto } from './dto/create-weekly-log.dto';
import { FeedbackWeeklyLogDto } from './dto/feedback-weekly-log.dto';
import { GradeProgressReportDto } from './dto/grade-progress-report.dto';
import { QueryLecturerProgressDto } from './dto/query-progress.dto';
import { SubmitProgressReportDto } from './dto/submit-progress-report.dto';
import { UpdateWeeklyLogDto } from './dto/update-weekly-log.dto';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  // ─────────────────────────────────────────────────────────
  // PHÍA SINH VIÊN
  // ─────────────────────────────────────────────────────────

  @Roles(Role.STUDENT)
  @Get('my-group')
  getMyGroupProgress(@GetUser('id') userId: number) {
    return this.progressService.getMyGroupProgress(userId);
  }

  @Roles(Role.STUDENT)
  @Post('weekly-logs')
  createWeeklyLog(
    @GetUser('id') userId: number,
    @Body() dto: CreateWeeklyLogDto,
  ) {
    return this.progressService.createWeeklyLog(userId, dto);
  }

  @Roles(Role.STUDENT)
  @Patch('weekly-logs/:id')
  updateWeeklyLog(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) logId: number,
    @Body() dto: UpdateWeeklyLogDto,
  ) {
    return this.progressService.updateWeeklyLog(userId, logId, dto);
  }

  @Roles(Role.STUDENT)
  @Delete('weekly-logs/:id')
  deleteWeeklyLog(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) logId: number,
  ) {
    return this.progressService.deleteWeeklyLog(userId, logId);
  }

  @Roles(Role.STUDENT)
  @Post('reports/:stage')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
    }),
  )
  submitProgressReport(
    @GetUser('id') userId: number,
    @Param('stage') stage: 'STAGE_1' | 'STAGE_2',
    @Body() dto: SubmitProgressReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.progressService.submitProgressReport(userId, stage, dto, file);
  }

  // ─────────────────────────────────────────────────────────
  // PHÍA GIẢNG VIÊN
  // ─────────────────────────────────────────────────────────

  @Roles(Role.LECTURER, Role.ADMIN)
  @Get('lecturer/groups')
  getLecturerGroupsProgress(
    @GetUser('id') userId: number,
    @Query() query: QueryLecturerProgressDto,
  ) {
    return this.progressService.getLecturerGroupsProgress(userId, query);
  }

  @Roles(Role.LECTURER, Role.ADMIN)
  @Get('lecturer/groups/:groupId')
  getLecturerGroupDetail(
    @GetUser('id') userId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.progressService.getLecturerGroupDetail(userId, groupId);
  }

  @Roles(Role.LECTURER, Role.ADMIN)
  @Patch('lecturer/weekly-logs/:id/feedback')
  feedbackWeeklyLog(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) logId: number,
    @Body() dto: FeedbackWeeklyLogDto,
  ) {
    return this.progressService.feedbackWeeklyLog(userId, logId, dto);
  }

  @Roles(Role.LECTURER, Role.ADMIN)
  @Patch('lecturer/groups/:groupId/reports/:stage/grade')
  gradeProgressReport(
    @GetUser('id') userId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('stage') stage: 'STAGE_1' | 'STAGE_2',
    @Body() dto: GradeProgressReportDto,
  ) {
    return this.progressService.gradeProgressReport(
      userId,
      groupId,
      stage,
      dto,
    );
  }
}
