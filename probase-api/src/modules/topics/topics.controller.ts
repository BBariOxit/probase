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
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ExportTopicsDto } from './dto/export-topics.dto';
import { QueryTopicLecturersDto } from './dto/query-topic-lecturers.dto';
import { QueryTopicsDto } from './dto/query-topics.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { BulkOpenTopicsDto } from './dto/bulk-open-topics.dto';
import { SubmitTopicsDto } from './dto/submit-topics.dto';
import { DepartmentReviewDto } from './dto/review-topic.dto';
import { TopicSimilarityService } from './topic-similarity.service';
import { TopicsExportService } from './topics-export.service';
import { TopicsService } from './topics.service';

const TOPIC_EXPORT_RATE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

@Controller('topics')
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly topicsExportService: TopicsExportService,
    private readonly topicSimilarityService: TopicSimilarityService,
  ) {}

  @Get()
  findAll(
    @Query() query: QueryTopicsDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.findAll(query, userId, role);
  }

  @Get('lecturers')
  findLecturers(
    @Query() query: QueryTopicLecturersDto,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.findLecturers(role, query.semesterId);
  }

  // Literal routes must be declared before wildcard :id routes so NestJS does
  // not treat 'export' as an id parameter.
  @Roles('ADMIN')
  @Throttle(TOPIC_EXPORT_RATE_LIMIT)
  @Get('export')
  async export(
    @Query() query: ExportTopicsDto,
    @GetUser('id') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.topicsExportService.exportWorkbook(
      query,
      userId,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new StreamableFile(buffer);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.findOne(id, userId, role);
  }

  @Roles('LECTURER')
  @Post()
  create(@Body() dto: CreateTopicDto, @GetUser('id') userId: number) {
    return this.topicsService.create(dto, userId);
  }

  // Literal routes must be declared before wildcard :id routes so NestJS does
  // not swallow 'bulk-open' as a param value and send it to ParseIntPipe.
  @Roles('ADMIN')
  @Patch('bulk-open')
  bulkOpen(@Body() dto: BulkOpenTopicsDto) {
    return this.topicsService.bulkOpen(dto.semesterId);
  }

  @Roles('LECTURER')
  @Post('submit-drafts')
  submitDrafts(@Body() dto: SubmitTopicsDto, @GetUser('id') userId: number) {
    return this.topicsService.submitDrafts(userId, dto.topicIds);
  }

  @Roles('LECTURER', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTopicDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.update(id, dto, userId, role);
  }

  @Roles('LECTURER', 'ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.remove(id, userId, role);
  }

  @Roles('ADMIN')
  @Patch(':id/open')
  open(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.open(id, userId, role);
  }

  @Roles('LECTURER')
  @Patch(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @GetUser('id') userId: number) {
    return this.topicsService.submit(id, userId);
  }

  @Roles('LECTURER', 'ADMIN')
  @Patch(':id/withdraw')
  withdraw(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.withdraw(id, userId, role);
  }

  @Roles('ADMIN')
  @Patch(':id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.topicsService.close(id, userId, role);
  }

  @Roles('LECTURER')
  @Patch(':id/department-review')
  reviewDepartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DepartmentReviewDto,
    @GetUser() user: any,
  ) {
    return this.topicsService.reviewDepartment(id, dto, user);
  }

  @Roles('LECTURER', 'ADMIN')
  @Get(':id/similarity')
  getSimilarity(@Param('id', ParseIntPipe) id: number) {
    return this.topicSimilarityService.checkTopicSimilarity(id);
  }
}
