// core/errors/repository.error.ts
import { AppError } from './app.error';
export class RepositoryError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, cause); // ✅ public by default
  }
}
