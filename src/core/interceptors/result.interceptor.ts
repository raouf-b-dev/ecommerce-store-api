// src/common/interceptors/result.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger, // Import the Logger
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Result, isFailure } from '../../core/domain/result';
import { AppError } from '../../core/errors/app.error';

@Injectable()
export class ResultInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResultInterceptor.name);

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (this.isResultType(data)) {
          if (isFailure(data)) {
            throw this.mapErrorToHttpException(data.error);
          }
          return data.value;
        }
        return data;
      }),
    );
  }

  private isResultType(data: any): data is Result<any, AppError> {
    return (
      data &&
      typeof data === 'object' &&
      'isSuccess' in data &&
      'isFailure' in data
    );
  }

  private mapErrorToHttpException(error: AppError): HttpException {
    const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;

    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('An unhandled internal error occurred:', error.stack);
    }

    const responseBody = {
      statusCode,
      message: error.message,
      error: error.code || 'InternalError',
    };

    return new HttpException(responseBody, statusCode);
  }
}
