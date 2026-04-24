import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../shared-kernel/domain/exceptions/app.error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected server error occurred.';
    let code: string | undefined = undefined;
    let errors: string[] | undefined = undefined;
    let errorDetail: string | undefined = undefined;
    let stack: string | undefined = undefined;

    // Branch 1: DTO Validation Errors (class-validator)
    if (exception instanceof BadRequestException) {
      statusCode = exception.getStatus();
      const validationResponse = exception.getResponse() as any;
      message = 'Validation failed';
      errors = Array.isArray(validationResponse.message)
        ? validationResponse.message
        : [validationResponse.message || 'Invalid input provided.'];

      this.logger.warn(
        `Validation failed for ${request.method} ${request.url}: ${errors?.join(', ')}`,
      );
    }
    // Branch 2: HttpException (including ResultInterceptor wrapped AppErrors)
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse.message || exception.message;

      if (typeof exceptionResponse === 'object' && exceptionResponse.error) {
        code = exceptionResponse.error;
      }

      this.logger.warn(
        `[HTTP ${statusCode}] ${message} - Path: ${request.method} ${request.url}`,
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
        `[AppError: ${code}] ${message} - Path: ${request.method} ${request.url}`,
      );
    }
    // Branch 4: Generic Error / Unknown
    else if (exception instanceof Error) {
      this.logger.error(
        `[Unhandled Error] ${exception.message} - Path: ${request.method} ${request.url}`,
        exception.stack,
      );
      stack = exception.stack;
      errorDetail = exception.message;
    } else {
      this.logger.error(
        `[Unknown Exception] - Path: ${request.method} ${request.url}`,
        exception,
      );
      errorDetail = 'An unknown error type was caught.';
    }

    const isProduction = process.env.NODE_ENV === 'production';

    const errorResponse = {
      success: false,
      statusCode,
      message,
      ...(code && { code }),
      ...(errors && { errors }),
      ...(!isProduction && errorDetail && { error: errorDetail }),
      ...(!isProduction && stack && { stack }),
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorResponse);
  }
}
