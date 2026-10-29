import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExtendRoundDto } from './dto/extend-round.dto';
import { QueryEligibleStudentsDto } from './dto/query-eligible-students.dto';
import { QueryRoundsDto } from './dto/query-rounds.dto';
import { SetRequirementsDto } from './dto/set-requirements.dto';
import { UnlockRoundDto } from './dto/unlock-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { EligibleStudentsService } from './eligible-students.service';
import { RequirementsService } from './requirements.service';
import { RoundsService } from './rounds.service';

@Controller('rounds')
export class RoundsController {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly requirements: RequirementsService,
    private readonly eligibleStudents: EligibleStudentsService,
  ) {}

  @Get()
  findAll(
    @Query() query: QueryRoundsDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.roundsService.findAll(query, userId, role);
  }

  @Roles('STUDENT')
  @Get('eligibility/my-status')
  getMyEligibilityStatus(@GetUser('id') userId: number) {
    return this.eligibleStudents.getStudentEligibilityStatus(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roundsService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoundDto) {
    return this.roundsService.update(id, dto);
  }

  @Roles('ADMIN')
  @Post(':id/extend')
  extend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtendRoundDto,
    @GetUser('id') userId: number,
  ) {
    return this.roundsService.extend(id, dto, userId);
  }

  @Get(':id/requirements')
  findRequirements(@Param('id', ParseIntPipe) id: number) {
    return this.requirements.findForRound(id);
  }

  @Roles('ADMIN')
  @Put(':id/requirements')
  setRequirements(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRequirementsDto,
    @GetUser('id') userId: number,
  ) {
    return this.requirements.setForRound(id, dto, userId);
  }

  @Roles('ADMIN')
  @Post(':id/unlock')
  unlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnlockRoundDto,
    @GetUser('id') userId: number,
  ) {
    return this.roundsService.unlock(id, dto, userId);
  }

  // ── Eligible Students Management (BR-02) ───────────────────

  @Roles('ADMIN')
  @Get(':id/eligible-students/template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="Mau_DS_SV_Du_Dieu_Kien.xlsx"',
  )
  async downloadTemplate(@Param('id', ParseIntPipe) id: number) {
    const buffer = await this.eligibleStudents.getTemplate(id);
    return new StreamableFile(buffer);
  }

  @Roles('ADMIN')
  @Post(':id/eligible-students/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  importEligibleStudents(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(new ParseFilePipe({ validators: [], fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.eligibleStudents.importFile(id, file);
  }

  @Roles('ADMIN')
  @Get(':id/eligible-students')
  listEligibleStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryEligibleStudentsDto,
  ) {
    return this.eligibleStudents.listEligible(id, query);
  }

  @Roles('ADMIN')
  @Delete(':id/eligible-students/:studentId')
  removeEligibleStudent(
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.eligibleStudents.removeEligible(id, studentId);
  }
}
