import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Lấy ma trận vai trò và quyền hạn
   */
  @Roles('ADMIN')
  @Get('matrix')
  getMatrix() {
    return this.permissionsService.getMatrix();
  }

  /**
   * Cập nhật quyền hạn mặc định cho một vai trò
   */
  @Roles('ADMIN')
  @Put('roles/:role')
  updateRolePermissions(
    @Param('role') role: string,
    @Body() dto: UpdateRolePermissionsDto,
    @GetUser('id') actorId: number,
  ) {
    return this.permissionsService.updateRolePermissions(
      role,
      dto.permissions,
      actorId,
    );
  }

  /**
   * Lấy quyền bổ sung của một người dùng
   */
  @Roles('ADMIN')
  @Get('users/:userId')
  getUserPermissions(@Param('userId', ParseIntPipe) userId: number) {
    return this.permissionsService.getUserPermissions(userId);
  }

  /**
   * Cập nhật quyền bổ sung của một người dùng
   */
  @Roles('ADMIN')
  @Put('users/:userId')
  updateUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserPermissionsDto,
    @GetUser('id') actorId: number,
  ) {
    return this.permissionsService.updateUserPermissions(
      userId,
      dto.permissions,
      actorId,
    );
  }

  /**
   * Lấy toàn bộ quyền có hiệu lực của tài khoản đang đăng nhập
   */
  @Get('my-permissions')
  getMyPermissions(@GetUser('id') userId: number) {
    return this.permissionsService.getUserEffectivePermissions(userId);
  }
}
