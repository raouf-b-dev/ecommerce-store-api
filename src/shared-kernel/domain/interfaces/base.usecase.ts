import { Result } from '../result';
import { AppError } from '../exceptions/app.error';

export abstract class UseCase<I, O, E extends AppError> {
  abstract execute(input: I): Promise<Result<O, E>>;
}
