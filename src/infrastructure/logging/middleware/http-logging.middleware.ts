import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WinstonLoggerService } from '../winston-logger.service';
import { CorrelationService } from '../correlation/correlation.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: WinstonLoggerService,
    private readonly correlation: CorrelationService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '-';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || '0';
      const duration = Date.now() - startTime;
      const correlationId = this.correlation.getId();

      this.logger.http(`${method} ${originalUrl} ${statusCode} ${duration}ms`, {
        context: 'HTTP',
        method,
        url: originalUrl,
        statusCode,
        contentLength: Number(contentLength),
        duration,
        ip,
        userAgent,
        ...(correlationId ? { correlationId } : {}),
      });
    });

    next();
  }
}
