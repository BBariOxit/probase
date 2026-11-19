import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ResponseFormat<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseFormat<T> | T> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // If data is already in a stream or file buffer, bypass
        if (
          Buffer.isBuffer(data) ||
          (data && typeof data === 'object' && 'pipe' in data)
        ) {
          return data;
        }

        // Return standardized envelope
        return {
          success: true,
          statusCode,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
