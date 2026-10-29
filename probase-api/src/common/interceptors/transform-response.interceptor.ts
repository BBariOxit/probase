import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
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
    next: CallHandler,
  ): Observable<ResponseFormat<T> | T> {
    const http = context.switchToHttp();
    const response = http.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // If data is already in a stream or file buffer, bypass
        if (
          data instanceof Buffer ||
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
