import { CanActivate, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TempPasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(): boolean {
    // Đổi mật khẩu không còn là bắt buộc sau khi đăng nhập.
    // Người dùng có thể chủ động đổi mật khẩu qua avatar dropdown khi có nhu cầu.
    return true;
  }
}
