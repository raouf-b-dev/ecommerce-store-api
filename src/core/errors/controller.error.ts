// core/errors/controller.error.ts
import { AppError } from './app.error';
export class ControllerError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, cause); // ✅ public by default
  }
}
