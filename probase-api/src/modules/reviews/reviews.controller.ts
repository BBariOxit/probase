import {
  Body,
  Controller,
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
import { QueryDefenseEligibilityDto } from './dto/query-defense-eligibility.dto';
import { SubmitTopicReviewDto } from './dto/submit-topic-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Giảng viên gửi hoặc cập nhật Phiếu nhận xét (M02/M04 cho GVHD, M05 cho GVPB).
   */
  @Roles(Role.LECTURER)
  @Post()
  submitReview(
    @GetUser() user: RequestUser,
    @Body() dto: SubmitTopicReviewDto,
  ) {
    return this.reviewsService.submitReview(user, dto);
  }

  /**
   * Danh sách các nhóm cần nhận xét hoặc đã nhận xét của giảng viên đang đăng nhập.
   */
  @Roles(Role.LECTURER)
  @Get('mine')
  getMyReviews(@GetUser('id') userId: number) {
    return this.reviewsService.getMyReviews(userId);
  }

  /**
   * Bảng tổng hợp đối soát điều kiện bảo vệ toàn khoa (dành cho Giáo vụ, TTBM).
   */
  @Roles(Role.ADMIN, AppActor.TTBM, AppActor.TLGV)
  @Get('eligibility')
  getDefenseEligibilityOverview(
    @GetUser() user: RequestUser,
    @Query() query: QueryDefenseEligibilityDto,
  ) {
    return this.reviewsService.getDefenseEligibilityOverview(user, query);
  }

  /**
   * Lấy chi tiết các phiếu nhận xét và trạng thái điều kiện bảo vệ của một nhóm.
   */
  @Roles(
    Role.LECTURER,
    Role.STUDENT,
    Role.ADMIN,
    AppActor.TTBM,
    AppActor.TLGV,
  )
  @Get('groups/:groupId')
  getGroupReviews(
    @Param('groupId', ParseIntPipe) groupId: number,
    @GetUser() user: RequestUser,
  ) {
    return this.reviewsService.getGroupReviews(groupId, user);
  }

  /**
   * Xem chi tiết một phiếu nhận xét (dùng cho xem trước bản in biểu mẫu DLU).
   */
  @Roles(
    Role.LECTURER,
    Role.ADMIN,
    Role.STUDENT,
    AppActor.TTBM,
    AppActor.TLGV,
  )
  @Get(':id')
  getReviewDetail(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: RequestUser,
  ) {
    return this.reviewsService.getReviewDetail(id, user);
  }
}

