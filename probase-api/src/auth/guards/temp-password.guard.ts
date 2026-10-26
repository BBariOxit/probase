import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_TEMP_PASSWORD_KEY } from '../decorators/allow-temp-password.decorator';

@Injectable()
export class TempPasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(_context: ExecutionContext): boolean {
    // Đổi mật khẩu không còn là bắt buộc sau khi đăng nhập.
    // Người dùng có thể chủ động đổi mật khẩu qua avatar dropdown khi có nhu cầu.
    return true;
  }
}
