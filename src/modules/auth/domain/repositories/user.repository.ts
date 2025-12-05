import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { User } from '../entities/user';

export abstract class UserRepository {
  abstract save(user: User): Promise<Result<User, RepositoryError>>;
  abstract findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>>;
  abstract findById(id: string): Promise<Result<User | null, RepositoryError>>;
  abstract delete(id: string): Promise<Result<void, RepositoryError>>;
}
