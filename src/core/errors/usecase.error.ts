// core/errors/usecase.error.ts
import { AppError } from './app.error';
export class UseCaseError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, cause); // ✅ public by default
  }
}
