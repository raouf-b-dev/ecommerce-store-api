import { Result } from '../../domain/result';
import { AppError } from '../../errors/app.error';

export abstract class UseCase<I, O, E extends AppError> {
  abstract execute(input: I): Promise<Result<O, E>>;
}
