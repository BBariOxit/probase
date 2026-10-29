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
import type { Role } from '../../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_ATTACHMENT_BYTES } from '../../core/cloudinary/cloudinary.service';
import {
  AcceptProposalDto,
  RejectProposalDto,
} from './dto/answer-proposal.dto';
import { CreateProposalCommentDto } from './dto/proposal-comment.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { QueryProposalsDto } from './dto/query-proposals.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalsService } from './proposals.service';

@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Roles('STUDENT')
  @Post()
  create(@Body() dto: CreateProposalDto, @GetUser('id') userId: number) {
    return this.proposalsService.create(dto, userId);
  }

  @Get()
  findAll(
    @Query() query: QueryProposalsDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.proposalsService.findAll(query, userId, role);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.proposalsService.findOne(id, userId, role);
  }

  @Roles('STUDENT')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProposalDto,
    @GetUser('id') userId: number,
  ) {
    return this.proposalsService.update(id, dto, userId);
  }

  @Roles('STUDENT')
  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @GetUser('id') userId: number) {
    return this.proposalsService.submit(id, userId);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProposalCommentDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.proposalsService.addComment(id, dto, userId, role);
  }

  @Roles('STUDENT')
  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
    }),
  )
  uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @GetUser('id') userId: number,
  ) {
    return this.proposalsService.uploadAttachment(id, file, userId);
  }

  @Roles('STUDENT')
  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @GetUser('id') userId: number,
  ) {
    return this.proposalsService.removeAttachment(id, attachmentId, userId);
  }

  @Roles('STUDENT')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @GetUser('id') userId: number) {
    return this.proposalsService.remove(id, userId);
  }

  @Roles('LECTURER')
  @Post(':id/accept')
  accept(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AcceptProposalDto,
    @GetUser('id') userId: number,
  ) {
    return this.proposalsService.accept(id, dto, userId);
  }

  @Roles('LECTURER')
  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectProposalDto,
    @GetUser('id') userId: number,
  ) {
    return this.proposalsService.reject(id, dto, userId);
  }
}
