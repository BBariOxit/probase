import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { SystemPermission } from '../permissions/permissions.constants';
import { AllocationService } from './allocation.service';
import {
  AutoPreviewDto,
  BatchPlaceDto,
  BatchUnplaceDto,
  FinalizeRoundDto,
  PlaceStudentDto,
} from './dto/allocation.dto';

@RequirePermissions(SystemPermission.STUDENT_ALLOCATION)
@Controller('rounds/:roundId/allocation')
export class AllocationController {
  constructor(private readonly allocation: AllocationService) {}

  @Get()
  desk(@Param('roundId', ParseIntPipe) roundId: number) {
    return this.allocation.desk(roundId);
  }

  @Post('placements')
  place(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: PlaceStudentDto,
    @GetUser('id') userId: number,
  ) {
    return this.allocation.place(roundId, dto, userId);
  }

  @Post('placements/batch')
  batchPlace(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: BatchPlaceDto,
    @GetUser('id') userId: number,
  ) {
    return this.allocation.batchPlace(roundId, dto, userId);
  }

  @Post('placements/batch-unplace')
  batchUnplace(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: BatchUnplaceDto,
    @GetUser('id') userId: number,
  ) {
    return this.allocation.batchUnplace(roundId, dto, userId);
  }

  @Post('auto-preview')
  autoPreview(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: AutoPreviewDto,
  ) {
    return this.allocation.autoPreview(roundId, dto);
  }

  @Delete('placements/:studentId')
  unplace(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @GetUser('id') userId: number,
  ) {
    return this.allocation.unplace(roundId, studentId, userId);
  }

  @Post('finalize')
  finalize(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: FinalizeRoundDto,
    @GetUser('id') userId: number,
  ) {
    return this.allocation.finalize(roundId, dto, userId);
  }
}
