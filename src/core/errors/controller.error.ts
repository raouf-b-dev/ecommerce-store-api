// core/errors/controller.error.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class ControllerError extends AppError {
  constructor(message: string, cause?: Error) {
    super(
      message,
      HttpStatus.BAD_REQUEST, // Controller errors are usually bad requests
      'CONTROLLER_ERROR',
      cause,
    );
  }
}
