import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi cơ sở dữ liệu.';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        message = `Dữ liệu đã tồn tại trong hệ thống (${target.join(', ')}).`;
        break;
      }
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Bản ghi yêu cầu không tồn tại hoặc đã bị xóa.';
        break;
      }
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Ràng buộc khóa ngoại không hợp lệ hoặc dữ liệu liên kết không tồn tại.';
        break;
      }
      default: {
        this.logger.error(
          `Unhandled Prisma Error [${exception.code}] on ${request.method} ${request.url}: ${exception.message}`,
          exception.stack,
        );
        break;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      code: exception.code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
