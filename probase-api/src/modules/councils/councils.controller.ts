import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { type RequestUser, RolesGuard } from '../auth/guards/roles.guard';
import { CouncilsService } from './councils.service';
import { AddCouncilMemberDto } from './dto/add-council-member.dto';
import { CreateCouncilDto } from './dto/create-council.dto';
import { FinalizeCouncilTopicDto } from './dto/finalize-council-topic.dto';
import { QueryCouncilsDto } from './dto/query-councils.dto';
import { ScheduleCouncilTopicDto } from './dto/schedule-council-topic.dto';
import { SubmitCouncilEvaluationDto } from './dto/submit-council-evaluation.dto';
import { UpdateCouncilDto } from './dto/update-council.dto';

@Controller('councils')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouncilsController {
  constructor(private readonly councilsService: CouncilsService) {}

  @Get()
  @Roles('ADMIN', 'LECTURER')
  async findAll(@Query() query: QueryCouncilsDto) {
    return this.councilsService.findAll(query);
  }

  @Get('eligible-groups')
  @Roles('ADMIN', 'LECTURER')
  async getEligibleGroups(
    @Query('semesterId') semesterId?: string,
    @Query('majorId') majorId?: string,
  ) {
    return this.councilsService.getEligibleGroups(
      semesterId ? Number(semesterId) : undefined,
      majorId ? Number(majorId) : undefined,
    );
  }

  @Get('my-councils')
  @Roles('LECTURER', 'ADMIN')
  async getMyCouncils(@GetUser() user: RequestUser) {
    return this.councilsService.getMyCouncils(user);
  }

  @Get(':id')
  @Roles('ADMIN', 'LECTURER')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.councilsService.findById(id);
  }

  @Post()
  @Roles('ADMIN')
  async create(
    @Body() dto: CreateCouncilDto,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.create(dto, user);
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouncilDto,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.delete(id, user);
  }

  @Post(':id/members')
  @Roles('ADMIN')
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCouncilMemberDto,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.addMember(id, dto, user);
  }

  @Delete(':id/members/:lecturerId')
  @Roles('ADMIN')
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('lecturerId', ParseIntPipe) lecturerId: number,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.removeMember(id, lecturerId, user);
  }

  @Post(':id/topics')
  @Roles('ADMIN')
  async scheduleTopic(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleCouncilTopicDto,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.scheduleTopic(id, dto, user);
  }

  @Delete(':id/topics/:councilTopicId')
  @Roles('ADMIN')
  async removeTopic(
    @Param('id', ParseIntPipe) id: number,
    @Param('councilTopicId', ParseIntPipe) councilTopicId: number,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.removeTopic(id, councilTopicId, user);
  }

  @Post('topics/:councilTopicId/evaluate')
  @Roles('LECTURER', 'ADMIN')
  async evaluateTopic(
    @Param('councilTopicId', ParseIntPipe) councilTopicId: number,
    @Body() dto: SubmitCouncilEvaluationDto,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.evaluateTopic(councilTopicId, dto, user);
  }

  @Post('topics/:councilTopicId/finalize')
  @Roles('ADMIN', 'LECTURER')
  async finalizeTopic(
    @Param('councilTopicId', ParseIntPipe) councilTopicId: number,
    @Body() dto: FinalizeCouncilTopicDto,
    @GetUser() user: RequestUser,
  ) {
    return this.councilsService.finalizeTopic(councilTopicId, dto, user);
  }
}
