import {
  Body,
  Controller,
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
import { Role } from '../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_DOCUMENT_BYTES } from '../cloudinary/cloudinary.service';
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
}
