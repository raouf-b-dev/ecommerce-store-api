// core/errors/domain.error.ts
import { AppError } from './app.error';
export class DomainError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, cause); // ✅ public by default
  }
}
