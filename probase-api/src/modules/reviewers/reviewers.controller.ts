import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AppActor, Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/guards/roles.guard';
import { AssignReviewerDto } from './dto/assign-reviewer.dto';
import { AutoAssignReviewersDto } from './dto/auto-assign-reviewers.dto';
import { QueryReviewAssignmentsDto } from './dto/query-review-assignments.dto';
import { ReviewersService } from './reviewers.service';

@Controller('reviewers')
export class ReviewersController {
  constructor(private readonly reviewersService: ReviewersService) {}

  // ─────────────────────────────────────────────────────────
  // PHÍA GIẢNG VIÊN (LECTURER)
  // ─────────────────────────────────────────────────────────

  @Roles(Role.LECTURER)
  @Get('mine')
  getMyReviewAssignments(@GetUser('id') userId: number) {
    return this.reviewersService.getMyReviewAssignments(userId);
  }

  // ─────────────────────────────────────────────────────────
  // PHÍA QUẢN LÝ (TTBM, ADMIN, TLGV)
  // ─────────────────────────────────────────────────────────

  @Roles(Role.ADMIN, AppActor.TTBM, AppActor.TLGV)
  @Get('assignments')
  getAssignmentsOverview(
    @GetUser() user: RequestUser,
    @Query() query: QueryReviewAssignmentsDto,
  ) {
    return this.reviewersService.getAssignmentsOverview(user, query);
  }

  @Roles(Role.ADMIN, AppActor.TTBM, AppActor.TLGV)
  @Post('assignments')
  assignReviewer(@GetUser() user: RequestUser, @Body() dto: AssignReviewerDto) {
    return this.reviewersService.assignReviewer(user, dto);
  }

  @Roles(Role.ADMIN, AppActor.TTBM, AppActor.TLGV)
  @Post('assignments/auto')
  autoAssign(
    @GetUser() user: RequestUser,
    @Body() dto: AutoAssignReviewersDto,
  ) {
    return this.reviewersService.autoAssign(user, dto);
  }

  @Roles(Role.ADMIN, AppActor.TTBM, AppActor.TLGV)
  @Delete('assignments/:groupId')
  unassignReviewer(
    @GetUser() user: RequestUser,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.reviewersService.unassignReviewer(user, groupId);
  }
}
