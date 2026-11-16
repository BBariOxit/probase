import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import type { Role } from '../../../generated/prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../permissions/require-permissions.decorator';
import { SystemPermission } from '../permissions/permissions.constants';
import { QueryAdminLecturersDto } from './dto/query-admin-lecturers.dto';
import { QueryLecturersDto } from './dto/query-lecturers.dto';
import { UpdateLecturerRoleDto } from './dto/update-lecturer-role.dto';
import { LecturersService } from './lecturers.service';

@Controller('lecturers')
export class LecturersController {
  constructor(private readonly lecturersService: LecturersService) {}

  @Roles('ADMIN')
  @Get('admin/roster')
  findAdminRoster(@Query() query: QueryAdminLecturersDto) {
    return this.lecturersService.findAdminRoster(query);
  }

  @RequirePermissions(SystemPermission.LECTURER_ROLE_ASSIGN)
  @Patch('admin/:userId/role')
  updateRole(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Body() dto: UpdateLecturerRoleDto,
    @GetUser('id') currentAdminId: number,
  ) {
    return this.lecturersService.updateRole(targetUserId, dto, currentAdminId);
  }

  @Get()
  findAll(@Query() query: QueryLecturersDto) {
    return this.lecturersService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.lecturersService.findOne(id, { userId, role });
  }
}
