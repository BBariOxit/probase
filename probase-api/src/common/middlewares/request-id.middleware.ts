import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerName = 'x-request-id';
    const requestId = (req.headers[headerName] as string) || randomUUID();
    req.headers[headerName] = requestId;
    res.setHeader(headerName, requestId);
    next();
  }
}
