import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { AppError } from '../shared-kernel/domain/exceptions/app.error';
import { ErrorCode } from '../shared-kernel/domain/exceptions/error-code';
import { logSafePath } from '../infrastructure/logging/log-safe-path';

interface ValidationErrorResponse {
  message: string | string[];
  error?: string;
  /** Preferred machine-readable code when present (e.g. MUST_CHANGE_PASSWORD). */
  code?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const logPath = logSafePath(request.url);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected server error occurred.';
    let code: string | undefined = undefined;
    let errors: string[] | undefined = undefined;
    let errorDetail: string | undefined = undefined;
    let stack: string | undefined = undefined;

    // Branch 1: DTO Validation Errors (class-validator)
    if (exception instanceof BadRequestException) {
      statusCode = exception.getStatus();
      const validationResponse =
        exception.getResponse() as ValidationErrorResponse;
      message = 'Validation failed';
      errors = Array.isArray(validationResponse.message)
        ? validationResponse.message
        : [validationResponse.message || 'Invalid input provided.'];
      code =
        typeof validationResponse.code === 'string' &&
        validationResponse.code.length > 0
          ? validationResponse.code
          : ErrorCode.VALIDATION_FAILED;

      this.logger.warn(
        `Validation failed for ${request.method} ${logPath}: ${errors?.join(', ')}`,
      );
    }
    // Branch 2: HttpException (including ResultInterceptor wrapped AppErrors)
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        string | ValidationErrorResponse;

      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse.message instanceof Array
            ? exceptionResponse.message[0]
            : exceptionResponse.message || exception.message;

      if (typeof exceptionResponse === 'object') {
        code = exceptionResponse.code || exceptionResponse.error;
      }

      this.logger.warn(
        `[HTTP ${statusCode}] ${message} - Path: ${request.method} ${logPath}`,
      );
    }
    // Branch 3: AppError (Direct escape without ResultInterceptor)
    else if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      message = exception.message;
      code = exception.code;
      stack = exception.stack;
      errorDetail = exception.message;

      this.logger.warn(
        `[AppError: ${code}] ${message} - Path: ${request.method} ${logPath}`,
      );
    }
    // Branch 4: Optimistic Lock Version Mismatch (TypeORM)
    else if (exception instanceof OptimisticLockVersionMismatchError) {
      statusCode = HttpStatus.CONFLICT;
      message =
        'Resource was modified by another request. Please reload and retry.';
      code = ErrorCode.OPTIMISTIC_LOCK_CONFLICT;
      errorDetail = exception.message;

      this.logger.warn(
        `[OptimisticLockConflict] ${exception.message} - Path: ${request.method} ${logPath}`,
      );
    }
    // Branch 4: Generic Error / Unknown
    else if (exception instanceof Error) {
      this.logger.error(
        `[Unhandled Error] ${exception.message} - Path: ${request.method} ${logPath}`,
        exception.stack,
      );
      stack = exception.stack;
      errorDetail = exception.message;
    } else {
      this.logger.error(
        `[Unknown Exception] - Path: ${request.method} ${logPath}`,
        exception,
      );
      errorDetail = 'An unknown error type was caught.';
    }

    const isProduction = process.env.NODE_ENV === 'production';

    const errorResponse = {
      success: false,
      statusCode,
      message,
      code: code ?? ErrorCode.INTERNAL_ERROR,
      ...(errors && { errors }),
      ...(!isProduction && errorDetail && { error: errorDetail }),
      ...(!isProduction && stack && { stack }),
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorResponse);
  }
}
