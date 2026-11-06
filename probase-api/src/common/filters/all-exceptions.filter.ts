import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.';
    let errors: unknown = undefined;
    let code: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, unknown>;
        if (resObj.message) {
          message = Array.isArray(resObj.message)
            ? resObj.message.join(', ')
            : String(resObj.message);
        }
        if (resObj.errors) {
          errors = resObj.errors;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;
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
          message =
            'Ràng buộc khóa ngoại không hợp lệ hoặc dữ liệu liên kết không tồn tại.';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          message = 'Lỗi truy vấn cơ sở dữ liệu.';
          break;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      ...(code && { code }),
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

